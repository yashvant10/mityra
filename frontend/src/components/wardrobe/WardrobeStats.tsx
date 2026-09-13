import { WardrobeItem } from "@/lib/wardrobeApi";
import { MoveUpRight, Shirt, Square, Triangle } from "lucide-react";

interface WardrobeStatsProps {
  items: WardrobeItem[];
}

export default function WardrobeStats({ items }: WardrobeStatsProps) {
  const total = items.length;
  const tops = items.filter(i => i.category === 'tops').length;
  const bottoms = items.filter(i => i.category === 'bottoms').length;
  const dresses = items.filter(i => i.category === 'dresses').length;

  const stats = [
    { label: "Total Items", count: total, icon: MoveUpRight }, // Using MoveUpRight as a generic hanger placeholder
    { label: "Tops", count: tops, icon: Shirt },
    { label: "Bottoms", count: bottoms, icon: Square }, // Generic pants placeholder
    { label: "Dresses", count: dresses, icon: Triangle }, // Generic dress placeholder
  ];

  return (
    <div className="bg-white/60 backdrop-blur-md border border-[#EADDD7]/50 rounded-[24px] p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex items-center justify-between w-full overflow-x-auto gap-8">
      {stats.map((stat, idx) => (
        <div key={idx} className="flex items-center gap-4 min-w-fit px-4 border-r border-[#EADDD7]/30 last:border-0 last:pr-0">
          <div className="w-10 h-10 rounded-full bg-[#FAF7F5] flex items-center justify-center text-[#B5A49D]">
            <stat.icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#4A3D36] font-heading">{stat.count}</div>
            <div className="text-xs text-[#8C7A70] uppercase tracking-wider font-medium">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
