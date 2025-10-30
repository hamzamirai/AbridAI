
import React from 'react';
import { ChatMessage } from '../types';
import { Message } from './Message';
import LoadingSpinner from './LoadingSpinner';

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onTextToSpeech: (text: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, isLoading, onTextToSpeech }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, index) => (
        <Message key={index} message={msg} onTextToSpeech={onTextToSpeech} />
      ))}
      {isLoading && (
        <div className="flex justify-start">
            <div className="flex w-full max-w-2xl gap-4 items-start mx-auto p-4">
                <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gray-700 flex items-center justify-center font-bold text-white">AI</div>
                <div className="p-4 bg-gray-800 rounded-lg rounded-bl-none">
                    <LoadingSpinner />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
