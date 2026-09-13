"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Link2, ArrowRight, Check, Camera } from "lucide-react";

type Step = "input" | "preview" | "confirm";

export default function ProductUrlInput() {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [productData, setProductData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/tryon/import-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        setProductData(data.product);
        setStep("preview");
      } catch (err: any) {
        setError(err.message || "Failed to parse URL");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <section className="section-spacing bg-[#F5F0EB]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold font-heading text-[#1A1A1A] mb-2">
            Paste a product link
          </h2>
          <p className="text-sm text-[#6B6B6B]">
            Try on any product from your favorite shopping site.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="fashion-card-flat p-6 sm:p-8"
        >
          {step === "input" && (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-3 mb-4">
                <Link2 className="w-5 h-5 text-[#C4727F] flex-shrink-0" />
                <span className="text-sm font-medium text-[#1A1A1A]">Product URL</span>
              </div>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.myntra.com/..."
                  className="input-fashion flex-1"
                  required
                />
                <button type="submit" className="btn-primary !px-6 flex-shrink-0" disabled={isLoading}>
                  {isLoading ? "Loading..." : (
                    <>
                      Preview
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
              <p className="text-xs text-[#9B9B9B] mt-3">
                Supports Myntra, AJIO, Flipkart, Amazon, Meesho and more.
              </p>
            </form>
          )}

          {step === "preview" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#F2E0E3] flex items-center justify-center">
                  <Check className="w-5 h-5 text-[#C4727F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">Product found</p>
                  <p className="text-xs text-[#9B9B9B] truncate max-w-xs">{url}</p>
                </div>
              </div>

              {/* Preview placeholder */}
              <div className="aspect-[4/3] bg-[#F5F0EB] rounded-lg mb-4 flex items-center justify-center border border-[#E8E0D8] overflow-hidden relative">
                {productData?.imageUrl ? (
                  <img src={productData.imageUrl} alt={productData.title || "Product"} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-sm text-[#9B9B9B]">Product preview loading...</span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("input")}
                  className="btn-secondary flex-1"
                >
                  Change
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  className="btn-rose flex-1 gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Try On
                </button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#D4E4D9] flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-[#2D6A4F]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Ready to try on!</h3>
              <p className="text-sm text-[#6B6B6B] mb-6">Upload your photo and see this outfit on you.</p>
              <button
                onClick={() => { setStep("input"); setUrl(""); }}
                className="btn-text mx-auto"
              >
                Try another product
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
