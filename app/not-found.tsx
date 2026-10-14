import React from 'react';
import Link from 'next/link';
import { BookOpen, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FEFDF9] text-zinc-900 font-['Noto_Sans_Bengali']">
      <header className="border-b border-amber-100 bg-[#FFFDF9] py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300/40 flex items-center justify-center text-amber-800 font-black text-lg">
              শ
            </div>
            <div>
              <span className="font-black text-lg text-zinc-900 group-hover:text-amber-800 transition-colors">
                শেষের পাতা
              </span>
              <span className="block text-[10px] text-zinc-500 -mt-1 font-medium">
                অনলাইন বুকশপ
              </span>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>হোমে যান</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 my-12">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-zinc-200 shadow-xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-inner">
            <BookOpen className="w-10 h-10 stroke-[1.75]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              ৪০৪ — পাওয়া যায়নি
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 pt-2">
              বইটি খুঁজে পাওয়া যায়নি
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed pt-1">
              আপনি যে বইটির লিংক খুঁজছেন তা হয়তো সরানো হয়েছে অথবা লিংকটি ভুল। শেষের পাতা বুকশপে অন্যান্য আকর্ষণীয় বইগুলো ঘুরে দেখুন।
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>হোমপেজে ফিরে যান</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 bg-[#FFFDF9]">
        <p>© {new Date().getFullYear()} শেষের পাতা — সর্বস্বত্ব সংরক্ষিত।</p>
      </footer>
    </div>
  );
}
