import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { useMutation } from 'convex/react';
import { api } from './convex/_generated/api';
import { Id } from './convex/_generated/dataModel';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { GalleryItem } from './components/GalleryItem';
import { ApiDocs } from './components/ApiDocs';
import { JobHistoryList } from './components/JobHistoryList';
import { PresetManager } from './components/PresetManager';
import { ImageTask, ProcessingStatus, AppConfig, SavedSetup } from './types';
import { generateLocalizedImage, fileToBase64, ensureApiKey } from './services/geminiService';
import { generateOutputFilename } from './utils/filenameUtils';

const COUNTRIES = [
  'Japan', 'Brazil', 'France', 'India', 'Egypt', 
  'USA', 'China', 'Mexico', 'Nigeria', 'Germany', 
  'Italy', 'South Korea', 'Australia'
];

const DEFAULT_CONFIG: AppConfig = {
  targetCountry: 'Japan',
  additionalContext: '',
  // Regex Explanation:
  // ^.*-        -> Match from start until the very last hyphen
  // ([^-.]+)    -> Capture group 1: The characters after the hyphen (and before the dot)
  // \..*$       -> Match the dot and the extension
  filenameFindPattern: '^.*-([^-.]+)\\..*$',
  // Replace using capture group $1 (the word after the hyphen) and force .png
  filenameReplacePattern: 'neonLED_$1_TIMESTAMP.png',
  removeBranding: false,
  addBrandingColors: false,
  brandingColor: '#3B82F6', // Default Blue
  addOwnLogo: false,
  ownLogoData: null,
};

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [customApiKey, setCustomApiKey] = useState('');

  const [tasks, setTasks] = useState<ImageTask[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKeyReady, setApiKeyReady] = useState(false);

  // View State
  const [activeTab, setActiveTab] = useState<'gallery' | 'api' | 'history'>('gallery');

  // Convex mutations for job tracking
  const createJob = useMutation(api.publicJobs.createJob);
  const setJobProcessing = useMutation(api.publicJobs.setJobProcessing);
  const setJobFailed = useMutation(api.publicJobs.setJobFailed);
  const generateUploadUrl = useMutation(api.publicJobs.generateUploadUrl);
  const setJobCompletedWithFile = useMutation(api.publicJobs.setJobCompletedWithFile);

  // Initialize API Key check
  useEffect(() => {
    ensureApiKey().then(setApiKeyReady);
  }, []);

  const handleFilesSelected = (files: File[]) => {
    const newTasks: ImageTask[] = files.map((file) => ({
      id: uuidv4(),
      file,
      originalPreviewUrl: URL.createObjectURL(file),
      generatedUrl: null,
      status: ProcessingStatus.IDLE,
    }));
    setTasks((prev) => [...prev, ...newTasks]);
    // Switch back to gallery if files are added
    setActiveTab('gallery');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setConfig({ ...config, ownLogoData: base64 });
      } catch (err) {
        alert("Failed to load logo image");
      }
    }
  };

  const handleLoadPreset = (presetConfig: AppConfig) => {
    // Merge with default to ensure new fields are present
    setConfig({
      ...DEFAULT_CONFIG,
      ...presetConfig
    });
  };

  const processQueue = async () => {
    // If no custom key provided, check for system key readiness
    if (!customApiKey && !apiKeyReady) {
        await ensureApiKey();
        setApiKeyReady(true);
    }

    setIsProcessing(true);
    // Ensure we are viewing the gallery when processing starts
    setActiveTab('gallery');

    // Generate a batch ID for this processing session
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    for (const task of tasks) {
      if (task.status !== ProcessingStatus.IDLE && task.status !== ProcessingStatus.FAILED) continue;

      let convexJobId: Id<"jobs"> | null = null;

      try {
        // Create job in Convex database first
        const base64Preview = task.originalPreviewUrl; // Use the preview URL as source
        const outputFilename = generateOutputFilename(task.file.name, config.filenameFindPattern, config.filenameReplacePattern);

        convexJobId = await createJob({
          sourceUrl: base64Preview,
          sourceName: task.file.name,
          config: {
            targetCountry: config.targetCountry,
            additionalContext: config.additionalContext,
            filenameFindPattern: config.filenameFindPattern,
            filenameReplacePattern: config.filenameReplacePattern,
            removeBranding: config.removeBranding,
            addBrandingColors: config.addBrandingColors,
            brandingColor: config.brandingColor,
            addOwnLogo: config.addOwnLogo,
            ownLogoData: config.ownLogoData,
          },
          batchId,
        });

        // Update local state with job ID and processing status
        setTasks(prev => prev.map(t => t.id === task.id ? {
          ...t,
          status: ProcessingStatus.PROCESSING,
          error: undefined,
          convexJobId: convexJobId as string
        } : t));

        // Update Convex job to processing
        await setJobProcessing({ jobId: convexJobId });

        const base64 = await fileToBase64(task.file);

        // Pass the entire config object and optional custom key
        const { imageUrl, usage } = await generateLocalizedImage(
          base64,
          task.file.type,
          config,
          customApiKey
        );

        // Upload the generated image to Convex storage
        // 1. Get upload URL from Convex
        const uploadUrl = await generateUploadUrl();

        // 2. Convert base64 data URL to Blob
        const base64Data = imageUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // 3. Upload to Convex storage
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'image/png' },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image to storage');
        }

        const { storageId } = await uploadResponse.json();

        // 4. Update Convex job with storage ID
        await setJobCompletedWithFile({
          jobId: convexJobId,
          storageId: storageId,
          generatedFileName: outputFilename,
          promptTokens: usage?.promptTokens,
          candidateTokens: usage?.candidateTokens,
          totalTokens: usage?.totalTokens,
        });

        // Update local state
        setTasks(prev => {
          return prev.map(t => t.id === task.id ? {
            ...t,
            status: ProcessingStatus.COMPLETED,
            generatedUrl: imageUrl,
            usage: usage
          } : t);
        });

      } catch (error: any) {
        // Update Convex job to failed if we have a job ID
        if (convexJobId) {
          try {
            await setJobFailed({
              jobId: convexJobId,
              error: error.message || 'Processing failed'
            });
          } catch (e) {
            console.error('Failed to update job status in Convex:', e);
          }
        }

        // Update local state
        setTasks(prev => prev.map(t => t.id === task.id ? {
          ...t,
          status: ProcessingStatus.FAILED,
          error: error.message
        } : t));
      }
    }

    setIsProcessing(false);
  };

  const handleClear = () => {
      tasks.forEach(t => {
          if (t.originalPreviewUrl) URL.revokeObjectURL(t.originalPreviewUrl);
      });
      setTasks([]);
      setSelectedIds(new Set());
  };

  // --- Selection Logic ---
  
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    const completedTasks = tasks.filter(t => t.status === ProcessingStatus.COMPLETED);
    if (selectedIds.size === completedTasks.length && completedTasks.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(completedTasks.map(t => t.id)));
    }
  };

  const handleDownloadZip = async () => {
    const tasksToZip = tasks.filter(t => selectedIds.has(t.id) && t.status === ProcessingStatus.COMPLETED && t.generatedUrl);
    
    if (tasksToZip.length === 0) {
      alert("No completed images selected to download.");
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder("ai_version");

    tasksToZip.forEach(task => {
       if (task.generatedUrl) {
         const filename = generateOutputFilename(task.file.name, config.filenameFindPattern, config.filenameReplacePattern);
         // generatedUrl is formatted as "data:image/png;base64,..."
         // We need to strip the prefix
         const data = task.generatedUrl.split(',')[1];
         folder?.file(filename, data, {base64: true});
       }
    });

    try {
      const content = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `localized_batch_${config.targetCountry.replace(/\s+/g,'_')}_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to generate zip", e);
      alert("Error generating ZIP file.");
    }
  };

  const pendingCount = tasks.filter(t => t.status === ProcessingStatus.IDLE).length;
  const completedCount = tasks.filter(t => t.status === ProcessingStatus.COMPLETED).length;
  
  const totalTokens = tasks.reduce((acc, task) => {
    return acc + (task.usage?.totalTokens || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 pt-8">
        
        {/* Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Config Panel */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl lg:col-span-1 h-fit">

            {/* Preset Manager - Convex-based */}
            <PresetManager
              currentConfig={config}
              onLoadPreset={handleLoadPreset}
            />

            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">API Key (Optional)</label>
                <input 
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="Enter Gemini API Key..."
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">Leave empty to use system key.</p>
            </div>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Localization Settings
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Target Country / Culture</label>
                <select 
                  value={config.targetCountry}
                  onChange={(e) => setConfig({...config, targetCountry: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isProcessing}
                >
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Additional Style Hints
                </label>
                <textarea 
                  value={config.additionalContext}
                  onChange={(e) => setConfig({...config, additionalContext: e.target.value})}
                  placeholder="e.g. Modern urban fashion, sunset lighting..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm h-20 resize-none"
                  disabled={isProcessing}
                />
              </div>

              <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/50 space-y-3">
                 <h3 className="text-sm font-medium text-white">Branding Options</h3>
                 
                 <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.removeBranding}
                      onChange={(e) => setConfig({...config, removeBranding: e.target.checked})}
                      className="w-4 h-4 accent-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300 select-none">Remove existing logos</span>
                 </label>

                 <div className="flex flex-col">
                     <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={config.addBrandingColors}
                          onChange={(e) => setConfig({...config, addBrandingColors: e.target.checked})}
                          className="w-4 h-4 accent-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-300 select-none">Boost branding colors</span>
                     </label>
                     
                     {/* Color Picker Reveal */}
                     {config.addBrandingColors && (
                       <div className="pl-7 mt-2 flex items-center gap-3 animate-fade-in">
                          <input 
                             type="color" 
                             value={config.brandingColor}
                             onChange={(e) => setConfig({...config, brandingColor: e.target.value})}
                             className="h-8 w-16 bg-gray-800 p-0.5 rounded cursor-pointer border border-gray-600"
                          />
                          <span className="text-xs text-gray-400 font-mono">{config.brandingColor}</span>
                       </div>
                     )}
                 </div>

                 <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.addOwnLogo}
                      onChange={(e) => setConfig({...config, addOwnLogo: e.target.checked})}
                      className="w-4 h-4 accent-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300 select-none">Add own branding logo</span>
                 </label>

                 {config.addOwnLogo && (
                   <div className="pl-7 animate-fade-in">
                     <label className="block text-xs text-gray-400 mb-1">Upload Logo (PNG/Transp)</label>
                     <input 
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-900 file:text-blue-300 hover:file:bg-blue-800"
                     />
                     {config.ownLogoData && <p className="text-[10px] text-green-400 mt-1">✓ Logo loaded</p>}
                   </div>
                 )}
              </div>

              <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/50">
                 <h3 className="text-sm font-medium text-white mb-2">File Naming</h3>
                 <div className="space-y-2">
                   <input 
                      type="text"
                      placeholder="Regex Pattern"
                      value={config.filenameFindPattern}
                      onChange={(e) => setConfig({...config, filenameFindPattern: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:border-blue-500 outline-none"
                   />
                   <input 
                      type="text"
                      placeholder="Replace Pattern"
                      value={config.filenameReplacePattern}
                      onChange={(e) => setConfig({...config, filenameReplacePattern: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:border-blue-500 outline-none"
                   />
                 </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="mb-4 flex justify-between items-center text-sm text-gray-400">
                    <span>Session Cost (Tokens):</span>
                    <span className="font-mono text-purple-300">{totalTokens.toLocaleString()}</span>
                </div>

                <button
                  onClick={processQueue}
                  disabled={isProcessing || pendingCount === 0}
                  className={`w-full py-3 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                    isProcessing 
                      ? 'bg-purple-600/50 cursor-wait' 
                      : pendingCount === 0
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transform hover:scale-[1.02]'
                  }`}
                >
                   {isProcessing ? (
                     <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                     </>
                   ) : (
                     <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Start Processing ({pendingCount})
                     </>
                   )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Content Switching */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* View Switching Tabs */}
            <div className="flex border-b border-gray-700">
               <button
                 onClick={() => setActiveTab('gallery')}
                 className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                   activeTab === 'gallery'
                     ? 'border-blue-500 text-blue-400'
                     : 'border-transparent text-gray-400 hover:text-gray-200'
                 }`}
               >
                 Gallery View
               </button>
               <button
                 onClick={() => setActiveTab('api')}
                 className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                   activeTab === 'api'
                     ? 'border-purple-500 text-purple-400'
                     : 'border-transparent text-gray-400 hover:text-gray-200'
                 }`}
               >
                 API Integration
               </button>
               <button
                 onClick={() => setActiveTab('history')}
                 className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                   activeTab === 'history'
                     ? 'border-green-500 text-green-400'
                     : 'border-transparent text-gray-400 hover:text-gray-200'
                 }`}
               >
                 Job History
               </button>
            </div>

            {/* Content Area */}
            {activeTab === 'gallery' ? (
              <>
                <UploadZone onFilesSelected={handleFilesSelected} />
                
                {tasks.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="flex flex-col">
                          <h3 className="text-lg font-bold text-white">Gallery Queue</h3>
                          <p className="text-xs text-gray-400">
                            {completedCount} / {tasks.length} Completed
                          </p>
                      </div>
                      
                      {/* Selection Toolbar */}
                      {completedCount > 0 && (
                        <div className="flex items-center gap-2 pl-4 border-l border-gray-700 ml-4">
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-700/50 px-3 py-1.5 rounded hover:bg-gray-700 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={completedCount > 0 && selectedIds.size === completedCount}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                              <span className="text-sm text-gray-300">Select All</span>
                          </label>
                          
                          <span className="text-xs text-gray-500 font-mono">
                            {selectedIds.size} selected
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {selectedIds.size > 0 && (
                        <button
                          onClick={handleDownloadZip}
                          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-green-900/50 transition-all transform hover:-translate-y-0.5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Download ZIP ({selectedIds.size})
                        </button>
                      )}
                      
                      <button 
                        onClick={handleClear}
                        disabled={isProcessing}
                        className="text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-2 rounded transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}

                {/* Gallery Grid (In View) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {tasks.map((task) => (
                    <GalleryItem 
                      key={task.id} 
                      task={task} 
                      filenameFindPattern={config.filenameFindPattern}
                      filenameReplacePattern={config.filenameReplacePattern}
                      isSelected={selectedIds.has(task.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>

                {tasks.length === 0 && (
                  <div className="text-center py-20 opacity-50">
                    <div className="text-6xl mb-4">🌍</div>
                    <h2 className="text-2xl font-bold text-gray-500">No images yet</h2>
                    <p className="text-gray-600">Upload a folder to begin localization.</p>
                  </div>
                )}
              </>
            ) : activeTab === 'api' ? (
              // API Docs View
              <ApiDocs config={config} />
            ) : (
              // Job History View
              <JobHistoryList />
            )}
            
          </div>
        </div>

      </main>
    </div>
  );
}