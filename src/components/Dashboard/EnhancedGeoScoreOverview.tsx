/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAlertTriangle, FiAward,
  // FiUsers, FiBarChart2, 
 } from 'react-icons/fi';
import MetricCard from '@/components/ui/MetricCard';
import { GeoScore } from '@/types/geo';


interface EnhancedGeoScoreOverviewProps {
  score: number;
  interpretation: string;
  executiveSummary: string;
  geoScoreDetails?: GeoScore;
}


const Gauge: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  let colorClass = 'text-red-400';
  if (score >= 40) colorClass = 'text-yellow-400';
  if (score >= 70) colorClass = 'text-green-400';

  return (
    <div className="relative w-56 h-56">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-blue-800/50"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <motion.circle
          className={colorClass}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold">{score}</span>
        <span className="text-sm text-white/70">GEO Skoru</span>
      </div>
    </div>
  );
};

const EnhancedGeoScoreOverview: React.FC<EnhancedGeoScoreOverviewProps> = ({
  score,
  interpretation,
  executiveSummary,
  geoScoreDetails,
}) => {
  const interpretationIcons: { [key: string]: React.ReactNode } = {
    Zayıf: <FiAlertTriangle className="mr-2" />,
    Gelişmekte: <FiTrendingUp className="mr-2" />,
    Lider: <FiAward className="mr-2" />,
  };

  return (
    <div className="bg-blue-900/30 backdrop-blur-md rounded-xl p-6 border border-blue-800/30 space-y-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white">Genel GEO Değerlendirmesi</h2>
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <Gauge score={score} />
        </div>
        <div className="flex-grow flex flex-col items-center justify-center">
          <motion.div
            className={`text-3xl font-semibold flex items-center ${
              score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          >
            {interpretationIcons[interpretation]}
            {interpretation}
          </motion.div>
          <p className="text-sm text-white/70 mt-4 text-center">Daha yüksek bir skor için potansiyelinizi bizimle keşfedin.</p>
          <button className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-8 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
            İletişime Geç
          </button>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">Yönetici Özeti</h3>
        <p className="text-white/80 text-base">{executiveSummary}</p>
      </div>
      {geoScoreDetails && (
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-blue-800/30">
          <MetricCard 
            title="Pazar Potansiyeli"
            value={geoScoreDetails.pazarPotansiyeli ? geoScoreDetails.pazarPotansiyeli.charAt(0).toUpperCase() + geoScoreDetails.pazarPotansiyeli.slice(1) : 'N/A'}
            trend={geoScoreDetails.buyumeTrendi}
            description="Pazarın mevcut büyüklüğü ve çekiciliği."
          />
          <MetricCard 
            title="Rekabet Yoğunluğu"
            value={geoScoreDetails.rekabetYogunlugu ? geoScoreDetails.rekabetYogunlugu.charAt(0).toUpperCase() + geoScoreDetails.rekabetYogunlugu.slice(1) : 'N/A'}
            description="Pazardaki rakip sayısı ve gücü."
          />
          <MetricCard 
            title="Büyüme Trendi"
            value={geoScoreDetails.buyumeTrendi ? geoScoreDetails.buyumeTrendi.charAt(0).toUpperCase() + geoScoreDetails.buyumeTrendi.slice(1) : 'N/A'}
            trend={geoScoreDetails.buyumeTrendi}
            description="Pazarın gelecekteki büyüme beklentisi."
          />
          <MetricCard 
            title="Marka Bilinirliği"
            value={geoScoreDetails.markaBilinirligi ? geoScoreDetails.markaBilinirligi.charAt(0).toUpperCase() + geoScoreDetails.markaBilinirligi.slice(1) : 'N/A'}
            description="Markanın pazardaki tanınırlığı."
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedGeoScoreOverview;
