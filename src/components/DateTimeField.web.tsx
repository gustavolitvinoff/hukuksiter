import { createElement } from 'react';
import { View } from 'react-native';
import { parseISODate, toISODate, toTime } from '@/lib/format';
import { colors, T } from './ui';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

/** Versión web: usa los campos de fecha/hora del navegador */
export function DateTimeField({ label, mode, value, onChange, minimumDate, maximumDate }: Props) {
  const handle = (e: { target: { value: string } }) => {
    const v = e.target.value;
    if (!v) return;
    if (mode === 'date') {
      onChange(parseISODate(v));
    } else {
      const [h, m] = v.split(':').map(Number);
      const d = new Date(value);
      d.setHours(h, m, 0, 0);
      onChange(d);
    }
  };

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <T variant="small" style={{ fontWeight: '600', color: colors.text }}>
        {label}
      </T>
      {createElement('input', {
        type: mode,
        value: mode === 'date' ? toISODate(value) : toTime(value),
        min: mode === 'date' && minimumDate ? toISODate(minimumDate) : undefined,
        max: mode === 'date' && maximumDate ? toISODate(maximumDate) : undefined,
        step: mode === 'time' ? 900 : undefined,
        onChange: handle,
        style: {
          height: 52,
          borderRadius: 14,
          border: `1.5px solid ${colors.border}`,
          padding: '0 12px',
          fontSize: 17,
          fontWeight: 700,
          color: colors.text,
          background: colors.card,
          fontFamily: 'inherit',
        },
      })}
    </View>
  );
}
