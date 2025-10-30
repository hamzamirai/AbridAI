
import React from 'react';
import { GeneratedVideo } from '../types';

interface VideoGenViewProps {
  videos: GeneratedVideo[];
  isGenerating: boolean;
  apiKeySelected: boolean;
  onSelectApiKey: () => void;
}

export const VideoGenView: React.FC<VideoGenViewProps> = ({ videos, isGenerating, apiKeySelected, onSelectApiKey }) => {
  if (!apiKeySelected) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <h2 className="text-2xl font-bold text-white mb-4">Video Generation Requires API Key</h2>
              <p className="text-gray-400 mb-6 max-w-md">To generate videos with Veo, you need to select an API key. This helps manage resource allocation for this powerful feature.</p>
              <button
                  onClick={onSelectApiKey}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                  Select API Key
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline mt-4">Learn about billing</a>
          </div>
      );
  }
  
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Generating your masterpiece...</h2>
        <p>This can take a few minutes. Great things are worth the wait!</p>
        <p className="text-sm mt-2">Feel free to navigate to other tabs; generation will continue in the background.</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
        <p className="text-lg">Create amazing videos from your prompts.</p>
        <p>Switch to Video Generation mode below to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {videos.slice().reverse().map((video, index) => (
          <div key={index} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <video src={video.uri} controls className="w-full h-auto" />
            <div className="p-4">
              <p className="text-sm text-gray-300">{video.prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
