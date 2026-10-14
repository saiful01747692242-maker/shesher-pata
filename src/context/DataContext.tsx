'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Book, Banner, Category, Author, Publisher, OrderDetails, SiteSettings, Coupon } from '../types';
import { BOOKS as INITIAL_BOOKS } from '../data/books';
import { CATEGORIES as INITIAL_CATEGORIES } from '../data/categories';
import { INITIAL_BANNERS } from '../data/banners';
import { settingsService, DEFAULT_SETTINGS } from '../services/settingsService';
import { bookService, BOOKS_CHANGED_EVENT, BulkImportResult } from '../services/bookService';
import { categoryService } from '../services/categoryService';
import { authorService } from '../services/authorService';
import { publisherService } from '../services/publisherService';
import { bannerService } from '../services/bannerService';
import { couponService } from '../services/couponService';
import { orderService } from '../services/orderService';
import { normalizeBengali, matchesCategory, getCategoryDisplayName } from '../utils/filterUtils';

const INITIAL_AUTHORS: Author[] = [
  {
    id: 'author-humayun',
    name: 'হুমায়ূন আহমেদ',
    era: '১৯৪৮ – ২০১২',
    role: 'কথাসাহিত্যিক, নাট্যকার ও চলচ্চিত্র নির্মাতা',
    bio: 'আধুনিক বাংলা সাহিত্যের সবচেয়ে জনপ্রিয় কথাসাহিত্যিক। মিসির আলি, হিমু ও শুভ্র চরিত্রের স্রষ্টা।',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
    bookCount: 45,
  },
  {
    id: 'author-rabindranath',
    name: 'রবীন্দ্রনাথ ঠাকুর',
    era: '১৮৬১ – ১৯৪১',
    role: 'বিশ্বকবি, নোবেল বিজয়ী সাহিত্যিক',
    bio: 'বাংলা ভাষা ও সাহিত্যের রূপকার। গীতাঞ্জলি কাব্যের জন্য ১৯১৩ সালে এশিয়ার প্রথম নোবেল পুরস্কার লাভ করেন।',
    image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80',
    bookCount: 38,
  },
  {
    id: 'author-nazrul',
    name: 'কাজী নজরুল ইসলাম',
    era: '১৮৯৯ – ১৯৭৬',
    role: 'জাতীয় কবি, বিদ্রোহী কবি ও সুরস্রষ্টা',
    bio: 'বাংলা সাহিত্যের অন্যতম শ্রেষ্ঠ কবি, দ্রোহ, সাম্য ও প্রেমের অবিসংবাদিত কণ্ঠস্বর।',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    bookCount: 29,
  },
  {
    id: 'author-satyajit',
    name: 'সত্যজিৎ রায়',
    era: '১৯২১ – ১৯৯২',
    role: 'চলচ্চিত্রকার, লেখক ও চিত্রশিল্পী',
    bio: 'অস্কারজয়ী চলচ্চিত্রকার এবং বাংলা সাহিত্যের জনপ্রিয় গোয়েন্দা চরিত্র ফেলুদা ও প্রফেসর শঙ্কুর অমর স্রষ্টা।',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    bookCount: 22,
  },
  {
    id: 'author-sunil',
    name: 'সুনীল গঙ্গোপাধ্যায়',
    era: '১৯৩৪ – ২০১২',
    role: 'কবি, ঔপন্যাসিক ও ছোটগল্পকার',
    bio: 'নীললোহিত ছদ্মনামে খ্যাত। সেই সময়, প্রথম আলো, পূর্ব-পশ্চিম এবং কাকাবাবু সিরিজের অমর স্রষ্টা।',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bookCount: 34,
  },
  {
    id: 'author-sharat',
    name: 'শরৎচন্দ্র চট্টোপাধ্যায়',
    era: '১৮৭৬ – ১৯৩৮',
    role: 'অপরাজেয় কথাশিল্পী',
    bio: 'বাঙালি সমাজজীবনের নিখুঁত রূপকার। দেবদাস, চরিত্রহীন, শ্রীকান্ত এবং পল্লীসমাজ উপন্যাসের অমর লেখক।',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bookCount: 26,
  },
  {
    id: 'author-zafar',
    name: 'মুহম্মদ জাফর ইকবাল',
    era: '১৯৫২ – বর্তমান',
    role: 'বিজ্ঞান কল্পকাহিনী লেখক ও শিক্ষাবিদ',
    bio: 'জনপ্রিয় বিজ্ঞান কল্পকাহিনী, কিশোর সাহিত্য ও গণিত অলিম্পিয়াডের স্বপ্নদ্রষ্টা।',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bookCount: 18,
  },
];

