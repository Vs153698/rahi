import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TRIAL_DAYS } from '@rahi/shared';

import { lightTheme, palette } from '../../theme/tokens';
import { getProOffering, purchaseAnnualOrMonthly, restorePurchases } from '../revenuecat';

interface Plan {
  annualPrice: string;
  monthlyPrice: string;
}

/**
 * Contextual paywall (rahi-docs/14 §8, Task 5.2). Annual pre-selected (best
 * value), 7-day free-trial framing, mandatory Restore button. Subscriptions are
 * the STORE rail only. `onUnlocked` fires when Pro becomes active.
 */
export function Paywall({ reason, onUnlocked }: { reason?: string; onUnlocked: () => void }) {
  const [annual, setAnnual] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const offering = await getProOffering();
      setPlan({
        annualPrice: offering?.annual?.product.priceString ?? '₹999/yr',
        monthlyPrice: offering?.monthly?.product.priceString ?? '₹199/mo',
      });
    })();
  }, []);

  async function subscribe() {
    setError(null);
    setBusy(true);
    try {
      const ok = await purchaseAnnualOrMonthly(annual);
      if (ok) onUnlocked();
      else setError('Purchase did not activate Pro. Try Restore.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setError(null);
    setBusy(true);
    try {
      if (await restorePurchases()) onUnlocked();
      else setError('No previous purchase found to restore.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rahi Pro</Text>
      <Text style={styles.subtitle}>{reason ?? 'Unlock the offline suite — maps, safety, and more.'}</Text>

      <PlanCard
        label="Annual"
        price={plan?.annualPrice ?? '…'}
        hint="Best value"
        selected={annual}
        onPress={() => setAnnual(true)}
      />
      <PlanCard
        label="Monthly"
        price={plan?.monthlyPrice ?? '…'}
        selected={!annual}
        onPress={() => setAnnual(false)}
      />

      <Text style={styles.trial}>Start with a {TRIAL_DAYS}-day free trial. Cancel anytime.</Text>

      <TouchableOpacity style={styles.cta} onPress={subscribe} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Start free trial</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={restore} disabled={busy}>
        <Text style={styles.restore}>Restore purchases</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function PlanCard(props: {
  label: string;
  price: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.card, props.selected && styles.cardSelected]} onPress={props.onPress}>
      <View>
        <Text style={styles.cardLabel}>{props.label}</Text>
        {props.hint ? <Text style={styles.cardHint}>{props.hint}</Text> : null}
      </View>
      <Text style={styles.cardPrice}>{props.price}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center', backgroundColor: lightTheme.bg },
  title: { fontSize: 30, fontWeight: '800', color: lightTheme.text },
  subtitle: { fontSize: 15, color: lightTheme.textSoft, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: lightTheme.border,
    borderRadius: 14,
    padding: 16,
  },
  cardSelected: { borderColor: lightTheme.primary, backgroundColor: palette.amberSoft },
  cardLabel: { fontSize: 16, fontWeight: '700', color: lightTheme.text },
  cardHint: { fontSize: 12, color: palette.amber2, fontWeight: '600' },
  cardPrice: { fontSize: 18, fontWeight: '700', color: lightTheme.text },
  trial: { fontSize: 13, color: lightTheme.textMuted, marginVertical: 8, textAlign: 'center' },
  cta: { backgroundColor: lightTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  restore: { color: lightTheme.info, textAlign: 'center', marginTop: 12 },
  error: { color: palette.alert, textAlign: 'center', marginTop: 8 },
});
