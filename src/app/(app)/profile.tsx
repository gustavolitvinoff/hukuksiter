import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { DateTimeField } from '@/components/DateTimeField';
import { Button, Card, Input, LangToggle, Message, Pill, Screen, T, colors } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { errorKey } from '@/lib/errors';
import { parseISODate, toISODate } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { t, lang } = useI18n();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const userId = session!.user.id;
  const isSitter = profile?.role === 'babysitter';

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState('');
  const [birth, setBirth] = useState(() =>
    profile?.birth_date ? parseISODate(profile.birth_date) : new Date(2008, 0, 1),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from('private_info')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setPhone(data?.phone ?? ''));
  }, [userId]);

  // Guardar el idioma en el perfil (también se usa para las notificaciones push)
  useEffect(() => {
    if (profile && profile.language !== lang) {
      supabase.from('profiles').update({ language: lang }).eq('id', userId).then(() => refreshProfile());
    }
  }, [lang, profile, userId, refreshProfile]);

  const save = async () => {
    setMsg(null);
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      return setMsg({ kind: 'error', text: t('fillAll') });
    }
    setBusy(true);
    const r1 = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(isSitter ? { birth_date: toISODate(birth) } : {}),
      })
      .eq('id', userId);
    const r2 = await supabase.from('private_info').update({ phone: phone.trim() }).eq('user_id', userId);
    setBusy(false);
    const e = r1.error ?? r2.error;
    if (e) return setMsg({ kind: 'error', text: t(errorKey(e)) });
    setMsg({ kind: 'success', text: t('saved') });
    refreshProfile();
  };

  const maxBirth = new Date();
  maxBirth.setFullYear(maxBirth.getFullYear() - 10);

  return (
    <Screen>
      <T variant="title">{t('profileTitle')}</T>
      <Pill
        label={isSitter ? `🧸 ${t('babysitter')}` : `👨‍👩‍👧 ${t('employer')}`}
        color={colors.primaryDark}
        bg={colors.primarySoft}
      />

      <Card>
        <T variant="h2">{t('language')}</T>
        <LangToggle />
      </Card>

      <Card>
        <Input label={t('firstName')} value={firstName} onChangeText={setFirstName} />
        <Input label={t('lastName')} value={lastName} onChangeText={setLastName} />
        <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {isSitter && (
          <DateTimeField label={t('birthDate')} mode="date" value={birth} onChange={setBirth} maximumDate={maxBirth} />
        )}
        <T variant="small">{session?.user.email}</T>
        {msg && <Message kind={msg.kind} text={msg.text} />}
        <Button title={t('save')} onPress={save} loading={busy} />
      </Card>

      <Button title={t('logout')} variant="danger" onPress={signOut} />
    </Screen>
  );
}
