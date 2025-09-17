
import { ActionPlanItem } from '@/types/geo';

/** Her bir AI analiz sonucunu saran genel yapı */
export interface AIAnalysisResult<T> {
  platform: 'OpenAI' | 'Gemini';
  model: string;
  duration: number;
  data: T;
}

/** İş Modeli Analizi Sonucu */
export interface BusinessModelAnalysis {
  brandName?: string;
  modelType: 'E-commerce' | 'SaaS' | 'Lead Generation' | 'Content/Media' | 'Marketplace' | 'Education' | 'Agency' | 'Marketing' | 'Health' | 'Other';
  confidence: number; // 0-100
  justification: string;
  keyRevenueStreams: string[];
}

/** Hedef Kitle Analizi Sonucu */
export interface TargetAudienceAnalysis {
  primaryAudience: {
    demographics: string; // e.g., "Age 25-40, Urban, Tech-savvy"
    psychographics: string; // e.g., "Interested in sustainable fashion, values quality"
  };
  secondaryAudiences: string[];
  confidence: number; // 0-100
  justification: string;
}

/** Rakip Analizi Sonucu */
export interface CompetitorAnalysis {
  businessCompetitors: Array<{
    name: string;
    url: string;
    reason: string;
    geoScore?: number;
    metrics?: Record<string, number>;
  }>;
  contentCompetitors: Array<{
    topic: string;
    url:string;
    reason: string;
  }>;
  summary: string; // General competitive landscape summary
  confidence: number; // 0-100
}

/** E-E-A-T Sinyalleri Analizi Sonucu */
export interface EEATComponent {
  score: number;
  justification: string;
  suggestions: string[];
  positiveSignals: string[]; // Tespit edilen olumlu sinyaller
  negativeSignals: string[]; // Tespit edilen olumsuz sinyaller
}

export interface EEATAnalysis {
  experience: EEATComponent;
  expertise: EEATComponent;
  authoritativeness: EEATComponent;
  trustworthiness: EEATComponent;
  overallScore: number;
}

/** Prometheus servisi için AI'dan beklenen tam yanıt yapısı */
import { GenerativePerformanceReport } from './geo';

export interface PrometheusAIResponse {
  eeatAnalysis: EEATAnalysis;
  executiveSummary: string;
  actionPlan: ActionPlanItem[];
  geoScoreDetails: {
    pazarPotansiyeli: 'yüksek' | 'orta' | 'düşük';
    rekabetYogunlugu: 'yüksek' | 'orta' | 'düşük';
    buyumeTrendi: 'pozitif' | 'negatif' | 'stabil';
    markaBilinirligi: 'yüksek' | 'orta' | 'düşük';
  };
  generativePerformanceReport?: GenerativePerformanceReport;
}

/** Delfi Gündemi Sonucu */
export interface DelfiAgenda {
  sessionFocus: string;
  strategicGoals: string[];
  customizedQuestions: Array<{
    questionId: number;
    original: string;
    customized: string;
  }>;
}

/** Birden fazla AI platformundan gelen birleştirilmiş sonuç */
export interface AggregatedAnalysisResult<T> {
  openai?: AIAnalysisResult<T>;
  gemini?: AIAnalysisResult<T>;
  combined: T; // Birleştirilmiş ve en iyi kabul edilen sonuç
  errors: string[];
}

// Google'ın "İyi", "İyileştirme Gerekiyor", "Yetersiz" eşiklerini modellemek için
export type PerformanceRating = 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';

// Her bir metrik için hem sayısal değeri hem de kategorisini tutacak yapı
export interface Metric {
  value: number;
  rating: PerformanceRating;
}

// CrUX (Alan Verileri) metrikleri
export interface CruxMetrics {
  lcp: Metric;
  inp: Metric;
  cls: Metric;
  fcp?: Metric; // Opsiyonel olabilir
  ttfb?: Metric; // Opsiyonel olabilir
}

// Lighthouse (Laboratuvar Verileri) metrikleri
export interface LighthouseMetrics {
  lcp: Metric;
  cls: Metric;
  fcp: Metric;
  speedIndex: Metric;
  totalBlockingTime: Metric;
  timeToInteractive: Metric;
}

// İki veri türünü de içeren ana performans raporu yapısı
export interface PerformanceAnalysis {
  url: string;
  hasCruxData: boolean;
  crux?: {
    overallRating: PerformanceRating;
    metrics: CruxMetrics;
  };
  lighthouse: {
    overallScore: number;
    metrics: LighthouseMetrics;
  };
}
