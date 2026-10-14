'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Image as ImageIcon,
  Upload,
  Calendar,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  Layers,
  ArrowUpDown,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Banner } from '../../types';
import { toBengaliNumber } from '../../utils/formatters';

interface BannerManagementTabProps {
  onShowNotice?: (message: string, type?: 'success' | 'error') => void;
}

const PLACEMENT_OPTIONS = [
  { id: 'homepage_hero', label: 'হোমপেজ হিরো ব্যানার (Homepage Hero)', badgeBg: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'homepage_promo', label: 'প্রমোশনাল ব্যানার (Mid-Page Promo)', badgeBg: 'bg-purple-100 text-purple-900 border-purple-300' },
  { id: 'campaign', label: 'ক্যাম্পেইন ব্যানার (Campaign)', badgeBg: 'bg-blue-100 text-blue-900 border-blue-300' },
  { id: 'category', label: 'ক্যাটাগরি ব্যানার (Category)', badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'custom', label: 'কাস্টম ব্যানার (Custom Placement)', badgeBg: 'bg-zinc-100 text-zinc-900 border-zinc-300' },
];

export const BannerManagementTab: React.FC<BannerManagementTabProps> = ({ onShowNotice }) => {
  const { banners, addBanner, updateBanner, deleteBanner, duplicateBanner, refreshBanners } = useData();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [placementFilter, setPlacementFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'order_asc' | 'order_desc' | 'newest'>('order_asc');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState<Banner | null>(null);

  // Form State
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);

  const initialForm = {
    name: '',
    placement: 'homepage_hero',
    title: '',
    subtitle: '',
    description: '',
    badge: '★ বিশ্বস্ত বুকশপ',
    badge_color: '',
    image_url: '',
    mobile_image_url: '',
    primary_button_text: 'বইসমূহ ঘুরে দেখুন',
    primary_button_url: 'books',
    secondary_button_text: 'এখনই অর্ডার করুন',
    secondary_button_url: 'catalog',
    highlight_text: 'হটলাইন: ০১৭০০-০০০০০০',
    theme: 'cream',
    display_order: 1,
    is_active: true,
    starts_at: '',
    ends_at: '',
    target_url: '',
    open_in_new_tab: false,
    alt_text: '',
  };

  const [formState, setFormState] = useState(initialForm);

  const desktopFileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileFileInputRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    if (onShowNotice) {
      onShowNotice(msg, type);
    }
  };

  // Filtered & Sorted Banners
  const filteredBanners = useMemo(() => {
    return (banners || [])
      .filter((ban) => {
        // Placement filter
        if (placementFilter !== 'all') {
          const currentPlacement = ban.placement || ban.type || 'homepage_hero';
          if (currentPlacement !== placementFilter) return false;
        }

        // Status filter
        if (statusFilter === 'active' && !ban.is_active) return false;
        if (statusFilter === 'inactive' && ban.is_active) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = ban.name?.toLowerCase().includes(q);
          const matchTitle = ban.title?.toLowerCase().includes(q);
          const matchBadge = ban.badge?.toLowerCase().includes(q);
          if (!matchName && !matchTitle && !matchBadge) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'order_asc') {
          return Number(a.display_order ?? 1) - Number(b.display_order ?? 1);
        }
        if (sortBy === 'order_desc') {
          return Number(b.display_order ?? 1) - Number(a.display_order ?? 1);
        }
        if (sortBy === 'newest') {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        return 0;
      });
  }, [banners, placementFilter, statusFilter, searchQuery, sortBy]);

  // Open Create Modal
  const handleOpenAdd = () => {
    setEditingBannerId(null);
    setFormState({
      ...initialForm,
      display_order: (banners?.length || 0) + 1,
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ban: Banner) => {
    setEditingBannerId(ban.id);
    setFormState({
      name: ban.name || ban.title || '',
      placement: ban.placement || ban.type || 'homepage_hero',
      title: ban.title || '',
      subtitle: ban.subtitle || '',
      description: ban.description || '',
      badge: ban.badge || '',
      badge_color: ban.badge_color || '',
      image_url: ban.image_url || ban.bangla_image || '',
      mobile_image_url: ban.mobile_image_url || '',
      primary_button_text: ban.primary_button_text || '',
      primary_button_url: ban.primary_button_url || ban.link || '',
      secondary_button_text: ban.secondary_button_text || '',
      secondary_button_url: ban.secondary_button_url || '',
      highlight_text: ban.highlight_text || '',
      theme: ban.theme || 'cream',
      display_order: Number(ban.display_order ?? ban.sort_order ?? 1),
      is_active: ban.is_active !== undefined ? ban.is_active : ban.status !== 'inactive',
      starts_at: ban.starts_at ? new Date(ban.starts_at).toISOString().slice(0, 16) : '',
      ends_at: ban.ends_at ? new Date(ban.ends_at).toISOString().slice(0, 16) : '',
      target_url: ban.target_url || ban.primary_button_url || '',
      open_in_new_tab: Boolean(ban.open_in_new_tab),
      alt_text: ban.alt_text || '',
    });
    setIsFormModalOpen(true);
  };

  // Toggle active/inactive directly from row
  const handleToggleActive = async (ban: Banner) => {
    try {
      const nextStatus = !ban.is_active;
      await updateBanner(ban.id, { is_active: nextStatus, status: nextStatus ? 'active' : 'inactive' });
      notify(`ব্যানার "${ban.name || ban.title}" ${nextStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে!`);
    } catch (err: any) {
      notify(err.message || 'স্থিতি পরিবর্তন ব্যর্থ হয়েছে', 'error');
    }
  };

  // Handle duplicate
  const handleDuplicate = async (ban: Banner) => {
    try {
      const duplicated = await duplicateBanner(ban);
      notify(`ব্যানারটি সফলভাবে ডুপ্লিকেট করা হয়েছে ("${duplicated.name}")। এটি ডিফল্টভাবে নিষ্ক্রিয় রয়েছে।`);
    } catch (err: any) {
      notify(err.message || 'ডুপ্লিকেট করা সম্ভব হয়নি', 'error');
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirmBanner) return;
    try {
      await deleteBanner(deleteConfirmBanner.id);
      notify(`ব্যানার "${deleteConfirmBanner.name || deleteConfirmBanner.title}" সফলভাবে মুছে ফেলা হয়েছে!`);
      setDeleteConfirmBanner(null);
    } catch (err: any) {
      notify(err.message || 'ব্যানার মুছে ফেলা ব্যর্থ হয়েছে', 'error');
    }
  };

  // Upload image handler
  const uploadImageFile = async (
    file: File,
    target: 'desktop' | 'mobile'
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('দয়া করে একটি সঠিক ছবি ফরম্যাট আপলোড করুন (JPG, PNG, WebP)', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notify('ছবির সর্বোচ্চ অনুমোদিত সাইজ ৮ মেগাবাইট (8MB)', 'error');
      return;
    }

    if (target === 'desktop') setIsUploadingDesktop(true);
    if (target === 'mobile') setIsUploadingMobile(true);

    try {
      notify('ছবি Supabase স্টোরেজে আপলোড হচ্ছে...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'book-banners');
      formData.append('folder', 'banners');
      formData.append('type', 'banner');

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'ছবি আপলোড ব্যর্থ হয়েছে');
      }

      const resData = await response.json();
      if (resData.url) {
        if (target === 'desktop') {
          setFormState((prev) => ({ ...prev, image_url: resData.url }));
        } else {
          setFormState((prev) => ({ ...prev, mobile_image_url: resData.url }));
        }
        notify('ছবি সফলভাবে আপলোড হয়েছে!');
      }
    } catch (err: any) {
      console.error('[Upload Error]:', err);
      notify(err.message || 'ছবি আপলোডে সমস্যা দেখা দিয়েছে', 'error');
    } finally {
      if (target === 'desktop') setIsUploadingDesktop(false);
      if (target === 'mobile') setIsUploadingMobile(false);
    }
  };

  // Save form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      notify('ব্যানারের নাম (Internal Admin Name) দেওয়া আবশ্যক!', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Partial<Banner> = {
        name: formState.name.trim(),
        placement: formState.placement,
        type: formState.placement,
        title: formState.title.trim() || formState.name.trim(),
        subtitle: formState.subtitle.trim(),
        description: formState.description.trim(),
        badge: formState.badge.trim(),
        badge_color: formState.badge_color.trim(),
        image_url: formState.image_url.trim(),
        mobile_image_url: formState.mobile_image_url.trim(),
        primary_button_text: formState.primary_button_text.trim(),
        primary_button_url: formState.primary_button_url.trim(),
        secondary_button_text: formState.secondary_button_text.trim(),
        secondary_button_url: formState.secondary_button_url.trim(),
        highlight_text: formState.highlight_text.trim(),
        theme: formState.theme,
        display_order: Number(formState.display_order) || 1,
        is_active: formState.is_active,
        status: formState.is_active ? 'active' : 'inactive',
        starts_at: formState.starts_at ? new Date(formState.starts_at).toISOString() : null,
        ends_at: formState.ends_at ? new Date(formState.ends_at).toISOString() : null,
        target_url: formState.target_url.trim(),
        open_in_new_tab: formState.open_in_new_tab,
        alt_text: formState.alt_text.trim() || formState.title.trim() || formState.name.trim(),
      };

      if (editingBannerId) {
        await updateBanner(editingBannerId, payload);
        notify(`ব্যানার "${formState.name}" সফলভাবে আপডেট করা হয়েছে!`);
      } else {
        await addBanner(payload);
        notify(`নতুন ব্যানার "${formState.name}" সফলভাবে তৈরি হয়েছে!`);
      }

      setIsFormModalOpen(false);
      setEditingBannerId(null);
    } catch (err: any) {
      notify(err.message || 'ব্যানার সংরক্ষণে সমস্যা দেখা দিয়েছে!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
              ব্যানার ব্যবস্থাপনা
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
              {toBengaliNumber(banners?.length || 0)} টি ব্যানার
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            ওয়েবসাইটের হোমপেজ হিরো, প্রমোশনাল, ক্যাম্পেইন ও ক্যাটাগরি ব্যানার সরাসরি সেন্ট্রাল ডাটাবেজ থেকে নিয়ন্ত্রণ করুন
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ব্যানার তৈরি করুন</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ব্যানারের নাম বা শিরোনাম দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-amber-400 outline-none transition-all"
          />
        </div>

        {/* Filter by Placement */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">প্লেসমেন্ট:</span>
          <select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white outline-none font-medium cursor-pointer"
          >
            <option value="all">সকল প্লেসমেন্ট</option>
            <option value="homepage_hero">হোমপেজ হিরো</option>
            <option value="homepage_promo">প্রমোশনাল ব্যানার</option>
            <option value="campaign">ক্যাম্পেইন</option>
            <option value="category">ক্যাটাগরি</option>
            <option value="custom">কাস্টম</option>
          </select>
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">স্থিতি:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white outline-none font-medium cursor-pointer"
          >
            <option value="all">সকল স্থিতি</option>
            <option value="active">সক্রিয় (Active)</option>
            <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">সাজানো:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white outline-none font-medium cursor-pointer"
          >
            <option value="order_asc">প্রদর্শন ক্রম (১ - ৯)</option>
            <option value="order_desc">প্রদর্শন ক্রম (৯ - ১)</option>
            <option value="newest">সর্বশেষ তৈরি</option>
          </select>
        </div>
      </div>

      {/* Banner Cards Grid / Table */}
      {filteredBanners.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-zinc-800 text-sm">কোনো ব্যানার পাওয়া যায়নি</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            আপনার ফিল্টার শর্ত অনুযায়ী কোনো ব্যানার নেই অথবা নতুন একটি ব্যানার যোগ করতে উপরের বাটন চাপুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBanners.map((ban) => {
            const placementObj = PLACEMENT_OPTIONS.find((p) => p.id === (ban.placement || ban.type)) || {
              id: 'custom',
              label: ban.placement || 'কাস্টম',
              badgeBg: 'bg-zinc-100 text-zinc-800 border-zinc-200',
            };

            const desktopImg = ban.image_url || ban.bangla_image || ban.english_image;
            const mobileImg = ban.mobile_image_url;

            return (
              <div
                key={ban.id}
                className="bg-white p-5 rounded-3xl border border-zinc-200 hover:border-amber-400/80 shadow-xs transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
              >
                {/* Left: Thumbnail & Visual Previews */}
                <div className="w-full lg:w-72 shrink-0 space-y-2">
                  <div className="relative aspect-16/8 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-2xs group">
                    {desktopImg ? (
                      <img
                        src={desktopImg}
                        alt={ban.alt_text || ban.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-3 text-center bg-zinc-50">
                        <ImageIcon className="w-6 h-6 mb-1 text-zinc-300" />
                        <span className="text-[10px] font-medium text-zinc-500">টেক্সট ভিত্তিক ডিজাইন (নো ইমেজ)</span>
                      </div>
                    )}

                    {/* Order badge on image */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                      #{toBengaliNumber(ban.display_order ?? 1)}
                    </span>

                    {/* Indicators */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] flex items-center gap-0.5">
                        <Monitor className="w-2.5 h-2.5" />
                        <span>ডেস্কটপ</span>
                      </span>
                      {mobileImg && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold text-[9px] flex items-center gap-0.5">
                          <Smartphone className="w-2.5 h-2.5" />
                          <span>মোবাইল</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Content & Metadata */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Placement badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${placementObj.badgeBg}`}>
                      {placementObj.label.split('(')[0].trim()}
                    </span>

                    {/* Active/Inactive badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ban.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {ban.is_active ? '● সক্রিয় (Active)' : '○ নিষ্ক্রিয় (Inactive)'}
                    </span>

                    {/* Custom Badge */}
                    {ban.badge && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black">
                        {ban.badge}
                      </span>
                    )}

                    {/* Schedule status */}
                    {(ban.starts_at || ban.ends_at) && (
                      <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-md">
                        <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                        <span>শিডিউলড</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-extrabold text-zinc-900 text-sm sm:text-base leading-snug">
                      {ban.title || ban.name}
                    </h4>
                    <p className="text-xs text-amber-900/80 font-medium">
                      অভ্যন্তরীণ নাম: {ban.name}
                    </p>
                    {ban.subtitle && (
                      <p className="text-xs text-zinc-600 mt-0.5 line-clamp-1">
                        {ban.subtitle}
                      </p>
                    )}
                    {ban.description && (
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                        {ban.description}
                      </p>
                    )}
                  </div>

                  {/* Buttons / Actions preview */}
                  {(ban.primary_button_text || ban.secondary_button_text) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500">
                      {ban.primary_button_text && (
                        <span className="bg-zinc-100 px-2 py-0.5 rounded font-medium">
                          বাটন ১: <strong className="text-zinc-800">{ban.primary_button_text}</strong> ({ban.primary_button_url || 'books'})
                        </span>
                      )}
                      {ban.secondary_button_text && (
                        <span className="bg-zinc-100 px-2 py-0.5 rounded font-medium">
                          বাটন ২: <strong className="text-zinc-800">{ban.secondary_button_text}</strong> ({ban.secondary_button_url || 'catalog'})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                  {/* Quick Active/Inactive switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(ban)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      ban.is_active
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                    }`}
                    title={ban.is_active ? 'নিষ্ক্রিয় করতে ক্লিক করুন' : 'সক্রিয় করতে ক্লিক করুন'}
                  >
                    {ban.is_active ? <Eye className="w-3.5 h-3.5 text-emerald-700" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
                    <span>{ban.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Duplicate button */}
                    <button
                      type="button"
                      onClick={() => handleDuplicate(ban)}
                      className="p-2 rounded-xl bg-zinc-50 hover:bg-amber-50 text-zinc-700 hover:text-amber-900 border border-zinc-200 transition-colors cursor-pointer"
                      title="ডুপ্লিকেট ব্যানার তৈরি করুন"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ban)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center gap-1.5 border border-amber-200 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>সম্পাদনা</span>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmBanner(ban)}
                      className="p-2 rounded-xl bg-zinc-50 hover:bg-rose-50 text-zinc-600 hover:text-rose-900 border border-zinc-200 transition-colors cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BANNER CREATE / EDIT MODAL */}
      {/* ------------------------------------------------------------------ */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 my-auto max-h-[92vh] flex flex-col font-['Noto_Sans_Bengali']">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-[#FAF8F4] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                    {editingBannerId ? 'ব্যানার সম্পাদনা করুন' : 'নতুন ব্যানার যোগ করুন'}
                  </h3>
                  <p className="text-xs text-zinc-500">ব্যানারের তথ্য, ছবি ও ডিসপ্লে সেটিংস পূরণ করুন</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 text-zinc-600" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveForm} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Row 1: Internal Admin Name & Placement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ব্যানার নাম (Internal Admin Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="যেমন: Homepage Eid Campaign"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                  <span className="text-[10px] text-zinc-400">অ্যাডমিন প্যানেলে চেনার সুবিধার্থে নাম</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ব্যানার টাইপ / প্লেসমেন্ট *
                  </label>
                  <select
                    value={formState.placement}
                    onChange={(e) => setFormState({ ...formState, placement: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
                  >
                    <option value="homepage_hero">Homepage Hero (হোমপেজ হিরো ব্যানার)</option>
                    <option value="homepage_promo">Promotional (মিড-পেজ প্রমোশনাল ব্যানার)</option>
                    <option value="campaign">Campaign (ক্যাম্পেইন ব্যানার)</option>
                    <option value="category">Category (ক্যাটাগরি ব্যানার)</option>
                    <option value="custom">Custom (কাস্টম ব্যানার)</option>
                  </select>
                  <span className="text-[10px] text-zinc-400">ওয়েবসাইটের কোন সেকশনে প্রদর্শিত হবে</span>
                </div>
              </div>

              {/* Row 2: Headline & Subheadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    মূল শিরোনাম (Banner Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    placeholder="যেমন: ঝামেলা ছাড়া বই কিনুন"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    উপ-শিরোনাম (Banner Subtitle)
                  </label>
                  <input
                    type="text"
                    value={formState.subtitle}
                    onChange={(e) => setFormState({ ...formState, subtitle: e.target.value })}
                    placeholder="যেমন: সর্বোচ্চ ছাড়ে, দ্রুত সময়ে!"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  বিস্তারিত বিবরণ (Supporting Description)
                </label>
                <textarea
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="ব্যানারের সংক্ষিপ্ত সারসংক্ষেপ লিখুন..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              {/* Badge & Theme Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ব্যাজ / লেবেল (Badge)
                  </label>
                  <input
                    type="text"
                    value={formState.badge}
                    onChange={(e) => setFormState({ ...formState, badge: e.target.value })}
                    placeholder="যেমন: ★ বিশ্বস্ত বুকশপ"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    হটলাইন / হাইলাইট টেক্সট
                  </label>
                  <input
                    type="text"
                    value={formState.highlight_text}
                    onChange={(e) => setFormState({ ...formState, highlight_text: e.target.value })}
                    placeholder="যেমন: হটলাইন: ০১৭০০-০০০০০০"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    থিম কালার (Theme)
                  </label>
                  <select
                    value={formState.theme}
                    onChange={(e) => setFormState({ ...formState, theme: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="cream">ক্রিম থিম (Cream - Default)</option>
                    <option value="amber">অ্যাম্বার থিম (Amber Gold)</option>
                    <option value="dark">ডার্ক থিম (Dark Premium)</option>
                  </select>
                </div>
              </div>

              {/* Image Uploads: Desktop & Mobile */}
              <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-amber-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span>ব্যানার ছবি আপলোড (Desktop & Mobile Support)</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">অনুপাত: ১৬:১০ বা ১৬:৬ (১৬০০×৬০০ পিক্সেল)</span>
                </div>

                {/* Desktop Image */}
                <div className="space-y-1.5 p-3 bg-white rounded-xl border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                      <span>ডেস্কটপ / প্রধান ব্যানার ছবি (Desktop Image)</span>
                    </label>
                    {formState.image_url && (
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, image_url: '' })}
                        className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        ছবি সরান
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formState.image_url}
                      onChange={(e) => setFormState({ ...formState, image_url: e.target.value })}
                      placeholder="https://... অথবা কম্পিউটার থেকে আপলোড করুন"
                      className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                    />

                    <input
                      type="file"
                      ref={desktopFileInputRef}
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImageFile(f, 'desktop');
                      }}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isUploadingDesktop}
                      onClick={() => desktopFileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingDesktop ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          <span>আপলোড হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-zinc-600" />
                          <span>আপলোড</span>
                        </>
                      )}
                    </button>
                  </div>

                  {formState.image_url && (
                    <div className="relative aspect-16/7 max-h-36 rounded-lg overflow-hidden border border-zinc-200 mt-2 bg-zinc-100">
                      <img
                        src={formState.image_url}
                        alt="Desktop Banner Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Mobile Image (Optional) */}
                <div className="space-y-1.5 p-3 bg-white rounded-xl border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>মোবাইল ডিভাইসের জন্য ছবি (Optional Mobile Image)</span>
                    </label>
                    {formState.mobile_image_url && (
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, mobile_image_url: '' })}
                        className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        ছবি সরান
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formState.mobile_image_url}
                      onChange={(e) => setFormState({ ...formState, mobile_image_url: e.target.value })}
                      placeholder="মোবাইলে আলাদা ছবি দিতে চাইলে লিংক দিন বা আপলোড করুন (না দিলে ডেস্কটপ ছবি দেখাবে)"
                      className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                    />

                    <input
                      type="file"
                      ref={mobileFileInputRef}
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImageFile(f, 'mobile');
                      }}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isUploadingMobile}
                      onClick={() => mobileFileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingMobile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          <span>আপলোড হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-zinc-600" />
                          <span>আপলোড</span>
                        </>
                      )}
                    </button>
                  </div>

                  {formState.mobile_image_url && (
                    <div className="relative aspect-16/9 max-h-36 rounded-lg overflow-hidden border border-zinc-200 mt-2 bg-zinc-100 max-w-xs">
                      <img
                        src={formState.mobile_image_url}
                        alt="Mobile Banner Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                  <h5 className="font-bold text-zinc-800 text-xs">প্রাথমিক বাটন (Primary Button)</h5>
                  <div>
                    <label className="block text-[11px] text-zinc-600 mb-0.5">বাটন টেক্সট</label>
                    <input
                      type="text"
                      value={formState.primary_button_text}
                      onChange={(e) => setFormState({ ...formState, primary_button_text: e.target.value })}
                      placeholder="যেমন: বইসমূহ ঘুরে দেখুন"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 mb-0.5">লিংক বা ক্যাটাগরি</label>
                    <input
                      type="text"
                      value={formState.primary_button_url}
                      onChange={(e) => setFormState({ ...formState, primary_button_url: e.target.value })}
                      placeholder="যেমন: books, offers, অথবা /?category=উপন্যাস"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                  <h5 className="font-bold text-zinc-800 text-xs">দ্বিতীয় বাটন (Secondary Button)</h5>
                  <div>
                    <label className="block text-[11px] text-zinc-600 mb-0.5">বাটন টেক্সট</label>
                    <input
                      type="text"
                      value={formState.secondary_button_text}
                      onChange={(e) => setFormState({ ...formState, secondary_button_text: e.target.value })}
                      placeholder="যেমন: এখনই অর্ডার করুন"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 mb-0.5">লিংক বা ক্যাটাগরি</label>
                    <input
                      type="text"
                      value={formState.secondary_button_url}
                      onChange={(e) => setFormState({ ...formState, secondary_button_url: e.target.value })}
                      placeholder="যেমন: catalog, bestsellers"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Order, Status, Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">প্রদর্শন ক্রম (Order)</label>
                  <input
                    type="number"
                    min={1}
                    value={formState.display_order}
                    onChange={(e) => setFormState({ ...formState, display_order: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                  <span className="text-[10px] text-zinc-400">ছোট সংখ্যা আগে দেখাবে</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">স্থিতি (Status)</label>
                  <select
                    value={formState.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormState({ ...formState, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">শুরুর তারিখ (ঐচ্ছিক)</label>
                  <input
                    type="datetime-local"
                    value={formState.starts_at}
                    onChange={(e) => setFormState({ ...formState, starts_at: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">শেষের তারিখ (ঐচ্ছিক)</label>
                  <input
                    type="datetime-local"
                    value={formState.ends_at}
                    onChange={(e) => setFormState({ ...formState, ends_at: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Alt Text & Target URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    SEO / Alt Text
                  </label>
                  <input
                    type="text"
                    value={formState.alt_text}
                    onChange={(e) => setFormState({ ...formState, alt_text: e.target.value })}
                    placeholder="ছবির বর্ণনামূলক টেক্সট"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formState.open_in_new_tab}
                      onChange={(e) => setFormState({ ...formState, open_in_new_tab: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-semibold text-zinc-700">লিংক নতুন ট্যাবে ওপেন হবে</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer / Save Buttons */}
              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingBannerId ? 'পরিবর্তন সংরক্ষণ করুন' : 'ব্যানার তৈরি সম্পন্ন করুন'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------------ */}
      {deleteConfirmBanner && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6 space-y-4 font-['Noto_Sans_Bengali']">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 text-base">ব্যানার মুছে ফেলার নিশ্চয়তা</h4>
                <p className="text-xs text-zinc-500">এই পরিবর্তনটি ফিরিয়ে আনা যাবে না</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs space-y-1">
              <p className="font-bold text-zinc-800">
                "{deleteConfirmBanner.name || deleteConfirmBanner.title}"
              </p>
              <p className="text-zinc-500 text-[11px]">
                প্লেসমেন্ট: {deleteConfirmBanner.placement || deleteConfirmBanner.type}
              </p>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              আপনি কি নিশ্চিত যে এই ব্যানারটি মুছে ফেলতে চান? এটি মুছে ফেললে ওয়েবসাইট থেকে ব্যানারটি তৎক্ষণাৎ অদৃশ্য হয়ে যাবে।
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBanner(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>হ্যাঁ, মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
