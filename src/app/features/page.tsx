'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiSearch, FiBarChart2, FiPieChart, FiFileText, FiDownload, FiAlertTriangle, FiCheckCircle, FiLayers } from 'react-icons/fi';
import Logo from '@/components/Logo';


export default function FeaturesPage() {
  const features = [
    {
      icon: <FiSearch />,
      title: "AI Görünürlük Analizi",
      description: "Web sitenizin yapay zeka aramalarında ne kadar görünür olduğunu kapsamlı olarak analiz ederiz. ChatGPT, Gemini, Perplexity ve diğer AI asistanlarında sitenizin varlığını kontrol ederiz."
    },
    {
      icon: <FiBarChart2 />,
      title: "Kategori Bazlı Görünürlük",
      description: "Farklı içerik kategorilerinizin yapay zeka aramalarındaki performansını ayrı ayrı ölçeriz. Hangi kategorilerin güçlü, hangilerinin iyileştirilmesi gerektiğini görün."
    },
    {
      icon: <FiPieChart />,
      title: "Platform Karşılaştırmalı Analiz",
      description: "Farklı AI platformlarında (ChatGPT, Gemini, Bing AI, Perplexity) web sitenizin performansını karşılaştırır ve aradaki farkları gösteririz."
    },
    {
      icon: <FiFileText />,
      title: "İçerik Analizi",
      description: "Web sitenizin içeriğini yapay zeka dostu olma açısından değerlendiririz. Okunabilirlik, kapsamlılık, özgünlük ve yapı açısından içeriğinizi analiz ederiz."
    },
    {
      icon: <FiLayers />,
      title: "Özelleştirilmiş Öneriler",
      description: "Sitenizin AI aramalarında daha iyi görünmesi için somut, uygulanabilir ve önceliklendirilmiş öneriler sunuyoruz. Her öneri için etki seviyesi ve uygulama zorluğu belirtilir."
    },
    {
      icon: <FiDownload />,
      title: "Detaylı Raporlama",
      description: "Analiz sonuçlarınızı indirilebilir PDF veya CSV formatında alın. Raporları ekibinizle veya müşterilerinizle paylaşarak iyileştirme stratejinizi planlayın."
    },
    {
      icon: <FiAlertTriangle />,
      title: "Sorun Tespiti",
      description: "Web sitenizin yapay zeka tarafından anlaşılmasını engelleyen teknik ve içerik sorunlarını tespit eder, çözüm önerileri sunarız."
    },
    {
      icon: <FiCheckCircle />,
      title: "Rekabet Analizi",
      description: "Rakiplerinizin AI görünürlüğünü analiz ederek sektörünüzdeki konumunuzu belirler, rekabet avantajı için stratejik öneriler sunarız."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-cyan-900 text-white">
      {/* Üst menü */}
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Logo variant="header" />
          <div className="flex items-center gap-6">
            <Link href="/features" className="text-white hover:text-white transition-colors border-b-2 border-cyan-400 pb-1">
              Özellikler
            </Link>
            <Link href="/about" className="text-white/80 hover:text-white transition-colors">
              Nasıl Çalışır
            </Link>
            <Link 
              href="/login" 
              className="bg-cyan-500 hover:bg-cyan-400 transition-colors px-5 py-2 rounded-full text-white font-medium"
            >
              Giriş
            </Link>
          </div>
        </div>
      </div>

      {/* Ana içerik */}
      <div className="container mx-auto px-4 py-12">
        {/* Geri dön butonu */}
        <div className="mb-6">
          <Link href="/">
            <button className="flex items-center text-white/70 hover:text-white transition-colors">
              <FiArrowLeft className="mr-1" />
              <span>Ana Sayfaya Dön</span>
            </button>
          </Link>
        </div>

        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            AiSEO <span className="text-cyan-400">Özellikleri</span>
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Yapay zeka aramalarında sitenizin görünürlüğünü analiz etmek ve iyileştirmek için kapsamlı çözümler sunuyoruz.
          </p>
        </motion.div>

        {/* Özellikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-blue-900/30 backdrop-blur-md rounded-xl p-6 border border-blue-800/30"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white text-xl mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-white/70">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA bölümü */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 backdrop-blur-md rounded-xl p-8 border border-blue-500/20 text-center max-w-4xl mx-auto"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Sitenizin AI Aramalarındaki Görünürlüğünü Hemen Kontrol Edin
          </h2>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            Yapay zeka aramalarında kaybolan trafik, potansiyel müşteri ve gelir kaybına neden olur. AiSEO ile görünürlüğünüzü artırın.
          </p>
          <Link href="/">
            <button className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-lg text-white font-medium transition-all">
              Ücretsiz Analiz Başlat
            </button>
          </Link>
        </motion.div>
      </div>

      {/* Alt bilgi çubuğu */}
      <footer className="w-full py-8 border-t border-white/10 mt-12">
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
    </div>
  );
} 