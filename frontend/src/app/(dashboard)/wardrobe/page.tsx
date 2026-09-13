"use client";

import { motion } from "motion/react";
import { Sparkles, Plus, Search, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchWardrobeItems, WardrobeItem } from "@/lib/wardrobeApi";

import WardrobeStats from "@/components/wardrobe/WardrobeStats";
import WardrobeFilters from "@/components/wardrobe/WardrobeFilters";
import WardrobeGrid from "@/components/wardrobe/WardrobeGrid";
import WardrobeSidebar from "@/components/wardrobe/WardrobeSidebar";
import AddClothingModal from "@/components/wardrobe/AddClothingModal";
import { GridSkeleton, ErrorState, EmptyState } from "@/components/shared/LoadingStates";

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadWardrobe = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchWardrobeItems();
      
      // EXPLICIT FILTER: Remove shoes, bags, watches, sunglasses, accessories
      const clothingOnly = data.filter(item => 
        item.category !== 'shoes' && 
        item.category !== 'accessories'
      );
      
      setItems(clothingOnly);
    } catch (err: any) {
      console.error("Error loading wardrobe", err);
      setError("Failed to load your wardrobe.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWardrobe();
  }, []);

  // Filter items based on activeCategory and searchQuery
  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory || (activeCategory === 'traditional' && item.subcategory?.toLowerCase() === 'traditional') || (activeCategory === 'other' && !['tops', 'bottoms', 'dresses', 'outerwear', 'traditional'].includes(item.category));
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      item.brand?.toLowerCase().includes(searchLower) ||
      item.color?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower) ||
      item.subcategory?.toLowerCase().includes(searchLower);
      
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F5] p-4 md:p-6 lg:p-8 font-sans w-full flex flex-col gap-8 pb-32 max-w-[1920px] mx-auto min-w-0 overflow-hidden">
      
      {/* Top Navigation Bar Mock (Search & Filters) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-2 w-full md:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A70]" />
            <input 
              type="text" 
              placeholder="Search in wardrobe..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-[#EADDD7] bg-white text-sm focus:outline-none focus:border-[#C88576] transition-colors shadow-sm"
            />
          </div>
          <button className="p-2.5 bg-white border border-[#EADDD7] rounded-xl hover:bg-[#F5F2F0] transition-colors text-[#4A3D36]">
            <Filter className="w-4 h-4" />
          </button>
        </div>
        
        {/* If TopNav is separate, we just keep this as page-level controls */}
      </div>

      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-[#4A3D36] flex items-center gap-3">
            My Wardrobe <Sparkles className="w-6 h-6 text-[#C88576]" />
          </h1>
          <p className="text-[#8C7A70] mt-2">Organize your clothes. Create looks. Express your style.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full md:w-auto py-3 px-6 bg-[#C88576] hover:bg-[#b07466] text-white rounded-xl font-medium text-sm transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Clothing
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto py-3 px-6 bg-white hover:bg-[#F5F2F0] text-[#4A3D36] border border-[#EADDD7] rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C88576]" /> Scan Closet
          </button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <WardrobeStats items={items} />
      </motion.div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-8 min-w-0">
        
        {/* Left Column (Filters + Grid) */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <WardrobeFilters activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
          
          {error ? (
            <ErrorState message={error} onRetry={loadWardrobe} />
          ) : isLoading ? (
            <GridSkeleton count={8} columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4" />
          ) : filteredItems.length === 0 ? (
            <EmptyState 
              title={searchQuery || activeCategory !== 'all' ? "No matches found" : "Your wardrobe is waiting"} 
              subtitle={searchQuery || activeCategory !== 'all' ? "Try adjusting your search or filters." : "Add your first clothing item to start."}
              actionLabel={searchQuery || activeCategory !== 'all' ? "Clear filters" : "Add Clothing"}
              onAction={() => {
                if (searchQuery || activeCategory !== 'all') {
                  setSearchQuery("");
                  setActiveCategory("all");
                } else {
                  setIsAddModalOpen(true);
                }
              }}
            />
          ) : (
            <WardrobeGrid items={filteredItems} onFavoriteToggle={loadWardrobe} />
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0">
          <WardrobeSidebar items={items} />
        </div>

      </div>

      {/* AI Closet Organizer Footer Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 bg-gradient-to-r from-[#F5F2F0] to-[#FAF7F5] rounded-3xl p-6 md:p-8 border border-[#EADDD7] flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 text-[#C88576]">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-[#4A3D36] mb-1">AI Closet Organizer</h3>
            <p className="text-[#8C7A70] text-sm">Let AI organize your wardrobe smartly, detect duplicates, and suggest combinations.</p>
          </div>
        </div>
        <button className="whitespace-nowrap py-3 px-6 bg-white border border-[#EADDD7] hover:border-[#C88576] hover:text-[#C88576] text-[#4A3D36] rounded-xl font-medium text-sm transition-all shadow-sm flex items-center gap-2 group w-full md:w-auto justify-center">
          Organize Now <Sparkles className="w-3 h-3 group-hover:animate-pulse" />
        </button>
      </motion.div>

      {/* Modals */}
      <AddClothingModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={(newItem) => {
          setItems(prev => [newItem, ...prev]);
        }} 
      />

    </div>
  );
}
