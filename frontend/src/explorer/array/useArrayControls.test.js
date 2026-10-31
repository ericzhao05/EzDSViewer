import { renderHook, act } from '@testing-library/react';
import useArrayControls from './useArrayControls';

function sessionWith(values, extra = {}) {
  const data = [...values];
  while (data.length < Math.max(2, values.length)) data.push(null);
  const calls = extra.calls || [];
  return {
    state: { data, size: values.length, capacity: data.length, resizes: 0 },
    calls,
    frames: extra.frames || [],
    loading: false,
    canUndo: calls.length > 0,
    runCall: jest.fn(),
    undo: jest.fn(),
    startOver: jest.fn(),
    goTo: jest.fn(),
    frame: extra.frame === undefined ? null : extra.frame,
  };
}

const find = (c, id) => [...c.operations, ...c.algorithms].find((o) => o.id === id);
const reasons = (c) => Object.fromEntries([...c.operations, ...c.algorithms].map((o) => [o.id, o.blockedReason]));

test('lists the four operations and four algorithms with the described fields', () => {
  const { result } = renderHook(() => useArrayControls(sessionWith([1, 2])));
  expect(result.current.operations.map((o) => o.label)).toEqual(['Append', 'Insert', 'Pop', 'Get']);
  expect(result.current.algorithms.map((o) => o.label)).toEqual(['Two sum', 'Binary search', 'Max subarray', 'Prefix sums']);
  [...result.current.operations, ...result.current.algorithms].forEach((o) => {
    expect(typeof o.summary).toBe('string');
    expect(typeof o.complexity).toBe('string');
    expect(typeof o.run).toBe('function');
    expect(Array.isArray(o.inputs)).toBe(true);
  });
});

describe('blockedReason', () => {
  test('nothing is blocked for a sorted array of numbers', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1, 3, 5])));
    Object.values(reasons(result.current)).forEach((r) => expect(r).toBeNull());
  });

  test('an unsorted array blocks two sum and binary search only', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([3, 1, 2])));
    const r = reasons(result.current);
    expect(r.two_sum_sorted).toBe('Needs a sorted array');
    expect(r.binary_search).toBe('Needs a sorted array');
    expect(r.max_subarray).toBeNull();
    expect(r.prefix_sums).toBeNull();
  });

  test('a string blocks all four algorithms', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1, 'a'])));
    const r = reasons(result.current);
    ['two_sum_sorted', 'binary_search', 'max_subarray', 'prefix_sums'].forEach((id) => {
      expect(r[id]).toBe('Needs numbers only');
    });
    expect(r.append).toBeNull();
  });

  test('an empty array blocks pop, get and max subarray', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([])));
    const r = reasons(result.current);
    expect(r.pop).toBe('Array is empty');
    expect(r.get).toBe('Array is empty');
    expect(r.max_subarray).toBe('Needs at least one value');
    expect(r.append).toBeNull();
  });

  test('64 elements blocks append and insert', () => {
    const full = Array.from({ length: 64 }, (_, i) => i);
    const { result } = renderHook(() => useArrayControls(sessionWith(full)));
    expect(reasons(result.current).append).toBe('Array is full');
    expect(reasons(result.current).insert).toBe('Array is full');
    const { result: almost } = renderHook(() => useArrayControls(sessionWith(full.slice(0, 63))));
    expect(reasons(almost.current).append).toBeNull();
  });

  test('a blocked run does nothing', () => {
    const s = sessionWith([]);
    const { result } = renderHook(() => useArrayControls(s));
    act(() => find(result.current, 'pop').run());
    act(() => find(result.current, 'max_subarray').run());
    expect(s.runCall).not.toHaveBeenCalled();
  });
});

