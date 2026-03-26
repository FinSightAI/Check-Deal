'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { signInWithGitHub, signOut } from '@/lib/supabase/auth';
import { fetchDeals, saveDeal } from '@/lib/supabase/deals';
import { useDealStore } from '@/lib/store/dealStore';
import type { User } from '@supabase/supabase-js';
import { Github, LogOut, Cloud, CloudOff } from 'lucide-react';

interface Props {
  variant?: 'light' | 'dark';
}

export function AuthButton({ variant = 'dark' }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { deals, setDeals } = useDealStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // Load deals from cloud
        setSyncing(true);
        try {
          const cloudDeals = await fetchDeals();
          if (cloudDeals.length > 0) {
            setDeals(cloudDeals);
          } else {
            // Migrate local deals to cloud
            const localDeals = useDealStore.getState().deals;
            for (const d of localDeals) {
              await saveDeal(d);
            }
          }
        } catch { /* keep local */ }
        finally { setSyncing(false); }
      }
    });

    return () => subscription.unsubscribe();
  }, [setDeals]);

  // Auto-save deals to cloud when logged in
  useEffect(() => {
    if (!user || deals.length === 0) return;
    const last = deals[0];
    if (last?.analysis) {
      saveDeal(last).catch(() => {});
    }
  }, [deals, user]);

  if (loading) return null;

  const isLight = variant === 'light';

  if (!user) {
    return (
      <button
        onClick={signInWithGitHub}
        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
          isLight
            ? 'border border-slate-300 text-slate-600 hover:bg-slate-50'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Github className="w-4 h-4" />
        <span className="hidden sm:block">Sign in to sync</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
        {syncing
          ? <><div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /><span className="hidden sm:block">Syncing…</span></>
          : <><Cloud className="w-3 h-3 text-emerald-500" /><span className="hidden sm:block text-emerald-600">Synced</span></>
        }
      </div>
      <img src={user.user_metadata?.avatar_url} alt="" className="w-6 h-6 rounded-full" />
      <button
        onClick={signOut}
        className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-white/10 text-slate-400'}`}
        title="Sign out"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
