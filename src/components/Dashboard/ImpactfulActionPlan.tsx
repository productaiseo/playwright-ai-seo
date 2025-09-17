import React from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiTool, FiBarChart2 } from 'react-icons/fi';
import { ActionPlanItem } from '@/types/geo';


interface ImpactfulActionPlanProps {
  actionPlan: ActionPlanItem[];
}


const priorityStyles = {
  high: { icon: <FiZap className="text-red-400" />, text: 'Yüksek Öncelik', bg: 'bg-red-900/30', border: 'border-red-500/50' },
  medium: { icon: <FiTool className="text-yellow-400" />, text: 'Orta Öncelik', bg: 'bg-yellow-900/30', border: 'border-yellow-500/50' },
  low: { icon: <FiBarChart2 className="text-green-400" />, text: 'Düşük Öncelik', bg: 'bg-green-900/30', border: 'border-green-500/50' },
};

const ImpactfulActionPlan: React.FC<ImpactfulActionPlanProps> = ({ actionPlan }) => {

  const sortedPlan = [...actionPlan].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    const etkiA = typeof a.etkiSkoru === 'string' ? parseInt(a.etkiSkoru, 10) : a.etkiSkoru;
    const etkiB = typeof b.etkiSkoru === 'string' ? parseInt(b.etkiSkoru, 10) : b.etkiSkoru;
    if (etkiA !== etkiB) {
      return etkiB - etkiA;
    }
    const zorlukA = typeof a.zorlukSkoru === 'string' ? parseInt(a.zorlukSkoru, 10) : a.zorlukSkoru;
    const zorlukB = typeof b.zorlukSkoru === 'string' ? parseInt(b.zorlukSkoru, 10) : b.zorlukSkoru;
    return zorlukA - zorlukB;
  });

  return (
    <div className="bg-blue-900/30 backdrop-blur-md rounded-xl p-6 border border-blue-800/30 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4">Önerilen Aksiyon Planı</h2>
      <div className="space-y-4 overflow-y-auto pr-2 modern-scrollbar flex-grow min-h-[450px]">
        {sortedPlan?.map((item, index) => (
          <motion.div
            key={index}
            className={`p-4 rounded-lg border ${priorityStyles[item.priority].bg} ${priorityStyles[item.priority].border}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center text-sm font-semibold mb-2">
                  {priorityStyles[item.priority].icon}
                  <span className="ml-2">{priorityStyles[item.priority].text}</span>
                </div>
                <p className="text-white/90">{item.description}</p>
              </div>
              <div className="flex space-x-4 text-sm text-center">
                <div>
                  <p className="font-bold text-lg text-cyan-400">{item.etkiSkoru}/10</p>
                  <p className="text-white/60">Etki</p>
                </div>
                <div>
                  <p className="font-bold text-lg text-orange-400">{item.zorlukSkoru}/10</p>
                  <p className="text-white/60">Zorluk</p>
                </div>
              </div>
            </div>
            {item.gerekce && <p className="text-xs text-white/60 mt-3 pt-2 border-t border-white/10">{item.gerekce}</p>}
            <p className="text-xs text-white/50 mt-2">Kategori: {item.category}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ImpactfulActionPlan;
