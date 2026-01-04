export enum ProcessingStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface TokenUsage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface ImageTask {
  id: string;
  file: File;
  originalPreviewUrl: string;
  generatedUrl: string | null;
  status: ProcessingStatus;
  error?: string;
  usage?: TokenUsage;
}

export interface AppConfig {
  targetCountry: string;
  additionalContext: string;
  filenameFindPattern: string;
  filenameReplacePattern: string;
  // Branding options
  removeBranding: boolean;
  addBrandingColors: boolean;
  brandingColor: string; // Hex color code
  addOwnLogo: boolean;
  ownLogoData: string | null; // Base64 string of the logo
}

export interface SavedSetup {
  name: string;
  config: AppConfig;
  timestamp: number;
}