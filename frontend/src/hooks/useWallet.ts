import { useState, useEffect } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { app } from '../lib/firebase';

export function useWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    const db = getFirestore(app);
    const walletRef = doc(db, 'wallets', user.uid);
    
    const unsubscribe = onSnapshot(walletRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance ?? 0);
      } else {
        setBalance(0);
      }
      setLoading(false);
    }, (error) => {
      // Gracefully handle permission errors — don't crash the UI
      if (error?.code === 'permission-denied') {
        console.warn("Wallet: insufficient permissions — using fallback balance of 0");
      } else {
        console.warn("Wallet snapshot error:", error?.message || error);
      }
      setBalance(0);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { balance, loading };
}
