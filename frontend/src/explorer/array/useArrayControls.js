import { useState } from 'react';
import { buildCall } from '../commandLang';
import { callsBeforeLastSort } from './sortRuns';

const WHOLE = /^-?\d+$/;
const MAX_SIZE = 64;
const MAX_SLOW_SORT = 40;

// A whole number becomes an integer, anything else stays a string.
function parseValue(text) {
  const t = text.trim();
  return WHOLE.test(t) && Number.isSafeInteger(Number(t)) ? Number(t) : t;
}

function parseWhole(text) {
  const t = text.trim();
  return WHOLE.test(t) && Number.isSafeInteger(Number(t)) ? Number(t) : null;
}

// The values on screen, without the empty slots.
function shownValues(state) {
  if (!state || !Array.isArray(state.data)) return null;
  return state.data.slice(0, state.size);
}

// kind is 'number', 'value' or 'optional-number', so a layout can pick the right field.
function useField(id, label, kind, placeholder) {
  const [value, setValue] = useState('');
  return { id, label, kind, value, setValue, placeholder };
}

// Everything non-visual about the Array controls: inputs, parsing, messages and what is blocked.
// Takes the session from useExplorerSession and returns plain data for any layout to render.
export default function useArrayControls(session) {
  // The last message and which item it belongs to.
  const [note, setNote] = useState({ id: null, text: '' });

  const appendValue = useField('append-value', 'Value', 'value', 'e.g. 5');
  const insertIndex = useField('insert-index', 'Index', 'number', 'e.g. 0');
  const insertValue = useField('insert-value', 'Value', 'value', 'e.g. 5');
  const popIndex = useField('pop-index', 'Index', 'optional-number', 'optional');
  const getIndex = useField('get-index', 'Index', 'number', 'e.g. 0');
  const twoSumTarget = useField('two-sum-target', 'Target', 'number', 'e.g. 8');
  const searchTarget = useField('binary-search-target', 'Target', 'number', 'e.g. 5');

  // Runs build on the newest array, so its values decide what's allowed, not the step on screen.
  const values = shownValues(session.latestState || session.state);
  const size = values ? values.length : 0;
  const hasString = values ? values.some((v) => typeof v !== 'number') : false;
  // Only meaningful once hasString is ruled out: every check below tests hasString first.
  const ascending = values ? values.every((v, i) => i === 0 || values[i - 1] <= v) : true;

  const send = (method, args, base) => {
    setNote({ id: null, text: '' });
    if (base) session.runCall(buildCall(method, args), base);
    else session.runCall(buildCall(method, args));
    return true; // lets a layout tell a sent call from a refused one
  };

  const blockedFor = {
    append: values && size >= MAX_SIZE ? 'Array is full' : null,
    insert: values && size >= MAX_SIZE ? 'Array is full' : null,
    pop: values && size === 0 ? 'Array is empty' : null,
    get: values && size === 0 ? 'Array is empty' : null,
    twoSum: hasString ? 'Needs numbers only' : !ascending ? 'Needs a sorted array' : null,
    binarySearch: hasString ? 'Needs numbers only' : !ascending ? 'Needs a sorted array' : null,
    maxSubarray: hasString ? 'Needs numbers only' : values && size === 0 ? 'Needs at least one value' : null,
    prefixSums: hasString ? 'Needs numbers only' : null,
    sortAny: hasString ? 'Needs numbers only' : values && size === 0 ? 'Needs at least one value' : null,
    // The animation of the slower sorts gets too long past 40 values.
    sortSmall: hasString ? 'Needs numbers only' : values && size === 0 ? 'Needs at least one value' : size > MAX_SLOW_SORT ? `Needs ${MAX_SLOW_SORT} values or fewer` : null,
  };

  // A blocked item does nothing; the backend's rules stay the final check.
  const guarded = (blocked, fn) => () => {
    if (blocked) return undefined;
    return fn();
  };

  let current = null;
  const say = (text) => setNote({ id: current, text });

  const needValue = 'Enter a value first.';
  const needIndex = 'Enter a whole-number index first.';
  const needTarget = 'Enter a whole-number target first.';

  // Each run function reports a problem against its own item.
  const runAppend = () => {
    if (appendValue.value.trim() === '') return say(needValue);
    return send('append', [parseValue(appendValue.value)]);
  };
  const runInsert = () => {
    const i = parseWhole(insertIndex.value);
    if (insertValue.value.trim() === '') return say(needValue);
    if (i === null) return say(needIndex);
    return send('insert', [i, parseValue(insertValue.value)]);
  };
  const runPop = () => {
    if (popIndex.value.trim() === '') return send('pop', []);
    const i = parseWhole(popIndex.value);
    if (i === null) return say(needIndex);
    return send('pop', [i]);
  };
  const runGet = () => {
    const i = parseWhole(getIndex.value);
    if (i === null) return say(needIndex);
    return send('get', [i]);
  };
  const runTarget = (method, field) => () => {
    const t = parseWhole(field.value);
    if (t === null) return say(needTarget);
    return send(method, [t]);
  };

  const item = (id, label, summary, complexity, inputs, run, key) => {
    const go = () => {
      current = id;
      return run();
    };
    return {
      id,
      label,
      summary,
      complexity,
      inputs,
      blockedReason: blockedFor[key],
      message: note.id === id ? note.text : '',
      run: guarded(blockedFor[key], go),
      // Sends even when blocked, for layouts that let the backend explain.
      runUnchecked: go,
    };
  };

  const operations = [
    item('append', 'Append', 'Add a value at the end of the array.', 'O(1) amortized', [appendValue], runAppend, 'append'),
    item('insert', 'Insert', 'Put a value at an index and shift the rest right.', 'O(n)', [insertIndex, insertValue], runInsert, 'insert'),
    item('pop', 'Pop', 'Remove the last value, or the one at an index.', 'O(1) at the end, O(n) at an index', [popIndex], runPop, 'pop'),
    item('get', 'Get', 'Read the value at an index.', 'O(1)', [getIndex], runGet, 'get'),
  ];

  const algorithms = [
    item('two_sum_sorted', 'Two sum', 'Find two numbers that add up to the target.', 'O(n)', [twoSumTarget], runTarget('two_sum_sorted', twoSumTarget), 'twoSum'),
    item('binary_search', 'Binary search', 'Find the target by halving the search range.', 'O(log n)', [searchTarget], runTarget('binary_search', searchTarget), 'binarySearch'),
    item('max_subarray', 'Max subarray', 'Find the run of values with the biggest sum.', 'O(n)', [], () => send('max_subarray', []), 'maxSubarray'),
    item('prefix_sums', 'Prefix sums', 'Build running totals of the values.', 'O(n)', [], () => send('prefix_sums', []), 'prefixSums'),
  ];

  const sort = (id, label, summary, complexity, key) =>
    item(id, label, summary, complexity, [], () => send(id, [], callsBeforeLastSort(session.calls)), key);
  const sorts = [
    sort('bubble_sort', 'Bubble sort', 'Swap neighbours that are out of order, pass after pass.', 'O(n²)', 'sortSmall'),
    sort('selection_sort', 'Selection sort', 'Pick the smallest value left and move it to the front.', 'O(n²)', 'sortSmall'),
    sort('insertion_sort', 'Insertion sort', 'Slide each value back into its place among the sorted ones.', 'O(n²)', 'sortSmall'),
    sort('merge_sort', 'Merge sort', 'Split the array in halves, sort each, then merge them.', 'O(n log n)', 'sortAny'),
    sort('quick_sort', 'Quick sort', 'Split the values around a pivot and sort each side.', 'O(n log n), O(n²) at worst', 'sortSmall'),
    sort('heap_sort', 'Heap sort', 'Build a heap, then take out the biggest value each time.', 'O(n log n)', 'sortAny'),
  ];

  const activeCall = session.frame && Number.isInteger(session.frame.call) ? session.frame.call : null;
  // The calls made so far, each with the first frame it produced (-1 if it made none).
  const history = session.calls.map((call, index) => ({
    index,
    call,
    firstFrame: session.frames.findIndex((f) => f.call === index),
    active: activeCall === index,
  }));
  const goToCall = (i) => {
    const entry = history[i];
    if (entry && entry.firstFrame >= 0) session.goTo(entry.firstFrame);
  };

  return {
    operations,
    algorithms,
    sorts,
    undo: session.undo,
    canUndo: session.canUndo,
    startOver: () => {
      setNote({ id: null, text: '' });
      session.startOver();
    },
    disabled: session.loading,
    message: note.text,
    activeCall,
    history,
    goToCall,
  };
}
