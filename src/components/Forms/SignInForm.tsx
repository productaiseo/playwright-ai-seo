'use client';

import React, { Suspense,  
  // useEffect 
} from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiZap, FiTrendingUp, 
  // FiArrowLeft 
} from 'react-icons/fi';
import Link from 'next/link';
// import { useAuth } from '@/contexts/AuthContext';
// import { useRouter, useSearchParams } from 'next/navigation';
// import Logo from '@/components/Logo';
import EmailAuthForm from '@/components/Forms/EmailAuthForm';


function SignInContent() {

/*   
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
*/

/* 
  useEffect(() => {
    if (isAuthenticated) {
      router.push(callbackUrl);
    }
  }, [isAuthenticated, router, callbackUrl]);

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/70">Yükleniyor...</p>
      </div>
    );
  }
*/

  return (
    <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-96px)] px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side - Benefits */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              AI SEO Analizine
              <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Başlayın
              </span>
            </h1>
            <p className="text-xl text-white/80">E‑posta ve şifrenizle giriş yapın veya kayıt olun.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <FiShield className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Güvenli Giriş</h3>
                <p className="text-white/70 text-sm">Google OAuth ile güvenli ve hızlı giriş</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <FiZap className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Anında Analiz</h3>
                <p className="text-white/70 text-sm">Giriş yaptıktan sonra hemen analiz başlatın</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Geçmiş Takibi</h3>
                <p className="text-white/70 text-sm">Analiz geçmişinizi takip edin ve gelişimi görün</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-blue-900/40 backdrop-blur-sm rounded-2xl border border-cyan-500/30 p-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Hesabınıza Giriş Yapın</h2>
            <p className="text-white/70">E‑posta adresinizle giriş yapın veya yeni hesap oluşturun</p>
          </div>

          <div className="space-y-6">
            <EmailAuthForm />
            
            <div className="text-center text-sm text-white/60">
              <p>
                Giriş yaparak{' '}
                <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">
                  Gizlilik Politikası
                </Link>
                {' '}ve{' '}
                <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">
                  Kullanım Şartları
                </Link>
                'nı kabul etmiş olursunuz.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SignInForm() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <SignInContent />
    </Suspense>
  );
}
