/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { FiShare2, FiSettings, FiPlusCircle, FiDownload } from 'react-icons/fi';

export interface ReportHeaderProps {
  domain: string;
  analysisDate: string;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ domain, analysisDate }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between md:items-center p-4 bg-blue-900/50 rounded-lg border border-blue-800/50">
      <div>
        <h1 className="text-2xl font-bold text-white">SEO Raporu: {domain}</h1>
        <p className="text-sm text-white/70">Analiz Tarihi: {analysisDate}</p>
      </div>
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        <button className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
          <FiDownload />
          <span>Raporu İndir</span>
        </button>
        <button className="text-white/80 hover:text-white transition-colors">
          <FiShare2 />
        </button>
        <button className="text-white/80 hover:text-white transition-colors">
          <FiSettings />
        </button>
      </div>
    </div>
  );
};

export default ReportHeader;
