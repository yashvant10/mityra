"use client";

import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function AdminApiHealthPage() {
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const apis = [
    { name: "Firebase Auth", status: "operational", latency: "42ms" },
    { name: "Firestore Database", status: "operational", latency: "65ms" },
    { name: "Virtual Try-On Model (GPU)", status: "operational", latency: "4120ms" },
    { name: "Amazon Product API (RapidAPI)", status: "operational", latency: "850ms" },
    { name: "Flipkart Product API (RapidAPI)", status: "degraded", latency: "4000ms+" },
    { name: "Myntra/PriceScout (RapidAPI)", status: "down", latency: "Timeout" },
    { name: "AI Recommendations Engine", status: "operational", latency: "120ms" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">API Health & Status</h1>
          <p className="text-sm text-[#1A1A1A]/60">Monitor third-party services and internal systems.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#FAF8F5] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </button>
      </div>

      <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">System Components</h2>
        <div className="space-y-4">
          {apis.map((api, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl gap-4">
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">{api.name}</p>
                <p className="text-xs text-[#1A1A1A]/60 mt-1">Latency: {api.latency}</p>
              </div>
              <div>
                {api.status === 'operational' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00B982]/10 text-[#00B982] rounded-lg text-xs font-bold uppercase tracking-wider border border-[#00B982]/20">
                    <CheckCircle className="w-4 h-4" /> Operational
                  </span>
                )}
                {api.status === 'degraded' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-amber-200">
                    <AlertTriangle className="w-4 h-4" /> Degraded
                  </span>
                )}
                {api.status === 'down' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-red-200">
                    <XCircle className="w-4 h-4" /> Offline
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
