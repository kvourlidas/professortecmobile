// src/context/AuthContext.tsx (or wherever it lives)
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const user = session?.user ?? null;

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error('getSession error:', error);
    setSession(data.session ?? null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    let alive = true;

    const init = async () => {
      setLoading(true);
      await refreshSession();
      if (!alive) return;
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ loading, session, user, signOut, refreshSession }),
    [loading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
