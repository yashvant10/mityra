import { WardrobeItem } from "@/lib/wardrobeApi";
import { Sparkles, BarChart2, Info, ArrowRight, Shirt } from "lucide-react";
import { useEffect, useState } from "react";
import { generateOutfitIdeas } from "@/lib/wardrobeApi";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

interface WardrobeSidebarProps {
  items: WardrobeItem[];
}

export default function WardrobeSidebar({ items }: WardrobeSidebarProps) {
  const [outfits, setOutfits] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateOutfits = async () => {
    if (items.length === 0) return;
    try {
      setIsGenerating(true);
      setError(null);
      const generatedOutfits = await generateOutfitIdeas("casual");
      if (generatedOutfits) setOutfits(generatedOutfits);
    } catch (err) {
      setError("Failed to generate outfits. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Mock storage calculation based on item count for visual flair
  const maxStorage = 200;
  const storagePercentage = Math.min(Math.round((items.length / maxStorage) * 100), 100);
  const gbUsed = (items.length * 0.01).toFixed(2); // Mock 10MB per item

  // Calculate insights
  const topsCount = items.filter(i => i.category === 'tops').length;
  const bottomsCount = items.filter(i => i.category === 'bottoms').length;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* AI Outfit Ideas */}
      <div className="bg-[#FAF7F5] rounded-3xl p-6 border border-[#EADDD7]/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-[#4A3D36] flex items-center gap-2">
            AI Outfit Ideas <Sparkles className="w-4 h-4 text-[#C88576]" />
          </h3>
        </div>
        
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 text-[#8C7A70] gap-3"
            >
              <Loader2 className="w-6 h-6 animate-spin text-[#C88576]" />
              <span className="text-sm font-medium">Creating your next look...</span>
            </motion.div>
          ) : error ? (
            <motion.div key="error" className="py-4 text-center">
              <p className="text-sm text-red-500 mb-3">{error}</p>
            </motion.div>
          ) : outfits.length > 0 ? (
            <motion.div key="results" className="flex flex-col gap-4 mb-4">
              {outfits.map((outfit, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="bg-white rounded-xl p-4 border border-[#EADDD7]/40 shadow-sm"
                >
                  <h4 className="text-sm font-bold text-[#4A3D36] mb-2">{outfit.name}</h4>
                  
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                    {/* Real items from user wardrobe */}
                    {outfit.wardrobeItems?.map((item: any, idx: number) => (
                      <div key={`w-${idx}`} className="w-16 shrink-0 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt={item.category} className="w-full aspect-[3/4] object-cover rounded-lg bg-[#F5F2F0]" />
                        <div className="absolute top-1 left-1 bg-white/90 p-0.5 rounded text-[8px] font-bold text-[#8C7A70]">Own</div>
                      </div>
                    ))}
                    
                    {/* Suggested products from RapidAPI */}
                    {outfit.suggestedProducts?.map((product: any, idx: number) => (
                      <a href={product.productUrl} target="_blank" rel="noopener noreferrer" key={`s-${idx}`} className="w-16 shrink-0 relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.imageUrl} alt={product.name} className="w-full aspect-[3/4] object-cover rounded-lg bg-[#F5F2F0] border-2 border-dashed border-[#C88576]/50 group-hover:border-[#C88576]" />
                        <div className="absolute top-1 left-1 bg-[#C88576] p-0.5 rounded text-[8px] font-bold text-white shadow-sm">Buy</div>
                      </a>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="empty" className="grid grid-cols-3 gap-2 mb-4">
              {items.slice(0, 3).map((item, idx) => (
                <div key={item.id || idx} className="bg-white rounded-xl p-2 border border-[#EADDD7]/40 flex flex-col items-center shadow-sm">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="outfit part" className="w-full aspect-[3/4] object-cover rounded-lg bg-[#F5F2F0]" />
                </div>
              ))}
              {items.length < 3 && (
                <div className="col-span-3 text-center py-4 text-xs text-[#8C7A70]">
                  Add more items to generate outfits!
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={handleGenerateOutfits}
          disabled={isGenerating || items.length === 0}
          className="w-full py-3 bg-[#C88576] hover:bg-[#b07466] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {outfits.length > 0 ? "Generate New Looks" : "Generate Looks"}
        </button>
      </div>

      {/* Wardrobe Insights */}
      <div className="bg-white rounded-3xl p-6 border border-[#EADDD7]/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-bold text-[#4A3D36]">Wardrobe Insights</h3>
          <span className="px-2 py-0.5 bg-[#F5E6E1] text-[#C88576] text-[10px] font-bold rounded-full uppercase tracking-wider">New</span>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E8F0F2] flex items-center justify-center text-[#5C8C99] shrink-0 mt-0.5">
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#4A3D36]">
                {topsCount > bottomsCount ? "You have more tops than bottoms" : "Good balance of tops and bottoms"}
              </p>
              <p className="text-xs text-[#8C7A70] mt-0.5">Try adding some diverse layers.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F2ECE8] flex items-center justify-center text-[#A69B95] shrink-0 mt-0.5">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#4A3D36]">Under-used items</p>
              <p className="text-xs text-[#8C7A70] mt-0.5">{Math.floor(items.length * 0.2)} items not used in last 60 days</p>
            </div>
          </div>
        </div>
        
        <button className="w-full mt-6 text-right text-xs font-semibold text-[#8C7A70] hover:text-[#4A3D36] flex items-center justify-end gap-1 group">
          View Full Insights <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Storage Used */}
      <div className="bg-white rounded-3xl p-6 border border-[#EADDD7]/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#4A3D36]">Storage Used</h3>
          <span className="text-sm font-bold text-[#4A3D36]">{storagePercentage}%</span>
        </div>
        <div className="w-full h-2 bg-[#F5F2F0] rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-[#C88576] rounded-full transition-all duration-1000"
            style={{ width: `${storagePercentage}%` }}
          />
        </div>
        <p className="text-xs text-[#8C7A70]">You've used {gbUsed} GB of 2 GB</p>
      </div>

    </div>
  );
}
