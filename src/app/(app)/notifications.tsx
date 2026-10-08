import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Card, colors, Message, Row, Screen, T } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDate, ltr, timeRange } from '@/lib/format';
import { AppNotification, supabase } from '@/lib/supabase';
import { useUnread } from '@/lib/UnreadProvider';

const emoji: Record<AppNotification['kind'], string> = {
  new_request: '👶',
  accepted: '✅',
  rejected: '❌',
  cancelled: '🚫',
};

export default function NotificationsScreen() {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const { refresh, version } = useUnread();
  const userId = session!.user.id;
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select(
        'id, kind, read, created_at, actor:profiles!notifications_actor_id_fkey(first_name, last_name), booking:bookings(booking_date, start_time, end_time)',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    setItems((data as unknown as AppNotification[]) ?? []);
    setLoaded(true);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (version > 0) load();
  }, [version, load]);

  const markAllRead = async () => {
    setItems((x) => x.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    refresh();
  };

  const open = async (n: AppNotification) => {
    if (!n.read) {
      setItems((x) => x.map((y) => (y.id === n.id ? { ...y, read: true } : y)));
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      refresh();
    }
    router.navigate('/bookings');
  };

  const text = (n: AppNotification) => {
    const name = n.actor ? `${n.actor.first_name} ${n.actor.last_name}` : '';
    const when = n.booking
      ? ltr(`${formatDate(n.booking.booking_date)} ${timeRange(n.booking.start_time, n.booking.end_time)}`)
      : '';
    return t(`notif_${n.kind}`, { name, when });
  };

  const hasUnread = items.some((n) => !n.read);

  return (
    <Screen>
      <T variant="title">{t('notificationsTitle')}</T>
      {hasUnread && <Button title={t('markAllRead')} variant="secondary" small onPress={markAllRead} />}
      {loaded && items.length === 0 && <Message text={t('noNotifications')} />}

      {items.map((n) => (
        <Pressable key={n.id} onPress={() => open(n)}>
          <Card style={!n.read && { borderColor: colors.primary, backgroundColor: '#FFFBF8' }}>
            <Row gap={12} style={{ alignItems: 'flex-start' }}>
              <T style={{ fontSize: 26 }}>{emoji[n.kind]}</T>
              <View style={{ flex: 1, gap: 4 }}>
                <T style={{ fontWeight: n.read ? '400' : '700' }}>{text(n)}</T>
                <T variant="small">
                  {ltr(new Date(n.created_at).toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }))}
                </T>
              </View>
              {!n.read && (
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, marginTop: 6 }} />
              )}
            </Row>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
