import { CreateNoteInputSchema, NoteSchema, isNote } from './note';

const validNote = {
  id: '00000000-0000-0000-0000-000000000001',
  owner_id: '00000000-0000-0000-0000-000000000002',
  body: 'Fuel at Tanglang La',
  created_at: '2026-06-20T12:00:00.000Z',
  updated_at: '2026-06-20T12:00:00.000Z',
};

describe('NoteSchema', () => {
  it('accepts a well-formed note', () => {
    expect(isNote(validNote)).toBe(true);
    expect(NoteSchema.parse(validNote)).toEqual(validNote);
  });

  it('rejects an empty body', () => {
    expect(isNote({ ...validNote, body: '' })).toBe(false);
  });

  it('rejects a non-uuid id', () => {
    expect(isNote({ ...validNote, id: 'nope' })).toBe(false);
  });

  it('CreateNoteInput only requires the body', () => {
    expect(CreateNoteInputSchema.parse({ body: 'hi' })).toEqual({ body: 'hi' });
  });
});
