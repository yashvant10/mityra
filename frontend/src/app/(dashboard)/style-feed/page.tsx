"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Sparkles,
  TrendingUp,
  Flame,
  Check,
  ChevronRight,
  User,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FeedPost {
  id: string;
  userName: string;
  userAvatar: string;
  outfitName: string;
  imageUrl: string;
  platform: string;
  price: number;
  likes: number;
  commentsCount: number;
  hasLiked?: boolean;
}

const INITIAL_FEED_POSTS: FeedPost[] = [
  {
    id: "post-1",
    userName: "Aisha Sharma",
    userAvatar: "⚡",
    outfitName: "Classic Crimson Kurta & Dupatta set",
    imageUrl: "https://images.unsplash.com/photo-1597983073492-bc24058bd37f?w=600&auto=format&fit=crop",
    platform: "Myntra",
    price: 1899,
    likes: 243,
    commentsCount: 28,
  },
  {
    id: "post-2",
    userName: "Rahul Verma",
    userAvatar: "🕶️",
    outfitName: "Midnight Navy Blazer Casual contour",
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop",
    platform: "Amazon",
    price: 3499,
    likes: 189,
    commentsCount: 19,
  },
];

export default function StyleFeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>(INITIAL_FEED_POSTS);
  
  // Style Battle States
  const [battleVotesA, setBattleVotesA] = useState(142);
  const [battleVotesB, setBattleVotesB] = useState(98);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedBattleOption, setSelectedBattleOption] = useState<string | null>(null);

  const handleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === id) {
          const newHasLiked = !post.hasLiked;
          return {
            ...post,
            hasLiked: newHasLiked,
            likes: newHasLiked ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );
  };

  const handleShare = (postName: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/style-feed`);
    toast.success(`Share link for "${postName}" copied to clipboard! 🔗`);
  };

  const handleVote = (option: "A" | "B") => {
    if (hasVoted) return;
    setSelectedBattleOption(option);
    if (option === "A") setBattleVotesA((prev) => prev + 1);
    else setBattleVotesB((prev) => prev + 1);
    setHasVoted(true);
    toast.success("Vote registered! Style points added ⚡");
  };

  const totalVotes = battleVotesA + battleVotesB;
  const percentA = Math.round((battleVotesA / totalVotes) * 100);
  const percentB = 100 - percentA;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-neon-purple/5 rounded-full blur-[100px]" />
        
        <div className="space-y-1 text-center sm:text-left">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neon-purple/20 text-neon-purple-light border border-neon-purple/30">
            Style Feed Timeline
          </span>
          <h1 className="text-3xl font-extrabold text-white font-heading">
            Look.ai <span className="gradient-text">Social Style Feed</span>
          </h1>
          <p className="text-white/40 text-xs max-w-sm">
            Review matching sets worn by other creators. Vote on weekly battles and load fits directly to try on.
          </p>
        </div>

        <button
          onClick={() => toast.info("New Style feed uploader is opening soon!")}
          className="btn-futuristic text-xs px-5 py-2.5 flex items-center gap-1.5 shadow-neon-glow border-none"
        >
          <Plus className="w-4 h-4" />
          Share My Look
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Scrollable Feed List */}
        <div className="lg:col-span-2 space-y-6">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[24px] border border-white/5 overflow-hidden shadow-lg bg-[#080816]"
            >
              {/* Header profile info */}
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-lg font-bold">
                    {post.userAvatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">{post.userName}</h4>
                    <p className="text-[10px] text-white/30 mt-1 font-mono">Shared matching fit</p>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40 font-bold uppercase">
                  {post.platform} Item
                </span>
              </div>

              {/* Main Image Frame */}
              <div className="aspect-[4/3] bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                <img src={post.imageUrl} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl border border-white/5">
                  <h4 className="text-xs font-bold text-white leading-none">{post.outfitName}</h4>
                  <p className="text-[10px] text-emerald-400 font-mono mt-1 font-bold">₹{post.price}</p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        post.hasLiked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    <span>{post.likes}</span>
                  </button>
                  <button
                    onClick={() => toast.info("Comments section drawer is opening soon!")}
                    className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/try-on?occasion=party`}
                    className="btn-futuristic py-1.5 px-4 rounded-xl text-[10px] font-bold border-none"
                  >
                    Try Outfit
                  </Link>
                  <button
                    onClick={() => handleShare(post.outfitName)}
                    className="p-1.5 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right column modules - battles, leaders */}
        <div className="space-y-8">
          
          {/* Style Battle arena */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 rounded-3xl border border-white/5 space-y-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-red-500 animate-pulse" />
              <div>
                <h3 className="text-sm font-extrabold text-white leading-none">Style Battle Arena</h3>
                <p className="text-[10px] text-white/30 mt-1">Vote on matching sets</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Option A */}
              <div
                onClick={() => handleVote("A")}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                  hasVoted && selectedBattleOption === "A"
                    ? "border-neon-purple shadow-neon-glow"
                    : "border-white/5 hover:border-white/15"
                }`}
              >
                <img
                  src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-3">
                  <span className="w-fit px-2 py-0.5 rounded text-[8px] font-bold bg-white/10 text-white uppercase">Outfit A</span>
                  {hasVoted && (
                    <span className="text-lg font-black text-white text-center pb-2">{percentA}%</span>
                  )}
                </div>
              </div>

              {/* Option B */}
              <div
                onClick={() => handleVote("B")}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                  hasVoted && selectedBattleOption === "B"
                    ? "border-neon-purple shadow-neon-glow"
                    : "border-white/5 hover:border-white/15"
                }`}
              >
                <img
                  src="https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-3">
                  <span className="w-fit px-2 py-0.5 rounded text-[8px] font-bold bg-white/10 text-white uppercase">Outfit B</span>
                  {hasVoted && (
                    <span className="text-lg font-black text-white text-center pb-2">{percentB}%</span>
                  )}
                </div>
              </div>
            </div>

            {hasVoted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="pt-2 text-center"
              >
                <p className="text-[10px] text-white/40 italic">Thanks for voting! Style points added to profile.</p>
              </motion.div>
            )}
          </motion.div>

        </div>

      </div>

    </div>
  );
}
