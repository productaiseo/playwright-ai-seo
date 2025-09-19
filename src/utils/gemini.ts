/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI, GenerativeModel, Tool, GenerateContentRequest } from '@google/generative-ai';
import logger from './logger';
import { AppError, ErrorType, ErrorCode, createApiError } from '@/utils/errors';
import { ContentVisibilityResult } from '@/types/content';
import { PROMPTS } from '@/prompts/prompts';
import {
  BusinessModelAnalysis,
  CompetitorAnalysis,
  DelfiAgenda,
  EEATAnalysis,
  TargetAudienceAnalysis,
} from '@/types/analysis';
import { GenerativePerformanceReport } from '@/types/geo';

/**
 * Google Gemini API'si ile ilgili utility fonksiyonları içeren modül
 * @module gemini
 */

// API anahtarı
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// Model isimleri (Daha güçlü ve modern modellere güncellendi)
export const MODEL_NAMES = {
  DEFAULT: 'gemini-1.5-flash',
  PRO: 'gemini-1.5-pro',
  PRO_LATEST: 'gemini-1.5-pro-latest',
  VISION: 'gemini-pro-vision',
};

// Grounding yapılandırması (Gemini 1.5 için eski yöntem)
const GROUNDING_CONFIG = {
  tools: [{
    googleSearchRetrieval: {},
  }],
};

/**
 * Gemini API istemcisini yapılandır
 */
export const geminiClient = GEMINI_API_KEY 
  ? new GoogleGenerativeAI(GEMINI_API_KEY)
  : null;

/**
 * Gemini API client'ının yapılandırıldığını ve kullanılabilir olduğunu kontrol eder
 * @returns API kullanılabilir mi?
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

/**
 * Gemini API'sini yapılandırır ve modeli geri döndürür
 * @param apiKey Kullanılacak API anahtarı (opsiyonel, yoksa env'den alınır)
 * @param modelName Kullanılacak model adı (opsiyonel, varsayılan: "gemini-1.5-flash")
 * @param useGrounding Grounding özelliğini kullan (varsayılan: true)
 * @returns Gemini model
 */
export function getGeminiModel(
  apiKey?: string, 
  modelName?: string,
  useGrounding: boolean = true
): GenerativeModel {
  const actualApiKey = apiKey || GEMINI_API_KEY;
  
  if (!actualApiKey) {
    throw createApiError('Gemini API anahtarı sağlanmadı', {
      userFriendlyMessage: 'Gemini API entegrasyonu yapılandırılmamış.'
    });
  }
  
  try {
    const genAI = new GoogleGenerativeAI(actualApiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName || MODEL_NAMES.DEFAULT,
      ...(useGrounding && { tools: GROUNDING_CONFIG.tools as any }) // Geçici olarak any'ye cast ediyoruz
    });
    return model;
  } catch (error) {
    logger.error('Gemini model oluşturma hatası', 'gemini-api', error);
    throw createApiError('Gemini API modeli oluşturulamadı', {
      userFriendlyMessage: 'Gemini API servisine bağlanırken bir sorun oluştu.'
    });
  }
}

/**
 * Gemini API'ye zaman aşımlı ve merkezi hata yönetimli bir istek gönderir.
 * @param model - Kullanılacak GenerativeModel.
 * @param request - `generateContent` metoduna gönderilecek istek.
 * @param context - Loglama için bağlam bilgisi.
 * @returns API'den gelen metin yanıtı.
 */
async function generateContentWithTimeout(model: GenerativeModel, request: GenerateContentRequest, context: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout

  try {
    const result = await model.generateContent(request);
    clearTimeout(timeoutId);
    return result.response.text();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`Gemini API request timed out in ${context}`, 'gemini-timeout');
      throw createApiError(`Gemini API request timed out in ${context}.`);
    }
    if (error.message?.includes('API key not valid')) {
        logger.error('Invalid Gemini API key', context, error);
        throw createApiError('Invalid Gemini API key.', {
            userFriendlyMessage: 'Gemini API anahtarı geçersiz veya eksik.'
        });
    }
    logger.error(`Error in ${context}`, 'gemini-api-error', error);
    throw createApiError(`Failed during ${context} with Gemini.`, {
      originalError: error,
    });
  }
}

