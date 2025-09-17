'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CompetitorAnalysis } from '@/types/analysis';

interface CompetitorComparisonChartProps {
  competitors: CompetitorAnalysis['businessCompetitors'];
  mainDomainScore: number;
  mainDomainName: string;
}

const CompetitorComparisonChart: React.FC<CompetitorComparisonChartProps> = ({ competitors, mainDomainScore, mainDomainName }) => {
  const chartData = [
    { name: mainDomainName, GEO_Skoru: mainDomainScore },
    ...competitors.map(c => ({ name: c.name, GEO_Skoru: c.geoScore || 0 })),
  ];

  return (
    <div className="w-full h-80 bg-blue-900/30 rounded-lg p-4">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
          <XAxis dataKey="name" tick={{ fill: 'white', fontSize: 12 }} />
          <YAxis tick={{ fill: 'white', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              borderColor: '#00bcd4',
              color: 'white',
            }}
          />
          <Legend wrapperStyle={{ color: 'white' }} />
          <Bar dataKey="GEO_Skoru" fill="#00bcd4" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CompetitorComparisonChart;
