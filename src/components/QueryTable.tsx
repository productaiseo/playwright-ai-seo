/* eslint-disable prefer-const */
'use client';

import React, { useState, useMemo } from 'react';
import { FiCheck, FiX, FiAlertCircle, FiArrowUp, FiArrowDown, FiFilter, FiInfo, FiDownload, FiSearch, FiExternalLink, FiMinus } from 'react-icons/fi';

// Görünürlük tipi tanımlaması
export type VisibilityType = 'high' | 'medium' | 'low' | 'unknown';

// Platform görünürlük durumu
export type PlatformVisibility = {
  chatgpt?: VisibilityType;
  gemini?: VisibilityType;
  perplexity?: VisibilityType;
};

// Filtre tipi
type FilterType = VisibilityType | 'all';

// Sorgu tipi
export type Query = {
  id: number;
  query: string;
  category?: {
    id: number;
    name: string;
    color: string;
  };
  visibility: VisibilityType;
  searchVolume: number;
  trafficPotential?: number;
} & PlatformVisibility;

interface QueryTableProps {
  queries: Query[];
}

// Görünürlük sıralaması
const visibilityRank = {
  'high': 3,
  'medium': 2, 
  'low': 1,
  'unknown': 0
};

export default function QueryTable({ queries }: QueryTableProps) {
  // Durum değişkenleri
  const [sortField, setSortField] = useState<keyof Query>('searchVolume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedQueryId, setExpandedQueryId] = useState<number | null>(null);
  const [platformFilter, setPlatformFilter] = useState<Record<string, FilterType>>({
    chatgpt: 'all',
    gemini: 'all',
    perplexity: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtreli ve sıralanmış sorguların hesaplanması
  const filteredAndSortedQueries = useMemo(() => {
    try {
      // Filtreleme
      let result = queries.filter(query => {
        // Platform filtrelerini kontrol et
        const chatgptMatch = platformFilter.chatgpt === 'all' || query.chatgpt === platformFilter.chatgpt;
        const geminiMatch = platformFilter.gemini === 'all' || query.gemini === platformFilter.gemini;
        const perplexityMatch = platformFilter.perplexity === 'all' || query.perplexity === platformFilter.perplexity;
        
        // Arama terimiyle eşleşme kontrol et
        const searchMatch = searchTerm === '' || 
          query.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
          query.category?.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        return chatgptMatch && geminiMatch && perplexityMatch && searchMatch;
      });

      // Sıralama
      return result.sort((a, b) => {
        let compareA, compareB;
        
        // Özel sıralama mantığı
        if (sortField === 'visibility') {
          const rankA = visibilityRank[a.visibility] || 0;
          const rankB = visibilityRank[b.visibility] || 0;
          compareA = rankA;
          compareB = rankB;
        } else {
          compareA = a[sortField];
          compareB = b[sortField];
        }
        
        // Karşılaştırma
        if (typeof compareA === 'number' && typeof compareB === 'number') {
          return sortDirection === 'asc' ? compareA - compareB : compareB - compareA;
        } else if (typeof compareA === 'string' && typeof compareB === 'string') {
          return sortDirection === 'asc' 
            ? compareA.localeCompare(compareB) 
            : compareB.localeCompare(compareA);
        } else {
          return 0;
        }
      });
    } catch (error) {
      console.error('Sorgular sıralanırken hata oluştu:', error);
      return [];
    }
  }, [queries, sortField, sortDirection, platformFilter, searchTerm]);
  
  // Sıralama alanını ve yönünü değiştir
  const handleSortClick = (field: keyof Query) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Yeni alan seçildiğinde varsayılan olarak azalan sıra
    }
  };
  
  // Genişletilen sorguyu değiştir
  const toggleDetails = (queryId: number) => {
    setExpandedQueryId(expandedQueryId === queryId ? null : queryId);
  };
  
  // Platform filtrelerini değiştir
  const handleFilterChange = (platform: string, value: FilterType) => {
    setPlatformFilter(prev => ({
      ...prev,
      [platform]: value
    }));
  };
  
  // CSV dosyası olarak dışa aktar
  const exportToCSV = () => {
    try {
      // CSV başlık satırı
      const headers = ['Sorgu', 'Kategori', 'Görünürlük', 'Arama Hacmi', 'ChatGPT', 'Gemini', 'Perplexity'];
      
      // CSV içeriği oluştur
      const csvContent = [
        headers.join(','),
        ...filteredAndSortedQueries.map(query => [
          `"${query.query.replace(/"/g, '""')}"`, // Çift tırnak içindeki çift tırnakları kaçış
          query.category ? `"${query.category.name.replace(/"/g, '""')}"` : '',
          getVisibilityText(query.visibility),
          query.searchVolume,
          query.chatgpt ? getVisibilityText(query.chatgpt) : '',
          query.gemini ? getVisibilityText(query.gemini) : '',
          query.perplexity ? getVisibilityText(query.perplexity) : ''
        ].join(','))
      ].join('\n');
      
      // Dosya oluştur ve indir
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `sorgular-${timestamp}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('CSV dışa aktarılırken hata oluştu:', error);
    }
  };
  
  // Görünürlük için renk sınıfı
  const getVisibilityColor = (visibility: VisibilityType): string => {
    switch (visibility) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      case 'unknown':
      default: return 'text-gray-400';
    }
  };

  // Görünürlük ikonu
  const renderVisibilityIcon = (visibility: VisibilityType) => {
    switch (visibility) {
      case 'high':
        return <FiCheck className="text-green-400" size={18} />;
      case 'medium':
        return <FiInfo className="text-yellow-400" size={18} />;
      case 'low':
        return <FiAlertCircle className="text-red-400" size={18} />;
      case 'unknown':
      default:
        return <FiX className="text-gray-400" size={18} />;
    }
  };

  // Görünürlük metni (Türkçe)
  const getVisibilityText = (visibility: VisibilityType): string => {
    switch (visibility) {
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      case 'unknown': 
      default: return 'Bilinmiyor';
    }
  };

  return (
    <div className="space-y-4">
      {/* Arama ve Dışa Aktarma Kontrolleri */}
      <div className="flex flex-col md:flex-row gap-4 justify-between mb-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-white/50" size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Sorgu ara..."
            className="w-full md:w-64 bg-blue-900/20 border border-blue-800/30 rounded pl-10 p-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
        >
          <FiDownload size={16} />
          <span>CSV İndir</span>
        </button>
      </div>
      
      {/* Sorgu Tablosu */}
      <div className="overflow-x-auto bg-blue-900/10 rounded-lg border border-blue-800/30">
        <table className="min-w-full divide-y divide-blue-800/30">
          <thead>
            <tr>
              <th 
                className="py-3 px-4 text-white/80 font-medium cursor-pointer"
                onClick={() => handleSortClick('query')}
              >
                <div className="flex items-center gap-1">
                  <span>Sorgu</span>
                  {sortField === 'query' && (
                    sortDirection === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />
                  )}
                </div>
              </th>
              
              <th 
                className="py-3 px-4 text-white/80 font-medium cursor-pointer"
                onClick={() => handleSortClick('visibility')}
              >
                <div className="flex items-center gap-1">
                  <span>Görünürlük</span>
                  {sortField === 'visibility' && (
                    sortDirection === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />
                  )}
                </div>
              </th>
              
              <th 
                className="py-3 px-4 text-white/80 font-medium cursor-pointer"
                onClick={() => handleSortClick('searchVolume')}
              >
                <div className="flex items-center gap-1">
                  <span>Arama Hacmi</span>
                  {sortField === 'searchVolume' && (
                    sortDirection === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />
                  )}
                </div>
              </th>
              
              <th className="py-3 px-4 text-white/80 font-medium relative">
                <div className="flex items-center gap-1 justify-center">
                  <span>ChatGPT</span>
                  <div className="relative group">
                    <FiFilter size={14} className="cursor-pointer text-blue-300" />
                    <div className="hidden group-hover:block absolute z-10 right-0 mt-1 bg-blue-900 rounded-md shadow-lg p-2 w-28">
                      {['all', 'high', 'medium', 'low', 'unknown'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => handleFilterChange('chatgpt', filter as FilterType)}
                          className={`text-xs px-2 py-1 rounded ${
                            platformFilter.chatgpt === filter
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-900/30 text-white/70 hover:bg-blue-900/50'
                          } block w-full text-left mb-1 last:mb-0`}
                        >
                          {filter === 'all' ? 'Tümü' : getVisibilityText(filter as VisibilityType)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </th>
              
              <th className="py-3 px-4 text-white/80 font-medium relative">
                <div className="flex items-center gap-1 justify-center">
                  <span>Gemini</span>
                  <div className="relative group">
                    <FiFilter size={14} className="cursor-pointer text-blue-300" />
                    <div className="hidden group-hover:block absolute z-10 right-0 mt-1 bg-blue-900 rounded-md shadow-lg p-2 w-28">
                      {['all', 'high', 'medium', 'low', 'unknown'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => handleFilterChange('gemini', filter as FilterType)}
                          className={`text-xs px-2 py-1 rounded ${
                            platformFilter.gemini === filter
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-900/30 text-white/70 hover:bg-blue-900/50'
                          } block w-full text-left mb-1 last:mb-0`}
                        >
                          {filter === 'all' ? 'Tümü' : getVisibilityText(filter as VisibilityType)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </th>
              
              <th className="py-3 px-4 text-white/80 font-medium relative">
                <div className="flex items-center gap-1 justify-center">
                  <span>Perplexity</span>
                  <div className="relative group">
                    <FiFilter size={14} className="cursor-pointer text-blue-300" />
                    <div className="hidden group-hover:block absolute z-10 right-0 mt-1 bg-blue-900 rounded-md shadow-lg p-2 w-28">
                      {['all', 'high', 'medium', 'low', 'unknown'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => handleFilterChange('perplexity', filter as FilterType)}
                          className={`text-xs px-2 py-1 rounded ${
                            platformFilter.perplexity === filter
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-900/30 text-white/70 hover:bg-blue-900/50'
                          } block w-full text-left mb-1 last:mb-0`}
                        >
                          {filter === 'all' ? 'Tümü' : getVisibilityText(filter as VisibilityType)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </th>
              
              <th 
                className="py-3 px-4 text-white/80 font-medium cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <span>Kategori</span>
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-blue-800/30">
            {filteredAndSortedQueries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-white/60">
                  Gösterilecek sorgu bulunamadı. Lütfen filtreleri değiştirin veya yeni aramalar yapın.
                </td>
              </tr>
            ) : (
              filteredAndSortedQueries.map((query, index) => {
                return (
                  <React.Fragment key={query.id}>
                    <tr 
                      className={`border-b border-blue-800/20 ${index % 2 === 0 ? 'bg-blue-800/10' : ''} hover:bg-blue-700/20 cursor-pointer transition-colors`}
                      onClick={() => toggleDetails(query.id)}
                    >
                      <td className="py-3 px-4 text-white">
                        <span className="line-clamp-1">{query.query}</span>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {renderVisibilityIcon(query.visibility)}
                          <span className={getVisibilityColor(query.visibility)}>
                            {getVisibilityText(query.visibility)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 text-white">{query.searchVolume.toLocaleString()}</td>
                      
                      <td className="py-3 px-4 text-center">
                        {query.chatgpt ? renderVisibilityIcon(query.chatgpt) : <FiMinus className="text-gray-500 mx-auto" />}
                      </td>
                      
                      <td className="py-3 px-4 text-center">
                        {query.gemini ? renderVisibilityIcon(query.gemini) : <FiMinus className="text-gray-500 mx-auto" />}
                      </td>
                      
                      <td className="py-3 px-4 text-center">
                        {query.perplexity ? renderVisibilityIcon(query.perplexity) : <FiMinus className="text-gray-500 mx-auto" />}
                      </td>
                      
                      <td className="py-3 px-4 text-white">
                        {query.category ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: query.category.color }}
                            />
                            <span>{query.category.name}</span>
                          </div>
                        ) : (
                          <span className="text-white/50">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {expandedQueryId === query.id && (
                      <tr className="bg-blue-700/20">
                        <td colSpan={7} className="py-4 px-6">
                          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <div>
                              <h4 className="text-sm font-medium text-cyan-300 mb-1">Sorgu</h4>
                              <p className="text-sm text-white">{query.query}</p>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-cyan-300 mb-1">Arama Hacmi</h4>
                              <p className="text-sm text-white">{query.searchVolume.toLocaleString()}</p>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-cyan-300 mb-1">Kategori</h4>
                              <p className="text-sm text-white/80">{query.category ? query.category.name : '-'}</p>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-cyan-300 mb-1">Görünürlük</h4>
                              <div className="flex items-center gap-2">
                                {renderVisibilityIcon(query.visibility)}
                                <span className={`text-sm ${getVisibilityColor(query.visibility)}`}>
                                  {getVisibilityText(query.visibility)}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-cyan-300 mb-1">Platform Görünürlüğü</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white/80">ChatGPT:</span>
                                  {query.chatgpt ? (
                                    <div className="flex items-center gap-1">
                                      {renderVisibilityIcon(query.chatgpt)}
                                      <span className={`text-sm ${getVisibilityColor(query.chatgpt)}`}>
                                        {getVisibilityText(query.chatgpt)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-white/50">Bilinmiyor</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white/80">Gemini:</span>
                                  {query.gemini ? (
                                    <div className="flex items-center gap-1">
                                      {renderVisibilityIcon(query.gemini)}
                                      <span className={`text-sm ${getVisibilityColor(query.gemini)}`}>
                                        {getVisibilityText(query.gemini)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-white/50">Bilinmiyor</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white/80">Perplexity:</span>
                                  {query.perplexity ? (
                                    <div className="flex items-center gap-1">
                                      {renderVisibilityIcon(query.perplexity)}
                                      <span className={`text-sm ${getVisibilityColor(query.perplexity)}`}>
                                        {getVisibilityText(query.perplexity)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-white/50">Bilinmiyor</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex justify-end">
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm transition-colors">
                              <FiExternalLink size={14} />
                              <span>Google&apos;da Ara</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-2 text-right text-xs text-white/60">
        Toplam {filteredAndSortedQueries.length} sorgu gösteriliyor
      </div>
    </div>
  );
} 