const INITIAL_PUBLISHERS: Publisher[] = [
  {
    id: 'pub-batighar',
    name: 'বাতিঘর',
    description: 'রুচিশীল প্রকাশনা ও বিশ্বমানের অনুবাদ সাহিত্যের পথিকৃৎ।',
    location: 'ঢাকা ও চট্টগ্রাম',
    established: '২০০৫',
    logo: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=120&q=80',
    bookCount: 42,
  },
  {
    id: 'pub-prothoma',
    name: 'প্রথমা প্রকাশন',
    description: 'মননশীল সাহিত্য, ইতিহাস ও গবেষণাভিত্তিক আস্থার প্রকাশনা সংস্থা।',
    location: 'কারওয়ান বাজার, ঢাকা',
    established: '২০০৮',
    logo: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=120&q=80',
    bookCount: 35,
  },
  {
    id: 'pub-anyaprokash',
    name: 'অন্যপ্রকাশ',
    description: 'হুমায়ূন আহমেদ সহ শীর্ষস্থানীয় লেখকদের প্রিয় প্রকাশনা প্রতিষ্ঠান।',
    location: 'বাংলাবাজার, ঢাকা',
    established: '১৯৯৭',
    logo: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=120&q=80',
    bookCount: 50,
  },
  {
    id: 'pub-ananya',
    name: 'অনন্যা প্রকাশনী',
    description: 'বাংলা সাহিত্যের জনপ্রিয় কথাসাহিত্য ও সমকালীন শ্রেষ্ঠ উপন্যাসের প্রকাশক।',
    location: 'ঢাকা',
    established: '১৯৮২',
    logo: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=120&q=80',
    bookCount: 28,
  },
  {
    id: 'pub-somoy',
    name: 'সময় প্রকাশন',
    description: 'মুক্তিযুদ্ধ, ইতিহাস এবং সমকালীন বাংলা সাহিত্যের সমৃদ্ধ সম্ভার।',
    location: 'বাংলাবাজার, ঢাকা',
    established: '১৯৮৮',
    logo: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=120&q=80',
    bookCount: 24,
  },
  {
    id: 'pub-oitijjhya',
    name: 'ঐতিহ্য',
    description: 'রবীন্দ্র রচনাবলি, নজরুল রচনাবলি সহ ক্লাসিক সাহিত্যের রাজকীয় সংকলক।',
    location: 'কাঁটাবন, ঢাকা',
    established: '২০০০',
    logo: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=120&q=80',
    bookCount: 31,
  },
];

const INITIAL_ORDERS: OrderDetails[] = [
  {
    orderId: 'SP-2026-89421',
    date: '২০২৬-০৩-১৪',
    customerName: 'তানভীর আহমেদ',
    phone: '01711223344',
    email: 'tanvir.ahmed@example.com',
    address: 'বাড়ি নং ১২, রোড ৫, ধানমন্ডি',
    district: 'ঢাকা',
    thana: 'ধানমন্ডি',
    postalCode: '1209',
    deliveryOption: 'inside_dhaka',
    deliveryFee: 60,
    paymentMethod: 'cod',
    items: [
      { book: INITIAL_BOOKS[0], quantity: 1 },
      { book: INITIAL_BOOKS[1], quantity: 1 },
    ],
    subtotal: 990,
    discountAmount: 100,
    couponCode: 'SHESHER10',
    total: 950,
    status: 'shipped',
    orderNotes: 'বিকেলের দিকে ডেলিভারি দিলে ভালো হয়।',
  },
  {
    orderId: 'SP-2026-73190',
    date: '২০২৬-০৩-১৫',
    customerName: 'নুসরাত জাহান',
    phone: '01899887766',
    email: 'nusrat.j@example.com',
    address: 'হিলভিউ আবাসিক এলাকা, জিইসি মোড়',
    district: 'চট্টগ্রাম',
    thana: 'পাঁচলাইশ',
    postalCode: '4000',
    deliveryOption: 'outside_dhaka',
    deliveryFee: 120,
    paymentMethod: 'bkash',
    items: [
      { book: INITIAL_BOOKS[2] || INITIAL_BOOKS[0], quantity: 2 },
    ],
    subtotal: 840,
    discountAmount: 0,
    total: 960,
    status: 'pending',
    orderNotes: 'বিকাশ ট্রানজ্যাকশন আইডি: 9K8X7L2M',
  },
  {
    orderId: 'SP-2026-95810',
    date: '২০২৬-০৩-১৬',
    customerName: 'রাকিবুল হাসান',
    phone: '01755667788',
    email: 'rakibul@example.com',
    address: 'বাড়ি ৭, রোড ৪, উত্তরা সেক্টর ৩',
    district: 'ঢাকা',
    thana: 'উত্তরা',
    postalCode: '1230',
    deliveryOption: 'inside_dhaka',
    deliveryFee: 60,
    paymentMethod: 'cod',
    items: [
      { book: INITIAL_BOOKS[0], quantity: 1 },
      { book: INITIAL_BOOKS[1] || INITIAL_BOOKS[0], quantity: 1 },
    ],
    subtotal: 990,
    discountAmount: 50,
    couponCode: 'SHESHER10',
    total: 1000,
    status: 'confirmed',
    orderNotes: 'আজকের জরুরি ডেলিভারি প্রয়োজন।',
  },
];

