import Preset1 from './preset-1';
import Preset2 from './preset-2';
import Preset3 from './preset-3';
import Preset4 from './preset-4';
import Preset5 from './preset-5';

// The swappable Array page layouts. The switcher shows each id and name. wide: true asks the app shell for the wider page column.
export const PRESETS = [
  { id: '1', name: 'The Workbench', Component: Preset1, wide: true },
  { id: '2', name: 'Filmstrip', Component: Preset2, wide: true },
  { id: '3', name: 'The Sentences', Component: Preset3 },
  { id: '4', name: 'Hands on', Component: Preset4 },
  { id: '5', name: 'Lesson notebook', Component: Preset5, wide: true },
];
