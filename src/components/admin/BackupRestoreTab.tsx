'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  Archive,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FileText,
  Layers,
  Image as ImageIcon,
  BookOpen,
  Users,
  FolderTree,
  ShoppingBag,
  Star,
  Settings,
  Sparkles,
  Lock,
  ChevronRight,
  Info,
  Check,
  X,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { toBengaliNumber } from '../../utils/formatters';

interface LiveStatusData {
  timestamp: string;
  database: {
    tables: Record<string, number>;
    totalRecords: number;
  };
  storage: {
    buckets: Record<string, { count: number; totalSizeBytes: number }>;
    totalFiles: number;
    totalSizeBytes: number;
  };
}

interface TableConflict {
  tableName: string;
  totalInBackup: number;
  existingInDb: number;
  newRecords: number;
  sampleExistingIds: string[];
}

interface PreflightCheckResult {
  passed: boolean;
  databaseCompatible: boolean;
  schemaCompatible: boolean;
  missingTables: string[];
  verifiedTables: string[];
  storageCompatible: boolean;
  missingBuckets: string[];
  createdBuckets: string[];
  foreignKeyIssues: string[];
  checksumMismatches: string[];
  actionableErrors: string[];
  warnings: string[];
}

interface RestorePreviewData {
  valid: boolean;
  manifest: any | null;
  validationErrors: string[];
  warnings: string[];
  conflicts: TableConflict[];
  preflight: PreflightCheckResult;
  storageFilesCount: number;
  totalRecordsCount: number;
  checksumStatus: 'verified' | 'mismatched' | 'skipped';
}

