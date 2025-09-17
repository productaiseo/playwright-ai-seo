'use client';

import React from 'react';
import { DelfiAgenda as DelfiAgendaType } from '@/types/geo';
import { FiTarget, FiList, FiHelpCircle, FiArrowRightCircle } from 'react-icons/fi';

interface DelfiAgendaProps {
  report: DelfiAgendaType;
}

const DelfiAgenda: React.FC<DelfiAgendaProps> = ({ report }) => {
  if (!report) return null;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="flex items-center text-xl font-bold text-white mb-3">
          <FiTarget className="mr-2 text-cyan-400" />
          <span>Stratejik Odak</span>
        </h3>
        <p className="text-white/80 bg-blue-900/30 p-4 rounded-lg border border-blue-800/30">{report.oturumOdagi}</p>
      </div>
      
      {report.stratejikHedefler && report.stratejikHedefler.length > 0 && (
        <div>
          <h3 className="flex items-center text-xl font-bold text-white mb-3">
            <FiList className="mr-2 text-cyan-400" />
            <span>Stratejik Hedefler</span>
          </h3>
          <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-800/30">
            <ul className="list-disc list-inside text-white/80 space-y-2">
              {report.stratejikHedefler.map((priority, index) => (
                <li key={index}>{priority}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {report.customizedQuestions && report.customizedQuestions.length > 0 && (
        <div>
          <h3 className="flex items-center text-xl font-bold text-white mb-3">
            <FiHelpCircle className="mr-2 text-cyan-400" />
            <span>Özelleştirilmiş Stratejik Sorular</span>
          </h3>
          <div className="space-y-4">
            {report.customizedQuestions.map((question, index) => (
              <div key={index} className="bg-blue-900/30 p-4 rounded-lg border border-blue-800/30">
                <p className="text-sm font-semibold text-white/60 mb-2 flex items-center">
                  <FiHelpCircle className="mr-2"/>
                  <span className="italic">Orijinal Soru: &quot;{question.original}&quot;</span>
                </p>
                <div className="flex items-start text-white/90">
                  <FiArrowRightCircle className="mr-3 mt-1 flex-shrink-0 text-cyan-400"/>
                  <p>
                    <span className="font-bold">Özelleştirilmiş Soru:</span> {question.customized}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DelfiAgenda;
