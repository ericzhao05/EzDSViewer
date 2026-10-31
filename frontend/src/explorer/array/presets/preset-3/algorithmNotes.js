// Plain-words notes, repeat rule and search for Preset 3's algorithm list. Logic only.

const SORT_TAGS = ['sort', 'sorting', 'ordering', 'swap', 'comparison'];

export const NOTES = {
  two_sum_sorted: {
    needs: 'A sorted array of numbers, and a target.',
    cost: 'It looks at each value at most once.',
    kind: 'search',
    tags: ['pointers', 'two pointers', 'pair', 'target'],
  },
  binary_search: {
    needs: 'A sorted array of numbers, and a target.',
    cost: 'Each step halves what is left, so 1,000 values take about 10 steps.',
    kind: 'search',
    tags: ['halving', 'log n', 'sorted', 'search', 'find'],
  },
  max_subarray: {
    needs: 'At least one number. There is nothing to fill in.',
    cost: 'It walks the array once.',
    kind: 'sum',
    tags: ['kadane', 'subarray', 'largest sum', 'dynamic programming'],
  },
  prefix_sums: {
    needs: 'Numbers only. There is nothing to fill in.',
    cost: 'It walks the array once.',
    kind: 'sum',
    tags: ['running total', 'cumulative', 'range sum'],
  },
  bubble_sort: {
    needs: 'Numbers only. There is nothing to fill in. Up to 40 values.',
    cost: 'Every value is compared with its neighbour, pass after pass, so doubling the array roughly quadruples the work.',
    kind: 'sort',
    tags: [...SORT_TAGS, 'adjacent', 'bubble'],
  },
  selection_sort: {
    needs: 'Numbers only. There is nothing to fill in. Up to 40 values.',
    cost: 'It scans what is left for the smallest value on every pass, so doubling the array roughly quadruples the work.',
    kind: 'sort',
    tags: [...SORT_TAGS, 'minimum', 'selection'],
  },
  insertion_sort: {
    needs: 'Numbers only. There is nothing to fill in. Up to 40 values.',
    cost: 'Each value slides back into place, so doubling the array roughly quadruples the work.',
    kind: 'sort',
    tags: [...SORT_TAGS, 'shift', 'insertion'],
  },
  merge_sort: {
    needs: 'Numbers only. There is nothing to fill in.',
    cost: 'It splits the array in half again and again, then merges, so 1,000 values take about 10,000 steps.',
    kind: 'sort',
    tags: [...SORT_TAGS, 'divide and conquer', 'recursion', 'merge'],
  },
  quick_sort: {
    needs: 'Numbers only. There is nothing to fill in. Up to 40 values.',
    cost: 'Usually it splits the array in half around a pivot, but an unlucky pivot makes it slow.',
    kind: 'sort',
    tags: [...SORT_TAGS, 'divide and conquer', 'recursion', 'pivot', 'partition'],
  },
  heap_sort: {
    needs: 'Numbers only. There is nothing to fill in.',
    cost: 'It builds a heap, then pulls out the biggest value each time, so 1,000 values take about 10,000 steps.',
    kind: 'sort',
    tags: [...SORT_TAGS, 'heap', 'priority queue'],
  },
};

const REPEAT = 'Already ran on this array. Change the array first.';
const REPEAT_TARGET = 'Already ran with this target. Change the target or the array first.';

const methodOf = (call) => {
  if (typeof call !== 'string') return '';
  const i = call.indexOf('(');
  return (i < 0 ? call : call.slice(0, i)).trim();
};

// Blocks an algorithm when the previous algorithm was the same one and the array has not changed since.
// What's between a call's brackets.
const argsOf = (call) => {
  const text = String(call);
  return text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
};

// An algorithm's typed inputs, written the way its call would have them; none if it takes no inputs.
const typedArgs = (item) => {
  const inputs = item.inputs || [];
  if (inputs.length === 0) return undefined;
  return inputs
    .map(({ value }) => {
      const text = String(value).trim();
      return /^-?\d+$/.test(text) ? String(Number(text)) : text;
    })
    .join(', ');
};

export function repeatReason(calls, id, args) {
  const list = Array.isArray(calls) ? calls : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const method = methodOf(list[i]);
    if (method === 'get') continue;
    if (Object.prototype.hasOwnProperty.call(NOTES, method)) {
      if (method !== id) return null;
      if (args === undefined) return REPEAT;
      return argsOf(list[i]) === args ? REPEAT_TARGET : null;
    }
    return null; // append, insert, pop, reset or anything unknown changes the array
  }
  return null;
}

export function withNotes(items, calls) {
  return items.map((item) => {
    const merged = { ...item, ...NOTES[item.id] };
    const reason = repeatReason(calls, item.id, typedArgs(item));
    if (reason && !item.blockedReason) {
      merged.blockedReason = reason;
      merged.run = () => undefined;
    }
    return merged;
  });
}

export function searchNotes(items, query) {
  const words = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;
  const hasAll = (text) => words.every((w) => text.includes(w));
  const matches = items.filter((item) => {
    const hay = [item.label, item.summary, item.complexity, item.needs, item.kind, ...(item.tags || [])]
      .filter((x) => typeof x === 'string')
      .join(' ')
      .toLowerCase();
    return hasAll(hay);
  });
  const inLabel = (item) => hasAll(String(item.label || '').toLowerCase());
  return [...matches.filter(inLabel), ...matches.filter((i) => !inLabel(i))];
}
