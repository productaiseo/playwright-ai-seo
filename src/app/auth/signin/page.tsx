import React, { Suspense } from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Logo from '@/components/Logo';
import SignInForm from '@/components/Forms/SignInForm';


export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-cyan-600 text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo variant="header" />
          <Link 
            href="/"
            className="flex items-center text-white/70 hover:text-white transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Ana Sayfaya Dön
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-96px)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/70">Yükleniyor...</p>
          </div>
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}