interface TableRestoreResult {
  tableName: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface SkippedProfile {
  id: string;
  name?: string;
  email?: string;
  reason: string;
}

interface RestoreReportData {
  success: boolean;
  mode: 'safe' | 'full';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  isAtomic: false;
  preRestoreSnapshot?: {
    timestamp: string;
    recordCounts: Record<string, number>;
  };
  database: {
    totalRecords: number;
    succeeded: number;
    failed: number;
    skipped: number;
    tables: Record<string, TableRestoreResult>;
  };
  storage: {
    totalFiles: number;
    succeeded: number;
    failed: number;
    buckets: Record<string, { bucket: string; total: number; succeeded: number; failed: number; errors: string[] }>;
  };
  skippedProfiles: SkippedProfile[];
  summaryMessage: string;
  errors: string[];
  warnings: string[];
}

interface BackupRestoreTabProps {
  onSyncComplete?: () => void;
  showNotice?: (msg: string, type?: 'success' | 'error') => void;
}

export function BackupRestoreTab({ onSyncComplete, showNotice }: BackupRestoreTabProps) {
  // Live Status State
  const [liveStatus, setLiveStatus] = useState<LiveStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Active Download Status
  const [downloadingCategory, setDownloadingCategory] = useState<string | null>(null);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<RestorePreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Restore Execution State
  const [restoreMode, setRestoreMode] = useState<'safe' | 'full'>('safe');
  const [conflictStrategy, setConflictStrategy] = useState<'overwrite' | 'skip'>('overwrite');
  const [restoreStorage, setRestoreStorage] = useState(true);
  const [wipeStorageBeforeImport, setWipeStorageBeforeImport] = useState(false);
  const [fullConfirmText, setFullConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreReport, setRestoreReport] = useState<RestoreReportData | null>(null);
  const [activeStep, setActiveStep] = useState<'upload' | 'preview' | 'executing' | 'report'>('upload');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchLiveStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/admin/backup/status', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setLiveStatus(data);
      }
    } catch (e) {
      console.warn('Failed to fetch backup status:', e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    // Load last backup timestamp from localStorage if available
    try {
      const stored = localStorage.getItem('shesher_pata_last_backup');
      if (stored) setLastBackupTime(stored);
    } catch {}
  }, []);

  // Download Trigger Handler
  const handleDownloadBackup = async (category: string, label: string) => {
    setDownloadingCategory(category);
    try {
      showNotice?.(`${label} ব্যাকআপ ফাইল তৈরির কাজ চলছে, অনুগ্রহ করে অপেক্ষা করুন...`, 'success');
      const res = await fetch(`/api/admin/backup/export?type=${category}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'ব্যাকআপ ফাইল তৈরিতে ব্যর্থ হয়েছে');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      let fileName = `shesher-pata-${category}-backup.zip`;
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        fileName = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const nowStr = new Date().toLocaleString('bn-BD');
      setLastBackupTime(nowStr);
      try {
        localStorage.setItem('shesher_pata_last_backup', nowStr);
      } catch {}

      showNotice?.(`${label} সফলভাবে ডাউনলোড হয়েছে (${(blob.size / 1024 / 1024).toFixed(2)} MB)!`, 'success');
    } catch (err: any) {
      showNotice?.(err.message || 'ডাউনলোড ব্যর্থ হয়েছে!', 'error');
    } finally {
      setDownloadingCategory(null);
    }
  };

  // Handle Archive File Selection & Preview
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showNotice?.('শুধুমাত্র .zip ফরম্যাটের ব্যাকআপ ফাইল গ্রহণযোগ্য!', 'error');
      return;
    }

    setSelectedFile(file);
    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewData(null);
    setActiveStep('preview');

    try {
      const formData = new FormData();
      formData.append('backupFile', file);

      const res = await fetch('/api/admin/restore/preview', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPreviewError(data.error || data.preview?.validationErrors?.join(', ') || 'আর্কাইভ ফাইলটি প্রিভিউ করা সম্ভব হয়নি।');
      } else {
        setPreviewData(data.preview);
      }
    } catch (err: any) {
      setPreviewError(err.message || 'সার্ভারে সংযোগ স্থাপন করা সম্ভব হয়নি');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!selectedFile) return;

    if (restoreMode === 'full' && fullConfirmText !== 'CONFIRM_FULL_RESTORE') {
      showNotice?.('ফুল রিপ্লেসমেন্ট রিস্টোরের জন্য CONFIRM_FULL_RESTORE সঠিকভাবে লিখুন!', 'error');
      return;
    }

    setIsRestoring(true);
    setActiveStep('executing');

    try {
      const formData = new FormData();
      formData.append('backupFile', selectedFile);
      formData.append('mode', restoreMode);
      formData.append('conflictStrategy', conflictStrategy);
      formData.append('restoreStorage', String(restoreStorage));
      formData.append('wipeStorageBeforeImport', String(wipeStorageBeforeImport));
      formData.append('confirmationCode', fullConfirmText);

      const res = await fetch('/api/admin/restore/execute', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.report) {
        setRestoreReport(data.report);
        setActiveStep('report');
        fetchLiveStatus();
        onSyncComplete?.();
        showNotice?.(data.report.summaryMessage, data.report.success ? 'success' : 'error');
      } else {
        throw new Error(data.error || 'রিস্টোর প্রক্রিয়ায় ত্রুটি ঘটেছে');
      }
    } catch (err: any) {
      showNotice?.(err.message || 'রিস্টোর ব্যর্থ হয়েছে!', 'error');
      setActiveStep('preview');
    } finally {
      setIsRestoring(false);
    }
  };

  // Reset Restore Flow
  const handleResetRestore = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setPreviewError(null);
    setRestoreReport(null);
    setFullConfirmText('');
    setRestoreMode('safe');
    setActiveStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER & LIVE HEALTH OVERVIEW CARD */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 flex items-center justify-center font-bold shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  ব্যাকআপ ও রিস্টোর (Backup & Disaster Recovery)
                </h2>
                <p className="text-xs text-zinc-500">
                  সম্পূর্ণ ডেটাবেজ, স্টোরেজ ফাইল, ও কনফিগারেশনের নিরাপদ সংরক্ষণ ও পুনরুদ্ধার
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchLiveStatus}
              disabled={isLoadingStatus}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="লাইভ স্ট্যাটাস রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-amber-600' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>

            {lastBackupTime && (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-200/70">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>সর্বশেষ ব্যাকআপ: {lastBackupTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live System Data Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#FAF8F4] p-4 rounded-2xl border border-amber-900/10">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1">
              <span>মোট ডেটাবেজ রেকর্ড</span>
              <Layers className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900">
              {liveStatus ? toBengaliNumber(liveStatus.database.totalRecords) : '—'} টি
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">১১ টি মূল টেবিলের মোট সারি</p>
          </div>

          <div className="bg-[#FAF8F4] p-4 rounded-2xl border border-amber-900/10">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1">
              <span>নথিভুক্ত বই</span>
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900">
              {liveStatus ? toBengaliNumber(liveStatus.database.tables['books'] || 0) : '—'} টি
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">সক্রিয় ক্যাটালগ আইটেম</p>
          </div>

          <div className="bg-[#FAF8F4] p-4 rounded-2xl border border-amber-900/10">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1">
              <span>স্টোরেজ মিডিয়া ফাইল</span>
              <ImageIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900">
              {liveStatus ? toBengaliNumber(liveStatus.storage.totalFiles) : '—'} টি
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">বইয়ের কভার ও ব্যানার ছবি</p>
          </div>

          <div className="bg-[#FAF8F4] p-4 rounded-2xl border border-amber-900/10">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1">
              <span>স্টোরেজ আকার</span>
              <HardDrive className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900">
              {liveStatus
                ? `${(liveStatus.storage.totalSizeBytes / 1024 / 1024).toFixed(1)} MB`
                : '—'}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Supabase Storage বাইনারি</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. PROMINENT COMPLETE BACKUP HERO ACTION */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-[#1A1813] via-[#2A2417] to-[#1A1813] rounded-3xl text-white shadow-md border border-amber-500/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-zinc-950 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>কমপ্লিট ওয়েবসাইট রিকভারি প্যাকেজ</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              সম্পূর্ণ ওয়েবসাইটের ওয়ান-ক্লিক ব্যাকআপ ডাউনলোড (Complete Backup)
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              একটি ক্লিকেই সকল ডেটাবেজ টেবিল (বই, ক্যাটাগরি, লেখক, প্রকাশনী, ব্যানার, কুপন, অর্ডার, রিভিউ, প্রোফাইল, সাইট সেটিংস) এবং Supabase Storage-এর সকল মূল কভার ও ব্যানার ছবির আসল বাইনারি ফাইলসহ একটি সম্পূর্ণ самостоятельное .zip আর্কাইভ ডাউনলোড করুন।
            </p>
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px] text-amber-200/80">
              <span className="bg-white/10 px-2 py-0.5 rounded">✓ SHA-256 Checksum</span>
              <span className="bg-white/10 px-2 py-0.5 rounded">✓ Unicode বাংলা নিরাপদ</span>
              <span className="bg-white/10 px-2 py-0.5 rounded">✓ schema.sql অন্তর্ভুক্ত</span>
              <span className="bg-white/10 px-2 py-0.5 rounded">✓ আসল ইমেজ ফাইল অন্তর্ভুক্ত</span>
            </div>
          </div>

          <div className="self-stretch md:self-auto flex flex-col items-center gap-2 min-w-[220px]">
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('all', 'সম্পূর্ণ ওয়েবসাইট ব্যাকআপ')}
              className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg hover:shadow-amber-400/20 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {downloadingCategory === 'all' ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>আর্কাইভ প্রস্তুত হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>সম্পূর্ণ ব্যাকআপ ডাউনলোড (.ZIP)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-zinc-400 text-center">
              সব ডেটা + ছবি একটি মাত্র ZIP আর্কাইভে
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. INDIVIDUAL BACKUP CATEGORIES GRID */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900">
              নির্দিষ্ট ক্যাটাগরি অনুযায়ী ব্যাকআপ (Individual Backups)
            </h3>
            <p className="text-xs text-zinc-500">
              নির্দিষ্ট কোনো অংশ আলাদাভাবে সংরক্ষণ বা মাইগ্রেট করতে নিচের যেকোনো বিকল্প বেছে নিন
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Books Backup */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {liveStatus ? toBengaliNumber(liveStatus.database.tables['books'] || 0) : '—'} টি বই
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">বই ডেটাবেজ ব্যাকআপ (Books)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  সকল বইয়ের শিরোনাম, বিবরণ, মূল্য, স্টক, ক্যাটাগরি, লেখক ও রেটিংয়ের পূর্ণাঙ্গ রেকর্ড।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('books', 'বই ডেটাবেজ')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-amber-100 text-zinc-800 hover:text-amber-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'books' ? 'তৈরি হচ্ছে...' : 'বই ব্যাকআপ ডাউনলোড'}</span>
            </button>
          </div>

          {/* 2. Book Images Backup */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {liveStatus ? toBengaliNumber(liveStatus.storage.buckets['book-covers']?.count || 0) : '—'} টি কভার ছবি
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">বইয়ের কভার ছবি (Book Images)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Supabase Storage-এ সংরক্ষিত বইয়ের মূল কভার ছবির আসল ফাইল বাইনারি (.jpg, .png, .webp)।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('book_images', 'বইয়ের কভার ছবি')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-indigo-100 text-zinc-800 hover:text-indigo-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'book_images' ? 'তৈরি হচ্ছে...' : 'কভার ছবি ব্যাকআপ'}</span>
            </button>
          </div>

          {/* 3. Authors Backup */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {liveStatus ? toBengaliNumber(liveStatus.database.tables['authors'] || 0) : '—'} জন লেখক
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">লেখক প্রোফাইল (Authors)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  লেখকদের জীবনবৃত্তান্ত, সময়কাল, ভূমিকার বিবরণ এবং তাদের প্রোফাইল ছবির লিংক ও আইডি।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('authors', 'লেখক প্রোফাইল')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-purple-100 text-zinc-800 hover:text-purple-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'authors' ? 'তৈরি হচ্ছে...' : 'লেখক ডেটা ডাউনলোড'}</span>
            </button>
          </div>

          {/* 4. Categories Backup */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                  <FolderTree className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {liveStatus ? toBengaliNumber(liveStatus.database.tables['categories'] || 0) : '—'} টি ক্যাটাগরি
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">ক্যাটাগরি তালিকা (Categories)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  সকল বইয়ের বিভাগ, বাংলা ও ইংরেজি নাম, ব্যানার ও আইকন কনফিগারেশন।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('categories', 'ক্যাটাগরি')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-blue-100 text-zinc-800 hover:text-blue-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'categories' ? 'তৈরি হচ্ছে...' : 'ক্যাটাগরি ব্যাকআপ'}</span>
            </button>
          </div>

          {/* 5. Orders Backup */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {liveStatus ? toBengaliNumber(liveStatus.database.tables['orders'] || 0) : '—'} টি অর্ডার
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">অর্ডার ও ডেলিভারি (Orders)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  গ্রাহকদের অর্ডার, ঠিকানার তথ্য, পেমেন্ট স্ট্যাটাস, পণ্যের তালিকা ও ট্র্যাকিং নম্বর।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('orders', 'অর্ডার ডেটা')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-emerald-100 text-zinc-800 hover:text-emerald-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'orders' ? 'তৈরি হচ্ছে...' : 'অর্ডার ব্যাকআপ ডাউনলোড'}</span>
            </button>
          </div>

          {/* 6. Reviews Backup */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {liveStatus ? toBengaliNumber(liveStatus.database.tables['reviews'] || 0) : '—'} টি রিভিউ
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">বই রিভিউ ও রেটিং (Reviews)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  গ্রাহকদের প্রদত্ত স্টার রেটিং, মন্তব্যের বিবরণ ও ভেরিফাইড পারচেজ ডেটা।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('reviews', 'রিভিউ ও রেটিং')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-amber-100 text-zinc-800 hover:text-amber-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'reviews' ? 'তৈরি হচ্ছে...' : 'রিভিউ ব্যাকআপ'}</span>
            </button>
          </div>

          {/* 7. Users & Profiles Backup */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-teal-700" />
                </div>
                <span className="text-xs font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-full">
                  {liveStatus ? toBengaliNumber(liveStatus.database.tables['profiles'] || 0) : '—'} টি প্রোফাইল
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">ব্যবহারকারী ও প্রোফাইল (Profiles)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  নিরাপদ ইউজার প্রোফাইল ডেটা। সংবেদনশীল পাসওয়ার্ড বা সিক্রেট টোকেন সম্পূর্ণ বাদ দেওয়া হয়।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('profiles', 'ব্যবহারকারী প্রোফাইল')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-teal-100 text-zinc-800 hover:text-teal-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'profiles' ? 'তৈরি হচ্ছে...' : 'প্রোফাইল ব্যাকআপ'}</span>
            </button>
          </div>

          {/* 8. Site Settings, Banners & Coupons */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded-full">
                  সাইট সেটিংস ও কুপন
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">সাইট সেটিংস ও প্রচার (Settings)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  ডেলিভারি চার্জ, নোটিস ব্যানার, ডিসকাউন্ট কুপন, মেটা পিক্সেল ও স্টোর কনফিগারেশন।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('settings', 'সাইট সেটিংস ও কুপন')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-rose-100 text-zinc-800 hover:text-rose-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'settings' ? 'তৈরি হচ্ছে...' : 'সেটিংস ব্যাকআপ'}</span>
            </button>
          </div>

          {/* 9. Complete Storage Buckets */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-900 flex items-center justify-center font-bold">
                  <Archive className="w-5 h-5 text-cyan-700" />
                </div>
                <span className="text-xs font-bold text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded-full">
                  সকল স্টোরেজ বাকেট
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">সকল স্টোরেজ ফাইল (All Storage)</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  book-covers, book-banners ও book-files বাকেটের সকল আসল ফাইল ফোল্ডার স্ট্রাকচারসহ।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={downloadingCategory !== null}
              onClick={() => handleDownloadBackup('storage', 'সকল স্টোরেজ ফাইল')}
              className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-cyan-100 text-zinc-800 hover:text-cyan-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCategory === 'storage' ? 'তৈরি হচ্ছে...' : 'স্টোরেজ ব্যাকআপ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. RESTORE SYSTEM & INTERACTIVE WIZARD */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Upload className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">ব্যাকআপ থেকে রিস্টোর (Restore From Backup)</h3>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              পূর্বে ডাউনলোড করা কোনো .zip ব্যাকআপ ফাইল আপলোড করে ডেটাবেজ ও ছবি পুনরুদ্ধার করুন
            </p>
          </div>

          {selectedFile && activeStep !== 'executing' && (
            <button
              type="button"
              onClick={handleResetRestore}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
            >
              নতুন ফাইল বাছাই করুন
            </button>
          )}
        </div>

        {/* STEP 1: FILE UPLOAD ZONE */}
        {activeStep === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelect(f);
            }}
            className="border-2 border-dashed border-zinc-300 hover:border-amber-500 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-zinc-50/50 hover:bg-amber-50/20 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-xs">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-zinc-900 mb-1">
              ব্যাকআপ .ZIP ফাইলটি ড্রপ করুন বা ক্লিক করে নির্বাচন করুন
            </h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              সিস্টেম স্বয়ংক্রিয়ভাবে আর্কাইভের বৈধতা, চেকসাম, ও ডেটাবেজ কনফ্লিক্ট যাচাই করে একটি প্রিভিউ তৈরি করবে
            </p>
          </div>
        )}

        {/* STEP 2: PREVIEWING SPINNER */}
        {isPreviewing && (
          <div className="p-12 text-center space-y-3 bg-zinc-50 rounded-2xl border border-zinc-200">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
            <h4 className="font-bold text-sm text-zinc-900">ব্যাকআপ ফাইল স্ক্যান ও যাচাই করা হচ্ছে...</h4>
            <p className="text-xs text-zinc-500">
              SHA-256 চেকসাম, manifest.json এবং বিদ্যমান ডেটাবেজের সাথে রেকর্ড মেলানো হচ্ছে
            </p>
          </div>
        )}

        {/* STEP 3: PREVIEW ERROR */}
        {previewError && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>ব্যাকআপ ফাইল যাচাইকরণ ব্যর্থ হয়েছে</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">{previewError}</p>
            <button
              type="button"
              onClick={handleResetRestore}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        )}

        {/* STEP 4: PREVIEW REPORT & RESTORE MODE SELECTION */}
        {activeStep === 'preview' && previewData && (
          <div className="space-y-6 animate-fadeIn">
            {/* Archive Summary Header */}
            <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-950 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-sm">
                    আর্কাইভ ফাইল: {selectedFile?.name} ({(selectedFile ? selectedFile.size / 1024 / 1024 : 0).toFixed(2)} MB)
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      previewData.checksumStatus === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : previewData.checksumStatus === 'mismatched'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    চেকসাম: {previewData.checksumStatus === 'verified' ? '✓ সঠিক (SHA-256 Validated)' : 'সতর্কতা'}
                  </span>
                </div>
              </div>

              {previewData.manifest && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-200/60 text-xs">
                  <div>
                    <span className="text-blue-700 block text-[11px]">ব্যাকআপ তৈরির সময়:</span>
                    <span className="font-semibold text-blue-950">
                      {new Date(previewData.manifest.createdAt).toLocaleString('bn-BD')}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 block text-[11px]">ব্যাকআপ ক্যাটাগরি:</span>
                    <span className="font-semibold text-blue-950">{previewData.manifest.backupType}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 block text-[11px]">মোট রেকর্ড:</span>
                    <span className="font-semibold text-blue-950">
                      {toBengaliNumber(previewData.totalRecordsCount)} টি
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 block text-[11px]">স্টোরেজ ফাইল:</span>
                    <span className="font-semibold text-blue-950">
                      {toBengaliNumber(previewData.storageFilesCount)} টি
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* PREFLIGHT INTEGRITY & COMPATIBILITY CHECK */}
            {previewData.preflight && (
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-zinc-900">
                      প্রি-ফ্লাইট স্কিমা ও বাকেট সামঞ্জস্যতা (Preflight Checks):
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      previewData.preflight.schemaCompatible && previewData.preflight.storageCompatible
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {previewData.preflight.schemaCompatible && previewData.preflight.storageCompatible
                      ? '✓ সামঞ্জস্যপূর্ণ (Compatible)'
                      : '⚠️ অসঙ্গতি শনাক্ত'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">স্কিমা স্ট্যাটাস:</span>
                    <span className="font-bold text-zinc-800">
                      {previewData.preflight.schemaCompatible ? 'সকল টেবিল ও কলাম বিদ্যমান' : 'টেবিল অনুপস্থিত'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">স্টোরেজ বাকেট:</span>
                    <span className="font-bold text-zinc-800">
                      {previewData.preflight.storageCompatible ? 'বাকেট প্রস্তুত ও যাচাইকৃত' : 'বাকেট অনুপস্থিত'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">ফরেন কী সামঞ্জস্যতা:</span>
                    <span className="font-bold text-zinc-800">
                      {previewData.preflight.foreignKeyIssues.length === 0 ? 'নির্ভরশীলতা সন্তোষজনক' : 'ফরেন কী সতর্কতা'}
                    </span>
                  </div>
                </div>

                {previewData.preflight.actionableErrors.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                    <span className="font-bold block">সমাধানযোগ্য ত্রুটিসমূহ:</span>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      {previewData.preflight.actionableErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Conflict Detection Table */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-zinc-900">
                টেবিলভিত্তিক বিশ্লেষণ ও কনফ্লিক্ট ডিটেকশন (Conflict Analysis):
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-zinc-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-700">
                    <tr>
                      <th className="py-2.5 px-3">টেবিল নাম</th>
                      <th className="py-2.5 px-3 text-center">ব্যাকআপে মোট</th>
                      <th className="py-2.5 px-3 text-center">ডাটাবেজে বিদ্যমান</th>
                      <th className="py-2.5 px-3 text-center">নতুন রেকর্ড</th>
                      <th className="py-2.5 px-3">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                    {previewData.conflicts.map((c) => (
                      <tr key={c.tableName} className="hover:bg-zinc-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">{c.tableName}</td>
                        <td className="py-2.5 px-3 text-center">{toBengaliNumber(c.totalInBackup)}</td>
                        <td className="py-2.5 px-3 text-center text-amber-800 font-bold">
                          {toBengaliNumber(c.existingInDb)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                          {toBengaliNumber(c.newRecords)}
                        </td>
                        <td className="py-2.5 px-3">
                          {c.existingInDb > 0 ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                              কনফ্লিক্ট উপস্থিত (মার্জ করা হবে)
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              সম্পূর্ণ নতুন ডেটা
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RESTORE MODE SELECTION (MANDATORY REQUIREMENT 5) */}
            <div className="space-y-4 pt-2">
              <h4 className="font-bold text-sm text-zinc-900">রিস্টোর মোড নির্বাচন করুন (Restore Mode):</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Safe / Merge Restore Mode */}
                <div
                  onClick={() => setRestoreMode('safe')}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    restoreMode === 'safe'
                      ? 'border-emerald-500 bg-emerald-50/30 shadow-xs'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        মার্জ / নিরাপদ রিস্টোর (Safe Merge)
                      </span>
                      {restoreMode === 'safe' && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      অনুপস্থিত নতুন রেকর্ডগুলো যোগ হবে এবং বিদ্যমান রেকর্ডগুলো নিরাপদে আপডেট হবে। কোনো বিদ্যমান তথ্য বা স্টোরেজ ফাইল স্বয়ংক্রিয়ভাবে মুছে ফেলা হবে না।
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-200/60 text-[11px] text-emerald-800 font-bold">
                    ✓ প্রোডাকশন ব্যবহারের জন্য প্রস্তাবিত
                  </div>
                </div>

                {/* Full Replacement Mode */}
                <div
                  onClick={() => setRestoreMode('full')}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    restoreMode === 'full'
                      ? 'border-rose-500 bg-rose-50/40 shadow-xs'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        ফুল রিপ্লেসমেন্ট (Full Replacement)
                      </span>
                      {restoreMode === 'full' && (
                        <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      সম্পূর্ণ প্রজেক্ট রিবিল্ড বা মুছে যাওয়া প্রজেক্ট পুনরুদ্ধারের জন্য। পূর্ববর্তী বিদ্যমান ডেটা মুছে ব্যাকআপ ফাইলের ডেটা স্থাপন করা হবে।
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-rose-200 text-[11px] text-rose-700 font-bold">
                    ⚠️ অতিরিক্ত সতর্কতা প্রয়োজন — নন-অ্যাটমিক ব্যাচ অপারেশন
                  </div>
                </div>
              </div>

              {/* Extra Storage Option Checkbox */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="restore_storage_checkbox"
                    checked={restoreStorage}
                    onChange={(e) => setRestoreStorage(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-zinc-300 focus:ring-amber-500"
                  />
                  <label htmlFor="restore_storage_checkbox" className="text-xs font-semibold text-zinc-700 cursor-pointer">
                    স্টোরেজ ছবি ও ফাইলসমূহ পুনরুদ্ধার করুন ({toBengaliNumber(previewData.storageFilesCount)} টি ফাইল)
                  </label>
                </div>

                {/* Wipe Storage Before Import Option (Only visible when Full Replacement is selected) */}
                {restoreMode === 'full' && restoreStorage && (
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 ml-6 space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="wipe_storage_checkbox"
                        checked={wipeStorageBeforeImport}
                        onChange={(e) => setWipeStorageBeforeImport(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded border-zinc-300 focus:ring-rose-500"
                      />
                      <label htmlFor="wipe_storage_checkbox" className="text-xs font-bold text-amber-950 cursor-pointer">
                        টার্গেট বাকেটে থাকা অপ্রয়োজনীয় পুরনো ফাইল পরিষ্কার করুন (Wipe Obsolete Files)
                      </label>
                    </div>
                    <p className="text-[11px] text-zinc-600 pl-6">
                      ডিফল্টভাবে বন্ধ থাকে। টিক দিলে ব্যাকআপে নেই এমন বিদ্যমান ফাইলগুলো মুছে দিয়ে আর্কাইভের ফাইল আপলোড করা হবে।
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmation Step for Full Replacement Mode */}
              {restoreMode === 'full' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <Lock className="w-4 h-4" />
                    <span>ফুল রিপ্লেসমেন্ট নিশ্চিতকরণ ও গুরুত্বপূর্ণ তথ্য (Mandatory Confirmation)</span>
                  </div>
                  <div className="text-xs text-rose-900 space-y-1.5 leading-relaxed">
                    <p>
                      <strong>সতর্কতা:</strong> ফুল রিপ্লেসমেন্ট অপারেশনটি একাধিক টেবিলে ক্রমান্বয়ে এইচটিটিপি ব্যাচের মাধ্যমে সঞ্চালিত হয়। এটি একক ডাটাবেজ অ্যাটমিক ট্রানজ্যাকশন নয়। অপ্রত্যাশিত নেটওয়ার্ক বা কানেকশন ত্রুটি এড়াতে প্রক্রিয়া চলাকালীন পেজ বন্ধ করবেন না।
                    </p>
                    <p>
                      রিস্টোর শুরুর আগে সিস্টেম বর্তমান রেকর্ড সংখ্যার একটি সেফটি স্ন্যাপশট গ্রহণ করে রাখে।
                    </p>
                    <p>
                      নিশ্চিত করতে নিচে <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-300">CONFIRM_FULL_RESTORE</strong> টাইপ করুন:
                    </p>
                  </div>
                  <input
                    type="text"
                    value={fullConfirmText}
                    onChange={(e) => setFullConfirmText(e.target.value.trim())}
                    placeholder="CONFIRM_FULL_RESTORE"
                    className="w-full px-4 py-2.5 rounded-xl border border-rose-300 bg-white text-rose-900 font-mono text-sm outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-100">
              <button
                type="button"
                disabled={restoreMode === 'full' && fullConfirmText !== 'CONFIRM_FULL_RESTORE'}
                onClick={handleExecuteRestore}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {restoreMode === 'full' ? 'ফুল রিপ্লেসমেন্ট শুরু করুন' : 'মার্জ রিস্টোর সম্পন্ন করুন'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleResetRestore}
                className="px-5 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: RESTORING IN PROGRESS */}
        {activeStep === 'executing' && (
          <div className="p-10 text-center space-y-4 bg-zinc-50 rounded-2xl border border-zinc-200 animate-fadeIn">
            <RefreshCw className="w-10 h-10 text-amber-600 animate-spin mx-auto" />
            <h4 className="font-black text-base text-zinc-900">
              পুনরুদ্ধার কাজ চলমান রয়েছে, অনুগ্রহ করে পেজ রিফ্রেশ করবেন না...
            </h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              প্রথমে Supabase স্টোরেজে মূল ছবি আপলোড করা হচ্ছে, তারপর ডিপেন্ডেন্সি অর্ডার বজায় রেখে ডেটাবেজে রেকর্ড ইনসার্ট হচ্ছে।
            </p>
            <div className="w-48 h-2 bg-zinc-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {/* STEP 6: FINAL RESTORATION REPORT */}
        {activeStep === 'report' && restoreReport && (
          <div className="space-y-6 animate-fadeIn">
            <div
              className={`p-6 rounded-3xl border space-y-3 ${
                restoreReport.success
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
                    restoreReport.success
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {restoreReport.success ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-base font-black">
                    {restoreReport.success ? 'পুনরুদ্ধার সফলভাবে সম্পন্ন হয়েছে!' : 'পুনরুদ্ধার সমাপ্ত (সতর্কতাসহ)'}
                  </h4>
                  <p className="text-xs opacity-90">{restoreReport.summaryMessage}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-black/10 text-xs">
                <div>
                  <span className="opacity-70 block text-[11px]">ব্যবহৃত মোড:</span>
                  <span className="font-bold">{restoreReport.mode === 'safe' ? 'মার্জ / সেইফ রিস্টোর' : 'ফুল রিপ্লেসমেন্ট'}</span>
                </div>
                <div>
                  <span className="opacity-70 block text-[11px]">সময় লেগেছে:</span>
                  <span className="font-bold">{(restoreReport.durationMs / 1000).toFixed(1)} সেকেন্ড</span>
                </div>
                <div>
                  <span className="opacity-70 block text-[11px]">মোট রেকর্ড:</span>
                  <span className="font-bold">
                    {toBengaliNumber(restoreReport.database?.totalRecords ?? (restoreReport as any).totalRecordsProcessed ?? 0)} টি
                  </span>
                </div>
                <div>
                  <span className="opacity-70 block text-[11px]">স্টোরেজ ফাইল:</span>
                  <span className="font-bold">
                    {toBengaliNumber(restoreReport.storage?.totalFiles ?? (restoreReport as any).totalFilesProcessed ?? 0)} টি
                  </span>
                </div>
              </div>
            </div>

            {/* SEPARATE DATABASE & STORAGE REPORT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Database Result Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-xs text-zinc-900">ডেটাবেজ ফলাফল (Database Records):</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    সফল: {toBengaliNumber(restoreReport.database?.succeeded ?? 0)}
                  </span>
                </div>
                <div className="text-xs text-zinc-600 flex items-center justify-between pt-1 border-t border-zinc-200/60">
                  <span>ব্যর্থ রেকর্ড: {toBengaliNumber(restoreReport.database?.failed ?? 0)} টি</span>
                  <span>বাদ দেওয়া রেকর্ড: {toBengaliNumber(restoreReport.database?.skipped ?? 0)} টি</span>
                </div>
              </div>

              {/* Storage Result Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-cyan-600" />
                    <span className="font-bold text-xs text-zinc-900">স্টোরেজ ফাইল ফলাফল (Storage Files):</span>
                  </div>
                  <span className="text-[11px] font-bold text-cyan-900 bg-cyan-100 px-2 py-0.5 rounded-full">
                    আপলোডকৃত: {toBengaliNumber(restoreReport.storage?.succeeded ?? 0)}
                  </span>
                </div>
                <div className="text-xs text-zinc-600 flex items-center justify-between pt-1 border-t border-zinc-200/60">
                  <span>মোট ফাইল: {toBengaliNumber(restoreReport.storage?.totalFiles ?? 0)} টি</span>
                  <span>ব্যর্থ ফাইল: {toBengaliNumber(restoreReport.storage?.failed ?? 0)} টি</span>
                </div>
              </div>
            </div>

            {/* SKIPPED PROFILES WARNING (MANDATORY REQUIREMENT 4) */}
            {restoreReport.skippedProfiles && restoreReport.skippedProfiles.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>
                    প্রোফাইল স্কিপ রিপোর্ট: {toBengaliNumber(restoreReport.skippedProfiles.length)} টি ইউজার প্রোফাইল বাদ দেওয়া হয়েছে
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  টার্গেট প্রজেক্টের Supabase Auth-এ সংশ্লিষ্ট ইউজার আইডি (auth.users) অনুপস্থিত থাকায় ডাটাবেজ ফরেন-কী ইনটিগ্রিটি অক্ষুণ্ন রাখতে এগুলো স্কিপ করা হয়েছে। কোনো ভুয়া বা প্লেসহোল্ডার একাউন্ট তৈরি করা হয়নি।
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono bg-white/70 p-2 rounded-xl border border-amber-200">
                  {restoreReport.skippedProfiles.map((p) => (
                    <div key={p.id} className="truncate">
                      • {p.name || p.email || p.id}: {p.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table Details */}
            <div className="space-y-3">
              <h5 className="font-bold text-xs text-zinc-700">টেবিলভিত্তিক বিস্তারিত ফলাফল:</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {Object.entries(restoreReport.database?.tables || (restoreReport as any).tables || {}).map(([tName, res]: [string, any]) => (
                  <div key={tName} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <span className="font-mono font-bold text-zinc-900 block truncate">{tName}</span>
                    <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                      সফল: {toBengaliNumber(res.succeeded)}/{toBengaliNumber(res.total)}
                    </span>
                    {res.failed > 0 && (
                      <span className="text-[11px] text-rose-600 font-bold block">
                        ব্যর্থ: {toBengaliNumber(res.failed)}
                      </span>
                    )}
                    {res.skipped > 0 && (
                      <span className="text-[11px] text-zinc-500 font-medium block">
                        স্কিপ: {toBengaliNumber(res.skipped)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleResetRestore}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                সম্পন্ন করুন ও ফিরে যান
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. DISASTER RECOVERY & DOCUMENTATION ACCORDION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#FAF8F4] p-6 sm:p-7 rounded-3xl border border-amber-900/10 space-y-4">
        <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
          <Info className="w-4 h-4 text-amber-700" />
          <span>ডিসাস্টার রিকভারি নির্দেশিকা: নতুন Supabase প্রজেক্টে কীভাবে রিস্টোর করবেন?</span>
        </div>
        <div className="text-xs text-zinc-700 space-y-2 leading-relaxed">
          <p>
            যদি মূল Supabase প্রজেক্টটি কোনো কারণে মুছে যায় বা নতুন একটি সার্ভারে স্থানান্তর করতে হয়:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium">
            <li>
              <strong>নতুন Supabase প্রজেক্ট তৈরি করুন:</strong> supabase.com-এ গিয়ে নতুন প্রজেক্ট তৈরি করুন এবং প্রজেক্টের URL ও Service Role Key সংগ্রহ করুন।
            </li>
            <li>
              <strong>SQL স্কিমা রান করুন:</strong> ব্যাকআপ ZIP আর্কাইভে থাকা <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">schema.sql</code> ফাইলটি Supabase SQL Editor-এ পেস্ট করে Run করুন। এটি স্বয়ংক্রিয়ভাবে সকল ১১টি টেবিল, স্টোরেজ বাকেট ও RLS পলিসি তৈরি করে দিবে।
            </li>
            <li>
              <strong>ওয়েবসাইটের .env ফাইল আপডেট করুন:</strong> হোস্টিং সার্ভারে নতুন প্রজেক্টের <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> ও <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code> বসিয়ে ডিপ্লয় করুন।
            </li>
            <li>
              <strong>আর্কাইভ আপলোড করে রিস্টোর করুন:</strong> অ্যাডমিন প্যানেলের এই সেকশনে এসে ব্যাকআপ ZIP আপলোড করুন। সকল কভার ছবি ও ডেটাবেজ রেকর্ড যথাযথ রিলেশনশিপসহ রিস্টোর হয়ে যাবে।
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
