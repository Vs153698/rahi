// Canonical i18n keys, shared so app strings and any server-rendered copy stay
// in sync. V1 locales: en, hi, hi-en (Hinglish). Actual translations live in
// apps/mobile; this file is the key contract only.

export const I18N_KEYS = {
  common: {
    appName: 'common.appName',
    retry: 'common.retry',
    offline: 'common.offline',
  },
  auth: {
    phoneLabel: 'auth.phoneLabel',
    sendOtp: 'auth.sendOtp',
    enterOtp: 'auth.enterOtp',
    verify: 'auth.verify',
  },
  paywall: {
    title: 'paywall.title',
    subtitle: 'paywall.subtitle',
    startTrial: 'paywall.startTrial',
    restore: 'paywall.restore',
  },
} as const;

type Leaves<T> = T extends string ? T : { [K in keyof T]: Leaves<T[K]> }[keyof T];
export type I18nKey = Leaves<typeof I18N_KEYS>;
