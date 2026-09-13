import { db, auth, admin } from '../config/firebase';

export { db, auth, admin };

export const banUser = async (...args: any[]): Promise<any> => {
  const [uid, isBanned] = args;
  await db.collection('users').doc(uid).update({ isBanned });
  return { success: true };
};

export const giftPremium = async (...args: any[]): Promise<any> => {
  const [uid, plan, durationDays] = args;
  const expiresAt = new Date(Date.now() + (durationDays || 30) * 24 * 60 * 60 * 1000).toISOString();
  await db.collection('users').doc(uid).update({ plan, subscription: plan, expiresAt });
  return { success: true };
};

export const getPlatformClicks = async (...args: any[]): Promise<any> => {
  const snap = await db.collection('platform_clicks').get();
  return snap.docs.map(doc => doc.data());
};

export const getRevenueStats = async (...args: any[]): Promise<any> => {
  const snap = await db.collection('payment_transactions').where('status', '==', 'CAPTURED').get();
  let totalRevenue = 0;
  snap.docs.forEach(doc => { totalRevenue += (doc.data().amount || 0); });
  return { totalRevenue, totalOrders: snap.size };
};

export const getAffiliateHistory = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('affiliate_clicks').where('userId', '==', uid).get();
  return snap.docs.map(doc => doc.data());
};

export const getAffiliateStats = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('affiliate_clicks').where('userId', '==', uid).get();
  return { totalClicks: snap.size, estimatedEarnings: snap.size * 0.1 };
};

export const createAffiliateClick = async (...args: any[]): Promise<any> => {
  const [data] = args;
  await db.collection('affiliate_clicks').add({ ...data, createdAt: new Date().toISOString() });
  return { success: true };
};

export const trackPlatformClick = async (...args: any[]): Promise<any> => {
  const [data] = args;
  await db.collection('platform_clicks').add({ ...data, createdAt: new Date().toISOString() });
  return { success: true };
};

export const saveChat = async (...args: any[]): Promise<any> => {
  const [uid, chat] = args;
  await db.collection('chats').doc(uid).collection('history').add({ ...chat, createdAt: new Date().toISOString() });
  return { success: true };
};

export const getChatHistory = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('chats').doc(uid).collection('history').orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateChat = async (...args: any[]): Promise<any> => {
  const [uid, chatId, chat] = args;
  await db.collection('chats').doc(uid).collection('history').doc(chatId).update(chat);
  return { success: true };
};

export const getWardrobeItems = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('wardrobes').doc(uid).collection('items').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateUserProfile = async (...args: any[]): Promise<any> => {
  const [uid, updates] = args;
  await db.collection('users').doc(uid).set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  return { success: true };
};

export const addFavoriteProduct = async (...args: any[]): Promise<any> => {
  const [uid, product] = args;
  const docRef = await db.collection('users').doc(uid).collection('favorites').add({ ...product, userId: uid, createdAt: new Date().toISOString() });
  return { id: docRef.id, ...product };
};

