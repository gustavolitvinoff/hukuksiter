import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Card, colors, Message, Pill, Row, T } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { confirm } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { formatDate, isPastBooking, ltr, timeRange, toWhatsApp } from '@/lib/format';
import { BookingStatus, MyBooking, supabase } from '@/lib/supabase';
import { useUnread } from '@/lib/UnreadProvider';

const statusColors: Record<BookingStatus, { fg: string; bg: string }> = {
  pending: { fg: colors.amber, bg: colors.amberSoft },
  accepted: { fg: colors.teal, bg: colors.tealSoft },
  rejected: { fg: colors.danger, bg: colors.dangerSoft },
  cancelled: { fg: colors.muted, bg: colors.greySoft },
};

export default function Bookings() {
  const { t } = useI18n();
  const { version } = useUnread();
  const { profile } = useAuth();
  const [items, setItems] = useState<MyBooking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('my_bookings');
    setItems((data as MyBooking[]) ?? []);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Recargar cuando llega una notificación nueva
  useEffect(() => {
    if (version > 0) load();
  }, [version, load]);

  const act = async (id: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError('');
    setBusy(id);
    const { error: e } = await fn();
    setBusy(null);
    if (e) setError(t(errorKey(e)));
    load();
  };

  const respond = (b: MyBooking, accept: boolean) =>
    act(b.id, () => supabase.rpc('respond_booking', { p_booking: b.id, p_accept: accept }));

  const cancel = async (b: MyBooking) => {
    if (!(await confirm(t('confirmCancel'), t('yes'), t('no')))) return;
    act(b.id, () => supabase.rpc('cancel_booking', { p_booking: b.id }));
  };

  const upcoming = items
    .filter((b) => !isPastBooking(b.booking_date, b.end_time) && (b.status === 'pending' || b.status === 'accepted'))
    .sort((a, b) => (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time));
  const history = items.filter((b) => !upcoming.includes(b));

  const renderCard = (b: MyBooking) => {
    const sc = statusColors[b.status];
    const past = isPastBooking(b.booking_date, b.end_time);
    return (
      <Card key={b.id}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="small">{b.i_am_babysitter ? t('requestFrom') : t('requestTo')}</T>
            <T variant="h2">
              {b.other_first_name} {b.other_last_name}
            </T>
            {b.other_age != null && !b.i_am_babysitter && <T variant="muted">{t('age', { n: b.other_age })}</T>}
          </View>
          <Pill label={t(`status_${b.status}`)} color={sc.fg} bg={sc.bg} />
        </Row>

        <T style={{ fontWeight: '600' }}>
          📅 {ltr(formatDate(b.booking_date))}   🕒 {timeRange(b.start_time, b.end_time)}
        </T>

        {b.status === 'cancelled' && b.cancelled_by_me && <T variant="small">{t('cancelledByMe')}</T>}

        {b.status === 'accepted' && b.other_phone && (
          <View style={{ gap: 8 }}>
            <T style={{ fontSize: 20, fontWeight: '800', color: colors.teal }}>📞 {ltr(b.other_phone)}</T>
            {!past && (
              <Row>
                <Button
                  title={t('call')}
                  variant="teal"
                  small
                  style={{ flex: 1 }}
                  onPress={() => Linking.openURL(`tel:${b.other_phone}`)}
                />
                <Button
                  title={t('whatsapp')}
                  variant="secondary"
                  small
                  style={{ flex: 1 }}
                  onPress={() => Linking.openURL(`https://wa.me/${toWhatsApp(b.other_phone!)}`)}
                />
              </Row>
            )}
          </View>
        )}

        {b.status === 'pending' && !past && b.i_am_babysitter && (
          <Row>
            <Button
              title={`✓ ${t('accept')}`}
              variant="teal"
              style={{ flex: 1 }}
              loading={busy === b.id}
              onPress={() => respond(b, true)}
            />
            <Button
              title={t('reject')}
              variant="danger"
              style={{ flex: 1 }}
              disabled={busy === b.id}
              onPress={() => respond(b, false)}
            />
          </Row>
        )}

        {b.status === 'pending' && !b.i_am_babysitter && <T variant="small">🔒 {t('phoneAfterAccept')}</T>}

        {!past && (b.status === 'accepted' || (b.status === 'pending' && !b.i_am_babysitter)) && (
          <Button
            title={t('cancelBooking')}
            variant="ghost"
            small
            loading={busy === b.id && b.status !== 'pending'}
            onPress={() => cancel(b)}
          />
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <T variant="title">{t('bookingsTitle')}</T>
        {!!error && <Message kind="error" text={error} />}
        {loaded && items.length === 0 && (
          <Message text={profile?.role === 'babysitter' ? t('sitterEmpty') : t('noBookings')} />
        )}

        {upcoming.length > 0 && <T variant="h2">{t('upcoming')}</T>}
        {upcoming.map(renderCard)}

        {history.length > 0 && <T variant="h2">{t('history')}</T>}
        {history.map(renderCard)}
      </ScrollView>
    </SafeAreaView>
  );
}
