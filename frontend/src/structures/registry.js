import ArrayView from '../views/ArrayView';
import StringView from '../views/StringView';
import HashTableView from '../views/HashTableView';
import StackView from '../views/StackView';
import QueueView from '../views/QueueView';

// Groups follow the Contents section of ds.md.
export const GROUPS = ['Core', 'Second-tier', 'Specialized'];

export const STRUCTURES = [
  { id: 'array', label: 'Array', group: 'Core', Component: ArrayView },
  { id: 'string', label: 'String', group: 'Core', Component: StringView },
  { id: 'hash-table', label: 'Hash Table', group: 'Core', Component: HashTableView },
  { id: 'stack', label: 'Stack', group: 'Core', Component: StackView },
  { id: 'queue', label: 'Queue & Deque', group: 'Core', Component: QueueView },
];