export const removeFavoriteProduct = async (...args: any[]): Promise<any> => {
  const [uid, idOrProductId] = args;
  
  // First try deleting by exact doc id
  await db.collection('users').doc(uid).collection('favorites').doc(idOrProductId).delete();

  // Then also try deleting where productId == idOrProductId, in case it was passed by productId from history
  const snap = await db.collection('users').doc(uid).collection('favorites').where('productId', '==', idOrProductId).get();
  if (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  
  return { success: true };
};

export const getUserFavorites = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('users').doc(uid).collection('favorites').orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getFavoriteByProductId = async (...args: any[]): Promise<any> => {
  const [uid, productId] = args;
  const snap = await db.collection('users').doc(uid).collection('favorites').where('productId', '==', productId).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const getOrders = async (...args: any[]): Promise<any> => {
  const [userId] = args;
  if (!userId) {
    return [];
  }
  const snap = await db.collection('payment_transactions').where('userId', '==', userId).get();
  const orders = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  return orders.sort((a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
};

export const saveOutfit = async (...args: any[]): Promise<any> => {
  const [uid, outfit] = args;
  await db.collection('users').doc(uid).collection('outfits').add({ ...outfit, createdAt: new Date().toISOString() });
  return { success: true };
};

export const getOutfits = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('users').doc(uid).collection('outfits').orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUserProfile = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
};

export const getRecommendations = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('recommendations').where('userId', '==', uid).get();
  return snap.docs.map(doc => doc.data());
};

export const createTryOnSession = async (...args: any[]): Promise<any> => {
  const [uid, sessionData] = args;
  const docRef = await db.collection('users').doc(uid).collection('tryons').add({ ...sessionData, createdAt: new Date().toISOString() });
  return { id: docRef.id, ...sessionData };
};

export const updateTryOnSession = async (uid: string, sessionId: string, updateData: any): Promise<void> => {
  await db.collection('users').doc(uid).collection('tryons').doc(sessionId).update(updateData);
};

export const getTryOnHistory = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('users').doc(uid).collection('tryons').orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getLastAdWatch = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('users').doc(uid).collection('ad_watches').orderBy('watchedAt', 'desc').limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const consumeAdWatch = async (...args: any[]): Promise<any> => {
  const [uid, adId] = args;
  await db.collection('users').doc(uid).collection('ad_watches').doc(adId).update({ consumed: true });
  return { success: true };
};

export const createUserProfile = async (...args: any[]): Promise<any> => {
  const [profile] = args;
  await db.collection('users').doc(profile.uid).set({ ...profile, createdAt: new Date().toISOString() });
  return { success: true };
};

export const updateTryOnSessionSaveState = async (...args: any[]): Promise<any> => {
  const [uid, tryOnId, saved] = args;
  await db.collection('users').doc(uid).collection('tryons').doc(tryOnId).update({ isSaved: saved });
  return { success: true };
};

export const logActivity = async (...args: any[]): Promise<any> => {
  const [uid, action, details] = args;
  await db.collection('activity_logs').add({ userId: uid, action, details, createdAt: new Date().toISOString() });
  return { success: true };
};

export const updateUserPlan = async (...args: any[]): Promise<any> => {
  const [uid, plan, expiresAt] = args;
  await db.collection('users').doc(uid).update({ plan, subscription: plan, expiresAt });
  return { success: true };
};

export const recordAdWatch = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const record = {
    userId: uid,
    watchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    consumed: false
  };
  await db.collection('users').doc(uid).collection('ad_watches').add(record);
  return record;
};

export const getCreditHistory = async (...args: any[]): Promise<any> => {
  const [uid] = args;
  const snap = await db.collection('credit_ledger').where('userId', '==', uid).orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addWardrobeItem = async (...args: any[]): Promise<any> => {
  const [uid, item] = args;
  const docRef = await db.collection('wardrobes').doc(uid).collection('items').add({ ...item, createdAt: new Date().toISOString() });
  return { id: docRef.id, ...item };
};

export const updateWardrobeItem = async (...args: any[]): Promise<any> => {
  const [uid, itemId, updates] = args;
  await db.collection('wardrobes').doc(uid).collection('items').doc(itemId).update(updates);
  return { success: true };
};

export const deleteWardrobeItem = async (...args: any[]): Promise<any> => {
  const [uid, itemId] = args;
  await db.collection('wardrobes').doc(uid).collection('items').doc(itemId).delete();
  return { success: true };
};

export const getAllUsers = async (...args: any[]): Promise<any> => {
  const snap = await db.collection('users').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const firebaseService = {
  db,
  auth,
  admin,
  banUser, giftPremium, getPlatformClicks, getRevenueStats, getAffiliateHistory, getAffiliateStats, createAffiliateClick, trackPlatformClick, saveChat, getChatHistory, updateChat, getWardrobeItems, updateUserProfile, addFavoriteProduct, removeFavoriteProduct, getUserFavorites, getFavoriteByProductId, getOrders, saveOutfit, getOutfits, getUserProfile, getRecommendations, createTryOnSession, getTryOnHistory, getLastAdWatch, consumeAdWatch, createUserProfile, updateTryOnSessionSaveState, logActivity, updateUserPlan, recordAdWatch, getCreditHistory, addWardrobeItem, updateWardrobeItem, deleteWardrobeItem, getAllUsers
};
