import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { I18N_KEYS } from '@rahi/shared';

import { isSupabaseConfigured, supabase } from '../../src/supabase';

type Step = 'phone' | 'otp';

/**
 * Phone OTP login (Task 0.5). +91 only. Step 1 sends the OTP via Supabase Auth
 * (MSG91 is the SMS sender, DLT-template-ready); step 2 verifies the 6-digit
 * code, which persists the session to the keychain. This is the ONLY screen
 * that requires connectivity — everything past login works offline.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validPhone = /^\+91[6-9]\d{9}$/.test(phone);
  const validCode = /^\d{6}$/.test(code);

  async function sendOtp() {
    setError(null);
    if (!isSupabaseConfigured) {
      setError('Auth backend not configured yet. // verify provisioning');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (err) {
      setError('Could not send the code. Check the number and try again.');
      return;
    }
    setStep('otp');
  }

  async function verifyOtp() {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    setBusy(false);
    if (err) {
      setError('That code did not match. Try again.');
      return;
    }
    // Session is now persisted; the root layout's guard routes to (tabs).
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>{t(I18N_KEYS.common.appName)}</Text>

        {step === 'phone' ? (
          <>
            <Text style={styles.label}>{t(I18N_KEYS.auth.phoneLabel)}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoFocus
              placeholder="+91XXXXXXXXXX"
              maxLength={13}
            />
            <PrimaryButton
              label={t(I18N_KEYS.auth.sendOtp)}
              disabled={!validPhone || busy}
              busy={busy}
              onPress={sendOtp}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>{t(I18N_KEYS.auth.enterOtp)}</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoFocus
              placeholder="------"
              maxLength={6}
            />
            <PrimaryButton
              label={t(I18N_KEYS.auth.verify)}
              disabled={!validCode || busy}
              busy={busy}
              onPress={verifyOtp}
            />
            <TouchableOpacity onPress={() => setStep('phone')} disabled={busy}>
              <Text style={styles.link}>Change number</Text>
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton(props: {
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, props.disabled && styles.buttonDisabled]}
      disabled={props.disabled}
      onPress={props.onPress}
    >
      {props.busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{props.label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, color: '#444' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#9bbdf0' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#1f6feb', textAlign: 'center', marginTop: 12 },
  error: { color: '#c0392b', marginTop: 12, textAlign: 'center' },
});
