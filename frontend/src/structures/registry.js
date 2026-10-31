import StringView from '../views/StringView';
import StackView from '../views/StackView';
import QueueView from '../views/QueueView';

// Groups follow the Contents section of ds.md.
export const GROUPS = ['Core', 'Second-tier', 'Specialized'];

export const STRUCTURES = [
  { id: 'string', label: 'String', group: 'Core', Component: StringView },
  { id: 'stack', label: 'Stack', group: 'Core', Component: StackView },
  { id: 'queue', label: 'Queue & Deque', group: 'Core', Component: QueueView },
];
