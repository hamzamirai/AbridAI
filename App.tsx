
import React, { useState, useCallback, useEffect } from 'react';
import { AppMode, ChatMode, ChatMessage, GeneratedImage, GeneratedVideo } from './types';
import { InputBar } from './components/InputBar';
import { ChatView } from './components/ChatView';
import { ImageGenView } from './components/ImageGenView';
import { VideoGenView } from './components/VideoGenView';
import { LiveView } from './components/LiveView';
import * as geminiService from './services/geminiService';
import { fileToGenerativePart } from './utils/fileUtils';
import { decode, decodeAudioData } from './utils/audioUtils';

// FIX: Merged AIStudio interface into the global declaration to resolve type conflict.
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>(AppMode.Chat);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [generatedImages, setGeneratedImages] =useState<GeneratedImage[]>([]);
  const [generatedVideos, setGeneratedVideos] =useState<GeneratedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for video generation API key
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);


  const checkApiKey = useCallback(async () => {
    if (window.aistudio) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
        return hasKey;
      } catch (e) {
        console.error("Error checking API key:", e);
        setIsApiKeySelected(false);
        return false;
      }
    }
    // If aistudio is not available, assume we can't check.
    // This allows local dev if process.env.API_KEY is set.
    setIsApiKeySelected(true); 
    return true;
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectApiKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success to avoid race conditions and re-enable UI.
      // The API call will fail if it's not actually selected.
      setIsApiKeySelected(true); 
    }
  };

  const handleTextToSpeech = useCallback(async (text: string) => {
    try {
        const audioData = await geminiService.textToSpeech(text);
        if (audioData) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const decodedBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = decodedBuffer;
            source.connect(audioContext.destination);
            source.start();
        }
    } catch (err) {
        console.error("TTS Error:", err);
        setError("Failed to generate speech.");
    }
  }, []);

  const handleSendMessage = async (prompt: string, options: { file?: File, chatMode: ChatMode, aspectRatio: string }) => {
    const { file, chatMode, aspectRatio } = options;
    setError(null);
    setIsLoading(true);

    try {
        switch (appMode) {
            case AppMode.Chat:
                await handleChatMessage(prompt, chatMode, file);
                break;
            case AppMode.ImageGen:
                await handleImageGeneration(prompt, aspectRatio);
                break;
            case AppMode.VideoGen:
                 if (await checkApiKey()) {
                    setIsGeneratingVideo(true);
                    await handleVideoGeneration(prompt, aspectRatio as '16:9' | '9:16');
                 } else {
                    setError("API Key selection is required for video generation.");
                 }
                break;
        }
    } catch (err: any) {
        console.error("API Error:", err);
        const errorMessage = `An error occurred: ${err.message || 'Please try again.'}`;
        setError(errorMessage);
        if (appMode === AppMode.Chat) {
             setChatMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
        }
        if (err.message?.includes("Requested entity was not found.")) {
             setIsApiKeySelected(false); // Reset key state on this specific error
        }
    } finally {
        setIsLoading(false);
        setIsGeneratingVideo(false);
    }
  };

    const handleChatMessage = async (prompt: string, chatMode: ChatMode, file?: File) => {
        let filePart;
        let userMessage: ChatMessage = { role: 'user', content: prompt };
        if (file) {
            filePart = await fileToGenerativePart(file);
            if(file.type.startsWith('image/')) userMessage.image = URL.createObjectURL(file);
            if(file.type.startsWith('video/')) userMessage.video = URL.createObjectURL(file);
        }
        setChatMessages(prev => [...prev, userMessage]);
        
        const history = chatMessages.filter(m => !m.image && !m.video); // Don't send media in history
        const response = await geminiService.generateText(prompt, chatMode, history, filePart);
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources = groundingChunks?.map((chunk: any) => ({
            uri: chunk.web?.uri || chunk.maps?.uri,
            title: chunk.web?.title || chunk.maps?.title,
        })).filter((s: any) => s.uri);

        setChatMessages(prev => [...prev, { role: 'model', content: response.text, sources }]);
    };
    
    const handleImageGeneration = async (prompt: string, aspectRatio: string) => {
         const imageBytes = await geminiService.generateImage(prompt, aspectRatio);
         const imageUrl = `data:image/jpeg;base64,${imageBytes}`;
         setGeneratedImages(prev => [...prev, { src: imageUrl, prompt }]);
    };
    
    const handleVideoGeneration = async (prompt: string, aspectRatio: '16:9' | '9:16') => {
        const videoUri = await geminiService.generateVideo(prompt, aspectRatio);
        if (videoUri) {
            // Must append API key to the URI to download
            const downloadableUri = `${videoUri}&key=${process.env.API_KEY}`;
            setGeneratedVideos(prev => [...prev, { uri: downloadableUri, prompt }]);
        } else {
            throw new Error("Video generation failed to return a URI.");
        }
    };
    
  const renderContent = () => {
    switch (appMode) {
      case AppMode.ImageGen:
        return <ImageGenView images={generatedImages} />;
      case AppMode.VideoGen:
        return <VideoGenView videos={generatedVideos} isGenerating={isGeneratingVideo} apiKeySelected={isApiKeySelected} onSelectApiKey={handleSelectApiKey} />;
      case AppMode.Live:
        return <LiveView />;
      case AppMode.Chat:
      default:
        return <ChatView messages={chatMessages} isLoading={isLoading && appMode === AppMode.Chat} onTextToSpeech={handleTextToSpeech}/>;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
        {error && <div className="bg-red-500 text-white p-2 text-center text-sm">{error} <button onClick={() => setError(null)} className="ml-4 font-bold">X</button></div>}
        <main className="flex-1 flex flex-col overflow-hidden">
           {renderContent()}
        </main>
        <InputBar 
            currentAppMode={appMode} 
            onAppModeChange={setAppMode} 
            onSendMessage={handleSendMessage}
            isLoading={isLoading || isGeneratingVideo}
        />
    </div>
  );
};

export default App;
