/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React from 'react';
import { StrategicImpactForecast as ReportType } from '@/types/geo';
import SwotCard from '@/components/Reports/SwotCard';
import { FiAlertTriangle, FiBarChart2, 
  //  FiTrendingUp, FiClock,
} from 'react-icons/fi';

interface StrategicImpactReportProps {
  report: ReportType;
}

const StrategicImpactReport: React.FC<StrategicImpactReportProps> = ({ report }) => {
  if (!report) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
        <div className="bg-blue-950/30 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2">GEO Fırsat Skoru</h3>
          <p className="text-4xl font-bold text-cyan-400">{report.geoOpportunityScore}<span className="text-xl">/100</span></p>
        </div>
        <div className="bg-blue-950/30 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Tahmini Etki Süresi</h3>
          <p className="text-4xl font-bold text-yellow-400">{report.timeToImpact}</p>
        </div>
        <div className="bg-blue-950/30 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Tahmini Trafik Artışı</h3>
          <p className="text-4xl font-bold text-green-400">{report.estimatedImpact.trafficIncrease}</p>
        </div>
      </div>

      <div>
        <h3 className="flex items-center text-xl font-bold text-white mb-4">
          <FiBarChart2 className="mr-2 text-cyan-400" />
          <span>GEO SWOT Analizi</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SwotCard title="Güçlü Yönler" items={report.geoSwotAnalysis.strengths} type="strengths" />
          <SwotCard title="Zayıf Yönler" items={report.geoSwotAnalysis.weaknesses} type="weaknesses" />
          <SwotCard title="Fırsatlar" items={report.geoSwotAnalysis.opportunities} type="opportunities" />
          <SwotCard title="Tehditler" items={report.geoSwotAnalysis.threats} type="threats" />
        </div>
      </div>

      <div>
        <h3 className="flex items-center text-xl font-bold text-white mb-4">
          <FiAlertTriangle className="mr-2 text-cyan-400" />
          <span>Risk Değerlendirmesi</span>
        </h3>
        <div className="space-y-4">
          <div className="bg-blue-950/30 p-4 rounded-lg">
            <h4 className="font-bold text-lg mb-2 text-red-400">Trafik Kaybı Riski</h4>
            <p className="text-white/80">{report.riskAssessment.trafficLossRisk}</p>
          </div>
          <div className="bg-blue-950/30 p-4 rounded-lg">
            <h4 className="font-bold text-lg mb-2 text-yellow-400">İtibar Riski</h4>
            <p className="text-white/80">{report.riskAssessment.reputationRisk}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategicImpactReport;
