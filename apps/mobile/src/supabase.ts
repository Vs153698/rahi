import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { env, isSupabaseConfigured } from './config/env';

/**
 * Supabase client for the app. The session is persisted in the device keychain
 * via expo-secure-store so it survives kill/reopen and the app NEVER gates
 * launch on the network (rahi-docs/08, Task 0.7). Token refresh happens in the
 * background only when connectivity returns.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  env.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export { isSupabaseConfigured };
