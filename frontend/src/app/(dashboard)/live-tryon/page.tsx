"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Crown,
  ChevronLeft,
  Download,
  Shirt,
  Volume2,
  Trash2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OutfitItem {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
}

const DEFAULT_AR_OUTFITS: OutfitItem[] = [
  {
    id: "ar-1",
    name: "Crimson Silk Kurta",
    imageUrl: "https://images.unsplash.com/photo-1597983073492-bc24058bd37f?w=400&auto=format&fit=crop",
    category: "tops",
  },
  {
    id: "ar-2",
    name: "Classic Navy Blazer",
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&auto=format&fit=crop",
    category: "tops",
  },
  {
    id: "ar-3",
    name: "Minimalist Cream Tee",
    imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&auto=format&fit=crop",
    category: "tops",
  },
  {
    id: "ar-4",
    name: "Vintage Denim Jacket",
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop",
    category: "outerwear",
  },
];

export default function LiveTryOnPage() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  // Camera & Stream State
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitItem | null>(null);
  
  // Placement controllers for aligning the clothing overlay
  const [scale, setScale] = useState(1.0);
  const [yOffset, setYOffset] = useState(0);
  const [xOffset, setXOffset] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Check Subscription Status
  useEffect(() => {
    const checkPremium = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken?.() || "mock-token";
        const res = await fetch(`${API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Gate if tier is free
          setIsPremium(data.profile?.subscriptionTier !== "free");
        }
      } catch (err) {
        console.error("Failed to fetch plan tier", err);
      } finally {
        setLoading(false);
      }
    };
    checkPremium();
  }, [user]);

  // Handle Camera Toggle
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        toast.success("Holographic Camera Mirror Activated! 📸");
      }
    } catch (err) {
      console.error("Camera access failed", err);
      toast.error("Camera Access Denied. Please enable camera permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [cameraActive]);

  // Capture Live Outfit Snapshot
  const captureSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedOutfit) {
      toast.error("Ensure camera is active and outfit is selected!");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay clothing image
    const outfitImg = new Image();
    outfitImg.crossOrigin = "anonymous";
    outfitImg.src = selectedOutfit.imageUrl;

    outfitImg.onload = async () => {
      // Draw centered with offsets
      const imgWidth = canvas.width * 0.45 * scale;
      const imgHeight = imgWidth * (outfitImg.height / outfitImg.width);
      const xPos = (canvas.width - imgWidth) / 2 + xOffset;
      const yPos = (canvas.height - imgHeight) / 2 + yOffset;

      ctx.drawImage(outfitImg, xPos, yPos, imgWidth, imgHeight);

      // Save to digital wardrobe
      const dataUrl = canvas.toDataURL("image/png");
      toast.info("Saving snapshot to wardrobe...");

      try {
        const token = user ? await user.getIdToken?.() || "mock-token" : "mock-token";
        
        // Convert to blob
        const blob = await (await fetch(dataUrl)).blob();
        const formData = new FormData();
        formData.append("image", blob, `ar_snap_${Date.now()}.png`);
        formData.append("category", selectedOutfit.category);
        formData.append("brand", "AR Studio Capture");
        formData.append("color", "Multi Color");
        formData.append("subcategory", selectedOutfit.name);

        const res = await fetch(`${API_URL}/wardrobe`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          toast.success("AR Outfit snapshot saved to your digital closet! 👕📸");
        } else {
          throw new Error();
        }
      } catch {
        toast.error("Failed to sync snapshot to closet.");
      }
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050510]">
        <div className="w-12 h-12 border-4 border-neon-purple/20 border-t-neon-purple rounded-full animate-spin" />
      </div>
    );
  }

  // Premium lock overlay
  if (!isPremium) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-6 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 rounded-[32px] border border-neon-purple/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-neon-purple/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="w-20 h-20 rounded-3xl bg-neon-purple/10 flex items-center justify-center mx-auto text-neon-purple-light shadow-neon-glow mb-6">
            <Crown className="w-10 h-10" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 font-heading">
            AR Live Mirror Try-On
          </h1>
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-neon-purple/20 text-neon-purple-light border border-neon-purple/30 animate-pulse">
            ✨ PREMIUM ONLY FEATURE
          </span>

          <p className="text-white/40 text-sm max-w-md mx-auto pt-4 leading-relaxed">
            Unlock the advanced holographic fitting room! Project outfits live on your phone or webcam using real-time posing detection overlays.
          </p>

          <div className="pt-8 flex justify-center gap-4">
            <Link href="/pricing" className="btn-futuristic text-sm px-8 py-3">
              Upgrade to Student/Pro plan
            </Link>
            <Link href="/dashboard" className="btn-futuristic-outline text-sm px-6 py-3">
              Back to dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* Header card */}
      <div className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neon-purple/20 text-neon-purple-light border border-neon-purple/30">
              Live AR Fitting Mirror
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-heading">
            AR Live Camera <span className="gradient-text">Try-On</span>
          </h1>
          <p className="text-white/40 text-xs max-w-md">
            Mirror fits directly onto your body. Calibrate position, snap a photo, and save outfits instantly.
          </p>
        </div>
        <Link href="/dashboard" className="btn-futuristic-outline text-xs px-4 py-2 flex items-center gap-1.5 self-center">
          <ChevronLeft className="w-4 h-4" />
          Exit Mirror
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Mirror Cam viewport */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-[4/3] rounded-3xl bg-[#080814] border border-white/10 relative overflow-hidden flex items-center justify-center shadow-2xl">
            {cameraActive ? (
              <div className="w-full h-full relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Outfit Live Overlay frame */}
                {selectedOutfit && (
                  <div
                    className="absolute pointer-events-none transition-all duration-75"
                    style={{
                      left: `calc(50% + ${xOffset}px)`,
                      top: `calc(50% + ${yOffset}px)`,
                      transform: `translate(-50%, -50%) scale(${scale})`,
                      width: "45%",
                    }}
                  >
                    <img
                      src={selectedOutfit.imageUrl}
                      alt={selectedOutfit.name}
                      className="w-full h-auto drop-shadow-[0_15px_30px_rgba(124,58,237,0.6)]"
                    />
                  </div>
                )}

                {/* Laser scan horizontal glow bounds */}
                <div className="absolute inset-0 border-2 border-dashed border-neon-purple/30 pointer-events-none rounded-2xl m-4" />
                <div className="absolute top-4 left-6 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl border border-white/5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[10px] uppercase font-bold text-white/80">Live Video Stream</span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 max-w-sm p-8">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto text-white/20">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white">Activate device webcam</h3>
                  <p className="text-xs text-white/30 leading-relaxed">
                    Allow access to your device camera to project holographic virtual garments directly over your reflection.
                  </p>
                </div>
                <button onClick={() => setCameraActive(true)} className="btn-futuristic text-xs px-8 py-3 w-full">
                  Start Live Camera Mirror
                </button>
              </div>
            )}

            {/* Hidden canvas for taking pictures */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Alignment calibration sliders */}
          {cameraActive && selectedOutfit && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-3xl border border-white/5 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-extrabold uppercase text-white/80 tracking-wider">
                  AR Overlay Calibrator
                </span>
                <button
                  onClick={() => {
                    setScale(1.0);
                    setYOffset(0);
                    setXOffset(0);
                  }}
                  className="text-white/40 hover:text-white text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Garment Size Scale</span>
                    <span className="text-white font-bold">{Math.round(scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Vertical Alignment (Y)</span>
                    <span className="text-white font-bold">{yOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={yOffset}
                    onChange={(e) => setYOffset(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Horizontal Alignment (X)</span>
                    <span className="text-white font-bold">{xOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={xOffset}
                    onChange={(e) => setXOffset(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right side panels - Choose outfit & snap */}
        <div className="space-y-8">
          
          {/* Action Trigger Card */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 text-center space-y-4">
            <h3 className="text-sm font-extrabold text-white">Capture Style</h3>
            <p className="text-[11px] text-white/30 leading-snug">
              Once outfit aligns on camera body grid, click capture to instantly save look to wardrobe.
            </p>
            <button
              onClick={captureSnapshot}
              disabled={!cameraActive || !selectedOutfit}
              className="w-full btn-futuristic py-3 text-xs flex items-center justify-center gap-2 shadow-neon-glow"
            >
              <Camera className="w-4 h-4" />
              Capture and Save Snapshot
            </button>
            
            {cameraActive && (
              <button
                onClick={() => setCameraActive(false)}
                className="w-full text-red-400 hover:text-red-300 text-xs py-2 border border-red-500/10 hover:bg-red-500/5 rounded-xl transition-all"
              >
                Shut Camera Mirror
              </button>
            )}
          </div>

          {/* Choose Clothing List */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-neon-purple-light" />
              <h3 className="text-sm font-extrabold text-white">Select AR Outfits</h3>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {DEFAULT_AR_OUTFITS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedOutfit(item)}
                  className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all bg-[#090916] ${
                    selectedOutfit?.id === item.id
                      ? "border-neon-purple shadow-neon-glow scale-[1.02]"
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <img src={item.imageUrl} className="w-full h-full object-cover" />
                  
                  {/* Select overlay status */}
                  <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-2.5">
                    <span className="text-[9px] font-bold text-white truncate">{item.name}</span>
                  </div>

                  {selectedOutfit?.id === item.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-neon-purple flex items-center justify-center text-white">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
