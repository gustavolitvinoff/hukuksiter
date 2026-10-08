import { Text, View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, T } from './ui';

/** Logo de HukukSiter */
export function Brand() {
  const { t } = useI18n();
  return (
    <View style={{ alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 8 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: colors.primary,
        }}
      >
        <Text style={{ fontSize: 48 }}>🧸</Text>
      </View>
      <Text style={{ fontSize: 34, fontWeight: '900', color: colors.primaryDark, letterSpacing: 0.5 }}>
        Hukuk<Text style={{ color: colors.teal }}>Siter</Text>
      </Text>
      <T variant="muted" center>
        {t('tagline')}
      </T>
    </View>
  );
}
