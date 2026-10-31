import Preset3 from './preset-3';
// import Preset2 from './preset-2';
// import Preset4 from './preset-4';

// The swappable Array page layouts. The first is the default. The switcher only appears with two or more,
// and shows each id and name. wide: true asks the app shell for the wider page column.
// Layouts 2 and 4 are kept for later: to bring one back, uncomment its lines here. Layout 2's tests are in
// preset-2/preset.test.js.disabled; remove .disabled from the name to run them again.
export const PRESETS = [
  { id: '3', name: 'The Sentences', Component: Preset3 },
  // { id: '2', name: 'Filmstrip', Component: Preset2, wide: true },
  // { id: '4', name: 'Hands on', Component: Preset4 },
];
