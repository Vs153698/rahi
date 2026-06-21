/**
 * Rahi design tokens — lifted from the canonical UI mockup
 * (rahi-docs/rahi-ui-showcase.html). A warm, editorial "super-app" aesthetic:
 * paper backgrounds, ink text, amber/gold/trail-green accents, generous radius.
 * Every screen built from Phase 2 on should consume these — do not hardcode
 * colors or fonts in components.
 *
 * The mockup uses both a light ("paper") and dark ("basalt") surface; both are
 * captured so dark screens (map, recap, SOS) match.
 */

export const palette = {
  // Light surfaces
  paper: '#FCFBF8',
  paper2: '#F3F0E9',
  paper3: '#E9E4D8',
  // Dark surfaces
  basalt: '#15120D',
  basalt2: '#1F1B13',
  basalt3: '#2A241A',
  // Text
  ink: '#1A160F',
  inkSoft: '#5E5849',
  muted: '#8B8474',
  // Lines
  line: '#ECE7DB',
  lineDark: 'rgba(245,241,232,0.10)',
  // Accents
  amber: '#E2540B',
  amber2: '#C2470A',
  amberBright: '#FB6514',
  amberSoft: '#FCE9D8',
  gold: '#F2A900',
  goldSoft: '#FFF1CC',
  trail: '#1C7C4A',
  trailBright: '#22A05B',
  trailSoft: '#DCEFE2',
  slate: '#3E5C76',
  slateSoft: '#E3EBF2',
  alert: '#D7263D',
  alertSoft: '#FBE0E3',
  white: '#FFFFFF',
} as const;

/** Font families. Load via expo-font (Phase 2): Space Grotesk, Plus Jakarta Sans, Space Mono. */
export const fonts = {
  display: 'SpaceGrotesk', // --fd: headings, big numbers
  body: 'PlusJakartaSans', // --fb: body, labels
  mono: 'SpaceMono', // --fm: stats, codes, ₹ amounts
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18, // mockup --r
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Semantic theme — reference these in components, not raw palette where possible. */
export const lightTheme = {
  bg: palette.paper,
  bgRaised: palette.paper2,
  bgSunken: palette.paper3,
  text: palette.ink,
  textSoft: palette.inkSoft,
  textMuted: palette.muted,
  border: palette.line,
  primary: palette.amber,
  primaryText: palette.white,
  accentGold: palette.gold,
  success: palette.trail,
  info: palette.slate,
  danger: palette.alert,
} as const;

export const darkTheme = {
  bg: palette.basalt,
  bgRaised: palette.basalt2,
  bgSunken: palette.basalt3,
  text: palette.paper,
  textSoft: '#D7D1C4',
  textMuted: palette.muted,
  border: palette.lineDark,
  primary: palette.amberBright,
  primaryText: palette.basalt,
  accentGold: palette.gold,
  success: palette.trailBright,
  info: palette.slate,
  danger: palette.alert,
} as const;

export type Theme = typeof lightTheme;
