"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  Camera, Sparkles, Check, ChevronRight, Upload, 
  RotateCcw, Download, Share2, AlertCircle, ExternalLink,
  ShoppingBag, Star, Heart, ArrowLeft, Watch, Shirt, UserCircle, History, LifeBuoy, Link as LinkIcon, Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import TopNav from "@/components/dashboard/TopNav";
import { generateTryOn, urlToBlob, base64ToFile } from "@/lib/tryonApi";
import { AntiGravityWrapper } from "@/components/ui/AntiGravityWrapper";

// ─── Types ─────────────────────────────────────────────────────────────────────
type StoreName = "flipkart" | "amazon" | "myntra" | "ajio" | "meesho";

interface OutfitItem {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  description: string;
  rating: number;
  store: StoreName;
  gender: "male" | "female";
  productUrl: string;
  title?: string;
  image?: string;
  images?: string[];
  platform?: StoreName;
  affiliateUrl?: string;
  brand?: string;
  discount?: number;
  originalPrice?: string;
}

// ─── Constants & Configuration ───────────────────────────────────────────────
const STORE_CONFIG: Record<StoreName, { label: string; logo: string; available: boolean }> = {
  flipkart: { label: "Flipkart", logo: "/logos/flipkart.png", available: true },
  amazon: { label: "Amazon", logo: "/logos/amazon.png", available: true },
  myntra: { label: "Myntra", logo: "/logos/myntra.png", available: true },
  ajio: { label: "Ajio", logo: "/logos/ajio.png", available: true },
  meesho: { label: "Meesho", logo: "/logos/meesho.png", available: false },
};

const MEN_CATEGORIES = [
  { id: "tshirts", label: "T-Shirts", img: "👕" },
  { id: "shirts", label: "Shirts", img: "👔" },
  { id: "pants", label: "Pants & Jeans", img: "👖" },
  { id: "shorts", label: "Shorts", img: "🩳" },
  { id: "jackets", label: "Jackets", img: "🧥" },
  { id: "ethnic", label: "Kurta & Ethnic", img: "🪷" },
  { id: "shoes", label: "Shoes", img: "👟" },
  { id: "suits", label: "Suits & Blazers", img: "💼" },
  { id: "bags", label: "Bags & Accessories", img: "👜" },
  { id: "accessories", label: "Accessories", img: "⌚" }
];

const WOMEN_CATEGORIES = [
  { id: "tops", label: "Tops & Tees", img: "👚" },
  { id: "dresses", label: "Dresses", img: "👗" },
  { id: "pants", label: "Jeans & Trousers", img: "👖" },
  { id: "ethnic", label: "Kurtis & Ethnic", img: "🪷" },
  { id: "sarees", label: "Sarees", img: "🥻" },
  { id: "jackets", label: "Jackets & Coats", img: "🧥" },
  { id: "skirts", label: "Skirts & Shorts", img: "🩳" },
  { id: "activewear", label: "Activewear", img: "🧘‍♀️" },
  { id: "shoes", label: "Shoes & Heels", img: "👠" },
  { id: "accessories", label: "Accessories", img: "👜" }
];

const SUBCATEGORIES: Record<string, { id: string; label: string }[]> = {
  tshirts: [
    { id: "polo", label: "Polo" },
    { id: "oversized", label: "Oversized" },
    { id: "graphic", label: "Graphic" },
    { id: "vneck", label: "V-Neck" },
    { id: "crewneck", label: "Crew Neck" },
    { id: "fullsleeve", label: "Full Sleeve" },
    { id: "regular", label: "Regular Fit" },
    { id: "slim", label: "Slim Fit" },
  ],
  shirts: [
    { id: "casual", label: "Casual" },
    { id: "formal", label: "Formal" },
    { id: "denim", label: "Denim" },
    { id: "checked", label: "Checked" },
    { id: "printed", label: "Printed" },
    { id: "linen", label: "Linen" },
    { id: "overshirt", label: "Overshirt" },
  ],
  pants: [
    { id: "slim", label: "Slim" },
    { id: "straight", label: "Straight" },
    { id: "relaxed", label: "Relaxed" },
    { id: "cargo", label: "Cargo" },
    { id: "chinos", label: "Chinos" },
    { id: "formal", label: "Formal Trousers" },
    { id: "wide", label: "Wide Leg" },
  ],
  tops: [
    { id: "tshirts", label: "T-Shirts" },
    { id: "blouses", label: "Blouses" },
    { id: "croptops", label: "Crop Tops" },
    { id: "tanktops", label: "Tank Tops" },
    { id: "tunics", label: "Tunics" },
    { id: "shirts", label: "Shirts" },
  ],
  dresses: [
    { id: "casual", label: "Casual" },
    { id: "maxi", label: "Maxi" },
    { id: "midi", label: "Midi" },
    { id: "mini", label: "Mini" },
    { id: "party", label: "Party" },
  ],
  ethnic: [
    { id: "kurta", label: "Kurta/Kurti" },
    { id: "kurta-sets", label: "Kurta Sets" },
    { id: "lehenga", label: "Lehenga" },
    { id: "salwar", label: "Salwar Suits" },
  ]
};

const OCCASIONS = [
  { id: "college", label: "College" },
  { id: "office", label: "Office" },
  { id: "interview", label: "Interview" },
  { id: "wedding", label: "Wedding" },
  { id: "party", label: "Party" },
  { id: "festival", label: "Festival" },
  { id: "casual", label: "Casual" },
  { id: "datenight", label: "Date Night" },
  { id: "travel", label: "Travel" },
];

