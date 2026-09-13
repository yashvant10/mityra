"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    
    // Basic format validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address format.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Do not reveal that the user does not exist
        setSent(true);
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many requests. Please try again later.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full bg-white rounded-3xl border border-[#E8E0D8] p-8 md:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)] relative overflow-hidden"
    >
      {sent ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-[#FAF5F6] border border-[#F2E0E3] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-[#C4727F]" strokeWidth={1.5} />
          </div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#1A1A1A] mb-2 font-heading leading-tight">
            Check Your Email
          </h1>
          <p className="text-[14px] text-[#6B6B6B] mb-8 leading-relaxed">
            If an account exists for this email, a password reset link has been sent.
          </p>
          <Link
            href="/login"
            className="w-full relative overflow-hidden py-3.5 rounded-[12px] bg-[#FAF8F5]/80 border border-[#E8E0D8] text-[#1A1A1A] text-[15px] font-bold hover:bg-[#F5F0EB] hover:-translate-y-0.5 shadow-sm active:scale-[0.98] transition-all duration-300 group flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-bold tracking-tight text-[#1A1A1A] mb-2 font-heading leading-tight">
              Forgot your password?
            </h1>
            <p className="text-[14px] text-[#6B6B6B]">
              Enter your email and we'll send you a secure reset link.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-[#6B6B6B] mb-2 uppercase tracking-widest">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-[12px] bg-[#FAF8F5]/50 border border-[#E8E0D8] text-[#1A1A1A] text-[14px] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#C4727F] focus:ring-1 focus:ring-[#C4727F]/20 transition-all duration-300"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden py-3.5 rounded-xl bg-[#b95b6a] text-white text-[15px] font-semibold hover:bg-[#a84e5b] hover:-translate-y-0.5 shadow-sm active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none group flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#C4727F] hover:text-[#a84e5b] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}
