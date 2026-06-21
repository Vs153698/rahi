import { z } from 'zod';

/**
 * Note — the trivial synced entity used to prove the Phase 0 sync round-trip
 * (create offline → appears in Postgres after reconnect). It is intentionally
 * minimal and will be removed/replaced once real entities land in Phase 1.
 *
 * Conflict strategy: last-write-wins on scalar fields, keyed by `updated_at`
 * (rahi-docs/05). Owner-scoped via `owner_id` in the sync rules.
 */
export const NoteSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Note = z.infer<typeof NoteSchema>;

/** Shape accepted when creating a note locally (server/client fill the rest). */
export const CreateNoteInputSchema = NoteSchema.pick({ body: true });
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;

export function isNote(value: unknown): value is Note {
  return NoteSchema.safeParse(value).success;
}
