'use client';

import React from 'react';
import { GenerativePerformanceReport as GenerativePerformanceReportType } from '@/types/geo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FiShare2, FiLink, FiSmile, FiAlertTriangle } from 'react-icons/fi';

interface GenerativePerformanceReportProps {
  report: GenerativePerformanceReportType;
}

const MetricCard = ({ title, icon, value, unit, children }: { title: string, icon: React.ReactNode, value: string | number, unit?: string, children?: React.ReactNode }) => (
  <Card className="bg-blue-900/30 border border-blue-800/20">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-white/80">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">
        {value}{unit && <span className="text-xs text-white/60 ml-1">{unit}</span>}
      </div>
      {children}
    </CardContent>
  </Card>
);

const GenerativePerformanceReport: React.FC<GenerativePerformanceReportProps> = ({ report }) => {
  if (!report) {
    return <p>Üretken Performans Raporu mevcut değil.</p>;
  }

  const { shareOfGenerativeVoice, citationAnalysis, sentimentAnalysis, accuracyAndHallucination } = report;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cyan-400">Üretken Performans Raporu</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Üretken Ses Payı" icon={<FiShare2 className="h-4 w-4 text-white/60" />} value={shareOfGenerativeVoice.score.toFixed(1)} unit="%">
          <p className="text-xs text-white/60">AI yanıtlarındaki marka bahsedilmelerine dayanmaktadır.</p>
        </MetricCard>
        <MetricCard title="Alıntılanma Oranı" icon={<FiLink className="h-4 w-4 text-white/60" />} value={citationAnalysis.citationRate.toFixed(1)} unit="%">
           <p className="text-xs text-white/60">{citationAnalysis.citations} toplam alıntı bulundu.</p>
        </MetricCard>
        <MetricCard title="Pozitif Duygu" icon={<FiSmile className="h-4 w-4 text-white/60" />} value={sentimentAnalysis.positive.toFixed(1)} unit="%">
           <p className="text-xs text-white/60">Genel eğilim: {sentimentAnalysis.sentimentTrend}</p>
        </MetricCard>
        <MetricCard title="Doğruluk Skoru" icon={<FiAlertTriangle className="h-4 w-4 text-white/60" />} value={accuracyAndHallucination.accuracyScore.toFixed(1)} unit="%">
           <p className="text-xs text-white/60">RAG doğrulamasına dayanmaktadır.</p>
        </MetricCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-blue-900/30 border border-blue-800/20">
          <CardHeader>
            <CardTitle className="text-lg text-white">Alıntı Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            {citationAnalysis.topCitedUrls.length > 0 ? (
              <ul className="space-y-2">
                {citationAnalysis.topCitedUrls.map((url, index) => (
                  <li key={index} className="text-sm text-cyan-400 truncate">
                    <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/60">AI yanıtlarında doğrudan URL alıntısı bulunamadı.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-900/30 border border-blue-800/20">
          <CardHeader>
            <CardTitle className="text-lg text-white">Doğruluk & Halüsinasyon Örnekleri</CardTitle>
          </CardHeader>
          <CardContent>
            {accuracyAndHallucination.examples.length > 0 ? (
              <ul className="space-y-4">
                {accuracyAndHallucination.examples.slice(0, 3).map((example, index) => (
                  <li key={index} className="text-sm border-b border-blue-800/30 pb-2">
                    <p className="font-semibold text-white/90">İddia: &quot;{example.claim}&quot;</p>
                    <p className={`text-xs mt-1 ${
                      example.verificationResult === 'verified' ? 'text-green-400' :
                      example.verificationResult === 'contradictory' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      Durum: {example.verificationResult}
                    </p>
                    <p className="text-xs text-white/70 mt-1">Açıklama: {example.explanation}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/60">Doğruluk için belirli bir iddia analiz edilmedi.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GenerativePerformanceReport;
