"use client";

const brands = [
  { name: "Amazon", accent: "#FF9900" },
  { name: "Flipkart", accent: "#2874F0" },
  { name: "Myntra", accent: "#FF3F6C" },
  { name: "AJIO", accent: "#2B2B2B" },
  { name: "Meesho", accent: "#E91E63" },
  { name: "Nykaa Fashion", accent: "#FC2779" },
  { name: "Tata CLiQ", accent: "#E42554" },
  { name: "Max Fashion", accent: "#D32F2F" },
];

export default function BrandCarousel() {
  // Duplicate for seamless loop
  const allBrands = [...brands, ...brands];

  return (
    <section className="py-10 sm:py-14 bg-[#FAF8F5] border-t border-b border-[#E8E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-5">
        <p className="text-sm text-[#9B9B9B] text-center font-medium tracking-wide">
          Shop from <span className="text-[#1A1A1A] font-semibold">trusted stores</span>
        </p>
      </div>

      {/* Marquee container */}
      <div className="marquee-container">
        <div className="marquee-track" style={{ gap: "12px" }}>
          {allBrands.map((brand, index) => (
            <div
              key={`${brand.name}-${index}`}
              className="brand-pill flex-shrink-0"
            >
              {/* Small accent dot */}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: brand.accent }}
              />
              {brand.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
