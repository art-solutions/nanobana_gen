import React from 'react';
import { AppConfig } from '../types';
import { buildPrompt } from '../services/geminiService';

interface ApiDocsProps {
  config: AppConfig;
}

export const ApiDocs: React.FC<ApiDocsProps> = ({ config }) => {
  const prompt = buildPrompt(config).trim().replace(/`/g, '\\`');
  
  const partsCode = config.addOwnLogo && config.ownLogoData 
    ? `
    const parts = [
      { text: prompt },
      { 
        inlineData: { 
          mimeType: "image/jpeg", 
          data: base64ImageString 
        } 
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: "${config.ownLogoData.substring(0, 30)}..." // Your logo base64 here
        }
      }
    ];`
    : `
    const parts = [
      { text: prompt },
      { 
        inlineData: { 
          mimeType: "image/jpeg", 
          data: base64ImageString 
        } 
      }
    ];`;

  const nodeCode = `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_API_KEY" });

async function localizeImage(base64ImageString) {
  const prompt = \`${prompt}\`;

  ${partsCode.trim()}

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    }
  });

  // Handle response (expecting image data)
  const candidate = response.candidates[0];
  const imagePart = candidate.content.parts.find(p => p.inlineData);
  
  if (imagePart) {
    console.log("Image generated:", imagePart.inlineData.data);
  }
}`;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg animate-fade-in text-white h-full">
      <div className="mb-6 border-b border-gray-700 pb-4">
        <h2 className="text-2xl font-bold mb-2">API Integration</h2>
        <p className="text-gray-400 text-sm">
          Use the code below to integrate the current configuration (Country: <span className="text-blue-400">{config.targetCountry}</span>) directly into your own application.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            Node.js (Google GenAI SDK)
          </h3>
          <div className="relative group">
            <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-300 border border-gray-700 max-h-[500px] overflow-y-auto">
              {nodeCode}
            </pre>
            <button 
              onClick={() => navigator.clipboard.writeText(nodeCode)}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Copy
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Prompt Preview
          </h3>
          <p className="text-xs text-gray-500 mb-2">This is the exact prompt being constructed by your current settings:</p>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
             <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{prompt}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
