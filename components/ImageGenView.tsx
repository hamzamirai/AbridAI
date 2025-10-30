
import React from 'react';
import { GeneratedImage } from '../types';

interface ImageGenViewProps {
  images: GeneratedImage[];
}

export const ImageGenView: React.FC<ImageGenViewProps> = ({ images }) => {
  if (images.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
        <p className="text-lg">Generate images from your prompts.</p>
        <p>Switch to Image Generation mode below to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.slice().reverse().map((image, index) => (
          <div key={index} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <img src={image.src} alt={image.prompt} className="w-full h-auto object-cover" />
            <div className="p-4">
              <p className="text-sm text-gray-300">{image.prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