describe('per-operation inputs', () => {
  test('each operation has its own inputs', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1])));
    const labels = (id) => find(result.current, id).inputs.map((i) => i.label);
    expect(labels('append')).toEqual(['Value']);
    expect(labels('insert')).toEqual(['Index', 'Value']);
    expect(labels('pop')).toEqual(['Index']);
    expect(labels('get')).toEqual(['Index']);
    expect(labels('two_sum_sorted')).toEqual(['Target']);
    expect(labels('binary_search')).toEqual(['Target']);
    expect(labels('max_subarray')).toEqual([]);
  });

  test('typing in one input leaves the others alone', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1])));
    act(() => find(result.current, 'append').inputs[0].setValue('7'));
    expect(find(result.current, 'append').inputs[0].value).toBe('7');
    expect(find(result.current, 'insert').inputs[1].value).toBe('');
    expect(find(result.current, 'two_sum_sorted').inputs[0].value).toBe('');
  });

  test('run builds the call from that operation inputs', () => {
    const s = sessionWith([1, 2]);
    const { result } = renderHook(() => useArrayControls(s));
    act(() => { const [i, v] = find(result.current, 'insert').inputs; i.setValue('1'); v.setValue('x'); });
    act(() => find(result.current, 'insert').run());
    expect(s.runCall).toHaveBeenLastCalledWith('insert(1, "x")');
    act(() => find(result.current, 'pop').run());
    expect(s.runCall).toHaveBeenLastCalledWith('pop()');
    act(() => find(result.current, 'pop').inputs[0].setValue('0'));
    act(() => find(result.current, 'pop').run());
    expect(s.runCall).toHaveBeenLastCalledWith('pop(0)');
    act(() => find(result.current, 'binary_search').inputs[0].setValue('2'));
    act(() => find(result.current, 'binary_search').run());
    expect(s.runCall).toHaveBeenLastCalledWith('binary_search(2)');
  });

  test('missing input sets a message and sends nothing', () => {
    const s = sessionWith([1]);
    const { result } = renderHook(() => useArrayControls(s));
    act(() => find(result.current, 'append').run());
    expect(result.current.message).toBe('Enter a value first.');
    act(() => find(result.current, 'get').run());
    expect(result.current.message).toBe('Enter a whole-number index first.');
    act(() => find(result.current, 'two_sum_sorted').run());
    expect(result.current.message).toBe('Enter a whole-number target first.');
    expect(s.runCall).not.toHaveBeenCalled();
  });
});

describe('history', () => {
  const frames = [{ call: 0 }, { call: 1 }, { call: 1 }, { call: 1 }];
  test('lists each call with its first frame', () => {
    const s = sessionWith([1], { calls: ['append(1)', 'max_subarray()'], frames });
    const { result } = renderHook(() => useArrayControls(s));
    expect(result.current.history).toEqual([
      { index: 0, call: 'append(1)', firstFrame: 0, active: false },
      { index: 1, call: 'max_subarray()', firstFrame: 1, active: false },
    ]);
  });

  test('goToCall moves to that call first frame', () => {
    const s = sessionWith([1], { calls: ['append(1)', 'max_subarray()'], frames });
    const { result } = renderHook(() => useArrayControls(s));
    act(() => result.current.goToCall(1));
    expect(s.goTo).toHaveBeenCalledWith(1);
    act(() => result.current.goToCall(5));
    expect(s.goTo).toHaveBeenCalledTimes(1);
  });
});

test('undo, canUndo, startOver and disabled come from the session', () => {
  const s = sessionWith([1], { calls: ['append(1)'] });
  const { result } = renderHook(() => useArrayControls(s));
  expect(result.current.canUndo).toBe(true);
  expect(result.current.disabled).toBe(false);
  result.current.undo();
  expect(s.undo).toHaveBeenCalled();
  act(() => result.current.startOver());
  expect(s.startOver).toHaveBeenCalled();
});

describe('what layouts need', () => {
  const frames = [{ call: 0 }, { call: 1 }, { call: 1 }];
  const calls = ['append(1)', 'max_subarray()'];

  test('activeCall and history[i].active follow the frame on screen', () => {
    const s = sessionWith([1], { calls, frames, frame: frames[2] });
    const { result } = renderHook(() => useArrayControls(s));
    expect(result.current.activeCall).toBe(1);
    expect(result.current.history.map((h) => h.active)).toEqual([false, true]);
    const none = renderHook(() => useArrayControls(sessionWith([])));
    expect(none.result.current.activeCall).toBeNull();
  });

  test('inputs say what kind of field they need', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1])));
    const kinds = (id) => find(result.current, id).inputs.map((i) => i.kind);
    expect(kinds('append')).toEqual(['value']);
    expect(kinds('insert')).toEqual(['number', 'value']);
    expect(kinds('pop')).toEqual(['optional-number']);
    expect(kinds('get')).toEqual(['number']);
    expect(kinds('two_sum_sorted')).toEqual(['number']);
    expect(kinds('binary_search')).toEqual(['number']);
  });

  test('each item has its own message, and controls.message keeps the last one', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1])));
    expect(find(result.current, 'append').message).toBe('');
    act(() => find(result.current, 'append').run());
    expect(find(result.current, 'append').message).toBe('Enter a value first.');
    expect(find(result.current, 'get').message).toBe('');
    expect(result.current.message).toBe('Enter a value first.');
    act(() => find(result.current, 'get').run());
    expect(find(result.current, 'append').message).toBe('');
    expect(find(result.current, 'get').message).toBe('Enter a whole-number index first.');
  });

  test('runUnchecked sends even when the item is blocked', () => {
    const s = sessionWith([]);
    const { result } = renderHook(() => useArrayControls(s));
    act(() => find(result.current, 'pop').runUnchecked());
    expect(s.runCall).toHaveBeenCalledWith('pop()');
  });
});
