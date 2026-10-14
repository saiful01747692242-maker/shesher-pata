export interface Book {
  id: string;
  title: string;
  title_bn?: string;
  bangla_name?: string;
  english_name?: string;
  slug?: string;
  author: string;
  publisher: string;
  category: string;
  description: string;
  description_bn?: string;
  image: string;
  cover_image?: string;
  banner_image?: string;
  pdf_url?: string;
  gallery?: string[];
  price: number;
  originalPrice: number;
  old_price?: number;
  discount: number; // percentage, e.g. 20
  rating: number;
  reviewCount: number;
  stock: number;
  isbn: string;
  pages?: number;
  edition?: string;
  language: string;
  tags: string[];
  isBestseller?: boolean;
  isNew?: boolean;
  isNewRelease?: boolean;
  isInternational?: boolean;
  isFeatured?: boolean;
  featured?: boolean;
  is_active?: boolean;
  status?: 'published' | 'draft' | 'out_of_stock';
  sectionIds: string[]; // which sections this book belongs to
  created_at?: string;
  updated_at?: string;
}

export interface Banner {
  id: string;
  name: string;
  type?: string;
  placement?: string; // 'homepage_hero' | 'homepage_promo' | 'category' | 'campaign' | 'custom'
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  badge_color?: string;
  image_url?: string;
  mobile_image_url?: string;
  primary_button_text?: string;
  primary_button_url?: string;
  secondary_button_text?: string;
  secondary_button_url?: string;
  highlight_text?: string;
  theme?: 'cream' | 'dark' | 'amber' | string;
  display_order: number;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  target_url?: string;
  open_in_new_tab?: boolean;
  alt_text?: string;
  design_config?: any;
  // Legacy compatibility fields
  bangla_image?: string;
  english_image?: string;
  english_title?: string;
  english_subtitle?: string;
  link?: string;
  status?: 'active' | 'inactive';
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  discount_value: number;
  minimum_order_amount?: number;
  maximum_discount_amount?: number | null;
  usage_limit?: number | null;
  used_count: number;
  per_user_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  description?: string;
  applicable_to?: 'all' | 'category' | 'books';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}


export interface Category {
  id: string;
  name: string;
  bangla_name?: string;
  englishName: string;
  english_name?: string;
  slug?: string;
  iconName: string;
  imageUrl: string;
  image?: string;
  bookCount: number;
  created_at?: string;
  updated_at?: string;
}

export interface Author {
  id: string;
  name: string;
  era: string;
  role: string;
  bio: string;
  image: string;
  image_url?: string;
  bookCount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Publisher {
  id: string;
  name: string;
  description?: string;
  location?: string;
  logo?: string;
  established?: string;
  bookCount?: number;
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface OrderDetails {
  orderId: string;
  date: string;
  created_at?: string;
  customerName: string;
  phone: string;
  email: string;
  userId?: string;
  address: string;
  district: string;
  thana: string;
  postalCode: string;
  deliveryOption: 'inside_dhaka' | 'outside_dhaka';
  deliveryFee: number;
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'card';
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderNotes?: string;
  // Steadfast Courier integration fields
  steadfast_consignment_id?: string | number;
  steadfast_tracking_code?: string;
  steadfast_status?: string;
  steadfast_synced_at?: string;
}

export type ViewType = 'home' | 'catalog' | 'author' | 'publisher' | 'offers' | 'about' | 'contact';

export interface SiteSettings {
  id?: string;
  meta_pixel_id: string;
  meta_pixel_enabled: boolean;
  phone?: string;
  alt_phone?: string;
  email?: string;
  address?: string;
  support_hours?: string;
  announcement_badge?: string;
  announcement_text?: string;
  about_text?: string;
  facebook_url?: string;
  instagram_url?: string;
  whatsapp_number?: string;
  // Steadfast Courier API settings
  steadfast_api_key?: string;
  steadfast_secret_key?: string;
  steadfast_enabled?: boolean;
  // Delivery Fee configuration
  delivery_charge_inside?: number;
  delivery_charge_outside?: number;
  free_delivery_threshold?: number;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookReview {
  id: string;
  book_id: string;
  user_id?: string;
  user_name: string;
  user_email?: string;
  rating: number;
  review_text: string;
  is_verified_purchase: boolean;
  order_id?: string;
  created_at: string;
  updated_at?: string;
}
