'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Calendar,
  Eye,
  EyeOff,
  Save,
  X,
  AlertTriangle,
  Loader2,
  Ticket,
  CheckCircle,
  Clock,
  Sparkles,
  Percent,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Coupon } from '../../types';
import { formatPrice, toBengaliNumber } from '../../utils/formatters';

interface CouponManagementTabProps {
  onShowNotice?: (message: string, type?: 'success' | 'error') => void;
}

export const CouponManagementTab: React.FC<CouponManagementTabProps> = ({ onShowNotice }) => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon, refreshCoupons } = useData();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'discount_desc' | 'usage_desc'>('newest');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const initialForm = {
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
    discount_value: 10,
    minimum_order_amount: 0,
    maximum_discount_amount: '' as string | number,
    usage_limit: '' as string | number,
    per_user_limit: '' as string | number,
    starts_at: '',
    expires_at: '',
    description: '',
    applicable_to: 'all' as 'all' | 'category' | 'books',
    is_active: true,
  };

  const [formState, setFormState] = useState(initialForm);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    if (onShowNotice) {
      onShowNotice(msg, type);
    }
  };

  // Filtered & Sorted Coupons
  const filteredCoupons = useMemo(() => {
    const now = new Date();

    return (coupons || [])
      .filter((coup) => {
        const isExpired = coup.expires_at ? new Date(coup.expires_at) < now : false;

        // Status filter
        if (statusFilter === 'active' && (!coup.is_active || isExpired)) return false;
        if (statusFilter === 'inactive' && coup.is_active) return false;
        if (statusFilter === 'expired' && !isExpired) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = coup.code.toLowerCase().includes(q);
          const matchDesc = coup.description?.toLowerCase().includes(q);
          if (!matchCode && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (sortBy === 'discount_desc') {
          return Number(b.discount_value || 0) - Number(a.discount_value || 0);
        }
        if (sortBy === 'usage_desc') {
          return Number(b.used_count || 0) - Number(a.used_count || 0);
        }
        return 0;
      });
  }, [coupons, statusFilter, searchQuery, sortBy]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCouponId(null);
    setFormState(initialForm);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (coup: Coupon) => {
    setEditingCouponId(coup.id);
    setFormState({
      code: coup.code,
      discount_type: coup.discount_type || 'percentage',
      discount_value: coup.discount_value,
      minimum_order_amount: coup.minimum_order_amount || 0,
      maximum_discount_amount: coup.maximum_discount_amount !== null && coup.maximum_discount_amount !== undefined ? coup.maximum_discount_amount : '',
      usage_limit: coup.usage_limit !== null && coup.usage_limit !== undefined ? coup.usage_limit : '',
      per_user_limit: coup.per_user_limit !== null && coup.per_user_limit !== undefined ? coup.per_user_limit : '',
      starts_at: coup.starts_at ? new Date(coup.starts_at).toISOString().slice(0, 16) : '',
      expires_at: coup.expires_at ? new Date(coup.expires_at).toISOString().slice(0, 16) : '',
      description: coup.description || '',
      applicable_to: coup.applicable_to || 'all',
      is_active: Boolean(coup.is_active),
    });
    setIsFormModalOpen(true);
  };

  // Quick Toggle Active/Inactive
  const handleToggleActive = async (coup: Coupon) => {
    try {
      const nextStatus = !coup.is_active;
      await updateCoupon(coup.id, { is_active: nextStatus });
      notify(`কুপন "${coup.code}" ${nextStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে!`);
    } catch (err: any) {
      notify(err.message || 'কুপনের স্থিতি পরিবর্তন ব্যর্থ হয়েছে', 'error');
    }
  };

  // Delete Coupon
  const handleConfirmDelete = async () => {
    if (!deleteConfirmCoupon) return;
    try {
      await deleteCoupon(deleteConfirmCoupon.id);
      notify(`কুপন "${deleteConfirmCoupon.code}" সফলভাবে মুছে ফেলা হয়েছে!`);
      setDeleteConfirmCoupon(null);
    } catch (err: any) {
      notify(err.message || 'কুপন মুছে ফেলা সম্ভব হয়নি', 'error');
    }
  };

  // Save Coupon (Add or Edit)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formState.code.trim().toUpperCase().replace(/\s+/g, '');

    if (!cleanCode) {
      notify('কুপন কোড প্রদান করা আবশ্যক!', 'error');
      return;
    }

    const discountVal = Number(formState.discount_value);
    if (isNaN(discountVal) || discountVal < 1 || discountVal > 100) {
      notify('ডিসকাউন্টের শতকরা পরিমাণ ১% থেকে ১০০% এর মধ্যে হতে হবে!', 'error');
      return;
    }

    if (formState.starts_at && formState.expires_at && new Date(formState.starts_at) > new Date(formState.expires_at)) {
      notify('মেয়াদ শেষ হওয়ার তারিখ শুরুর তারিখের পূর্ববর্তী হতে পারে না!', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Partial<Coupon> = {
        code: cleanCode,
        discount_type: formState.discount_type,
        discount_value: discountVal,
        minimum_order_amount: Number(formState.minimum_order_amount) || 0,
        maximum_discount_amount: formState.maximum_discount_amount !== '' ? Number(formState.maximum_discount_amount) : null,
        usage_limit: formState.usage_limit !== '' ? Number(formState.usage_limit) : null,
        per_user_limit: formState.per_user_limit !== '' ? Number(formState.per_user_limit) : null,
        starts_at: formState.starts_at ? new Date(formState.starts_at).toISOString() : null,
        expires_at: formState.expires_at ? new Date(formState.expires_at).toISOString() : null,
        description: formState.description.trim(),
        applicable_to: formState.applicable_to,
        is_active: formState.is_active,
      };

      if (editingCouponId) {
        await updateCoupon(editingCouponId, payload);
        notify(`কুপন "${cleanCode}" সফলভাবে আপডেট করা হয়েছে!`);
      } else {
        await addCoupon(payload);
        notify(`নতুন কুপন "${cleanCode}" সফলভাবে তৈরি হয়েছে!`);
      }

      setIsFormModalOpen(false);
      setEditingCouponId(null);
    } catch (err: any) {
      notify(err.message || 'কুপন সংরক্ষণে সমস্যা হয়েছে!', 'error');
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
              কুপন ব্যবস্থাপনা
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
              {toBengaliNumber(coupons?.length || 0)} টি কুপন
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            ওয়েবসাইটের সকল ডিসকাউন্ট কুপন তৈরি, শতকরা ছাড়, সর্বনিম্ন অর্ডার এবং ব্যবহারের মেয়াদ নিয়ন্ত্রণ করুন
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন কুপন যোগ করুন</span>
        </button>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কুপন কোড (যেমন: SHESHER10) দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-amber-400 outline-none uppercase transition-all"
          />
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">ফিল্টার:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white outline-none font-medium cursor-pointer"
          >
            <option value="all">সকল কুপন</option>
            <option value="active">সক্রিয় (Active)</option>
            <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
            <option value="expired">মেয়াদোত্তীর্ণ (Expired)</option>
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
            <option value="newest">সর্বশেষ তৈরি</option>
            <option value="discount_desc">সর্বোচ্চ ছাড় (%)</option>
            <option value="usage_desc">সর্বাধিক ব্যবহৃত</option>
          </select>
        </div>
      </div>

      {/* Coupons Table / Cards Grid */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-zinc-800 text-sm">কোনো কুপন পাওয়া যায়নি</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            আপনার অনুসন্ধান শর্ত অনুযায়ী কোনো কুপন নেই। নতুন কুপন যুক্ত করতে উপরের বাটন চাপুন।
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F4] border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">কুপন কোড</th>
                  <th className="py-3.5 px-4">ডিসকাউন্ট</th>
                  <th className="py-3.5 px-4">স্থিতি</th>
                  <th className="py-3.5 px-4">ব্যবহার / সীমা</th>
                  <th className="py-3.5 px-4">সর্বনিম্ন অর্ডার</th>
                  <th className="py-3.5 px-4">মেয়াদ</th>
                  <th className="py-3.5 px-5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredCoupons.map((coup) => {
                  const isExpired = coup.expires_at ? new Date(coup.expires_at) < new Date() : false;
                  return (
                    <tr key={coup.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* Code & Description */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl bg-amber-100/90 text-amber-950 border border-amber-300">
                            {coup.code}
                          </span>
                        </div>
                        {coup.description && (
                          <p className="text-[11px] text-zinc-500 mt-1 max-w-xs line-clamp-1">
                            {coup.description}
                          </p>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="py-4 px-4 font-bold text-zinc-900">
                        <span className="inline-flex items-center gap-1 text-sm font-extrabold text-amber-600">
                          {toBengaliNumber(coup.discount_value)}% ছাড়
                        </span>
                        {coup.maximum_discount_amount && (
                          <p className="text-[10px] text-zinc-400 font-normal">
                            সর্বোচ্চ: ৳{toBengaliNumber(coup.maximum_discount_amount)}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isExpired ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            মেয়াদোত্তীর্ণ
                          </span>
                        ) : coup.is_active ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            সক্রিয় (Active)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                            নিষ্ক্রিয় (Inactive)
                          </span>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-4 text-zinc-700 font-medium">
                        <span>
                          {toBengaliNumber(coup.used_count || 0)}
                          {coup.usage_limit ? ` / ${toBengaliNumber(coup.usage_limit)}` : ' বার'}
                        </span>
                        {coup.usage_limit && Number(coup.used_count || 0) >= Number(coup.usage_limit) && (
                          <span className="block text-[10px] text-rose-600 font-bold">সীমা শেষ</span>
                        )}
                      </td>

                      {/* Minimum Order */}
                      <td className="py-4 px-4 text-zinc-700">
                        {coup.minimum_order_amount && coup.minimum_order_amount > 0 ? (
                          <span className="font-semibold text-zinc-900">
                            ৳{toBengaliNumber(coup.minimum_order_amount)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">শর্তহীন (৳০)</span>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="py-4 px-4 text-zinc-600">
                        {coup.expires_at ? (
                          <span className="text-[11px]">
                            {new Date(coup.expires_at).toLocaleDateString('bn-BD')}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px]">আজীবন / মেয়াদহীন</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Active */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(coup)}
                            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                              coup.is_active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                            }`}
                            title={coup.is_active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                          >
                            {coup.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(coup)}
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer"
                            title="সম্পাদনা করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmCoupon(coup)}
                            className="p-1.5 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-500 hover:text-rose-700 transition-colors cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-zinc-100">
            {filteredCoupons.map((coup) => {
              const isExpired = coup.expires_at ? new Date(coup.expires_at) < new Date() : false;
              return (
                <div key={coup.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 inline-block">
                        {coup.code}
                      </span>
                      {coup.description && (
                        <p className="text-xs text-zinc-600">{coup.description}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-amber-600">
                        {toBengaliNumber(coup.discount_value)}% ছাড়
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50 p-2.5 rounded-xl">
                    <div>
                      <span className="text-zinc-400">স্থিতি: </span>
                      {isExpired ? (
                        <span className="font-bold text-rose-600">মেয়াদোত্তীর্ণ</span>
                      ) : coup.is_active ? (
                        <span className="font-bold text-emerald-600">সক্রিয়</span>
                      ) : (
                        <span className="font-bold text-zinc-500">নিষ্ক্রিয়</span>
                      )}
                    </div>
                    <div>
                      <span className="text-zinc-400">ব্যবহার: </span>
                      <span className="font-semibold text-zinc-800">
                        {toBengaliNumber(coup.used_count || 0)}{coup.usage_limit ? `/${toBengaliNumber(coup.usage_limit)}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400">মিনিমাম অর্ডার: </span>
                      <span className="font-semibold text-zinc-800">
                        {coup.minimum_order_amount ? `৳${toBengaliNumber(coup.minimum_order_amount)}` : 'শর্তহীন'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400">মেয়াদ: </span>
                      <span className="font-semibold text-zinc-800">
                        {coup.expires_at ? new Date(coup.expires_at).toLocaleDateString('bn-BD') : 'মেয়াদহীন'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coup)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        coup.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {coup.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(coup)}
                      className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs cursor-pointer"
                    >
                      সম্পাদনা
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmCoupon(coup)}
                      className="p-1 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ADD / EDIT COUPON MODAL */}
      {/* ------------------------------------------------------------------ */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-['Noto_Sans_Bengali']">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 my-auto max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-[#FAF8F4] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                    {editingCouponId ? 'কুপন সম্পাদনা করুন' : 'নতুন কুপন যোগ করুন'}
                  </h3>
                  <p className="text-xs text-zinc-500">কুপন কোড, ডিসকাউন্ট ও ব্যবহারের শর্ত পূরণ করুন</p>
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

            {/* Form */}
            <form onSubmit={handleSaveForm} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Row 1: Code & Discount % */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    কুপন কোড (Coupon Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="যেমন: SHESHER10"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none uppercase"
                  />
                  <span className="text-[10px] text-zinc-400">স্পেস ছাড়া স্বয়ংক্রিয়ভাবে বড় হাতের অক্ষরের কোড</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ডিসকাউন্ট শতকরা (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formState.discount_value}
                      onChange={(e) => setFormState({ ...formState, discount_value: Number(e.target.value) })}
                      placeholder="যেমন: 10"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none pr-8"
                    />
                    <Percent className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-zinc-400">১% থেকে ১০০% এর মধ্যে লিখুন</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  কুপনের বিবরণ (Description)
                </label>
                <input
                  type="text"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="যেমন: নতুন গ্রাহকদের জন্য ১০% ছাড়"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                />
              </div>

              {/* Min Order & Max Discount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    সর্বনিম্ন অর্ডার মূল্য (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.minimum_order_amount}
                    onChange={(e) => setFormState({ ...formState, minimum_order_amount: Number(e.target.value) || 0 })}
                    placeholder="০ দিলে যেকোনো অর্ডারে প্রযোজ্য"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                  <span className="text-[10px] text-zinc-400">০ দিলে কোনো শর্ত থাকবে না</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    সর্বোচ্চ ছাড়ের সীমা (৳) (ঐচ্ছিক)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.maximum_discount_amount}
                    onChange={(e) => setFormState({ ...formState, maximum_discount_amount: e.target.value })}
                    placeholder="যেমন: ৫০০ (ফাঁকা রাখলে সীমাহীন)"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                  <span className="text-[10px] text-zinc-400">সর্বোচ্চ কত টাকা পর্যন্ত ছাড় পাবে</span>
                </div>
              </div>

              {/* Usage Limits Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    মোট ব্যবহারের সীমা (Total Usage Limit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formState.usage_limit}
                    onChange={(e) => setFormState({ ...formState, usage_limit: e.target.value })}
                    placeholder="যেমন: ১০০ (ফাঁকা রাখলে সীমাহীন)"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                  <span className="text-[10px] text-zinc-400">সর্বমোট কতবার এই কুপন ব্যবহার করা যাবে</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    স্থিতি (Status)
                  </label>
                  <select
                    value={formState.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormState({ ...formState, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
              </div>

              {/* Validity Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    শুরুর তারিখ ও সময় (ঐচ্ছিক)
                  </label>
                  <input
                    type="datetime-local"
                    value={formState.starts_at}
                    onChange={(e) => setFormState({ ...formState, starts_at: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    মেয়াদ শেষ হওয়ার তারিখ ও সময় (ঐচ্ছিক)
                  </label>
                  <input
                    type="datetime-local"
                    value={formState.expires_at}
                    onChange={(e) => setFormState({ ...formState, expires_at: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
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
                      <span>{editingCouponId ? 'পরিবর্তন সংরক্ষণ করুন' : 'কুপন তৈরি সম্পন্ন করুন'}</span>
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
      {deleteConfirmCoupon && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6 space-y-4 font-['Noto_Sans_Bengali']">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 text-base">কুপন মুছে ফেলার নিশ্চয়তা</h4>
                <p className="text-xs text-zinc-500">এই পরিবর্তনটি ফিরিয়ে আনা যাবে না</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs space-y-1">
              <p className="font-mono font-bold text-zinc-900 text-sm">
                কোড: {deleteConfirmCoupon.code}
              </p>
              <p className="text-zinc-600">
                ডিসকাউন্ট: {toBengaliNumber(deleteConfirmCoupon.discount_value)}% ছাড়
              </p>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              আপনি কি নিশ্চিত যে এই কুপনটি মুছে ফেলতে চান? এটি মুছে ফেলার পর গ্রাহক আর এই কুপন কোড ব্যবহার করতে পারবেন না। 
              <span className="block mt-1 font-semibold text-zinc-700">
                (পূর্ববর্তী অর্ডারের ডিসকাউন্ট হিস্টোরি অপরিবর্তিত থাকবে)
              </span>
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCoupon(null)}
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
