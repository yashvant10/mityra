"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!agreeTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name);
      router.push("/dashboard");
    } catch {
      setError("Could not create account. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      setError("Google sign-in failed. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full bg-white rounded-3xl border border-[#E8E0D8] p-8 md:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)] relative overflow-hidden"
    >
      <div className="text-center mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-[#1A1A1A] mb-2 font-heading leading-tight">
          Create your account
        </h1>
        <p className="text-[14px] text-[#6B6B6B]">
          Start your personalized styling journey
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[#6B6B6B] mb-2 uppercase tracking-widest">
            Full name
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-[12px] bg-[#FAF8F5]/50 border border-[#E8E0D8] text-[#1A1A1A] text-[14px] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#C4727F] focus:ring-1 focus:ring-[#C4727F]/20 transition-all duration-300"
              placeholder="Enter your full name"
              required
            />
          </div>
        </div>

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

        <div>
          <label className="block text-[11px] font-bold text-[#6B6B6B] mb-2 uppercase tracking-widest">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-4 pr-12 py-3.5 rounded-[12px] bg-[#FAF8F5]/50 border border-[#E8E0D8] text-[#1A1A1A] text-[14px] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#C4727F] focus:ring-1 focus:ring-[#C4727F]/20 transition-all duration-300"
              placeholder="Create a password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-[#6B6B6B] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-[18px] h-[18px]" />
              ) : (
                <Eye className="w-[18px] h-[18px]" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#6B6B6B] mb-2 uppercase tracking-widest">
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-4 pr-12 py-3.5 rounded-[12px] bg-[#FAF8F5]/50 border border-[#E8E0D8] text-[#1A1A1A] text-[14px] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#C4727F] focus:ring-1 focus:ring-[#C4727F]/20 transition-all duration-300"
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-[#6B6B6B] transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-[18px] h-[18px]" />
              ) : (
                <Eye className="w-[18px] h-[18px]" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-start text-[13px] pt-1 pb-2">
          <label className="flex items-start gap-2.5 cursor-pointer text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={() => setAgreeTerms(!agreeTerms)}
              className="w-4 h-4 rounded border-[#E8E0D8] text-[#C4727F] focus:ring-[#C4727F]/30 focus:ring-offset-0 mt-0.5 cursor-pointer transition-colors"
            />
            <span className="leading-snug">
              I agree to the <span className="text-[#1A1A1A] font-medium hover:text-[#C4727F] transition-colors">Terms of Service</span> and <span className="text-[#1A1A1A] font-medium hover:text-[#C4727F] transition-colors">Privacy Policy</span>
            </span>
          </label>
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
              Create Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Social Divider */}
      <div className="relative my-7 flex items-center justify-center">
        <div className="absolute inset-x-0 h-px bg-[#E8E0D8]" />
        <span className="relative z-10 px-4 bg-white text-[10px] text-[#9B9B9B] uppercase tracking-widest font-bold">
          or continue with
        </span>
      </div>

      {/* Social Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleGoogle}
          className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-white border border-[#E8E0D8] hover:bg-[#FAF8F5] active:scale-95 transition-all duration-300 text-[13px] font-bold text-[#1A1A1A]"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-[18px] h-[18px]" />
          Google
        </button>
        <button
          onClick={() => {}}
          className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-white border border-[#E8E0D8] hover:bg-[#FAF8F5] active:scale-95 transition-all duration-300 text-[13px] font-bold text-[#1A1A1A]"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-[16px] h-[16px]" />
          Apple
        </button>
        <button
          onClick={() => {}}
          className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-white border border-[#E8E0D8] hover:bg-[#FAF8F5] active:scale-95 transition-all duration-300 text-[13px] font-bold text-[#1A1A1A]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          OTP
        </button>
      </div>

      <p className="text-center text-[14px] text-[#6B6B6B] mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[#C4727F] hover:text-[#A85B67] font-bold transition-colors"
        >
          Log in
        </Link>
      </p>
    </motion.div>
  );
}
