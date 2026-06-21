import { create } from 'zustand';

import { supabase } from '../supabase';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  status: SessionStatus;
  userId: string | null;
  phone: string | null;
  /** Load the persisted session from secure store WITHOUT awaiting the network. */
  bootstrap: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Session store. On cold start we read the locally persisted Supabase session
 * (kept in the keychain via expo-secure-store) and resolve `status`
 * synchronously-ish — never blocking on a network call. Token refresh is left
 * to the Supabase client's background autoRefresh once connectivity returns
 * (Task 0.7 — no login wall offline).
 */
export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  userId: null,
  phone: null,

  bootstrap: async () => {
    // getSession() reads from local storage only; it does not hit the network.
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (session?.user) {
      set({ status: 'authenticated', userId: session.user.id, phone: session.user.phone ?? null });
    } else {
      set({ status: 'unauthenticated', userId: null, phone: null });
    }

    // React to future auth changes (sign-in completes, token refresh, sign-out).
    supabase.auth.onAuthStateChange((_event, next) => {
      if (next?.user) {
        set({ status: 'authenticated', userId: next.user.id, phone: next.user.phone ?? null });
      } else {
        set({ status: 'unauthenticated', userId: null, phone: null });
      }
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ status: 'unauthenticated', userId: null, phone: null });
  },
}));
