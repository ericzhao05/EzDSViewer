import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import App from '../../../../App';

const REPEAT = 'Already ran on this array. Change the array first.';
const REPEAT_TARGET = 'Already ran with this target. Change the target or the array first.';
const ALL = ['two sum', 'binary search', 'max subarray', 'prefix sums', 'bubble sort', 'selection sort', 'insertion sort', 'merge sort', 'quick sort', 'heap sort'];

function reply(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

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
const slot = () => document.getElementById('below-board-slot');

beforeEach(() => {
  window.matchMedia = undefined;
  global.fetch = jest.fn((url) => reply(response(new URL(url, 'http://x.test').searchParams.get('cmd'))));
});
afterEach(() => {
  window.history.replaceState(null, '', '/');
  jest.restoreAllMocks();
});

async function open(command, preset = '3') {
  window.history.replaceState(null, '', `/?preset=${preset}&c=${command}`);
  render(<App />);
  await screen.findByRole('heading', { name: 'Algorithms' });
}

const type = (text) => fireEvent.change(screen.getByRole('searchbox', { name: 'Search algorithms' }), { target: { value: text } });
const shownNames = () => [...document.querySelectorAll('.p3-note')].map((f) => f.getAttribute('aria-label'));

test('all ten notes are reachable and sit outside the framed board', async () => {
  await open('array.append(1)');
  ALL.forEach((name) => expect(screen.getByRole('button', { name: `Run ${name}` })).toBeInTheDocument());
  expect(screen.getByText('10 of 10 shown')).toBeInTheDocument();
  const frame = document.querySelector('.ds-container');
  const notes = document.querySelector('.p3-notes');
  expect(frame).not.toContainElement(notes);
  expect(slot()).toContainElement(notes);
  expect(frame.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(frame).not.toContainElement(screen.getByRole('heading', { name: 'Algorithms' }));
});

test('a note shows what it does, needs and costs, and only asks for a target when it takes one', async () => {
  await open('array.append(1)');
  const two = screen.getByRole('form', { name: 'Two sum' });
  expect(within(two).getByText('Find two numbers that add up to the target.')).toBeInTheDocument();
  expect(within(two).getByText('A sorted array of numbers, and a target.')).toBeInTheDocument();
  expect(within(two).getByText('O(n).')).toBeInTheDocument();
  expect(within(two).getByText(/looks at each value at most once/)).toBeInTheDocument();
  expect(within(two).getByRole('textbox', { name: 'Two sum target' })).toBeInTheDocument();
  expect(within(screen.getByRole('form', { name: 'Bubble sort' })).queryByRole('textbox')).toBeNull();
});

test('the same two sum again is blocked in words and sends nothing, until the target or the array changes', async () => {
  await open('array.append(1).append(2)');
  fireEvent.change(screen.getByRole('textbox', { name: 'Two sum target' }), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run two sum' }));
  await waitFor(() => expect(sentCommands()).toContain('array.append(1).append(2).two_sum_sorted(3)'));

  const two = screen.getByRole('form', { name: 'Two sum' });
  expect(await within(two).findByText(REPEAT_TARGET)).toBeVisible();
  const run = within(two).getByRole('button', { name: 'Run two sum' });
  expect(run).toBeDisabled();
  const before = global.fetch.mock.calls.length;
  fireEvent.submit(two);
  expect(global.fetch.mock.calls.length).toBe(before);
  // Only that algorithm is blocked.
  expect(screen.getByRole('button', { name: 'Run binary search' })).toBeEnabled();

  // A different target isn't a repeat, and neither is the same number written differently a repeat-dodge.
  fireEvent.change(screen.getByRole('textbox', { name: 'Two sum target' }), { target: { value: '4' } });
  expect(run).toBeEnabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Two sum target' }), { target: { value: ' 03 ' } });
  expect(run).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Two sum target' }), { target: { value: '4' } });
  fireEvent.click(run);
  await waitFor(() => expect(sentCommands()).toContain('array.append(1).append(2).two_sum_sorted(3).two_sum_sorted(4)'));
  await within(screen.getByRole('form', { name: 'Two sum' })).findByText(REPEAT_TARGET);

  fireEvent.change(screen.getByRole('textbox', { name: 'Two sum target' }), { target: { value: '3' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Append value' }), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Append' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Run two sum' })).toBeEnabled());
  expect(within(screen.getByRole('form', { name: 'Two sum' })).queryByText(REPEAT_TARGET)).toBeNull();
});

test('a missing target shows on the note and moves focus to its blank', async () => {
  await open('array.append(1)');
  fireEvent.click(screen.getByRole('button', { name: 'Run binary search' }));
  const form = screen.getByRole('form', { name: 'Binary search' });
  expect(within(form).getByText('Enter a whole-number target first.')).toBeVisible();
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Binary search target' }));
});

test('running a sort sends its call and scrolls back up to the timeline', async () => {
  await open('array.append(3).append(1)');
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: -800, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
  fireEvent.click(screen.getByRole('button', { name: 'Run bubble sort' }));
  await waitFor(() => expect(sentCommands()).toContain('array.append(3).append(1).bubble_sort()'));
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  expect(scroll.mock.instances[0]).toBe(document.querySelector('.p3-player'));
  delete Element.prototype.scrollIntoView;
});

test('search filters, counts and leaves the address and storage alone', async () => {
  await open('array.append(1)');
  const url = window.location.href;
  const stored = JSON.stringify({ ...window.localStorage });

  type('binary');
  expect(shownNames()).toEqual(['Binary search']);
  expect(screen.getByText('1 of 10 shown')).toHaveAttribute('aria-live', 'polite');

  type('sort');
  const sorted = shownNames();
  ['Bubble sort', 'Selection sort', 'Insertion sort', 'Merge sort', 'Quick sort', 'Heap sort'].forEach((n) => expect(sorted).toContain(n));
  expect(sorted.slice(0, 6).every((n) => n.endsWith('sort'))).toBe(true);

  type('log n');
  expect(shownNames()).toEqual(expect.arrayContaining(['Binary search', 'Merge sort']));
  expect(shownNames()).not.toContain('Bubble sort');

  expect(window.location.href).toBe(url);
  expect(JSON.stringify({ ...window.localStorage })).toBe(stored);
});

test('a search with no matches says so, and Clear brings every note back', async () => {
  await open('array.append(1)');
  type('zzz');
  expect(shownNames()).toEqual([]);
  expect(screen.getByText('0 of 10 shown')).toBeInTheDocument();
  expect(screen.getByText(/No algorithm matches that/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(shownNames()).toHaveLength(10);
  expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search algorithms' }));
});

test('a target typed before a search survives the note being filtered out', async () => {
  await open('array.append(1)');
  fireEvent.change(screen.getByRole('textbox', { name: 'Two sum target' }), { target: { value: '8' } });
  type('merge');
  expect(screen.queryByRole('textbox', { name: 'Two sum target' })).toBeNull();
  type('');
  expect(screen.getByRole('textbox', { name: 'Two sum target' })).toHaveValue('8');
});

test('typing in the search box does not trigger the page shortcuts', async () => {
  await open('array.append(1).append(2).append(3)');
  fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  const box = screen.getByRole('searchbox', { name: 'Search algorithms' });
  ['ArrowRight', 'End', ' '].forEach((key) => fireEvent.keyDown(box, { key }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
});

test('the notes hide while a coming-soon structure is on screen, and come back', async () => {
  await open('array.append(1)');
  const soon = document.querySelector('.ds-sidebar-soon').closest('button');
  fireEvent.click(soon);
  await screen.findByText(/coming soon/);
  // The explorer stays mounted but none of it, notes included, can be seen or reached.
  expect(document.querySelector('.p3-notes')).toBeInTheDocument();
  expect(document.querySelector('.p3-notes')).not.toBeVisible();
  expect(screen.queryByRole('searchbox', { name: 'Search algorithms' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Run two sum' })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Open Array' }));
  expect(screen.getByRole('searchbox', { name: 'Search algorithms' })).toBeVisible();
});

test('a second sort starts again from the array that was made, not the sorted one', async () => {
  await open('array.append(3).append(1)');
  await screen.findByText(/of 2/);
  const sent = () => global.fetch.mock.calls.map(([url]) => new URL(url, 'http://x.test').searchParams.get('cmd'));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Run bubble sort' })); });
  expect(sent()).toContain('array.append(3).append(1).bubble_sort()');
  await screen.findByText(/of 3/);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Run merge sort' })); });
  expect(sent()).toContain('array.append(3).append(1).merge_sort()');
});

describe('turning a note over', () => {
  const code = (name) => screen.getByRole('button', { name: `Show ${name} code` });

  test('every note has a Code button in its own form that does not submit it', async () => {
    await open('array.append(2).append(1)');
    const before = global.fetch.mock.calls.length;
    ['Two sum', 'Binary search', 'Max subarray', 'Prefix sums', 'Bubble sort', 'Selection sort', 'Insertion sort', 'Merge sort', 'Quick sort', 'Heap sort'].forEach((name) => {
      expect(within(screen.getByRole('form', { name })).getByRole('button', { name: `Show ${name} code` })).toHaveTextContent('Code');
    });
    fireEvent.click(code('Bubble sort'));
    expect(global.fetch.mock.calls.length).toBe(before);
  });

  test('Code shows the algorithm, and Notes flips back, with focus following', async () => {
    await open('array.append(2).append(1)');
    fireEvent.click(code('Quick sort'));
    const back = screen.getByRole('group', { name: 'Quick sort code' });
    expect(back).toHaveTextContent('def quick_sort(a, lo=0, hi=None):');
    expect(document.querySelector('[data-note="quick_sort"]')).toHaveAttribute('data-flipped', 'true');
    const notes = within(back).getByRole('button', { name: 'Show Quick sort notes' });
    expect(notes).toHaveTextContent('Notes');
    expect(notes).toHaveFocus();
    expect(screen.getByRole('form', { name: 'Quick sort', hidden: true })).toHaveAttribute('inert');
    fireEvent.click(notes);
    expect(document.querySelector('[data-note="quick_sort"]')).toHaveAttribute('data-flipped', 'false');
    expect(code('Quick sort')).toHaveFocus();
    expect(back).toHaveAttribute('inert');
  });

  test('one note turning leaves the others alone, and every algorithm has code', async () => {
    const CODE = require('./algorithmCode.json');
    await open('array.append(2).append(1)');
    fireEvent.click(code('Heap sort'));
    expect(document.querySelector('[data-note="merge_sort"]')).toHaveAttribute('data-flipped', 'false');
    // Both sides are always there, so they can share one size.
    expect(document.querySelectorAll('.p3-note-back')).toHaveLength(10);
    expect(Object.keys(CODE).sort()).toEqual([...document.querySelectorAll('[data-note]')].map((n) => n.dataset.note).sort());
  });

  test('a typed target survives turning the note over and back', async () => {
    await open('array.append(1).append(2)');
    fireEvent.change(screen.getByRole('textbox', { name: 'Two sum target' }), { target: { value: '3' } });
    fireEvent.click(code('Two sum'));
    fireEvent.click(screen.getByRole('button', { name: 'Show Two sum notes' }));
    expect(screen.getByRole('textbox', { name: 'Two sum target' })).toHaveValue('3');
  });
});

test('an algorithm with nothing to fill in still blocks a plain repeat', async () => {
  await open('array.append(1).append(2)');
  fireEvent.click(screen.getByRole('button', { name: 'Run max subarray' }));
  const form = screen.getByRole('form', { name: 'Max subarray' });
  expect(await within(form).findByText(REPEAT)).toBeVisible();
  expect(within(form).getByRole('button', { name: 'Run max subarray' })).toBeDisabled();
});
