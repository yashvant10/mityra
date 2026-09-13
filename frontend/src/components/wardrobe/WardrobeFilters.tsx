import { LayoutGrid, Shirt, Square, Triangle, Scissors } from "lucide-react";

interface WardrobeFiltersProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
}

const CATEGORIES = [
  { id: "all", label: "All Items", icon: LayoutGrid },
  { id: "tops", label: "Tops", icon: Shirt },
  { id: "bottoms", label: "Bottoms", icon: Square },
  { id: "dresses", label: "Dresses", icon: Triangle },
  { id: "outerwear", label: "Jackets", icon: Scissors }, // Generic outerwear icon
  { id: "traditional", label: "Traditional", icon: Shirt },
  { id: "other", label: "Other Clothing", icon: LayoutGrid },
];

export default function WardrobeFilters({ activeCategory, setActiveCategory }: WardrobeFiltersProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
              isActive 
                ? "bg-[#C88576] text-white border-[#C88576] shadow-sm" 
                : "bg-white text-[#4A3D36] border-[#EADDD7] hover:border-[#C88576]/50 hover:bg-[#FAF7F5]"
            }`}
          >
            <cat.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8C7A70]'}`} />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
