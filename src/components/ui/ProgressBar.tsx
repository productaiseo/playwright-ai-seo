'use client';

import React from 'react';

interface ProgressBarProps {
  score: number;
  colorClass: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ score, colorClass }) => {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <div
        className={`${colorClass} h-2.5 rounded-full transition-all duration-500`}
        style={{ width: `${score}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
