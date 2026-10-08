import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { DateTimeField } from '@/components/DateTimeField';
import { Button, Card, colors, Input, LangToggle, Message, Screen, T } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { errorKey } from '@/lib/errors';
import { toISODate } from '@/lib/format';
import { Role, supabase } from '@/lib/supabase';

function RoleCard({
  emoji,
  title,
  desc,
  active,
  onPress,
}: {
  emoji: string;
  title: string;
  desc: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 4,
        padding: 14,
        borderRadius: 18,
        borderWidth: 2.5,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.card,
      }}
    >
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{title}</Text>
      <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>{desc}</Text>
    </Pressable>
  );
}

export default function Register() {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const [role, setRole] = useState<Role>('employer');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birth, setBirth] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    return d;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (session) return <Redirect href="/" />;

  const submit = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim() || !password) {
      return setError(t('fillAll'));
    }
    if (password.length < 6) return setError(t('passwordShort'));
    setBusy(true);
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          birth_date: role === 'babysitter' ? toISODate(birth) : '',
          language: lang,
        },
      },
    });
    setBusy(false);
    if (e) return setError(t(errorKey(e)));
    if (data.session) router.replace('/');
    else setDone(true);
  };

  if (done) {
    return (
      <Screen>
        <Message kind="success" text={t('checkEmail')} />
        <Button title={t('login')} onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  const maxBirth = new Date();
  maxBirth.setFullYear(maxBirth.getFullYear() - 10);

  return (
    <Screen>
      <LangToggle />
      <T variant="title">{t('register')}</T>

      <T variant="h2">{t('iAm')}</T>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <RoleCard
          emoji="👨‍👩‍👧"
          title={t('employer')}
          desc={t('employerDesc')}
          active={role === 'employer'}
          onPress={() => setRole('employer')}
        />
        <RoleCard
          emoji="🧸"
          title={t('babysitter')}
          desc={t('babysitterDesc')}
          active={role === 'babysitter'}
          onPress={() => setRole('babysitter')}
        />
      </View>

      <Card>
        <Input label={t('firstName')} value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
        <Input label={t('lastName')} value={lastName} onChangeText={setLastName} autoComplete="family-name" />
        <Input
          label={t('phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="050-0000000"
        />
        {role === 'babysitter' && (
          <DateTimeField
            label={t('birthDate')}
            mode="date"
            value={birth}
            onChange={setBirth}
            maximumDate={maxBirth}
          />
        )}
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
          autoComplete="new-password"
        />
        {!!error && <Message kind="error" text={error} />}
        <Button title={t('createAccount')} onPress={submit} loading={busy} />
      </Card>

      <T variant="muted" center>
        {t('haveAccount')}
      </T>
      <Button title={t('login')} variant="secondary" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
