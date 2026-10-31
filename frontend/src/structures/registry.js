import ArrayView from '../views/ArrayView';
import StringView from '../views/StringView';
import HashTableView from '../views/HashTableView';
import LinkedListView from '../views/LinkedListView';
import StackView from '../views/StackView';
import QueueView from '../views/QueueView';
import MatrixView from '../views/MatrixView';
import BinaryTreeView from '../views/BinaryTreeView';
import BstView from '../views/BstView';
import HeapView from '../views/HeapView';
import TrieView from '../views/TrieView';

// Groups follow the Contents section of ds.md.
export const GROUPS = ['Core', 'Second-tier', 'Specialized'];

export const STRUCTURES = [
  { id: 'array', label: 'Array', group: 'Core', Component: ArrayView },
  { id: 'string', label: 'String', group: 'Core', Component: StringView },
  { id: 'hash-table', label: 'Hash Table', group: 'Core', Component: HashTableView },
  { id: 'linked-list', label: 'Linked List', group: 'Core', Component: LinkedListView },
  { id: 'stack', label: 'Stack', group: 'Core', Component: StackView },
  { id: 'queue', label: 'Queue & Deque', group: 'Core', Component: QueueView },
  { id: 'matrix', label: 'Matrix', group: 'Core', Component: MatrixView },
  { id: 'binary-tree', label: 'Binary Tree', group: 'Core', Component: BinaryTreeView },
  { id: 'bst', label: 'Binary Search Tree', group: 'Core', Component: BstView },
  { id: 'heap', label: 'Heap', group: 'Core', Component: HeapView },
  { id: 'trie', label: 'Trie', group: 'Second-tier', Component: TrieView },
];
