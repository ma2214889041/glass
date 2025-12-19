
export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  MODEL_SHOT = 'MODEL_SHOT',
  CREATIVE_SHOT = 'CREATIVE_SHOT',
  POSTER_GENERATION = 'POSTER_GENERATION',
  RESULT = 'RESULT'
}

export enum NavTab {
  CREATE = 'CREATE',
  GALLERY = 'GALLERY',
  PROFILE = 'PROFILE'
}

export type ImageSize = '1K' | '2K' | '4K';
export type CameraFacingMode = 'user' | 'environment';

export interface GeneratedImage {
  id: string;
  url: string;
  type: string;
  timestamp: number;
}

export interface CreativeConcept {
  title: string;
  description: string;
  prompt: string;
}

export type PosterStyle = '极简主义 (Minimalist)' | '高端奢华 (Luxury)' | '街头潮流 (Street)' | '大胆波普 (Bold/Pop)' | '自然清新 (Nature)';

export interface PosterConfig {
  title: string;
  subtitle: string;
  style: PosterStyle;
  includeModel: boolean;
  colorPalette: string;
  fontType: string;
  layout: string;
  visualPrompt: string;
}

export interface PosterRecommendation extends PosterConfig {
  name: string;
  description: string;
}

export interface User {
  phoneNumber: string;
  name: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}