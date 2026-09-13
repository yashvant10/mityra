"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { getFirestore, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import TopNav from "@/components/dashboard/TopNav";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, FileText } from "lucide-react";

interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export default function CreditHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const db = getFirestore(app);
        const ledgerRef = collection(db, "credit_ledger");
        const q = query(
          ledgerRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as LedgerEntry));
        setHistory(data);
      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          console.warn("Credit history: insufficient permissions — showing empty state");
        } else {
          console.warn("Error fetching credit history:", error?.message || error);
        }
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      <TopNav />
      <main className="max-w-4xl mx-auto px-6 pt-24">
        <div className="mb-12">
          <h1 className="text-[32px] font-bold text-[#1A1A1A] font-heading mb-2">Credit History</h1>
          <p className="text-[#6B6B6B]">Track your VTO usage and purchases.</p>
        </div>

        <div className="bg-white rounded-[24px] border border-[#E8E0D8] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-[#9B9B9B]">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <p>Loading transaction history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-[#E8E0D8] mx-auto mb-4" />
              <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2">No Transactions Yet</h3>
              <p className="text-[#6B6B6B]">Your credit purchases and VTO usage will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E0D8]">
              {history.map((entry, idx) => {
                const isPositive = entry.amount > 0;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={entry.id} 
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">{entry.description}</p>
                        <div className="flex items-center gap-2 text-[13px] text-[#9B9B9B]">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <span className={`text-[18px] font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{entry.amount} Credits
                      </span>
                      <span className="text-[12px] font-medium text-[#6B6B6B]">
                        Balance: {entry.balanceAfter}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
