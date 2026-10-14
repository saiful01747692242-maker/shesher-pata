'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  Building2,
  Users,
  ShoppingBag,
  Settings,
  LogOut,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Save,
  X,
  Printer,
  ChevronRight,
  TrendingUp,
  Package,
  Clock,
  ShieldCheck,
  Eye,
  EyeOff,
  Filter,
  Download,
  RotateCcw,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Globe,
  Tag,
  Truck,
  Send,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Loader2,
  Database,
} from 'lucide-react';
import { useData } from '../../src/context/DataContext';
import { Book, Banner, Category, Author, Publisher, OrderDetails, Coupon } from '../../src/types';
import { formatPrice, toBengaliNumber } from '../../src/utils/formatters';
import { bookService } from '../../src/services/bookService';
import { SearchableCombobox, ComboboxOption } from '../../src/components/SearchableCombobox';
import { normalizeBengali, matchesAuthor, matchesCategory, getCategoryDisplayName, CANONICAL_CATEGORIES } from '../../src/utils/filterUtils';
import { BannerManagementTab } from '../../src/components/admin/BannerManagementTab';
import { CouponManagementTab } from '../../src/components/admin/CouponManagementTab';
import { BackupRestoreTab } from '../../src/components/admin/BackupRestoreTab';

function AdminDashboardContent() {
  const {
    books,
    isBooksLoading,
    banners,
    coupons,
    categories,
    authors,
    publishers,
    orders,
    isOrdersLoading,
    refreshOrders,
    addBook,
    updateBook,
    deleteBook,
    syncBooksWithSupabase,
    addBanner,
    updateBanner,
    deleteBanner,
    addCategory,
    updateCategory,
    deleteCategory,
    addAuthor,
    updateAuthor,
    deleteAuthor,
    addPublisher,
    updatePublisher,
    deletePublisher,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    siteSettings,
    updateSiteSettings,
    resetAllData,
    exportDataJSON,
    importDataJSON,
    importBooksBulk,
  } = useData();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isClientMounted, setIsClientMounted] = useState<boolean>(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isRemember, setIsRemember] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'books' | 'banners' | 'coupons' | 'categories' | 'publishers' | 'authors' | 'orders' | 'settings' | 'store_settings' | 'steadfast' | 'backup_restore'
  >('dashboard');

  // Book Management States
  const [bookSearch, setBookSearch] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState('all');
  const [bookStockFilter, setBookStockFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [isSavingBook, setIsSavingBook] = useState(false);

  // Book Form State helper: always starts with empty image so new books never inherit previous images
  const getInitialBookForm = () => ({
    title: '',
    bangla_name: '',
    english_name: '',
    author: authors[0]?.name || 'হুমায়ূন আহমেদ',
    publisher: publishers[0]?.name || 'বাতিঘর',
    category: categories[0]?.name || 'উপন্যাস',
    price: 350,
    originalPrice: 500,
    discount: 30,
    stock: 20,
    isbn: `978-984-${Math.floor(100000 + Math.random() * 900000)}`,
    pages: 220,
    edition: '১ম সংস্করণ',
    language: 'বাংলা',
    description: '',
    image: '',
    tags: 'উপন্যাস, জনপ্রিয়',
    isBestseller: true,
    isNew: true,
    isFeatured: true,
    isInternational: false,
    sectionIds: ['new-arrivals', 'popular'],
  });

  const [bookForm, setBookForm] = useState<{
    title: string;
    bangla_name: string;
    english_name: string;
    author: string;
    publisher: string;
    category: string;
    price: number;
    originalPrice: number;
    discount: number;
    stock: number;
    isbn: string;
    pages: number;
    edition: string;
    language: string;
    description: string;
    image: string;
    tags: string;
    isBestseller: boolean;
    isNew: boolean;
    isFeatured: boolean;
    isInternational: boolean;
    sectionIds: string[];
  }>(getInitialBookForm());

  // Memoized complete list of categories (dynamic + canonical + current form category)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    const list: { id: string; name: string }[] = [];

    // First add DB categories
    categories.forEach((c) => {
      if (c.name && !set.has(c.name.trim())) {
        set.add(c.name.trim());
        list.push({ id: c.id || c.name, name: c.name.trim() });
      }
    });

    // Then add canonical categories if not present
    CANONICAL_CATEGORIES.forEach((cc) => {
      if (!set.has(cc.name.trim())) {
        set.add(cc.name.trim());
        list.push({ id: cc.id, name: cc.name.trim() });
      }
    });

    // If current bookForm has a category not yet in list, keep it
    if (bookForm?.category && !set.has(bookForm.category.trim())) {
      list.push({ id: bookForm.category, name: bookForm.category.trim() });
    }

    return list;
  }, [categories, bookForm?.category]);

  // Comprehensive author options combining authors state and unique authors from catalog
  const authorComboboxOptions = useMemo<ComboboxOption[]>(() => {
    const map = new Map<string, ComboboxOption>();

    // 1. Authors from authors state (database + added)
    authors.forEach((a) => {
      if (a.name?.trim()) {
        const name = normalizeBengali(a.name);
        const count = books.filter((b) => matchesAuthor(b.author, name)).length;
        map.set(name.toLowerCase(), {
          id: a.id,
          name,
          subtext: a.era || a.role,
          count,
        });
      }
    });

    // 2. Authors from existing books that might not be in authors table
    books.forEach((b) => {
      const bAuth = normalizeBengali(b.author);
      if (bAuth && !map.has(bAuth.toLowerCase())) {
        const count = books.filter((bk) => matchesAuthor(bk.author, bAuth)).length;
        map.set(bAuth.toLowerCase(), {
          name: bAuth,
          subtext: 'বই ক্যাটালগ থেকে',
          count,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'bn'));
  }, [authors, books]);

  // Comprehensive publisher options combining publishers state and unique publishers from catalog
  const publisherComboboxOptions = useMemo<ComboboxOption[]>(() => {
    const map = new Map<string, ComboboxOption>();

    // 1. Publishers from publishers state (localStorage + added)
    publishers.forEach((p) => {
      if (p.name?.trim()) {
        const name = p.name.trim();
        const count = books.filter((b) => b.publisher === name).length;
        map.set(name, {
          id: p.id,
          name,
          subtext: p.location || p.established ? `${p.location || ''} ${p.established ? `(${p.established})` : ''}`.trim() : undefined,
          count,
        });
      }
    });

    // 2. Publishers from existing books
    books.forEach((b) => {
      const bPub = b.publisher?.trim();
      if (bPub && !map.has(bPub)) {
        const count = books.filter((bk) => bk.publisher === bPub).length;
        map.set(bPub, {
          name: bPub,
          subtext: 'বই ক্যাটালগ থেকে',
          count,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'bn'));
  }, [publishers, books]);

  // Banner Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<{
    title: string;
    english_title: string;
    subtitle: string;
    english_subtitle: string;
    bangla_image: string;
    english_image: string;
    badge: string;
    link: string;
    status: 'active' | 'inactive';
    sort_order: number;
  }>({
    title: '',
    english_title: '',
    subtitle: '',
    english_subtitle: '',
    bangla_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1600&h=600&q=85',
    english_image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1600&h=600&q=85',
    badge: 'Special Offer',
    link: 'books',
    status: 'active',
    sort_order: 1,
  });

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [isUploadingCatImage, setIsUploadingCatImage] = useState(false);
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [catForm, setCatForm] = useState({
    name: '',
    englishName: '',
    iconName: 'BookOpen',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
  });

  // Publisher Modal State
  const [isPubModalOpen, setIsPubModalOpen] = useState(false);
  const [editingPubId, setEditingPubId] = useState<string | null>(null);
  const [pubForm, setPubForm] = useState({
    name: '',
    description: '',
    location: 'ঢাকা',
    established: '২০১০',
    logo: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=120&q=80',
  });

  // Author Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingAuthId, setEditingAuthId] = useState<string | null>(null);
  const [isUploadingAuthImage, setIsUploadingAuthImage] = useState(false);
  const [isSavingAuth, setIsSavingAuth] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: '',
    era: '',
    role: 'কথাসাহিত্যিক ও লেখক',
    bio: '',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
  });

  // Order Filter & View State
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderDateFilter, setOrderDateFilter] = useState<'all' | 'today'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<OrderDetails | null>(null);

  // File upload input ref
  const bookImageInputRef = useRef<HTMLInputElement | null>(null);
  const catImageInputRef = useRef<HTMLInputElement | null>(null);
  const pubImageInputRef = useRef<HTMLInputElement | null>(null);
  const authImageInputRef = useRef<HTMLInputElement | null>(null);

  // Notification / Toast inside admin
  const [adminNotice, setAdminNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setAdminNotice({ message, type });
    setTimeout(() => {
      setAdminNotice(null);
    }, 4000);
  };

  // Check auth session with server-side verified token
  useEffect(() => {
    setIsClientMounted(true);
    let isMounted = true;
    fetch('/api/admin/auth', {
      cache: 'no-store',
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (isMounted && data?.authenticated) {
          setIsAuthenticated(true);
          refreshOrders();
        } else if (isMounted) {
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsAuthenticated(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh orders when admin tab changes or on authenticated mount
  useEffect(() => {
    if (isAuthenticated && activeTab === 'orders') {
      refreshOrders();
    }
  }, [isAuthenticated, activeTab]);

  // Handle Login via server-side verification
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: loginUser.trim(),
          password: loginPass,
          remember: isRemember,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setLoginPass('');
        refreshOrders();
        showNotice(data.message || 'স্বাগতম! অ্যাডমিন প্যানেলে সফলভাবে প্রবেশ করেছেন।');
      } else {
        setLoginError(data.error || 'ভুল ইউজারনেম বা পাসওয়ার্ড প্রদান করেছেন!');
      }
    } catch {
      setLoginError('লগইনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  // Handle Logout via server session termination
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth?action=logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network error on logout
    }
    setIsAuthenticated(false);
    setLoginPass('');
    showNotice('অ্যাডমিন প্যানেল থেকে সফলভাবে লগআউট করা হয়েছে');
  };

  // Auto calculate discount percentage when price or originalPrice changes
  const handlePriceChange = (priceVal: number, originalPriceVal: number) => {
    let disc = 0;
    if (originalPriceVal > 0 && priceVal < originalPriceVal) {
      disc = Math.round(((originalPriceVal - priceVal) / originalPriceVal) * 100);
    }
    setBookForm((prev) => ({
      ...prev,
      price: priceVal,
      originalPrice: originalPriceVal,
      discount: disc,
    }));
  };

  // Handle Image File Upload -> Supabase Storage
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    bucket = 'book-covers',
    options?: { folder?: string; recordId?: string; type?: 'category' | 'author' | 'book' | 'banner'; setLoading?: (loading: boolean) => void }
  ) => {
    const file = e.target.files?.[0];
    // Always clear target value so re-selecting the exact same file triggers onChange
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotice('দয়া করে একটি ছবি ফাইল আপলোড করুন (JPG, PNG, WebP)', 'error');
      return;
    }

    if (options?.setLoading) options.setLoading(true);

    try {
      showNotice('ছবি Supabase স্টোরেজে আপলোড হচ্ছে...');
      const uploadedUrl = await bookService.uploadImage(file, bucket, {
        folder: options?.folder,
        recordId: options?.recordId,
        type: options?.type,
      });
      setter(uploadedUrl);
      showNotice('ছবি সফলভাবে স্টোরেজে আপলোড হয়েছে!');
    } catch (uploadErr: any) {
      console.error('[Admin Upload Error]:', uploadErr);
      if (options?.type === 'category' || options?.type === 'author') {
        showNotice(uploadErr.message || 'ছবি আপলোড ব্যর্থ হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।', 'error');
      } else {
        console.warn('[Admin Upload] Supabase Storage upload failed, falling back to local base64:', uploadErr.message);
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const result = loadEvt.target?.result as string;
          if (result) {
            setter(result);
            showNotice('ছবি সফলভাবে যুক্ত হয়েছে!');
          }
        };
        reader.readAsDataURL(file);
      }
    } finally {
      if (options?.setLoading) options.setLoading(false);
    }
  };

  // Close and completely reset Book Modal state
  const handleCloseBookModal = () => {
    setIsBookModalOpen(false);
    setEditingBookId(null);
    setBookForm(getInitialBookForm());
    if (bookImageInputRef.current) {
      bookImageInputRef.current.value = '';
    }
  };

  // Save Book (Create or Edit)
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const banglaName = (bookForm.bangla_name || bookForm.title || '').trim();
    const englishName = (bookForm.english_name || '').trim();
    const title = banglaName || englishName;

    if (!title || !bookForm.author.trim()) {
      showNotice('বইয়ের নাম (বাংলা বা ইংরেজি) এবং লেখকের নাম আবশ্যক!', 'error');
      return;
    }

    const tagsArray = bookForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      setIsSavingBook(true);
      showNotice(editingBookId ? `"${title}" সেন্ট্রাল ডাটাবেজে আপডেট হচ্ছে...` : `"${title}" সেন্ট্রাল ডাটাবেজে সংরক্ষিত হচ্ছে...`);

      const cleanImage = (bookForm.image || '').trim();
      const resolvedCategory = getCategoryDisplayName(bookForm.category, categories) || normalizeBengali(bookForm.category) || 'উপন্যাস';

      if (editingBookId) {
        // Edit existing
        await updateBook(editingBookId, {
          title,
          bangla_name: banglaName,
          english_name: englishName,
          author: normalizeBengali(bookForm.author),
          publisher: normalizeBengali(bookForm.publisher) || 'বাতিঘর',
          category: resolvedCategory,
          price: Number(bookForm.price),
          originalPrice: Number(bookForm.originalPrice),
          discount: Number(bookForm.discount),
          stock: Number(bookForm.stock),
          isbn: bookForm.isbn.trim() || `978-984-${Math.floor(100000 + Math.random() * 900000)}`,
          pages: Number(bookForm.pages),
          edition: bookForm.edition.trim(),
          language: bookForm.language.trim(),
          description: bookForm.description.trim(),
          image: cleanImage,
          cover_image: cleanImage,
          tags: tagsArray,
          isBestseller: bookForm.isBestseller,
          isNew: bookForm.isNew,
          isFeatured: bookForm.isFeatured,
          isInternational: bookForm.isInternational,
          sectionIds: bookForm.sectionIds,
        });
        showNotice(`"${title}" সফলভাবে আপডেট করা হয়েছে এবং সব ব্যবহারকারীর জন্য লাইভ হয়েছে!`);
      } else {
        // Add new
        await addBook({
          title,
          bangla_name: banglaName,
          english_name: englishName,
          author: normalizeBengali(bookForm.author),
          publisher: normalizeBengali(bookForm.publisher) || 'বাতিঘর',
          category: resolvedCategory,
          price: Number(bookForm.price),
          originalPrice: Number(bookForm.originalPrice),
          discount: Number(bookForm.discount),
          stock: Number(bookForm.stock),
          isbn: bookForm.isbn.trim() || `978-984-${Math.floor(100000 + Math.random() * 900000)}`,
          pages: Number(bookForm.pages),
          edition: bookForm.edition.trim(),
          language: bookForm.language.trim(),
          description: bookForm.description.trim(),
          image: cleanImage,
          cover_image: cleanImage,
          tags: tagsArray,
          rating: 4.8,
          reviewCount: 1,
          isBestseller: bookForm.isBestseller,
          isNew: bookForm.isNew,
          isFeatured: bookForm.isFeatured,
          isInternational: bookForm.isInternational,
          sectionIds: bookForm.sectionIds,
        });
        showNotice(`"${title}" সফলভাবে যুক্ত হয়েছে এবং সব ব্যবহারকারীর জন্য লাইভ হয়েছে!`);
      }

      handleCloseBookModal();
    } catch (err: any) {
      showNotice(err.message || 'বই সংরক্ষণ করতে সমস্যা দেখা দিয়েছে!', 'error');
    } finally {
      setIsSavingBook(false);
    }
  };

  // Open Edit Book Modal
  const handleOpenEditBook = (book: Book) => {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title,
      bangla_name: book.bangla_name || book.title || '',
      english_name: book.english_name || '',
      author: book.author,
      publisher: book.publisher || 'বাতিঘর',
      category: book.category,
      price: book.price,
      originalPrice: book.originalPrice || book.price,
      discount: book.discount || 0,
      stock: book.stock,
      isbn: book.isbn || '',
      pages: book.pages || 200,
      edition: book.edition || '১ম সংস্করণ',
      language: book.language || 'বাংলা',
      description: book.description || '',
      image: book.image || book.cover_image || '',
      tags: book.tags ? book.tags.join(', ') : '',
      isBestseller: !!book.isBestseller,
      isNew: !!book.isNew,
      isFeatured: !!book.isFeatured,
      isInternational: !!book.isInternational,
      sectionIds: book.sectionIds || ['new-arrivals'],
    });
    if (bookImageInputRef.current) {
      bookImageInputRef.current.value = '';
    }
    setIsBookModalOpen(true);
  };

  // Open Add Book Modal
  const handleOpenAddBook = () => {
    setEditingBookId(null);
    setBookForm(getInitialBookForm());
    if (bookImageInputRef.current) {
      bookImageInputRef.current.value = '';
    }
    setIsBookModalOpen(true);
  };

  // Banner Handlers
  const handleOpenAddBanner = () => {
    setEditingBannerId(null);
    setBannerForm({
      title: '',
      english_title: '',
      subtitle: '',
      english_subtitle: '',
      bangla_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1600&h=600&q=85',
      english_image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1600&h=600&q=85',
      badge: 'Special Offer',
      link: 'books',
      status: 'active',
      sort_order: (banners.length || 0) + 1,
    });
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (ban: Banner) => {
    setEditingBannerId(ban.id);
    setBannerForm({
      title: ban.title || '',
      english_title: ban.english_title || '',
      subtitle: ban.subtitle || '',
      english_subtitle: ban.english_subtitle || '',
      bangla_image: ban.bangla_image || '',
      english_image: ban.english_image || '',
      badge: ban.badge || 'Featured',
      link: ban.link || 'books',
      status: ban.status || 'active',
      sort_order: ban.sort_order || 1,
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim() && !bannerForm.english_title.trim()) {
      showNotice('ব্যানারের নাম/শিরোনাম আবশ্যক!', 'error');
      return;
    }
    if (!bannerForm.bangla_image.trim() && !bannerForm.english_image.trim()) {
      showNotice('কমপক্ষে একটি ব্যানার ছবি আপলোড বা লিংক প্রদান করুন!', 'error');
      return;
    }

    const banglaImg = bannerForm.bangla_image.trim() || bannerForm.english_image.trim();
    const englishImg = bannerForm.english_image.trim() || bannerForm.bangla_image.trim();

    if (editingBannerId) {
      updateBanner(editingBannerId, {
        title: bannerForm.title.trim() || bannerForm.english_title.trim(),
        english_title: bannerForm.english_title.trim() || bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim(),
        english_subtitle: bannerForm.english_subtitle.trim(),
        bangla_image: banglaImg,
        english_image: englishImg,
        badge: bannerForm.badge.trim(),
        link: bannerForm.link.trim(),
        status: bannerForm.status,
        sort_order: Number(bannerForm.sort_order) || 1,
      });
      showNotice('ব্যানার সফলভাবে আপডেট করা হয়েছে!');
    } else {
      addBanner({
        title: bannerForm.title.trim() || bannerForm.english_title.trim(),
        english_title: bannerForm.english_title.trim() || bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim(),
        english_subtitle: bannerForm.english_subtitle.trim(),
        bangla_image: banglaImg,
        english_image: englishImg,
        badge: bannerForm.badge.trim(),
        link: bannerForm.link.trim(),
        status: bannerForm.status,
        sort_order: Number(bannerForm.sort_order) || (banners.length + 1),
      });
      showNotice('নতুন ব্যানার সফলভাবে তৈরি করা হয়েছে!');
    }

    setIsBannerModalOpen(false);
    setEditingBannerId(null);
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      showNotice('ক্যাটাগরির নাম আবশ্যক!', 'error');
      return;
    }
    if (isUploadingCatImage) {
      showNotice('ছবি আপলোড সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন...', 'error');
      return;
    }

    try {
      setIsSavingCat(true);
      const cleanImageUrl = (catForm.imageUrl || '').trim();

      if (editingCatId) {
        await updateCategory(editingCatId, {
          name: catForm.name.trim(),
          englishName: catForm.englishName.trim() || catForm.name.trim(),
          iconName: catForm.iconName || 'BookOpen',
          imageUrl: cleanImageUrl,
          image: cleanImageUrl,
        });
        showNotice(`ক্যাটাগরি "${catForm.name}" সফলভাবে আপডেট হয়েছে!`);
      } else {
        await addCategory({
          name: catForm.name.trim(),
          englishName: catForm.englishName.trim() || catForm.name.trim(),
          iconName: catForm.iconName || 'BookOpen',
          imageUrl: cleanImageUrl,
          image: cleanImageUrl,
          bookCount: 0,
        });
        showNotice(`নতুন ক্যাটাগরি "${catForm.name}" যুক্ত করা হয়েছে!`);
      }
      setIsCatModalOpen(false);
      setEditingCatId(null);
    } catch (err: any) {
      showNotice(err.message || 'ক্যাটাগরি সংরক্ষণে ত্রুটি হয়েছে', 'error');
    } finally {
      setIsSavingCat(false);
    }
  };

  // Save Publisher
  const handleSavePublisher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubForm.name.trim()) {
      showNotice('প্রকাশনীর নাম আবশ্যক!', 'error');
      return;
    }

    if (editingPubId) {
      updatePublisher(editingPubId, {
        name: pubForm.name.trim(),
        description: pubForm.description.trim(),
        location: pubForm.location.trim(),
        established: pubForm.established.trim(),
        logo: pubForm.logo,
      });
      showNotice(`প্রকাশনী "${pubForm.name}" আপডেট হয়েছে!`);
    } else {
      addPublisher({
        name: pubForm.name.trim(),
        description: pubForm.description.trim(),
        location: pubForm.location.trim(),
        established: pubForm.established.trim(),
        logo: pubForm.logo,
        bookCount: 0,
      });
      showNotice(`নতুন প্রকাশনী "${pubForm.name}" যুক্ত হয়েছে!`);
    }
    setIsPubModalOpen(false);
    setEditingPubId(null);
  };

  // Save Author
  const handleSaveAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.name.trim()) {
      showNotice('লেখকের নাম আবশ্যক!', 'error');
      return;
    }
    if (isUploadingAuthImage) {
      showNotice('ছবি আপলোড সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন...', 'error');
      return;
    }

    try {
      setIsSavingAuth(true);
      const cleanImage = (authForm.image || '').trim();

      if (editingAuthId) {
        await updateAuthor(editingAuthId, {
          name: authForm.name.trim(),
          era: authForm.era.trim(),
          role: authForm.role.trim(),
          bio: authForm.bio.trim(),
          image: cleanImage,
          image_url: cleanImage,
        });
        showNotice(`লেখক "${authForm.name}" আপডেট হয়েছে!`);
      } else {
        await addAuthor({
          name: authForm.name.trim(),
          era: authForm.era.trim(),
          role: authForm.role.trim(),
          bio: authForm.bio.trim(),
          image: cleanImage,
          image_url: cleanImage,
          bookCount: 0,
        });
        showNotice(`নতুন লেখক "${authForm.name}" যুক্ত হয়েছে!`);
      }
      setIsAuthModalOpen(false);
      setEditingAuthId(null);
    } catch (err: any) {
      showNotice(err.message || 'লেখক সংরক্ষণে ত্রুটি হয়েছে', 'error');
    } finally {
      setIsSavingAuth(false);
    }
  };

  const safeBooks = Array.isArray(books) ? books : [];
  const safeOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return [...orders].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA && timeB) return timeB - timeA;
      return 0;
    });
  }, [orders]);

  // Filtered Books List
  const filteredBooks = useMemo(() => {
    return safeBooks.filter((b) => {
      if (!b) return false;
      const search = (bookSearch || '').toLowerCase().trim();
      const matchSearch =
        !search ||
        (b.title && String(b.title).toLowerCase().includes(search)) ||
        (b.bangla_name && String(b.bangla_name).toLowerCase().includes(search)) ||
        (b.english_name && String(b.english_name).toLowerCase().includes(search)) ||
        (b.author && String(b.author).toLowerCase().includes(search)) ||
        (b.publisher && String(b.publisher).toLowerCase().includes(search)) ||
        (b.isbn && String(b.isbn).toLowerCase().includes(search));

      const matchCategory =
        bookCategoryFilter === 'all' || matchesCategory(b.category, b.tags, bookCategoryFilter, categories);

      const stock = typeof b.stock === 'number' ? b.stock : 0;
      const matchStock =
        bookStockFilter === 'all' ||
        (bookStockFilter === 'in' && stock > 0) ||
        (bookStockFilter === 'low' && stock > 0 && stock <= 5) ||
        (bookStockFilter === 'out' && stock === 0);

      return Boolean(matchSearch && matchCategory && matchStock);
    });
  }, [safeBooks, bookSearch, bookCategoryFilter, bookStockFilter, categories]);

  // Helper to check if an order was placed today
  const isTodayOrder = (orderDate: string, createdAt?: string) => {
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        if (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        ) {
          return true;
        }
      }
    }
    if (!orderDate) return false;
    try {
      const now = new Date();
      const str = String(orderDate).trim();
      if (!str) return false;

      const toEnglishDigits = (val: string) => {
        const bengaliToEnglish: Record<string, string> = {
          '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
          '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
        };
        return val.replace(/[০-৯]/g, (d) => bengaliToEnglish[d] || d);
      };

      const isoYear = now.getFullYear();
      const isoMonth = String(now.getMonth() + 1).padStart(2, '0');
      const isoDay = String(now.getDate()).padStart(2, '0');
      const iso = `${isoYear}-${isoMonth}-${isoDay}`;
      const isoBengali = toBengaliNumber(iso);

      if (str.includes(iso) || str.includes(isoBengali)) {
        return true;
      }

      const normalized = toEnglishDigits(str);
      const targetYear = now.getFullYear();
      const targetMonth = now.getMonth() + 1;
      const targetDay = now.getDate();
      const numbers = normalized.match(/\d+/g);
      if (numbers && numbers.length >= 3) {
        const n0 = parseInt(numbers[0], 10);
        const n1 = parseInt(numbers[1], 10);
        const n2 = parseInt(numbers[2], 10);
        if (n0 === targetYear && n1 === targetMonth && n2 === targetDay) return true;
        if (n0 === targetDay && n1 === targetMonth && n2 === targetYear) return true;
        if (n0 === targetMonth && n1 === targetDay && n2 === targetYear) return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Today's Orders list
  const todayOrders = useMemo(() => {
    return safeOrders.filter((ord) => ord && isTodayOrder(ord.date, ord.created_at));
  }, [safeOrders]);

  // Today's Revenue (Non-cancelled orders)
  const todayRevenue = useMemo(() => {
    return todayOrders.reduce(
      (sum, ord) => sum + (ord && ord.status !== 'cancelled' ? (Number(ord.total) || 0) : 0),
      0
    );
  }, [todayOrders]);

  // Today's Delivered or Shipped Orders
  const todayDeliveredOrders = useMemo(() => {
    return todayOrders.filter(
      (ord) => ord && (ord.status === 'delivered' || ord.status === 'shipped')
    );
  }, [todayOrders]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return safeOrders.filter((ord) => {
      if (!ord) return false;
      const matchStatus =
        orderStatusFilter === 'all' || ord.status === orderStatusFilter;
      const matchDate =
        orderDateFilter === 'all' || isTodayOrder(ord.date, ord.created_at);
      const query = (orderSearch || '').toLowerCase().trim();
      const matchQuery =
        !query ||
        (ord.orderId && String(ord.orderId).toLowerCase().includes(query)) ||
        (ord.customerName && String(ord.customerName).toLowerCase().includes(query)) ||
        (ord.phone && String(ord.phone).includes(query));
      return Boolean(matchStatus && matchDate && matchQuery);
    });
  }, [safeOrders, orderStatusFilter, orderDateFilter, orderSearch]);

  // Calculated Stats
  const totalRevenue = useMemo(() => {
    return safeOrders.reduce((sum, ord) => sum + (ord && ord.status !== 'cancelled' ? (Number(ord.total) || 0) : 0), 0);
  }, [safeOrders]);

  const lowStockBooks = useMemo(() => {
    return safeBooks.filter((b) => b && (Number(b.stock) || 0) <= 5);
  }, [safeBooks]);

  // Handle Export JSON
  const handleExport = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shesher-pata-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('সম্পূর্ণ ডেটাবেজের ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // Handle Bulk Import / Restore JSON
  const [isImportingBooks, setIsImportingBooks] = useState(false);
  const [importSummaryModal, setImportSummaryModal] = useState<{
    isOpen: boolean;
    total: number;
    imported: number;
    updated: number;
    failed: number;
    failedRecords: Array<{ index: number; title: string; reason: string }>;
    message: string;
  } | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingBooks(true);
    showNotice(`${file.name} ফাইলটি আপলোড ও সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা হচ্ছে...`);

    const reader = new FileReader();
    reader.onload = async (loadEvt) => {
      const content = loadEvt.target?.result as string;
      if (!content) {
        setIsImportingBooks(false);
        showNotice('ফাইলটি খালি বা পড়া সম্ভব হয়নি!', 'error');
        e.target.value = '';
        return;
      }

      try {
        const result = await importDataJSON(content);
        setIsImportingBooks(false);
        e.target.value = '';

        if (result.success) {
          setImportSummaryModal({
            isOpen: true,
            total: result.total,
            imported: result.imported,
            updated: result.updated,
            failed: result.failed,
            failedRecords: result.failedRecords || [],
            message: result.message,
          });
          showNotice(result.message, 'success');
        } else {
          showNotice(result.message || 'ইমপোর্ট সম্পন্ন করা সম্ভব হয়নি!', 'error');
        }
      } catch (err: any) {
        setIsImportingBooks(false);
        e.target.value = '';
        showNotice(err.message || 'ইমপোর্ট করার সময় ত্রুটি ঘটেছে!', 'error');
      }
    };

    reader.onerror = () => {
      setIsImportingBooks(false);
      e.target.value = '';
      showNotice('ফাইল পড়তে সমস্যা হয়েছে!', 'error');
    };

    reader.readAsText(file);
  };

  // -------------------------------------------------------------
  // META PIXEL MANAGEMENT
  // -------------------------------------------------------------
  const [pixelInput, setPixelInput] = useState(siteSettings?.meta_pixel_id || '');
  const [isPixelSaving, setIsPixelSaving] = useState(false);

  useEffect(() => {
    if (siteSettings?.meta_pixel_id !== undefined) {
      setPixelInput(siteSettings.meta_pixel_id);
    }
  }, [siteSettings?.meta_pixel_id]);

  const handleSavePixel = async () => {
    const cleanId = pixelInput.trim();
    setIsPixelSaving(true);
    try {
      await updateSiteSettings({ meta_pixel_id: cleanId });
      showNotice('মেটা পিক্সেল আইডি সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err) {
      showNotice('পিক্সেল আইডি সংরক্ষণে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsPixelSaving(false);
    }
  };

  const handleEnablePixel = async () => {
    const cleanId = pixelInput.trim();
    if (!cleanId) {
      showNotice('পিক্সেল চালু করার আগে একটি সঠিক পিক্সেল আইডি প্রদান করুন!', 'error');
      return;
    }
    setIsPixelSaving(true);
    try {
      await updateSiteSettings({
        meta_pixel_id: cleanId,
        meta_pixel_enabled: true,
      });
      showNotice('মেটা পিক্সেল সফলভাবে সক্রিয় (Enabled) করা হয়েছে!');
    } catch (err) {
      showNotice('পিক্সেল চালু করতে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsPixelSaving(false);
    }
  };

  const handleDisablePixel = async () => {
    setIsPixelSaving(true);
    try {
      await updateSiteSettings({
        meta_pixel_enabled: false,
      });
      showNotice('মেটা পিক্সেল সফলভাবে নিষ্ক্রিয় (Disabled) করা হয়েছে!');
    } catch (err) {
      showNotice('পিক্সেল বন্ধ করতে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsPixelSaving(false);
    }
  };

  // -------------------------------------------------------------
  // STORE & CONTACT SETTINGS MANAGEMENT
  // -------------------------------------------------------------
  const [contactForm, setContactForm] = useState({
    phone: siteSettings?.phone || '০১৭০০-০০০০০০',
    alt_phone: siteSettings?.alt_phone || '০১৯০০-০০০০০০',
    email: siteSettings?.email || 'support@shesherpata.com',
    address: siteSettings?.address || 'কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫',
    support_hours: siteSettings?.support_hours || 'প্রতিদিন সকাল ৯টা হতে রাত ১০টা পর্যন্ত',
    announcement_badge: siteSettings?.announcement_badge || 'অফার',
    announcement_text: siteSettings?.announcement_text || 'বইমেলা বিশেষ ছাড় — SHESHER10 কুপনে অতিরিক্ত ১০% ছাড়!',
    about_text: siteSettings?.about_text || '"শেষের পাতা" কেবল একটি অনলাইন বইয়ের দোকান নয়, এটি প্রতিটি বইপ্রেমীর মনের একটি শান্তির আঙিনা। আমরা বিশ্বাস করি একটি ভালো বই একজন মানুষের জীবন বদলে দিতে পারে।',
    facebook_url: siteSettings?.facebook_url || 'https://facebook.com',
    instagram_url: siteSettings?.instagram_url || 'https://instagram.com',
    whatsapp_number: siteSettings?.whatsapp_number || '',
    delivery_charge_inside: siteSettings?.delivery_charge_inside ?? 60,
    delivery_charge_outside: siteSettings?.delivery_charge_outside ?? 120,
    free_delivery_threshold: siteSettings?.free_delivery_threshold ?? 1500,
  });
  const [isContactSaving, setIsContactSaving] = useState(false);

  useEffect(() => {
    if (siteSettings) {
      setContactForm({
        phone: siteSettings.phone || '০১৭০০-০০০০০০',
        alt_phone: siteSettings.alt_phone || '০১৯০০-০০০০০০',
        email: siteSettings.email || 'support@shesherpata.com',
        address: siteSettings.address || 'কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫',
        support_hours: siteSettings.support_hours || 'প্রতিদিন সকাল ৯টা হতে রাত ১০টা পর্যন্ত',
        announcement_badge: siteSettings.announcement_badge || 'অফার',
        announcement_text: siteSettings.announcement_text || 'বইমেলা বিশেষ ছাড় — SHESHER10 কুপনে অতিরিক্ত ১০% ছাড়!',
        about_text: siteSettings.about_text || '"শেষের পাতা" কেবল একটি অনলাইন বইয়ের দোকান নয়, এটি প্রতিটি বইপ্রেমীর মনের একটি শান্তির আঙিনা। আমরা বিশ্বাস করি একটি ভালো বই একজন মানুষের জীবন বদলে দিতে পারে।',
        facebook_url: siteSettings.facebook_url || 'https://facebook.com',
        instagram_url: siteSettings.instagram_url || 'https://instagram.com',
        whatsapp_number: siteSettings.whatsapp_number || '',
        delivery_charge_inside: siteSettings.delivery_charge_inside ?? 60,
        delivery_charge_outside: siteSettings.delivery_charge_outside ?? 120,
        free_delivery_threshold: siteSettings.free_delivery_threshold ?? 1500,
      });
    }
  }, [siteSettings]);

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsContactSaving(true);
    try {
      await updateSiteSettings({
        phone: contactForm.phone.trim(),
        alt_phone: contactForm.alt_phone.trim(),
        email: contactForm.email.trim(),
        address: contactForm.address.trim(),
        support_hours: contactForm.support_hours.trim(),
        announcement_badge: contactForm.announcement_badge.trim(),
        announcement_text: contactForm.announcement_text.trim(),
        about_text: contactForm.about_text.trim(),
        facebook_url: contactForm.facebook_url.trim(),
        instagram_url: contactForm.instagram_url.trim(),
        whatsapp_number: contactForm.whatsapp_number.trim(),
        delivery_charge_inside: Number(contactForm.delivery_charge_inside) || 0,
        delivery_charge_outside: Number(contactForm.delivery_charge_outside) || 0,
        free_delivery_threshold: Number(contactForm.free_delivery_threshold) || 0,
      });
      showNotice('যোগাযোগের ঠিকানা ও স্টোর সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      showNotice(err?.message || 'সেটিংস সংরক্ষণে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsContactSaving(false);
    }
  };

  // -------------------------------------------------------------
  // STEADFAST COURIER INTEGRATION STATE & HANDLERS
  // -------------------------------------------------------------
  const [isSteadfastConnected, setIsSteadfastConnected] = useState(false);
  const [steadfastLastVerifiedAt, setSteadfastLastVerifiedAt] = useState<string | null>(null);
  const [steadfastBalance, setSteadfastBalance] = useState<number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Dispatch to Steadfast Modal State
  const [isSteadfastDispatchModalOpen, setIsSteadfastDispatchModalOpen] = useState(false);
  const [selectedOrderForSteadfast, setSelectedOrderForSteadfast] = useState<OrderDetails | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    invoice: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    cod_amount: 0,
    note: '',
  });
  const [isDispatching, setIsDispatching] = useState(false);
  const [trackingLoadingOrderId, setTrackingLoadingOrderId] = useState<string | null>(null);

  // Fetch Steadfast Status from server
  const fetchSteadfastStatus = async () => {
    try {
      const res = await fetch('/api/admin/steadfast?action=status');
      if (res.ok) {
        const data = await res.json();
        setIsSteadfastConnected(Boolean(data.connected));
        setSteadfastLastVerifiedAt(data.last_verified_at || null);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (activeTab === 'steadfast') {
      fetchSteadfastStatus();
    }
  }, [activeTab]);



  const handleCheckSteadfastBalance = async () => {
    setIsCheckingBalance(true);
    try {
      const res = await fetch('/api/admin/steadfast?action=balance');
      const data = await res.json();
      if (res.ok && data.success) {
        setSteadfastBalance(data.balance);
        showNotice(`স্টেডফাস্ট সফলভাবে কানেক্ট হয়েছে! বর্তমান ব্যালেন্স: ${formatPrice(data.balance)}`);
      } else {
        showNotice(data.error || 'স্টেডফাস্ট সার্ভার রেসপন্স দেয়নি!', 'error');
      }
    } catch {
      showNotice('স্টেডফাস্ট সার্ভারে সংযোগ সম্ভব হয়নি!', 'error');
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleOpenSteadfastModal = (ord: OrderDetails) => {
    if (!isSteadfastConnected) {
      showNotice('স্টেডফাস্টে অর্ডার পাঠানোর আগে সেটিংস থেকে অ্যাকাউন্ট কানেক্ট করুন!', 'error');
      setActiveTab('steadfast');
      return;
    }
    const fullAddress = [ord.address, ord.thana, ord.district].filter(Boolean).join(', ');
    setSelectedOrderForSteadfast(ord);
    setDispatchForm({
      invoice: ord.orderId,
      recipient_name: ord.customerName,
      recipient_phone: ord.phone,
      recipient_address: fullAddress,
      cod_amount: ord.paymentMethod === 'cod' ? ord.total : 0,
      note: ord.orderNotes || `বই: ${(ord.items || []).map((i) => i.book?.title || 'বই').slice(0, 2).join(', ')}`,
    });
    setIsSteadfastDispatchModalOpen(true);
  };

  const handleConfirmSteadfastDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForSteadfast) return;
    setIsDispatching(true);
    try {
      const res = await fetch('/api/admin/steadfast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: dispatchForm.invoice,
          recipient_name: dispatchForm.recipient_name,
          recipient_phone: dispatchForm.recipient_phone,
          recipient_address: dispatchForm.recipient_address,
          cod_amount: Number(dispatchForm.cod_amount) || 0,
          note: dispatchForm.note,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.consignment) {
        const c = data.consignment;
        updateOrder(selectedOrderForSteadfast.orderId, {
          status: 'shipped',
          steadfast_consignment_id: c.consignment_id,
          steadfast_tracking_code: c.tracking_code,
          steadfast_status: c.status || 'in_review',
          steadfast_synced_at: new Date().toISOString(),
        });
        setIsSteadfastDispatchModalOpen(false);
        setSelectedOrderForSteadfast(null);
        showNotice(`অর্ডার #${selectedOrderForSteadfast.orderId} সফলভাবে স্টেডফাস্টে বুক করা হয়েছে! ট্র্যাকিং কোড: ${c.tracking_code}`);
      } else {
        showNotice(data.error || 'স্টেডফাস্টে পার্সেল বুক করতে সমস্যা হয়েছে!', 'error');
      }
    } catch (err: any) {
      showNotice('সার্ভার ত্রুটি: ' + (err?.message || ''), 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleTrackSteadfastOrder = async (ord: OrderDetails) => {
    const code = ord.steadfast_tracking_code || ord.steadfast_consignment_id || ord.orderId;
    if (!code) {
      showNotice('ট্র্যাকিং কোড পাওয়া যায়নি!', 'error');
      return;
    }
    setTrackingLoadingOrderId(ord.orderId);
    try {
      const res = await fetch(`/api/admin/steadfast?action=track&tracking_code=${encodeURIComponent(String(code))}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const deliveryStatus = data.delivery_status;
        let newOrderStatus = ord.status;
        if (deliveryStatus === 'delivered') {
          newOrderStatus = 'delivered';
        } else if (deliveryStatus === 'cancelled') {
          newOrderStatus = 'cancelled';
        }
        updateOrder(ord.orderId, {
          steadfast_status: deliveryStatus,
          status: newOrderStatus,
          steadfast_synced_at: new Date().toISOString(),
        });
        showNotice(`অর্ডার ${ord.orderId} বর্তমান কুরিয়ার স্থিতি: "${deliveryStatus}"`);
      } else {
        showNotice(data.error || 'ট্র্যাকিং আপডেট করা সম্ভব হয়নি!', 'error');
      }
    } catch {
      showNotice('ট্র্যাকিং সার্ভারে সংযোগ সম্ভব হয়নি!', 'error');
    } finally {
      setTrackingLoadingOrderId(null);
    }
  };

  // -------------------------------------------------------------
  // MOUNT GUARD: Prevents hydration mismatch between SSR & Client
  // -------------------------------------------------------------
  if (!isClientMounted) {
    return (
      <div className="min-h-screen bg-[#12110D] text-white flex flex-col justify-center items-center p-4">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-zinc-400 font-['Noto_Sans_Bengali']">
          অ্যাডমিন পোর্টাল লোড হচ্ছে...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LOGIN SCREEN (if not authenticated)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#12110D] text-white flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-zinc-950">
        <div className="w-full max-w-md bg-[#1D1B15] border border-amber-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 font-black shadow-lg">
              <ShieldCheck className="w-8 h-8 text-zinc-950" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-['Noto_Sans_Bengali']">
              শেষের পাতা — অ্যাডমিন পোর্টাল
            </h1>
            <p className="text-xs text-zinc-400">
              সুরক্ষিত নিয়ন্ত্রণ প্যানেলে প্রবেশ করতে আপনার তথ্য দিন
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                অ্যাডমিন ইউজারনেম (Username)
              </label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="ইউজারনেম লিখুন"
                required
                className="w-full px-4 py-2.5 bg-zinc-900/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                পাসওয়ার্ড (Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="গোপন পাসওয়ার্ড"
                  required
                  className="w-full px-4 py-2.5 pr-10 bg-zinc-900/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRemember}
                  onChange={(e) => setIsRemember(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                />
                <span>আমাকে মনে রাখুন</span>
              </label>
              <span className="text-zinc-500 text-[11px]">শেষের পাতা অফিসিয়াল</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer active:scale-98"
            >
              প্রবেশ করুন (Login)
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition-colors"
            >
              <span>ওয়েবসাইটে ফিরে যান</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-zinc-900 flex flex-col selection:bg-amber-400 selection:text-zinc-950 font-['Noto_Sans_Bengali',sans-serif]">
      {/* Admin Notice Bar */}
      {adminNotice && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-bounce ${
            adminNotice.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          {adminNotice.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          )}
          <span className="text-xs sm:text-sm font-bold">{adminNotice.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-[#191712] text-white border-b border-[#312B1F] sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 font-black flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  শেষের পাতা
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                  কন্ট্রোল সেন্টার
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                অ্যাডমিন: <strong className="text-white">seshadmin</strong> (সুপার অ্যাডমিন)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>ওয়েবসাইট দেখুন</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs p-3 space-y-1.5 sticky top-20">
            <div className="p-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              মেনু অপশন
            </div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>ড্যাশবোর্ড ওভারভিউ</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => setActiveTab('books')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'books'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>বই ব্যবস্থাপনা</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold">
                {toBengaliNumber(books.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'banners'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-4 h-4" />
                <span>ব্যানার ব্যবস্থাপনা</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold">
                {toBengaliNumber(banners?.length || 0)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4" />
                <span>কুপন ব্যবস্থাপনা</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold">
                {toBengaliNumber(coupons?.length || 0)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-4 h-4" />
                <span>ক্যাটাগরি</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold">
                {toBengaliNumber(categories.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('publishers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'publishers'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                <span>প্রকাশনী (Prokashoni)</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold">
                {toBengaliNumber(publishers.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('authors')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'authors'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>লেখক অঙ্গন</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold">
                {toBengaliNumber(authors.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>অর্ডার তালিকা</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                {toBengaliNumber(orders.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('steadfast')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'steadfast'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>স্টেডফাস্ট কুরিয়ার</span>
              </div>
              {siteSettings?.steadfast_enabled ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="কানেক্টেড" />
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-bold">API</span>
              )}
            </button>

            <div className="pt-2 border-t border-zinc-100 space-y-1.5">
              <button
                onClick={() => setActiveTab('store_settings')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'store_settings'
                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4" />
                  <span>যোগাযোগ ও সাইট তথ্য</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  <span>সাইট সেটিংস ও পিক্সেল</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('backup_restore')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'backup_restore'
                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-amber-700" />
                  <span>ব্যাকআপ ও রিস্টোর</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  ZIP
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span>মোট বিক্রি (বিক্রিত মূল্য)</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-zinc-900">
                    {formatPrice(totalRevenue)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-zinc-100">
                    <span className="text-zinc-500 font-medium">আজকের বিক্রি:</span>
                    <span className="font-bold text-emerald-700">{formatPrice(todayRevenue)}</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span>মোট অর্ডার</span>
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-zinc-900">
                    {toBengaliNumber(orders.length)} টি
                  </div>
                  <div
                    onClick={() => {
                      setActiveTab('orders');
                      setOrderDateFilter('today');
                    }}
                    className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-zinc-100 cursor-pointer group"
                    title="আজকের অর্ডারগুলো দেখতে ক্লিক করুন"
                  >
                    <span className="text-zinc-500 font-medium group-hover:text-amber-700">আজকের অর্ডার:</span>
                    <span className="font-bold text-amber-700 group-hover:underline">
                      {toBengaliNumber(todayOrders.length)} টি &rarr;
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span>নথিভুক্ত মোট বই</span>
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-zinc-900">
                    {toBengaliNumber(books.length)} টি
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">ক্যাটালগে সক্রিয় বই</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span>স্টক সতর্কতা (&lt; ৫টি)</span>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-600">
                    {toBengaliNumber(lowStockBooks.length)} টি
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">দ্রুত রি-স্টক প্রয়োজন</p>
                </div>
              </div>

              {/* Quick Actions Banner */}
              <div className="p-6 bg-gradient-to-r from-[#1E1B14] to-[#2B2619] rounded-3xl text-white shadow-sm border border-amber-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-zinc-950 text-xs font-black">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>দ্রুত অ্যাকশন</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    নতুন বই বা প্রকাশনী যুক্ত করতে চান?
                  </h3>
                  <p className="text-xs text-zinc-300">
                    ছবি আপলোড ও মূল্য নির্ধারণ করে মুহূর্তে ওয়েবসাইটে লাইভ করুন
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleOpenAddBook}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন বই যোগ করুন</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingCatId(null);
                      setCatForm({
                        name: '',
                        englishName: '',
                        iconName: 'BookOpen',
                        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
                      });
                      setIsCatModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FolderTree className="w-4 h-4" />
                    <span>ক্যাটাগরি তৈরি</span>
                  </button>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900">সাম্প্রতিক অর্ডারসমূহ</h3>
                    <p className="text-xs text-zinc-500">গ্রাহকদের সর্বশেষ দেওয়া অর্ডার</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>সকল অর্ডার দেখুন</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-3">অর্ডার আইডি</th>
                        <th className="py-3 px-3">গ্রাহক</th>
                        <th className="py-3 px-3">ফোন নম্বর</th>
                        <th className="py-3 px-3">মোট মূল্য</th>
                        <th className="py-3 px-3">পেমেন্ট</th>
                        <th className="py-3 px-3">স্থিতি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {orders.slice(0, 5).map((ord) => (
                        <tr key={ord.orderId} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-zinc-900">{ord.orderId}</td>
                          <td className="py-3 px-3 text-zinc-800">{ord.customerName}</td>
                          <td className="py-3 px-3 text-zinc-600">{ord.phone}</td>
                          <td className="py-3 px-3 font-bold text-amber-700">{formatPrice(ord.total)}</td>
                          <td className="py-3 px-3 uppercase text-[10px] font-bold text-zinc-600">
                            {ord.paymentMethod}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                ord.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'shipped'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : ord.status === 'confirmed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ord.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOKS MANAGEMENT */}
          {activeTab === 'books' && (
            <div className="space-y-4">
              {/* Books Header & Controls */}
              <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                      বই তালিকা ও ব্যবস্থাপনা ({toBengaliNumber(filteredBooks.length)} টি বই)
                    </h2>
                    <p className="text-xs text-zinc-500">
                      নতুন বই যোগ করুন, স্টক পরিবর্তন করুন, মূল্য ও ছবি সম্পাদনা করুন
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        showNotice('সেন্ট্রাল ডাটাবেজ থেকে ডাটা রিফ্রেশ হচ্ছে...');
                        const res = await syncBooksWithSupabase();
                        if (res.success) {
                          showNotice(res.message);
                        } else {
                          showNotice(res.message, 'error');
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                      title="সেন্ট্রাল ডাটাবেজ থেকে বইয়ের সর্বশেষ তালিকা রিফ্রেশ করুন"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-600" />
                      <span>ডাটা রিফ্রেশ</span>
                    </button>
                    <label
                      className={`px-3 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                        isImportingBooks ? 'opacity-60 pointer-events-none' : ''
                      }`}
                      title="JSON ফাইল থেকে একসাথে ৫০-১০০+ বই সেন্ট্রাল ডাটাবেজে ইমপোর্ট করুন"
                    >
                      {isImportingBooks ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                      <span>{isImportingBooks ? 'ইমপোর্ট হচ্ছে...' : 'ইমপোর্ট (JSON)'}</span>
                      <input
                        type="file"
                        accept=".json"
                        disabled={isImportingBooks}
                        onChange={handleImport}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleOpenAddBook}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>নতুন বই যোগ করুন</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-100">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      placeholder="বইয়ের নাম, লেখক বা ISBN খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <select
                      value={bookCategoryFilter}
                      onChange={(e) => setBookCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
                    >
                      <option value="all">সকল ক্যাটাগরি</option>
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={bookStockFilter}
                      onChange={(e) => setBookStockFilter(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
                    >
                      <option value="all">সকল স্টক স্থিতি</option>
                      <option value="in">ইন স্টক (১+ কপি)</option>
                      <option value="low">কম স্টক (১ থেকে ৫টি)</option>
                      <option value="out">স্টক শেষ (০টি)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Books Table */}
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F4] text-zinc-700 font-bold uppercase tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-3">বই ও ছবি</th>
                        <th className="py-3 px-3">লেখক ও প্রকাশনী</th>
                        <th className="py-3 px-3">ক্যাটাগরি</th>
                        <th className="py-3 px-3">বিক্রয়মূল্য</th>
                        <th className="py-3 px-3">স্টক</th>
                        <th className="py-3 px-3">ট্যাগ / ব্যাজ</th>
                        <th className="py-3 px-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredBooks.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-zinc-400">
                            কোনো বই পাওয়া যায়নি!
                          </td>
                        </tr>
                      ) : (
                        filteredBooks.map((book) => (
                          <tr key={book.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-15 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0 shadow-2xs flex items-center justify-center">
                                  {book.image || book.cover_image ? (
                                    <img
                                      src={book.image || book.cover_image}
                                      alt={book.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <BookOpen className="w-5 h-5 text-zinc-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-zinc-900 text-sm">
                                    {book.bangla_name || book.title}
                                  </div>
                                  {book.english_name ? (
                                    <div className="text-[11px] font-medium text-amber-800">
                                      EN: {book.english_name}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-zinc-400 italic">
                                      (No EN name set)
                                    </div>
                                  )}
                                  <div className="text-[10px] text-zinc-400">ISBN: {book.isbn || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-zinc-800">{book.author}</div>
                              <div className="text-[11px] text-zinc-500">{book.publisher || 'বাতিঘর'}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-medium">
                                {book.category}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-zinc-900">{formatPrice(book.price)}</div>
                              {book.originalPrice > book.price && (
                                <div className="text-[10px] text-zinc-400 line-through">
                                  {formatPrice(book.originalPrice)} (-{toBengaliNumber(book.discount)}%)
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateBook(book.id, { stock: Math.max(0, (book.stock || 0) - 1) })
                                    }
                                    className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                    title="১ কমান"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={book.stock ?? 0}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      updateBook(book.id, { stock: isNaN(val) ? 0 : Math.max(0, val) });
                                    }}
                                    className={`w-14 text-center py-1 px-1 rounded-lg font-black text-xs border outline-none transition-all ${
                                      (book.stock || 0) === 0
                                        ? 'bg-rose-50 border-rose-300 text-rose-700 focus:ring-1 focus:ring-rose-400'
                                        : (book.stock || 0) <= 5
                                        ? 'bg-amber-50 border-amber-300 text-amber-800 focus:ring-1 focus:ring-amber-400'
                                        : 'bg-emerald-50 border-emerald-300 text-emerald-800 focus:ring-1 focus:ring-emerald-400'
                                    }`}
                                    title="স্টক সংখ্যা পরিবর্তন করতে লিখুন"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateBook(book.id, { stock: (book.stock || 0) + 1 })}
                                    className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                    title="১ বাড়ান"
                                  >
                                    +
                                  </button>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-center inline-block w-fit ${
                                    (book.stock || 0) === 0
                                      ? 'text-rose-700 bg-rose-100/70'
                                      : (book.stock || 0) <= 5
                                      ? 'text-amber-800 bg-amber-100/70'
                                      : 'text-emerald-800 bg-emerald-100/70'
                                  }`}
                                >
                                  {(book.stock || 0) === 0
                                    ? 'স্টক শেষ'
                                    : (book.stock || 0) <= 5
                                    ? 'সীমিত স্টক'
                                    : 'ইন স্টক'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {book.isBestseller && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                    বেস্টসেলার
                                  </span>
                                )}
                                {book.isNew && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    নতুন
                                  </span>
                                )}
                                {book.isFeatured && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                    স্পেশাল
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBook(book)}
                                  className="p-1.5 rounded-lg bg-zinc-100 hover:bg-amber-100 hover:text-amber-900 text-zinc-600 transition-colors cursor-pointer"
                                  title="সম্পাদনা করুন"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`আপনি কি নিশ্চিতভাবে "${book.title}" বইটি ডাটাবেজ এবং সব ব্যবহারকারীর সাইট থেকে মুছে ফেলতে চান?`)) {
                                      try {
                                        showNotice(`"${book.title}" মুছে ফেলা হচ্ছে...`);
                                        await deleteBook(book.id);
                                        showNotice(`"${book.title}" ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে!`);
                                      } catch (err: any) {
                                        showNotice(err.message || 'বইটি মুছতে সমস্যা হয়েছে!', 'error');
                                      }
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-100 hover:text-rose-900 text-zinc-600 transition-colors cursor-pointer"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BANNERS & SLIDERS */}
          {activeTab === 'banners' && (
            <BannerManagementTab onShowNotice={showNotice} />
          )}

          {/* TAB: COUPON MANAGEMENT */}
          {activeTab === 'coupons' && (
            <CouponManagementTab onShowNotice={showNotice} />
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                    ক্যাটাগরি তালিকা ({toBengaliNumber(categories.length)} টি)
                  </h2>
                  <p className="text-xs text-zinc-500">
                    ওয়েবসাইটের বই ক্যাটাগরি এবং ফিল্টার পরিচালনা করুন
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingCatId(null);
                    setCatForm({
                      name: '',
                      englishName: '',
                      iconName: 'BookOpen',
                      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
                    });
                    setIsCatModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন ক্যাটাগরি</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-xs flex items-center justify-between gap-3 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-amber-50 border border-amber-200/80 shrink-0">
                        <img
                          src={cat.imageUrl || (cat as any).image}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 text-sm">{cat.name}</h4>
                        <p className="text-xs text-zinc-400">{cat.englishName}</p>
                        <span className="text-[10px] text-amber-700 font-bold">
                          {toBengaliNumber(
                            books.filter(
                              (b) =>
                                matchesCategory(b.category, b.tags, cat.name, categories) ||
                                (cat.englishName && matchesCategory(b.category, b.tags, cat.englishName, categories)) ||
                                (cat.slug && matchesCategory(b.category, b.tags, cat.slug, categories)) ||
                                (cat.id && matchesCategory(b.category, b.tags, cat.id, categories))
                            ).length || cat.bookCount || 0
                          )} টি বই
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setCatForm({
                            name: cat.name,
                            englishName: cat.englishName,
                            iconName: cat.iconName || 'BookOpen',
                            imageUrl: cat.imageUrl || (cat as any).image || '',
                          });
                          setIsCatModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-zinc-100 hover:bg-amber-100 hover:text-amber-900 text-zinc-600 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`আপনি কি "${cat.name}" ক্যাটাগরিটি মুছে ফেলতে চান?`)) {
                            deleteCategory(cat.id);
                            showNotice(`ক্যাটাগরি "${cat.name}" মুছে ফেলা হয়েছে!`);
                          }
                        }}
                        className="p-2 rounded-xl bg-zinc-100 hover:bg-rose-100 hover:text-rose-900 text-zinc-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PUBLISHERS (PROKASHONI) */}
          {activeTab === 'publishers' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                    প্রকাশনী তালিকা ({toBengaliNumber(publishers.length)} টি প্রকাশনী)
                  </h2>
                  <p className="text-xs text-zinc-500">
                    সকল প্রকাশনা সংস্থা (Prokashoni) পরিচালনা ও নতুন প্রকাশনী যুক্ত করুন
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingPubId(null);
                    setPubForm({
                      name: '',
                      description: '',
                      location: 'ঢাকা',
                      established: '২০১২',
                      logo: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=120&q=80',
                    });
                    setIsPubModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন প্রকাশনী</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publishers.map((pub) => (
                  <div
                    key={pub.id}
                    className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs flex flex-col justify-between gap-4 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-amber-50 border border-amber-200 shrink-0">
                        <img src={pub.logo} alt={pub.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 text-sm">{pub.name}</h4>
                        <p className="text-xs text-zinc-400">
                          {pub.location} • প্রতিষ্ঠা: {pub.established}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                          {pub.description || 'আস্থার নির্ভরযোগ্য প্রকাশনী।'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-amber-700 font-bold">
                        {toBengaliNumber(books.filter((b) => b.publisher === pub.name).length)} টি বই ক্যাটালগে
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPubId(pub.id);
                            setPubForm({
                              name: pub.name,
                              description: pub.description || '',
                              location: pub.location || 'ঢাকা',
                              established: pub.established || '',
                              logo: pub.logo || '',
                            });
                            setIsPubModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-amber-100 hover:text-amber-900 text-zinc-600 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`আপনি কি "${pub.name}" প্রকাশনীটি মুছে ফেলতে চান?`)) {
                              deletePublisher(pub.id);
                              showNotice(`প্রকাশনী "${pub.name}" মুছে ফেলা হয়েছে!`);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-100 hover:text-rose-900 text-zinc-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AUTHORS */}
          {activeTab === 'authors' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                    লেখক তালিকা ({toBengaliNumber(authors.length)} জন লেখক)
                  </h2>
                  <p className="text-xs text-zinc-500">
                    জনপ্রিয় লেখক ও তাঁদের জীবনী, ছবি এবং তথ্যাবলি পরিচালনা করুন
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingAuthId(null);
                    setAuthForm({
                      name: '',
                      era: '',
                      role: 'কথাসাহিত্যিক ও লেখক',
                      bio: '',
                      image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
                    });
                    setIsAuthModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন লেখক</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {authors.map((auth) => (
                  <div
                    key={auth.id}
                    className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs flex flex-col justify-between gap-4 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-amber-50 border border-amber-200 shrink-0 shadow-2xs">
                        <img src={auth.image || (auth as any).image_url} alt={auth.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 text-sm">{auth.name}</h4>
                        <p className="text-[11px] text-zinc-400">{auth.era}</p>
                        <p className="text-xs text-amber-800 font-medium">{auth.role}</p>
                        <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{auth.bio}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-bold">
                        বই: {toBengaliNumber(books.filter((b) => matchesAuthor(b.author, auth.name)).length)} টি
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAuthId(auth.id);
                            setAuthForm({
                              name: auth.name,
                              era: auth.era,
                              role: auth.role,
                              bio: auth.bio,
                              image: auth.image || (auth as any).image_url || '',
                            });
                            setIsAuthModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-amber-100 hover:text-amber-900 text-zinc-600 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`আপনি কি "${auth.name}" লেখককে মুছে ফেলতে চান?`)) {
                              deleteAuthor(auth.id);
                              showNotice(`লেখক "${auth.name}" মুছে ফেলা হয়েছে!`);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-100 hover:text-rose-900 text-zinc-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              {/* Today's Highlight & Sales Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. আজকের অর্ডার (Interactive Filter Card) */}
                <div
                  onClick={() => setOrderDateFilter(orderDateFilter === 'today' ? 'all' : 'today')}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer select-none relative overflow-hidden group ${
                    orderDateFilter === 'today'
                      ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-400 shadow-sm ring-2 ring-amber-400/50'
                      : 'bg-white border-zinc-200 shadow-xs hover:border-amber-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span className="flex items-center gap-1.5 text-zinc-800">
                      <Clock className="w-4 h-4 text-amber-600" />
                      আজকের অর্ডার
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                        orderDateFilter === 'today'
                          ? 'bg-amber-500 text-zinc-950 font-black'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {orderDateFilter === 'today' ? '✓ ফিল্টার সক্রিয়' : 'ফিল্টার করুন'}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                    {toBengaliNumber(todayOrders.length)} <span className="text-sm font-semibold text-zinc-500">টি</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 flex items-center justify-between">
                    <span>আজকে প্রাপ্ত মোট অর্ডার</span>
                    <span className="text-amber-700 font-semibold group-hover:underline">
                      {orderDateFilter === 'today' ? 'সব অর্ডার দেখুন' : 'শুধুমাত্র আজকেরটি'}
                    </span>
                  </p>
                </div>

                {/* 2. আজকের বিক্রয় (Today's Sales) */}
                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span className="flex items-center gap-1.5 text-zinc-800">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      আজকের বিক্রয়
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      আজকের আয়
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                    {formatPrice(todayRevenue)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    আজকের সফল ও সক্রিয় বিক্রয় মূল্য
                  </p>
                </div>

                {/* 3. আজকের ডেলিভারি ও কুরিয়ার */}
                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span className="flex items-center gap-1.5 text-zinc-800">
                      <Truck className="w-4 h-4 text-blue-600" />
                      আজকের প্রেরিত / ডেলিভার্ড
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      কুরিয়ার/ডেলিভারি
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                    {toBengaliNumber(todayDeliveredOrders.length)} <span className="text-sm font-semibold text-zinc-500">টি</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    স্টেডফাস্ট বা নিজস্ব ডেলিভারি সম্পন্ন
                  </p>
                </div>

                {/* 4. সর্বকালীন মোট বিক্রি */}
                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs hover:border-purple-300 transition-all">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span className="flex items-center gap-1.5 text-zinc-800">
                      <ShoppingBag className="w-4 h-4 text-purple-600" />
                      সর্বমোট বিক্রয়
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                      সর্বকালীন
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                    {formatPrice(totalRevenue)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    সর্বমোট {toBengaliNumber(orders.length)} টি অর্ডারের বিক্রয়
                  </p>
                </div>
              </div>

              {/* Order Filter & Management Box */}
              <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-900 flex items-center gap-2">
                      <span>অর্ডার তালিকা</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        {toBengaliNumber(filteredOrders.length)} টি অর্ডার
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      গ্রাহকদের অর্ডার স্থিতি পরিবর্তন করুন, স্টেডফাস্টে বুকিং দিন এবং চালান (Invoice) প্রিন্ট করুন
                    </p>
                  </div>

                  {/* Quick Date Filter Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setOrderDateFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        orderDateFilter === 'all'
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      সব অর্ডার ({toBengaliNumber(orders.length)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateFilter('today')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        orderDateFilter === 'today'
                          ? 'bg-amber-500 text-zinc-950 shadow-xs ring-1 ring-amber-400'
                          : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      আজকের অর্ডার ({toBengaliNumber(todayOrders.length)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        refreshOrders();
                        showNotice('অর্ডার তালিকা রিফ্রেশ করা হয়েছে!');
                      }}
                      disabled={isOrdersLoading}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-zinc-700 hover:text-amber-900 hover:bg-amber-50 border border-zinc-200"
                      title="নতুন অর্ডার যাচাই করতে রিফ্রেশ করুন"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isOrdersLoading ? 'animate-spin' : ''}`} />
                      <span>রিফ্রেশ</span>
                    </button>
                  </div>
                </div>

                {/* Order Filters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-zinc-100">
                  <div className="relative sm:col-span-6">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="অর্ডার আইডি, গ্রাহকের নাম বা ফোন দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={orderDateFilter}
                      onChange={(e) => setOrderDateFilter(e.target.value as 'all' | 'today')}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none cursor-pointer font-medium"
                    >
                      <option value="all">📅 সব সময়ের অর্ডার</option>
                      <option value="today">⚡ শুধুমাত্র আজকের অর্ডার</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none cursor-pointer font-medium"
                    >
                      <option value="all">সকল অর্ডার স্থিতি (Status)</option>
                      <option value="pending">প্রক্রিয়াধীন (Pending)</option>
                      <option value="confirmed">নিশ্চিত (Confirmed)</option>
                      <option value="shipped">কুরিয়ারে হস্তান্তর (Shipped)</option>
                      <option value="delivered">ডেলিভারি সম্পন্ন (Delivered)</option>
                      <option value="cancelled">বাতিল (Cancelled)</option>
                    </select>
                  </div>
                </div>

                {/* Today Filter Active Notice Banner */}
                {orderDateFilter === 'today' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="font-bold">আজকের অর্ডার ফিল্টার সক্রিয়:</span>
                      <span>আজ মোট {toBengaliNumber(todayOrders.length)} টি অর্ডার • আজকের মোট বিক্রয় {formatPrice(todayRevenue)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderDateFilter('all')}
                      className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                    >
                      সব অর্ডার দেখুন
                    </button>
                  </div>
                )}
              </div>

              {/* Order Cards */}
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="bg-white p-10 rounded-3xl border border-zinc-200 text-center space-y-3">
                    <p className="text-zinc-400 text-xs font-medium">
                      {orderDateFilter === 'today'
                        ? 'আজকের কোনো অর্ডার পাওয়া যায়নি!'
                        : 'কোনো অর্ডার পাওয়া যায়নি!'}
                    </p>
                    {orderDateFilter === 'today' && (
                      <button
                        type="button"
                        onClick={() => setOrderDateFilter('all')}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer shadow-xs"
                      >
                        সব অর্ডার দেখুন
                      </button>
                    )}
                  </div>
                ) : (
                  filteredOrders.map((ord) => (
                    <div
                      key={ord.orderId}
                      className="bg-white rounded-3xl border border-zinc-200 shadow-xs p-5 space-y-4 hover:border-amber-300 transition-all"
                    >
                      {/* Top bar of order card */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-zinc-950 text-sm">{ord.orderId}</span>
                          <span className="text-xs text-zinc-400">• {ord.date}</span>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase">
                            {ord.paymentMethod}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-zinc-500 font-semibold">স্থিতি পরিবর্তন:</label>
                          <select
                            value={ord.status}
                            onChange={(e) => {
                              updateOrderStatus(ord.orderId, e.target.value as any);
                              showNotice(`অর্ডার ${ord.orderId} স্থিতি আপডেট করা হয়েছে!`);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                              ord.status === 'delivered'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : ord.status === 'shipped'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                                : ord.status === 'confirmed'
                                ? 'bg-blue-50 border-blue-300 text-blue-900'
                                : ord.status === 'cancelled'
                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}
                          >
                            <option value="pending">অপেক্ষমাণ (Pending)</option>
                            <option value="confirmed">নিশ্চিত (Confirmed)</option>
                            <option value="shipped">কুরিয়ারে (Shipped)</option>
                            <option value="delivered">ডেলিভার্ড (Delivered)</option>
                            <option value="cancelled">বাতিল (Cancelled)</option>
                          </select>

                          {/* Steadfast Courier Action / Status */}
                          {ord.steadfast_tracking_code ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-2xs">
                              <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-mono text-[11px]">{ord.steadfast_tracking_code}</span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-200/80 text-[10px] uppercase font-black text-emerald-950">
                                {ord.steadfast_status || 'বুকড'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTrackSteadfastOrder(ord)}
                                disabled={trackingLoadingOrderId === ord.orderId}
                                className="p-1 hover:bg-emerald-100 rounded text-emerald-800 transition-colors cursor-pointer"
                                title="স্টেডফাস্ট থেকে রিয়েলটাইম ট্র্যাকিং রিফ্রেশ করুন"
                              >
                                <RefreshCw className={`w-3 h-3 ${trackingLoadingOrderId === ord.orderId ? 'animate-spin' : ''}`} />
                              </button>
                              <a
                                href={`https://steadfast.com.bd/tracking?q=${encodeURIComponent(ord.steadfast_tracking_code || '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 hover:bg-emerald-100 rounded text-emerald-800 transition-colors"
                                title="স্টেডফাস্ট কুরিয়ার ওয়েবসাইটে দেখুন"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenSteadfastModal(ord)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                              title="সরাসরি স্টেডফাস্ট কুরিয়ারে পার্সেল বুক করুন"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>স্টেডফাস্টে পাঠান</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForInvoice(ord)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-amber-100 hover:text-amber-900 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="ইনভয়েস বা চালান প্রিন্ট করুন"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>চালান</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`আপনি কি অর্ডার ${ord.orderId} মুছে ফেলতে চান?`)) {
                                deleteOrder(ord.orderId);
                                showNotice(`অর্ডার ${ord.orderId} মুছে ফেলা হয়েছে!`);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-zinc-100 hover:bg-rose-100 hover:text-rose-900 text-zinc-600 transition-colors cursor-pointer"
                            title="অর্ডার মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Customer & Address details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                          <p className="font-bold text-zinc-900 text-sm">{ord.customerName}</p>
                          <p className="text-zinc-600">
                            <strong>ফোন:</strong> {ord.phone}
                          </p>
                          {ord.email && (
                            <p className="text-zinc-600">
                              <strong>ইমেইল:</strong> {ord.email}
                            </p>
                          )}
                          <p className="text-zinc-600">
                            <strong>ঠিকানা:</strong> {ord.address}, {ord.thana}, {ord.district}
                          </p>
                          {ord.orderNotes && (
                            <p className="text-amber-800 bg-amber-50 p-1.5 rounded-lg mt-1 font-medium">
                              নোট: {ord.orderNotes}
                            </p>
                          )}
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          <div className="font-bold text-zinc-700">অর্ডারকৃত বইসমূহ:</div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {ord.items && Array.isArray(ord.items) && ord.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-2 p-1.5 bg-zinc-50 rounded-xl border border-zinc-100"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={item.book?.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&h=560&q=80'}
                                    alt={item.book?.title || 'বই'}
                                    className="w-7 h-9 rounded object-cover border shrink-0"
                                  />
                                  <span className="font-semibold text-zinc-900 truncate">
                                    {item.book?.title || 'বই'}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-zinc-500">
                                    {toBengaliNumber(item.quantity || 1)} × {formatPrice(item.book?.price || 0)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 flex flex-wrap justify-between items-center gap-2 text-xs font-bold border-t border-zinc-100">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">
                                ডেলিভারি ফি: {formatPrice(ord.deliveryFee)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const input = window.prompt(
                                    `অর্ডার ${ord.orderId}-এর নতুন ডেলিভারি ফি (টাকায়) লিখুন:`,
                                    String(ord.deliveryFee ?? 0)
                                  );
                                  if (input !== null && input.trim() !== '') {
                                    const parsed = parseFloat(input.trim());
                                    if (!isNaN(parsed) && parsed >= 0) {
                                      const oldFee = Number(ord.deliveryFee) || 0;
                                      const diff = parsed - oldFee;
                                      const updatedTotal = Math.max(0, (ord.total || 0) + diff);
                                      updateOrder(ord.orderId, {
                                        deliveryFee: parsed,
                                        total: updatedTotal,
                                      });
                                      showNotice(`অর্ডার ${ord.orderId}-এর ডেলিভারি ফি ${formatPrice(parsed)} নির্ধারণ করা হয়েছে!`);
                                    } else {
                                      showNotice('সঠিক সংখ্যা লিখুন (যেমন: ৬০ বা ১২০ বা ০)', 'error');
                                    }
                                  }
                                }}
                                className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="এই অর্ডারের ডেলিভারি ফি পরিবর্তন করুন"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span>চার্জ এডিট</span>
                              </button>
                            </div>
                            <span className="text-sm text-zinc-950">
                              সর্বমোট: <strong className="text-amber-700">{formatPrice(ord.total)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 8: STORE & CONTACT SETTINGS */}
          {activeTab === 'store_settings' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                      <MapPin className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">যোগাযোগের ঠিকানা ও স্টোর সেটিংস</h2>
                      <p className="text-xs text-zinc-500">
                        ওয়েবসাইটের ঠিকানা, হেল্পলাইন নম্বর, ইমেইল, টপবার নোটিশ ও সামাজিক মাধ্যমের লিংক পরিচালনা করুন
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isContactSaving}
                  onClick={handleSaveContactSettings}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-98 disabled:opacity-50 self-start sm:self-auto shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>{isContactSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
                </button>
              </div>

              {/* Live Preview Box */}
              <div className="bg-[#1D1B15] text-white p-5 sm:p-6 rounded-3xl border border-amber-900/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">লাইভ প্রিভিউ (Live Preview)</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">ওয়েবসাইটে যেমন দেখাবে</span>
                </div>

                {/* Topbar Preview */}
                <div className="bg-[#12110D] p-3 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#E5A913] text-zinc-950 font-black px-2 py-0.5 rounded text-[11px] flex items-center gap-1 shrink-0">
                      <Tag className="w-3 h-3" /> {contactForm.announcement_badge || 'অফার'}
                    </span>
                    <span className="text-zinc-300 text-[11px] sm:text-xs">
                      {contactForm.announcement_text || 'কোনো নোটিশ নেই'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                    <Phone className="w-3 h-3 text-[#E5A913]" />
                    <span>{contactForm.phone || '০১৭০০-০০০০০০'}</span>
                  </div>
                </div>

                {/* Footer preview block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#24211A] p-4 rounded-2xl border border-zinc-800/80">
                  <div className="space-y-1">
                    <span className="text-zinc-400 text-[11px] block font-semibold">ঠিকানা:</span>
                    <div className="flex items-start gap-1.5 text-zinc-200">
                      <MapPin className="w-3.5 h-3.5 text-[#E5A913] shrink-0 mt-0.5" />
                      <span>{contactForm.address || 'ঠিকানা সেট করা হয়নি'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400 text-[11px] block font-semibold">যোগাযোগ ও সময়সূচী:</span>
                    <div className="space-y-0.5 text-zinc-200 text-[11px]">
                      <p>📞 {contactForm.phone} {contactForm.alt_phone ? `/ ${contactForm.alt_phone}` : ''}</p>
                      <p>✉️ {contactForm.email}</p>
                      <p className="text-zinc-400">🕒 {contactForm.support_hours}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Cards */}
              <form onSubmit={handleSaveContactSettings} className="space-y-6">
                {/* 1. Address & Location */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <MapPin className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-base text-zinc-900">১. স্টোরের অবস্থান ও পূর্ণ ঠিকানা</h3>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-700">
                      ঠিকানা (Physical Store Address)
                    </label>
                    <textarea
                      rows={2}
                      value={contactForm.address}
                      onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                      placeholder="যেমন: কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all resize-none"
                    />
                    <p className="text-[11px] text-zinc-500">
                      এটি ফুটার, যোগাযোগের পেজ এবং ইনভয়েসে গ্রাহকদের প্রদর্শিত হবে।
                    </p>
                  </div>
                </div>

                {/* 2. Customer Support & Helpline */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <Phone className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-base text-zinc-900">২. কাস্টমার সাপোর্ট ও হেল্পলাইন</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        প্রধান হেল্পলাইন / ফোন নম্বর (Primary Phone)
                      </label>
                      <input
                        type="text"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        placeholder="যেমন: ০১৭০০-০০০০০০"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        বিকল্প ফোন নম্বর (Alternate Phone - ঐচ্ছিক)
                      </label>
                      <input
                        type="text"
                        value={contactForm.alt_phone}
                        onChange={(e) => setContactForm({ ...contactForm, alt_phone: e.target.value })}
                        placeholder="যেমন: ০১৯০০-০০০০০০"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        অফিশিয়াল সাপোর্ট ইমেইল (Support Email)
                      </label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="যেমন: support@shesherpata.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        কাস্টমার কেয়ার সময়সূচী (Operating Hours)
                      </label>
                      <input
                        type="text"
                        value={contactForm.support_hours}
                        onChange={(e) => setContactForm({ ...contactForm, support_hours: e.target.value })}
                        placeholder="যেমন: প্রতিদিন সকাল ৯টা হতে রাত ১০টা পর্যন্ত"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Top Announcement Bar */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <Tag className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-base text-zinc-900">৩. ওয়েবসাইটের শীর্ষ নোটিশ ও ঘোষণা (Top Announcement Bar)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-zinc-700">
                        ঘোষণা ব্যাজ (Badge Text)
                      </label>
                      <input
                        type="text"
                        value={contactForm.announcement_badge}
                        onChange={(e) => setContactForm({ ...contactForm, announcement_badge: e.target.value })}
                        placeholder="যেমন: অফার / বিশেষ ছাড়"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        ঘোষণা বার্তা ও অফার টেক্সট (Notice Message)
                      </label>
                      <input
                        type="text"
                        value={contactForm.announcement_text}
                        onChange={(e) => setContactForm({ ...contactForm, announcement_text: e.target.value })}
                        placeholder="যেমন: বইমেলা বিশেষ ছাড় — SHESHER10 কুপনে অতিরিক্ত ১০% ছাড়!"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. About Us & Store Mission */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-base text-zinc-900">৪. আমাদের সম্পর্কে ও পরিচিতি বার্তা (About Us Message)</h3>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-700">
                      সংক্ষিপ্ত পরিচিতি ও মিশন
                    </label>
                    <textarea
                      rows={3}
                      value={contactForm.about_text}
                      onChange={(e) => setContactForm({ ...contactForm, about_text: e.target.value })}
                      placeholder="যেমন: 'শেষের পাতা' কেবল একটি অনলাইন বইয়ের দোকান নয়, এটি প্রতিটি বইপ্রেমীর মনের একটি শান্তির আঙিনা..."
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all resize-none"
                    />
                    <p className="text-[11px] text-zinc-500">
                      এই বার্তাটি 'আমাদের সম্পর্কে' পেজ এবং ওয়েবসাইটের বিভিন্ন অংশে প্রদর্শিত হয়।
                    </p>
                  </div>
                </div>

                {/* 5. Social Media & Messaging */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <Globe className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-base text-zinc-900">৫. সোশ্যাল মিডিয়া ও মেসেজিং লিংক</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        ফেসবুক পেজ লিংক (Facebook URL)
                      </label>
                      <input
                        type="url"
                        value={contactForm.facebook_url}
                        onChange={(e) => setContactForm({ ...contactForm, facebook_url: e.target.value })}
                        placeholder="https://facebook.com/..."
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        ইনস্টাগ্রাম প্রোফাইল লিংক (Instagram URL)
                      </label>
                      <input
                        type="url"
                        value={contactForm.instagram_url}
                        onChange={(e) => setContactForm({ ...contactForm, instagram_url: e.target.value })}
                        placeholder="https://instagram.com/..."
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        হোয়াটসঅ্যাপ নম্বর (WhatsApp Number)
                      </label>
                      <input
                        type="text"
                        value={contactForm.whatsapp_number}
                        onChange={(e) => setContactForm({ ...contactForm, whatsapp_number: e.target.value })}
                        placeholder="+8801700000000"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Delivery Charges & Free Shipping Policy */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <Truck className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-base text-zinc-900">৬. ডেলিভারি চার্জ ও ফ্রি ডেলিভারি সেটিংস (Delivery Charges & Free Shipping)</h3>
                      <p className="text-[11px] text-zinc-500">
                        ওয়েবসাইটের কার্ট ও চেকআউট ফর্মে ঢাকা ও ঢাকার বাইরের ডেলিভারি চার্জ নির্ধারণ করুন
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        ঢাকা সিটির ভেতরে ডেলিভারি চার্জ (৳)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={contactForm.delivery_charge_inside}
                          onChange={(e) => setContactForm({ ...contactForm, delivery_charge_inside: Number(e.target.value) || 0 })}
                          placeholder="60"
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm font-semibold transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500">ডিফল্ট: ৬০ টাকা</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        ঢাকার বাইরে ডেলিভারি চার্জ (৳)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={contactForm.delivery_charge_outside}
                          onChange={(e) => setContactForm({ ...contactForm, delivery_charge_outside: Number(e.target.value) || 0 })}
                          placeholder="120"
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm font-semibold transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500">ডিফল্ট: ১২০ টাকা</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-700">
                        ফ্রি ডেলিভারি ন্যূনতম অর্ডার মূল্য (৳)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={contactForm.free_delivery_threshold}
                          onChange={(e) => setContactForm({ ...contactForm, free_delivery_threshold: Number(e.target.value) || 0 })}
                          placeholder="1500"
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm font-semibold transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500">এই পরিমাণের বেশি অর্ডারে চার্জ ০ হবে (০ দিলে বন্ধ)</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Save Bar */}
                <div className="p-4 bg-white rounded-2xl border border-zinc-200 flex items-center justify-end gap-3 sticky bottom-4 shadow-lg z-20">
                  <button
                    type="submit"
                    disabled={isContactSaving}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isContactSaving ? 'সংরক্ষণ হচ্ছে...' : 'সকল তথ্য ও সেটিংস সংরক্ষণ করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: STEADFAST COURIER INTEGRATION */}
          {activeTab === 'steadfast' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-zinc-900">স্টেডফাস্ট কুরিয়ার ইন্টিগ্রেশন (Steadfast Courier API)</h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isSteadfastConnected
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {isSteadfastConnected ? '✓ সংযুক্ত / Connected' : 'নিষ্ক্রিয় / Disconnected'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        সরাসরি স্টেডফাস্ট এপিআই যুক্ত করে এক ক্লিকে পার্সেল বুকিং, ট্র্যাকিং কোড জেনারেশন ও ব্যালেন্স চেক করুন
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCheckSteadfastBalance}
                    disabled={isCheckingBalance}
                    className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer transition-colors border border-emerald-200 disabled:opacity-50"
                    title="স্টেডফাস্ট সার্ভারের সাথে সংযোগ যাচাই ও বর্তমান একাউন্ট ব্যালেন্স দেখুন"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                    <span>{isCheckingBalance ? 'যাচাই হচ্ছে...' : 'কানেকশন টেস্ট ও ব্যালেন্স'}</span>
                  </button>


                </div>
              </div>

              {/* Balance Alert Banner if tested */}
              {steadfastBalance !== null && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">স্টেডফাস্ট এপিআই সফলভাবে সংযুক্ত!</div>
                      <div className="text-xs text-emerald-700">আপনার মার্চেন্ট একাউন্টের সাথে এনক্রিপ্টেড সংযোগ সক্রিয় আছে।</div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right bg-white px-4 py-2 rounded-xl border border-emerald-200 shrink-0">
                    <span className="text-[10px] text-zinc-500 font-bold block uppercase">বর্তমান ব্যালেন্স</span>
                    <span className="text-lg font-black text-emerald-800">{formatPrice(steadfastBalance)}</span>
                  </div>
                </div>
              )}

              {/* Statistics Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span>স্টেডফাস্টে পাঠানো অর্ডার</span>
                    <Truck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-zinc-900">
                    {toBengaliNumber(orders.filter((o) => o.steadfast_tracking_code).length)} টি
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">সরাসরি বুকিং সম্পন্ন</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span>কুরিয়ারে চলমান (In Transit)</span>
                    <Package className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-700">
                    {toBengaliNumber(
                      orders.filter((o) => o.steadfast_tracking_code && o.status === 'shipped').length
                    )} টি
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">ডেলিভারির অপেক্ষায় আছে</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs mb-2 font-bold">
                    <span>ডেলিভারি সম্পন্ন (Delivered)</span>
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-indigo-800">
                    {toBengaliNumber(
                      orders.filter((o) => o.steadfast_tracking_code && (o.status === 'delivered' || o.steadfast_status === 'delivered')).length
                    )} টি
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">সফলভাবে গ্রাহকের হাতে পৌঁছেছে</p>
                </div>
              </div>

              {/* API Credentials Card */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-base text-zinc-900">স্টেডফাস্ট এপিআই ক্রেডেনশিয়ালস</h3>
                  </div>
                  {isSteadfastConnected && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>✓ Steadfast Connected</span>
                      </span>
                      {steadfastLastVerifiedAt && (
                        <span className="text-zinc-500 text-[11px]">
                          Last verified: {new Date(steadfastLastVerifiedAt).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 text-sm">কনফিগারেশন মাধ্যম:</span>
                        <span className="font-mono text-xs px-2.5 py-0.5 bg-zinc-200 text-zinc-800 rounded-md font-semibold">
                          সার্ভার এনভায়রনমেন্ট ভেরিয়েবল (.env)
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        নিরাপত্তার স্বার্থে এপিআই কি ও সিক্রেট কি ডাটাবেজ বা ব্রাউজারে সংরক্ষিত হয় না; এগুলো সার্ভার-সাইড এনভায়রনমেন্ট ভেরিয়েবলে সংরক্ষিত থাকে।
                      </p>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={handleCheckSteadfastBalance}
                        disabled={isCheckingBalance}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                        <span>{isCheckingBalance ? 'যাচাই হচ্ছে...' : 'কানেকশন টেস্ট ও ব্যালেন্স রিফ্রেশ'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200/60">
                    <div className="p-3.5 bg-white rounded-xl border border-zinc-200">
                      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Environment Variable 1
                      </div>
                      <div className="font-mono text-xs text-zinc-800 font-semibold flex items-center justify-between">
                        <span>Steadfast API Key</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isSteadfastConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isSteadfastConnected ? 'কনফিগার করা আছে' : 'অনুপস্থিত'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-zinc-200">
                      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Environment Variable 2
                      </div>
                      <div className="font-mono text-xs text-zinc-800 font-semibold flex items-center justify-between">
                        <span>Steadfast Secret Key</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isSteadfastConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isSteadfastConnected ? 'কনফিগার করা আছে' : 'অনুপস্থিত'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guide Box */}
                <div className="p-4 bg-[#FAF8F4] border border-amber-200/80 rounded-2xl text-xs space-y-2">
                  <div className="font-bold text-zinc-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>কীভাবে এপিআই কি কনফিগার করবেন?</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-600 leading-relaxed">
                    <li>
                      <a
                        href="https://steadfast.com.bd/login"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-800 font-bold underline inline-flex items-center gap-1"
                      >
                        <span>স্টেডফাস্ট মার্চেন্ট পোর্টালে (steadfast.com.bd)</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>{' '}
                      লগইন করুন।
                    </li>
                    <li>বাম পাশের মেনু থেকে <strong>Settings &gt; API Details</strong> এ যান।</li>
                    <li>সেখান থেকে <strong>API Key</strong> এবং <strong>Secret Key</strong> সংগ্রহ করুন।</li>
                    <li>
                      আপনার সার্ভারের <code className="font-mono bg-amber-100/70 px-1 py-0.5 rounded text-[11px]">.env.local</code> ফাইলে বা হোস্টিং ড্যাশবোর্ডে{' '}
                      <code className="font-mono bg-amber-100/70 px-1 py-0.5 rounded text-[11px]">API Key</code> ও{' '}
                      <code className="font-mono bg-amber-100/70 px-1 py-0.5 rounded text-[11px]">Secret Key</code> যুক্ত করে সার্ভার রিস্টার্ট করুন।
                    </li>
                  </ol>
                </div>
              </div>

              {/* Steadfast Orders List Table */}
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-zinc-900">স্টেডফাস্টে বুকিংকৃত পার্সেল তালিকা</h3>
                    <p className="text-xs text-zinc-500">যে সকল অর্ডার সরাসরি স্টেডফাস্ট কুরিয়ারে বুক করা হয়েছে</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>সব অর্ডার দেখুন ও নতুন বুক করুন</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F4] text-zinc-700 font-bold uppercase tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="py-3 px-3">অর্ডার আইডি ও তারিখ</th>
                        <th className="py-3 px-3">গ্রাহক ও মোবাইল</th>
                        <th className="py-3 px-3">ঠিকানা</th>
                        <th className="py-3 px-3">COD পরিমাণ</th>
                        <th className="py-3 px-3">স্টেডফাস্ট ট্র্যাকিং</th>
                        <th className="py-3 px-3">কুরিয়ার স্থিতি</th>
                        <th className="py-3 px-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {orders.filter((o) => o.steadfast_tracking_code).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-zinc-400">
                            এখনো কোনো অর্ডার স্টেডফাস্টে পাঠানো হয়নি। &apos;অর্ডার তালিকা&apos; থেকে যে কোনো অর্ডারের পাশে &quot;স্টেডফাস্টে পাঠান&quot; চাপুন।
                          </td>
                        </tr>
                      ) : (
                        orders
                          .filter((o) => o.steadfast_tracking_code)
                          .map((ord) => (
                            <tr key={ord.orderId} className="hover:bg-emerald-50/20 transition-colors">
                              <td className="py-3 px-3">
                                <div className="font-bold text-zinc-900">{ord.orderId}</div>
                                <div className="text-[11px] text-zinc-400">{ord.date}</div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-zinc-800">{ord.customerName}</div>
                                <div className="text-[11px] text-zinc-500 font-mono">{ord.phone}</div>
                              </td>
                              <td className="py-3 px-3 max-w-[200px] truncate" title={`${ord.address}, ${ord.thana}, ${ord.district}`}>
                                {ord.address}, {ord.district}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-zinc-900">{formatPrice(ord.total)}</span>
                                <span className="block text-[10px] text-zinc-400 uppercase font-semibold">
                                  {ord.paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি' : 'পরিশোধিত'}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                  {ord.steadfast_tracking_code}
                                </span>
                                {ord.steadfast_consignment_id && (
                                  <div className="text-[10px] text-zinc-400">CID: #{ord.steadfast_consignment_id}</div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                  {ord.steadfast_status || 'booked'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleTrackSteadfastOrder(ord)}
                                    disabled={trackingLoadingOrderId === ord.orderId}
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                                    title="লাইভ ট্র্যাকিং রিফ্রেশ করুন"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${trackingLoadingOrderId === ord.orderId ? 'animate-spin' : ''}`} />
                                  </button>
                                  <a
                                    href={`https://steadfast.com.bd/tracking?q=${encodeURIComponent(ord.steadfast_tracking_code || '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                                    title="স্টেডফাস্ট পোর্টালে বিস্তারিত ট্র্যাকিং"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS & BACKUP */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">সেটিংস ও ব্যাকআপ (Settings)</h2>
                    <p className="text-xs sm:text-sm text-zinc-500">
                      ওয়েবসাইটের মেটা পিক্সেল ট্র্যাকিং কনফিগারেশন, ডেটা ব্যাকআপ ও সিস্টেম রিস্টোর পরিচালনা করুন
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('backup_restore')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>ব্যাকআপ ও রিস্টোর হাব</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('store_settings')}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>ঠিকানা ও যোগাযোগ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------- */}
              {/* SECTION: SETTINGS -> META PIXEL */}
              {/* --------------------------------------------------------- */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 shadow-xs space-y-6">
                {/* Header & Status Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">সেটিংস → মেটা পিক্সেল (Meta Pixel)</h3>
                    </div>
                    <p className="text-xs text-zinc-500">
                      ফেসবুক ও ইনস্টাগ্রাম বিজ্ঞাপনের জন্য ভিজিটর ট্র্যাকিং ও কনভার্সন অপটিমাইজেশন পরিচালনা করুন
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-3 self-start sm:self-auto bg-zinc-50 px-3.5 py-2 rounded-2xl border border-zinc-200/80">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          siteSettings?.meta_pixel_enabled && siteSettings?.meta_pixel_id
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse'
                            : 'bg-zinc-400'
                        }`}
                      />
                      <span className="text-xs font-semibold text-zinc-700">স্ট্যাটাস:</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        siteSettings?.meta_pixel_enabled && siteSettings?.meta_pixel_id
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {siteSettings?.meta_pixel_enabled && siteSettings?.meta_pixel_id ? 'সক্রিয় (Enabled)' : 'নিষ্ক্রিয় (Disabled)'}
                    </span>
                  </div>
                </div>

                {/* Configuration Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#FAF8F4] rounded-2xl border border-amber-900/10 text-xs">
                  <div>
                    <span className="text-zinc-500 block">বর্তমান পিক্সেল আইডি (Current Pixel ID):</span>
                    <span className="font-mono font-bold text-zinc-900 text-sm">
                      {siteSettings?.meta_pixel_id || 'কোনো পিক্সেল আইডি সংরক্ষিত নেই'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">সর্বশেষ আপডেট (Last Updated):</span>
                    <span className="font-medium text-zinc-800">
                      {siteSettings?.updated_at
                        ? new Date(siteSettings.updated_at).toLocaleString('bn-BD')
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Pixel ID Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-700">
                    মেটা পিক্সেল আইডি (Meta Pixel ID)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pixelInput}
                      onChange={(e) => setPixelInput(e.target.value.replace(/\s+/g, ''))}
                      placeholder="যেমন: 123456789012345"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm transition-all font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    মেটা ইভেন্টস ম্যানেজার (Meta Events Manager) থেকে আপনার পিক্সেল আইডি কপি করে এখানে দিন।
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isPixelSaving}
                    onClick={handleSavePixel}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-98 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isPixelSaving ? 'সংরক্ষণ হচ্ছে...' : 'পিক্সেল সংরক্ষণ করুন (Save Pixel)'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPixelSaving || !pixelInput.trim()}
                    onClick={handleEnablePixel}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-98 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>পিক্সেল চালু করুন (Enable Pixel)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPixelSaving}
                    onClick={handleDisablePixel}
                    className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>পিক্সেল বন্ধ করুন (Disable Pixel)</span>
                  </button>
                </div>

                {/* Automated Events Information */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-xs text-blue-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-blue-950">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>স্বয়ংক্রিয় ইভেন্ট ট্র্যাকিং সক্রিয় রয়েছে (Automatic Event Tracking):</span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 leading-relaxed">
                    পিক্সেল চালু থাকা অবস্থায় ওয়েবসাইটের প্রধান প্রধান কার্যকলাপ স্বয়ংক্রিয়ভাবে মেটা ইভেন্টস ম্যানেজারে পৌঁছাবে:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    <span className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓</span> PageView
                    </span>
                    <span className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓</span> ViewContent
                    </span>
                    <span className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓</span> Search
                    </span>
                    <span className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓</span> AddToCart
                    </span>
                    <span className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓</span> InitiateCheckout
                    </span>
                    <span className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓</span> Purchase
                    </span>
                    <span className="bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓</span> CompleteRegistration
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                      <Download className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">JSON ব্যাকআপ ডাউনলোড</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      বর্তমান সকল বই, ক্যাটাগরি, লেখক, প্রকাশনী এবং গ্রাহকের অর্ডারের একটি সম্পূর্ণ কপি .json ফাইল হিসেবে ডাউনলোড করুন।
                    </p>
                  </div>
                  <button
                    onClick={handleExport}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>ব্যাকআপ ডাউনলোড করুন</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">JSON ব্যাকআপ থেকে রিস্টোর</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      পূর্বে ডাউনলোড করা ব্যাকআপ .json ফাইল আপলোড করে সকল বই ও ডেটা পুনরুদ্ধার করুন।
                    </p>
                  </div>
                  <label className={`w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${isImportingBooks ? 'opacity-60 pointer-events-none' : ''}`}>
                    {isImportingBooks ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isImportingBooks ? 'ডাটাবেজে রিস্টোর হচ্ছে...' : 'ফাইল নির্বাচন ও রিস্টোর'}</span>
                    <input
                      type="file"
                      accept=".json"
                      disabled={isImportingBooks}
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-rose-50/60 p-6 rounded-3xl border border-rose-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3 text-rose-900">
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                  <div>
                    <h3 className="text-base font-bold">ক্যাশ ও সেটিংস রিসেট (Cache Reset & Sync)</h3>
                    <p className="text-xs text-rose-700">
                      এটি ব্রাউজারের লোকাল ক্যাশ পরিষ্কার করে সেন্ট্রাল Supabase ডাটাবেজ থেকে সর্বশেষ লাইভ ডেটা রিফ্রেশ করবে। সেন্ট্রাল ডাটাবেজের লাইভ বই অক্ষত থাকবে।
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'আপনি কি ব্রাউজারের লোকাল ক্যাশ পরিষ্কার করে সেন্ট্রাল ডাটাবেজ থেকে সকল ডেটা রিফ্রেশ করতে চান?'
                      )
                    ) {
                      resetAllData();
                      showNotice('লোকাল ক্যাশ সফলভাবে পরিষ্কার করে সেন্ট্রাল ডাটাবেজ থেকে লাইভ ডেটা সিঙ্ক করা হয়েছে!');
                    }
                  }}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ক্যাশ রিসেট ও লাইভ রিফ্রেশ</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: BACKUP & RESTORE */}
          {activeTab === 'backup_restore' && (
            <BackupRestoreTab
              onSyncComplete={() => {
                syncBooksWithSupabase();
                refreshOrders();
              }}
              showNotice={showNotice}
            />
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT BOOK */}
      {/* ------------------------------------------------------------- */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 my-auto max-h-[95vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-[#FAF8F4]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-zinc-900">
                  {editingBookId ? 'বই সম্পাদনা করুন' : 'নতুন বই যুক্ত করুন'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseBookModal}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Row 1: Bilingual Book Names */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>বইয়ের নাম নির্ধারণ (Bangla & English Titles)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">
                      🇧🇩 বাংলা বইয়ের নাম (Bangla Book Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={bookForm.bangla_name}
                      onChange={(e) =>
                        setBookForm({
                          ...bookForm,
                          bangla_name: e.target.value,
                          title: e.target.value || bookForm.english_name,
                        })
                      }
                      placeholder="যেমন: শেষ বিকেলের গল্প"
                      className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-white focus:border-amber-500 outline-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">বাংলা মোডে এই নামটি প্রদর্শিত হবে</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">
                      🇬🇧 ইংরেজি বইয়ের নাম (English Book Name)
                    </label>
                    <input
                      type="text"
                      value={bookForm.english_name}
                      onChange={(e) =>
                        setBookForm({
                          ...bookForm,
                          english_name: e.target.value,
                          title: bookForm.bangla_name || e.target.value,
                        })
                      }
                      placeholder="e.g. Stories of the Last Evening"
                      className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-white focus:border-amber-500 outline-none font-sans"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">ইংরেজি মোডে এই নামটি প্রদর্শিত হবে</p>
                  </div>
                </div>
              </div>

              {/* Row 2: Author */}
              <SearchableCombobox
                label="লেখকের নাম (Author)"
                required
                value={bookForm.author}
                onChange={(val) => setBookForm({ ...bookForm, author: val })}
                options={authorComboboxOptions}
                placeholder="যেমন: হুমায়ূন আহমেদ / সুনীল গঙ্গোপাধ্যায়"
                emptyText="কোনো লেখক পাওয়া যায়নি (টাইপ করে সরাসরি নতুন নাম ব্যবহার করুন)"
                onAddNewClick={() => {
                  setEditingAuthId(null);
                  setAuthForm({
                    name: '',
                    era: '',
                    role: 'কথাসাহিত্যিক ও লেখক',
                    bio: '',
                    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
                  });
                  setIsAuthModalOpen(true);
                }}
                addNewButtonLabel="নতুন লেখক প্রোফাইল যোগ করুন"
              />

              {/* Row 2: Publisher & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableCombobox
                  label="প্রকাশনী (Publisher / Prokashoni)"
                  value={bookForm.publisher}
                  onChange={(val) => setBookForm({ ...bookForm, publisher: val })}
                  options={publisherComboboxOptions}
                  placeholder="যেমন: বাতিঘর / প্রথমা প্রকাশন"
                  emptyText="কোনো প্রকাশনী পাওয়া যায়নি (টাইপ করে সরাসরি নতুন নাম ব্যবহার করুন)"
                  onAddNewClick={() => {
                    setEditingPubId(null);
                    setPubForm({
                      name: '',
                      description: '',
                      location: 'ঢাকা',
                      established: '২০১২',
                      logo: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=120&q=80',
                    });
                    setIsPubModalOpen(true);
                  }}
                  addNewButtonLabel="নতুন প্রকাশনী প্রোফাইল যোগ করুন"
                />

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ক্যাটাগরি (Category)
                  </label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
                  >
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Pricing & Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    বিক্রয়মূল্য (৳ Selling) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bookForm.price}
                    onChange={(e) =>
                      handlePriceChange(Number(e.target.value), bookForm.originalPrice)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm font-bold bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    গায়ের মূল্য (৳ MRP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bookForm.originalPrice}
                    onChange={(e) =>
                      handlePriceChange(bookForm.price, Number(e.target.value))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ছাড় (% Discount)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bookForm.discount}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, discount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    স্টক সংখ্যা (Stock) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bookForm.stock}
                    onChange={(e) =>
                      setBookForm({ ...bookForm, stock: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm font-bold bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    ০ হলে বই পেজে &quot;স্টক শেষ&quot; দেখাবে এবং গ্রাহক কিনতে পারবেন না
                  </p>
                </div>
              </div>

              {/* Row 4: Image Upload with Preview */}
              <div className="p-4 bg-[#FAF8F4] rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span>বইয়ের কভার ছবি (Image Upload / URL)</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">সরাসরি ফাইল আপলোড বা লিংক দিন</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Preview Box */}
                  <div className="w-20 h-28 rounded-xl overflow-hidden bg-zinc-200 border-2 border-dashed border-amber-300 shrink-0 relative flex items-center justify-center">
                    {bookForm.image ? (
                      <img
                        src={bookForm.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    {/* File Upload Button */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => bookImageInputRef.current?.click()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>কম্পিউটার থেকে ছবি আপলোড করুন</span>
                      </button>
                      {bookForm.image && (
                        <button
                          type="button"
                          onClick={() => {
                            setBookForm((prev) => ({ ...prev, image: '' }));
                            if (bookImageInputRef.current) bookImageInputRef.current.value = '';
                          }}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer border border-rose-200"
                          title="ছবি মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ছবি মুছুন</span>
                        </button>
                      )}
                      <input
                        type="file"
                        ref={bookImageInputRef}
                        accept="image/*"
                        onChange={(e) =>
                          handleFileUpload(e, (url) => setBookForm((prev) => ({ ...prev, image: url })))
                        }
                        className="hidden"
                      />
                    </div>

                    {/* Or URL input */}
                    <div>
                      <input
                        type="text"
                        value={bookForm.image}
                        onChange={(e) => setBookForm({ ...bookForm, image: e.target.value })}
                        placeholder="অথবা ছবির সরাসরি URL লিংক দিন (https://...)"
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 5: ISBN, Pages, Language, Edition */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">ISBN নম্বর</label>
                  <input
                    type="text"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="978-984-..."
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">পৃষ্ঠা সংখ্যা</label>
                  <input
                    type="number"
                    value={bookForm.pages}
                    onChange={(e) => setBookForm({ ...bookForm, pages: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">সংস্করণ</label>
                  <input
                    type="text"
                    value={bookForm.edition}
                    onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                    placeholder="১ম সংস্করণ"
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">ভাষা</label>
                  <input
                    type="text"
                    value={bookForm.language}
                    onChange={(e) => setBookForm({ ...bookForm, language: e.target.value })}
                    placeholder="বাংলা"
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 6: Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  বইয়ের সংক্ষিপ্ত বিবরণ (Description)
                </label>
                <textarea
                  rows={3}
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  placeholder="বইটির বিষয়বস্তু, সারসংক্ষেপ ও পাঠকদের জন্য আকর্ষণীয় বর্ণনা..."
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none resize-none"
                />
              </div>

              {/* Row 7: Tags & Badges */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  ট্যাগসমূহ (কমা দিয়ে আলাদা করুন)
                </label>
                <input
                  type="text"
                  value={bookForm.tags}
                  onChange={(e) => setBookForm({ ...bookForm, tags: e.target.value })}
                  placeholder="উপন্যাস, রোমাঞ্চ, বেস্টসেলার"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookForm.isBestseller}
                    onChange={(e) => setBookForm({ ...bookForm, isBestseller: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span className="font-bold text-zinc-800">বেস্টসেলার বই (Bestseller)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookForm.isNew}
                    onChange={(e) => setBookForm({ ...bookForm, isNew: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span className="font-bold text-zinc-800">নতুন প্রকাশনা (New Release)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookForm.isFeatured}
                    onChange={(e) => setBookForm({ ...bookForm, isFeatured: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span className="font-bold text-zinc-800">ফিচার্ড / হোমপেজ সংগ্রহ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookForm.isInternational}
                    onChange={(e) => setBookForm({ ...bookForm, isInternational: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span className="font-bold text-zinc-800">আন্তর্জাতিক / অনুবাদ গ্রন্থ</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseBookModal}
                  className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingBook}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSavingBook
                      ? 'সংরক্ষণ হচ্ছে...'
                      : editingBookId
                      ? 'পরিবর্তন সংরক্ষণ করুন'
                      : 'বই আপলোড সম্পন্ন করুন'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADD / EDIT CATEGORY */}
      {/* ------------------------------------------------------------- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-base text-zinc-900">
                {editingCatId ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি যুক্ত করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  ক্যাটাগরির বাংলা নাম *
                </label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="যেমন: সমকালীন উপন্যাস"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  ইংরেজি নাম / স্লাগ (English Name)
                </label>
                <input
                  type="text"
                  value={catForm.englishName}
                  onChange={(e) => setCatForm({ ...catForm, englishName: e.target.value })}
                  placeholder="যেমন: Contemporary Novel"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">কভার ছবি</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={catForm.imageUrl}
                    onChange={(e) => setCatForm({ ...catForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    disabled={isUploadingCatImage || isSavingCat}
                    onClick={() => catImageInputRef.current?.click()}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {isUploadingCatImage ? 'আপলোড হচ্ছে...' : 'ফাইল'}
                  </button>
                  <input
                    type="file"
                    ref={catImageInputRef}
                    accept="image/*"
                    disabled={isUploadingCatImage || isSavingCat}
                    onChange={(e) =>
                      handleFileUpload(
                        e,
                        (url) => setCatForm((prev) => ({ ...prev, imageUrl: url, image: url })),
                        'book-covers',
                        {
                          folder: `category-images/${editingCatId || 'new'}`,
                          recordId: editingCatId || 'new',
                          type: 'category',
                          setLoading: setIsUploadingCatImage,
                        }
                      )
                    }
                    className="hidden"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isUploadingCatImage || isSavingCat}
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUploadingCatImage || isSavingCat}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  {isSavingCat ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: ADD / EDIT PUBLISHER */}
      {/* ------------------------------------------------------------- */}
      {isPubModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-base text-zinc-900">
                {editingPubId ? 'প্রকাশনী সম্পাদনা' : 'নতুন প্রকাশনী (Prokashoni) যোগ করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPubModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePublisher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  প্রকাশনীর নাম *
                </label>
                <input
                  type="text"
                  required
                  value={pubForm.name}
                  onChange={(e) => setPubForm({ ...pubForm, name: e.target.value })}
                  placeholder="যেমন: বাতিঘর, প্রথমা, অনন্যা"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">অবস্থান</label>
                  <input
                    type="text"
                    value={pubForm.location}
                    onChange={(e) => setPubForm({ ...pubForm, location: e.target.value })}
                    placeholder="ঢাকা"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">প্রতিষ্ঠা সাল</label>
                  <input
                    type="text"
                    value={pubForm.established}
                    onChange={(e) => setPubForm({ ...pubForm, established: e.target.value })}
                    placeholder="২০০৫"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">সংক্ষিপ্ত বিবরণ</label>
                <textarea
                  rows={2}
                  value={pubForm.description}
                  onChange={(e) => setPubForm({ ...pubForm, description: e.target.value })}
                  placeholder="প্রকাশনীর বিশেষত্ব ও পরিচিতি..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">লোগো / ছবি</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={pubForm.logo}
                    onChange={(e) => setPubForm({ ...pubForm, logo: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => pubImageInputRef.current?.click()}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    ফাইল
                  </button>
                  <input
                    type="file"
                    ref={pubImageInputRef}
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(e, (url) => setPubForm((prev) => ({ ...prev, logo: url })))
                    }
                    className="hidden"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPubModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: ADD / EDIT AUTHOR */}
      {/* ------------------------------------------------------------- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-base text-zinc-900">
                {editingAuthId ? 'লেখক সম্পাদনা' : 'নতুন লেখক যুক্ত করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAuthor} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">লেখকের নাম *</label>
                <input
                  type="text"
                  required
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  placeholder="যেমন: হুমায়ূন আহমেদ"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">জীবৎকাল / সাল</label>
                  <input
                    type="text"
                    value={authForm.era}
                    onChange={(e) => setAuthForm({ ...authForm, era: e.target.value })}
                    placeholder="১৯৪৮ – ২০১২"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">উপাধি / পরিচয়</label>
                  <input
                    type="text"
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                    placeholder="কথাসাহিত্যিক"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">সংক্ষিপ্ত জীবনী</label>
                <textarea
                  rows={3}
                  value={authForm.bio}
                  onChange={(e) => setAuthForm({ ...authForm, bio: e.target.value })}
                  placeholder="লেখকের সাহিত্যকর্ম ও অবদান সম্পর্কিত তথ্য..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">লেখকের ছবি</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={authForm.image}
                    onChange={(e) => setAuthForm({ ...authForm, image: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    disabled={isUploadingAuthImage || isSavingAuth}
                    onClick={() => authImageInputRef.current?.click()}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {isUploadingAuthImage ? 'আপলোড হচ্ছে...' : 'ফাইল'}
                  </button>
                  <input
                    type="file"
                    ref={authImageInputRef}
                    accept="image/*"
                    disabled={isUploadingAuthImage || isSavingAuth}
                    onChange={(e) =>
                      handleFileUpload(
                        e,
                        (url) => setAuthForm((prev) => ({ ...prev, image: url })),
                        'book-covers',
                        {
                          folder: `author-images/${editingAuthId || 'new'}`,
                          recordId: editingAuthId || 'new',
                          type: 'author',
                          setLoading: setIsUploadingAuthImage,
                        }
                      )
                    }
                    className="hidden"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isUploadingAuthImage || isSavingAuth}
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUploadingAuthImage || isSavingAuth}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  {isSavingAuth ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: PRINTABLE INVOICE / SLIP */}
      {/* ------------------------------------------------------------- */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:w-full print:max-w-none">
            {/* Header with Print & Close controls */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-zinc-900">ডেলিভারি চালান / ইনভয়েস</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForInvoice(null)}
                  className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Slip Content */}
            <div className="space-y-4 text-zinc-900">
              <div className="flex justify-between items-start border-b border-zinc-200 pb-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight">শেষের পাতা</h2>
                  <p className="text-xs text-zinc-500">কাঁটাবন বইয়ের মার্কেট, ঢাকা-১২০৫</p>
                  <p className="text-xs text-zinc-500">ফোন: +৮৮০ ১৭০০-০০০০০০</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-amber-700">
                    {selectedOrderForInvoice.orderId}
                  </div>
                  <div className="text-xs text-zinc-500">তারিখ: {selectedOrderForInvoice.date}</div>
                  <div className="text-xs font-bold uppercase text-zinc-700 mt-1">
                    পেমেন্ট: {selectedOrderForInvoice.paymentMethod}
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1">
                <div className="font-bold text-zinc-900 text-sm">
                  প্রাপক: {selectedOrderForInvoice.customerName}
                </div>
                <div>মোবাইল: {selectedOrderForInvoice.phone}</div>
                <div>
                  ঠিকানা: {selectedOrderForInvoice.address}, {selectedOrderForInvoice.thana},{' '}
                  {selectedOrderForInvoice.district}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border border-zinc-200">
                <thead className="bg-zinc-100 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-2">বইয়ের বিবরণ</th>
                    <th className="p-2 text-center">পরিমাণ</th>
                    <th className="p-2 text-right">মূল্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {selectedOrderForInvoice.items && Array.isArray(selectedOrderForInvoice.items) && selectedOrderForInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <div className="font-bold text-zinc-900">{it.book?.title || 'বই'}</div>
                        <div className="text-[10px] text-zinc-500">{it.book?.author || ''}</div>
                      </td>
                      <td className="p-2 text-center">{toBengaliNumber(it.quantity || 1)}</td>
                      <td className="p-2 text-right font-semibold">
                        {formatPrice((it.book?.price || 0) * (it.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="text-xs space-y-1 text-right pt-2 border-t border-zinc-200">
                <div>সাবটোটাল: {formatPrice(selectedOrderForInvoice.subtotal)}</div>
                {selectedOrderForInvoice.discountAmount > 0 && (
                  <div className="text-emerald-700 font-semibold">
                    ডিসকাউন্ট: -{formatPrice(selectedOrderForInvoice.discountAmount)}
                  </div>
                )}
                <div>ডেলিভারি চার্জ: {formatPrice(selectedOrderForInvoice.deliveryFee)}</div>
                <div className="text-sm font-black text-zinc-950 pt-1 border-t border-zinc-200">
                  সর্বমোট প্রদেয়: {formatPrice(selectedOrderForInvoice.total)}
                </div>
              </div>

              <div className="text-center pt-4 text-[11px] text-zinc-400 border-t border-zinc-100">
                ধন্যবাদ শেষের পাতা থেকে বই কেনার জন্য!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEADFAST COURIER DISPATCH MODAL */}
      {isSteadfastDispatchModalOpen && selectedOrderForSteadfast && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">স্টেডফাস্ট কুরিয়ারে বুকিং</h3>
                  <p className="text-xs text-emerald-100">অর্ডার #{selectedOrderForSteadfast.orderId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSteadfastDispatchModalOpen(false);
                  setSelectedOrderForSteadfast(null);
                }}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmSteadfastDispatch} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">ইনভয়েস / রেফারেন্স ID</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.invoice}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, invoice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold bg-zinc-50 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">ক্যাশ অন ডেলিভারি (COD ৳)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={dispatchForm.cod_amount}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, cod_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold bg-zinc-50 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">প্রাপকের নাম *</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.recipient_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, recipient_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold bg-zinc-50 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">মোবাইল নম্বর (১১ ডিজিট) *</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.recipient_phone}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, recipient_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold bg-zinc-50 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">পূর্ণাঙ্গ ডেলিভারি ঠিকানা *</label>
                <textarea
                  rows={2}
                  required
                  value={dispatchForm.recipient_address}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, recipient_address: e.target.value })}
                  placeholder="বাড়ি/রোড, থানা, জেলা..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium bg-zinc-50 outline-none focus:bg-white focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">ডেলিভারি নোট / পণ্যের বিবরণ</label>
                <input
                  type="text"
                  value={dispatchForm.note}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, note: e.target.value })}
                  placeholder="যেমন: বই ডেলিভারি — সাবধানে হ্যান্ডেল করুন"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {/* Order Items Preview */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="font-bold text-zinc-700 block mb-1">অর্ডারকৃত বইসমূহ:</span>
                <p className="text-zinc-600 truncate">
                  {selectedOrderForSteadfast.items && Array.isArray(selectedOrderForSteadfast.items)
                    ? selectedOrderForSteadfast.items.map((it) => `${it.book?.title || 'বই'} (${it.quantity || 1}টি)`).join(', ')
                    : 'কোনো বই নেই'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSteadfastDispatchModalOpen(false);
                    setSelectedOrderForSteadfast(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 font-bold text-zinc-700 transition-colors cursor-pointer"
                >
                  বাতিল
                </button>

                <button
                  type="submit"
                  disabled={isDispatching}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-pulse' : ''}`} />
                  <span>{isDispatching ? 'স্টেডফাস্টে পাঠানো হচ্ছে...' : 'নিশ্চিত করুন ও বুক করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT SUMMARY MODAL */}
      {importSummaryModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">ইমপোর্ট ফলাফল সারসংক্ষেপ</h3>
                  <p className="text-xs text-zinc-500">সেন্ট্রাল ডাটাবেজ আপডেট সম্পন্ন হয়েছে</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportSummaryModal(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 text-center">
                <span className="text-[11px] font-semibold text-zinc-500 block">মোট রেকর্ড</span>
                <span className="text-lg font-bold text-zinc-900">{toBengaliNumber(importSummaryModal.total)}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-center">
                <span className="text-[11px] font-semibold text-emerald-700 block">নতুন যুক্ত</span>
                <span className="text-lg font-bold text-emerald-700">{toBengaliNumber(importSummaryModal.imported)}</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200/80 text-center">
                <span className="text-[11px] font-semibold text-blue-700 block">আপডেট</span>
                <span className="text-lg font-bold text-blue-700">{toBengaliNumber(importSummaryModal.updated)}</span>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${importSummaryModal.failed > 0 ? 'bg-rose-50 border-rose-200/80' : 'bg-zinc-50 border-zinc-200/80'}`}>
                <span className={`text-[11px] font-semibold block ${importSummaryModal.failed > 0 ? 'text-rose-700' : 'text-zinc-500'}`}>ব্যর্থ</span>
                <span className={`text-lg font-bold ${importSummaryModal.failed > 0 ? 'text-rose-700' : 'text-zinc-900'}`}>{toBengaliNumber(importSummaryModal.failed)}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 leading-relaxed">
              {importSummaryModal.message}
            </p>

            {importSummaryModal.failedRecords && importSummaryModal.failedRecords.length > 0 && (
              <div className="space-y-1.5 flex-1 overflow-hidden flex flex-col">
                <span className="text-xs font-bold text-rose-800">ব্যর্থ রেকর্ডের বিবরণ:</span>
                <div className="overflow-y-auto max-h-40 divide-y divide-rose-100 bg-rose-50/40 p-2.5 rounded-xl border border-rose-200 text-xs">
                  {importSummaryModal.failedRecords.map((item, idx) => (
                    <div key={idx} className="py-1 text-zinc-700 flex justify-between gap-2">
                      <span className="font-semibold text-rose-900 truncate">#{item.index} {item.title}</span>
                      <span className="text-rose-600 shrink-0">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setImportSummaryModal(null)}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin Panel Exception caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#12110D] text-white flex flex-col items-center justify-center p-6 text-center font-['Noto_Sans_Bengali',sans-serif]">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">অ্যাডমিন পোর্টাল লোড করতে সমস্যা হয়েছে</h2>
          <p className="text-xs text-zinc-400 max-w-md mb-6">
            {this.state.error?.message || 'ব্রাউজারের ক্যাশ বা ডেটাবেজ অমিলের কারণে একটি সমস্যা ঘটেছে।'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('shesher_pata_orders_v1');
                  localStorage.removeItem('shesher_pata_books_v1');
                  window.location.reload();
                }
              }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              ক্যাশ ক্লিয়ার করে পুনরায় চালু করুন
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors"
            >
              হোমপেজে ফিরে যান
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <AdminDashboardContent />
    </AdminErrorBoundary>
  );
}
