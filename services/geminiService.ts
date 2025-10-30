
import { GoogleGenAI, GenerateContentResponse, Modality, LiveServerMessage } from "@google/genai";
import { ChatMode } from "../types";
import { encode } from "../utils/audioUtils";

const getApiKey = () => {
    const key = process.env.API_KEY;
    if (!key) {
        // This is a fallback for development and should not be hit in production
        console.warn("API_KEY environment variable not set.");
        return "";
    }
    return key;
};

// General purpose AI instance
const createAiInstance = () => new GoogleGenAI({ apiKey: getApiKey() });

export const generateText = async (prompt: string, mode: ChatMode, history: any[], filePart?: any) => {
    const ai = createAiInstance();
    const contents: any[] = history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
    }));

    const userParts = [{ text: prompt }];
    if (filePart) {
        userParts.push(filePart);
    }
    contents.push({ role: 'user', parts: userParts });

    let modelName: string;
    let config: any = {};

    switch (mode) {
        case ChatMode.Pro:
            modelName = 'gemini-2.5-pro';
            config.thinkingConfig = { thinkingBudget: 32768 };
            break;
        case ChatMode.Search:
            modelName = 'gemini-2.5-flash';
            config.tools = [{ googleSearch: {} }];
            break;
        case ChatMode.Maps:
            modelName = 'gemini-2.5-flash';
            config.tools = [{ googleMaps: {} }];
            // Example coordinates, replace with actual location data if available
            config.toolConfig = { retrievalConfig: { latLng: { latitude: 37.78193, longitude: -122.40476 } } };
            break;
        case ChatMode.FlashLite:
             modelName = 'gemini-flash-lite-latest';
             break;
        default:
             modelName = 'gemini-2.5-flash';
             break;
    }
    
    // If analyzing image/video, override model
    if(filePart && (filePart.inlineData.mimeType.startsWith('image/'))){
        modelName = 'gemini-2.5-flash';
    } else if (filePart && (filePart.inlineData.mimeType.startsWith('video/'))) {
        modelName = 'gemini-2.5-pro';
    }


    const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: Object.keys(config).length > 0 ? config : undefined,
    });

    return response;
};

export const generateImage = async (prompt: string, aspectRatio: string) => {
    const ai = createAiInstance();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
        },
    });
    return response.generatedImages[0].image.imageBytes;
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16') => {
    // Veo requires user-selected API key, re-create instance before call
    const ai = createAiInstance();
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if(operation.error) {
        throw new Error(operation.error.message);
    }

    return operation.response?.generatedVideos?.[0]?.video?.uri;
};


export const textToSpeech = async (text: string) => {
    const ai = createAiInstance();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        // FIX: Removed "Say: " prefix from text to prevent the model from literally saying "Say".
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};


export const connectLive = (callbacks: {
    onOpen: () => void;
    onMessage: (message: LiveServerMessage) => void;
    onError: (e: any) => void;
    onClose: (e: any) => void;
}) => {
    const ai = createAiInstance();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: callbacks.onOpen,
            onmessage: callbacks.onMessage,
            onerror: callbacks.onError,
            onclose: callbacks.onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are a friendly and helpful AI assistant.',
        },
    });
};
