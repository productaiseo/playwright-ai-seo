'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';

function ErrorContent() {

  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: { [key: string]: string } = {
    Configuration: 'Sunucu yapılandırmasında bir sorun var. Lütfen daha sonra tekrar deneyin.',
    AccessDenied: 'Bu sayfaya erişim izniniz yok.',
    Verification: 'Doğrulama e-postası gönderilemedi.',
    Default: 'Giriş sırasında bir hata oluştu.',
  };

  const message = error && errorMessages[error] ? errorMessages[error] : errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-red-900 text-white flex items-center justify-center p-6">
      <div className="text-center bg-gray-800/50 backdrop-blur-sm p-8 rounded-lg max-w-md w-full">
        <FiAlertTriangle className="text-5xl text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Bir Sorun Oluştu</h1>
        <p className="text-gray-300 mb-6">{message}</p>
        <Link 
          href="/"
          className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <React.Suspense fallback={<div>Yükleniyor...</div>}>
      <ErrorContent />
    </React.Suspense>
  );
}
