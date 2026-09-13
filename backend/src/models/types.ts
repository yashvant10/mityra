// TryOnX Backend - TypeScript Interfaces for Firestore Documents

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  stylePreferences: StylePreferences;
  styleScore: number;
  subscription: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
  // Optional plan and usage tracking fields
  plan?: SubscriptionTier;
  planExpiresAt?: string;
  triesUsedToday?: number;
  triesLastReset?: string;
  wardrobeSlotsUsed?: number;
  adFreeTriesUsed?: number;
  credits?: number;
  creditsUsed?: number;
  isBanned?: boolean;
  sizeProfile?: {
    heightCategory: string;
    bodyType: string;
    shirtSize: string;
    trouser: string;
    bestFit: string;
    updatedAt: string;
  };
  notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  newOutfitRecommendations: boolean;
  tryOnResults: boolean;
  priceDrops: boolean;
  productUpdates: boolean;
  tipsAndStyle: boolean;
}

export interface StylePreferences {
  favoriteColors: string[];
  preferredStyles: string[];
  bodyType: string;
  gender: string;
  budget: 'low' | 'medium' | 'high' | 'luxury';
  occasions: string[];
}

export type SubscriptionTier = 'free' | 'student' | 'starter' | 'pro' | 'premium' | 'business' | 'enterprise';

export interface AdWatchRecord {
  userId: string;
  watchedAt: string;
  expiresAt: string;
  consumed: boolean;
}

export interface AdminUser {
  username: string;
  passwordHash: string;
  role: 'admin' | 'superadmin';
}

export interface WardrobeItem {
  id: string;
  userId: string;
  imageUrl: string;
  category: ClothingCategory;
  subcategory: string;
  color: string;
  brand: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
}

export type ClothingCategory = 'tops' | 'bottoms' | 'shoes' | 'accessories' | 'outerwear' | 'dresses' | 'activewear';

export interface TryOnSession {
  id: string;
  userId: string;
  userImageUrl: string;
  clothingImageUrl: string;
  resultImageUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  clothingName?: string;
  clothingPrice?: string;
  clothingProductUrl?: string;
  clothingStore?: string;
  platform?: string;
  isSaved?: boolean;
}

export interface AIChat {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  images?: string[];
}

export interface FashionOrder {
  id: string;
  userId: string;
  orderNumber: string;
  store: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  createdAt: string;
  deliveryDate?: string;
  trackingUrl?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  imageUrl: string;
  category: string;
  quantity: number;
  price: number;
  brand: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'addition' | 'deduction';
  description: string;
  createdAt: string;
}

export interface Outfit {
  id: string;
  userId: string;
  name: string;
  items: string[]; // wardrobe item IDs
  occasion: string;
  season: string;
  rating: number;
  isFavorite: boolean;
  imageUrl?: string;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  userId: string;
  action: 'try_on' | 'upgrade' | 'watch_ad' | 'affiliate_click';
  type: 'outfit' | 'item' | 'color' | 'style';
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  confidence: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  features: string[];
}

export interface AnalyticsData {
  userId: string;
  styleScore: number;
  totalOutfits: number;
  totalTryOns: number;
  favoriteColors: { color: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  monthlyActivity: { month: string; actions: number }[];
}

export interface AffiliateClick {
  id: string;
  userId: string;
  clothingName: string;
  clothingPrice: string;
  clothingStore: string;
  platform: string;
  productUrl: string;
  affiliateUrl: string;
  timestamp: string;
  commissionRate: number;
  estimatedCommission: number;
  isConverted: boolean;
}

export interface FavoriteProduct {
  id: string;
  userId: string;
  productId: string;
  name: string;
  brand: string | null;
  price: string | null;
  originalPrice: string | null;
  discount: string | null;
  imageUrl: string;
  store: string;
  productUrl: string;
  category: string;
  size: string | null;
  createdAt: string;
}
