import axios from 'axios';
import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

const getAuthHeaders = async () => {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const token = await auth.currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`
  };
};

export const fetchFavorites = async (): Promise<FavoriteProduct[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/favorites`, { headers });
    return response.data.favorites || [];
  } catch (error) {
    console.warn("[Favorites API] Failed to fetch favorites:", error);
    return [];
  }
};

export const addFavorite = async (product: {
  productId: string;
  name: string;
  brand?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  discount?: string | null;
  imageUrl: string;
  store?: string;
  productUrl?: string;
  category?: string;
  size?: string | null;
}): Promise<FavoriteProduct> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_URL}/favorites`, product, { headers });
  return response.data.favorite;
};

export const removeFavorite = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.delete(`${API_URL}/favorites/${id}`, { headers });
};

export const checkFavorite = async (productId: string): Promise<{ isFavorited: boolean; favoriteId: string | null }> => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/favorites/check/${encodeURIComponent(productId)}`, { headers });
  return response.data;
};
