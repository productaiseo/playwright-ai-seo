'use client';

import React, { useState } from 'react';
import { FiTrendingUp, FiLayout, FiBarChart2, FiFileText, FiZap, FiShield } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import PrometheusReportComponent from '@/components/Reports/PrometheusReport';
import ArkheReportComponent from '@/components/Reports/ArkheReport';
import DelfiAgendaComponent from '@/components/Reports/DelfiAgenda';
import StrategicImpactReportComponent from '@/components/Reports/StrategicImpactReport';
import GenerativePerformanceReport from '@/components/Reports/GenerativePerformanceReport';
import EnhancedGeoScoreOverview from '@/components/Dashboard/EnhancedGeoScoreOverview';
import ImpactfulActionPlan from '@/components/Dashboard/ImpactfulActionPlan';
import { AnalysisJob } from '@/types/geo';
import CompetitorComparisonChart from '@/components/Dashboard/CompetitorComparisonChart';


type Tab = 'overview' | 'prometheus' | 'arkhe' | 'delfi' | 'strategic' | 'generative';

interface ReportTabsProps {
  jobReport: AnalysisJob;
}


const ReportTabs: React.FC<ReportTabsProps> = ({ jobReport }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const {
    prometheusReport,
    arkheReport,
    delfiAgenda,
    strategicImpactForecast,
    generativePerformanceReport,
  } = jobReport;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Genel Bakış', icon: <FiLayout /> },
    { id: 'prometheus', label: 'Teknik GEO Performansı', icon: <FiBarChart2 /> },
    { id: 'arkhe', label: 'Pazar ve Rakip Analizi', icon: <FiShield /> },
    { id: 'delfi', label: 'Stratejik Büyüme Planı', icon: <FiFileText /> },
    { id: 'strategic', label: 'Stratejik Etki & ROI', icon: <FiTrendingUp /> },
    { id: 'generative', label: 'Üretken Performans', icon: <FiZap /> },
  ];

  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && prometheusReport ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnhancedGeoScoreOverview
                score={prometheusReport.overallGeoScore}
                interpretation={prometheusReport.scoreInterpretation}
                executiveSummary={prometheusReport.executiveSummary}
                geoScoreDetails={prometheusReport.geoScoreDetails}
              />
              <ImpactfulActionPlan actionPlan={prometheusReport.actionPlan} />
            </div>
          ) : activeTab === 'overview' && !prometheusReport ? (
            <div>Genel Bakış verileri yüklenemedi.</div>
          ) : null}

          {activeTab === 'prometheus' && prometheusReport ? (
            <PrometheusReportComponent report={prometheusReport} />
          ) : activeTab === 'prometheus' && !prometheusReport ? (
            <div>Teknik GEO Performansı verileri yüklenemedi.</div>
          ) : null}

          {activeTab === 'arkhe' && arkheReport && prometheusReport ? (
            <div>
              <ArkheReportComponent report={arkheReport} />
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-4">Rakip Karşılaştırması</h3>
                <CompetitorComparisonChart
                  competitors={arkheReport.competitors.businessCompetitors}
                  mainDomainScore={prometheusReport.overallGeoScore}
                  mainDomainName={jobReport.url ? jobReport.url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] : 'Analiz Edilen Site'}
                />
              </div>
            </div>
          ) : activeTab === 'arkhe' && (!arkheReport || !prometheusReport) ? (
            <div>Pazar ve Rakip Analizi verileri yüklenemedi.</div>
          ) : null}

          {activeTab === 'delfi' && delfiAgenda ? (
            <DelfiAgendaComponent report={delfiAgenda} />
          ) : activeTab === 'delfi' && !delfiAgenda ? (
            <div>Stratejik Büyüme Planı verileri yüklenemedi.</div>
          ) : null}

          {activeTab === 'strategic' && strategicImpactForecast ? (
            <StrategicImpactReportComponent report={strategicImpactForecast} />
          ) : activeTab === 'strategic' && !strategicImpactForecast ? (
            <div>Stratejik Etki & ROI verileri yüklenemedi.</div>
          ) : null}

          {activeTab === 'generative' && generativePerformanceReport ? (
            <GenerativePerformanceReport report={generativePerformanceReport} />
          ) : activeTab === 'generative' && !generativePerformanceReport ? (
            <div>Üretken Performans verileri yüklenemedi.</div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="w-full bg-blue-900/20 rounded-lg border border-blue-800/30 p-6">
      <div className="border-b border-blue-700/50">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs?.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-white/60 hover:text-white hover:border-blue-600/80'
              } flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default ReportTabs;
