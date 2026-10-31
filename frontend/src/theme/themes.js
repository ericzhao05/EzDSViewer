import { PRESETS } from './presets';

// What the hamburger menu offers. The first entry is the default for anyone
// who has not picked a theme yet.
//
// comingSoon shows a theme greyed out in the menu, where it can't be picked. Remove the flag to offer it.
//
// To restore a hidden combination, uncomment its line below. Its colors then
// apply across the whole app. Its cell shapes for the Array page are kept in
// archive/array-presets.css; uncomment that import in theme/index.css too.
export const THEME_OPTIONS = [
  { style: 'chalkboard', palette: 'blackout' },
  { style: 'toy-blocks', palette: 'bubblegum', comingSoon: true },
  { style: 'phosphor', palette: 'green', comingSoon: true },
  // { style: 'workbench', palette: 'graphite' },
  // { style: 'workbench', palette: 'cobalt' },
  // { style: 'workbench', palette: 'pine' },
  // { style: 'workbench', palette: 'plum' },
  // { style: 'workbench', palette: 'midnight' },
  // { style: 'chalkboard', palette: 'slate' },
  // { style: 'chalkboard', palette: 'schoolroom' },
  // { style: 'chalkboard', palette: 'whiteboard' },
  // { style: 'chalkboard', palette: 'kraft' },
  // { style: 'blueprint', palette: 'cyanotype' },
  // { style: 'blueprint', palette: 'night-shift' },
  // { style: 'blueprint', palette: 'vellum' },
  // { style: 'blueprint', palette: 'red-pencil' },
  // { style: 'blueprint', palette: 'sepia-print' },
  // { style: 'split-flap', palette: 'amber-board' },
  // { style: 'split-flap', palette: 'euston' },
  // { style: 'split-flap', palette: 'shibuya' },
  // { style: 'split-flap', palette: 'gare-du-nord' },
  // { style: 'split-flap', palette: 'daylight' },
  // { style: 'inventory', palette: 'handheld' },
  // { style: 'inventory', palette: 'overworld' },
  // { style: 'inventory', palette: 'dungeon' },
  // { style: 'inventory', palette: 'nether' },
  // { style: 'inventory', palette: 'arcade' },
  // { style: 'keycaps', palette: 'beige-box' },
  // { style: 'keycaps', palette: 'rose' },
  // { style: 'keycaps', palette: 'sage' },
  // { style: 'keycaps', palette: 'laser' },
  // { style: 'keycaps', palette: 'carbon' },
  // { style: 'swiss', palette: 'zurich-red' },
  // { style: 'swiss', palette: 'ivory' },
  // { style: 'swiss', palette: 'tram-yellow' },
  // { style: 'swiss', palette: 'ultramarine' },
  // { style: 'swiss', palette: 'concrete' },
  // { style: 'toy-blocks', palette: 'playroom' },
  // { style: 'toy-blocks', palette: 'sunny' },
  // { style: 'toy-blocks', palette: 'ocean' },
  // { style: 'toy-blocks', palette: 'bedtime' },
  // { style: 'wood-type', palette: 'newsprint' },
  // { style: 'wood-type', palette: 'oxblood' },
  // { style: 'wood-type', palette: 'mustard' },
  // { style: 'wood-type', palette: 'forest' },
  // { style: 'wood-type', palette: 'indigo-ink' },
  // { style: 'phosphor', palette: 'amber' },
  // { style: 'phosphor', palette: 'ice' },
  // { style: 'phosphor', palette: 'magenta' },
  // { style: 'phosphor', palette: 'paper-tape' },
];

const STORAGE_KEY = 'ezds-theme';

const isOption = (styleId, paletteId) =>
  THEME_OPTIONS.some((o) => o.style === styleId && o.palette === paletteId && !o.comingSoon);

const themeOf = (styleId, paletteId) => {
  const style = PRESETS.find((p) => p.id === styleId);
  return { style, colors: style.palettes.find((c) => c.id === paletteId) };
};

export function resolveTheme(styleId, paletteId) {
  const pick = isOption(styleId, paletteId) ? { style: styleId, palette: paletteId } : THEME_OPTIONS[0];
  return themeOf(pick.style, pick.palette);
}

export const themeChoices = () =>
  THEME_OPTIONS.map((o) => ({ ...themeOf(o.style, o.palette), comingSoon: Boolean(o.comingSoon) }));

// A stale, hidden or coming-soon saved pick falls back to the default.
export function loadTheme() {
  const [styleId, paletteId] = (localStorage.getItem(STORAGE_KEY) || '').split('/');
  return resolveTheme(styleId, paletteId);
}

export function saveTheme(styleId, paletteId) {
  localStorage.setItem(STORAGE_KEY, `${styleId}/${paletteId}`);
}

// Palette and font custom properties; everything else derives from these in tokens.css.
export function themeVars(style, colors) {
  const c = colors.colors;
  return {
    '--p-bg': c.bg,
    '--p-surface': c.surface,
    '--p-ink': c.ink,
    '--p-muted': c.muted,
    '--p-line': c.line,
    '--p-cell': c.cell,
    '--p-cell-ink': c.cellInk,
    '--p-accent': c.accent,
    '--p-accent-ink': c.accentInk,
    '--f-display': style.display,
    '--f-body': style.body,
  };
}

export function applyTheme(style, colors, root = document.documentElement) {
  root.dataset.style = style.id;
  root.dataset.palette = colors.id;
  Object.entries(themeVars(style, colors)).forEach(([name, value]) => root.style.setProperty(name, value));
}
