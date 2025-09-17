'use client';

import React from 'react';
import { PrometheusReport as PrometheusReportType } from '@/types/geo';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PillarPerformanceChartProps {
  pillars: PrometheusReportType['pillars'];
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

const PillarPerformanceChart: React.FC<PillarPerformanceChartProps> = ({ pillars }) => {
  const radarData = Object.entries(pillars).map(([key, value]) => ({
    subject: pillarTranslations[key] || key,
    A: value.score,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-80 bg-blue-900/30 rounded-lg p-4">
      <ResponsiveContainer>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
          <PolarGrid gridType="polygon" stroke="rgba(255, 255, 255, 0.2)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'white', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Skor" dataKey="A" stroke="#00bcd4" fill="#00bcd4" fillOpacity={0.7} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              borderColor: '#00bcd4',
              color: 'white',
            }}
          />
          <Legend wrapperStyle={{ color: 'white' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PillarPerformanceChart;
