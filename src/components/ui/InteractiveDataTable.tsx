/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo } from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

interface Column {
  key: string;
  header: string;
}

interface InteractiveDataTableProps {
  columns: Column[];
  data: any[];
}

const InteractiveDataTable: React.FC<InteractiveDataTableProps> = ({ columns, data }) => {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  const handleSortClick = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="overflow-x-auto bg-blue-900/20 rounded-lg border border-blue-800/30">
      <table className="min-w-full divide-y divide-blue-800/20">
        <thead className="bg-blue-800/10">
          <tr>
            {columns?.map((col) => (
              <th
                key={col.key}
                className="py-3 px-4 text-left text-xs font-medium text-white/80 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortClick(col.key)}
              >
                <div className="flex items-center gap-1">
                  <span>{col.header}</span>
                  {sortField === col.key && (
                    sortDirection === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-800/20">
          {sortedData.map((row, index) => (
            <tr key={index} className={`${index % 2 === 0 ? 'bg-blue-800/10' : ''} hover:bg-blue-700/20 transition-colors`}>
              {columns.map((col) => (
                <td key={col.key} className="py-4 px-4 whitespace-nowrap text-sm text-white/90">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InteractiveDataTable;
