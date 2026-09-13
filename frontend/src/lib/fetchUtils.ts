"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// fetchUtils.ts — Shared API utilities for MITYRA
// Single source of truth for retry logic, HTML decoding, and product normalization
// ═══════════════════════════════════════════════════════════════════════════════

// ─── HTML Entity Decoder ────────────────────────────────────────────────────
export const decodeHtmlEntities = (str: string): string => {
  if (!str) return "";
  let decoded = str;
  for (let i = 0; i < 3; i++) {
    const prev = decoded;
    decoded = decoded
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;;?/g, "'")
      .replace(/&#39;;?/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/&#96;/g, "`")
      .replace(/&apos;/g, "'");
    if (decoded === prev) break;
  }
  return decoded;
};

// ─── Resilient API Fetcher with Timeout and Retry ───────────────────────────
export const fetchWithRetry = async (
  url: string,
  options: any = {},
  retries = 2,
  backoff = 1000
): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }

      if (res.status === 404) {
        throw new Error("Endpoint not found (404)");
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("Authentication failed (401/403)");
      }
      if (res.status === 429) {
        if (attempt < retries) {
          console.warn(`[API] Rate limit hit. Retrying in ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
          backoff *= 2;
          continue;
        }
        throw new Error("Too many requests (429)");
      }

      throw new Error(`API Error: ${res.status}`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";

      if (attempt < retries) {
        console.warn(
          `[API] Attempt ${attempt + 1} failed (${isAbort ? "Timeout" : err.message}). Retrying in ${backoff}ms...`
        );
        await new Promise((r) => setTimeout(r, backoff));
        backoff *= 2;
        continue;
      }

      throw new Error(isAbort ? "Request timed out" : err.message);
    }
  }
};

// ─── Product Normalization ──────────────────────────────────────────────────
export interface NormalizedProduct {
  id: string;
  name: string;
  imageUrl: string;
  platform: string;
  price: string;
  productUrl: string;
  rating?: number | null;
  reviews?: number | null;
  brand?: string | null;
}

export const normalizeProduct = (
  p: any,
  defaultStore: string = "Platform"
): NormalizedProduct => {
  return {
    id: p.id || `prod_${Math.random().toString(36).slice(2)}`,
    name: decodeHtmlEntities(p.name || p.title || ""),
    imageUrl: p.imageUrl || p.image || "",
    platform: p.platform || p.store || defaultStore,
    price: p.price || null,
    productUrl: p.productUrl || p.url || "",
    rating: p.rating || null,
    reviews: p.reviews || p.num_ratings || null,
    brand: p.brand || null,
  };
};

// ─── Extract Brand from Product Name ────────────────────────────────────────
export const extractBrand = (name: string): string => {
  if (!name) return "";
  const firstWord = name.split(/\s+/)[0];
  if (
    firstWord &&
    firstWord.length >= 3 &&
    firstWord[0] === firstWord[0].toUpperCase()
  ) {
    return firstWord;
  }
  return "Premium Brand";
};

// ─── Debounce Hook Helper ───────────────────────────────────────────────────
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
