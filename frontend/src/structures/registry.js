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
import GraphView from '../views/GraphView';
import TrieView from '../views/TrieView';
import IntervalsView from '../views/IntervalsView';
import LruCacheView from '../views/LruCacheView';
import RangeQueryView from '../views/RangeQueryView';
import SkipListView from '../views/SkipListView';
import BloomFilterView from '../views/BloomFilterView';
import KdTreeView from '../views/KdTreeView';
import QuadtreeView from '../views/QuadtreeView';
import SuffixArrayView from '../views/SuffixArrayView';

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
  { id: 'graph', label: 'Graph', group: 'Core', Component: GraphView },
  { id: 'trie', label: 'Trie', group: 'Second-tier', Component: TrieView },
  { id: 'intervals', label: 'Intervals', group: 'Second-tier', Component: IntervalsView },
  { id: 'lru-cache', label: 'LRU Cache', group: 'Second-tier', Component: LruCacheView },
  { id: 'range-query', label: 'Fenwick & Segment', group: 'Specialized', Component: RangeQueryView },
  { id: 'skip-list', label: 'Skip List', group: 'Specialized', Component: SkipListView },
  { id: 'bloom-filter', label: 'Bloom Filter', group: 'Specialized', Component: BloomFilterView },
  { id: 'kd-tree', label: 'kd-Tree', group: 'Specialized', Component: KdTreeView },
  { id: 'quadtree', label: 'Quadtree', group: 'Specialized', Component: QuadtreeView },
  { id: 'suffix-array', label: 'Suffix Array', group: 'Specialized', Component: SuffixArrayView },
];
