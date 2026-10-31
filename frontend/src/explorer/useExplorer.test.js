import { renderHook, act, waitFor } from '@testing-library/react';
import useExplorer from './useExplorer';
import { buildCall, encodeCommand } from './commandLang';

function reply(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

function frame(call, n) {
  return { call, state: { n }, highlight: [], pointers: {}, aux: null, note: `f${n}` };
}

// Builds a response the way the backend does.
function success(calls, frames, state = { n: 'final' }, result = null) {
  return {
    success: true, error: null, structure: 'array',
    command: ['array', ...calls].join('.'), calls, frames, state, result,
  };
}

function failure(command, calls, frames, extra = {}) {
  return {
    success: false, error: 'boom', code: 'bad_argument', position: 3, available: null,
    structure: 'array', command, calls, frames, state: { n: 'failstate' }, result: null, ...extra,
  };
}

function requestedCommand(index = -1) {
  const calls = global.fetch.mock.calls;
  const url = calls[index < 0 ? calls.length + index : index][0];
  return new URL(url, 'http://x.test').searchParams.get('cmd');
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test('load success sets step 0 and exposes the response', async () => {
  const frames = [frame(0, 1), frame(0, 2), frame(1, 3)];
  global.fetch.mockReturnValue(reply(success(['append(1)', 'append(2)'], frames, { n: 'end' }, 7)));
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.load('array.append(1).append(2)'); });
  const h = result.current;
  expect(h.step).toBe(0);
  expect(h.frame).toBe(frames[0]);
  expect(h.state).toEqual({ n: 1 });
  expect(h.structure).toBe('array');
  expect(h.calls).toEqual(['append(1)', 'append(2)']);
  expect(h.command).toBe('array.append(1).append(2)');
  expect(h.result).toBe(7);
  expect(h.error).toBeNull();
  expect(h.loading).toBe(false);
  expect(requestedCommand()).toBe('array.append(1).append(2)');
});

test('state falls back to the response state when there are no frames', async () => {
  global.fetch.mockReturnValue(reply(success([], [], { n: 'empty' })));
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.load('array'); });
  expect(result.current.frame).toBeNull();
  expect(result.current.state).toEqual({ n: 'empty' });
});

test('initialCommand is loaded on mount', async () => {
  global.fetch.mockReturnValue(reply(success([], [], { n: 'e' })));
  const { result } = renderHook(() => useExplorer('array'));
  await waitFor(() => expect(result.current.structure).toBe('array'));
  expect(requestedCommand()).toBe('array');
});

test('failed load keeps frames, goes to last frame, sets error, keeps typed command', async () => {
  const frames = [frame(0, 1), frame(1, 2)];
  global.fetch.mockReturnValue(
    reply(failure('array.append(1).append(2).bogus()', ['append(1)', 'append(2)'], frames, { available: ['append'] }), false)
  );
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.load('array.append(1).append(2).bogus()'); });
  const h = result.current;
  expect(h.command).toBe('array.append(1).append(2).bogus()');
  expect(h.frames).toBe(frames);
  expect(h.step).toBe(1);
  expect(h.error).toEqual({ message: 'boom', code: 'bad_argument', position: 3, available: ['append'] });
});

test('network failure rejects from runCommand and surfaces as an error', async () => {
  global.fetch.mockReturnValue(Promise.reject(new Error('offline')));
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.load('array'); });
  expect(result.current.error.message).toBe('offline');
  expect(result.current.loading).toBe(false);
});

test('a successful request clears the error', async () => {
  global.fetch.mockReturnValueOnce(reply(failure('array.x()', [], []), false));
  global.fetch.mockReturnValueOnce(reply(success([], [], { n: 'e' })));
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.load('array.x()'); });
  expect(result.current.error).not.toBeNull();
  await act(async () => { await result.current.load('array'); });
  expect(result.current.error).toBeNull();
});

async function loaded(calls, frames) {
  global.fetch.mockReturnValueOnce(reply(success(calls, frames)));
  const hook = renderHook(() => useExplorer());
  await act(async () => { await hook.result.current.load(['array', ...calls].join('.')); });
  return hook;
}

test('applyCall runs structure + calls + new call and steps to its first frame', async () => {
  const { result } = await loaded(['append(1)'], [frame(0, 1)]);
  const frames = [frame(0, 1), frame(1, 2), frame(1, 3)];
  global.fetch.mockReturnValueOnce(reply(success(['append(1)', 'append(2)'], frames)));
  await act(async () => { await result.current.applyCall('append(2)'); });
  expect(requestedCommand()).toBe('array.append(1).append(2)');
  expect(result.current.step).toBe(1);
  expect(result.current.calls).toEqual(['append(1)', 'append(2)']);
});

test('applyCall steps to the last frame when the call made none', async () => {
  const { result } = await loaded(['append(1)'], [frame(0, 1)]);
  global.fetch.mockReturnValueOnce(reply(success(['append(1)', 'noop()'], [frame(0, 1)])));
  await act(async () => { await result.current.applyCall('noop()'); });
  expect(result.current.step).toBe(0);
  expect(result.current.frames).toHaveLength(1);
});

