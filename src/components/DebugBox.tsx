/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiCopy } from 'react-icons/fi';

interface DebugBoxProps {
  data: any;
}

const DebugBox: React.FC<DebugBoxProps> = ({ data }) => {

  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy');

  if (!data) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopyStatus('Copied!');
    setTimeout(() => setCopyStatus('Copy'), 2000);
  };

  return (
    <div className="mt-8 bg-blue-900/50 border border-blue-700/50 rounded-lg">
      <div  className="flex justify-between items-center p-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold text-white/90">Debug Information</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent accordion from toggling
              handleCopy();
            }}
            className="flex items-center gap-2 text-sm bg-blue-700/50 hover:bg-blue-700/80 text-white/80 font-semibold py-1 px-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <FiCopy />
            <span>{copyStatus}</span>
          </button>
          {isOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </div>
      </div>
      {isOpen && (
        <div className="p-4 border-t border-blue-700/50">
          <pre className="text-xs text-white/70 bg-blue-950 p-3 rounded overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugBox;
