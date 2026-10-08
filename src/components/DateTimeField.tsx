import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import { formatDate, toISODate, toTime } from '@/lib/format';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, T } from './ui';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

/** Campo de fecha u hora con el selector nativo del celular */
export function DateTimeField({ label, mode, value, onChange, minimumDate, maximumDate }: Props) {
  const { lang } = useI18n();
  const display = mode === 'date' ? formatDate(toISODate(value)) : toTime(value);

  if (Platform.OS === 'ios') {
    return (
      <View style={{ gap: 6, flex: 1 }}>
        <T variant="small" style={{ fontWeight: '600', color: colors.text }}>
          {label}
        </T>
        <View style={{ alignItems: 'flex-start' }}>
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            locale={lang === 'he' ? 'he-IL' : 'en-GB'}
            minuteInterval={mode === 'time' ? 15 : undefined}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_e, d) => d && onChange(d)}
            accentColor={colors.primary}
          />
        </View>
      </View>
    );
  }

  const open = () =>
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: true,
      minimumDate,
      maximumDate,
      onValueChange: (_e, d) => d && onChange(d),
    });

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <T variant="small" style={{ fontWeight: '600', color: colors.text }}>
        {label}
      </T>
      <Pressable
        onPress={open}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: 14,
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
          {mode === 'date' ? '📅 ' : '🕒 '}
          {display}
        </Text>
      </Pressable>
    </View>
  );
}
