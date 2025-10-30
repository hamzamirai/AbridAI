
import React, { useState, useRef } from 'react';
import { AppMode, ChatMode } from '../types';
import { SendIcon } from './icons/SendIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { ChatIcon } from './icons/ChatIcon';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { MicIcon } from './icons/MicIcon';
import LoadingSpinner from './LoadingSpinner';

interface InputBarProps {
  currentAppMode: AppMode;
  onAppModeChange: (mode: AppMode) => void;
  // FIX: Updated onSendMessage to pass all necessary options for different generation modes.
  onSendMessage: (prompt: string, options: { file?: File, chatMode: ChatMode, aspectRatio: string }) => void;
  isLoading: boolean;
}

const chatModes = [
    { id: ChatMode.FlashLite, name: 'Fast' },
    { id: ChatMode.Flash, name: 'Balanced' },
    { id: ChatMode.Pro, name: 'Advanced' },
    { id: ChatMode.Search, name: 'Web Search' },
    { id: ChatMode.Maps, name: 'Maps' },
];

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export const InputBar: React.FC<InputBarProps> = ({ currentAppMode, onAppModeChange, onSendMessage, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [currentChatMode, setCurrentChatMode] = useState<ChatMode>(ChatMode.Flash);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!prompt && !file) || isLoading) return;
    // FIX: Pass up chatMode and aspectRatio.
    onSendMessage(prompt, { file: file || undefined, chatMode: currentChatMode, aspectRatio });
    setPrompt('');
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const ModeButton = ({ mode, Icon }: { mode: AppMode; Icon: React.ElementType }) => (
    <button
      onClick={() => onAppModeChange(mode)}
      className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md text-sm transition-colors ${
        currentAppMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{mode}</span>
    </button>
  );

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Mode Selector */}
        <div className="flex bg-gray-900/70 rounded-lg p-1 mb-4 border border-gray-700">
            <ModeButton mode={AppMode.Chat} Icon={ChatIcon} />
            <ModeButton mode={AppMode.ImageGen} Icon={ImageIcon} />
            <ModeButton mode={AppMode.VideoGen} Icon={VideoIcon} />
            <ModeButton mode={AppMode.Live} Icon={MicIcon} />
        </div>

        {/* Mode specific controls */}
        {currentAppMode === AppMode.Chat && (
            <div className="flex gap-2 mb-2 justify-center">
                {chatModes.map(mode => (
                    <button key={mode.id} onClick={() => setCurrentChatMode(mode.id)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${currentChatMode === mode.id ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        {mode.name}
                    </button>
                ))}
            </div>
        )}
        {(currentAppMode === AppMode.ImageGen || currentAppMode === AppMode.VideoGen) && (
             <div className="flex gap-2 mb-2 justify-center">
                <span className="text-sm text-gray-400 self-center">Aspect Ratio:</span>
                {(currentAppMode === AppMode.ImageGen ? aspectRatios : ["16:9", "9:16"]).map(ar => (
                    <button key={ar} onClick={() => setAspectRatio(ar)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${aspectRatio === ar ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        {ar}
                    </button>
                ))}
            </div>
        )}
        
        {/* Main Input */}
        {currentAppMode !== AppMode.Live && (
             <div className="relative">
                <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg shadow-sm">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-400 hover:text-white"
                    >
                        <PaperclipIcon className="w-5 h-5" />
                    </button>
                    <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,video/*"
                    />
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                            }
                        }}
                        placeholder={
                            currentAppMode === AppMode.Chat ? `Ask anything... (mode: ${currentChatMode.split('-').pop()})` :
                            currentAppMode === AppMode.ImageGen ? `Describe an image to generate...` :
                            `Describe a video to generate...`
                        }
                        className="flex-1 bg-transparent p-3 text-gray-200 placeholder-gray-500 focus:outline-none resize-none"
                        rows={1}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || (!prompt && !file)}
                        className="p-3 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                       {isLoading ? <LoadingSpinner /> : <SendIcon className="w-5 h-5" />}
                    </button>
                </div>
                {file && (
                    <div className="text-xs text-indigo-300 bg-gray-700 px-2 py-1 rounded-full absolute -top-2.5 left-10">
                        {file.name}
                        <button onClick={() => setFile(null)} className="ml-2 text-red-400 hover:text-red-300">x</button>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};
