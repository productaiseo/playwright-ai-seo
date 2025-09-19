import { SubcomponentScore } from '@/types/scoring';
import { MetricScore } from '@/types/geo';

const metricWeights: Record<string, number> = {
  knowledgeGraphPresence: 0.5,
  entityReconciliation: 0.25,
  entityCompleteness: 0.25,
};

export function calculatePillarScore(metrics: Record<string, MetricScore>, pillarName: string): number {
  const metricValues = Object.entries(metrics).filter(([key]) => key !== 'overallLighthouseScore');
  if (metricValues.length === 0) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  const hasSpecialWeights = metricValues.some(([key]) => metricWeights[key]);

  if (hasSpecialWeights) {
    metricValues.forEach(([key, m]) => {
      const weight = metricWeights[key] || 0;
      if (weight > 0) {
        totalScore += m.score * weight;
        totalWeight += weight;
      }
    });
    if (totalWeight === 0) {
      totalScore = metricValues.reduce((sum, [, m]) => sum + m.score, 0);
      totalWeight = metricValues.length;
    }
  } else {
    totalScore = metricValues.reduce((sum, [, m]) => sum + m.score, 0);
    totalWeight = metricValues.length;
  }

  if (totalWeight === 0) return 0;

  let finalScore = totalScore / totalWeight;

  // Apply penalty: -5 points per negative point across metrics
  const negativeCount = metricValues.reduce((acc, [, m]) => acc + (m.negativePoints?.length || 0), 0);
  if (negativeCount > 0) {
    finalScore -= negativeCount * 5;
  }
  // Additional penalty for metrics marked as NEEDS_IMPROVEMENT / POOR in justification
  const needsImprovementCount = metricValues.reduce((acc, [, m]) => acc + (m.justification?.includes('NEEDS_IMPROVEMENT') ? 1 : 0), 0);
  const poorCount = metricValues.reduce((acc, [, m]) => acc + (m.justification?.includes('POOR') ? 1 : 0), 0);
  finalScore -= needsImprovementCount * 5;
  finalScore -= poorCount * 10;

  // Clamp 0..100
  if (finalScore < 0) finalScore = 0;
  if (finalScore > 100) finalScore = 100;
  return Math.round(finalScore);
}


/**
 * Hatalı alt bileşenleri tolere eden esnek bir puanlama hesaplama fonksiyonu.
 * Puanı null olan bileşenleri hesaplama dışında tutar ve ağırlıkları yeniden dağıtır.
 * @param subcomponents - Puanlanacak alt bileşenlerin dizisi.
 * @returns Ağırlıklı ortalama puan. Eğer tüm bileşenler hatalıysa 0 döner.
 */
export function calculateResilientScore(subcomponents: SubcomponentScore[]): number {
  const validSubcomponents = subcomponents.filter(
    (sc) => sc.score !== null && sc.score !== undefined
  );

  if (validSubcomponents.length === 0) {
    return 0;
  }

  const totalWeight = validSubcomponents.reduce(
    (sum, sc) => sum + sc.weight,
    0
  );

  if (totalWeight === 0) {
    return 0;
  }

  const weightedScore = validSubcomponents.reduce(
    (sum, sc) => sum + (sc.score! * sc.weight),
    0
  );

  return weightedScore / totalWeight;
}
