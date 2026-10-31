import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../../App';
import { PRESETS } from './index';

function reply(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

function response(cmd) {
  const calls = cmd === 'array' ? [] : cmd.slice('array.'.length).split('.');
  const data = calls.map((_, i) => i + 1);
  const state = { data, size: data.length, capacity: Math.max(2, data.length), resizes: 0 };
  return {
    success: true, error: null, structure: 'array', command: cmd, calls,
    frames: calls.map((c, i) => ({ call: i, state, highlight: [], pointers: {}, aux: null, note: `n${i}` })),
    state, result: null,
  };
}

beforeEach(() => {
  window.matchMedia = undefined;
  global.fetch = jest.fn((url) => reply(response(new URL(url, 'http://x.test').searchParams.get('cmd'))));
  Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
});
afterEach(() => window.history.replaceState(null, '', '/'));

const pressed = () => PRESETS.filter((p) => screen.getByRole('button', { name: `${p.id} ${p.name}` }).getAttribute('aria-pressed') === 'true').map((p) => p.id);

test('there are five presets with ids 1 to 5', () => {
  expect(PRESETS.map((p) => p.id)).toEqual(['1', '2', '3', '4', '5']);
});

test('the preset comes from the URL, and an invalid one means 1', async () => {
  window.history.replaceState(null, '', '/?c=array.append(1)&preset=3');
  const { unmount } = render(<App />);
  await screen.findByText(/Step 1 of 1/);
  expect(pressed()).toEqual(['3']);
  expect(screen.getByRole('heading', { name: 'Change or read the array' })).toBeInTheDocument();
  unmount();
  window.history.replaceState(null, '', '/?c=array.append(1)&preset=9');
  render(<App />);
  await screen.findByText(/Step 1 of 1/);
  expect(pressed()).toEqual(['1']);
});

test('pressing a layout updates the URL and keeps the history, without refetching', async () => {
  window.history.replaceState(null, '', '/?c=array.append(1).append(2)');
  render(<App />);
  await screen.findByText(/Step 1 of 2/);
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  const fetched = global.fetch.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: '2 Filmstrip' }));
  expect(new URLSearchParams(window.location.search).get('preset')).toBe('2');
  expect(new URLSearchParams(window.location.search).get('c')).toBe('array.append(1).append(2)');
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  expect(global.fetch.mock.calls.length).toBe(fetched);
  expect(pressed()).toEqual(['2']);
});

test('the preset survives an edit and stays out of the copied links', async () => {
  window.history.replaceState(null, '', '/?c=array.append(1).append(2)&preset=2');
  render(<App />);
  await screen.findByText(/Step 1 of 2/);
  fireEvent.change(screen.getByLabelText('Append value'), { target: { value: '5' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Append' })); });
  await screen.findByText(/of 3/);
  const params = new URLSearchParams(window.location.search);
  expect(params.get('preset')).toBe('2');
  expect(params.get('c')).toBe('array.append(1).append(2).append(5)');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy link' })); });
  expect(navigator.clipboard.writeText.mock.calls[0][0]).not.toContain('preset');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy embed code' })); });
  expect(navigator.clipboard.writeText.mock.calls[1][0]).not.toContain('preset');
});

test('no preset in the URL leaves the address free of one until a layout is pressed', async () => {
  window.history.replaceState(null, '', '/?c=array.append(1)');
  render(<App />);
  await screen.findByText(/Step 1 of 1/);
  expect(window.location.search).toBe('?c=array.append(1)');
});

test('the session exposes canPrev and canNext', async () => {
  // canPrev / canNext are session fields; check them through a layout-free hook render.
  const { renderHook } = require('@testing-library/react');
  const useExplorerSession = require('../../useExplorerSession').default;
  window.history.replaceState(null, '', '/');
  const { result } = renderHook(() => useExplorerSession({ initialCommand: 'array.append(1).append(2)', autoplay: false }));
  await act(async () => {});
  expect(result.current.canPrev).toBe(false);
  expect(result.current.canNext).toBe(true);
  act(() => result.current.next());
  expect(result.current.canPrev).toBe(true);
  expect(result.current.canNext).toBe(false);
});
