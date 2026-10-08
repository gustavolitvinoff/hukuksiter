import { Alert, Platform } from 'react-native';

/** Pregunta Sí/No (funciona en celular y en web) */
export function confirm(message: string, yes: string, no: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : true);
  }
  return new Promise((resolve) => {
    Alert.alert('', message, [
      { text: no, style: 'cancel', onPress: () => resolve(false) },
      { text: yes, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
