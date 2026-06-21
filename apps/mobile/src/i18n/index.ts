import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { I18N_KEYS, LOCALES, type Locale } from '@rahi/shared';

/**
 * i18n bootstrap. V1 locales: en, hi, hi-en (Hinglish). Phase 0 ships English
 * strings only; hi / hi-en resource files are added as features land. Keys come
 * from @rahi/shared so app + any server copy stay in lockstep.
 */
const en = {
  [I18N_KEYS.common.appName]: 'Rahi',
  [I18N_KEYS.common.retry]: 'Retry',
  [I18N_KEYS.common.offline]: 'Offline',
  [I18N_KEYS.auth.phoneLabel]: 'Mobile number',
  [I18N_KEYS.auth.sendOtp]: 'Send OTP',
  [I18N_KEYS.auth.enterOtp]: 'Enter the 6-digit code',
  [I18N_KEYS.auth.verify]: 'Verify',
  [I18N_KEYS.paywall.title]: 'Rahi Pro',
  [I18N_KEYS.paywall.subtitle]: 'Unlock the offline suite — maps, safety, and more.',
  [I18N_KEYS.paywall.startTrial]: 'Start 7-day free trial',
  [I18N_KEYS.paywall.restore]: 'Restore purchases',
};

function pickLocale(): Locale {
  const device = getLocales()[0]?.languageTag ?? 'en';
  const match = LOCALES.find((l) => device.toLowerCase().startsWith(l));
  return match ?? 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: pickLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
