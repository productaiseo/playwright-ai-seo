import { GENERATIVE_PERFORMANCE_PROMPTS } from './generativePerformancePrompts';

export const PROMPTS = {
  SYSTEM: {
    SEO_EXPERT: "You are an expert SEO analyst specializing in AI search engines like Google's AI Overviews, Perplexity, and ChatGPT. Your analysis should focus on content quality, user intent, and E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) principles.",
    AI_SEARCH_ENGINE: "You are an AI search engine. Your goal is to provide the most helpful and reliable answer to the user's query, using information from trusted web sources. You must cite your sources."
  },
  OPENAI: {
    ...GENERATIVE_PERFORMANCE_PROMPTS,
    ANALYZE_CONTENT_STRUCTURE: (content: string) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the structure of the following content.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak ve her metrik için şu detayları içerecek şekilde JSON formatında oluştur: "score", "justification", "details", "positivePoints", "negativePoints".
      {
        "headings": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "paragraphs": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    ANALYZE_TECHNICAL_GEO: (html: string) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the technical GEO aspects of the following HTML.
      HTML Snippet: """${html.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak ve her metrik için şu detayları içerecek şekilde JSON formatında oluştur: "score", "justification", "details", "positivePoints", "negativePoints".
      {
        "metaTags": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "imageAlts": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    ANALYZE_STRUCTURED_DATA: (html: string) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the structured data (Schema.org) within the following HTML.
      HTML Snippet: """${html.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak ve her metrik için şu detayları içerecek şekilde JSON formatında oluştur: "score" (0-100 arası), "justification", "details", "positivePoints", "negativePoints".
      {
        "schemaOrg": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    ANALYZE_BRAND_AUTHORITY: (url: string, content: string) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the brand authority for the URL ${url} based on the provided content and general knowledge.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak ve her metrik için şu detayları içerecek şekilde JSON formatında oluştur: "score", "justification", "details", "positivePoints", "negativePoints".
      {
        "backlinks": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "brandMentions": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    CHECK_VISIBILITY: (url: string, query: string, content: string) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the content from the URL ${url} to determine its visibility for the search query "${query}".
      Content Snippet: """${content.substring(0, 4000)}..."""
      
      Lütfen yanıtını Türkçe olarak oluştur. Based on the content, provide a JSON response with the following structure:
      {
        "isVisible": boolean, // Is the content a good match for the query?
        "score": number, // Confidence score (0-100)
        "reasons": string[], // Justification for the score
        "suggestions": string[], // Actionable suggestions for improvement
        "contentMetrics": {
          "readability": number, // Score (0-100) for how easy the content is to read
          "relevance": number, // Score (0-100) for relevance to the query
          "depth": number, // Score (0-100) for content depth
          "freshness": number // Score (0-100) for how up-to-date the content seems
        }
      }
    `,
    GENERATE_QUERIES: (domain: string, count: number) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: For the domain "${domain}", generate ${count} potential search queries that a target user (e.g., digital marketer, SME owner) might ask an AI search engine.
      
      Lütfen yanıtını Türkçe olarak oluştur. Provide the response in a JSON object with a "queries" key, which is an array of objects. Each object should have the following structure:
      {
        "query": string,
        "category": string, // e.g., "Product", "Service", "Brand", "Comparison"
        "intent": string, // "informational", "commercial", "transactional", "navigational"
        "searchVolume": number // Estimated search volume (1-100)
      }
    `,
    ANALYZE_BUSINESS_MODEL: (content: string) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the provided website content to determine its primary business model.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak oluştur. Provide a JSON response with the following structure:
      {
        "modelType": "'E-commerce' | 'SaaS' | 'Lead Generation' | 'Content/Media' | 'Marketplace' | 'Other'",
        "confidence": "number (0-100)",
        "justification": "string",
        "keyRevenueStreams": "string[]"
      }
    `,
    ANALYZE_TARGET_AUDIENCE: (content: string) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the provided website content to identify the target audience.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak oluştur. Provide a JSON response with the following structure:
      {
        "primaryAudience": {
          "demographics": "string (e.g., 'Age 25-40, Urban, Tech-savvy')",
          "psychographics": "string (e.g., 'Interested in sustainable fashion, values quality')"
        },
        "secondaryAudiences": "string[]",
        "confidence": "number (0-100)",
        "justification": "string"
      }
    `,
    ANALYZE_COMPETITORS: (content: string, url: string) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the content from ${url} to identify its main business and content competitors. For each business competitor, provide a critically evaluated and realistic estimated GEO Score (0-100). Be conservative in your scoring; high scores (80+) should be reserved for globally recognized market leaders. Base your score on your expert knowledge of their domain authority, market presence, and content quality.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak oluştur. Provide a JSON response with the following structure:
      {
        "businessCompetitors": [{ "name": "string", "url": "string", "reason": "string", "geoScore": "number" }],
        "contentCompetitors": [{ "topic": "string", "url": "string", "reason": "string" }],
        "summary": "string",
        "confidence": "number (0-100)"
      }
    `,
    ANALYZE_EEAT_SIGNALS: (content: string, sector: string, audience: string) => `
      System Prompt: You are a seasoned and objective SEO expert with 20 years of experience. Your goal is to provide a fair, balanced, and evidence-based analysis. Your standards are high, but your feedback is always constructive. Evaluate both the strengths and weaknesses of the content.
      User Prompt: Evaluate the E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals from the provided content, considering it's for the **${sector}** sector with a target audience of **${audience}**. Your score for each pillar must be justified with concrete examples (positive and negative signals) from the text. Also, based on this analysis, generate a detailed executive summary and an impactful action plan.
      Content Snippet: """${content.substring(0, 12000)}..."""
      
      Lütfen yanıtını tamamen Türkçe olarak oluştur. Provide a JSON response with the following structure:
      {
        "eeatAnalysis": {
          "experience": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
          "expertise": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
          "authoritativeness": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
          "trustworthiness": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
          "overallScore": "number"
        },
        "executiveSummary": "string (en az 150 kelime, hedef kitlenin anlayacağı dilde, teknik terimlerden arındırılmış ve doğrudan uygulanabilir tavsiyeler içeren bir metin)",
        "actionPlan": "Array of at least 5 action plan items. Each item must have the following structure: { 'priority': 'high' | 'medium' | 'low', 'description': 'string', 'category': 'string', 'etkiSkoru': 'number (1-10)', 'zorlukSkoru': 'number (1-10)', 'gerekce': 'string (etki ve zorluk skorlarının neden bu şekilde verildiğini açıklayan en az 30 kelimelik bir metin)' }",
        "geoScoreDetails": "{ 'pazarPotansiyeli': 'yüksek' | 'orta' | 'düşük', 'rekabetYogunlugu': 'yüksek' | 'orta' | 'düşük', 'buyumeTrendi': 'pozitif' | 'negatif' | 'stabil', 'markaBilinirligi': 'yüksek' | 'orta' | 'düşük' }"
      }
    `,
    GENERATE_GENERATIVE_PERFORMANCE_REPORT: (content: string, competitors: string[]) => `
      System Prompt: You are a world-class expert in Generative Engine Optimization (GEO) with a deep understanding of how Large Language Models source, process, and present information. Your task is to produce a detailed, data-driven analysis of a brand's performance within generative AI outputs, simulating how a user query about the brand would be answered. Be critical and quantitative.
      User Prompt: Analyze the provided website content to simulate and evaluate its performance in generative AI search results against the following competitors: ${competitors.join(', ')}. The analysis must be thorough, specific, and actionable.
      Content Snippet: """${content.substring(0, 12000)}..."""

      Lütfen yanıtını tamamen Türkçe olarak oluştur. Provide a JSON response with the following structure, ensuring all fields are populated with realistic, critical, and non-mock data based *only* on the provided content:
      {
        "shareOfGenerativeVoice": { 
          "score": "number (0-100, critically evaluate the brand's likely visibility vs. competitors)", 
          "competitors": [${competitors.map(c => `{ "name": "${c}", "score": "number (0-100, estimate based on their likely authority)" }`).join(', ')}] 
        },
        "citationAnalysis": { 
          "citationRate": "number (0-100, estimate how often the brand's own site would be the primary source)", 
          "topCitedUrls": "string[] (list potential URLs from the content that are likely to be cited)" 
        },
        "sentimentAnalysis": { 
          "positive": "number (0-100, based on the tone and claims in the content)", 
          "neutral": "number (0-100)", 
          "negative": "number (0-100)" 
        },
        "accuracyAndHallucination": { 
          "accuracyScore": "number (0-100, how accurate and verifiable is the information presented)", 
          "examples": [{ "incorrectInfo": "string (identify a vague or potentially misleading claim)", "correctInfo": "string (provide a more accurate, specific version)" }] 
        },
        "sourceProvenance": { 
          "sources": [{ "name": "string (e.g., 'Official Website', 'Industry Blogs', 'News Articles')", "percentage": "number (0-100, estimate the source mix an AI would use)" }] 
        }
      }
    `,
    ANALYZE_ENTITY_OPTIMIZATION: (html: string) => `
      System Prompt: You are an expert in Semantic SEO and Knowledge Graph optimization. Your task is to analyze the entity information within a website's HTML content.
      User Prompt: Analyze the following HTML to evaluate its Entity and Knowledge Graph Optimization. Focus on how well the main entities (Organization, Product, Person) are defined and connected to the wider web of data.
      HTML Snippet: """${html.substring(0, 12000)}..."""

      Lütfen yanıtını Türkçe olarak ve her metrik için şu detayları içerecek şekilde JSON formatında oluştur: "score", "justification", "details", "positivePoints", "negativePoints".
      {
        "entityCompletenessScore": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "knowledgeGraphPresence": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "entityReconciliation": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "relationshipAnalysis": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    ANALYZE_CONTENT_STRATEGY: (content: string, competitors: string[]) => `
      System Prompt: You are an advanced AI Content Strategist. Your goal is to analyze content for its effectiveness in generative AI outputs, focusing on providing unique value and answering user questions directly.
      User Prompt: Analyze the following content for its advanced AI content strategy. Consider the provided list of competitors: ${competitors.join(', ')}.
      Content Snippet: """${content.substring(0, 12000)}..."""

      Lütfen yanıtını Türkçe olarak ve her metrik için şu detayları içerecek şekilde JSON formatında oluştur: "score", "justification", "details", "positivePoints", "negativePoints".
      {
        "conversationalReadinessScore": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "informationGainScore": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "geoTopicGapAnalysis": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "multimodalOptimization": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    GENERATE_DELFI_AGENDA: (prometheusReport: string) => `
      System Prompt: You are a strategic consultant specializing in SEO and digital marketing. Your task is to create a "Delfi Agenda" based on a Prometheus report.
      User Prompt: Based on the following Prometheus report, generate a Delfi Agenda. The agenda should identify a primary focus, set strategic goals, and customize predefined questions to guide a strategic discussion.
      Prometheus Report: """${prometheusReport}"""
      
      Lütfen yanıtını Türkçe olarak oluştur. Provide a JSON response with the following structure:
      {
        "oturumOdagi": "string",
        "stratejikHedefler": "string[]",
        "customizedQuestions": [
          { "questionId": 1, "original": "...", "customized": "string" },
          { "questionId": 2, "original": "...", "customized": "string" }
        ]
      }
    `,
    GENERATE_STRATEGIC_IMPACT_FORECAST: (arkheReport: string, prometheusReport: string) => `
      System Prompt: You are a C-Level strategic business consultant with a deep expertise in translating technical SEO data into actionable business intelligence and ROI forecasts. Your audience is founders and executives. Avoid technical jargon.
      User Prompt: Based on the provided Arkhe (Market Analysis) and Prometheus (GEO Performance) reports, generate a high-level Strategic Impact & ROI Forecast.
      Arkhe Report: """${arkheReport}"""
      Prometheus Report: """${prometheusReport}"""

      Lütfen yanıtını tamamen Türkçe olarak oluştur. Provide a JSON response with the following structure:
      {
        "geoOpportunityScore": "number (0-100, based on market potential vs. current GEO score)",
        "estimatedImpact": {
          "trafficIncrease": "string (e.g., '+15-25%')",
          "visibilityIncrease": "string (e.g., '+20-30%')",
          "conversionIncrease": "string (e.g., '+5-10%')"
        },
        "timeToImpact": "string (e.g., '3-6 Ay')",
        "riskAssessment": {
          "trafficLossRisk": "string (describe the risk of inaction)",
          "reputationRisk": "string (describe the risk of negative AI sentiment or hallucinations)"
        },
        "geoSwotAnalysis": {
          "strengths": "string[] (based on high-scoring pillars)",
          "weaknesses": "string[] (based on low-scoring pillars)",
          "opportunities": "string[] (based on market trends and competitor weaknesses)",
          "threats": "string[] (based on competitor strengths and market risks)"
        }
      }
    `,
  },
  GEMINI: {
    CHECK_VISIBILITY: (domain: string, query: string) => `
      As an AI search engine, I need to answer the query: "${query}".
      I have crawled the website "${domain}".
      
      Lütfen yanıtını Türkçe olarak oluştur. Respond in JSON format with the following structure:
      {
        "answer": "A concise answer to the query based on the website's content.",
        "sources": ["${domain}"], // The source domain
        "domainPresent": boolean // true if you used information from the domain, otherwise false
      }
    `,
    GENERATE_QUERIES: (domain: string, count: number) => `
      As an SEO expert, generate ${count} potential search queries for the website "${domain}". The queries should be relevant to a target audience of digital marketers and business owners.
      
      Lütfen yanıtını Türkçe olarak oluştur. Provide the response in a JSON object with a "queries" key, containing an array of objects with this structure:
      {
        "query": "the search query",
        "category": "query category",
        "intent": "user intent (e.g., informational, commercial)",
        "searchVolume": "estimated search volume (1-100)"
      }
    `,
    ANALYZE_BUSINESS_MODEL: (content: string) => `
      Analyze the following website content and determine the business model.
      Content: """${content.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak oluştur. Respond in JSON format with this structure:
      {
        "modelType": "'E-commerce' | 'SaaS' | 'Lead Generation' | 'Content/Media' | 'Marketplace' | 'Other'",
        "confidence": "number (0-100)",
        "justification": "string",
        "keyRevenueStreams": "string[]"
      }
    `,
    ANALYZE_TARGET_AUDIENCE: (content: string) => `
      Analyze the following website content to determine the target audience.
      Content: """${content.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak oluştur. Respond in JSON format with this structure:
      {
        "primaryAudience": {
          "demographics": "string",
          "psychographics": "string"
        },
        "secondaryAudiences": "string[]",
        "confidence": "number (0-100)",
        "justification": "string"
      }
    `,
    ANALYZE_COMPETITORS: (content: string, url: string) => `
      Based on the content from ${url}, identify the main business and content competitors.
      Content: """${content.substring(0, 8000)}..."""
      
      Lütfen yanıtını Türkçe olarak oluştur. Respond in JSON format with this structure:
      {
        "businessCompetitors": [{ "name": "string", "url": "string", "reason": "string" }],
        "contentCompetitors": [{ "topic": "string", "url": "string", "reason": "string" }],
        "summary": "string",
        "confidence": "number (0-100)"
      }
    `,
    ANALYZE_EEAT_SIGNALS: (content: string, sector: string, audience: string) => `
      As a hyper-critical SEO analyst, evaluate the E-E-A-T signals from the provided content for the **${sector}** industry, targeting **${audience}**. Be harsh in your judgment.
      Content: """${content.substring(0, 12000)}..."""
      
      Lütfen yanıtını Türkçe olarak oluştur. Respond in a JSON format. For each E-E-A-T pillar, provide a score (0-100), a critical justification, suggestions for improvement, and specific positive/negative signals you found in the text.
      {
        "experience": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
        "expertise": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
        "authoritativeness": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
        "trustworthiness": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
        "overallScore": "number"
      }
    `,
    GENERATE_GENERATIVE_PERFORMANCE_REPORT: (content: string, competitors: string[]) => `
      As a world-class expert in Generative Engine Optimization (GEO), analyze the brand's performance within generative AI outputs based on the provided content. Compare it against these competitors: ${competitors.join(', ')}.
      Content: """${content.substring(0, 12000)}..."""

      Lütfen yanıtını tamamen Türkçe olarak oluştur. Provide a JSON response with the following structure:
      {
        "shareOfGenerativeVoice": { "score": "number (0-100)", "competitors": [{ "name": "string", "score": "number (0-100)" }] },
        "citationAnalysis": { "citationRate": "number (0-100)", "topCitedUrls": "string[]" },
        "sentimentAnalysis": { "positive": "number (0-100)", "neutral": "number (0-100)", "negative": "number (0-100)" },
        "accuracyAndHallucination": { "accuracyScore": "number (0-100)", "examples": [{ "incorrectInfo": "string", "correctInfo": "string" }] },
        "sourceProvenance": { "sources": [{ "name": "string", "percentage": "number (0-100)" }] }
      }
    `,
    GENERATE_DELFI_AGENDA: (prometheusReport: string) => `
      Based on the provided Prometheus report, generate a Delfi Agenda for a strategic SEO discussion.
      Report: """${prometheusReport}"""
      
      Lütfen yanıtını Türkçe olarak oluştur. Respond in JSON format with this structure:
      {
        "sessionFocus": "string",
        "strategicGoals": "string[]",
        "customizedQuestions": [
          { "questionId": 1, "original": "...", "customized": "string" },
          { "questionId": 2, "original": "...", "customized": "string" }
        ]
      }
    `,
  }
};
