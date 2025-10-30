
import React from 'react';
import { ChatMessage } from '../types';
import { VolumeIcon } from './icons/VolumeIcon';

interface MessageProps {
  message: ChatMessage;
  onTextToSpeech: (text: string) => void;
}

export const Message: React.FC<MessageProps> = ({ message, onTextToSpeech }) => {
  const { role, content, image, video, sources } = message;
  const isUser = role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex w-full max-w-2xl gap-4 items-start mx-auto p-4">
        <div className={`w-8 h-8 rounded-full flex-shrink-0 ${isUser ? 'bg-indigo-500' : 'bg-gray-700'} flex items-center justify-center font-bold text-white`}>
          {isUser ? 'U' : 'AI'}
        </div>
        <div className="flex-1 space-y-2">
            <div className={`p-4 rounded-lg ${isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-300 rounded-bl-none'}`}>
            <p className="whitespace-pre-wrap">{content}</p>
            {image && <img src={image} alt="User upload" className="mt-2 rounded-lg max-w-xs" />}
            {video && <video src={video} controls className="mt-2 rounded-lg max-w-xs" />}
          </div>
          {!isUser && (
             <div className="flex items-center justify-between">
                <button 
                  onClick={() => onTextToSpeech(content)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Read aloud"
                >
                  <VolumeIcon className="w-4 h-4" />
                </button>
                {sources && sources.length > 0 && (
                    <div className="text-xs text-gray-500">
                    Sources: {sources.map((source, index) => (
                        <a key={index} href={source.uri} target="_blank" rel="noopener noreferrer" className="ml-2 underline hover:text-indigo-400">
                        {source.title || `Source ${index + 1}`}
                        </a>
                    ))}
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