interface DataContextType {
  books: Book[];
  banners: Banner[];
  coupons: Coupon[];
  categories: Category[];
  authors: Author[];
  publishers: Publisher[];
  orders: OrderDetails[];
  
  // Book Actions
  isBooksLoading: boolean;
  addBook: (book: Omit<Book, 'id'> & { id?: string }) => Promise<Book>;
  updateBook: (id: string, updated: Partial<Book>) => Promise<Book>;
  deleteBook: (id: string) => Promise<boolean>;
  syncBooksWithSupabase: () => Promise<{ success: boolean; count?: number; message: string }>;

  // Banner Actions
  addBanner: (banner: Partial<Banner>) => Promise<Banner>;
  updateBanner: (id: string, updated: Partial<Banner>) => Promise<Banner>;
  deleteBanner: (id: string) => Promise<boolean>;
  duplicateBanner: (banner: Banner) => Promise<Banner>;
  refreshBanners: () => Promise<void>;

  // Coupon Actions
  addCoupon: (coupon: Partial<Coupon>) => Promise<Coupon>;
  updateCoupon: (id: string, updated: Partial<Coupon>) => Promise<Coupon>;
  deleteCoupon: (id: string) => Promise<boolean>;
  refreshCoupons: () => Promise<void>;

  // Category Actions
  addCategory: (category: Omit<Category, 'id'> & { id?: string }) => Promise<Category>;
  updateCategory: (id: string, updated: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Author Actions
  addAuthor: (author: Omit<Author, 'id'> & { id?: string }) => Promise<Author>;
  updateAuthor: (id: string, updated: Partial<Author>) => Promise<void>;
  deleteAuthor: (id: string) => Promise<void>;

  // Publisher Actions
  addPublisher: (publisher: Omit<Publisher, 'id'> & { id?: string }) => Publisher;
  updatePublisher: (id: string, updated: Partial<Publisher>) => void;
  deletePublisher: (id: string) => void;

  // Order Actions
  isOrdersLoading: boolean;
  refreshOrders: () => Promise<OrderDetails[]>;
  addOrder: (order: OrderDetails) => void;
  updateOrder: (orderId: string, updated: Partial<OrderDetails>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderDetails['status']) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;

  // Site Settings
  siteSettings: SiteSettings;
  updateSiteSettings: (updates: Partial<SiteSettings>) => Promise<SiteSettings>;

  // Management & Backup
  resetAllData: () => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonString: string) => Promise<BulkImportResult>;
  importBooksBulk: (booksOrJson: any) => Promise<BulkImportResult>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  BOOKS: 'shesher_pata_books_v1',
  BANNERS: 'shesher_pata_banners_v1',
  CATEGORIES: 'shesher_pata_categories_v1',
  AUTHORS: 'shesher_pata_authors_v1',
  PUBLISHERS: 'shesher_pata_publishers_v1',
  ORDERS: 'shesher_pata_orders_v1',
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>(() => bookService.getCachedBooks());
  const [isBooksLoading, setIsBooksLoading] = useState<boolean>(true);
  const [banners, setBanners] = useState<Banner[]>(() => {
    const cached = bannerService.getCachedBanners();
    return cached.length > 0 ? cached : INITIAL_BANNERS;
  });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => categoryService.getCachedCategories());
  const [authors, setAuthors] = useState<Author[]>(() => authorService.getCachedAuthors(INITIAL_AUTHORS));
  const [publishers, setPublishers] = useState<Publisher[]>(() => publisherService.getCachedPublishers(INITIAL_PUBLISHERS));
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage and Supabase on mount
  useEffect(() => {
    try {
      // 1. Load cached books first for instant render
      const cached = bookService.getCachedBooks();
      if (cached && cached.length > 0) {
        setBooks(cached);
      }

      // 2. Fetch fresh books from central database
      setIsBooksLoading(true);
      bookService.fetchBooks()
        .then((remoteBooks) => {
          if (Array.isArray(remoteBooks)) {
            setBooks(remoteBooks);
          }
        })
        .finally(() => {
          setIsBooksLoading(false);
        });

      // Load banners from database
      bannerService.fetchBanners().then((remoteBanners) => {
        if (remoteBanners && remoteBanners.length > 0) {
          setBanners(remoteBanners);
        }
      });

      // Load coupons from database
      couponService.fetchAdminCoupons().then((remoteCoupons) => {
        if (Array.isArray(remoteCoupons)) {
          setCoupons(remoteCoupons);
        }
      }).catch(() => {});

      // Load cached categories/authors and fetch latest from server
      const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (storedCategories) {
        try {
          const parsed = JSON.parse(storedCategories);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed);
          }
        } catch {}
      }
      categoryService.fetchCategories().then((remoteCats) => {
        if (remoteCats && remoteCats.length > 0) {
          setCategories(remoteCats);
        }
      });

      const storedAuthors = localStorage.getItem(STORAGE_KEYS.AUTHORS);
      if (storedAuthors) {
        try {
          const parsed = JSON.parse(storedAuthors);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAuthors(parsed);
          }
        } catch {}
      }
      authorService.fetchAuthors(INITIAL_AUTHORS).then((remoteAuthors) => {
        if (remoteAuthors && remoteAuthors.length > 0) {
          setAuthors(remoteAuthors);
        }
      });

      const storedPublishers = localStorage.getItem(STORAGE_KEYS.PUBLISHERS);
      if (storedPublishers) {
        try {
          const parsed = JSON.parse(storedPublishers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPublishers(parsed);
          }
        } catch {}
      }
      publisherService.fetchPublishers(INITIAL_PUBLISHERS).then((remotePubs) => {
        if (remotePubs && remotePubs.length > 0) {
          setPublishers(remotePubs);
        }
      });

      const storedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (storedOrders) {
        try {
          const parsed = JSON.parse(storedOrders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
          }
        } catch {}
      }

      // Fetch live orders from Supabase (accessible when authenticated as admin)
      orderService.fetchAdminOrders().then((remoteOrders) => {
        if (Array.isArray(remoteOrders) && remoteOrders.length >= 0) {
          setOrders(remoteOrders);
          try {
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(remoteOrders));
          } catch {}
        }
      }).catch(() => {});

      // Initial cached settings
      setSiteSettings(settingsService.getCachedSettings());

      // Fetch from Supabase in background
      settingsService.fetchSettings().then((remoteSettings) => {
        if (remoteSettings) {
          setSiteSettings(remoteSettings);
        }
      });
    } catch (err) {
      console.error('Error loading data from localStorage:', err);
    } finally {
      setIsLoaded(true);
    }

    // 3. Supabase Realtime synchronization for books table
    const unsubscribeBooksRealtime = bookService.subscribeToRealtime({
      onInsert: (newBook) => {
        setBooks((prev) => {
          if (prev.some((b) => b.id === newBook.id)) {
            return prev.map((b) => (b.id === newBook.id ? newBook : b));
          }
          const updated = [newBook, ...prev];
          bookService.saveToCache(updated);
          return updated;
        });
      },
      onUpdate: (updatedBook) => {
        setBooks((prev) => {
          const updated = prev.map((b) => (b.id === updatedBook.id ? { ...b, ...updatedBook } : b));
          bookService.saveToCache(updated);
          return updated;
        });
      },
      onDelete: (deletedId) => {
        setBooks((prev) => {
          const updated = prev.filter((b) => b.id !== deletedId);
          bookService.saveToCache(updated);
          return updated;
        });
      },
    });

    // 4. Multi-tab / window sync for books
    const handleBooksChanged = (event: Event) => {
      const customEvent = event as CustomEvent<Book[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setBooks(customEvent.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(BOOKS_CHANGED_EVENT, handleBooksChanged);
    }

    // Subscribe to settings changes across components or tabs
    const unsubscribeSettings = settingsService.subscribe((updatedSettings) => {
      setSiteSettings(updatedSettings);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeBooksRealtime();
      if (typeof window !== 'undefined') {
        window.removeEventListener(BOOKS_CHANGED_EVENT, handleBooksChanged);
      }
    };
  }, []);

  // Save other changes to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
    } catch (e) {
      console.error('Failed to save banners to localStorage:', e);
    }
  }, [banners, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories to localStorage:', e);
    }
  }, [categories, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.AUTHORS, JSON.stringify(authors));
    } catch (e) {
      console.error('Failed to save authors to localStorage:', e);
    }
  }, [authors, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PUBLISHERS, JSON.stringify(publishers));
    } catch (e) {
      console.error('Failed to save publishers to localStorage:', e);
    }
  }, [publishers, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders to localStorage:', e);
    }
  }, [orders, isLoaded]);

  // Book Methods (Synchronized with Supabase as single source of truth)
  const addBook = async (bookData: Omit<Book, 'id'> & { id?: string }): Promise<Book> => {
    const banglaName = normalizeBengali(bookData.bangla_name || bookData.title || '');
    const englishName = (bookData.english_name || '').trim();
    const title = banglaName || englishName || bookData.title || '';

    const newBook: Book = {
      ...bookData,
      id: bookData.id || `book-sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      title_bn: banglaName,
      bangla_name: banglaName,
      english_name: englishName,
      author: normalizeBengali(bookData.author || ''),
      publisher: normalizeBengali(bookData.publisher || 'বাতিঘর'),
      category: getCategoryDisplayName(bookData.category, categories) || normalizeBengali(bookData.category || 'উপন্যাস'),
      image: bookData.image || bookData.cover_image || '',
      cover_image: bookData.cover_image || bookData.image || '',
      price: Number(bookData.price) || 0,
      originalPrice: Number(bookData.originalPrice) || Number(bookData.price) || 0,
      discount: Number(bookData.discount) || 0,
      stock: Number(bookData.stock) || 0,
      rating: bookData.rating !== undefined ? Number(bookData.rating) : 5.0,
      reviewCount: bookData.reviewCount !== undefined ? Number(bookData.reviewCount) : 1,
      tags: Array.isArray(bookData.tags) ? bookData.tags : [],
      sectionIds: Array.isArray(bookData.sectionIds) ? bookData.sectionIds : ['new-arrivals'],
      created_at: bookData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to central database first
    const savedBook = await bookService.createBook(newBook);

    // Update state and cache
    let updatedBooksList: Book[] = [];
    setBooks((prev) => {
      const next = [savedBook, ...prev.filter((b) => b.id !== savedBook.id)];
      updatedBooksList = next;
      bookService.saveToCache(next);
      return next;
    });

    // Also update category bookCount
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        bookCount: (updatedBooksList.length > 0 ? updatedBooksList : [savedBook]).filter(
          (b) =>
            matchesCategory(b.category, b.tags, cat.name, prev) ||
            matchesCategory(b.category, b.tags, cat.id, prev)
        ).length,
      }))
    );

    return savedBook;
  };

  const updateBook = async (id: string, updated: Partial<Book>): Promise<Book> => {
    const payload = { ...updated };
    if (payload.author !== undefined) payload.author = normalizeBengali(payload.author);
    if (payload.publisher !== undefined) payload.publisher = normalizeBengali(payload.publisher);
    if (payload.category !== undefined) {
      payload.category = getCategoryDisplayName(payload.category, categories) || normalizeBengali(payload.category);
    }
    if (payload.title !== undefined) payload.title = normalizeBengali(payload.title);
    if (payload.image !== undefined && payload.cover_image === undefined) {
      payload.cover_image = payload.image;
    } else if (payload.cover_image !== undefined && payload.image === undefined) {
      payload.image = payload.cover_image;
    }
    const savedBook = await bookService.updateBook(id, payload);

    let updatedBooksList: Book[] = [];
    setBooks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...savedBook } : b));
      updatedBooksList = next;
      bookService.saveToCache(next);
      return next;
    });

    // Also update category bookCount accurately
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        bookCount: (updatedBooksList.length > 0 ? updatedBooksList : [savedBook]).filter(
          (b) =>
            matchesCategory(b.category, b.tags, cat.name, prev) ||
            matchesCategory(b.category, b.tags, cat.id, prev)
        ).length,
      }))
    );

    return savedBook;
  };

  const deleteBook = async (id: string): Promise<boolean> => {
    await bookService.deleteBook(id);

    setBooks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      bookService.saveToCache(next);
      return next;
    });

    return true;
  };

  const syncBooksWithSupabase = async (): Promise<{ success: boolean; count?: number; message: string }> => {
    try {
      // Fetch fresh live books from the central Supabase database
      const freshBooks = await bookService.fetchBooks();
      if (Array.isArray(freshBooks)) {
        setBooks(freshBooks);
        bookService.saveToCache(freshBooks);
        return {
          success: true,
          count: freshBooks.length,
          message: `সেন্ট্রাল ডাটাবেজের সাথে সফলভাবে সিঙ্ক ও রিফ্রেশ হয়েছে (মোট ${freshBooks.length}টি বই লাইভ)`,
        };
      }
      return { success: true, count: 0, message: 'ডাটাবেজ সিঙ্ক সম্পন্ন হয়েছে' };
    } catch (err: any) {
      return { success: false, message: err.message || 'সিঙ্ক ব্যর্থ হয়েছে' };
    }
  };

  // Banner Methods
  const refreshBanners = async () => {
    try {
      const fresh = await bannerService.fetchBanners({ admin: true });
      if (fresh && fresh.length > 0) {
        setBanners(fresh);
      }
    } catch (e) {
      console.warn('Failed to refresh banners:', e);
    }
  };

  const addBanner = async (bannerData: Partial<Banner>): Promise<Banner> => {
    const cleanName = bannerData.name || bannerData.title || 'New Banner';
    const newBanner = await bannerService.addBanner({
      ...bannerData,
      name: cleanName,
      title: bannerData.title || cleanName,
      sort_order: bannerData.display_order ?? (banners.length + 1),
      display_order: bannerData.display_order ?? (banners.length + 1),
    });
    setBanners((prev) => {
      const next = [...prev, newBanner];
      bannerService.saveToCache(next);
      return next;
    });
    return newBanner;
  };

  const updateBanner = async (id: string, updated: Partial<Banner>): Promise<Banner> => {
    const saved = await bannerService.updateBanner(id, updated);
    setBanners((prev) => {
      const next = prev.map((ban) => (ban.id === id ? { ...ban, ...saved } : ban));
      bannerService.saveToCache(next);
      return next;
    });
    return saved;
  };

  const deleteBanner = async (id: string): Promise<boolean> => {
    await bannerService.deleteBanner(id);
    setBanners((prev) => {
      const next = prev.filter((ban) => ban.id !== id);
      bannerService.saveToCache(next);
      return next;
    });
    return true;
  };

  const duplicateBanner = async (banner: Banner): Promise<Banner> => {
    const duplicated = await bannerService.duplicateBanner(banner);
    setBanners((prev) => {
      const next = [...prev, duplicated];
      bannerService.saveToCache(next);
      return next;
    });
    return duplicated;
  };

  // Coupon Methods
  const refreshCoupons = async () => {
    try {
      const fresh = await couponService.fetchAdminCoupons();
      if (Array.isArray(fresh)) {
        setCoupons(fresh);
      }
    } catch (e) {
      console.warn('Failed to refresh coupons:', e);
    }
  };

  const addCoupon = async (couponData: Partial<Coupon>): Promise<Coupon> => {
    const created = await couponService.addCoupon(couponData);
    setCoupons((prev) => [created, ...prev]);
    return created;
  };

  const updateCoupon = async (id: string, updated: Partial<Coupon>): Promise<Coupon> => {
    const saved = await couponService.updateCoupon(id, updated);
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...saved } : c)));
    return saved;
  };

  const deleteCoupon = async (id: string): Promise<boolean> => {
    await couponService.deleteCoupon(id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  // Category Methods
  const addCategory = async (catData: Omit<Category, 'id'> & { id?: string }): Promise<Category> => {
    const id = catData.id || `cat-${Date.now()}`;
    const cleanImage = catData.imageUrl || (catData as any).image || '';
    const newCat: Category = {
      ...catData,
      id,
      imageUrl: cleanImage,
      image: cleanImage,
      bookCount: catData.bookCount || 0,
      updated_at: new Date().toISOString(),
    };

    // 1. Persist to database first
    const serverCat = await categoryService.addCategory(newCat);
    const finalizedCat = serverCat || newCat;

    // 2. Update local state
    setCategories((prev) => {
      const updated = [...prev, finalizedCat];
      categoryService.saveToCache(updated);
      return updated;
    });

    return finalizedCat;
  };

  const updateCategory = async (id: string, updated: Partial<Category>): Promise<void> => {
    const cleanImage = updated.imageUrl !== undefined ? updated.imageUrl : (updated as any).image;

    // 1. Persist to database first (throws on failure so UI does not report false success)
    const serverCat = await categoryService.updateCategory(id, {
      ...updated,
      imageUrl: cleanImage,
      image: cleanImage,
    });

    // 2. Update local state only after database success
    setCategories((prev) => {
      const next = prev.map((c) => {
        if (c.id === id) {
          const newImg = cleanImage !== undefined ? cleanImage : (c.imageUrl || c.image || '');
          return {
            ...c,
            ...updated,
            ...(serverCat || {}),
            imageUrl: newImg,
            image: newImg,
            updated_at: new Date().toISOString(),
          };
        }
        return c;
      });
      categoryService.saveToCache(next);
      return next;
    });
  };

  const deleteCategory = async (id: string): Promise<void> => {
    await categoryService.deleteCategory(id);
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id);
      categoryService.saveToCache(next);
      return next;
    });
  };

  // Author Methods
  const addAuthor = async (authorData: Omit<Author, 'id'> & { id?: string }): Promise<Author> => {
    const id = authorData.id || `auth-${Date.now()}`;
    const cleanImage = authorData.image || (authorData as any).image_url || '';
    const newAuthor: Author = {
      ...authorData,
      id,
      image: cleanImage,
      image_url: cleanImage,
      bookCount: authorData.bookCount || 0,
      updated_at: new Date().toISOString(),
    };

    // 1. Persist to database first
    const serverAuthor = await authorService.addAuthor(newAuthor);
    const finalizedAuthor = serverAuthor || newAuthor;

    // 2. Update local state
    setAuthors((prev) => {
      const updated = [...prev, finalizedAuthor];
      authorService.saveToCache(updated);
      return updated;
    });

    return finalizedAuthor;
  };

  const updateAuthor = async (id: string, updated: Partial<Author>): Promise<void> => {
    const cleanImage = updated.image !== undefined ? updated.image : (updated as any).image_url;

    // 1. Persist to database first (throws on failure so UI does not report false success)
    const serverAuthor = await authorService.updateAuthor(id, {
      ...updated,
      image: cleanImage,
      image_url: cleanImage,
    });

    // 2. Update local state only after database success
    setAuthors((prev) => {
      const next = prev.map((a) => {
        if (a.id === id) {
          const newImg = cleanImage !== undefined ? cleanImage : (a.image || a.image_url || '');
          return {
            ...a,
            ...updated,
            ...(serverAuthor || {}),
            image: newImg,
            image_url: newImg,
            updated_at: new Date().toISOString(),
          };
        }
        return a;
      });
      authorService.saveToCache(next);
      return next;
    });
  };

  const deleteAuthor = async (id: string): Promise<void> => {
    await authorService.deleteAuthor(id);
    setAuthors((prev) => {
      const next = prev.filter((a) => a.id !== id);
      authorService.saveToCache(next);
      return next;
    });
  };

  // Publisher Methods
  const addPublisher = (pubData: Omit<Publisher, 'id'> & { id?: string }): Publisher => {
    const newPub: Publisher = {
      ...pubData,
      id: pubData.id || `pub-${Date.now()}`,
      bookCount: pubData.bookCount || 0,
    };
    setPublishers((prev) => {
      const next = [...prev, newPub];
      publisherService.saveToCache(next);
      return next;
    });

    // Background server sync if available
    fetch('/api/admin/publishers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPub),
    }).catch(() => {});

    return newPub;
  };

  const updatePublisher = (id: string, updated: Partial<Publisher>) => {
    setPublishers((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updated } : p));
      publisherService.saveToCache(next);
      return next;
    });

    fetch('/api/admin/publishers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updated }),
    }).catch(() => {});
  };

  const deletePublisher = (id: string) => {
    setPublishers((prev) => {
      const next = prev.filter((p) => p.id !== id);
      publisherService.saveToCache(next);
      return next;
    });
  };

  // Order Methods
  const refreshOrders = async (): Promise<OrderDetails[]> => {
    setIsOrdersLoading(true);
    try {
      const remoteOrders = await orderService.fetchAdminOrders();
      if (Array.isArray(remoteOrders)) {
        setOrders(remoteOrders);
        try {
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(remoteOrders));
        } catch {}
        return remoteOrders;
      }
      return orders;
    } catch (err) {
      console.error('[DataContext] Error refreshing orders:', err);
      return orders;
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const addOrder = (newOrder: OrderDetails) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.orderId === newOrder.orderId);
      if (exists) return prev;
      const next = [newOrder, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const updateOrder = async (orderId: string, updated: Partial<OrderDetails>) => {
    // 1. Optimistic local update
    setOrders((prev) => {
      const next = prev.map((ord) => (ord.orderId === orderId ? { ...ord, ...updated } : ord));
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Persist to Supabase
    try {
      await orderService.updateOrder(orderId, updated);
    } catch (err) {
      console.error('[DataContext] Failed to persist order update:', err);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderDetails['status']) => {
    // 1. Optimistic local update
    setOrders((prev) => {
      const next = prev.map((ord) => (ord.orderId === orderId ? { ...ord, status } : ord));
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Persist to Supabase
    try {
      await orderService.updateOrderStatus(orderId, status);
    } catch (err) {
      console.error('[DataContext] Failed to persist order status:', err);
    }
  };

  const deleteOrder = async (orderId: string) => {
    // 1. Optimistic local update
    setOrders((prev) => {
      const next = prev.filter((ord) => ord.orderId !== orderId);
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Persist to Supabase
    try {
      await orderService.deleteOrder(orderId);
    } catch (err) {
      console.error('[DataContext] Failed to delete order:', err);
    }
  };

  // Site Settings Action
  const updateSiteSettings = async (updates: Partial<SiteSettings>): Promise<SiteSettings> => {
    const saved = await settingsService.saveSettings(updates);
    setSiteSettings(saved);
    return saved;
  };

  // Reset & Backup: Clears local cache and re-syncs live data from Supabase
  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.BOOKS);
    localStorage.removeItem(STORAGE_KEYS.BANNERS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.AUTHORS);
    localStorage.removeItem(STORAGE_KEYS.PUBLISHERS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);

    setSiteSettings(DEFAULT_SETTINGS);
    settingsService.saveSettings(DEFAULT_SETTINGS);

    // Re-fetch all dynamic data directly from Supabase so database data is never lost or overridden
    bookService.fetchBooks().then((remoteBooks) => {
      if (Array.isArray(remoteBooks) && remoteBooks.length > 0) {
        setBooks(remoteBooks);
      }
    });
    bannerService.fetchBanners().then((remoteBanners) => {
      if (Array.isArray(remoteBanners) && remoteBanners.length > 0) {
        setBanners(remoteBanners);
      }
    });
  };

  const exportDataJSON = (): string => {
    const bundle = {
      books,
      banners,
      categories,
      authors,
      publishers,
      orders,
      siteSettings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    return JSON.stringify(bundle, null, 2);
  };

  const importBooksBulk = async (booksOrJson: any): Promise<BulkImportResult> => {
    const res = await bookService.bulkImportBooks(booksOrJson);
    if (res.success) {
      // Immediately refresh books from Supabase to ensure in-memory state is 100% synchronized with database
      const freshBooks = await bookService.fetchBooks();
      if (Array.isArray(freshBooks)) {
        setBooks(freshBooks);
        bookService.saveToCache(freshBooks);
      }
    }
    return res;
  };

  const importDataJSON = async (jsonString: string): Promise<BulkImportResult> => {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      return {
        success: false,
        total: 0,
        imported: 0,
        updated: 0,
        failed: 0,
        failedRecords: [],
        message: 'অবৈধ JSON ফাইল: ফাইলটি সঠিকভাবে পার্স করা যায়নি।',
      };
    }

    // Determine if it is a book collection or full site backup
    let booksToImport: any[] | null = null;
    if (Array.isArray(parsed)) {
      booksToImport = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.books)) {
        booksToImport = parsed.books;
      } else if (Array.isArray(parsed.data)) {
        booksToImport = parsed.data;
      } else if (Array.isArray(parsed.items)) {
        booksToImport = parsed.items;
      } else if (parsed.title || parsed.bangla_name || parsed.english_name) {
        booksToImport = [parsed];
      }
    }

    let result: BulkImportResult = {
      success: true,
      total: 0,
      imported: 0,
      updated: 0,
      failed: 0,
      failedRecords: [],
      message: 'ডেটা প্রক্রিয়াকরণ সম্পন্ন হয়েছে।',
    };

    // If books are present, save/restore them directly to Supabase via bulk upsert
    if (booksToImport && booksToImport.length > 0) {
      result = await importBooksBulk(booksToImport);
    }

    // Restore other entities if present in the full backup object
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.banners && Array.isArray(parsed.banners)) setBanners(parsed.banners);
      if (parsed.categories && Array.isArray(parsed.categories)) setCategories(parsed.categories);
      if (parsed.authors && Array.isArray(parsed.authors)) setAuthors(parsed.authors);
      if (parsed.publishers && Array.isArray(parsed.publishers)) setPublishers(parsed.publishers);
      if (parsed.orders && Array.isArray(parsed.orders)) setOrders(parsed.orders);
      if (parsed.siteSettings) {
        setSiteSettings(parsed.siteSettings);
        settingsService.saveSettings(parsed.siteSettings);
      }
    }

    return result;
  };

  return (
    <DataContext.Provider
      value={{
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
        duplicateBanner,
        refreshBanners,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        refreshCoupons,
        addCategory,
        updateCategory,
        deleteCategory,
        addAuthor,
        updateAuthor,
        deleteAuthor,
        addPublisher,
        updatePublisher,
        deletePublisher,
        addOrder,
        updateOrder,
        updateOrderStatus,
        deleteOrder,
        siteSettings,
        updateSiteSettings,
        resetAllData,
        exportDataJSON,
        importDataJSON,
        importBooksBulk,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
