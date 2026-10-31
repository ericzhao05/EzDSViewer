import { render, screen, fireEvent, within, act } from '@testing-library/react';
import App from '../../../../App';

function reply(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

// A small stand-in for the backend: appended values go in the array, and any other call adds two steps.
function response(cmd) {
  const calls = cmd === 'array' ? [] : cmd.slice('array.'.length).split('.');
  const data = [];
  const frames = [];
  calls.forEach((c, i) => {
    const appended = /^append\((.*)\)$/.exec(c);
    if (appended) data.push(Number(appended[1]));
    const state = { data: [...data], size: data.length, capacity: Math.max(2, data.length), resizes: 0 };
    const notes = appended ? [`Appended ${appended[1]}`] : [`${c} first`, `${c} second`];
    notes.forEach((note) => frames.push({ call: i, state, highlight: [], pointers: {}, aux: null, note }));
  });
  const state = { data, size: data.length, capacity: Math.max(2, data.length), resizes: 0 };
  return { success: true, error: null, structure: 'array', command: cmd, calls, frames, state, result: null };
}

const sentCommands = () => global.fetch.mock.calls.map(([url]) => new URL(url, 'http://x.test').searchParams.get('cmd'));

async function open(command) {
  window.history.replaceState(null, '', `/?c=${command}&preset=5`);
  render(<App />);
  await screen.findByText(/Step \d+ of \d+|No steps yet/);
  const pause = screen.queryByRole('button', { name: 'Pause' });
  if (pause) fireEvent.click(pause);
}

beforeEach(() => {
  window.matchMedia = undefined;
  global.fetch = jest.fn((url) => reply(response(new URL(url, 'http://x.test').searchParams.get('cmd'))));
  Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
});
afterEach(() => window.history.replaceState(null, '', '/'));

test('the three numbered sections are there, with every operation and algorithm', async () => {
  await open('array.append(1).append(2)');
  ['1. Build your array', '2. Watch it', '3. Try an algorithm'].forEach((name) => {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
  });
  const build = screen.getByRole('region', { name: '1. Build your array' });
  ['Append', 'Insert', 'Pop', 'Get'].forEach((name) => {
    expect(within(build).getByRole('button', { name })).toBeInTheDocument();
  });
  const algorithms = within(screen.getByRole('region', { name: '3. Try an algorithm' }));
  ['two sum', 'binary search', 'max subarray', 'prefix sums'].forEach((name) => {
    expect(algorithms.getByRole('button', { name: `Run ${name}` })).toBeInTheDocument();
  });
  expect(algorithms.getAllByText('Before it can run, it needs:')).toHaveLength(4);
});

test('each input names the action it belongs to, and Append sends its own value', async () => {
  await open('array.append(1)');
  fireEvent.change(screen.getByLabelText('Value for Append'), { target: { value: '9' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Append' }));
  });
  await screen.findByText('Step 2 of 2');
  expect(sentCommands()).toContain('array.append(1).append(9)');
  ['Index for Insert', 'Value for Insert', 'Index, optional for Pop', 'Index for Get', 'Target for Two sum', 'Target for Binary search'].forEach((label) => {
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });
});

test('an item shows its own missing-input message and sends nothing', async () => {
  await open('array.append(1)');
  const sent = global.fetch.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Run two sum' }));
  expect(screen.getByText('Enter a whole-number target first.')).toBeInTheDocument();
  expect(global.fetch.mock.calls.length).toBe(sent);
});

test('a blocked reason shows as text, marks the need and disables the run', async () => {
  await open('array.append(3).append(1)');
  fireEvent.change(screen.getByLabelText('Step'), { target: { value: '1' } });
  const [twoSum] = screen.getAllByText('Needs a sorted array');
  const form = twoSum.closest('form');
  expect(screen.getAllByText('Needs a sorted array')).toHaveLength(2);
  expect(within(form).getByRole('button', { name: 'Run two sum' })).toBeDisabled();
  expect(within(form).getByText(/Not met/).closest('li')).toHaveTextContent('Values in order, smallest first');
  expect(screen.getByRole('button', { name: 'Run max subarray' })).toBeEnabled();
});

test('the log has one line per step, marks the current one, and a line jumps to its step', async () => {
  await open('array.append(1).append(3).append(5)');
  const log = screen.getByRole('complementary', { name: 'What happened' });
  const lines = within(log).getAllByRole('button');
  expect(lines).toHaveLength(3);
  expect(lines[0]).toHaveAttribute('aria-current', 'step');
  fireEvent.click(within(log).getByRole('button', { name: /Appended 5/ }));
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Appended 5');
  expect(lines[2]).toHaveAttribute('aria-current', 'step');
  expect(lines[0]).not.toHaveAttribute('aria-current');
});

test('the log is one tab stop, and the arrow keys move along it', async () => {
  await open('array.append(1).append(3).append(5)');
  const lines = within(screen.getByRole('complementary', { name: 'What happened' })).getAllByRole('button');
  expect(lines.map((l) => l.tabIndex)).toEqual([0, -1, -1]);
  lines[0].focus();
  fireEvent.keyDown(lines[0], { key: 'ArrowDown' });
  expect(document.activeElement).toBe(lines[1]);
  fireEvent.keyDown(lines[1], { key: 'End' });
  expect(document.activeElement).toBe(lines[2]);
});

test('an algorithm gets a heading in the log, with one line for each of its steps', async () => {
  await open('array.append(1).two_sum_sorted(10)');
  const log = within(screen.getByRole('complementary', { name: 'What happened' }));
  expect(log.getByText('Two sum, target 10')).toBeInTheDocument();
  expect(log.getAllByRole('button')).toHaveLength(3);
});

test('the step controls work', async () => {
  await open('array.append(1).append(2).append(3)');
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Step'), { target: { value: '2' } });
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Slow' }));
  expect(screen.getByRole('button', { name: 'Slow' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
});

test('Undo, Start over and the Share area are there and work', async () => {
  await open('array.append(1).append(2)');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  });
  expect(navigator.clipboard.writeText).toHaveBeenCalled();
  expect(screen.getByText('Copied')).toBeInTheDocument();
  ['Copy embed code', 'Copy question for Claude', 'Run', 'Start over'].forEach((name) => {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
  expect(screen.getByLabelText('Command')).toHaveValue('array.append(1).append(2)');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  });
  expect(await screen.findByText(/of 1$/)).toBeInTheDocument();
});

test('an empty array says where to begin', async () => {
  window.history.replaceState(null, '', '/?c=array&preset=5');
  render(<App />);
  await screen.findByText('No steps yet');
  expect(screen.getByText(/Your notes start here/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Pop' })).toBeDisabled();
  expect(screen.getAllByText('Array is empty')).toHaveLength(2);
});
