
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MicIcon } from './icons/MicIcon';
import { StopIcon } from './icons/StopIcon';
import { connectLive } from '../services/geminiService';
import { decode, encode, decodeAudioData } from '../utils/audioUtils';
import { LiveServerMessage, LiveSession } from '@google/genai';

export const LiveView: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [transcription, setTranscription] = useState<{ user: string, model: string}[]>([]);
    const [currentInterim, setCurrentInterim] = useState({ user: '', model: '' });

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    
    const stopConversation = useCallback(() => {
        if(sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        
        outputSourcesRef.current.forEach(source => source.stop());
        outputSourcesRef.current.clear();
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        nextStartTimeRef.current = 0;

        setIsActive(false);
        setIsConnecting(false);
    }, []);

    const startConversation = async () => {
        if (isActive || isConnecting) return;

        setIsConnecting(true);
        setTranscription([]);
        setCurrentInterim({ user: '', model: '' });

        try {
            // Setup output audio
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            // Setup input audio
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            sessionPromiseRef.current = connectLive({
                onOpen: () => {
                    setIsConnecting(false);
                    setIsActive(true);
                    
                    const source = audioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        
                        if (sessionPromiseRef.current) {
                             sessionPromiseRef.current.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        }
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(audioContextRef.current!.destination);
                },
                onMessage: async (message: LiveServerMessage) => {
                   if (message.serverContent?.outputTranscription) {
                        setCurrentInterim(prev => ({ ...prev, model: prev.model + message.serverContent!.outputTranscription.text }));
                    }
                    if (message.serverContent?.inputTranscription) {
                        setCurrentInterim(prev => ({ ...prev, user: prev.user + message.serverContent!.inputTranscription.text }));
                    }
                    if (message.serverContent?.turnComplete) {
                        setTranscription(prev => [...prev, currentInterim]);
                        setCurrentInterim({ user: '', model: '' });
                    }
                    
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if(base64Audio && outputAudioContextRef.current) {
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        
                        const currentTime = outputAudioContextRef.current.currentTime;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);

                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        
                        outputSourcesRef.current.add(source);
                        source.onended = () => outputSourcesRef.current.delete(source);
                    }
                },
                onError: (e) => {
                    console.error('Live session error:', e);
                    stopConversation();
                },
                onClose: () => {
                    stopConversation();
                },
            });

        } catch (error) {
            console.error('Failed to start conversation:', error);
            setIsConnecting(false);
            alert('Could not access microphone. Please check permissions.');
        }
    };
    
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopConversation();
        }
    }, [stopConversation]);

    return (
        <div className="flex-1 flex flex-col items-center justify-between text-gray-300 p-4">
            <div className="w-full max-w-3xl overflow-y-auto space-y-4 flex-1">
                {transcription.map((t, i) => (
                    <div key={i} className="space-y-2">
                        {t.user && <p><span className="font-bold text-indigo-400">You:</span> {t.user}</p>}
                        {t.model && <p><span className="font-bold text-gray-400">AI:</span> {t.model}</p>}
                    </div>
                ))}
                <div className="space-y-2">
                    {currentInterim.user && <p className="text-indigo-400 opacity-70"><span className="font-bold">You:</span> {currentInterim.user}</p>}
                    {currentInterim.model && <p className="text-gray-400 opacity-70"><span className="font-bold">AI:</span> {currentInterim.model}</p>}
                </div>
            </div>

            <div className="mt-8">
                {!isActive && !isConnecting && (
                    <button onClick={startConversation} className="bg-indigo-600 text-white rounded-full p-6 flex flex-col items-center justify-center w-32 h-32 hover:bg-indigo-700 transition-all duration-300 shadow-lg">
                        <MicIcon className="w-12 h-12" />
                        <span className="mt-2 text-sm">Start</span>
                    </button>
                )}
                {isConnecting && (
                     <div className="text-white rounded-full p-6 flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-500">
                        <div className="animate-pulse">
                            <MicIcon className="w-12 h-12" />
                        </div>
                        <span className="mt-2 text-sm">Connecting...</span>
                    </div>
                )}
                {isActive && (
                    <button onClick={stopConversation} className="bg-red-600 text-white rounded-full p-6 flex flex-col items-center justify-center w-32 h-32 hover:bg-red-700 transition-all duration-300 shadow-lg animate-pulse">
                        <StopIcon className="w-12 h-12" />
                         <span className="mt-2 text-sm">Stop</span>
                    </button>
                )}
            </div>
        </div>
    );
};
