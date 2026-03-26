'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { signInWithEmail, signOut } from '@/lib/supabase/auth';
import { fetchDeals, saveDeal } from '@/lib/supabase/deals';
import { useDealStore } from '@/lib/store/dealStore';
import type { User } from '@supabase/supabase-js';
import { LogOut, Cloud, Mail } from 'lucide-react';

interface Props {
  variant?: 'light' | 'dark';
}

export function AuthButton({ variant = 'dark' }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const { deals, setDeals } = useDealStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setShowForm(false);
      if (u) {
        setSyncing(true);
        try {
          const cloudDeals = await fetchDeals();
          if (cloudDeals.length > 0) {
            setDeals(cloudDeals);
          } else {
            const localDeals = useDealStore.getState().deals;
            for (const d of localDeals) await saveDeal(d);
          }
        } catch { /* keep local */ }
        finally { setSyncing(false); }
      }
    });

    return () => subscription.unsubscribe();
  }, [setDeals]);

  // Auto-save to cloud when logged in
  useEffect(() => {
    if (!user || deals.length === 0) return;
    const last = deals[0];
    if (last?.analysis) saveDeal(last).catch(() => {});
  }, [deals, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  if (loading) return null;

  const isLight = variant === 'light';
  const baseBtn = isLight
    ? 'border border-slate-300 text-slate-600 hover:bg-slate-50'
    : 'text-slate-300 hover:text-white hover:bg-white/10';

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {syncing
            ? <><div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /><span className="hidden sm:block">Syncing…</span></>
            : <><Cloud className="w-3 h-3 text-emerald-500" /><span className="hidden sm:block text-emerald-600">Synced</span></>
          }
        </div>
        <span className={`text-xs hidden sm:block truncate max-w-[120px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {user.email}
        </span>
        <button onClick={signOut} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-white/10 text-slate-400'}`} title="Sign out">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (showForm) {
    if (sent) {
      return (
        <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-emerald-400'}`}>
          ✓ Check your email for the link
        </div>
      );
    }
    return (
      <form onSubmit={handleSend} className="flex items-center gap-1.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoFocus
          className={`text-sm px-2.5 py-1.5 rounded-lg border outline-none w-40 ${isLight ? 'border-slate-300 text-slate-700 bg-white' : 'border-white/20 bg-white/10 text-white placeholder-white/40'}`}
        />
        <button type="submit" disabled={sending}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${isLight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'} disabled:opacity-50`}>
          {sending ? '…' : 'Send'}
        </button>
        <button type="button" onClick={() => setShowForm(false)}
          className={`text-sm px-2 py-1.5 rounded-lg ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-400 hover:text-white'}`}>
          ✕
        </button>
      </form>
    );
  }

  return (
    <button onClick={() => setShowForm(true)} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${baseBtn}`}>
      <Mail className="w-4 h-4" />
      <span className="hidden sm:block">Sign in to sync</span>
    </button>
  );
}