export async function checkContentVisibility(
  domain: string,
  query: string,
  options?: {
    model?: string;
    temperature?: number;
    apiKey?: string;
    useGrounding?: boolean;
  }
): Promise<ContentVisibilityResult> {
  try {
    logger.info(`Gemini ile içerik görünürlüğü kontrolü: ${domain}, Sorgu: "${query}"`, 'gemini-visibility-check');
    
    const model = getGeminiModel(
      options?.apiKey, 
      options?.model || MODEL_NAMES.DEFAULT, // PRO_LATEST yerine DEFAULT (flash) kullanalım
      options?.useGrounding ?? true
    );
    const temperature = options?.temperature || 0.3;
    const startTime = Date.now();
    const prompt = PROMPTS.GEMINI.CHECK_VISIBILITY(domain, query);
    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    // generateContentWithTimeout fonksiyonunu burada kullanamayız çünkü response nesnesine ihtiyacımız var.
    // Bu fonksiyon için manuel timeout ve hata yönetimi devam edecek.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const result = await model.generateContent(request);
    clearTimeout(timeoutId);
    
    const response = result.response;
    const text = response.text();
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web?.title) || [];
    
    let jsonResponse;
    try {
      // Gemini'nin bazen eklediği markdown kod bloğunu temizle
      const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
      jsonResponse = JSON.parse(cleanedText);
    } catch (error) {
      logger.error('JSON parse hatası', 'gemini-visibility-check', { error, text });
      throw createApiError('Yanıt işlenirken hata oluştu.');
    }

    const duration = Date.now() - startTime;
    
    logger.info('İçerik görünürlüğü kontrolü tamamlandı', 'gemini-visibility-check', {
      domain,
      query,
      duration,
      sources: sources.length,
      domainPresent: jsonResponse.domainPresent
    });

    return {
      ...jsonResponse,
      sources: [...new Set([...jsonResponse.sources, ...sources])],
      duration,
      groundingMetadata: groundingMetadata || null,
      isVisible: jsonResponse.domainPresent,
      confidence: 0, // Bu alanlar gerekirse daha sonra eklenebilir
      score: 0,
      reasons: [],
      suggestions: [],
    };

  } catch (error: any) {
    const errorDetails = error.response ? error.response.data : error;
    logger.error('İçerik görünürlüğü kontrolü hatası', 'gemini-visibility-check', errorDetails);

    if (error instanceof AppError) {
      throw error;
    }

    if (error.response && error.response.status === 400) {
      throw createApiError('Gemini API\'sine geçersiz istek gönderildi.', {
        userFriendlyMessage: 'Gemini API isteği oluşturulurken bir yapılandırma sorunu oluştu.',
        errorCode: ErrorCode.API_BAD_REQUEST,
        contextData: errorDetails
      });
    }

    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw createApiError('Geçersiz Gemini API anahtarı.', {
            userFriendlyMessage: 'Gemini API anahtarı geçersiz veya eksik. Lütfen Vercel ayarlarınızı kontrol edin.'
        });
    }
    throw createApiError('İçerik görünürlüğü kontrolü başarısız oldu.', { contextData: errorDetails });
  }
}

export async function generatePotentialQueries(
  domain: string,
  options?: {
    model?: string;
    temperature?: number;
    apiKey?: string;
    count?: number;
  }
): Promise<any> {
  try {
    logger.info(`Gemini ile potansiyel sorgular oluşturuluyor: ${domain}`, 'gemini-api');
    
    const model = getGeminiModel(options?.apiKey, options?.model || MODEL_NAMES.PRO_LATEST);
    const count = options?.count || 15;
    const prompt = PROMPTS.GEMINI.GENERATE_QUERIES(domain, count);
    const request: GenerateContentRequest = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: options?.temperature || 0.7 }
    };
    
    const text = await generateContentWithTimeout(model, request, 'generatePotentialQueries');
    
    if (!text) {
      return { queries: [], error: 'Gemini boş yanıt döndürdü' };
    }
    
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return { queries: JSON.parse(jsonMatch[0]) };
      } else {
        throw new Error('JSON formatında yanıt bulunamadı');
      }
    } catch (e) {
      logger.warn('Gemini sorgu yanıtı JSON olarak ayrıştırılamadı', 'gemini-api', { response: text });
      return { queries: [], error: 'Sorgu yanıtı işlenemedi.' };
    }
  } catch (error) {
    logger.error('Gemini potansiyel sorgu oluşturma sırasında hata', 'gemini-api', error);
    throw new AppError(ErrorType.API_ERROR, 'Gemini potansiyel sorgu oluşturma sırasında hata');
  }
}

export async function generateEnhancedAnalysisReport(
  analysisData: any,
  options?: {
    model?: string;
    temperature?: number;
    apiKey?: string;
    maxRecommendations?: number;
  }
): Promise<any> {
  try {
    logger.info(`Gemini Pro ile gelişmiş analiz raporu oluşturuluyor: ${analysisData.domain}`, 'gemini-enhanced-analysis');

    const model = getGeminiModel(options?.apiKey, options?.model || MODEL_NAMES.PRO, true);
    const prompt = `Sen uzman bir AI SEO danışmanısın. ${analysisData.domain} websitesinin analiz sonuçlarını değerlendirerek kapsamlı bir rapor hazırla. Mevcut veriler: ${JSON.stringify(analysisData)}. Sadece JSON formatında yanıt ver.`;
    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature || 0.2,
        maxOutputTokens: 8192,
      }
    };

    const text = await generateContentWithTimeout(model, request, 'generateEnhancedAnalysisReport');

    if (!text) {
      return { enhancedAnalysis: {}, error: 'Gemini boş yanıt döndürdü' };
    }

    try {
      let cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
      if (!cleanedText.startsWith('{')) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
        }
      }
      return { enhancedAnalysis: JSON.parse(cleanedText).enhancedAnalysis };
    } catch (error) {
      logger.error('Gelişmiş analiz JSON parse hatası', 'gemini-enhanced-analysis', error);
      return { enhancedAnalysis: {}, error: 'Yanıt formatı geçersiz' };
    }
  } catch (error) {
    logger.error('Gelişmiş analiz oluşturma hatası', 'gemini-enhanced-analysis', error);
    throw new AppError(ErrorType.API_ERROR, 'Gelişmiş analiz oluşturma sırasında hata');
  }
}

