import type { StringKey } from '@/i18n/strings';

/** Convierte errores de Supabase en un texto de la app */
export function errorKey(err: { message?: string } | null | undefined): StringKey {
  const m = err?.message ?? '';
  if (m.includes('conflict')) return 'conflict';
  if (m.includes('invalid_time')) return 'endAfterStart';
  if (m.includes('Invalid login credentials')) return 'loginError';
  if (m.includes('Password should be')) return 'passwordShort';
  if (m.includes('fetch') || m.includes('TU-PROYECTO')) return 'configMissing';
  return 'error';
}
