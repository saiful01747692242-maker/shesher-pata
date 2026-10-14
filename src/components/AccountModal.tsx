'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  ShoppingBag,
  Heart,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { trackCompleteRegistration } from '../utils/metaPixel';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrders: () => void;
  onOpenWishlist?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onOpenOrders,
  onOpenWishlist,
}) => {
  const { showToast } = useToast();
  const { user, profile, signIn, signUp, signOut, isLoading } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setConfirmationNotice(null);
    setIsSubmitting(true);

    try {
      const res = await signIn(email, password);
      if (res.success) {
        showToast(res.message || 'লগইন সফল হয়েছে! স্বাগতম।', 'success');
        setPassword('');
        setAuthError(null);
      } else {
        setAuthError(res.error || 'লগইন ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setAuthError(err.message || 'লগইন করার সময় সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setConfirmationNotice(null);
    setIsSubmitting(true);

    try {
      const res = await signUp(name, email, password);
      if (res.success) {
        trackCompleteRegistration(email.trim(), 'email');
        if (res.requiresEmailConfirmation) {
          setConfirmationNotice(
            res.message ||
              'আপনার ইমেইলে একটি ভেরিফিকেশন লিঙ্ক পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করে লিঙ্কটিতে ক্লিক করে ভেরিফিকেশন সম্পন্ন করুন।'
          );
          showToast('রেজিস্ট্রেশন সম্পন্ন হয়েছে! ইমেইল চেক করুন।', 'success');
        } else {
          showToast(res.message || 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!', 'success');
          setPassword('');
          setAuthError(null);
        }
      } else {
        setAuthError(res.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setAuthError(err.message || 'রেজিস্ট্রেশনের সময় সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    showToast('লগআউট করা হয়েছে', 'info');
    setAuthError(null);
    setConfirmationNotice(null);
    setPassword('');
  };

  const displayName =
    profile?.name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    'সম্মানিত পাঠক';
  const displayEmail = user?.email || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {user ? (
          /* ================================================================ */
          /* LOGGED IN VIEW                                                   */
          /* ================================================================ */
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-900 flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-amber-700" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900">{displayName}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{displayEmail}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                প্রিমিয়াম পাঠক ক্লাব সদস্য
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-100 text-left text-xs">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWishlist?.();
                }}
                className="w-full p-3 rounded-xl border border-zinc-200 hover:bg-amber-50/50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-zinc-700">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>সংরক্ষিত পছন্দের বই</span>
                </div>
                <span className="text-zinc-400">➔</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrders();
                }}
                className="w-full p-3 rounded-xl border border-zinc-200 hover:bg-amber-50/50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-zinc-700">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span>অর্ডার ইতিহাস ও ট্র্যাক</span>
                </div>
                <span className="text-zinc-400">➔</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-rose-600 hover:underline cursor-pointer pt-2 inline-flex items-center gap-1 font-semibold"
            >
              লগআউট করুন
            </button>
          </div>
        ) : (
          /* ================================================================ */
          /* LOGGED OUT (LOGIN / REGISTER) VIEW                              */
          /* ================================================================ */
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center mx-auto mb-2">
                {mode === 'login' ? (
                  <LogIn className="w-6 h-6 text-amber-700" />
                ) : (
                  <UserPlus className="w-6 h-6 text-amber-700" />
                )}
              </div>
              <h3 className="text-lg font-bold text-zinc-900">
                {mode === 'login' ? 'পাঠক লগইন' : 'নতুন অ্যাকাউন্ট তৈরি'}
              </h3>
              <p className="text-xs text-zinc-500">
                {mode === 'login'
                  ? 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে একাউন্টে প্রবেশ করুন'
                  : 'সহজেই রেজিস্ট্রেশন করে শেষের পাতার পরিবারে যুক্ত হোন'}
              </p>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-zinc-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setAuthError(null);
                  setConfirmationNotice(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                লগইন
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setAuthError(null);
                  setConfirmationNotice(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                রেজিস্ট্রেশন
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* Email Confirmation Notice */}
            {confirmationNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{confirmationNotice}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    ইমেইল এড্রেস
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="যেমন: ahsan@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white outline-none"
                    />
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    পাসওয়ার্ড
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="আপনার গোপন পাসওয়ার্ড"
                      className="w-full pl-9 pr-9 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white outline-none"
                    />
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-sm transition-all cursor-pointer mt-2 flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>যাচাই করা হচ্ছে...</span>
                    </>
                  ) : (
                    <span>লগইন করুন</span>
                  )}
                </button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    আপনার পূর্ণ নাম
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="যেমন: আহসান রিয়াদ"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white outline-none"
                    />
                    <User className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    ইমেইল এড্রেস
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="যেমন: ahsan@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white outline-none"
                    />
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="শক্তিশালী পাসওয়ার্ড দিন"
                      className="w-full pl-9 pr-9 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white outline-none"
                    />
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-sm transition-all cursor-pointer mt-2 flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <span>অ্যাকাউন্ট তৈরি করুন</span>
                  )}
                </button>
              </form>
            )}

            <p className="text-[11px] text-zinc-400 text-center">
              লগইন বা রেজিস্ট্রেশনের মাধ্যমে আপনি শেষের পাতার শর্তাবলীতে সম্মতি জানাচ্ছেন।
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
