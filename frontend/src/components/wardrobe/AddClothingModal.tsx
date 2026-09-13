import { useState, useRef } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { addWardrobeItem, scanClothingImage, WardrobeItem, parseProductUrl } from "@/lib/wardrobeApi";
import { motion, AnimatePresence } from "framer-motion";

interface AddClothingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: WardrobeItem) => void;
}

export default function AddClothingModal({ isOpen, onClose, onSuccess }: AddClothingModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [category, setCategory] = useState("tops");
  const [color, setColor] = useState("");
  const [brand, setBrand] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      
      try {
        setIsScanning(true);
        const analysis = await scanClothingImage(selected);
        if (analysis) {
          if (analysis.category) setCategory(analysis.category.toLowerCase());
          if (analysis.color) setColor(analysis.color);
          if (analysis.brand) setBrand(analysis.brand);
        }
      } catch (error) {
        console.error("AI scan failed", error);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleParseUrl = async () => {
    if (!productUrl.trim()) return;
    try {
      setIsParsingUrl(true);
      const data = await parseProductUrl(productUrl);
      if (data) {
        setPreview(data.imageUrl);
        // Download the image and convert to File object to mimic upload
        const response = await fetch(data.imageUrl);
        const blob = await response.blob();
        setFile(new File([blob], "product_image.jpg", { type: blob.type }));
        
        if (data.brand) setBrand(data.brand);
        // Basic category inference
        const titleLower = data.title.toLowerCase();
        if (titleLower.includes('shirt') || titleLower.includes('top') || titleLower.includes('t-shirt')) setCategory('tops');
        else if (titleLower.includes('pant') || titleLower.includes('jeans') || titleLower.includes('trouser')) setCategory('bottoms');
        else if (titleLower.includes('dress')) setCategory('dresses');
        else if (titleLower.includes('jacket') || titleLower.includes('coat')) setCategory('outerwear');
      }
    } catch (error) {
      console.error("Failed to parse URL:", error);
      alert("Failed to extract product details from this URL.");
    } finally {
      setIsParsingUrl(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("category", category);
      formData.append("color", color);
      formData.append("brand", brand);

      const newItem = await addWardrobeItem(formData);
      onSuccess(newItem);
      
      // Reset
      setFile(null);
      setPreview(null);
      setProductUrl("");
      setCategory("tops");
      setColor("");
      setBrand("");
      onClose();
    } catch (error) {
      console.error("Failed to upload clothing", error);
      alert("Failed to upload clothing. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#4A3D36]/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        
        <div className="flex items-center justify-between p-6 border-b border-[#EADDD7]/40">
          <h2 className="text-xl font-heading font-bold text-[#4A3D36]">Add Clothing</h2>
          <button onClick={onClose} className="p-2 bg-[#F5F2F0] hover:bg-[#EADDD7] rounded-full transition-colors">
            <X className="w-4 h-4 text-[#8C7A70]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Image Upload Area */}
          <div 
            className="w-full aspect-[4/3] bg-[#F5F2F0] rounded-2xl border-2 border-dashed border-[#EADDD7] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-[#C88576]/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                {isScanning && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm font-semibold">AI is scanning...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#8C7A70] group-hover:text-[#C88576] transition-colors">
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Click to upload image</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#4A3D36]">Import from Product URL</label>
              <input 
                type="url" 
                placeholder="Amazon, Myntra, Flipkart, Ajio..." 
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#EADDD7] bg-[#FAF7F5] text-[#4A3D36] focus:outline-none focus:border-[#C88576] text-sm"
              />
            </div>
            <button 
              type="button" 
              onClick={handleParseUrl}
              disabled={isParsingUrl || !productUrl}
              className="px-4 py-3 bg-[#EADDD7] hover:bg-[#d8c7bf] disabled:opacity-50 text-[#4A3D36] font-semibold rounded-xl text-sm transition-colors whitespace-nowrap flex items-center justify-center min-w-[100px]"
            >
              {isParsingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#4A3D36]">Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#EADDD7] bg-[#FAF7F5] text-[#4A3D36] focus:outline-none focus:border-[#C88576]"
            >
              <option value="tops">Tops</option>
              <option value="bottoms">Bottoms</option>
              <option value="dresses">Dresses</option>
              <option value="outerwear">Jackets & Outerwear</option>
              <option value="activewear">Activewear</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#4A3D36]">Color</label>
              <input 
                type="text" 
                placeholder="e.g. Black" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required
                className="w-full p-3 rounded-xl border border-[#EADDD7] bg-[#FAF7F5] text-[#4A3D36] focus:outline-none focus:border-[#C88576]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#4A3D36]">Brand</label>
              <input 
                type="text" 
                placeholder="e.g. Zara" 
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#EADDD7] bg-[#FAF7F5] text-[#4A3D36] focus:outline-none focus:border-[#C88576]"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!file || isUploading}
            className="w-full py-4 mt-2 bg-[#C88576] hover:bg-[#b07466] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
          >
            {isUploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
            ) : (
              "Save to Wardrobe"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
