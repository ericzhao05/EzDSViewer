import { useState } from 'react';
import { buildCall } from '../commandLang';

const WHOLE = /^-?\d+$/;
const MAX_SIZE = 64;

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

function useField(id, label, placeholder) {
  const [value, setValue] = useState('');
  return { id, label, value, setValue, placeholder };
}

// Everything non-visual about the Array controls: inputs, parsing, messages and what is blocked.
// Takes the session from useExplorerSession and returns plain data for any layout to render.
export default function useArrayControls(session) {
  const [message, setMessage] = useState('');

  const appendValue = useField('append-value', 'Value', 'e.g. 5');
  const insertIndex = useField('insert-index', 'Index', 'e.g. 0');
  const insertValue = useField('insert-value', 'Value', 'e.g. 5');
  const popIndex = useField('pop-index', 'Index', 'optional');
  const getIndex = useField('get-index', 'Index', 'e.g. 0');
  const twoSumTarget = useField('two-sum-target', 'Target', 'e.g. 8');
  const searchTarget = useField('binary-search-target', 'Target', 'e.g. 5');

  const values = shownValues(session.state);
  const size = values ? values.length : 0;
  const hasString = values ? values.some((v) => typeof v !== 'number') : false;
  const ascending = values ? values.every((v, i) => i === 0 || values[i - 1] <= v) : true;

  const send = (method, args) => {
    setMessage('');
    session.runCall(buildCall(method, args));
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
  };

  // A blocked item does nothing; the backend's rules stay the final check.
  const guarded = (blocked, fn) => () => {
    if (blocked) return undefined;
    return fn();
  };

  const needValue = 'Enter a value first.';
  const needIndex = 'Enter a whole-number index first.';
  const needTarget = 'Enter a whole-number target first.';

  const runAppend = () => {
    if (appendValue.value.trim() === '') return setMessage(needValue);
    return send('append', [parseValue(appendValue.value)]);
  };
  const runInsert = () => {
    const i = parseWhole(insertIndex.value);
    if (insertValue.value.trim() === '') return setMessage(needValue);
    if (i === null) return setMessage(needIndex);
    return send('insert', [i, parseValue(insertValue.value)]);
  };
  const runPop = () => {
    if (popIndex.value.trim() === '') return send('pop', []);
    const i = parseWhole(popIndex.value);
    if (i === null) return setMessage(needIndex);
    return send('pop', [i]);
  };
  const runGet = () => {
    const i = parseWhole(getIndex.value);
    if (i === null) return setMessage(needIndex);
    return send('get', [i]);
  };
  const runTarget = (method, field) => () => {
    const t = parseWhole(field.value);
    if (t === null) return setMessage(needTarget);
    return send(method, [t]);
  };

  const item = (id, label, summary, complexity, inputs, run, key) => ({
    id,
    label,
    summary,
    complexity,
    inputs,
    blockedReason: blockedFor[key],
    run: guarded(blockedFor[key], run),
  });

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

  // The calls made so far, each with the first frame it produced (-1 if it made none).
  const history = session.calls.map((call, index) => ({
    index,
    call,
    firstFrame: session.frames.findIndex((f) => f.call === index),
  }));
  const goToCall = (i) => {
    const entry = history[i];
    if (entry && entry.firstFrame >= 0) session.goTo(entry.firstFrame);
  };

  return {
    operations,
    algorithms,
    undo: session.undo,
    canUndo: session.canUndo,
    startOver: () => {
      setMessage('');
      session.startOver();
    },
    disabled: session.loading,
    message,
    history,
    goToCall,
  };
}
