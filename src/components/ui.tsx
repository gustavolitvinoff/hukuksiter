import { ReactNode } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n/I18nProvider';

export const colors = {
  bg: '#FFF4EC',
  card: '#FFFFFF',
  primary: '#E8735A',
  primaryDark: '#C95A43',
  primarySoft: '#FCE3DA',
  teal: '#2A9D8F',
  tealSoft: '#D7F0EC',
  text: '#2D2A32',
  muted: '#7A7280',
  border: '#EADFD7',
  danger: '#C8414B',
  dangerSoft: '#F8DCDE',
  amber: '#B7791F',
  amberSoft: '#FCEFD3',
  greySoft: '#EEEAEC',
};

/** Texto que se alinea solo según el idioma (derecha en hebreo) */
export function T({
  style,
  variant = 'body',
  center,
  ...props
}: TextProps & { variant?: 'title' | 'h2' | 'body' | 'muted' | 'small'; center?: boolean }) {
  const { isRTL } = useI18n();
  let align: TextStyle['textAlign'] = isRTL ? 'right' : 'left';
  // React Native invierte left/right si el sistema está en modo RTL
  if (I18nManager.isRTL && !center) align = align === 'right' ? 'left' : 'right';
  if (center) align = 'center';
  return (
    <Text
      {...props}
      style={[
        styles.text,
        styles[variant],
        { textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' },
        style,
      ]}
    />
  );
}

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screen, style]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screen, { flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({
  children,
  style,
  gap = 10,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

type BtnVariant = 'primary' | 'secondary' | 'teal' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = btnVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.btnText, small && { fontSize: 15 }, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const btnVariants: Record<BtnVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  secondary: { bg: colors.card, fg: colors.primaryDark, border: colors.primary },
  teal: { bg: colors.teal, fg: '#fff', border: colors.teal },
  danger: { bg: colors.card, fg: colors.danger, border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.primaryDark, border: 'transparent' },
};

export function Input({ label, style, ...props }: TextInputProps & { label: string }) {
  const { isRTL } = useI18n();
  let align: TextStyle['textAlign'] = isRTL ? 'right' : 'left';
  if (I18nManager.isRTL) align = align === 'right' ? 'left' : 'right';
  return (
    <View style={{ gap: 6 }}>
      <T variant="small" style={{ fontWeight: '600', color: colors.text }}>
        {label}
      </T>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, { textAlign: align }, style]}
      />
    </View>
  );
}

export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </View>
  );
}

/** Selector de opciones (por ejemplo: Cada semana / Fecha puntual) */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Segmented
      options={[
        { value: 'he', label: 'עברית' },
        { value: 'en', label: 'English' },
      ]}
      value={lang}
      onChange={setLang}
    />
  );
}

export function Message({ text, kind = 'info' }: { text: string; kind?: 'info' | 'error' | 'success' }) {
  const palette =
    kind === 'error'
      ? { bg: colors.dangerSoft, fg: colors.danger }
      : kind === 'success'
        ? { bg: colors.tealSoft, fg: colors.teal }
        : { bg: colors.amberSoft, fg: colors.amber };
  return (
    <View style={{ backgroundColor: palette.bg, borderRadius: 14, padding: 12 }}>
      <T style={{ color: palette.fg, fontWeight: '600' }}>{text}</T>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: 20, gap: 16, paddingBottom: 40 },
  text: { color: colors.text },
  title: { fontSize: 28, fontWeight: '800' },
  h2: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 24 },
  muted: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  small: { fontSize: 14, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  btn: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { minHeight: 44, borderRadius: 12, paddingHorizontal: 14 },
  btnText: { fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
    fontSize: 17,
    color: colors.text,
  },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 16, fontWeight: '700', color: colors.text },
});
