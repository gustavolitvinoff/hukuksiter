import * as Notifications from 'expo-notifications';
import { Redirect, router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Platform, Text } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { colors, Loading } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { registerForPush } from '@/lib/push';
import { UnreadProvider, useUnread } from '@/lib/UnreadProvider';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
  };

function AppTabs({ isSitter }: { isSitter: boolean }) {
  const { t } = useI18n();
  const { count } = useUnread();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, minHeight: 64 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="search"
        options={{ title: t('tabSearch'), tabBarIcon: icon('🔍'), href: isSitter ? null : undefined }}
      />
      <Tabs.Screen
        name="availability"
        options={{ title: t('tabAvailability'), tabBarIcon: icon('🗓️'), href: isSitter ? undefined : null }}
      />
      <Tabs.Screen name="bookings" options={{ title: t('tabBookings'), tabBarIcon: icon('📋') }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('tabNotifications'),
          tabBarIcon: icon('🔔'),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: t('tabProfile'), tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}

export default function AppLayout() {
  const { session, profile, loading } = useAuth();
  const userId = session?.user.id;

  // Registrar el celular para notificaciones push
  useEffect(() => {
    if (userId) registerForPush(userId);
  }, [userId]);

  // Al tocar una notificación, abrir "Pedidos"
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/bookings');
    });
    return () => sub.remove();
  }, []);

  if (loading) return <Loading />;
  if (!session || !userId) return <Redirect href="/login" />;
  if (!profile) return <Loading />;

  return (
    <UnreadProvider userId={userId}>
      <AppTabs isSitter={profile.role === 'babysitter'} />
    </UnreadProvider>
  );
}
