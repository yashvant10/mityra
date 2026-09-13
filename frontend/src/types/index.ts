// Frontend TypeScript types — shared across the app

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface StylePreferences {
  favoriteColors: string[];
  preferredStyles: string[];
  bodyType: string;
  gender: string;
  budget: "low" | "medium" | "high" | "luxury";
  occasions: string[];
}

export type SubscriptionTier = "free" | "pro" | "enterprise";

export type ClothingCategory =
  | "tops"
  | "bottoms"
  | "shoes"
  | "accessories"
  | "outerwear"
  | "dresses"
  | "activewear";

export interface WardrobeItem {
  id: string;
  imageUrl: string;
  category: ClothingCategory;
  subcategory: string;
  color: string;
  brand: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
}

export interface TryOnSession {
  id: string;
  userImageUrl: string;
  clothingImageUrl: string;
  resultImageUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  images?: string[];
}

export interface Recommendation {
  id: string;
  type: "outfit" | "item" | "color" | "style";
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  confidence: number;
}

export interface PricingTier {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}
