import Constants from 'expo-constants';

/**
 * Resolved client config. Pulls from app.json `extra` first, then EXPO_PUBLIC_*
 * env (EAS secrets mirror Doppler — rahi-docs/12). Nothing here is a server
 * secret; only public keys (anon key, public RC key, DSN) belong on-device.
 */
type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  powersyncUrl?: string;
  revenueCatApiKey?: string;
  sentryDsn?: string;
  apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '',
  powersyncUrl: process.env.EXPO_PUBLIC_POWERSYNC_URL ?? extra.powersyncUrl ?? '',
  revenueCatApiKey:
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? extra.revenueCatApiKey ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? extra.sentryDsn ?? '',
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? 'http://localhost:3000',
} as const;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isPowerSyncConfigured = Boolean(env.powersyncUrl);
