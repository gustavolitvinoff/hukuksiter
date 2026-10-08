import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Brand } from '@/components/Brand';
import { Button, Card, Input, LangToggle, Message, Screen, T } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { errorKey } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const { t } = useI18n();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (session) return <Redirect href="/" />;

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) return setError(t('fillAll'));
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (e) return setError(t(errorKey(e)));
    router.replace('/');
  };

  return (
    <Screen>
      <LangToggle />
      <Brand />
      <Card>
        <T variant="h2">{t('login')}</T>
        <Input
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Input
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        {!!error && <Message kind="error" text={error} />}
        <Button title={t('login')} onPress={submit} loading={busy} />
        <Button title={t('forgotPassword')} variant="ghost" small onPress={() => router.push('/forgot')} />
      </Card>
      <T variant="muted" center>
        {t('noAccount')}
      </T>
      <Button title={t('register')} variant="secondary" onPress={() => router.push('/register')} />
    </Screen>
  );
}
