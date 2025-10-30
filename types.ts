
export enum AppMode {
  Chat = 'Chat',
  ImageGen = 'Image Generation',
  VideoGen = 'Video Generation',
  Live = 'Live Conversation',
}

export enum ChatMode {
  // FIX: Updated to correct model name per guidelines.
  FlashLite = 'gemini-flash-lite-latest',
  Flash = 'gemini-2.5-flash',
  Pro = 'gemini-2.5-pro',
  Search = 'Search',
  Maps = 'Maps',
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  image?: string;
  video?: string;
  sources?: GroundingSource[];
}

export interface GeneratedImage {
  src: string;
  prompt: string;
}

export interface GeneratedVideo {
  uri: string;
  prompt: string;
}
