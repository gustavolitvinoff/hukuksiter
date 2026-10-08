import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Input, Message, Screen, T } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { errorKey } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/**
 * Recuperar contraseña con un código de 6 dígitos que llega por email.
 * (En Supabase hay que agregar {{ .Token }} a la plantilla "Reset Password" — ver README).
 */
export default function Forgot() {
  const { t } = useI18n();
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    setError('');
    if (!email.trim()) return setError(t('fillAll'));
    setBusy(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (e) return setError(t(errorKey(e)));
    setStep('code');
  };

  const save = async () => {
    setError('');
    if (!code.trim() || !password) return setError(t('fillAll'));
    if (password.length < 6) return setError(t('passwordShort'));
    setBusy(true);
    const { error: e1 } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });
    if (e1) {
      setBusy(false);
      return setError(t(errorKey(e1)));
    }
    const { error: e2 } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (e2) return setError(t(errorKey(e2)));
    setStep('done');
  };

  return (
    <Screen>
      <T variant="title">{t('resetTitle')}</T>
      <Card>
        {step === 'email' && (
          <>
            <T variant="muted">{t('resetHelp')}</T>
            <Input
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {!!error && <Message kind="error" text={error} />}
            <Button title={t('sendCode')} onPress={sendCode} loading={busy} />
          </>
        )}
        {step === 'code' && (
          <>
            <Message kind="success" text={t('codeSent')} />
            <Input label={t('code')} value={code} onChangeText={setCode} keyboardType="number-pad" />
            <Input label={t('newPassword')} value={password} onChangeText={setPassword} secureTextEntry />
            {!!error && <Message kind="error" text={error} />}
            <Button title={t('savePassword')} onPress={save} loading={busy} />
          </>
        )}
        {step === 'done' && (
          <>
            <Message kind="success" text={t('passwordUpdated')} />
            <Button title={t('ok')} onPress={() => router.replace('/')} />
          </>
        )}
      </Card>
      {step !== 'done' && <Button title={t('back')} variant="ghost" onPress={() => router.back()} />}
    </Screen>
  );
}
