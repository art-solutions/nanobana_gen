import React from 'react';
import { ImageTask, ProcessingStatus } from '../types';
import { generateOutputFilename } from '../utils/filenameUtils';

interface GalleryItemProps {
  task: ImageTask;
  filenameFindPattern: string;
  filenameReplacePattern: string;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

export const GalleryItem: React.FC<GalleryItemProps> = ({ 
  task, 
  filenameFindPattern, 
  filenameReplacePattern,
  isSelected,
  onToggleSelect
}) => {
  
  const handleDownload = () => {
    if (!task.generatedUrl) return;
    
    const filename = generateOutputFilename(task.file.name, filenameFindPattern, filenameReplacePattern);
    
    // Create a fake link to trigger download
    const link = document.createElement('a');
    link.href = task.generatedUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCompleted = task.status === ProcessingStatus.COMPLETED;

  return (
    <div 
      className={`bg-gray-800 rounded-xl overflow-hidden shadow-lg border flex flex-col h-full transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-500/30' 
          : 'border-gray-700 hover:border-gray-600'
      }`}
      onClick={() => isCompleted && onToggleSelect(task.id)}
    >
      <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div 
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
              isSelected 
                ? 'bg-blue-600 border-blue-600' 
                : isCompleted 
                  ? 'border-gray-500 hover:border-gray-300 bg-gray-700/50' 
                  : 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (isCompleted) onToggleSelect(task.id);
            }}
          >
            {isSelected && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm font-medium text-gray-300 truncate" title={task.file.name}>
            {task.file.name}
          </span>
        </div>
        
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase ${
          task.status === ProcessingStatus.COMPLETED ? 'bg-green-900/40 text-green-400 border border-green-800' :
          task.status === ProcessingStatus.FAILED ? 'bg-red-900/40 text-red-400 border border-red-800' :
          task.status === ProcessingStatus.PROCESSING ? 'bg-blue-900/40 text-blue-400 border border-blue-800' :
          'bg-gray-700 text-gray-400'
        }`}>
          {task.status}
        </span>
      </div>

      <div className="grid grid-cols-2 h-48 md:h-64 relative cursor-pointer">
        {/* Original */}
        <div className="relative border-r border-gray-700 group">
          <img 
            src={task.originalPreviewUrl} 
            alt="Original" 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
            Original
          </div>
        </div>

        {/* Generated */}
        <div className="relative bg-gray-900 flex items-center justify-center">
          {task.status === ProcessingStatus.COMPLETED && task.generatedUrl ? (
            <img 
              src={task.generatedUrl} 
              alt="Generated" 
              className="w-full h-full object-cover"
            />
          ) : task.status === ProcessingStatus.FAILED ? (
            <div className="p-4 text-center">
              <span className="text-red-400 text-xs">{task.error || "Failed"}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {task.status === ProcessingStatus.PROCESSING ? (
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              ) : (
                <div className="w-8 h-8 border-2 border-gray-600 rounded-full mb-2 opacity-20"></div>
              )}
              <span className="text-xs text-gray-500">
                {task.status === ProcessingStatus.PROCESSING ? 'Generating...' : 'Waiting'}
              </span>
            </div>
          )}
          
          {task.status === ProcessingStatus.COMPLETED && (
             <div className="absolute top-2 right-2 bg-blue-600/80 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
             AI Version
           </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-gray-800/50 border-t border-gray-700 flex flex-col gap-2 mt-auto">
        {task.usage && (
          <div className="flex justify-between items-center text-[10px] text-gray-400 px-1">
             <span>Tokens: {task.usage.totalTokens.toLocaleString()}</span>
             <span title="Input / Output">
               (In: {task.usage.promptTokens.toLocaleString()} / Out: {task.usage.candidateTokens.toLocaleString()})
             </span>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          disabled={task.status !== ProcessingStatus.COMPLETED}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            task.status === ProcessingStatus.COMPLETED 
              ? 'bg-gray-700 hover:bg-gray-600 text-white hover:text-blue-300' 
              : 'bg-gray-700/50 text-gray-600 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Single Download
        </button>
      </div>
    </div>
  );
};