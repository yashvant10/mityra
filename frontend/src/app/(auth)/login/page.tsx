"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const checkRoleAndRedirect = async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const role = data.profile?.role;
          if (role === 'admin' || role === 'super_admin') {
            router.push('/admin');
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Error checking role:", err);
    }
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      await checkRoleAndRedirect();
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
      await checkRoleAndRedirect();
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
          Welcome back
        </h1>
        <p className="text-[14px] text-[#6B6B6B]">
          Log in to continue your styling journey
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

      <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="Enter your password"
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

        <div className="flex items-center justify-between text-[13px] pt-2 pb-3">
          <label className="flex items-center gap-2 cursor-pointer group text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
              className="w-4 h-4 rounded border-[#E8E0D8] text-[#C4727F] focus:ring-[#C4727F]/30 focus:ring-offset-0 cursor-pointer transition-colors"
            />
            <span className="font-medium text-[#1A1A1A]">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-[#C4727F] hover:text-[#A85B67] font-semibold transition-colors"
          >
            Forgot password?
          </Link>
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
              Log in
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Social Divider */}
      <div className="relative my-8 flex items-center justify-center">
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

      <p className="text-center text-[14px] text-[#6B6B6B] mt-8">
        Don't have an account?{" "}
        <Link
          href="/signup"
          className="text-[#C4727F] hover:text-[#A85B67] font-bold transition-colors"
        >
          Sign up
        </Link>
      </p>
    </motion.div>
  );
}
