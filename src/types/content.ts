/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ContentVisibilityResult {
  isVisible: boolean;
  confidence: number;
  score: number;
  reasons: string[];
  suggestions: string[];
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  references?: string[];
  summary?: string;
  explanation?: string;
  response?: any;
} 