test('applyCall failure keeps previous command, frames and step and sets error', async () => {
  const frames = [frame(0, 1), frame(0, 2)];
  const { result } = await loaded(['append(1)'], frames);
  act(() => result.current.goTo(1));
  global.fetch.mockReturnValueOnce(reply(failure('array.append(1).bad(', ['append(1)'], [frame(0, 9)]), false));
  await act(async () => { await result.current.applyCall('bad('); });
  expect(result.current.command).toBe('array.append(1)');
  expect(result.current.frames).toBe(frames);
  expect(result.current.step).toBe(1);
  expect(result.current.error.message).toBe('boom');
});

test('applyCall does nothing when structure is null', async () => {
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.applyCall('append(1)'); });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('after a load fails on its third call, applyCall uses the first two calls', async () => {
  global.fetch.mockReturnValueOnce(
    reply(failure('array.append(1).append(2).append(x)', ['append(1)', 'append(2)'], [frame(0, 1), frame(1, 2)]), false)
  );
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.load('array.append(1).append(2).append(x)'); });
  global.fetch.mockReturnValueOnce(reply(success(['append(1)', 'append(2)', 'append(9)'], [frame(2, 5)])));
  await act(async () => { await result.current.applyCall('append(9)'); });
  expect(requestedCommand()).toBe('array.append(1).append(2).append(9)');
  expect(result.current.error).toBeNull();
});

test('undo drops the last call and steps to the last frame', async () => {
  const { result } = await loaded(['append(1)', 'append(2)'], [frame(0, 1), frame(1, 2)]);
  const frames = [frame(0, 1), frame(0, 4)];
  global.fetch.mockReturnValueOnce(reply(success(['append(1)'], frames)));
  await act(async () => { await result.current.undo(); });
  expect(requestedCommand()).toBe('array.append(1)');
  expect(result.current.step).toBe(1);
  expect(result.current.calls).toEqual(['append(1)']);
});

test('undo does nothing when there are no calls', async () => {
  const { result } = await loaded([], []);
  global.fetch.mockClear();
  await act(async () => { await result.current.undo(); });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('next, prev and goTo clamp and never fetch', async () => {
  const { result } = await loaded(['append(1)'], [frame(0, 1), frame(0, 2), frame(0, 3)]);
  global.fetch.mockClear();
  act(() => result.current.prev());
  expect(result.current.step).toBe(0);
  act(() => result.current.next());
  act(() => result.current.next());
  act(() => result.current.next());
  expect(result.current.step).toBe(2);
  act(() => result.current.goTo(-5));
  expect(result.current.step).toBe(0);
  act(() => result.current.goTo(99));
  expect(result.current.step).toBe(2);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('out-of-order responses: the most recent request wins', async () => {
  let resolveA;
  let resolveB;
  global.fetch
    .mockReturnValueOnce(new Promise((r) => { resolveA = r; }))
    .mockReturnValueOnce(new Promise((r) => { resolveB = r; }));
  const { result } = renderHook(() => useExplorer());
  let pa;
  let pb;
  act(() => { pa = result.current.load('array.a()'); });
  act(() => { pb = result.current.load('array.b()'); });
  const res = (cmd) => ({ ok: true, status: 200, json: () => Promise.resolve(success([cmd], [frame(0, 1)])) });
  await act(async () => { resolveB(res('b()')); await pb; });
  expect(result.current.calls).toEqual(['b()']);
  expect(result.current.loading).toBe(false);
  await act(async () => { resolveA(res('a()')); await pa; });
  expect(result.current.calls).toEqual(['b()']);
  expect(result.current.command).toBe('array.b()');
});

test('a 500 JSON body without frames sets an error and keeps existing state', async () => {
  const { result } = await loaded(['append(1)'], [frame(0, 1)]);
  global.fetch.mockReturnValueOnce(reply({ error: 'Internal Server Error' }, false));
  await act(async () => { await result.current.load('array.append(2)'); });
  expect(result.current.error).toEqual({ message: 'Internal Server Error' });
  expect(result.current.frames).toHaveLength(1);
  expect(result.current.calls).toEqual(['append(1)']);
  expect(result.current.loading).toBe(false);
  global.fetch.mockReturnValueOnce(reply({}, false));
  await act(async () => { await result.current.applyCall('append(3)'); });
  expect(result.current.error).toEqual({ message: 'Unexpected response' });
});

test('a non-JSON body shows a friendly message, not the SyntaxError text', async () => {
  global.fetch.mockReturnValue(
    Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('Unexpected token <')) })
  );
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.load('array'); });
  expect(result.current.error.message).toBe('Unexpected response from the server (502)');
  expect(result.current.loading).toBe(false);
});

test('values with %, +, space, quotes, backslash and ) survive buildCall, encoding and the fetch URL', async () => {
  const call = buildCall('append', ['50% a+b "q" \\ )']);
  const text = `array.${call}`;
  global.fetch.mockReturnValue(reply(success([call], [frame(0, 1)])));
  const { result } = renderHook(() => useExplorer());
  await act(async () => { await result.current.load(text); });
  expect(global.fetch.mock.calls[0][0]).toContain(`cmd=${encodeCommand(text)}`);
  expect(requestedCommand()).toBe(text);
});
