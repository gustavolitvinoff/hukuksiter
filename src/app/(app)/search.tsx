import { useState } from 'react';
import { Text, View } from 'react-native';
import { DateTimeField } from '@/components/DateTimeField';
import { Button, Card, colors, Message, Row, Screen, T } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { errorKey } from '@/lib/errors';
import { toISODate, toTime, withTime } from '@/lib/format';
import { BabysitterResult, supabase } from '@/lib/supabase';

export default function Search() {
  const { t } = useI18n();
  const [date, setDate] = useState(() => new Date());
  const [from, setFrom] = useState(() => withTime(19));
  const [to, setTo] = useState(() => withTime(23));
  const [results, setResults] = useState<BabysitterResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const params = () => ({ p_date: toISODate(date), p_start: toTime(from), p_end: toTime(to) });

  const search = async () => {
    setError('');
    setSuccess('');
    if (toTime(to) <= toTime(from)) return setError(t('endAfterStart'));
    setBusy(true);
    const { data, error: e } = await supabase.rpc('search_babysitters', params());
    setBusy(false);
    if (e) return setError(t(errorKey(e)));
    setResults((data as BabysitterResult[]) ?? []);
    setSentTo({});
  };

  const request = async (b: BabysitterResult) => {
    setError('');
    setSending(b.id);
    const { error: e } = await supabase.rpc('create_booking', { p_babysitter: b.id, ...params() });
    setSending(null);
    if (e && !e.message.includes('already_requested')) return setError(t(errorKey(e)));
    setSentTo((s) => ({ ...s, [b.id]: true }));
    setSuccess(t('requestSent', { name: b.first_name }));
  };

  // Si cambia la fecha u hora, los resultados anteriores ya no sirven
  const change = <V,>(setter: (v: V) => void) => (v: V) => {
    setter(v);
    setResults(null);
    setSuccess('');
  };

  return (
    <Screen>
      <T variant="title">{t('searchTitle')}</T>
      <T variant="muted">{t('searchHelp')}</T>

      <Card>
        <DateTimeField label={t('date')} mode="date" value={date} onChange={change(setDate)} minimumDate={new Date()} />
        <Row gap={12}>
          <DateTimeField label={t('from')} mode="time" value={from} onChange={change(setFrom)} />
          <DateTimeField label={t('to')} mode="time" value={to} onChange={change(setTo)} />
        </Row>
        <Button title={`🔍  ${t('search')}`} onPress={search} loading={busy} />
      </Card>

      {!!error && <Message kind="error" text={error} />}
      {!!success && <Message kind="success" text={success} />}

      {results && results.length === 0 && <Message text={t('noResults')} />}

      {results && results.length > 0 && (
        <>
          <T variant="h2">
            {t('results')} ({results.length})
          </T>
          <T variant="small">🔒 {t('phoneAfterAccept')}</T>
          {results.map((b) => (
            <Card key={b.id}>
              <Row gap={14}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: colors.tealSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22, fontWeight: '800', color: colors.teal }}>
                    {b.first_name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="h2">
                    {b.first_name} {b.last_name}
                  </T>
                  {b.age != null && <T variant="muted">{t('age', { n: b.age })}</T>}
                </View>
              </Row>
              <Button
                title={sentTo[b.id] ? `✓ ${t('status_pending')}` : t('request')}
                variant={sentTo[b.id] ? 'secondary' : 'teal'}
                disabled={sentTo[b.id]}
                loading={sending === b.id}
                onPress={() => request(b)}
              />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
