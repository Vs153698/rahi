import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { SYNC_TABLES, type MemberBalances, type ShareMember } from '@rahi/shared';

import { db } from '../../src/db/powersync';
import { expensesRepository } from '../../src/db/repositories/expenses.repository';
import { useEntitlement } from '../../src/entitlement/useEntitlement';
import { assertCanSplit } from '../../src/features/expenses/gate';
import { listExpenses, tripBalances, type ExpenseListItem } from '../../src/features/expenses/expenses.feature';
import { tripsRepository, type LocalTrip } from '../../src/db/repositories/trips.repository';
import { useConnectivity } from '../../src/sync/connectivity';
import { useSession } from '../../src/state/session';
import { lightTheme, palette } from '../../src/theme/tokens';

interface GroupMember {
  id: string;
  profile_id: string;
}

const rupees = (paise: number): string => `₹${(paise / 100).toFixed(2)}`;

/**
 * Expenses tab (Phase 4). Shows the trip's balances from the CRDT-merged ledger,
 * lists expenses, and adds an equal-split expense. Online splitting is Free;
 * offline splitting is gated `pro` (Task 4.4).
 */
export default function ExpensesScreen() {
  const userId = useSession((s) => s.userId);
  const online = useConnectivity((s) => s.online);
  const { status } = useEntitlement('pro');
  const [trip, setTrip] = useState<LocalTrip | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [balances, setBalances] = useState<MemberBalances>({});
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    return tripsRepository.watchForUser(userId, (rows) => setTrip(rows[0] ?? null));
  }, [userId]);

  useEffect(() => {
    if (!trip) return;
    void (async () => {
      const groups = await db.getAll<{ id: string }>(
        `SELECT id FROM ${SYNC_TABLES.groups} WHERE trip_id = ? LIMIT 1`,
        [trip.id],
      );
      const gid = groups[0]?.id ?? null;
      setGroupId(gid);
      if (gid) {
        setMembers(
          await db.getAll<GroupMember>(
            `SELECT id, profile_id FROM ${SYNC_TABLES.group_members} WHERE group_id = ? AND deleted_at IS NULL`,
            [gid],
          ),
        );
      }
      await refresh(trip.id, gid);
    })();
  }, [trip]);

  async function refresh(tripId: string, gid: string | null) {
    setExpenses(await listExpenses(tripId));
    if (gid) setBalances((await tripBalances(tripId, gid)).balances);
  }

  async function addEqualExpense() {
    setNote(null);
    if (!trip || !groupId || members.length === 0) {
      setNote('Need a trip with a group + members to split.');
      return;
    }
    const paise = Math.round(parseFloat(amount || '0') * 100);
    if (!Number.isFinite(paise) || paise <= 0) {
      setNote('Enter a valid amount.');
      return;
    }
    try {
      assertCanSplit({ online, isPro: status.active }); // Free online; Pro offline
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Cannot split offline on Free');
      return;
    }
    const me = members.find((m) => m.profile_id === userId) ?? members[0]!;
    const shareMembers: ShareMember[] = members.map((m) => ({ member_id: m.id }));
    await expensesRepository.create({
      tripId: trip.id,
      groupId,
      createdBy: userId!,
      paidBy: me.id,
      amountPaise: paise,
      splitType: 'equal',
      members: shareMembers,
    });
    setAmount('');
    await refresh(trip.id, groupId);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h}>Balances</Text>
      {Object.keys(balances).length === 0 ? (
        <Text style={styles.muted}>No balances yet.</Text>
      ) : (
        Object.entries(balances).map(([member, net]) => (
          <View key={member} style={styles.balanceRow}>
            <Text style={styles.member}>{member === '' ? 'unknown' : member.slice(0, 8)}</Text>
            <Text style={[styles.net, net < 0 ? styles.owe : styles.owed]}>
              {net < 0 ? `owes ${rupees(-net)}` : `gets ${rupees(net)}`}
            </Text>
          </View>
        ))
      )}

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={`Amount (split equally) ${online ? '' : status.active ? '· offline' : '· Pro for offline'}`}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addEqualExpense}>
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      <Text style={styles.h}>Expenses</Text>
      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <View style={styles.expenseRow}>
            <Text style={styles.expenseAmt}>{rupees(item.amount_paise)}</Text>
            <Text style={styles.muted}>{item.note ?? item.category ?? 'expense'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No expenses yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.bg, padding: 16 },
  h: { fontSize: 18, fontWeight: '700', color: lightTheme.text, marginTop: 12, marginBottom: 8 },
  muted: { color: lightTheme.textMuted },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  member: { color: lightTheme.text, fontFamily: undefined },
  net: { fontWeight: '600' },
  owe: { color: palette.alert },
  owed: { color: palette.trail },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: lightTheme.border, borderRadius: 8, padding: 10 },
  addBtn: { backgroundColor: lightTheme.primary, borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '700' },
  note: { color: palette.alert, marginTop: 8 },
  expenseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: lightTheme.border },
  expenseAmt: { fontWeight: '700', color: lightTheme.text },
});
