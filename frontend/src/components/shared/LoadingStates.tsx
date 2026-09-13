"use client";

import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, RefreshCcw, Search, Inbox, CheckCircle2, Loader2 } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// LoadingStates.tsx — Reusable loading, error, empty, and success components
// Consistent UX across the entire MITYRA application
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Page Loader (full-page centered — branded MITYRA lettermark) ────────────
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div
          className="w-14 h-14 rounded-xl bg-[#1A1A1A] flex items-center justify-center"
          style={{ animation: "premium-glow 3s ease-in-out infinite" }}
        >
          <span className="text-lg font-bold text-white font-heading select-none">M</span>
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C4727F]" />
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-[#6B6B6B] font-medium"
      >
        {message}
      </motion.p>
    </div>
  );
}

// ─── Section Loader (inline section shimmer) ────────────────────────────────
export function SectionLoader({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg skeleton-wave"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

// ─── Card Skeleton (matches ProductCard dimensions) ─────────────────────────
export function CardSkeleton() {
  return (
    <div className="w-full flex flex-col rounded-xl border border-[#E8E0D8] overflow-hidden">
      <div className="aspect-[3/4] skeleton-wave" />
      <div className="p-3 space-y-2">
        <div className="h-4 skeleton-wave w-3/4 rounded" />
        <div className="h-3 skeleton-wave w-1/2 rounded" />
        <div className="h-9 skeleton-wave w-full rounded-xl mt-2" />
      </div>
    </div>
  );
}

// ─── Grid Skeleton (grid of CardSkeletons) ──────────────────────────────────
export function GridSkeleton({ count = 8, columns = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" }: { count?: number; columns?: string }) {
  return (
    <div className={`grid ${columns} gap-4 sm:gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <CardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Row Skeleton (horizontal scroll skeleton) ──────────────────────────────
export function RowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[160px] flex-shrink-0">
          <div className="aspect-[3/4] rounded-[16px] skeleton-wave mb-3" />
          <div className="h-4 skeleton-wave w-2/3 rounded mb-1" />
          <div className="h-3 skeleton-wave w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Inline Spinner (for buttons) ───────────────────────────────────────────
export function InlineSpinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <Loader2
      className={`animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon,
  title = "Nothing here yet",
  subtitle = "Items will appear here once you add them.",
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  const ActionTag = actionHref ? "a" : "button";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex flex-col items-center justify-center py-16 sm:py-20 bg-white rounded-[24px] border border-dashed border-[#E8E0D8]"
    >
      <div className="w-16 h-16 bg-[#FAF1F2] rounded-full flex items-center justify-center text-[#C4727F] mb-4">
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h3 className="text-[18px] font-bold text-[#1A1A1A] font-heading mb-2 text-center px-4">
        {title}
      </h3>
      <p className="text-[13px] text-[#6B6B6B] mb-6 text-center max-w-xs px-4">{subtitle}</p>
      {(actionLabel && (onAction || actionHref)) && (
        <ActionTag
          onClick={onAction}
          href={actionHref}
          className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-[13px] font-bold hover:bg-[#333333] transition-colors active:scale-[0.97]"
        >
          {actionLabel}
        </ActionTag>
      )}
    </motion.div>
  );
}

// ─── Error State ────────────────────────────────────────────────────────────
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 bg-[#FEF2F2] border border-red-100 rounded-2xl">
        <AlertCircle className="w-5 h-5 text-[#b95b6a] flex-shrink-0" />
        <p className="text-[13px] text-[#1A1A1A] font-medium flex-1">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-white border border-[#E8E0D8] rounded-full text-[11px] font-bold text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors flex items-center gap-1.5 active:scale-[0.97]"
          >
            <RefreshCcw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex flex-col items-center justify-center text-center p-8 sm:p-12 border-2 border-dashed border-[#E8E0D8] rounded-[24px] bg-[#FAF8F5]/50"
    >
      <div className="w-14 h-14 bg-[#FEF2F2] rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-[#b95b6a]" />
      </div>
      <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">{message}</p>
      <p className="text-[12px] text-[#6B6B6B] mb-5">
        Please check your connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-white border border-[#E8E0D8] rounded-full text-[12px] font-bold text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors flex items-center gap-2 shadow-sm active:scale-[0.97]"
        >
          <RefreshCcw className="w-3.5 h-3.5" /> Try Again
        </button>
      )}
    </motion.div>
  );
}

// ─── Success State ──────────────────────────────────────────────────────────
export function SuccessState({
  message = "Success!",
  subtitle,
}: {
  message?: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="w-16 h-16 bg-[#E8F3ED] rounded-full flex items-center justify-center mb-4"
      >
        <CheckCircle2 className="w-8 h-8 text-[#2D6A4F]" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-[18px] font-bold text-[#1A1A1A] font-heading mb-1"
      >
        {message}
      </motion.h3>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[13px] text-[#6B6B6B]"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
