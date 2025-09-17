'use client';

import React from 'react';
import { FiThumbsUp, FiThumbsDown, FiZap, FiAlertTriangle } from 'react-icons/fi';

interface SwotCardProps {
  title: string;
  items: string[];
  type: 'strengths' | 'weaknesses' | 'opportunities' | 'threats';
}

const SwotCard: React.FC<SwotCardProps> = ({ title, items, type }) => {
  const icons = {
    strengths: <FiThumbsUp className="text-green-400" />,
    weaknesses: <FiThumbsDown className="text-red-400" />,
    opportunities: <FiZap className="text-blue-400" />,
    threats: <FiAlertTriangle className="text-yellow-400" />,
  };

  return (
    <div className="bg-blue-900/30 rounded-lg border border-blue-800/30 p-4">
      <h4 className="flex items-center text-lg font-bold text-white mb-3">
        {icons[type]}
        <span className="ml-2">{title}</span>
      </h4>
      <ul className="list-disc list-inside text-white/80 space-y-1 text-sm">
        {items?.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default SwotCard;
