import { render, screen, fireEvent, act, within } from '@testing-library/react';
import App from '../../../../App';
import { describeCall } from './index';

function reply(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

// A small stand-in for the backend: appends build the values, every call makes one frame.
function response(cmd) {
  const calls = cmd === 'array' ? [] : cmd.slice('array.'.length).split('.');
  const data = calls.filter((c) => c.startsWith('append(')).map((c) => Number(c.slice(7, -1)));
  const state = { data, size: data.length, capacity: Math.max(2, data.length), resizes: 0 };
  return {
    success: true, error: null, structure: 'array', command: cmd, calls,
    frames: calls.map((c, i) => ({ call: i, state, highlight: [], pointers: {}, aux: null, note: `note ${i + 1}` })),
    state, result: null,
  };
}

const sentCommands = () => global.fetch.mock.calls.map(([url]) => new URL(url, 'http://x.test').searchParams.get('cmd'));

beforeEach(() => {
  window.matchMedia = undefined;
  global.fetch = jest.fn((url) => reply(response(new URL(url, 'http://x.test').searchParams.get('cmd'))));
  Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
});
afterEach(() => window.history.replaceState(null, '', '/'));

async function open(command) {
  window.history.replaceState(null, '', `/?preset=3&c=${command}`);
  render(<App />);
  await screen.findByRole('heading', { name: 'Algorithms' });
}

test('every operation and algorithm is reachable by its own form', async () => {
  await open('array.append(1)');
  ['Append', 'Insert', 'Remove', 'Read'].forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  ['Run two sum', 'Run binary search', 'Run max subarray', 'Run prefix sums'].forEach((name) =>
    expect(screen.getByRole('button', { name })).toBeInTheDocument()
  );
  ['Append value', 'Insert value', 'Insert index', 'Pop index', 'Get index', 'Two sum target', 'Binary search target'].forEach((name) =>
    expect(screen.getByRole('textbox', { name })).toBeInTheDocument()
  );
  const two = screen.getByRole('form', { name: 'Two sum' });
  expect(within(two).getByText('What it needs')).toBeInTheDocument();
  expect(within(two).getByText('O(n).')).toBeInTheDocument();
});

test('an append sends the right call, by the verb or by Enter', async () => {
  await open('array.append(1)');
  fireEvent.change(screen.getByRole('textbox', { name: 'Append value' }), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Append' }));
  await screen.findByText('Appended 7 to the end');
  expect(sentCommands()).toContain('array.append(1).append(7)');

  fireEvent.change(screen.getByRole('textbox', { name: 'Append value' }), { target: { value: '9' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Append' }));
  await screen.findByText('Appended 9 to the end');
  expect(sentCommands()).toContain('array.append(1).append(7).append(9)');
});

test('insert keeps its value and index apart', async () => {
  await open('array.append(1)');
  fireEvent.change(screen.getByRole('textbox', { name: 'Insert value' }), { target: { value: '9' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Insert index' }), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
  await screen.findByText('Inserted 9 at index 2');
  expect(sentCommands()).toContain('array.append(1).insert(2, 9)');
});

test('a missing input shows its message beside that sentence and moves focus to the blank', async () => {
  await open('array.append(1)');
  fireEvent.click(screen.getByRole('button', { name: 'Read' }));
  const form = screen.getByRole('form', { name: 'Get' });
  expect(within(form).getByText('Enter a whole-number index first.')).toBeInTheDocument();
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Get index' }));
  expect(screen.queryByText('Enter a whole-number index first.', { selector: 'form:not([aria-label="Get"]) *' })).toBeNull();
});

test('a blocked reason is visible as text and stops the run', async () => {
  await open('array.append(3).append(1)');
  const two = screen.getByRole('form', { name: 'Two sum' });
  expect(within(two).getByText('Needs a sorted array')).toBeVisible();
  const run = within(two).getByRole('button', { name: 'Run two sum' });
  expect(run).toBeDisabled();
  const before = global.fetch.mock.calls.length;
  fireEvent.submit(two);
  expect(global.fetch.mock.calls.length).toBe(before);
});

test('the step controls work, and the slider is labelled', async () => {
  await open('array.append(1).append(2).append(3)');
  fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('note 2');
  fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('slider', { name: 'Step' }), { target: { value: '2' } });
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  const speed = screen.getByRole('group', { name: 'Speed' });
  fireEvent.click(within(speed).getByRole('button', { name: 'Fast' }));
  expect(within(speed).getByRole('button', { name: 'Fast' })).toHaveAttribute('aria-pressed', 'true');
});

test('a line of the story jumps to its step and says which one is showing', async () => {
  await open('array.append(1).append(2)');
  fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));
  fireEvent.click(screen.getByRole('button', { name: /^Appended 1 to the end/ }));
  expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Appended 1 to the end/ })).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('Showing now')).toBeInTheDocument();
});

test('undo, start over and the share area are all on the page', async () => {
  await open('array.append(1).append(2)');
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  await screen.findByText('Step 1 of 1');
  expect(sentCommands()).toContain('array.append(1)');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  });
  expect(navigator.clipboard.writeText).toHaveBeenCalled();
  expect(screen.getByText('Copied')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy embed code' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy question for Claude' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Command' }), { target: { value: 'array.append(4)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));
  await screen.findByText('Appended 4 to the end');

  fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
  await screen.findByText('No steps yet');
});

test('calls read as English, and unknown ones stay as written', () => {
  expect(describeCall('pop()')).toBe('Removed the last value');
  expect(describeCall('pop(2)')).toBe('Removed the value at index 2');
  expect(describeCall("insert(1, 'a, b')")).toBe("Inserted 'a, b' at index 1");
  expect(describeCall('two_sum_sorted(10)')).toBe('Looked for two numbers that add up to 10');
  expect(describeCall('reset()')).toBe('reset()');
});
