import { auth } from './firebase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated. Please log in to the admin dashboard.');

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}

export const adminApi = {
  getDashboard: () => fetchWithAuth('/admin/dashboard'),
  getUsers: () => fetchWithAuth('/admin/users'),
  getUser: (uid: string) => fetchWithAuth(`/admin/users/${uid}`),
  giftPremium: (uid: string, plan: string, durationDays: number) => 
    fetchWithAuth(`/admin/users/${uid}/gift`, {
      method: 'POST',
      body: JSON.stringify({ plan, durationDays })
    }),
  removePremium: (uid: string) =>
    fetchWithAuth(`/admin/users/${uid}/remove-premium`, {
      method: 'POST'
    }),
  banUser: (uid: string, isBanned: boolean) =>
    fetchWithAuth(`/admin/users/${uid}/ban`, {
      method: 'POST',
      body: JSON.stringify({ isBanned })
    }),
  getVirtualTryOnAnalytics: () => fetchWithAuth('/admin/virtual-try-on'),
  getProductsAnalytics: () => fetchWithAuth('/admin/affiliate-analytics'),
  getOrders: () => fetchWithAuth('/admin/orders'),
  getActivityFeed: () => fetchWithAuth('/admin/activity-feed'),
  logActivity: (action: string, target: string, metadata?: any) => 
    fetchWithAuth('/admin/activity', {
      method: 'POST',
      body: JSON.stringify({ action, target, metadata })
    }),
  grantCredits: (uid: string, amount: number) =>
    fetchWithAuth(`/admin/users/${uid}/grant-credits`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    }),
  // I will add more methods here as needed for orders, products, etc.
};
