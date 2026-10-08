import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { DateTimeField } from '@/components/DateTimeField';
import { Button, Card, colors, Message, Row, Screen, Segmented, T } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { errorKey } from '@/lib/errors';
import { formatDate, ltr, timeRange, toISODate, toTime, withTime } from '@/lib/format';
import { Availability as Slot, supabase } from '@/lib/supabase';

export default function AvailabilityScreen() {
  const { t, dayName } = useI18n();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [slots, setSlots] = useState<Slot[]>([]);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<'weekly' | 'date'>('weekly');
  const [days, setDays] = useState<number[]>([]);
  const [date, setDate] = useState(() => new Date());
  const [from, setFrom] = useState(() => withTime(17));
  const [to, setTo] = useState(() => withTime(23));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('babysitter_id', userId)
      .order('weekday', { ascending: true })
      .order('on_date', { ascending: true })
      .order('start_time', { ascending: true });
    setSlots((data as Slot[]) ?? []);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    setError('');
    if (toTime(to) <= toTime(from)) return setError(t('endAfterStart'));
    if (kind === 'weekly' && days.length === 0) return setError(t('fillAll'));
    setBusy(true);
    const base = { babysitter_id: userId, start_time: toTime(from), end_time: toTime(to) };
    const rows: Omit<Slot, 'id'>[] =
      kind === 'weekly'
        ? days.map((d) => ({ ...base, weekday: d, on_date: null }))
        : [{ ...base, weekday: null, on_date: toISODate(date) }];
    const { error: e } = await supabase.from('availability').insert(rows);
    setBusy(false);
    if (e) return setError(t(errorKey(e)));
    setAdding(false);
    setDays([]);
    load();
  };

  const remove = async (id: string) => {
    setSlots((s) => s.filter((x) => x.id !== id));
    await supabase.from('availability').delete().eq('id', id);
  };

  const today = toISODate(new Date());
  const weekly = slots.filter((s) => s.weekday != null);
  const dated = slots.filter((s) => s.on_date != null && s.on_date >= today);

  const SlotRow = ({ s }: { s: Slot }) => (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '700' }}>
          {s.weekday != null ? t('everyDay', { day: dayName(s.weekday) }) : ltr(formatDate(s.on_date!))}
        </T>
        <T variant="muted">
          🕒 {timeRange(s.start_time, s.end_time)}
        </T>
      </View>
      <Button title={t('delete')} variant="danger" small onPress={() => remove(s.id)} />
    </Row>
  );

  return (
    <Screen>
      <T variant="title">{t('availabilityTitle')}</T>
      <T variant="muted">{t('availabilityHelp')}</T>

      {!adding && <Button title={`＋  ${t('addSlot')}`} onPress={() => setAdding(true)} />}

      {adding && (
        <Card>
          <Segmented
            options={[
              { value: 'weekly', label: t('weekly') },
              { value: 'date', label: t('specificDate') },
            ]}
            value={kind}
            onChange={setKind}
          />

          {kind === 'weekly' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const on = days.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDays((x) => (on ? x.filter((y) => y !== d) : [...x, d]))}
                    style={{
                      paddingHorizontal: 14,
                      minHeight: 44,
                      justifyContent: 'center',
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: on ? colors.primary : colors.border,
                      backgroundColor: on ? colors.primary : colors.card,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#fff' : colors.text }}>
                      {dayName(d)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <DateTimeField label={t('date')} mode="date" value={date} onChange={setDate} minimumDate={new Date()} />
          )}

          <Row gap={12}>
            <DateTimeField label={t('from')} mode="time" value={from} onChange={setFrom} />
            <DateTimeField label={t('to')} mode="time" value={to} onChange={setTo} />
          </Row>

          {!!error && <Message kind="error" text={error} />}
          <Row>
            <Button title={t('save')} onPress={save} loading={busy} style={{ flex: 1 }} />
            <Button
              title={t('cancel')}
              variant="secondary"
              onPress={() => {
                setAdding(false);
                setError('');
              }}
              style={{ flex: 1 }}
            />
          </Row>
        </Card>
      )}

      {slots.length === 0 && !adding && <Message text={t('noSlots')} />}

      {weekly.length > 0 && (
        <Card>
          <T variant="h2">🔁 {t('weeklySection')}</T>
          {weekly.map((s) => (
            <SlotRow key={s.id} s={s} />
          ))}
        </Card>
      )}

      {dated.length > 0 && (
        <Card>
          <T variant="h2">📅 {t('datesSection')}</T>
          {dated.map((s) => (
            <SlotRow key={s.id} s={s} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
