import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth/AuthProvider';
import { colors } from '@/components/ui';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';

// La dirección (RTL/LTR) la maneja la app según el idioma elegido,
// no el idioma del sistema del celular.
I18nManager.allowRTL(false);

function Root() {
  const { isRTL } = useI18n();
  return (
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr', backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
