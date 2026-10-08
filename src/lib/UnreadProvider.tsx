import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

type Unread = { count: number; refresh: () => Promise<void>; version: number };
const Ctx = createContext<Unread>({ count: 0, refresh: async () => {}, version: 0 });

/**
 * Cuenta las notificaciones no leídas y escucha cambios en tiempo real.
 * `version` cambia cada vez que llega algo nuevo, para que las pantallas recarguen.
 */
export function UnreadProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    const { count: c } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    setCount(c ?? 0);
  }, [userId]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`user-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          refresh();
          setVersion((v) => v + 1);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return <Ctx.Provider value={{ count, refresh, version }}>{children}</Ctx.Provider>;
}

export const useUnread = () => useContext(Ctx);
