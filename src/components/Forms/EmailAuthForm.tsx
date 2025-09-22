/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';


export default function EmailAuthForm() {

  const [mode, setMode] = useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSignin = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push(callbackUrl);
    } catch (e: any) {
      setError(mapAuthError(e?.code) || 'Giriş başarısız.');
    } finally { setBusy(false); }
  };


  const handleSignup = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      if (!accept) {
        setError('Kullanım Şartları ve Gizlilik Politikası kabul edilmelidir.');
        setBusy(false);
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Profil ismi
      const displayName = `${firstName} ${lastName}`.trim();
      try { if (displayName) await updateProfile(cred.user, { displayName }); } catch {}
      // E‑posta doğrulaması
      try { await sendEmailVerification(cred.user); } catch {}
      // Firestore profil
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email,
          displayName: displayName || null,
          firstName: firstName || null,
          lastName: lastName || null,
          company: company || null,
          emailVerified: false,
          provider: 'password',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch {}
      setMessage('Hesap oluşturuldu. E‑posta doğrulaması gönderildi.');
      router.push(callbackUrl);
    } catch (e: any) {
      setError(mapAuthError(e?.code) || 'Kayıt başarısız.');
    } finally { setBusy(false); }
  };


  const handleReset = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Şifre sıfırlama e‑postası gönderildi.');
    } catch (e: any) {
      setError(mapAuthError(e?.code) || 'İşlem başarısız.');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2">
        <button disabled={busy} onClick={() => setMode('signin')} className={`px-3 py-2 rounded-lg text-sm border ${mode==='signin'?'bg-cyan-600 text-white border-cyan-500':'bg-transparent text-white/80 border-white/20'}`}>Giriş</button>
        <button disabled={busy} onClick={() => setMode('signup')} className={`px-3 py-2 rounded-lg text-sm border ${mode==='signup'?'bg-cyan-600 text-white border-cyan-500':'bg-transparent text-white/80 border-white/20'}`}>Kayıt</button>
      </div>
      <div className="space-y-3">
        {mode==='signup' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={firstName} onChange={e=>setFirstName(e.target.value)} type="text" placeholder="Ad" className="w-full px-4 py-3 rounded-lg bg-blue-900/40 border border-cyan-500/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400" />
            <input value={lastName} onChange={e=>setLastName(e.target.value)} type="text" placeholder="Soyad" className="w-full px-4 py-3 rounded-lg bg-blue-900/40 border border-cyan-500/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400" />
          </div>
        )}
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="E‑posta" className="w-full px-4 py-3 rounded-lg bg-blue-900/40 border border-cyan-500/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Şifre" className="w-full px-4 py-3 rounded-lg bg-blue-900/40 border border-cyan-500/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400" />
        {mode==='signup' && (
          <>
            <input value={company} onChange={e=>setCompany(e.target.value)} type="text" placeholder="Şirket (opsiyonel)" className="w-full px-4 py-3 rounded-lg bg-blue-900/40 border border-cyan-500/30 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400" />
            <label className="flex items-center gap-2 text-white/80 text-sm">
              <input type="checkbox" checked={accept} onChange={e=>setAccept(e.target.checked)} className="accent-cyan-500" />
              <span>
                <a href="/terms" className="text-cyan-400 hover:text-cyan-300">Kullanım Şartları</a> ve <a href="/privacy" className="text-cyan-400 hover:text-cyan-300">Gizlilik Politikası</a>‘nı kabul ediyorum.
              </span>
            </label>
          </>
        )}
        {error && <div className="text-red-300 text-sm">{error}</div>}
        {message && <div className="text-green-300 text-sm">{message}</div>}
        {mode==='signin' ? (
          <button disabled={busy} 
          onClick={handleSignin} 
          className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold disabled:opacity-60">Giriş Yap</button>
        ) : (
          <button disabled={busy || !email || !password} 
          onClick={handleSignup} 
          className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold disabled:opacity-60">Kayıt Ol</button>
        )}
        <button disabled={busy} onClick={handleReset} className="w-full py-2 rounded-lg text-sm text-white/80 hover:text-white underline underline-offset-4">Şifremi Unuttum</button>
      </div>
    </div>
  );
}

function mapAuthError(code?: string): string | undefined {
  switch(code){
    case 'auth/email-already-in-use': return 'Bu e‑posta ile zaten hesap var.';
    case 'auth/invalid-email': return 'Geçerli bir e‑posta giriniz.';
    case 'auth/wrong-password': return 'E‑posta veya şifre hatalı.';
    case 'auth/user-not-found': return 'Bu e‑posta ile kullanıcı bulunamadı.';
    case 'auth/too-many-requests': return 'Çok fazla deneme. Lütfen sonra tekrar deneyin.';
    default: return undefined;
  }
}
