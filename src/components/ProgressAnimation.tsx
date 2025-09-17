'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiLoader } from 'react-icons/fi';

export type AnalysisStep = {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
};

type ProgressAnimationProps = {
  steps: AnalysisStep[];
  progress: number;
};

const ProgressAnimation: React.FC<ProgressAnimationProps> = ({ steps, progress }) => {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 w-full max-w-2xl mx-auto shadow-xl border border-blue-800/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Mevcut Aşama</h2>
        <div className="text-3xl font-bold text-cyan-400">{progress}%</div>
      </div>
      
      {/* İlerleme çubuğu */}
      <div className="h-2 bg-blue-900/30 rounded-full mb-8 overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      {/* Adımlar */}
      <div className="space-y-4">
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`flex items-center gap-3 ${
              step.completed 
                ? 'text-white' 
                : step.current 
                  ? 'text-white' 
                  : 'text-white/40'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              step.completed 
                ? 'bg-cyan-500' 
                : step.current 
                  ? 'bg-blue-500 animate-pulse' 
                  : 'bg-blue-900/30'
            }`}>
              {step.completed ? (
                <FiCheck size={16} />
              ) : step.current ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <FiLoader size={16} />
                </motion.div>
              ) : null}
            </div>
            <span className="text-base">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressAnimation; 