const STEPS = [
  { num: 1, title: "Platform" },
  { num: 2, title: "Category" },
  { num: 3, title: "Style" },
  { num: 4, title: "Occasion" },
  { num: 5, title: "Product" },
  { num: 6, title: "Upload" },
  { num: 7, title: "Try On" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const decodeHtmlEntities = (str: string): string => {
  if (!str) return "";
  let decoded = str;
  for (let i = 0; i < 3; i++) {
    const prev = decoded;
    decoded = decoded.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#x27;;?/g, "'").replace(/&#39;;?/g, "'");
    if (decoded === prev) break;
  }
  return decoded;
};

const extractBrand = (name: string): string => {
  if (!name) return "";
  const firstWord = name.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 3 && firstWord[0] === firstWord[0].toUpperCase()) {
    return firstWord;
  }
  return "Premium Brand";
};

const enrichProductData = (p: any): OutfitItem => {
  const numericPrice = parseInt(String(p.price || p.price_str || p.selling_price || "1499").replace(/[^\d]/g, "")) || 1499;
  const originalPrice = Math.round(numericPrice * 1.4);
  return {
    ...p,
    id: p.id || p.product_id || p.asin || Math.random().toString(),
    name: decodeHtmlEntities(p.name || p.title || ""),
    price: `₹${numericPrice}`,
    originalPrice: `₹${originalPrice}`,
    imageUrl: p.imageUrl || p.image || (p.images && p.images[0]) || "",
    store: (p.store || p.platform || "amazon").toLowerCase(),
    brand: p.brand || extractBrand(p.name || p.title || ""),
    rating: parseFloat(p.rating || (4.0 + Math.random()).toFixed(1)) || 4.2
  };
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
function VirtualTryOnStudioContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Workflow state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [gender, setGender] = useState<"male" | "female">("male");

  useEffect(() => {
    if (user && (user as any).gender) {
      setGender((user as any).gender);
    }
  }, [user]);

  useEffect(() => {
    const importUrlParam = searchParams.get("url") || searchParams.get("productUrl");
    const imageParam = searchParams.get("image") || searchParams.get("clothingImage");
    const nameParam = searchParams.get("name") || searchParams.get("clothingName");
    const rawPlatform = (searchParams.get("platform") || searchParams.get("store") || "amazon").toLowerCase();
    const platformParam: StoreName = rawPlatform in STORE_CONFIG ? (rawPlatform as StoreName) : "amazon";
    const priceParam = searchParams.get("price") || "₹999";

    if (imageParam && nameParam) {
      const product: OutfitItem = {
        id: `param_${Date.now()}`,
        name: decodeURIComponent(nameParam),
        price: priceParam,
        imageUrl: decodeURIComponent(imageParam),
        description: "Ready for virtual try-on.",
        rating: 4.5,
        store: platformParam,
        gender: gender || "male",
        productUrl: importUrlParam || "",
      };
      setSelectedProduct(product);
      setSelectedPlatform(platformParam);
      setIsImportedProduct(true);
      navigateStep(5);
    } else if (importUrlParam) {
      setTimeout(() => {
        handleGlobalSearch(importUrlParam);
      }, 500);
    }
  }, [searchParams]);

  // Selections
  const [selectedPlatform, setSelectedPlatform] = useState<StoreName | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<OutfitItem | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Products state
  const [apiProducts, setApiProducts] = useState<OutfitItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Import state
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportedProduct, setIsImportedProduct] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStage, setGenStage] = useState(0); // 0-4
  const [resultImage, setResultImage] = useState<string | null>(null);

  // VTO Availability state
  const [vtoStatus, setVtoStatus] = useState<"CHECKING" | "AVAILABLE" | "UNAVAILABLE">("CHECKING");

  // VTO Health Check Polling
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const checkHealth = async () => {
      try {
        const res = await fetch("/api/tryon/health");
        const data = await res.json();
        if (isMounted) {
          setVtoStatus(data.available ? "AVAILABLE" : "UNAVAILABLE");
        }
      } catch (err) {
        if (isMounted) setVtoStatus("UNAVAILABLE");
      }
    };

    checkHealth(); // Initial check
    intervalId = setInterval(checkHealth, 10000); // Poll every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSavedToHistory, setIsSavedToHistory] = useState(false);

  // AI Review state
  const [aiReview, setAiReview] = useState<any>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Navigation Helper
  const navigateStep = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ─── Product Loading ─────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    if (!selectedPlatform || !selectedCategory) return;
    setIsLoadingProducts(true);
    setProductError(null);
    setApiProducts([]);
    setCurrentPage(1);
    setHasMoreProducts(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const currentCategories = gender === "male" ? MEN_CATEGORIES : WOMEN_CATEGORIES;
      const catObj = currentCategories.find(c => c.id === selectedCategory);
      const styleObj = SUBCATEGORIES[selectedCategory]?.find(s => s.id === selectedStyle);
      const occObj = OCCASIONS.find(o => o.id === selectedOccasion);
      
      const queryParts = [gender === "male" ? "men" : "women"];
      if (styleObj) queryParts.push(styleObj.label.toLowerCase());
      if (catObj) {
        let catStr = catObj.label.toLowerCase();
        catStr = catStr.replace(" & ", " "); // e.g. "Pants & Jeans" -> "pants jeans"
        queryParts.push(catStr);
      }
      if (occObj) queryParts.push(occObj.label.toLowerCase() + " wear");

      const searchQuery = queryParts.join(" ");

      const fetchUrl = `${apiUrl}/tryon/products?store=${selectedPlatform}&gender=${gender}&occasion=${selectedOccasion || "casual"}&category=${selectedCategory}&subcategory=${selectedStyle || ""}&mode=normal&page=1&limit=20`;
      
      const res = await fetch(fetchUrl);
      const textResult = await res.text();
      let data: any = {};
      try {
        data = textResult ? JSON.parse(textResult) : {};
      } catch (e) {
        throw new Error("Invalid response from server");
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || "API failed");
      }
      
      if (data?.products?.length > 0) {
        setApiProducts(data.products.map(enrichProductData));
        setHasMoreProducts(data.products.length >= 20);
      } else {
        setApiProducts([]);
        setHasMoreProducts(false);
      }
    } catch (err: any) {
      setProductError(err.message || "Unable to fetch live products from " + selectedPlatform);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [selectedPlatform, selectedCategory, selectedStyle, selectedOccasion, gender]);

  // Load more products for pagination
  const loadMoreProducts = async () => {
    if (!selectedPlatform || !selectedCategory || isLoadingMore || !hasMoreProducts) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const fetchUrl = `${apiUrl}/tryon/products?store=${selectedPlatform}&gender=${gender}&occasion=${selectedOccasion || "casual"}&category=${selectedCategory}&subcategory=${selectedStyle || ""}&mode=normal&page=${nextPage}&limit=20`;
      
      const res = await fetch(fetchUrl);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load more products");
      }
      
      if (data?.products?.length > 0) {
        const newProducts = data.products.map(enrichProductData);
        
        setApiProducts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id));
          const existingUrls = new Set(prev.map((p: any) => p.productUrl));
          const uniqueNew = newProducts.filter((p: any) => !existingIds.has(p.id) && !existingUrls.has(p.productUrl));
          
          setTimeout(() => {
            if (uniqueNew.length === 0 || data.products.length < 20) {
              setHasMoreProducts(false);
            }
          }, 0);
          
          return [...prev, ...uniqueNew];
        });
        
        setCurrentPage(nextPage);
      } else {
        setHasMoreProducts(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Unable to load more products");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load products when reaching Step 5
  useEffect(() => {
    if (step === 5) {
      loadProducts();
    }
  }, [step, loadProducts]);

  // Load history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const token = user ? await (user as any).getIdToken() : "";
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${apiUrl}/tryon/history`, { headers });
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.warn("Failed to load history", err);
      }
    };
    if (user) {
      fetchHistory();
    }
  }, [user]);

  // ─── Import Product ──────────────────────────────────────────────────────
  const handleImportUrl = async () => {
    if (!importUrl) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/tryon/import-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl, gender })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import product.");
      }

      if (data.product) {
        const product = enrichProductData(data.product);
        setApiProducts(prev => {
          // Deduplicate based on ID or productUrl
          const filtered = prev.filter(p => p.id !== product.id && p.productUrl !== product.productUrl);
          return [product, ...filtered];
        });
        setSelectedProduct(product);
        setIsImportedProduct(true);
        if (product.store) {
          setSelectedPlatform(product.store as StoreName);
        }
        setImportUrl(""); // Clear input on success
        toast.success("Product imported successfully!");
      }
    } catch (err: any) {
      setImportError(err.message);
      toast.error(err.message || "Failed to import product.");
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Photo Upload ────────────────────────────────────────────────────────
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const useProfilePhoto = async () => {
    if ((user as any)?.profilePhotoUrl || (user as any)?.photoURL) {
      const url = (user as any)?.profilePhotoUrl || (user as any)?.photoURL;
      setPhotoPreview(url);
      try {
        const blob = await urlToBlob(url);
        setPhotoFile(new File([blob], "profile.jpg", { type: "image/jpeg" }));
      } catch (err) {
        toast.error("Could not load profile photo.");
      }
    } else {
      toast.error("No profile photo available.");
    }
  };

  const { balance } = useWallet();

  // ─── AI Generation ───────────────────────────────────────────────────────
  const startGeneration = async () => {
    if (!photoFile || !selectedProduct) return;
    
    // ★ CRITICAL: Capture the garment URL synchronously at click time,
    //   BEFORE any async operation that could let React re-render and
    //   change selectedProduct state mid-flight.
    const garmentUrl = selectedProduct.imageUrl;
    const garmentName = selectedProduct.name || selectedProduct.title || 'unknown';
    
    console.log("══════════════════════════════════════════════");
    console.log("[VTO-GARMENT] Selected garment at click time:");
    console.log("[VTO-GARMENT] Name:", garmentName);
    console.log("[VTO-GARMENT] URL:", garmentUrl);
    console.log("══════════════════════════════════════════════");
    
    if (vtoStatus !== "AVAILABLE") {
      toast.error("Virtual Try-On is temporarily unavailable. Please try again later.");
      return;
    }
    
    // Server-side authoritative check happens in API, but we prevent request here
    if (balance === null || balance < 1) {
      toast.error("Insufficient credits. Please top up to generate.");
      router.push("/credits");
      return;
    }
    
    navigateStep(7);
    setIsGenerating(true);
    setResultImage(null);
    setAiReview(null);
    setReviewError(null);
    setCurrentSessionId(null);
    setIsSavedToHistory(false);
    setGenStage(0);

    // Fake progress animation for stages
    const intervals = [
      setTimeout(() => setGenStage(1), 2000), // Understanding garment
      setTimeout(() => setGenStage(2), 5000), // Matching
      setTimeout(() => setGenStage(3), 9000), // Generating
      setTimeout(() => setGenStage(4), 14000) // Finalizing
    ];

    try {
      // ★ Use the captured garmentUrl (not selectedProduct.imageUrl which may have changed)
      console.log("[VTO-GARMENT] Fetching garment blob from:", garmentUrl);
      const prodBlob = await urlToBlob(garmentUrl);
      
      // ★ Validate the fetched blob is a real image
      console.log("[VTO-GARMENT] Garment blob size:", prodBlob.size, "bytes");
      console.log("[VTO-GARMENT] Garment blob type:", prodBlob.type);
      if (prodBlob.size < 100) {
        throw new Error("Garment image is invalid or empty. Please re-select the product.");
      }
      
      const prodFile = new File([prodBlob], "product.jpg", { type: prodBlob.type || "image/jpeg" });
      console.log("[VTO-GARMENT] Garment File created:", prodFile.name, prodFile.size, "bytes", prodFile.type);
      
      const token = user ? await (user as any).getIdToken() : undefined;
      const res = await generateTryOn(photoFile, prodFile, token);
      
      let resImg = 
        (res as any).output_image || 
        (res as any).result_image || 
        (res as any).resultImage || 
        (res as any).resultImageUrl || 
        (res as any).result || 
        (Array.isArray((res as any).output) ? (res as any).output[0] : (res as any).output) || 
        (res as any).image_url || 
        (res as any).url || 
        (Array.isArray((res as any).images) ? (res as any).images[0] : null) || 
        (res as any).image;
      if (!resImg) throw new Error("No image returned from AI");
      
      if (typeof resImg === 'string' && !resImg.startsWith('http') && !resImg.startsWith('data:')) {
        if (resImg.startsWith('iVBORw0KGgo')) {
          resImg = `data:image/png;base64,${resImg}`;
        } else {
          resImg = `data:image/jpeg;base64,${resImg}`;
        }
      }
      
      setResultImage(resImg);
      
      // Auto-save to history
      const sessionId = await saveResult(resImg);
      if (sessionId) setCurrentSessionId(sessionId);

      toast.success("Virtual Try-On completed!");
      
      // Start AI Outfit Review in the background
      fetchAiReview(resImg, sessionId);

    } catch (err: any) {
      toast.error(err.message || "Virtual Try-On failed.");
      navigateStep(6); // kick back to upload
    } finally {
      intervals.forEach(clearTimeout);
      setIsGenerating(false);
    }
  };

  // ─── Fetch AI Review ───────────────────────────────────────────────────────
  const fetchAiReview = async (generatedImage: string, sessionId?: string | null) => {
    setIsReviewLoading(true);
    setReviewError(null);
    try {
      const token = user ? await (user as any).getIdToken() : "";
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      const payload = {
        resultImageUrl: generatedImage,
        product: selectedProduct
      };
      
      const res = await fetch(`${apiUrl}/tryon/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("AI styling analysis is temporarily unavailable.");
      const data = await res.json();
      setAiReview(data.review);
      
      // If we have a sessionId, update the history record with the review
      if (sessionId && data.review) {
        await fetch(`${apiUrl}/tryon/history/${sessionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ review: data.review })
        }).catch(err => console.error("Failed to append review to history:", err));
      }
    } catch (e: any) {
      setReviewError(e.message || "AI styling analysis is temporarily unavailable.");
    } finally {
      setIsReviewLoading(false);
    }
  };

  // ─── Save History ────────────────────────────────────────────────────────
  const saveResult = async (overrideImage?: string | React.MouseEvent): Promise<string | null> => {
    const finalImage = typeof overrideImage === 'string' ? overrideImage : resultImage;
    if (!finalImage || !selectedProduct) return null;
    // Prevent duplicate saves
    if (isSavedToHistory && typeof overrideImage !== 'string') {
      toast.info("Already saved to your Try-On History.");
      return currentSessionId;
    }
    try {
      const token = user ? await (user as any).getIdToken() : "";
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const payload = {
        resultImageUrl: finalImage,
        personImageUrl: photoPreview,
        clothingImageUrl: selectedProduct.imageUrl,
        product: selectedProduct,
        metadata: {
          platform: selectedPlatform,
          category: selectedCategory,
          occasion: selectedOccasion
        }
      };
      
      const res = await fetch(`${apiUrl}/tryon/history`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success("Look saved to your Try-On History.");
        setIsSavedToHistory(true);
        // refresh history
        const getHeaders: Record<string, string> = {};
        if (token) getHeaders['Authorization'] = `Bearer ${token}`;
        
        const updated = await fetch(`${apiUrl}/tryon/history`, { headers: getHeaders }).then(r => r.json());
        setHistory(updated.history || []);
        return data.sessionId;
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      toast.error("Could not save to history.");
      return null;
    }
  };

  // ─── Framer Variants ─────────────────────────────────────────────────────
  const slideVariants = {
    initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 20 : -20 }),
    animate: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -20 : 20 }),
  };

  async function handleGlobalSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;

    const isUrl = trimmed.startsWith("http") || trimmed.includes("amzn.in/") || trimmed.includes("amazon.in/") || trimmed.includes("flipkart.com/") || trimmed.includes("myntra.com/") || trimmed.includes("ajio.com/") || trimmed.includes("meesho.com/");
    if (!isUrl) {
      toast.error("Please enter a valid product link.");
      return;
    }

    let detectedPlatform: StoreName | null = null;
    const lowerQ = trimmed.toLowerCase();
    if (lowerQ.includes("amazon") || lowerQ.includes("amzn.in")) detectedPlatform = "amazon";
    else if (lowerQ.includes("flipkart")) detectedPlatform = "flipkart";
    else if (lowerQ.includes("myntra")) detectedPlatform = "myntra";
    else if (lowerQ.includes("ajio")) detectedPlatform = "ajio";
    else if (lowerQ.includes("meesho")) detectedPlatform = "meesho";

    if (!detectedPlatform) {
      toast.error("This product platform is not supported yet.");
      return;
    }

    const toastId = toast.loading(`Importing from ${STORE_CONFIG[detectedPlatform].label}...`);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/tryon/import-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, gender })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not import this product. Please check the link and try again.");
      }

      if (data.product) {
        const product = enrichProductData(data.product);
        setApiProducts(prev => {
          const filtered = prev.filter(p => p.id !== product.id && p.productUrl !== product.productUrl);
          return [product, ...filtered];
        });
        setSelectedPlatform(detectedPlatform);
        setSelectedProduct(product);
        setIsImportedProduct(true);
        toast.success("Product imported successfully!", { id: toastId });
        navigateStep(5);
      } else {
        throw new Error("Could not import this product. Please check the link and try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not import this product. Please check the link and try again.", { id: toastId });
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-[#FAF8F5] min-h-screen">
      <TopNav onSearch={handleGlobalSearch} />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 flex flex-col relative pb-32">
        
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-[#1A1A1A] font-heading flex items-center gap-3">
              <Shirt className="w-8 h-8 text-[#C4727F]" />
              Virtual Try-On Studio
            </h1>
            <p className="text-[14px] text-[#6B6B6B] mt-1">Mix & match premium outfits directly in the AI workspace</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white p-1 rounded-full border border-[#E8E0D8] shadow-sm">
              <button 
                onClick={() => setGender('male')}
                className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${gender === 'male' ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
              >
                Men
              </button>
              <button 
                onClick={() => setGender('female')}
                className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${gender === 'female' ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}
              >
                Women
              </button>
            </div>
            {user && (
              <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-[#E8E0D8] shadow-sm">
                <img src={(user as any).profilePhotoUrl || (user as any).photoURL || "https://ui-avatars.com/api/?name=User"} alt="User" className="w-8 h-8 rounded-full" />
                <span className="text-[14px] font-bold text-[#1A1A1A]">{(user as any).name || (user as any).displayName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Animated Step Indicator */}
        <div className="w-full bg-white rounded-full p-2 border border-[#E8E0D8] shadow-sm mb-10 flex items-center justify-between relative z-10 overflow-hidden">
          {STEPS.map((s, idx) => {
            const isCompleted = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1 relative z-10">
                  <motion.div 
                    initial={false}
                    animate={{
                      scale: isActive ? 1.05 : 1,
                      backgroundColor: isActive ? "#C4727F" : isCompleted ? "#C4727F" : "#F3F0EA",
                      color: (isActive || isCompleted) ? "#FFF" : "#6B6B6B",
                      boxShadow: isActive ? "0 0 15px rgba(196,114,127,0.3)" : "none"
                    }}
                    transition={{ duration: 0.3 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                  </motion.div>
                  <span className={`text-[11px] font-bold mt-1 ${isActive ? "text-[#1A1A1A]" : "text-[#6B6B6B]"}`}>
                    {s.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="h-[2px] bg-[#F3F0EA] flex-1 mx-2 relative overflow-hidden">
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-[#C4727F]" 
                      initial={{ width: 0 }}
                      animate={{ width: step > idx + 1 ? "100%" : "0%" }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content Area with AnimatePresence */}
        <div className="flex-1 relative min-h-[600px]">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full relative"
            >
              
              {/* ───────────────────────────────────────────────────────── */}
              {/* STEP 1: CHOOSE PLATFORM OR IMPORT LINK */}
              {/* ───────────────────────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-10">
                  {/* Option B: Choose Platform */}
                  <div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {Object.entries(STORE_CONFIG).map(([key, platform]) => (
                        <motion.button
                          whileHover={{ scale: platform.available ? 1.03 : 1 }}
                          whileTap={{ scale: platform.available ? 0.98 : 1 }}
                          key={key}
                          onClick={() => {
                            if (platform.available) {
                              setSelectedPlatform(key as StoreName);
                              setIsImportedProduct(false);
                            }
                          }}
                          className={`relative h-[140px] rounded-[24px] border-2 bg-white flex flex-col items-center justify-center gap-3 transition-all ${
                            selectedPlatform === key 
                              ? "border-[#C4727F] shadow-[0_8px_30px_rgba(196,114,127,0.15)]" 
                              : platform.available ? "border-[#E8E0D8] hover:border-[#C4727F]/30 shadow-sm" : "border-[#E8E0D8] opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="w-16 h-16 rounded-full bg-[#FAF8F5] flex items-center justify-center text-[24px] font-bold text-[#1A1A1A] font-heading">
                            {platform.label.charAt(0)}
                          </div>
                          <span className="text-[14px] font-bold text-[#1A1A1A] tracking-wide">{platform.label}</span>
                          {!platform.available && (
                            <span className="absolute top-3 right-3 bg-[#FAF1F2] text-[#C4727F] text-[10px] font-bold px-2 py-1 rounded-full">
                              SOON
                            </span>
                          )}
                          {selectedPlatform === key && !isImportedProduct && (
                            <div className="absolute top-3 right-3 w-6 h-6 bg-[#C4727F] rounded-full flex items-center justify-center text-white">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>

                    <div className="flex justify-end mt-10">
                      <button 
                        disabled={!selectedPlatform || isImportedProduct}
                        onClick={() => navigateStep(2)}
                        className="bg-[#C4727F] hover:bg-[#a65d6a] text-white px-8 py-3 rounded-full font-bold text-[14px] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        Next: Category <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────── */}
              {/* STEP 2: CHOOSE CATEGORY */}
              {/* ───────────────────────────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-[20px] font-bold text-[#1A1A1A]">Choose Category ({gender === "male" ? "Men" : "Women"})</h2>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {(gender === "male" ? MEN_CATEGORIES : WOMEN_CATEGORIES).map((cat, idx) => (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`h-[120px] rounded-[24px] border-2 bg-white flex flex-col items-center justify-center gap-3 transition-all ${
                          selectedCategory === cat.id 
                            ? "border-[#C4727F] shadow-[0_8px_30px_rgba(196,114,127,0.1)]" 
                            : "border-[#E8E0D8] hover:border-[#C4727F]/30 shadow-sm"
                        }`}
                      >
                        <span className="text-[32px]">{cat.img}</span>
                        <span className="text-[13px] font-bold text-[#1A1A1A] text-center px-2">{cat.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex justify-between mt-10">
                    <button onClick={() => navigateStep(1)} className="px-6 py-3 rounded-full font-bold text-[#1A1A1A] border border-[#E8E0D8] bg-white hover:bg-[#FAF8F5] transition-colors text-[14px]">
                      ← Back
                    </button>
                    <button 
                      disabled={!selectedCategory}
                      onClick={() => navigateStep(SUBCATEGORIES[selectedCategory!] ? 3 : 4)}
                      className="bg-[#C4727F] hover:bg-[#a65d6a] text-white px-8 py-3 rounded-full font-bold text-[14px] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────── */}
              {/* STEP 3: CHOOSE STYLE (Subcategory) */}
              {/* ───────────────────────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-[20px] font-bold text-[#1A1A1A]">Choose Style ({(gender === "male" ? MEN_CATEGORIES : WOMEN_CATEGORIES).find(c=>c.id===selectedCategory)?.label})</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {SUBCATEGORIES[selectedCategory!]?.map((sub, idx) => (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={sub.id}
                        onClick={() => setSelectedStyle(sub.id)}
                        className={`p-4 rounded-[16px] border-2 bg-white flex items-center justify-center transition-all ${
                          selectedStyle === sub.id 
                            ? "border-[#C4727F] text-[#C4727F] shadow-[0_4px_20px_rgba(196,114,127,0.1)] bg-[#FAF1F2]" 
                            : "border-[#E8E0D8] text-[#1A1A1A] hover:border-[#C4727F]/30"
                        }`}
                      >
                        <span className="text-[14px] font-bold">{sub.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex justify-between mt-10">
                    <button onClick={() => navigateStep(2)} className="px-6 py-3 rounded-full font-bold text-[#1A1A1A] border border-[#E8E0D8] bg-white hover:bg-[#FAF8F5] transition-colors text-[14px]">
                      ← Back
                    </button>
                    <button 
                      disabled={!selectedStyle}
                      onClick={() => navigateStep(4)}
                      className="bg-[#C4727F] hover:bg-[#a65d6a] text-white px-8 py-3 rounded-full font-bold text-[14px] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      Next: Occasion <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────── */}
              {/* STEP 4: CHOOSE OCCASION */}
              {/* ───────────────────────────────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-6">
                  <h2 className="text-[20px] font-bold text-[#1A1A1A]">Choose Occasion</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {OCCASIONS.map((occ, idx) => (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={occ.id}
                        onClick={() => setSelectedOccasion(occ.id)}
                        className={`p-4 rounded-[16px] border-2 bg-white flex items-center justify-center transition-all ${
                          selectedOccasion === occ.id 
                            ? "border-[#C4727F] text-[#C4727F] shadow-[0_4px_20px_rgba(196,114,127,0.1)] bg-[#FAF1F2]" 
                            : "border-[#E8E0D8] text-[#1A1A1A] hover:border-[#C4727F]/30"
                        }`}
                      >
                        <span className="text-[14px] font-bold">{occ.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex justify-between mt-10">
                    <button onClick={() => navigateStep(SUBCATEGORIES[selectedCategory!] ? 3 : 2)} className="px-6 py-3 rounded-full font-bold text-[#1A1A1A] border border-[#E8E0D8] bg-white hover:bg-[#FAF8F5] transition-colors text-[14px]">
                      ← Back
                    </button>
                    <button 
                      disabled={!selectedOccasion}
                      onClick={() => navigateStep(5)}
                      className="bg-[#C4727F] hover:bg-[#a65d6a] text-white px-8 py-3 rounded-full font-bold text-[14px] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      Next: Browse Products <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────── */}
              {/* STEP 5: BROWSE REAL PRODUCTS / CONFIRM IMPORT */}
              {/* ───────────────────────────────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 md:p-8 rounded-[24px] border border-[#E8E0D8] mb-8 shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F5] to-transparent pointer-events-none" />
                    <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-3 flex items-center gap-2 relative z-10">
                      <LinkIcon className="w-4 h-4 text-[#C4727F]" /> Paste Product Link
                    </h2>
                    <div className="relative max-w-2xl z-10 group">
                      <input 
                        type="url"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="Paste Amazon, Flipkart, Myntra, AJIO or Meesho link..."
                        className="w-full bg-[#FAF8F5] border-2 border-transparent focus:bg-white focus:border-[#C4727F] focus:ring-4 focus:ring-[#C4727F]/10 rounded-full py-3.5 pl-6 pr-[140px] text-[14px] text-[#1A1A1A] placeholder-[#9B9B9B] transition-all outline-none group-hover:border-[#E8E0D8]"
                        disabled={isImporting}
                      />
                      <div className="absolute right-1.5 top-1.5 bottom-1.5">
                        <button 
                          onClick={handleImportUrl}
                          disabled={!importUrl || isImporting}
                          className="h-full bg-[#1A1A1A] hover:bg-black text-white px-5 rounded-full font-bold text-[13px] transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_4px_12px_rgba(26,26,26,0.15)] cursor-pointer"
                        >
                          {isImporting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Importing...
                            </>
                          ) : (
                            <>
                              Import <ChevronRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {isImportedProduct && selectedProduct ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="bg-white p-6 sm:p-8 rounded-[28px] border-2 border-[#E8E0D8] shadow-[0_24px_80px_rgba(0,0,0,0.08)] flex flex-col md:flex-row gap-8 items-center relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-[#C4727F] to-[#D4949E] text-white text-[11px] uppercase tracking-widest font-bold px-5 py-2 rounded-bl-[20px] shadow-sm z-10">IMPORTED</div>
                      <div className="w-full md:w-[280px] md:min-w-[220px] aspect-square rounded-[20px] overflow-hidden bg-[#F9F9F9] border border-[#E8E0D8] shadow-inner relative group flex items-center justify-center">
                        <img 
                          src={selectedProduct.imageUrl} 
                          alt={selectedProduct.name} 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                            if (!target.src.includes("/proxy-image")) {
                              target.src = `${apiUrl}/tryon/proxy-image?url=${encodeURIComponent(selectedProduct.imageUrl)}`;
                            }
                          }}
                          className="w-full h-full object-contain p-2 transition-transform duration-700 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                      <div className="flex-1 flex flex-col pt-3 w-full justify-between min-h-[280px]">
                        <div>
                          <span className="text-[11px] font-bold text-[#C4727F] tracking-[0.2em] uppercase mb-3 block">{selectedProduct.brand || STORE_CONFIG[selectedPlatform || 'amazon']?.label || "Premium Brand"}</span>
                          <h2 className="text-[24px] sm:text-[26px] font-bold text-[#1A1A1A] font-heading leading-tight mb-5">{selectedProduct.name}</h2>
                          <div className="flex items-center gap-4 mb-6 bg-[#FAF8F5] p-4 rounded-2xl w-fit">
                            <span className="text-[28px] font-bold text-[#1A1A1A] tracking-tight">{selectedProduct.price}</span>
                            {selectedProduct.originalPrice && <span className="text-[15px] text-[#9B9B9B] line-through font-medium">{selectedProduct.originalPrice}</span>}
                          </div>
                          <p className="text-[14px] text-[#6B6B6B] mb-8 leading-relaxed line-clamp-3">{selectedProduct.description || "Premium imported outfit ready for virtual try-on."}</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-auto w-full relative z-20">
                          <a 
                            href={selectedProduct.productUrl ? (selectedProduct.productUrl.startsWith("http") ? selectedProduct.productUrl : `https://${selectedProduct.productUrl}`) : "#"} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => {
                              const dest = selectedProduct.productUrl ? (selectedProduct.productUrl.startsWith("http") ? selectedProduct.productUrl : `https://${selectedProduct.productUrl}`) : "";
                              if (dest) {
                                window.open(dest, "_blank", "noopener,noreferrer");
                              }
                            }}
                            className="flex-1 w-full px-6 py-4 rounded-full font-bold text-[#1A1A1A] border-2 border-[#E8E0D8] bg-white hover:bg-[#FAF8F5] hover:border-[#1A1A1A] transition-all text-[14px] text-center flex items-center justify-center gap-2 group cursor-pointer shadow-sm active:scale-[0.98]"
                          >
                             Buy on {STORE_CONFIG[selectedPlatform || 'amazon']?.label || "Store"} <ExternalLink className="w-4 h-4 text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors" />
                          </a>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigateStep(6);
                            }} 
                            className="flex-1 w-full bg-[#1A1A1A] hover:bg-black text-white px-6 py-4 rounded-full font-bold text-[14px] transition-all shadow-[0_8px_24px_rgba(26,26,26,0.25)] hover:shadow-[0_12px_32px_rgba(26,26,26,0.35)] hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                          >
                             <Sparkles className="w-4 h-4 text-[#C4727F]" /> Virtual Try-On
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h2 className="text-[20px] font-bold text-[#1A1A1A]">
                          Showing {(() => {
                            const catLabel = (gender === "male" ? MEN_CATEGORIES : WOMEN_CATEGORIES).find(c => c.id === selectedCategory)?.label || "";
                            const occLabel = selectedOccasion ? ` for ${OCCASIONS.find(o => o.id === selectedOccasion)?.label || ""}` : "";
                            const hasSubcategories = selectedCategory && SUBCATEGORIES[selectedCategory];
                            const styleObj = hasSubcategories ? SUBCATEGORIES[selectedCategory].find(s => s.id === selectedStyle) : null;
                            const styleLabel = styleObj ? `${styleObj.label} ` : "";
                            return `${styleLabel}${catLabel}${occLabel}`;
                          })()}
                        </h2>
                        <div className="flex items-center gap-2 bg-[#FAF1F2] px-3 py-1.5 rounded-full text-[12px] font-bold text-[#C4727F]">
                          <Sparkles className="w-4 h-4" /> Live from {STORE_CONFIG[selectedPlatform!]?.label}
                        </div>
                      </div>

                      {isLoadingProducts ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 border-4 border-[#E8E0D8] border-t-[#C4727F] rounded-full animate-spin mb-4"></div>
                          <p className="text-[15px] font-bold text-[#1A1A1A]">Searching real products...</p>
                          <p className="text-[13px] text-[#6B6B6B]">Connecting to {STORE_CONFIG[selectedPlatform!]?.label}</p>
                        </div>
                      ) : productError ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                          <AlertCircle className="w-12 h-12 text-[#C4727F] mb-4" />
                          <p className="text-[15px] font-bold text-[#1A1A1A] mb-2">{productError}</p>
                          <button onClick={loadProducts} className="text-[#C4727F] font-bold text-[13px] hover:underline">Try Again</button>
                        </div>
                      ) : apiProducts.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                          <ShoppingBag className="w-12 h-12 text-[#E8E0D8] mb-4" />
                          <p className="text-[15px] font-bold text-[#1A1A1A]">No products found</p>
                          <p className="text-[13px] text-[#6B6B6B]">Try changing your style or occasion filters.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          {apiProducts.map((prod, idx) => (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              whileHover={{ y: -4 }}
                              key={prod.id}
                              onClick={() => setSelectedProduct(prod)}
                              className={`bg-white rounded-[20px] overflow-hidden border-2 cursor-pointer transition-all ${
                                selectedProduct?.id === prod.id 
                                  ? "border-[#C4727F] shadow-[0_8px_30px_rgba(196,114,127,0.15)] ring-4 ring-[#C4727F]/10" 
                                  : "border-[#E8E0D8] shadow-sm hover:shadow-md hover:border-[#C4727F]/30"
                              }`}
                            >
                              <div className="relative aspect-[3/4] bg-[#F9F9F9] overflow-hidden">
                                <img src={prod.imageUrl} alt={prod.name} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover mix-blend-multiply transition-transform duration-500 hover:scale-105" loading="lazy" />
                                {selectedProduct?.id === prod.id && (
                                  <div className="absolute inset-0 bg-[#C4727F]/10 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-[#C4727F] rounded-full flex items-center justify-center text-white shadow-lg">
                                      <Check className="w-6 h-6" />
                                    </div>
                                  </div>
                                )}
                                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-[8px] flex items-center gap-1 text-[11px] font-bold text-[#1A1A1A] shadow-sm">
                                  <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" /> {prod.rating}
                                </div>
                              </div>
                              <div className="p-4">
                                <p className="text-[11px] font-bold text-[#C4727F] uppercase tracking-wider mb-1">{prod.brand}</p>
                                <p className="text-[13px] text-[#1A1A1A] font-medium line-clamp-1 mb-2">{prod.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[15px] font-bold text-[#1A1A1A]">{prod.price}</span>
                                  {prod.originalPrice && (
                                    <span className="text-[11px] text-[#6B6B6B] line-through">{prod.originalPrice}</span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Pagination: View More */}
                      {apiProducts.length > 0 && (
                        <div className="mt-10 flex justify-center pb-8">
                          {hasMoreProducts ? (
                            <button 
                              onClick={loadMoreProducts}
                              disabled={isLoadingMore}
                              className="px-8 py-3 bg-white border border-[#E8E0D8] rounded-full text-[14px] font-bold text-[#1A1A1A] hover:bg-[#F9F9F9] hover:border-[#D0D0D0] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                            >
                              {isLoadingMore ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></div>
                                  Loading more...
                                </>
                              ) : (
                                <>View More</>
                              )}
                            </button>
                          ) : (
                            <button disabled className="px-8 py-3 bg-[#F9F9F9] border border-[#E8E0D8] rounded-full text-[14px] font-bold text-[#A0A0A0] cursor-not-allowed shadow-sm">
                                All Products Loaded
                            </button>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-between mt-10">
                        <button onClick={() => navigateStep(4)} className="px-6 py-3 rounded-full font-bold text-[#1A1A1A] border border-[#E8E0D8] bg-white hover:bg-[#FAF8F5] transition-colors text-[14px]">
                          ← Back
                        </button>
                        <button 
                          disabled={!selectedProduct}
                          onClick={() => navigateStep(6)}
                          className="bg-[#C4727F] hover:bg-[#a65d6a] text-white px-8 py-3 rounded-full font-bold text-[14px] transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          Next: Upload Photo <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────── */}
              {/* STEP 6: UPLOAD PHOTO */}
              {/* ───────────────────────────────────────────────────────── */}
              {step === 6 && (
                <div className="space-y-6">
                  <h2 className="text-[20px] font-bold text-[#1A1A1A]">Upload Your Photo</h2>
                  
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Left: Upload Zone */}
                    <div className="flex-1">
                      {photoPreview ? (
                        <div className="relative rounded-[24px] overflow-hidden border border-[#E8E0D8] aspect-[3/4] max-w-sm mx-auto shadow-md">
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-center gap-4">
                            <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); }} className="bg-white text-[#1A1A1A] px-4 py-2 rounded-full text-[12px] font-bold hover:bg-gray-100 flex items-center gap-2">
                              <RotateCcw className="w-4 h-4" /> Replace
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[400px] border-2 border-dashed border-[#E8E0D8] rounded-[24px] bg-white flex flex-col items-center justify-center relative hover:border-[#C4727F]/50 hover:bg-[#FAF1F2]/50 transition-colors">
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <Upload className="w-10 h-10 text-[#C4727F] mb-4" />
                          <p className="text-[16px] font-bold text-[#1A1A1A] mb-2">Drag & drop or click to upload</p>
                          <p className="text-[13px] text-[#6B6B6B] mb-6">JPG, PNG, WEBP • Max 10MB</p>
                          <button onClick={useProfilePhoto} className="relative z-10 px-5 py-2.5 rounded-full border border-[#E8E0D8] bg-white text-[13px] font-bold text-[#1A1A1A] hover:bg-[#FAF8F5] flex items-center gap-2 shadow-sm">
                            <UserCircle className="w-4 h-4" /> Use Profile Photo
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right: Guidelines */}
                    <div className="w-full md:w-[350px] bg-white rounded-[24px] p-6 border border-[#E8E0D8] shadow-sm h-fit">
                      <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Photo Guidelines</h3>
                      <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-[#C4727F]" />
                          </div>
                          <span className="text-[13px] text-[#6B6B6B]">Use clear front-facing photo</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-[#C4727F]" />
                          </div>
                          <span className="text-[13px] text-[#6B6B6B]">Good natural lighting</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-[#C4727F]" />
                          </div>
                          <span className="text-[13px] text-[#6B6B6B]">Stand straight</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-[#C4727F]" />
                          </div>
                          <span className="text-[13px] text-[#6B6B6B]">No sunglasses or mask</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-10">
                    <button onClick={() => navigateStep(5)} className="px-6 py-3 rounded-full font-bold text-[#1A1A1A] border border-[#E8E0D8] bg-white hover:bg-[#FAF8F5] transition-colors text-[14px]">
                      ← Back
                    </button>
                    
                    <div className="flex items-center gap-4">
                      {balance !== null && balance <= 2 && (
                        <span className="text-[13px] font-bold text-[#C4727F] animate-pulse">
                          Only {balance} credit{balance === 1 ? '' : 's'} left
                        </span>
                      )}
                      
                      {(balance === null || balance < 1) ? (
                        <button 
                          onClick={() => router.push("/credits")}
                          className="bg-[#C4727F] hover:bg-[#a65d6a] text-white px-8 py-3 rounded-full font-bold text-[14px] transition-colors flex items-center gap-2 shadow-[0_4px_15px_rgba(196,114,127,0.3)]"
                        >
                          <Zap className="w-4 h-4" /> Get Credits
                        </button>
                      ) : vtoStatus === "CHECKING" ? (
                        <button 
                          disabled
                          className="bg-[#1A1A1A] hover:bg-black text-white px-8 py-3 rounded-full font-bold text-[14px] transition-colors opacity-50 cursor-not-allowed flex items-center gap-2"
                        >
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Checking Availability...
                        </button>
                      ) : vtoStatus === "UNAVAILABLE" ? (
                        <div className="flex flex-col items-end">
                          <button 
                            disabled
                            className="bg-[#F3F0EA] text-[#9B9B9B] px-8 py-3 rounded-full font-bold text-[14px] transition-colors cursor-not-allowed flex items-center gap-2"
                          >
                            <AlertCircle className="w-4 h-4" /> Server Offline
                          </button>
                          <span className="text-[11px] text-[#C4727F] font-medium mt-2">Virtual Try-On is temporarily unavailable. Please try again later.</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            if (!photoFile) {
                              toast.error("Please upload or select your photo first!");
                              return;
                            }
                            startGeneration();
                          }}
                          className={`px-8 py-3 rounded-full font-bold text-[14px] transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(26,26,26,0.3)] cursor-pointer ${
                            photoFile 
                              ? "bg-[#1A1A1A] hover:bg-black text-white active:scale-95" 
                              : "bg-[#1A1A1A]/70 hover:bg-[#1A1A1A] text-white"
                          }`}
                        >
                          <Sparkles className="w-4 h-4 text-[#C4727F]" /> Try On — 1 Credit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────── */}
              {/* STEP 7: TRY-ON RESULT */}
              {/* ───────────────────────────────────────────────────────── */}
              {step === 7 && (
                <div className="space-y-6">
                  {isGenerating ? (
                    <div className="bg-white rounded-[32px] border border-[#E8E0D8] p-8 md:p-12 max-w-3xl mx-auto shadow-sm overflow-hidden">
                      {/* Premium shimmer progress bar */}
                      <div className="w-full h-1.5 bg-[#F3F0EA] rounded-full mb-10 overflow-hidden">
                        <motion.div 
                          className="h-full rounded-full bg-gradient-to-r from-[#C4727F] via-[#D4949E] to-[#C4727F]"
                          initial={{ width: "0%" }}
                          animate={{ width: genStage >= 4 ? "95%" : `${Math.min(20 + genStage * 20, 90)}%` }}
                          transition={{ duration: 1.5, ease: "easeInOut" }}
                          style={{ backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }}
                        />
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-center gap-10">
                        {/* Left: Overlapping input images with subtle animation */}
                        <div className="relative w-44 h-56 flex-shrink-0">
                          <motion.img 
                            initial={{ x: -16, opacity: 0, rotate: -8 }}
                            animate={{ x: 0, opacity: 1, rotate: -4 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            src={photoPreview!} 
                            alt="Your photo"
                            className="absolute inset-0 w-full h-full object-cover rounded-[16px] shadow-lg border-[3px] border-white z-10" 
                          />
                          <motion.div 
                            initial={{ x: 16, opacity: 0, rotate: 8 }}
                            animate={{ x: 28, y: 24, opacity: 1, rotate: 4 }}
                            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                            className="absolute inset-0 w-full h-full bg-white rounded-[16px] shadow-lg border border-[#E8E0D8] overflow-hidden z-20 flex items-center p-2"
                          >
                            <img src={selectedProduct?.imageUrl} alt="Garment" referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-contain mix-blend-multiply" />
                          </motion.div>
                        </div>

                        {/* Right: Premium status with refined text */}
                        <div className="flex-1 space-y-7 w-full">
                          <div>
                            <motion.h2 
                              key={genStage}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className="text-[22px] font-bold text-[#1A1A1A] font-heading mb-1"
                            >
                              {["Preparing your look...", "Understanding your fit...", "Fitting the garment...", "Rendering your look...", "Almost ready..."][genStage]}
                            </motion.h2>
                            <p className="text-[13px] text-[#9B9B9B]">Our AI is tailoring this outfit to you</p>
                          </div>
                          
                          <div className="space-y-3">
                            {[
                              { text: "Analyzing your photo", icon: "📷" },
                              { text: "Understanding garment details", icon: "👔" },
                              { text: "Matching fit & proportions", icon: "📐" },
                              { text: "Generating your look", icon: "✨" },
                              { text: "Final touches", icon: "🎨" }
                            ].map((item, i) => (
                              <motion.div 
                                key={i} 
                                className="flex items-center gap-3"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                              >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-all duration-500 ${
                                  genStage > i ? "bg-[#E8F5E9] text-[#C4727F] scale-100" : 
                                  genStage === i ? "bg-[#FAF1F2] text-[#C4727F] scale-105" : "bg-[#F3F0EA] text-[#E8E0D8] scale-95"
                                }`}>
                                  {genStage > i ? <Check className="w-3.5 h-3.5" /> : 
                                   genStage === i ? <motion.div className="w-2 h-2 bg-[#C4727F] rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} /> :
                                   <span className="text-[11px]">{item.icon}</span>}
                                </div>
                                <span className={`text-[13px] font-medium transition-colors duration-300 ${
                                  genStage > i ? "text-[#6B6B6B]" : genStage === i ? "text-[#1A1A1A] font-bold" : "text-[#D4D4D4]"
                                }`}>
                                  {item.text}
                                </span>
                              </motion.div>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 text-[12px] text-[#9B9B9B] pt-2 border-t border-[#F3F0EA]">
                            <Clock className="w-3.5 h-3.5" /> Typically takes 10–20 seconds
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : resultImage ? (
                    <>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col lg:flex-row gap-8"
                    >
                      {/* Left: Generated Image with Before/After */}
                      <div className="flex-1 space-y-4">
                        {/* Result Image */}
                        <AntiGravityWrapper intensity={5}>
                          <motion.div 
                            initial={{ opacity: 0, filter: "blur(12px)", scale: 0.97 }}
                            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="bg-white p-3 sm:p-4 rounded-[28px] border border-[#E8E0D8] shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
                          >
                            <img src={resultImage} alt="Your AI-generated look" className="w-full rounded-[20px] object-contain max-h-[600px] mx-auto pointer-events-none" />
                          </motion.div>
                        </AntiGravityWrapper>

                        {/* Before / After comparison strip */}
                        <motion.div 
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-white rounded-[20px] border border-[#E8E0D8] p-4 shadow-sm"
                        >
                          <p className="text-[11px] font-bold text-[#9B9B9B] uppercase tracking-wider mb-3">Before & After</p>
                          <div className="flex gap-3 items-stretch">
                            <div className="flex-1 relative rounded-[12px] overflow-hidden border border-[#E8E0D8] aspect-[3/4] max-h-[200px]">
                              <img src={photoPreview!} alt="Original photo" className="w-full h-full object-cover" />
                              <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">Before</span>
                            </div>
                            <div className="flex items-center">
                              <ChevronRight className="w-5 h-5 text-[#D4949E]" />
                            </div>
                            <div className="flex-1 relative rounded-[12px] overflow-hidden border border-[#C4727F]/30 aspect-[3/4] max-h-[200px] ring-2 ring-[#C4727F]/10">
                              <img src={resultImage} alt="AI result" className="w-full h-full object-cover" />
                              <span className="absolute bottom-2 left-2 bg-[#C4727F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">After</span>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Right: Details & Actions */}
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="w-full lg:w-[380px] space-y-5"
                      >
                        <div className="bg-white rounded-[24px] p-6 border border-[#E8E0D8] shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <span className="bg-[#E8F5E9] text-[#C4727F] px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> AI Generated
                            </span>
                          </div>
                          <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-1 font-heading">{selectedProduct?.brand}</h3>
                          <p className="text-[14px] text-[#6B6B6B] line-clamp-2 mb-4">{selectedProduct?.name}</p>
                          <p className="text-[24px] font-bold text-[#1A1A1A] mb-6">{selectedProduct?.price}</p>
                          
                          <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between text-[13px] border-b border-[#F3F0EA] pb-2">
                              <span className="text-[#6B6B6B]">Category</span>
                              <span className="font-bold text-[#1A1A1A]">{(gender === "male" ? MEN_CATEGORIES : WOMEN_CATEGORIES).find(c=>c.id===selectedCategory)?.label}</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px] border-b border-[#F3F0EA] pb-2">
                              <span className="text-[#6B6B6B]">Style</span>
                              <span className="font-bold text-[#1A1A1A]">{selectedStyle || "-"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px] border-b border-[#F3F0EA] pb-2">
                              <span className="text-[#6B6B6B]">Store</span>
                              <span className="font-bold text-[#1A1A1A] capitalize">{selectedPlatform}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={saveResult} disabled={isSavedToHistory} className={`py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-colors active:scale-[0.97] ${isSavedToHistory ? 'bg-[#E8F5E9] border border-[#A5D6A7] text-[#2E7D32] cursor-default' : 'bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1A1A] hover:bg-[#F3F0EA]'}`}>
                              {isSavedToHistory ? <><Check className="w-4 h-4" /> Saved</> : <><Heart className="w-4 h-4" /> Save</>}
                            </button>
                            <a href={resultImage} download="mityra-look.jpg" className="bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1A1A] py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#F3F0EA] transition-colors active:scale-[0.97]">
                              <Download className="w-4 h-4" /> Download
                            </a>
                          </div>
                          
                          <a href={selectedProduct?.productUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-[#C4727F] hover:bg-[#a65d6a] text-white py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98]">
                            <ShoppingBag className="w-4 h-4" /> Buy on {STORE_CONFIG[selectedPlatform!]?.label}
                          </a>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => { setResultImage(null); navigateStep(5); }} className="border border-[#E8E0D8] bg-white text-[#1A1A1A] py-3.5 rounded-xl font-bold text-[13px] hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-2 active:scale-[0.97]">
                            <RotateCcw className="w-4 h-4" /> New Outfit
                          </button>
                          <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); setResultImage(null); navigateStep(6); }} className="border border-[#E8E0D8] bg-white text-[#1A1A1A] py-3.5 rounded-xl font-bold text-[13px] hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-2 active:scale-[0.97]">
                            <Camera className="w-4 h-4" /> New Photo
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* AI Outfit Review Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-8 bg-white rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden"
                    >
                      <div className="bg-[#FAF8F5] p-5 border-b border-[#E8E0D8] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#C4727F] text-white flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h3 className="text-[18px] font-bold text-[#1A1A1A] font-heading">AI Outfit Review</h3>
                      </div>
                      <div className="p-6 md:p-8">
                        {isReviewLoading ? (
                          <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="w-10 h-10 border-4 border-[#F3F0EA] border-t-[#C4727F] rounded-full animate-spin"></div>
                            <p className="text-[15px] font-bold text-[#1A1A1A]">AI is analyzing your outfit...</p>
                          </div>
                        ) : reviewError ? (
                          <div className="flex flex-col items-center justify-center py-8 space-y-3">
                            <AlertCircle className="w-8 h-8 text-[#9B9B9B]" />
                            <p className="text-[14px] text-[#6B6B6B]">{reviewError}</p>
                          </div>
                        ) : aiReview ? (
                          <div className="space-y-8">
                            {/* Score & Explanation */}
                            <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-8 border-[#F3F0EA] relative">
                                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="46" fill="transparent" stroke="#E8E0D8" strokeWidth="8" />
                                  <circle cx="50" cy="50" r="46" fill="transparent" stroke={aiReview.score >= 8 ? "#4CAF50" : aiReview.score >= 5 ? "#FF9800" : "#F44336"} strokeWidth="8" strokeDasharray={`${(aiReview.score / 10) * 289} 289`} strokeLinecap="round" />
                                </svg>
                                <span className="text-[32px] font-bold text-[#1A1A1A]">{aiReview.score}</span>
                                <span className="text-[12px] text-[#9B9B9B] uppercase font-bold tracking-wider">/ 10</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-[16px] font-bold text-[#1A1A1A] mb-2">Overall Score</h4>
                                <p className="text-[14px] text-[#6B6B6B] leading-relaxed">{aiReview.scoreExplanation}</p>
                                <div className="mt-3 flex items-center gap-2 text-[12px] font-bold text-[#C4727F] bg-[#FAF1F2] px-3 py-1.5 rounded-full w-fit">
                                  <Check className="w-3.5 h-3.5" /> AI Confidence: {aiReview.confidence}%
                                </div>
                              </div>
                            </div>

                            {/* Fit & Colors */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#F3F0EA]">
                              <div className="space-y-4">
                                <h4 className="text-[15px] font-bold text-[#1A1A1A] flex items-center gap-2"><div className="w-2 h-2 bg-[#1A1A1A] rounded-full"></div> Fit & Appearance</h4>
                                <ul className="space-y-3 text-[13px] text-[#6B6B6B]">
                                  <li><span className="font-bold text-[#1A1A1A]">Quality:</span> {aiReview.fit?.quality}</li>
                                  <li><span className="font-bold text-[#1A1A1A]">Shoulders:</span> {aiReview.fit?.shoulderAlignment}</li>
                                  <li><span className="font-bold text-[#1A1A1A]">Length:</span> {aiReview.fit?.length}</li>
                                  <li><span className="font-bold text-[#1A1A1A]">Silhouette:</span> {aiReview.fit?.silhouette}</li>
                                </ul>
                              </div>
                              <div className="space-y-4">
                                <h4 className="text-[15px] font-bold text-[#1A1A1A] flex items-center gap-2"><div className="w-2 h-2 bg-[#C4727F] rounded-full"></div> Compatibility</h4>
                                <p className="text-[13px] text-[#6B6B6B] leading-relaxed"><span className="font-bold text-[#1A1A1A]">Colors:</span> {aiReview.colorCompatibility}</p>
                                <p className="text-[13px] text-[#6B6B6B] leading-relaxed"><span className="font-bold text-[#1A1A1A]">Style:</span> {aiReview.styleCompatibility}</p>
                              </div>
                            </div>

                            {/* Pros, Cons & Occasions */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[#F3F0EA]">
                              <div className="bg-[#E8F5E9]/50 p-4 rounded-2xl">
                                <h4 className="text-[14px] font-bold text-[#2E7D32] mb-3">What Works</h4>
                                <ul className="space-y-2">
                                  {aiReview.pros?.map((p: string, i: number) => (
                                    <li key={i} className="text-[13px] text-[#1B5E20] flex items-start gap-2">
                                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span className="leading-tight">{p}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bg-[#FFF8E1]/50 p-4 rounded-2xl">
                                <h4 className="text-[14px] font-bold text-[#F57F17] mb-3">What Could Improve</h4>
                                <ul className="space-y-2">
                                  {aiReview.cons?.map((c: string, i: number) => (
                                    <li key={i} className="text-[13px] text-[#E65100] flex items-start gap-2">
                                      <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span className="leading-tight">{c}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bg-[#F3F0EA] p-4 rounded-2xl">
                                <h4 className="text-[14px] font-bold text-[#1A1A1A] mb-3">Perfect For</h4>
                                <div className="flex flex-wrap gap-2">
                                  {aiReview.occasionSuggestions?.map((occ: string, i: number) => (
                                    <span key={i} className="bg-white border border-[#E8E0D8] text-[#1A1A1A] text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                                      {occ}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Styling Tips & Alternatives */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#F3F0EA]">
                              <div>
                                <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Styling Tips</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {[
                                    { label: 'Bottoms', val: aiReview.tips?.bottoms },
                                    { label: 'Shoes', val: aiReview.tips?.shoes },
                                    { label: 'Accessories', val: aiReview.tips?.accessories },
                                    { label: 'Layering', val: aiReview.tips?.layering }
                                  ].filter(t => t.val).map((t, i) => (
                                    <div key={i} className="bg-white border border-[#E8E0D8] p-3 rounded-xl shadow-sm">
                                      <span className="block text-[11px] font-bold text-[#9B9B9B] uppercase mb-1">{t.label}</span>
                                      <span className="text-[13px] text-[#1A1A1A] font-medium leading-tight block">{t.val}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Alternative Styling</h4>
                                <ul className="space-y-3">
                                  {aiReview.alternativeStyling?.map((alt: string, i: number) => (
                                    <li key={i} className="text-[13px] text-[#6B6B6B] flex items-start gap-3 bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E0D8]">
                                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[10px] text-[#C4727F] shadow-sm">{i+1}</div>
                                      <span className="leading-tight pt-0.5">{alt}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                    </>
                  ) : null}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
    </div>
  );
}

// Helper icon
const Clock = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default function VirtualTryOnStudioPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#FAF8F5]">Loading Try-On Studio...</div>}>
      <VirtualTryOnStudioContent />
    </Suspense>
  );
}
