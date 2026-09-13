import axios from 'axios';
import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface WardrobeItem {
  id: string;
  userId: string;
  imageUrl: string;
  category: string;
  subcategory: string;
  color: string;
  brand: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
}

const getAuthHeaders = async () => {
  if (!auth.currentUser) throw new Error('Not authenticated');
  const token = await auth.currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`
  };
};

export const fetchWardrobeItems = async (): Promise<WardrobeItem[]> => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/wardrobe`, { headers });
  return response.data.items || [];
};

export const scanClothingImage = async (file: File): Promise<{ category: string, color: string, brand: string }> => {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await axios.post(`${API_URL}/wardrobe/scan`, formData, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
  });
  return response.data.analysis;
};

export const addWardrobeItem = async (formData: FormData): Promise<WardrobeItem> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_URL}/wardrobe`, formData, {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data.item;
};

export const updateWardrobeItem = async (id: string, updates: Partial<WardrobeItem>): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.put(`${API_URL}/wardrobe/${id}`, updates, { headers });
};

export const deleteWardrobeItem = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.delete(`${API_URL}/wardrobe/${id}`, { headers });
};

export const generateOutfitIdeas = async (occasion: string = "casual day out") => {
  const headers = await getAuthHeaders();
  try {
    const response = await axios.post(`${API_URL}/ai/wardrobe-outfits`, { occasion }, { headers });
    return response.data.outfits;
  } catch (error) {
    console.error("Failed to generate AI outfits", error);
    return null;
  }
};

export const parseProductUrl = async (url: string) => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_URL}/products/parse`, { url }, { headers });
  return response.data.product;
};
