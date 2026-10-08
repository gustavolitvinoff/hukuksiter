import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/lib/supabase';
import { StringKey, strings, weekdays } from './strings';

type I18n = {
  lang: Lang;
  isRTL: boolean;
  setLang: (l: Lang) => void;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
  dayName: (weekday: number) => string;
};

const Ctx = createContext<I18n | null>(null);
const STORAGE_KEY = 'hukuksiter.lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'he' || v === 'en') setLangState(v);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      isRTL: lang === 'he',
      setLang,
      t: (key, params) => {
        let s = strings[lang][key] ?? strings.en[key] ?? key;
        if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
        return s;
      },
      dayName: (d) => weekdays[lang][d],
    }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be inside I18nProvider');
  return v;
}
