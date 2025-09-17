'use client';

import React, { useState } from 'react';
import { PrometheusReport as PrometheusReportType, MetricScore } from '@/types/geo';
import { FiChevronDown, FiChevronUp, FiTrendingUp, FiCheckCircle, FiXCircle, FiPlusSquare, FiMinusSquare, FiInfo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import PillarPerformanceChart from '@/components/Dashboard/PillarPerformanceChart';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';


interface MetricDetailCardProps {
  metricName: string;
  metricData: MetricScore;
}


const MetricDetailCard: React.FC<MetricDetailCardProps> = ({ metricName, metricData }) => {
  const [isSignalsOpen, setIsSignalsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatMetricName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return { text: 'text-green-400', bg: 'bg-green-500' };
    if (score >= 40) return { text: 'text-yellow-400', bg: 'bg-yellow-500' };
    return { text: 'text-red-400', bg: 'bg-red-500' };
  };

  const scoreColor = getScoreColor(metricData.score);

  return (
    <div className="text-sm bg-blue-800/10 p-3 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <p className="font-semibold text-white/80">{formatMetricName(metricName)}</p>
        <p className={`font-bold ${scoreColor.text}`}>{metricData.score}</p>
      </div>
      <ProgressBar score={metricData.score} colorClass={scoreColor.bg} />
      <p className="text-white/70 mt-2 text-xs">{metricData.justification}</p>
      
      <div className="flex items-center gap-4 mt-3">
        {(metricData.positivePoints || metricData.negativePoints) && (
          <button onClick={() => setIsSignalsOpen(!isSignalsOpen)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center">
            {isSignalsOpen ? 'Sinyalleri Gizle' : 'Sinyalleri Göster'}
            {isSignalsOpen ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />}
          </button>
        )}
        {metricData.details && (
          <button onClick={() => setIsModalOpen(true)} className="text-xs text-purple-400 hover:text-purple-300 flex items-center">
            <FiInfo className="mr-1" />
            Daha Fazla Detay
          </button>
        )}
      </div>

      <AnimatePresence>
        {isSignalsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: '12px' }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            {metricData.positivePoints && metricData.positivePoints.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-bold text-green-400/80 flex items-center"><FiCheckCircle className="mr-1"/> Pozitif Sinyaller:</p>
                <ul className="list-disc list-inside text-xs text-white/70 pl-2 space-y-1 mt-1">
                  {metricData.positivePoints.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {metricData.negativePoints && metricData.negativePoints.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-400/80 flex items-center"><FiXCircle className="mr-1"/> Negatif Sinyaller:</p>
                <ul className="list-disc list-inside text-xs text-white/70 pl-2 space-y-1 mt-1">
                  {metricData.negativePoints.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formatMetricName(metricName)}>
        <p className="text-sm text-white/80">{metricData.details}</p>
      </Modal>
    </div>
  );
};

interface PillarCardProps {
  pillarName: string;
  pillarData: {
    score: number;
    weight: number;
    metrics: Record<string, MetricScore>;
  };
  isOpen: boolean;
  onToggle: () => void;
}

const pillarTranslations: { [key: string]: string } = {
  contentStructure: 'İçerik Yapısı',
  eeatSignals: 'E-E-A-T Sinyalleri',
  technicalGEO: 'Teknik GEO',
  structuredData: 'Yapısal Veri',
  brandAuthority: 'Marka Otoritesi',
  entityOptimization: 'Varlık Optimizasyonu',
  contentStrategy: 'İçerik Stratejisi',
  userJourney: 'Kullanıcı Yolculuğu',
};

const metricTranslations: { [key: string]: string } = {
  headings: 'Başlıklar',
  paragraphs: 'Paragraflar',
  metaTags: 'Meta Etiketler',
  imageAlts: 'Resim Alt Metinleri',
  schemaOrg: 'Schema.org',
  backlinks: 'Geri Bağlantılar',
  brandMentions: 'Marka Bahisleri',
  experience: 'Deneyim',
  expertise: 'Uzmanlık',
  authoritativeness: 'Otorite',
  trustworthiness: 'Güvenilirlik',
  entityCompleteness: 'Varlık Bütünlüğü',
  knowledgeGraphPresence: 'Bilgi Grafiği Varlığı',
  entityReconciliation: 'Varlık Mutabakatı',
  relationshipAnalysis: 'İlişki Analizi',
  conversationalReadinessScore: 'Diyaloğa Hazırlık Skoru',
  informationGainScore: 'Bilgi Kazanım Skoru',
  geoTopicGapAnalysis: 'GEO Konu Boşluğu Analizi',
  multimodalOptimization: 'Çoklu Model Optimizasyonu',
};

const PillarCard: React.FC<PillarCardProps> = ({ pillarName, pillarData, isOpen, onToggle }) => {
  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const score = pillarData?.score;
  const scoreDisplay = score !== null && score !== undefined ? score.toFixed(1) : 'N/A';

  return (
    <div className="bg-blue-900/30 rounded-lg border border-blue-800/30 overflow-hidden">
      <button
        className="w-full flex justify-between items-center p-4 text-left"
        onClick={onToggle}
      >
        <h4 className="font-bold text-lg text-white">{pillarTranslations[pillarName] || pillarName}</h4>
        <div className="flex items-center gap-4">
          <span className={`font-bold text-xl ${getScoreColor(score)}`}>{scoreDisplay}</span>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="border-t border-blue-800/50 pt-4 space-y-4">
              {Object.entries(pillarData.metrics).map(([key, metric]) => (
                <MetricDetailCard key={key} metricName={metricTranslations[key] || key.replace(/([A-Z])/g, ' $1')} metricData={metric} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


interface PrometheusReportProps {
  report: PrometheusReportType;
}

const PrometheusReport: React.FC<PrometheusReportProps> = ({ report }) => {
  if (!report) return null;

  const pillarKeys = Object.keys(report.pillars);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [openStates, setOpenStates] = useState(
    pillarKeys.reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<string, boolean>)
  );

  const allAreOpen = Object.values(openStates).every(Boolean);

  const handleToggleAll = () => {
    const newStates = pillarKeys.reduce((acc, key) => ({ ...acc, [key]: !allAreOpen }), {});
    setOpenStates(newStates);
  };

  const handleTogglePillar = (pillarName: string) => {
    setOpenStates(prev => ({ ...prev, [pillarName]: !prev[pillarName] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="flex items-center text-xl font-bold text-white">
            <FiTrendingUp className="mr-2 text-cyan-400" />
            <span>GEO Direkleri Performansı</span>
          </h3>
          <button
            onClick={handleToggleAll}
            className="flex items-center gap-2 text-xs bg-blue-800/50 hover:bg-blue-800/80 text-white/80 font-semibold py-1 px-3 rounded-lg transition-colors"
          >
            {allAreOpen ? <FiMinusSquare/> : <FiPlusSquare/>}
            <span>{allAreOpen ? 'Tümünü Daralt' : 'Tümünü Genişlet'}</span>
          </button>
        </div>

        <PillarPerformanceChart pillars={report.pillars} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {Object.entries(report.pillars).map(([key, value]) => (
            <PillarCard
              key={key}
              pillarName={key}
              pillarData={value}
              isOpen={openStates[key]}
              onToggle={() => handleTogglePillar(key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrometheusReport;
