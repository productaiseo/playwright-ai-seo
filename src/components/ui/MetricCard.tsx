'use client';

import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  trend?: 'pozitif' | 'negatif' | 'stabil';
}

const TrendIcon: React.FC<{ trend?: 'pozitif' | 'negatif' | 'stabil' }> = ({ trend }) => {
  if (trend === 'pozitif') {
    return <FiTrendingUp className="text-green-400" />;
  }
  if (trend === 'negatif') {
    return <FiTrendingDown className="text-red-400" />;
  }
  return <FiMinus className="text-yellow-400" />;
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description, trend }) => {
  return (
    <div className="bg-blue-900/30 rounded-lg border border-blue-800/30 p-4 h-full">
      <div className="flex justify-between items-start">
        <h4 className="text-sm font-semibold text-white/60 mb-1">{title}</h4>
        {trend && <TrendIcon trend={trend} />}
      </div>
      <p className="text-lg font-bold text-white mb-2">{value}</p>
      <p className="text-xs text-white/70">{description}</p>
    </div>
  );
};

export default MetricCard;
