/* eslint-disable @typescript-eslint/no-unused-vars */
import { BusinessModelAnalysis, CompetitorAnalysis, DelfiAgenda as DelfiAgendaAnalysis, TargetAudienceAnalysis, PerformanceAnalysis } from '@/types/analysis';

export type GeoPillar = "contentStructure" | "eeatSignals" | "technicalGEO" | "structuredData" | "brandAuthority" | "entityOptimization" | "contentStrategy";

export interface QueryPillarPerformance {
  [key: string]: {
    score: number; // 0-100
    summary: string;
  };
}

export interface SerpResultItem {
  position: number;
  title: string;
  link: string;
  snippet: string;
}

export interface QueryAnalysisData {
  isSiteMentioned: boolean;
  summary: string;
  pillarPerformance: QueryPillarPerformance;
  serpResults: SerpResultItem[];
}

export interface MetricScore {
  score: number; // 0-100
  justification: string;
  thoughtProcess?: string;
  negativePoints?: string[]; // Puanı düşüren spesifik olumsuzluklar
  positivePoints?: string[]; // Puanı artıran spesifik olumluluklar
  evidence?: string[]; // Analizi destekleyen kanıtlar
  details?: string; // Metriğin açıklaması ve iyileştirme önerileri
}

export interface KnowledgeGraphPresence {
  found: boolean;
  confidenceScore?: number;
  name?: string;
}

export interface EntityReconciliation {
  completenessScore: number; // 0-100
  reconciliationScore: number; // 0-100
  schemaType: 'Organization' | 'Product' | 'NotFound';
  sameAsLinks: string[];
}

export interface ArkheReport {
  businessModel: BusinessModelAnalysis;
  targetAudience: TargetAudienceAnalysis;
  competitors: CompetitorAnalysis;
}

export interface GeoScore {
  pazarPotansiyeli: 'yüksek' | 'orta' | 'düşük';
  rekabetYogunlugu: 'yüksek' | 'orta' | 'düşük';
  buyumeTrendi: 'pozitif' | 'negatif' | 'stabil';
  markaBilinirligi: 'yüksek' | 'orta' | 'düşük';
}

export interface ActionPlanItem {
  priority: 'high' | 'medium' | 'low';
  description: string;
  category: string;
  etkiSkoru: number | string;
  zorlukSkoru: number | string;
  gerekce?: string;
  responsibleTeam?: string;
  kpiToTrack?: string;
}

export interface MarketAnalysisData {
  pazarBuyuklugu: { value: number; unit: 'Milyon TL' | 'Milyar TL' };
  yillikBuyumeOrani: number; // Yüzde
  anahtarTrendler: string[];
  hedefKitleSegmentleri: Array<{ segment: string; buyukluk: number; davranislar: string[] }>;
}

export interface CompetitorPerformanceData {
  rakipAdi: string;
  geoSkoru: number;
  pazarPayi: number; // Yüzde
  gucluYonler: string[];
  zayifYonler: string[];
}

export interface PrometheusReport {
  scoreInterpretation: 'Zayıf' | 'Gelişmekte' | 'Lider';
  executiveSummary: string;
  overallGeoScore: number;
  geoScoreDetails: GeoScore;
  pillars: {
    contentStructure: { score: number; weight: number; metrics: Record<string, MetricScore>; };
    eeatSignals: { score: number; weight: number; metrics: Record<string, MetricScore>; };
    technicalGEO: { score: number; weight: number; metrics: Record<string, MetricScore>; };
    structuredData: { score: number; weight: number; metrics: Record<string, MetricScore>; };
    brandAuthority: { score: number; weight: number; metrics: Record<string, MetricScore>; };
    entityOptimization: { score: number; weight: number; metrics: Record<string, MetricScore>; };
    contentStrategy: { score: number; weight: number; metrics: Record<string, MetricScore>; };
    performance: { score: number; weight: number; metrics: Record<string, MetricScore> };
  };
  actionPlan: ActionPlanItem[];
}

export interface DelfiAgenda {
  oturumOdagi: string;
  stratejikHedefler: string[];
  customizedQuestions: Array<{
    questionId: number;
    original: string;
    customized: string;
  }>;
}

export interface GenerativePerformanceReport {
  shareOfGenerativeVoice: SoGVMetrics;
  citationAnalysis: CitationMetrics;
  sentimentAnalysis: SentimentMetrics;
  accuracyAndHallucination: HallucinationMetrics;
}

export interface SoGVMetrics {
  score: number; // 0-100
  competitors: Array<{ name: string; score: number }>;
  mentions: number;
}

export interface CitationMetrics {
  citationRate: number; // 0-100
  citations: number;
  topCitedUrls: string[];
}

export interface SentimentMetrics {
  positive: number; // 0-100
  neutral: number; // 0-100
  negative: number; // 0-100
  sentimentTrend: 'positive' | 'neutral' | 'negative' | 'mixed';
}

export interface HallucinationMetrics {
  accuracyScore: number; // 0-100
  examples: Array<{
    claim: string;
    sourceText: string;
    verificationResult: 'verified' | 'unverified' | 'contradictory';
    explanation: string;
  }>;
}

export interface StrategicImpactForecast {
  geoOpportunityScore: number; // 0-100
  estimatedImpact: {
    trafficIncrease: string; // e.g., "+15-25%"
    visibilityIncrease: string; // e.g., "+20-30%"
    conversionIncrease: string; // e.g., "+5-10%"
  };
  timeToImpact: string; // e.g., "3-6 Ay"
  riskAssessment: {
    trafficLossRisk: string;
    reputationRisk: string;
  };
  geoSwotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

export interface AnalysisJob {
  id: string;
  queryId?: string; // Postgres'teki sorgu ID'si
  userId: string;
  url: string;
  status: 'QUEUED' | 'PROCESSING' | 'PROCESSING_SCRAPE' | 'PROCESSING_PSI' | 'PROCESSING_ARKHE' | 'PROCESSING_PROMETHEUS' | 'PROCESSING_LIR' | 'PROCESSING_GENERATIVE_PERFORMANCE' | 'PROCESSING_STRATEGIC_IMPACT' | 'COMPLETED' | 'FAILED';
  createdAt: string; // ISO 8601 formatında tarih
  updatedAt: string; // ISO 8601 formatında tarih
  finalGeoScore: number | null;
  scrapedContent?: string;
  scrapedHtml?: string;
  arkheReport?: ArkheReport;
  prometheusReport?: PrometheusReport;
  delfiAgenda?: DelfiAgenda;
  generativePerformanceReport?: GenerativePerformanceReport;
  strategicImpactForecast?: StrategicImpactForecast;
  performanceReport?: PerformanceAnalysis;
  error?: string; // Hata mesajları için
  topQueries?: { query: string; volume: number; position: number }[];
}
