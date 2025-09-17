'use client';

import React, { useState, useRef } from 'react';
import { FiSearch, FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// import Image from 'next/image';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import AuthButton from '@/components/AuthButton';


export default function Home() {

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Lütfen bir web sitesi URL\'si girin');
      return;
    }
    
    // Basit URL formatı doğrulama
    const urlPattern = /^(?:(?:https?):\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?$/;
    if (!urlPattern.test(url)) {
      setError('Lütfen geçerli bir URL formatı girin');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      // URL'den www ve http/https kısmını temizle
      const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
      
      // Sonuç sayfasına yönlendir
      router.push(`/results/${encodeURIComponent(cleanUrl)}`);
    } catch (err) {
      console.error('Error processing URL:', err);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-950 to-cyan-900 text-white px-4 py-16 md:py-24">
      {/* Arka plan animasyonu */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-800/10 via-transparent to-transparent opacity-70"></div>
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute top-2/3 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Üst menü */}
      <div className="w-full max-w-7xl mx-auto px-4 absolute top-0 left-0 right-0 z-10">
        <div className="flex justify-between items-center py-4">
          <Logo variant="header" />
          <div className="flex items-center gap-6">
            <Link href="/features" className="text-white/80 hover:text-white transition-colors">
              Özellikler
            </Link>
            <Link href="/about" className="text-white/80 hover:text-white transition-colors">
              Nasıl Çalışır
            </Link>
            <AuthButton variant="header" />
          </div>
        </div>
      </div>
      
      {/* Ana içerik */}
      <div className="w-full max-w-4xl mx-auto mt-16 flex flex-col items-center px-4 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Web siteniz <span className="text-cyan-400">AI aramalarında</span> görünür mü?
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8">
            Yapay zeka arama motorları geleneksel aramalardan farklı çalışır. Yeni arama akışında
            görünürlüğünüzü kaybetmek, trafiğinizin %30-40&apos;ını kaybetmek anlamına gelebilir.
          </p>
          
          <div className="max-w-2xl mx-auto w-full">
            <form 
              onSubmit={handleSubmit}
              className="flex flex-col md:flex-row w-full gap-3 mt-10"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="text-blue-300" size={20} />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Web site URL'nizi girin..."
                  className="w-full py-4 pl-12 pr-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-white/50"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`py-4 px-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl font-medium flex items-center justify-center transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Analizi Başlat</span>
                    <FiArrowRight className="ml-2" />
                  </>
                )}
              </button>
            </form>
            
            {error && (
              <div className="mt-3 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Özellikler */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16"
        >
          <div className="bg-blue-900/20 backdrop-blur-md border border-blue-800/30 rounded-xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Görünürlük Analizi</h3>
            <p className="text-white/70">Sitenizin ChatGPT, Bing AI ve Google gibi tüm AI araçlarında nasıl göründüğünü kontrol edin.</p>
          </div>
          
          <div className="bg-blue-900/20 backdrop-blur-md border border-blue-800/30 rounded-xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">İyileştirme Tavsiyeleri</h3>
            <p className="text-white/70">AI aramalarında daha iyi görünmek için sitenize özel optimizasyon önerileri alın.</p>
          </div>
          
          <div className="bg-blue-900/20 backdrop-blur-md border border-blue-800/30 rounded-xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Düzenli Raporlar</h3>
            <p className="text-white/70">Sitenizin AI araçlarındaki performansını düzenli olarak takip edin ve gelişiminizi görün.</p>
          </div>
        </motion.div>
        
        {/* Ek içerik - Müşteri logoları veya referanslar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full mt-24 text-center"
        >
          <p className="text-white/50 text-sm mb-6">BİNLERCE ŞİRKET TARAFINDAN GÜVENİLİYOR</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {/* Logo placeholder'lar - gerçek projede bu kısma gerçek logolar eklenebilir */}
            <div className="w-24 h-12 bg-white/10 rounded-md"></div>
            <div className="w-24 h-12 bg-white/10 rounded-md"></div>
            <div className="w-24 h-12 bg-white/10 rounded-md"></div>
            <div className="w-24 h-12 bg-white/10 rounded-md"></div>
            <div className="w-24 h-12 bg-white/10 rounded-md"></div>
          </div>
        </motion.div>
      </div>
      
      {/* Alt bilgi çubuğu */}
      <footer className="w-full mt-24 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-white/60 text-sm mb-4 md:mb-0">
            © 2025 AiSEO Optimizer. Tüm hakları saklıdır.
          </div>
          <div className="flex gap-4">
            <a href="#" className="text-white/60 hover:text-white/90 transition-colors text-sm">Gizlilik Politikası</a>
            <a href="#" className="text-white/60 hover:text-white/90 transition-colors text-sm">Kullanım Koşulları</a>
            <a href="#" className="text-white/60 hover:text-white/90 transition-colors text-sm">İletişim</a>
          </div>
        </div>
      </footer>
      
      {/* @keyframes için gerekli stil */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  );
}
