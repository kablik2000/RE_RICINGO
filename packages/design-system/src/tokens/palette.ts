/**
 * Raw colour palette. Tonal ramps: 0 = black … 100 = white (Material 3 tone convention).
 *
 * Components must NOT use the palette directly — they use semantic roles from `color-schemes.ts`.
 *
 * BRAND NOTE: the red ramp is a provisional "RICI red" until official brand assets are supplied
 * (DEVELOPMENT_PLAN open question Q-10). Changing it only requires editing this ramp.
 */
export const palette = {
  red: {
    10: '#410009',
    20: '#680013',
    30: '#8E0A22',
    40: '#B3122E',
    50: '#D32F43',
    80: '#FFB3B5',
    90: '#FFDADA',
    95: '#FFEDEC',
  },
  /** Warm neutral: slightly red-tinted greys give a calmer, "paper" feel than pure grey. */
  neutral: {
    0: '#000000',
    6: '#151211',
    10: '#1D1A19',
    12: '#221E1D',
    17: '#2C2827',
    22: '#373231',
    30: '#4D4645',
    50: '#7F7674',
    60: '#998F8D',
    80: '#D2C4C2',
    90: '#EDE0DE',
    94: '#F6EDEB',
    96: '#FAF2F1',
    98: '#FFF8F7',
    100: '#FFFFFF',
  },
  neutralVariant: {
    30: '#534341',
    80: '#D8C2BF',
  },
  green: {
    20: '#00391F',
    30: '#00522F',
    40: '#1B6C45',
    80: '#8DD7A9',
    90: '#A9F4C4',
  },
  amber: {
    20: '#432C00',
    30: '#614000',
    40: '#7F5600',
    80: '#F9BD4B',
    90: '#FFDEA8',
  },
  /** Error is a cooler crimson/magenta so that mistakes are distinguishable from the red brand accent. */
  error: {
    20: '#5F1135',
    30: '#7C294B',
    40: '#9A4062',
    80: '#FFB0CB',
    90: '#FFD9E3',
  },
} as const;
