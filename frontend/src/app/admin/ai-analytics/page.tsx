"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Activity, Server, Zap, Brain, Loader2 } from "lucide-react";

export default function AdminAIAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const result = await adminApi.getVirtualTryOnAnalytics();
      setData(result);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {

  useEffect(() => {
    fetchData();
  }, []);

    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[#C4727F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">AI & Inference Analytics</h1>
        <p className="text-sm text-[#1A1A1A]/60">Monitor AI model usage, latency, and costs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-3xl font-black text-[#1A1A1A]">{data?.total || 0}</h3>
          <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Total Inferences</p>
        </div>
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-[#00B982]/10 rounded-2xl flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-[#00B982]" />
          </div>
          <h3 className="text-3xl font-black text-[#1A1A1A]">~4.2s</h3>
          <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Avg. Latency</p>
        </div>
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <Server className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-3xl font-black text-[#1A1A1A]">99.9%</h3>
          <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Uptime</p>
        </div>
      </div>
      
      <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">AI Model Status</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E0D8]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#00B982]/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#00B982] animate-pulse"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">Virtual Try-On Engine (VTON-3.5)</p>
                <p className="text-xs text-[#1A1A1A]/60">Operational • Loaded on 4x A100</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#00B982]">Healthy</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E0D8]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#00B982]/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#00B982] animate-pulse"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">Style Recommender (MITYRA-RecSys)</p>
                <p className="text-xs text-[#1A1A1A]/60">Operational • Hosted API</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#00B982]">Healthy</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E0D8]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#C4727F]/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#C4727F]"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">Background Transformer</p>
                <p className="text-xs text-[#1A1A1A]/60">Degraded Performance • High Load</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#C4727F]">Warning</span>
          </div>
        </div>
      </div>
    </div>
  );
}
