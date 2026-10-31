# Data Structures: College and Interview Reference

The data structures most often taught in college courses and tested in coding interviews, with how each works, its complexity, a Python implementation, common mistakes, and practice problems.

All Python in this file runs as written. Each block can be pasted on its own once the blocks it builds on are in place.

## Contents

- [What to learn, ranked](#what-to-learn-ranked)
- [Where the ranking comes from](#where-the-ranking-comes-from)
- [Complexity cheat sheet](#complexity-cheat-sheet)
- [Choosing a data structure](#choosing-a-data-structure)
- [Built-ins by language](#built-ins-by-language)
- Core structures
  - [1. Array and dynamic array](#1-array-and-dynamic-array)
  - [2. String](#2-string)
  - [3. Hash table](#3-hash-table)
  - [4. Linked list](#4-linked-list)
  - [5. Stack](#5-stack)
  - [6. Queue and deque](#6-queue-and-deque)
  - [7. Matrix](#7-matrix)
  - [8. Binary tree](#8-binary-tree)
  - [9. Binary search tree](#9-binary-search-tree)
  - [10. Heap and priority queue](#10-heap-and-priority-queue)
  - [11. Graph](#11-graph)
- Second-tier structures
  - [12. Trie](#12-trie)
  - [13. Union-find](#13-union-find)
  - [14. Balanced search trees](#14-balanced-search-trees)
  - [15. B-tree and B+ tree](#15-b-tree-and-b-tree)
  - [16. Intervals](#16-intervals)
  - [17. LRU cache](#17-lru-cache)
- Specialized structures
  - [18. Fenwick tree and segment tree](#18-fenwick-tree-and-segment-tree)
  - [19. Others worth recognizing](#19-others-worth-recognizing)
- [Study order](#study-order)
- [Sources](#sources)

## What to learn, ranked

This ranking is a judgment call based on the sources below. No public dataset of real interview questions turned up, so treat the order as a guide and not a measurement.

| Tier | Structures | College | Interviews |
|---|---|---|---|
| **1. Must know** | Array, string, hash table, linked list, stack, queue, binary tree, BST, heap, graph | Core of every course | Asked constantly |
| **2. Know well** | Matrix, trie, union-find, intervals, LRU cache, monotonic stack and deque | Some are taught | Common at mid-to-hard level |
| **3. College focus** | AVL and red-black trees, B-trees | Standard exam material | Know the idea and the guarantees; you will rarely implement one |
| **4. Recognize** | Segment tree, Fenwick tree, skip list, Bloom filter, kd-tree | Advanced or elective | Occasional, mostly at hard level or in system design |

## Where the ranking comes from

| Structure | Berkeley CS 61B | UIUC CS 225 | MIT 6.006 | CLRS 4e | Tech Interview Handbook priority | LeetCode tag count (2022) |
|---|---|---|---|---|---|---|
| Array / dynamic array | ✓ | | ✓ | ✓† | High | 1142 |
| String | ✓ | | | | High | 549 |
| Hash table | ✓ | ✓ | ✓ | ✓ | Mid | 392 |
| Linked list | ✓ | ✓ | | ✓† | Mid | 69 |
| Stack | | ✓ | | ✓† | Mid | 128 |
| Queue | ✓ | ✓ | | ✓† | Mid | |
| Tree | ✓ | ✓ | | ✓† | High | 191 |
| BST | | ✓ | ✓ | ✓ | | |
| Balanced BST | | ✓ | ✓ | ✓ | | |
| Heap / priority queue | | ✓ | ✓ | ✓† | Mid | 107 |
| Graph | | ✓ | | ✓† | High | 102 |
| Matrix | | | | ✓† | High | 171 |
| Trie | | | | | Mid | 44 |
| Union-find | | ✓ | | ✓ | | 63 |
| B-tree | | ✓ | | ✓ | | |
| Interval | | | | | Mid | |
| Segment tree | | | | | | 27 |

How to read this table:

- **A blank college cell means the page I checked does not name the structure, not that the course skips it.** The 61B entry comes from a short catalog description and the 6.006 entry from a syllabus summary. Both courses teach more than those pages list.
- **† comes from my own knowledge of the book** (Chapter 6 for heaps, Chapter 10 for the elementary structures, Part VI for graphs). The chapter listing I retrieved confirmed hash tables, BSTs, red-black trees, B-trees, and disjoint sets.
- **The LeetCode counts are old and measure something different.** They are from a July 2022 article, and they count practice problems with a tag, not how often interviewers ask something. I could not get current numbers because LeetCode blocked the request. Union-find and segment tree are listed in that article as patterns.
- **Hash table's "Mid" understates it.** The same handbook calls it "probably the most commonly used data structure for algorithm questions." Treat it as top priority.
- **The UIUC page was last updated in 2019**, although it lists current sections.

## Complexity cheat sheet

Average case unless noted. `n` is the number of elements, `L` is the key length, `V` and `E` are vertices and edges.

| Structure | Access | Search | Insert | Delete | Space |
|---|---|---|---|---|---|
| Dynamic array | O(1) | O(n) | O(1) amortized at end, O(n) elsewhere | O(1) at end, O(n) elsewhere | O(n) |
| Sorted array | O(1) | O(log n) | O(n) | O(n) | O(n) |
| Hash table | n/a | O(1), worst O(n) | O(1), worst O(n) | O(1), worst O(n) | O(n) |
| Singly linked list | O(n) | O(n) | O(1) at head or after a known node | O(1) at head or after a known node | O(n) |
| Doubly linked list | O(n) | O(n) | O(1) at a known node | O(1) at a known node | O(n) |
| Stack | top only, O(1) | O(n) | O(1) | O(1) | O(n) |
| Queue / deque | ends only, O(1) | O(n) | O(1) | O(1) | O(n) |
| BST | O(h) | O(h) | O(h) | O(h) | O(n) |
| Balanced BST | O(log n) | O(log n) | O(log n) | O(log n) | O(n) |
| Binary heap | min or max only, O(1) | O(n) | O(log n) | O(log n) for the top | O(n) |
| Trie | n/a | O(L) | O(L) | O(L) | O(total characters) |
| Union-find | n/a | O(α(n)) amortized | O(1) | n/a | O(n) |
| B-tree | O(log n) | O(log n) | O(log n) | O(log n) | O(n) |

`h` is the tree height: about log n when balanced, up to n when not. α(n) is the inverse Ackermann function, which is at most 4 for any practical input.

Graph representations:

| Operation | Adjacency list | Adjacency matrix | Edge list |
|---|---|---|---|
| Space | O(V + E) | O(V²) | O(E) |
| Does edge u→v exist? | O(degree of u) | O(1) | O(E) |
| List neighbors of u | O(degree of u) | O(V) | O(E) |
| Add edge | O(1) | O(1) | O(1) |

Graph algorithms:

| Algorithm | Purpose | Time |
|---|---|---|
| BFS, DFS | Traversal, reachability, unweighted shortest path (BFS) | O(V + E) |
| Topological sort | Ordering a DAG | O(V + E) |
| Dijkstra with a binary heap | Shortest path, non-negative weights | O((V + E) log V) |
| Bellman-Ford | Shortest path, negative weights allowed | O(VE) |
| Floyd-Warshall | All-pairs shortest paths | O(V³) |
| Prim, Kruskal | Minimum spanning tree | O(E log V) |

## Choosing a data structure

| You need to... | Reach for |
|---|---|
| Look up by key, count things, or detect duplicates | Hash table |
| Access by index, or iterate with good cache behavior | Dynamic array |
| Process the most recent item first, or match nested pairs | Stack |
| Process items in arrival order, or explore level by level | Queue |
| Get the min or max of a window that slides | Monotonic deque |
| Find the next greater or smaller element | Monotonic stack |
| Repeatedly take the smallest or largest item, or find the top K | Heap |
| Keep data sorted while inserting, or run range and floor/ceiling queries | Balanced BST |
| Search by prefix | Trie |
| Merge groups and ask whether two items are connected | Union-find |
| Model relationships or dependencies | Graph |
| Insert and remove at known positions without shifting | Linked list |
| Run range queries on data that changes | Fenwick or segment tree |
| Store a sorted index on disk | B+ tree |

## Built-ins by language

| Structure | Python | Java | C++ | JavaScript |
|---|---|---|---|---|
| Dynamic array | `list` | `ArrayList` | `vector` | `Array` |
| Hash map | `dict` | `HashMap` | `unordered_map` | `Map` |
| Hash set | `set` | `HashSet` | `unordered_set` | `Set` |
| Stack | `list` | `ArrayDeque` | `stack` | `Array` |
| Queue / deque | `collections.deque` | `ArrayDeque` | `queue`, `deque` | no built-in with O(1) dequeue |
| Heap | `heapq` (min) | `PriorityQueue` (min) | `priority_queue` (max) | none |
| Sorted map | none (`sortedcontainers` is third-party) | `TreeMap` | `map` | none |
| Linked list | none | `LinkedList` | `list` | none |

---

# Core structures

## 1. Array and dynamic array

**What it is.** Elements stored in contiguous memory, so index `i` lives at `base + i * element_size`. That arithmetic makes access O(1). A dynamic array adds automatic growth on top of a fixed array.

**Why append is amortized O(1).** When the array is full, allocate one about twice as large and copy everything over. A single copy costs O(n), but doubling makes copies rare enough that n appends cost O(n) in total. Growing by a constant amount instead would cost O(n²) overall.

```python
class DynamicArray:
    def __init__(self):
        self._capacity = 2
        self._size = 0
        self._data = [None] * self._capacity

    def __len__(self):
        return self._size

    def __getitem__(self, i):
        if not 0 <= i < self._size:
            raise IndexError(i)
        return self._data[i]

    def _resize(self, capacity):
        new_data = [None] * capacity
        for i in range(self._size):
            new_data[i] = self._data[i]
        self._data = new_data
        self._capacity = capacity

    def append(self, value):
        if self._size == self._capacity:
            self._resize(self._capacity * 2)
        self._data[self._size] = value
        self._size += 1

    def insert(self, i, value):
        if not 0 <= i <= self._size:
            raise IndexError(i)
        if self._size == self._capacity:
            self._resize(self._capacity * 2)
        for j in range(self._size, i, -1):
            self._data[j] = self._data[j - 1]
        self._data[i] = value
        self._size += 1

    def pop(self, i=-1):
        if i < 0:
            i += self._size
        if not 0 <= i < self._size:
            raise IndexError(i)
        value = self._data[i]
        for j in range(i, self._size - 1):
            self._data[j] = self._data[j + 1]
        self._size -= 1
        self._data[self._size] = None
        return value
```

**Key techniques**

```python
def two_sum_sorted(nums, target):
    """Two pointers on a sorted array."""
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1
        else:
            right -= 1
    return []


def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1


def max_subarray(nums):
    """Kadane's algorithm."""
    best = current = nums[0]
    for num in nums[1:]:
        current = max(num, current + num)
        best = max(best, current)
    return best


def range_sum_prefix(nums):
    """Prefix sums: sum of nums[i:j] is prefix[j] - prefix[i]."""
    prefix = [0]
    for num in nums:
        prefix.append(prefix[-1] + num)
    return prefix
```

**Common mistakes**

- Off-by-one errors in binary search bounds. Decide whether the range is inclusive and stick with it.
- Removing from a list while iterating over it.
- `[[0] * n] * m` in Python creates `m` references to the same row. Use a comprehension.
- Forgetting empty and single-element arrays.

**Practice:** Two Sum, Contains Duplicate, Best Time to Buy and Sell Stock, Maximum Subarray, Product of Array Except Self, 3Sum, Container With Most Water, Find Minimum in Rotated Sorted Array.

## 2. String

**What it is.** A sequence of characters, typically stored as an array. Python, Java, and JavaScript strings are immutable, so every modification creates a new string. C++ `std::string` is mutable.

**Performance trap.** Building a string with `+=` in a loop can cost O(n²) because each step may copy everything. Collect pieces in a list and call `"".join(pieces)`.

| Operation | Time |
|---|---|
| Access by index | O(1) |
| Compare or copy | O(n) |
| Slice of length k | O(k) |
| Substring search, naive | O(nm) |
| Substring search, KMP or Rabin-Karp (expected) | O(n + m) |

```python
from collections import Counter


def is_anagram(a, b):
    return Counter(a) == Counter(b)


def is_palindrome(text):
    left, right = 0, len(text) - 1
    while left < right:
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True


def longest_unique_substring(text):
    """Sliding window: grow on the right, jump the left past any repeat."""
    last_seen = {}
    left = best = 0
    for right, char in enumerate(text):
        if char in last_seen and last_seen[char] >= left:
            left = last_seen[char] + 1
        last_seen[char] = right
        best = max(best, right - left + 1)
    return best
```

**Common mistakes**

- Assuming lowercase ASCII without asking about the character set.
- Treating a slice as O(1). In Python it copies.
- Missing empty strings, single characters, and all-identical strings.

**Practice:** Valid Anagram, Group Anagrams, Longest Substring Without Repeating Characters, Longest Repeating Character Replacement, Minimum Window Substring, Palindromic Substrings.

## 3. Hash table

**What it is.** Key-value storage that runs each key through a hash function to choose a bucket. This trades extra memory for O(1) average lookups, and it is usually the first thing to try when a brute-force solution is too slow.

**Collision handling**

| Approach | How it works | Trade-off |
|---|---|---|
| Separate chaining | Each bucket holds a list of entries | Simple and tolerates high load, but follows extra pointers |
| Open addressing | On collision, probe other slots in the array | Cache-friendly, but deletion needs tombstones and it degrades as it fills |

**Load factor** is `size / buckets`. When it passes a threshold (0.75 below), the table doubles and rehashes every entry. This is why inserts are O(1) only on average, and why a poor hash function or adversarial keys can degrade operations to O(n).

```python
class HashMap:
    def __init__(self, capacity=8):
        self._buckets = [[] for _ in range(capacity)]
        self._size = 0

    def __len__(self):
        return self._size

    def _bucket(self, key):
        return self._buckets[hash(key) % len(self._buckets)]

    def put(self, key, value):
        bucket = self._bucket(key)
        for entry in bucket:
            if entry[0] == key:
                entry[1] = value
                return
        bucket.append([key, value])
        self._size += 1
        if self._size / len(self._buckets) > 0.75:
            self._resize()

    def get(self, key, default=None):
        for k, v in self._bucket(key):
            if k == key:
                return v
        return default

    def remove(self, key):
        bucket = self._bucket(key)
        for i, entry in enumerate(bucket):
            if entry[0] == key:
                bucket.pop(i)
                self._size -= 1
                return True
        return False

    def _resize(self):
        old_buckets = self._buckets
        self._buckets = [[] for _ in range(len(old_buckets) * 2)]
        for bucket in old_buckets:
            for key, value in bucket:
                self._bucket(key).append([key, value])
```

**Key techniques**

```python
from collections import defaultdict


def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        if target - num in seen:
            return [seen[target - num], i]
        seen[num] = i
    return []


def group_anagrams(words):
    groups = defaultdict(list)
    for word in words:
        groups[tuple(sorted(word))].append(word)
    return list(groups.values())


def longest_consecutive(nums):
    values = set(nums)
    best = 0
    for num in values:
        if num - 1 not in values:
            length = 1
            while num + length in values:
                length += 1
            best = max(best, length)
    return best
```

**Common mistakes**

- Using a mutable key. Python lists can't be keys, so convert them to tuples.
- Claiming O(1) worst case. It is O(1) on average and O(n) in the worst case.
- Relying on iteration order. Python's `dict` keeps insertion order, but Java's `HashMap` and C++'s `unordered_map` don't promise any order.

**Practice:** Two Sum, Group Anagrams, Longest Consecutive Sequence, Top K Frequent Elements, Subarray Sum Equals K.

## 4. Linked list

**What it is.** Nodes scattered through memory, each pointing to the next (singly linked) or to both neighbors (doubly linked). It gives up O(1) indexing in exchange for O(1) insertion and removal at a position you already hold.

| | Array | Linked list |
|---|---|---|
| Access by index | O(1) | O(n) |
| Insert or delete at front | O(n) | O(1) |
| Insert or delete at a known node | O(n) | O(1) (a singly linked list needs the previous node) |
| Memory | Compact, cache-friendly | Extra pointer per node, poor locality |

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def reverse_list(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev


def has_cycle(head):
    """Floyd's tortoise and hare: the fast pointer catches the slow one in a cycle."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False


def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow


def merge_sorted(a, b):
    """A dummy node removes the special case for the first element."""
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next


def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):
        fast = fast.next
    while fast.next:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next
```

**Common mistakes**

- Losing the rest of the list by overwriting `next` before saving it.
- Not handling an empty list, a single node, or removal of the head. A dummy node solves most of these.
- Checking `fast.next` without first checking `fast`.

**Practice:** Reverse a Linked List, Detect Cycle in a Linked List, Merge Two Sorted Lists, Remove Nth Node From End Of List, Merge K Sorted Lists, LRU Cache.

## 5. Stack

**What it is.** Last in, first out. Push, pop, and peek are all O(1). It can be backed by an array or a linked list. Function calls use one, which is why any recursion can be rewritten with an explicit stack.

```python
class ArrayStack:
    def __init__(self):
        self._items = []

    def __len__(self):
        return len(self._items)

    def push(self, value):
        self._items.append(value)

    def pop(self):
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()

    def peek(self):
        if not self._items:
            raise IndexError("peek at empty stack")
        return self._items[-1]


def is_valid_parentheses(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for char in text:
        if char in pairs:
            if not stack or stack.pop() != pairs[char]:
                return False
        else:
            stack.append(char)
    return not stack


class MinStack:
    """Each entry stores the minimum so far, so get_min is O(1)."""

    def __init__(self):
        self._items = []

    def push(self, value):
        current_min = min(value, self._items[-1][1]) if self._items else value
        self._items.append((value, current_min))

    def pop(self):
        return self._items.pop()[0]

    def get_min(self):
        return self._items[-1][1]
```

**Monotonic stack.** A stack kept in sorted order while scanning an array. Each element is pushed and popped at most once, so the whole scan is O(n). Use it for "next greater" and "next smaller" questions.

```python
def daily_temperatures(temps):
    """Days until a warmer temperature; the stack holds indices still waiting."""
    answer = [0] * len(temps)
    stack = []
    for i, temp in enumerate(temps):
        while stack and temps[stack[-1]] < temp:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer
```

**Common mistakes**

- Popping or peeking without checking for empty.
- Forgetting a final check that the stack is empty, as in the parentheses problem.

**Practice:** Valid Parentheses, Min Stack, Evaluate Reverse Polish Notation, Daily Temperatures, Largest Rectangle in Histogram.

## 6. Queue and deque

**What it is.** A queue is first in, first out. A deque (double-ended queue) allows O(1) insertion and removal at both ends. Queues drive BFS, schedulers, and buffers.

**Implementation trap.** Dequeuing by shifting an array, as with Python's `list.pop(0)`, is O(n). Use `collections.deque`, a linked list, or a circular buffer. A priority queue is not FIFO; see [heaps](#10-heap-and-priority-queue).

```python
class CircularQueue:
    """Fixed-capacity queue: indices wrap around instead of shifting elements."""

    def __init__(self, capacity):
        self._data = [None] * capacity
        self._head = 0
        self._size = 0

    def __len__(self):
        return self._size

    def is_full(self):
        return self._size == len(self._data)

    def enqueue(self, value):
        if self.is_full():
            raise OverflowError("queue is full")
        tail = (self._head + self._size) % len(self._data)
        self._data[tail] = value
        self._size += 1

    def dequeue(self):
        if self._size == 0:
            raise IndexError("dequeue from empty queue")
        value = self._data[self._head]
        self._data[self._head] = None
        self._head = (self._head + 1) % len(self._data)
        self._size -= 1
        return value


class QueueWithStacks:
    """Amortized O(1): each item moves between the stacks at most once."""

    def __init__(self):
        self._incoming = []
        self._outgoing = []

    def enqueue(self, value):
        self._incoming.append(value)

    def dequeue(self):
        if not self._outgoing:
            while self._incoming:
                self._outgoing.append(self._incoming.pop())
        return self._outgoing.pop()
```

**Monotonic deque.** Holds candidates in decreasing order, giving an O(n) sliding-window maximum.

```python
from collections import deque


def sliding_window_max(nums, k):
    window = deque()
    result = []
    for i, num in enumerate(nums):
        while window and nums[window[-1]] <= num:
            window.pop()
        window.append(i)
        if window[0] <= i - k:
            window.popleft()
        if i >= k - 1:
            result.append(nums[window[0]])
    return result
```

**Common mistakes**

- Using `list.pop(0)` in BFS, which silently makes it O(V²) or worse.
- Getting the full and empty checks wrong in a circular buffer. Tracking the size avoids the ambiguity.

**Practice:** Implement Queue using Stacks, Design Circular Queue, Sliding Window Maximum, Rotting Oranges.

## 7. Matrix

**What it is.** A 2D array. Interview problems often treat it as a graph in which each cell connects to its neighbors, so most grid problems are BFS or DFS.

```python
def number_of_islands(grid):
    rows, cols = len(grid), len(grid[0]) if grid else 0
    seen = set()
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in seen:
                count += 1
                seen.add((r, c))
                stack = [(r, c)]
                while stack:
                    x, y = stack.pop()
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if (0 <= nx < rows and 0 <= ny < cols
                                and grid[nx][ny] == "1" and (nx, ny) not in seen):
                            seen.add((nx, ny))
                            stack.append((nx, ny))
    return count


def rotate_clockwise(matrix):
    """Rotate a square matrix in place: transpose, then reverse each row."""
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
```

**Common mistakes**

- Swapping rows and columns in bounds checks.
- Marking a cell as visited when popping instead of when pushing, which adds duplicates to the stack or queue.
- Hitting Python's recursion limit with recursive DFS on large grids.

**Practice:** Number of Islands, Rotate Image, Spiral Matrix, Set Matrix Zeroes, Word Search, Pacific Atlantic Water Flow.

## 8. Binary tree

**What it is.** A hierarchy in which each node has at most two children.

| Term | Meaning |
|---|---|
| Height | Edges on the longest path from a node down to a leaf |
| Depth | Edges from the root to a node |
| Full | Every node has 0 or 2 children |
| Complete | Every level is filled except possibly the last, which fills left to right |
| Perfect | All internal nodes have 2 children and all leaves share a depth |
| Balanced | Left and right subtree heights stay close, giving O(log n) height |

**Traversals.** All visit each node once, so they take O(n) time and O(h) stack space, except level order, which uses O(w) space for tree width `w`.

| Order | Sequence | Typical use |
|---|---|---|
| Preorder | Node, left, right | Copying or serializing a tree |
| Inorder | Left, node, right | Reading a BST in sorted order |
| Postorder | Left, right, node | Deleting a tree, or computing from children up |
| Level order | One level at a time | Shortest depth, per-level answers |

```python
from collections import deque


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def preorder(root):
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)


def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)


def postorder(root):
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]


def inorder_iterative(root):
    result, stack = [], []
    while root or stack:
        while root:
            stack.append(root)
            root = root.left
        root = stack.pop()
        result.append(root.val)
        root = root.right
    return result


def level_order(root):
    if not root:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result


def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))


def invert_tree(root):
    if root:
        root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root


def lowest_common_ancestor(root, p, q):
    if not root or root is p or root is q:
        return root
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root
    return left or right
```

**Common mistakes**

- Assuming a binary tree is a BST. Ask which one you have.
- Assuming the tree is balanced when stating complexity. Say O(h), and note that h can reach n.
- Mixing up height counted in edges with height counted in nodes.

**Practice:** Invert Binary Tree, Maximum Depth of Binary Tree, Binary Tree Level Order Traversal, Construct Binary Tree from Preorder and Inorder Traversal, Serialize and Deserialize Binary Tree, Binary Tree Maximum Path Sum, Subtree of Another Tree.

## 9. Binary search tree

**What it is.** A binary tree in which everything in a node's left subtree is smaller than the node and everything in the right subtree is larger. Each comparison discards one subtree, and an inorder traversal yields sorted output.

**The catch.** Operations cost O(h). Inserting already-sorted data creates a tree shaped like a linked list, with O(n) operations. [Balanced trees](#14-balanced-search-trees) exist to prevent this.

**Deletion has three cases**

1. Leaf: remove it.
2. One child: replace the node with its child.
3. Two children: copy in the inorder successor (the smallest value in the right subtree), then delete that successor.

```python
def bst_search(root, target):
    while root and root.val != target:
        root = root.left if target < root.val else root.right
    return root


def bst_insert(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = bst_insert(root.left, val)
    elif val > root.val:
        root.right = bst_insert(root.right, val)
    return root


def bst_delete(root, val):
    if not root:
        return None
    if val < root.val:
        root.left = bst_delete(root.left, val)
    elif val > root.val:
        root.right = bst_delete(root.right, val)
    else:
        if not root.left:
            return root.right
        if not root.right:
            return root.left
        successor = root.right
        while successor.left:
            successor = successor.left
        root.val = successor.val
        root.right = bst_delete(root.right, successor.val)
    return root


def is_valid_bst(root, low=float("-inf"), high=float("inf")):
    if not root:
        return True
    if not low < root.val < high:
        return False
    return is_valid_bst(root.left, low, root.val) and is_valid_bst(root.right, root.val, high)


def kth_smallest(root, k):
    stack = []
    while True:
        while root:
            stack.append(root)
            root = root.left
        root = stack.pop()
        k -= 1
        if k == 0:
            return root.val
        root = root.right
```

**Common mistakes**

- Validating a BST by comparing each node only with its direct children. A value deep in a left subtree must still be below every ancestor it sits to the left of, so pass bounds down.
- Not deciding how to handle duplicates.

**Practice:** Validate Binary Search Tree, Lowest Common Ancestor of BST, Kth Smallest Element in a BST, Delete Node in a BST.

## 10. Heap and priority queue

**What it is.** A priority queue is the abstract idea: always remove the highest-priority item. A binary heap is the usual implementation, a complete binary tree in which each parent is no larger than its children (for a min-heap). A heap is only partially sorted, so siblings have no defined order.

**Stored in an array, with no pointers.** For the node at index `i`:

- Parent: `(i - 1) // 2`
- Left child: `2 * i + 1`
- Right child: `2 * i + 2`

| Operation | Time | How |
|---|---|---|
| Peek | O(1) | The root is at index 0 |
| Push | O(log n) | Append, then sift up |
| Pop | O(log n) | Move the last item to the root, then sift down |
| Build from n items | O(n) | Sift down from the last parent up to the root |
| Search | O(n) | No ordering to exploit |

Building is O(n), not O(n log n), because most nodes sit near the bottom and sift only a short distance.

```python
class MinHeap:
    def __init__(self, items=None):
        self._items = list(items or [])
        for i in range(len(self._items) // 2 - 1, -1, -1):
            self._sift_down(i)

    def __len__(self):
        return len(self._items)

    def peek(self):
        return self._items[0]

    def push(self, value):
        self._items.append(value)
        self._sift_up(len(self._items) - 1)

    def pop(self):
        items = self._items
        items[0], items[-1] = items[-1], items[0]
        value = items.pop()
        if items:
            self._sift_down(0)
        return value

    def _sift_up(self, i):
        items = self._items
        while i > 0:
            parent = (i - 1) // 2
            if items[i] >= items[parent]:
                break
            items[i], items[parent] = items[parent], items[i]
            i = parent

    def _sift_down(self, i):
        items = self._items
        while True:
            smallest = i
            for child in (2 * i + 1, 2 * i + 2):
                if child < len(items) and items[child] < items[smallest]:
                    smallest = child
            if smallest == i:
                break
            items[i], items[smallest] = items[smallest], items[i]
            i = smallest
```

**Key techniques.** Python's `heapq` is a min-heap, so negate numbers to simulate a max-heap. To find the K largest, keep a min-heap of size K, which costs O(n log k).

```python
import heapq
from collections import Counter


def kth_largest(nums, k):
    heap = []
    for num in nums:
        heapq.heappush(heap, num)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]


def top_k_frequent(nums, k):
    counts = Counter(nums)
    return heapq.nlargest(k, counts, key=counts.get)


class MedianFinder:
    """Two heaps: a max-heap for the lower half, a min-heap for the upper half."""

    def __init__(self):
        self._low = []
        self._high = []

    def add(self, num):
        heapq.heappush(self._high, -heapq.heappushpop(self._low, -num))
        if len(self._high) > len(self._low):
            heapq.heappush(self._low, -heapq.heappop(self._high))

    def median(self):
        if len(self._low) > len(self._high):
            return -self._low[0]
        return (-self._low[0] + self._high[0]) / 2
```

**Common mistakes**

- Assuming a heap's array is sorted.
- Calling build O(n log n). The tight bound is O(n).
- Comparison errors from `heapq` tuples when priorities tie and the next field isn't comparable. Add a counter as a tie-breaker.

**Practice:** Kth Largest Element in an Array, Top K Frequent Elements, Merge K Sorted Lists, Find Median from Data Stream, Task Scheduler.

## 11. Graph

**What it is.** Vertices connected by edges. Edges can be directed or undirected, weighted or unweighted. Trees, grids, and dependency lists are all graphs in disguise. Adjacency lists are the default; use a matrix only when the graph is dense or you need O(1) edge checks.

```python
from collections import defaultdict, deque
import heapq


def build_graph(edges, directed=False):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        if not directed:
            graph[v].append(u)
    return graph


def bfs(graph, start):
    """Visit order; also finds shortest paths when edges are unweighted."""
    seen = {start}
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            if neighbor not in seen:
                seen.add(neighbor)
                queue.append(neighbor)
    return order


def dfs(graph, start):
    seen = set()
    order = []

    def visit(node):
        seen.add(node)
        order.append(node)
        for neighbor in graph[node]:
            if neighbor not in seen:
                visit(neighbor)

    visit(start)
    return order


def topological_sort(num_nodes, edges):
    """Kahn's algorithm: returns [] if the graph has a cycle."""
    graph = defaultdict(list)
    indegree = [0] * num_nodes
    for u, v in edges:
        graph[u].append(v)
        indegree[v] += 1
    queue = deque(i for i in range(num_nodes) if indegree[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    return order if len(order) == num_nodes else []


def dijkstra(graph, start):
    """graph maps node -> [(neighbor, weight)]; weights must be non-negative."""
    distances = {start: 0}
    heap = [(0, start)]
    while heap:
        distance, node = heapq.heappop(heap)
        if distance > distances[node]:
            continue
        for neighbor, weight in graph.get(node, []):
            candidate = distance + weight
            if candidate < distances.get(neighbor, float("inf")):
                distances[neighbor] = candidate
                heapq.heappush(heap, (candidate, neighbor))
    return distances
```

**Common mistakes**

- Forgetting the visited set, or marking nodes only when dequeued, which queues duplicates.
- Using Dijkstra with negative weights.
- Assuming the graph is connected. Loop over all nodes when it might not be.
- Checking only for a back edge to any visited node when detecting cycles in a directed graph. Track the current recursion path separately.

**Practice:** Number of Islands, Clone Graph, Course Schedule, Pacific Atlantic Water Flow, Word Ladder, Network Delay Time.

---

# Second-tier structures

## 12. Trie

**What it is.** A prefix tree: a tree in which each edge is a character and each path from the root spells a prefix. Lookup cost depends on the word's length and not on how many words are stored. Use it for autocomplete, prefix counts, and searching many words at once.

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            node = node.children.setdefault(char, TrieNode())
        node.is_word = True

    def _find(self, text):
        node = self.root
        for char in text:
            node = node.children.get(char)
            if node is None:
                return None
        return node

    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_word

    def starts_with(self, prefix):
        return self._find(prefix) is not None
```

**Common mistakes**

- Treating a prefix as a stored word. That is what `is_word` is for.
- Ignoring memory use, which can be large compared with a hash set when you don't need prefix queries.

**Practice:** Implement Trie (Prefix Tree), Add and Search Word, Word Search II.

## 13. Union-find

**What it is.** Also called a disjoint set. It tracks which group each item belongs to and supports merging groups. Path compression and union by rank together bring operations to nearly constant amortized time. Use it for connected components, cycle detection in undirected graphs, and Kruskal's algorithm.

```python
class UnionFind:
    def __init__(self, size):
        self.parent = list(range(size))
        self.rank = [0] * size
        self.components = size

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        """Returns False if a and b were already connected."""
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        self.components -= 1
        return True
```

**Common mistakes**

- Comparing `parent[a] == parent[b]` instead of comparing the results of `find`.
- Expecting efficient splits. Union-find can only merge.

**Practice:** Number of Provinces, Redundant Connection, Accounts Merge, Graph Valid Tree.

## 14. Balanced search trees

**What it is.** BSTs that restructure themselves to keep height at O(log n). The basic tool is a **rotation**, which changes the tree's shape in O(1) while preserving sorted order. These are exam staples, but interviews rarely ask you to code one. Know what they guarantee, and use your language's sorted map.

```
    y                x
   / \    right     / \
  x   C   ---->    A   y
 / \      <----       / \
A   B     left       B   C
```

| | AVL | Red-black |
|---|---|---|
| Rule | Subtree heights differ by at most 1 | Coloring rules: no red node has a red child, and all root-to-leaf paths have the same number of black nodes |
| Max height | About 1.44 log₂ n | At most 2 log₂(n + 1) |
| Lookups | Slightly faster (shorter) | Slightly slower |
| Inserts and deletes | More rotations | Fewer rotations |
| Common use | Read-heavy workloads | Standard library sorted maps such as Java's `TreeMap` |

**AVL insertion.** After a normal BST insert, walk back up and fix any node whose balance factor (left height minus right height) leaves the range -1 to 1.

| Imbalance | New value went... | Fix |
|---|---|---|
| Left-left | Into the left child's left | Rotate right |
| Right-right | Into the right child's right | Rotate left |
| Left-right | Into the left child's right | Rotate the child left, then the node right |
| Right-left | Into the right child's left | Rotate the child right, then the node left |

```python
class AVLNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None
        self.height = 1


def _height(node):
    return node.height if node else 0


def _update_height(node):
    node.height = 1 + max(_height(node.left), _height(node.right))


def _balance(node):
    return _height(node.left) - _height(node.right)


def _rotate_right(y):
    x = y.left
    y.left, x.right = x.right, y
    _update_height(y)
    _update_height(x)
    return x


def _rotate_left(x):
    y = x.right
    x.right, y.left = y.left, x
    _update_height(x)
    _update_height(y)
    return y


def avl_insert(node, val):
    if not node:
        return AVLNode(val)
    if val < node.val:
        node.left = avl_insert(node.left, val)
    elif val > node.val:
        node.right = avl_insert(node.right, val)
    else:
        return node

    _update_height(node)
    balance = _balance(node)
    if balance > 1:
        if val > node.left.val:
            node.left = _rotate_left(node.left)
        return _rotate_right(node)
    if balance < -1:
        if val < node.right.val:
            node.right = _rotate_right(node.right)
        return _rotate_left(node)
    return node
```

## 15. B-tree and B+ tree

**What it is.** A search tree whose nodes hold many sorted keys and have many children, designed for storage that is read in blocks. A wide node fits one disk page, so a tree over millions of rows is only a few levels deep and each level costs one read.

| Property | B-tree of order m |
|---|---|
| Children per node | At most m; at least ⌈m/2⌉ for internal nodes other than the root |
| Leaves | All at the same depth |
| Search, insert, delete | O(log n) |
| Insert overflow | Split the full node and move the median key up |
| Delete underflow | Borrow from a sibling or merge with one |

A **B+ tree** keeps all values in the leaves and links the leaves together, so range scans walk the leaf chain. Most relational database indexes use this variant.

## 16. Intervals

**What it is.** Pairs of `[start, end]`, more a problem family than a structure, but the handbook gives it its own category. Nearly every solution starts by sorting by start, then scanning once for O(n log n) overall.

Intervals `a` and `b` overlap when `a[0] < b[1] and b[0] < a[1]`. Whether touching endpoints count as overlapping depends on the problem, so ask.

```python
import heapq


def merge_intervals(intervals):
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


def min_meeting_rooms(intervals):
    """A heap of end times holds the rooms in use."""
    rooms = []
    for start, end in sorted(intervals):
        if rooms and rooms[0] <= start:
            heapq.heappop(rooms)
        heapq.heappush(rooms, end)
    return len(rooms)
```

**Practice:** Merge Intervals, Insert Interval, Non-overlapping Intervals, Meeting Rooms II.

## 17. LRU cache

**What it is.** A popular design question that combines two structures. A hash map gives O(1) lookup, and a doubly linked list keeps usage order with O(1) moves and removals. Neither achieves both on its own. Interviewers usually want this version over `OrderedDict`, so build it by hand.

```python
class _CacheNode:
    def __init__(self, key=None, value=None):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self._nodes = {}
        self._head = _CacheNode()
        self._tail = _CacheNode()
        self._head.next = self._tail
        self._tail.prev = self._head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_front(self, node):
        node.prev = self._head
        node.next = self._head.next
        self._head.next.prev = node
        self._head.next = node

    def get(self, key):
        node = self._nodes.get(key)
        if node is None:
            return -1
        self._remove(node)
        self._add_front(node)
        return node.value

    def put(self, key, value):
        if key in self._nodes:
            self._remove(self._nodes[key])
        node = _CacheNode(key, value)
        self._nodes[key] = node
        self._add_front(node)
        if len(self._nodes) > self.capacity:
            oldest = self._tail.prev
            self._remove(oldest)
            del self._nodes[oldest.key]
```

The node stores its key so that eviction can remove the matching entry from the map.

---

# Specialized structures

## 18. Fenwick tree and segment tree

Prefix sums answer range queries in O(1) but cost O(n) to update. These two structures make both operations O(log n).

| | Fenwick (binary indexed) tree | Segment tree |
|---|---|---|
| Update, query | O(log n) | O(log n) |
| Space | O(n) | O(n) |
| Code size | Very short | Longer |
| Handles | Prefix-based operations such as sums | Any associative operation, including min and max |

```python
class FenwickTree:
    def __init__(self, size):
        self._tree = [0] * (size + 1)

    def add(self, i, delta):
        i += 1
        while i < len(self._tree):
            self._tree[i] += delta
            i += i & -i

    def prefix_sum(self, i):
        """Sum of the first i elements."""
        total = 0
        while i > 0:
            total += self._tree[i]
            i -= i & -i
        return total

    def range_sum(self, left, right):
        """Sum of elements left through right, inclusive."""
        return self.prefix_sum(right + 1) - self.prefix_sum(left)


class SegmentTree:
    """Range minimum over a fixed-size array."""

    def __init__(self, nums):
        self._n = len(nums)
        self._tree = [0] * self._n + list(nums)
        for i in range(self._n - 1, 0, -1):
            self._tree[i] = min(self._tree[2 * i], self._tree[2 * i + 1])

    def update(self, i, value):
        i += self._n
        self._tree[i] = value
        while i > 1:
            i //= 2
            self._tree[i] = min(self._tree[2 * i], self._tree[2 * i + 1])

    def query(self, left, right):
        """Minimum of elements left through right, inclusive."""
        result = float("inf")
        left += self._n
        right += self._n + 1
        while left < right:
            if left % 2:
                result = min(result, self._tree[left])
                left += 1
            if right % 2:
                right -= 1
                result = min(result, self._tree[right])
            left //= 2
            right //= 2
        return result
```

**Practice:** Range Sum Query - Mutable, Count of Smaller Numbers After Self, My Calendar I.

## 19. Others worth recognizing

| Structure | What it does | Where it shows up |
|---|---|---|
| Skip list | Layered linked lists with O(log n) expected search | Redis sorted sets; alternative to balanced trees |
| Bloom filter | Compact set test that can give false positives but never false negatives | Caches, databases, system design interviews |
| kd-tree | Partitions k-dimensional points | Nearest-neighbor search; covered in UIUC CS 225 |
| Quadtree | Recursively divides 2D space into four parts | Maps, collision detection; covered in UIUC CS 225 |
| Suffix array / suffix tree | Indexes every suffix of a string | Advanced string search |
| Fibonacci heap | Priority queue with O(1) amortized decrease-key | Theory courses; rarely used in practice |
| Circular buffer | Fixed-size queue (see [section 6](#6-queue-and-deque)) | Streaming, logging, audio |

---

## Study order

This follows the order of the Tech Interview Handbook's plan, with a final pass for college-only material.

| Stage | Topics | Goal |
|---|---|---|
| 1 | Big-O, array, string, hash table, recursion | Two pointers, sliding window, frequency maps |
| 2 | Sorting and searching, matrix, linked list, stack, queue | Binary search, dummy nodes, monotonic stack |
| 3 | Tree, BST, graph, heap, trie | Traversals, BFS and DFS, top K, topological sort |
| 4 | Intervals, union-find, LRU cache, dynamic programming | Combining structures |
| 5 | AVL and red-black trees, B-trees, Fenwick and segment trees | Course exams and hard problems |

**For an interview, be ready to state for your chosen structure:** why it fits, the time and space cost, the worst case, and the edge cases (empty input, one element, duplicates, negative numbers, and integer limits where they apply).

## Sources

Interview coverage:

- [Tech Interview Handbook: study cheatsheets and topic priorities](https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/)
- [Tech Interview Handbook: study plan](https://www.techinterviewhandbook.org/coding-interview-study-plan/)
- [Tech Interview Handbook: hash table cheatsheet](https://www.techinterviewhandbook.org/algorithms/hash-table/)
- [Tech Interview Handbook: best practice questions, by the author of Blind 75](https://www.techinterviewhandbook.org/best-practice-questions/)
- [Top LeetCode Patterns for FAANG Coding Interviews (DEV Community, July 2022): tag counts](https://dev.to/arslan_ah/top-leetcode-patterns-for-faang-coding-interviews-1on4)

College coverage:

- [UC Berkeley CS 61B catalog description](https://www2.eecs.berkeley.edu/Courses/CS61B/)
- [UIUC CS 225 course description and topic list](https://siebelschool.illinois.edu/academics/courses/cs225)
- [MIT 6.006 Introduction to Algorithms syllabus](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/syllabus/)
- [Introduction to Algorithms (CLRS), 4th edition](https://penguinrandomhouse.com/books/isbn/9780262046305)

Complexities, explanations, and code are from general computer science knowledge unless a source above is named. The practice problem lists mix the handbook's questions with other well-known LeetCode problems.
