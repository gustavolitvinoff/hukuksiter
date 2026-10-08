import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renueva la sesión solo mientras la app está abierta
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export type Role = 'employer' | 'babysitter';
export type Lang = 'he' | 'en';
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type Profile = {
  id: string;
  role: Role;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  language: Lang;
};

export type Availability = {
  id: string;
  babysitter_id: string;
  weekday: number | null;
  on_date: string | null;
  start_time: string;
  end_time: string;
};

export type BabysitterResult = {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
};

export type MyBooking = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  i_am_babysitter: boolean;
  cancelled_by_me: boolean;
  other_first_name: string;
  other_last_name: string;
  other_age: number | null;
  other_phone: string | null;
  created_at: string;
};

export type AppNotification = {
  id: string;
  kind: 'new_request' | 'accepted' | 'rejected' | 'cancelled';
  read: boolean;
  created_at: string;
  actor: { first_name: string; last_name: string } | null;
  booking: { booking_date: string; start_time: string; end_time: string } | null;
};