export async function generateText(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    apiKey?: string;
  }
): Promise<string> {
  try {
    logger.info('Gemini ile metin oluşturuluyor', 'gemini-generate-text', { promptLength: prompt.length });
    
    const model = getGeminiModel(
      options?.apiKey, 
      options?.model || MODEL_NAMES.DEFAULT,
      false
    );
    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature || 0.5,
        maxOutputTokens: 256,
      }
    };
    
    const text = await generateContentWithTimeout(model, request, 'generateText');
    
    logger.info('Gemini ile metin başarıyla oluşturuldu', 'gemini-generate-text');
    return text;

  } catch (error: any) {
    logger.error('Gemini metin oluşturma hatası', 'gemini-generate-text', error);
    throw createApiError('Gemini ile metin oluşturulurken bir hata oluştu.', {
      contextData: error
    });
  }
}

/**
 * Gemini API'sinden gelen JSON yanıtını temizler ve ayrıştırır.
 * @param text API'den gelen ham metin yanıtı
 * @param context Loglama için bağlam bilgisi
 * @returns Ayrıştırılmış JSON nesnesi
 */
function parseJsonResponse<T>(text: string, context: string): T {
  try {
    // Find the start and end of the JSON object/array
    const startIndex = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const startBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');

    let jsonString: string | null = null;

    if (startIndex !== -1 && lastBrace !== -1) {
      // It's likely a JSON object
      jsonString = text.substring(startIndex, lastBrace + 1);
    } else if (startBracket !== -1 && lastBracket !== -1) {
      // It's likely a JSON array
      jsonString = text.substring(startBracket, lastBracket + 1);
    }

    if (jsonString) {
      return JSON.parse(jsonString) as T;
    }

    throw new Error('Valid JSON object or array not found in the response text.');
  } catch (error) {
    logger.error('Gemini JSON parse error', context, { error, text });
    throw createApiError('Gemini response could not be parsed.', {
      userFriendlyMessage: 'AI modelinden gelen yanıt işlenemedi.',
      technicalDetails: `Failed to parse JSON from Gemini in ${context}. Response: ${text}`,
    });
  }
}

export async function analyzeBusinessModel(content: string): Promise<BusinessModelAnalysis> {
  const context = 'gemini-analyzeBusinessModel';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.GEMINI.ANALYZE_BUSINESS_MODEL(content);
  const request: GenerateContentRequest = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<BusinessModelAnalysis>(text, context);
}

export async function analyzeTargetAudience(content: string): Promise<TargetAudienceAnalysis> {
  const context = 'gemini-analyzeTargetAudience';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.GEMINI.ANALYZE_TARGET_AUDIENCE(content);
  const request: GenerateContentRequest = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<TargetAudienceAnalysis>(text, context);
}

export async function analyzeCompetitors(content: string, url: string): Promise<CompetitorAnalysis> {
  const context = 'gemini-analyzeCompetitors';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.GEMINI.ANALYZE_COMPETITORS(content, url);
  const request: GenerateContentRequest = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<CompetitorAnalysis>(text, context);
}

export async function analyzeEEATSignals(
  content: string,
  sector: string,
  audience: string
): Promise<EEATAnalysis> {
  const context = 'gemini-analyzeEEATSignals';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.GEMINI.ANALYZE_EEAT_SIGNALS(content, sector, audience);
  const request: GenerateContentRequest = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<EEATAnalysis>(text, context);
}

export async function generateDelfiAgenda(prometheusReport: any): Promise<DelfiAgenda> {
  const context = 'gemini-generateDelfiAgenda';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const reportString = typeof prometheusReport === 'string' ? prometheusReport : JSON.stringify(prometheusReport, null, 2);
  const prompt = PROMPTS.GEMINI.GENERATE_DELFI_AGENDA(reportString);
  const request: GenerateContentRequest = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<DelfiAgenda>(text, context);
}

export async function generateGenerativePerformanceReport(content: string, competitors: string[]): Promise<GenerativePerformanceReport> {
  const context = 'gemini-generateGenerativePerformanceReport';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.OPENAI.GENERATE_GENERATIVE_PERFORMANCE_REPORT(content, competitors); // Using OpenAI prompt for now
  const request: GenerateContentRequest = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<GenerativePerformanceReport>(text, context);
}

export default {
  isGeminiConfigured,
  getGeminiModel,
  checkContentVisibility,
  generatePotentialQueries,
  generateEnhancedAnalysisReport,
  analyzeBusinessModel,
  analyzeTargetAudience,
  analyzeCompetitors,
  analyzeEEATSignals,
  generateDelfiAgenda,
  generateGenerativePerformanceReport,
  MODEL_NAMES,
  GROUNDING_CONFIG,
};
