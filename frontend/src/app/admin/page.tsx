'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Users, Search, ShieldCheck, Gift, History, 
  LogOut, AlertCircle, CheckCircle2, ChevronRight, Coins 
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  const [giftAmount, setGiftAmount] = useState('');
  const [isGifting, setIsGifting] = useState(false);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const fetchTransactions = async (authToken: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/admin-dashboard/transactions`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      } else if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to fetch transactions');
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (loading) return;
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        const idToken = await (user as any).getIdToken();
        setToken(idToken);
        fetchTransactions(idToken);
      } catch (err) {
        console.error("Failed to get token", err);
      }
    };
    initData();
  }, [user, loading, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !token) return;
    
    setIsSearching(true);
    setMessage({ text: '', type: '' });
    setSelectedUser(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/admin-dashboard/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) return handleLogout();
      
      const data = await res.json();
      setSearchResults(data.users || []);
      if (data.users && data.users.length === 0) {
        setMessage({ text: 'No users found matching that Email or UID.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Search failed to connect to server.', type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleGiftCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !token || !giftAmount) return;

    const amount = parseInt(giftAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ text: 'Please enter a valid positive integer for credits.', type: 'error' });
      return;
    }

    if (!confirm(`Are you sure you want to gift ${amount} credits to ${selectedUser.email}?`)) {
      return;
    }

    setIsGifting(true);
    setMessage({ text: '', type: '' });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/admin-dashboard/users/${selectedUser.uid}/gift-credits`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ amount })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage({ text: `Successfully gifted ${amount} credits!`, type: 'success' });
        setGiftAmount('');
        // Update local user state
        setSelectedUser({ ...selectedUser, credits: selectedUser.credits + amount });
        // Refresh transactions
        fetchTransactions(token);
      } else {
        setMessage({ text: data.message || 'Failed to gift credits.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Failed to gift credits.', type: 'error' });
    } finally {
      setIsGifting(false);
    }
  };

  if (!token) return <div className="min-h-screen bg-[#050505]" />; // Loading state

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 p-6 md:p-10 font-sans">
      
      {/* Top Navigation */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-12 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">MITYRA Command Center</h1>
            <p className="text-sm text-gray-400">Secure Admin Environment</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Search & Action */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Search Section */}
          <div className="bg-[#111] rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Locate User
            </h2>
            
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Enter exact Email or Firebase UID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isSearching}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Search Results List */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-gray-400 mb-3">Found {searchResults.length} matching user(s):</p>
                {searchResults.map(user => (
                  <div 
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-white font-medium">{user.email}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">UID: {user.uid}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Details & Gifting Section */}
          {selectedUser && (
            <div className="bg-[#111] rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
              
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    User Profile
                  </h2>
                  <p className="text-gray-400 mt-1">{selectedUser.email}</p>
                  <p className="text-xs text-gray-600 font-mono mt-1">UID: {selectedUser.uid}</p>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="text-sm text-gray-500 hover:text-white transition-colors"
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-black border border-white/5 rounded-xl p-5">
                  <p className="text-sm text-gray-500 mb-1">Current Balance</p>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <span className="text-3xl font-bold text-white">{selectedUser.credits || 0}</span>
                  </div>
                </div>
                <div className="bg-black border border-white/5 rounded-xl p-5 flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-1">Account Status</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  Issue Credits
                </h3>
                
                <form onSubmit={handleGiftCredits} className="flex gap-4">
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      min="1"
                      step="1"
                      placeholder="Enter amount to add..." 
                      value={giftAmount}
                      onChange={(e) => setGiftAmount(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isGifting || !giftAmount}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {isGifting ? 'Processing...' : 'Apply Credits'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {message.text && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-200' 
                : 'bg-red-500/10 border-red-500/20 text-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

        </div>

        {/* Right Column: Audit Log */}
        <div className="bg-[#111] rounded-2xl border border-white/10 p-6 shadow-2xl flex flex-col">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            Audit Ledger
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[600px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No recent transactions</p>
            ) : (
              transactions.map((tx, idx) => (
                <div key={idx} className="bg-black border border-white/5 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-white truncate pr-4">{tx.targetEmail}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>{tx.previousBalance}</span>
                      <ChevronRight className="w-3 h-3 text-gray-600" />
                      <span className="text-green-400 font-bold">+{tx.creditsAdded}</span>
                      <ChevronRight className="w-3 h-3 text-gray-600" />
                      <span className="text-white font-bold">{tx.newBalance}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 font-mono mt-3 border-t border-white/5 pt-2 truncate">
                    ID: {tx.targetUid}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
