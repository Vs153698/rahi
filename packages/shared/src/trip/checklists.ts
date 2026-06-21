/**
 * Offline trip-prep content (Task 9.3, rahi-docs/07/10). Packing checklists and
 * restricted-zone permit / inner-line info, shipped in-app so they're available
 * with no signal. Static data + a pure progress helper. Permit rules change —
 * treat as guidance and verify with the issuing authority (// verify).
 */
export interface ChecklistItem {
  id: string;
  label: string;
  category: 'documents' | 'gear' | 'bike' | 'medical' | 'electronics';
}

export const PACKING_CHECKLIST: ChecklistItem[] = [
  { id: 'dl', label: "Driving licence", category: 'documents' },
  { id: 'rc', label: 'Registration certificate (RC)', category: 'documents' },
  { id: 'insurance', label: 'Valid insurance', category: 'documents' },
  { id: 'puc', label: 'PUC certificate', category: 'documents' },
  { id: 'id', label: 'Government photo ID (+ copies)', category: 'documents' },
  { id: 'helmet', label: 'Helmet (and spare visor)', category: 'gear' },
  { id: 'jacket', label: 'Riding jacket + gloves', category: 'gear' },
  { id: 'rain', label: 'Rain gear', category: 'gear' },
  { id: 'thermals', label: 'Thermals (high-altitude)', category: 'gear' },
  { id: 'toolkit', label: 'Toolkit + tyre puncture kit', category: 'bike' },
  { id: 'spare_tube', label: 'Spare tube / levers', category: 'bike' },
  { id: 'chain_lube', label: 'Chain lube + rag', category: 'bike' },
  { id: 'fuel_can', label: 'Spare fuel can (remote stretches)', category: 'bike' },
  { id: 'firstaid', label: 'First-aid kit', category: 'medical' },
  { id: 'ams_meds', label: 'AMS medication (Diamox) — consult a doctor', category: 'medical' },
  { id: 'powerbank', label: 'Power bank + cables', category: 'electronics' },
  { id: 'charger', label: 'Phone mount + charger', category: 'electronics' },
];

export interface PermitZone {
  id: string;
  region: string;
  summary: string;
  permitType: 'inner_line' | 'protected_area' | 'special';
  /** Whether Indian nationals need a permit (foreigners often differ). */
  indianNationalsNeedPermit: boolean;
  notes: string;
}

export const PERMIT_ZONES: PermitZone[] = [
  {
    id: 'spiti_rohtang',
    region: 'Spiti / Rohtang (Himachal)',
    summary: 'Rohtang Pass needs an online permit (NGT cap); Spiti interior is open to Indians.',
    permitType: 'special',
    indianNationalsNeedPermit: true,
    notes: 'Book Rohtang permit online early; daily vehicle cap. // verify',
  },
  {
    id: 'ladakh_inner_line',
    region: 'Ladakh inner-line (Nubra, Pangong, Tso Moriri)',
    summary: 'Inner Line Permit required for protected areas beyond Leh.',
    permitType: 'inner_line',
    indianNationalsNeedPermit: true,
    notes: 'Obtain ILP online or in Leh; carry multiple copies. // verify',
  },
  {
    id: 'sikkim_north',
    region: 'North Sikkim (Gurudongmar, Yumthang)',
    summary: 'Protected Area Permit via a registered operator; some zones off-limits.',
    permitType: 'protected_area',
    indianNationalsNeedPermit: true,
    notes: 'Usually arranged through a Gangtok operator. // verify',
  },
  {
    id: 'arunachal',
    region: 'Arunachal Pradesh',
    summary: 'Inner Line Permit required for all of Arunachal.',
    permitType: 'inner_line',
    indianNationalsNeedPermit: true,
    notes: 'Apply online (eILP) before travel. // verify',
  },
];

export interface ChecklistProgress {
  total: number;
  checked: number;
  fraction: number;
  remaining: ChecklistItem[];
}

/** Progress over the packing checklist given the set of checked item ids. */
export function checklistProgress(
  items: ChecklistItem[],
  checkedIds: Set<string>,
): ChecklistProgress {
  const checked = items.filter((i) => checkedIds.has(i.id)).length;
  return {
    total: items.length,
    checked,
    fraction: items.length === 0 ? 0 : checked / items.length,
    remaining: items.filter((i) => !checkedIds.has(i.id)),
  };
}
