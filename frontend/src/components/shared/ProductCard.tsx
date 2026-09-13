"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { addFavorite } from "@/lib/favoritesApi";

interface ProductCardProps {
  id: string;
  name: string;
  imageUrl: string;
  platform: string;
  price?: string | null;
  productUrl: string;
  rating?: number | null;
  reviews?: number | null;
  index?: number;
}

const ProductCard = memo(function ProductCard({ id, name, imageUrl, platform, price, productUrl, rating, reviews, index = 0 }: ProductCardProps) {
  const router = useRouter();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isAnimatingHeart, setIsAnimatingHeart] = useState(false);

  const handleProductClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(
      `/product-details?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&image=${encodeURIComponent(imageUrl)}&price=${encodeURIComponent(price || "")}&store=${encodeURIComponent(platform)}&url=${encodeURIComponent(productUrl || "")}&rating=${rating || 4.5}&reviews=${reviews || 120}`
    );
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimatingHeart(true);
    setTimeout(() => setIsAnimatingHeart(false), 400); // Matches the 0.4s heart-pop animation duration
    try {
      await addFavorite({
        productId: id || `prod_${name.slice(0, 20).replace(/\s/g, "_")}_${platform}`,
        name,
        price: price || null,
        imageUrl,
        store: platform,
        productUrl,
        category: "tops",
      });
      toast.success("Added to favorites ❤️");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.info("Already in your favorites");
      } else {
        toast.error("Failed to add to favorites");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.33, 1, 0.68, 1] }}
      className="fashion-card flex-shrink-0 group cursor-pointer relative flex flex-col h-full w-full active:scale-[0.98] transition-transform duration-400"
      onClick={handleProductClick}
    >
      <div className={`aspect-[3/4] rounded-t-xl overflow-hidden relative flex-shrink-0 border-b border-[#E8E0D8] img-loading ${imgLoaded ? 'loaded' : ''}`}>
        <img 
          src={imageUrl} 
          alt={name} 
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]" 
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <button 
          className="absolute top-2 right-2 w-12 h-12 md:w-9 md:h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-[#b95b6a] hover:bg-white transition-colors z-10 press-scale" 
          onClick={handleFavorite}
        >
          <Heart className={`w-5 h-5 md:w-4 md:h-4 transition-colors duration-300 ${isAnimatingHeart ? 'heart-pop fill-current' : ''}`} />
        </button>
        
        {/* Hover overlay with brand info */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex items-center justify-center pointer-events-none">
          <span className="text-white text-[12px] font-bold tracking-wider uppercase drop-shadow-md">
            View on {platform}
          </span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-between p-3">
        <div>
          <h4 className="text-[13px] font-bold text-[#1A1A1A] line-clamp-1" title={name}>{name || "Premium Style"}</h4>
          <p className="text-[11px] text-[#6B6B6B] mt-0.5">
            {price ? `${price} • ${platform}` : platform}
          </p>
        </div>
        
        <div className="mt-3">
          <Link 
            href={`/try-on?platform=${platform.toLowerCase()}&image=${encodeURIComponent(imageUrl)}&name=${encodeURIComponent(name)}&url=${encodeURIComponent(productUrl || "")}`} 
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center min-h-[48px] py-2.5 bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl text-[12px] font-bold text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all duration-400 press-scale"
          >
            Try On <span className="inline-block group-hover:translate-x-1 transition-transform duration-400 ml-1">→</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
});

export default ProductCard;
