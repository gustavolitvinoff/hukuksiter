import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Muestra la notificación aunque la app esté abierta
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Pide permiso de notificaciones, obtiene el token del celular
 * y lo guarda en Supabase para que la base de datos pueda enviarle avisos.
 */
export async function registerForPush(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'HukukSiter',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E8735A',
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('Falta el projectId de EAS. Ejecutá "npx eas-cli@latest init".');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.from('private_info').update({ push_token: token }).eq('user_id', userId);
  } catch (e) {
    console.warn('No se pudo registrar para notificaciones', e);
  }
}
