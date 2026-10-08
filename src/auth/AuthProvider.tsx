import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { Profile, supabase } from '@/lib/supabase';

type Auth = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string | undefined) => {
      if (!userId) {
        setProfile(null);
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      setProfile((data as Profile) ?? null);
      if (data?.language === 'he' || data?.language === 'en') setLang(data.language);
    },
    [setLang],
  );

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        await loadProfile(data.session?.user.id);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Se ejecuta fuera del callback para no bloquear a Supabase
      setTimeout(() => loadProfile(s?.user.id), 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);

  const signOut = useCallback(async () => {
    if (session) {
      // Deja de recibir notificaciones en este celular
      await supabase.from('private_info').update({ push_token: null }).eq('user_id', session.user.id);
    }
    await supabase.auth.signOut();
    setProfile(null);
  }, [session]);

  return (
    <Ctx.Provider value={{ session, profile, loading, refreshProfile, signOut }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
