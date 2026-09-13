import { WardrobeItem, updateWardrobeItem } from "@/lib/wardrobeApi";
import { motion } from "motion/react";
import { Heart, MoreVertical } from "lucide-react";
import { useState } from "react";

interface WardrobeGridProps {
  items: WardrobeItem[];
  onFavoriteToggle: () => void;
}

export default function WardrobeGrid({ items, onFavoriteToggle }: WardrobeGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-xl font-heading text-[#4A3D36] mb-2">Your wardrobe is waiting for you.</h3>
        <p className="text-[#8C7A70] mb-6">Add your first clothing item and start building your digital closet.</p>
        {/* Button is rendered in the parent page.tsx usually, or we can just leave this as an empty state */}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
      {items.map((item, idx) => (
        <WardrobeCard 
          key={item.id || `wardrobe-item-${idx}`} 
          item={item} 
          index={idx} 
          onFavoriteToggle={onFavoriteToggle} 
        />
      ))}
    </div>
  );
}

function WardrobeCard({ item, index, onFavoriteToggle }: { item: WardrobeItem, index: number, onFavoriteToggle: () => void }) {
  const [isFavoriting, setIsFavoriting] = useState(false);

  const toggleFavorite = async () => {
    try {
      setIsFavoriting(true);
      await updateWardrobeItem(item.id, { isFavorite: !item.isFavorite });
      onFavoriteToggle(); // triggers parent refresh
    } catch (e) {
      console.error(e);
    } finally {
      setIsFavoriting(false);
    }
  };

  // Format date safely
  const formattedDate = new Date(item.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-2xl border border-[#EADDD7]/40 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-[3/4] bg-[#F5F2F0] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={item.imageUrl} 
          alt={item.color + ' ' + item.category} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button 
          onClick={toggleFavorite}
          disabled={isFavoriting}
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-[#C88576] text-[#C88576]' : 'text-[#8C7A70]'}`} />
        </button>
      </div>
      
      <div className="p-4 flex flex-col gap-1 relative">
        <h4 className="font-semibold text-[#4A3D36] text-sm truncate capitalize">
          {item.color} {item.subcategory || item.category}
        </h4>
        <div className="text-xs text-[#8C7A70]">{item.brand || "Unbranded"}</div>
        <div className="text-[10px] text-[#A69B95] mt-1">Uploaded on {formattedDate}</div>
        
        <button className="absolute bottom-4 right-4 text-[#A69B95] hover:text-[#4A3D36] transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
