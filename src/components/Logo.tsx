'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  variant?: 'header' | 'footer' | 'large';
  showText?: boolean;
  className?: string;
}

export default function Logo({ 
  variant = 'header', 
  showText = true, 
  className = '' 
}: Readonly<LogoProps>) {
  const [imageError, setImageError] = useState(false);

  // Boyut ayarları
  const sizes = {
    header: { width: 200, height: 60, textSize: 'text-2xl' },
    footer: { width: 150, height: 45, textSize: 'text-xl' },
    large: { width: 300, height: 90, textSize: 'text-4xl' }
  };

  const { width, height, textSize } = sizes[variant];

  // Logo dosyası mevcut değilse text-based logo göster
  const TextLogo = () => (
    <div className={`flex items-center ${className}`}>
      <span className={`${textSize} font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent`}>
        Ai
      </span>
      {showText && (
        <span className={`${textSize} font-bold text-white ml-1`}>
          SEO
        </span>
      )}
    </div>
  );

  // Image logo ile fallback
  const ImageLogo = () => (
    <div className={`flex items-center ${className}`}>
      {!imageError ? (
        <Image
          src="/logo.svg"
          alt="AiSEO Logo"
          width={width}
          height={height}
          className="object-contain"
          style={{ height: 'auto' }}
          onError={() => setImageError(true)}
          priority={variant === 'header'}
        />
      ) : (
        <TextLogo />
      )}
    </div>
  );

  return (
    <Link href="/" className="inline-block">
      <ImageLogo />
    </Link>
  );
}

// Sadece text logo için ayrı component
export function TextOnlyLogo({ 
  variant = 'header', 
  className = '' 
}: Readonly<Omit<LogoProps, 'showText'>>) {
  const sizes = {
    header: 'text-2xl',
    footer: 'text-xl', 
    large: 'text-4xl'
  };

  return (
    <Link href="/" className={`inline-block ${className}`}>
      <div className="flex items-center">
        <span className={`${sizes[variant]} font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent`}>
          Ai
        </span>
        <span className={`${sizes[variant]} font-bold text-white ml-1`}>
          SEO
        </span>
      </div>
    </Link>
  );
}
