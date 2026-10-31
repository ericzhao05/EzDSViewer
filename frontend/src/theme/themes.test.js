import { PRESETS } from './presets';
import { THEME_OPTIONS, applyTheme, loadTheme, resolveTheme, saveTheme, themeChoices } from './themes';

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['cellInk', 'cell'],
  ['accentInk', 'accent'],
];

beforeEach(() => localStorage.clear());

test('the catalog keeps 10 styles with 5 palettes each', () => {
  expect(PRESETS).toHaveLength(10);
  PRESETS.forEach((p) => expect(p.palettes).toHaveLength(5));
});

test('only the three chosen combinations are offered, Chalkboard Blackout first', () => {
  expect(THEME_OPTIONS).toEqual([
    { style: 'chalkboard', palette: 'blackout' },
    { style: 'toy-blocks', palette: 'bubblegum' },
    { style: 'phosphor', palette: 'green' },
  ]);
});

test('every offered theme keeps text readable (WCAG AA)', () => {
  themeChoices().forEach(({ style, colors }) => {
    TEXT_PAIRS.forEach(([fg, bg]) => {
      expect([style.id, fg, bg, contrast(colors.colors[fg], colors.colors[bg]) >= 4.5]).toEqual([style.id, fg, bg, true]);
    });
  });
});

test('a first visit gets the default', () => {
  const { style, colors } = loadTheme();
  expect([style.id, colors.id]).toEqual(['chalkboard', 'blackout']);
});

test('a saved pick is restored', () => {
  saveTheme('phosphor', 'green');
  expect(loadTheme().style.id).toBe('phosphor');
});

test('a hidden or unknown saved pick falls back to the default', () => {
  saveTheme('workbench', 'cobalt');
  expect(loadTheme().style.id).toBe('chalkboard');
  expect(resolveTheme('toy-blocks', 'nope').style.id).toBe('chalkboard');
});

test('applyTheme sets the attributes and palette variables on the root', () => {
  const root = document.createElement('div');
  const { style, colors } = resolveTheme('toy-blocks', 'bubblegum');
  applyTheme(style, colors, root);
  expect(root.dataset.style).toBe('toy-blocks');
  expect(root.dataset.palette).toBe('bubblegum');
  expect(root.style.getPropertyValue('--p-bg')).toBe('#FFE3F1');
});
