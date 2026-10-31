import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import App from '../../../../App';

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
  await waitFor(() => expect(sentCommands()).toContain('array.append(1).append(7)'));

  fireEvent.change(screen.getByRole('textbox', { name: 'Append value' }), { target: { value: '9' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Append' }));
  await waitFor(() => expect(sentCommands()).toContain('array.append(1).append(7).append(9)'));
});

test('insert keeps its value and index apart', async () => {
  await open('array.append(1)');
  fireEvent.change(screen.getByRole('textbox', { name: 'Insert value' }), { target: { value: '9' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Insert index' }), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
  await waitFor(() => expect(sentCommands()).toContain('array.append(1).insert(2, 9)'));
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

test('the step controls are icon buttons with names and tooltips, and speed shares their row', async () => {
  await open('array.append(1).append(2)');
  await screen.findByRole('button', { name: 'Pause' });
  ['Previous step', 'Next step', 'Restart', 'Pause'].forEach((name) => {
    const b = screen.getByRole('button', { name });
    expect(b).toHaveAttribute('title', name);
    expect(b.textContent).toBe('');
    expect(b.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
  const pauseIcon = screen.getByRole('button', { name: 'Pause' }).innerHTML;
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  const play = screen.getByRole('button', { name: 'Play' });
  expect(play).toHaveAttribute('title', 'Play');
  expect(play.innerHTML).not.toBe(pauseIcon);
  const speed = screen.getByRole('group', { name: 'Speed' });
  expect(speed.parentElement).toBe(play.parentElement.parentElement);
  expect(within(speed).getAllByRole('button')).toHaveLength(3);
});

test('the history section is gone but the history still drives undo', async () => {
  await open('array.append(1).append(2)');
  expect(screen.queryByRole('heading', { name: 'What you have done so far' })).toBeNull();
  expect(document.querySelector('.p3-story')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  await screen.findByText('Step 1 of 1');
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
  await waitFor(() => expect(sentCommands()).toContain('array.append(4)'));

  fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
  await screen.findByText('No steps yet');
});

test('no layout number is printed on the page', async () => {
  await open('array.append(1)');
  expect(screen.queryByText(/^Layout \d$/)).toBeNull();
});

test('a send that was refused leaves no stale echo for a later Command-box run', async () => {
  await open('array.append(1)');
  fireEvent.click(screen.getByRole('button', { name: 'Read' }));
  expect(screen.getByText('Enter a whole-number index first.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Command'), { target: { value: 'array.append(1).append(2)' } });
  await act(async () => {
    fireEvent.submit(screen.getByLabelText('Command').closest('form'));
  });
  await screen.findByText(/of 2/);
  expect(document.querySelector('.p3-echo')).toBeNull();
});

test('the timeline, then the note, sit above the array, and only the array is the frozen block', async () => {
  await open('array.append(1)');
  expect(screen.queryByText(/Access O\(1\)/)).toBeNull();
  const buttons = screen.getByRole('button', { name: 'Previous step' });
  const slider = screen.getByRole('slider', { name: 'Step' });
  const note = screen.getByRole('status');
  const stats = document.querySelector('.array-stats');
  const before = (a, b) => expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  before(buttons, slider);
  before(slider, note);
  before(note, stats);
  const stage = document.querySelector('.p3-stage');
  expect(stage).toContainElement(stats);
  expect(stage).not.toContainElement(slider);
  expect(stage).not.toContainElement(note);
});

test('the section is called Make array, and the dice starts over with a random array', async () => {
  await open('array.append(1).append(2)');
  expect(screen.getByRole('heading', { name: 'Make array' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Append value'), { target: { value: '5' } });
  const before = global.fetch.mock.calls.length;
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Make a random array' })); });
  const calls = global.fetch.mock.calls.slice(before);
  expect(calls).toHaveLength(1);
  const cmd = new URL(calls[0][0], 'http://x.test').searchParams.get('cmd');
  expect(cmd).toMatch(/^array(\.append\(\d+\)){6,10}$/);
  expect(new URLSearchParams(window.location.search).get('c')).toBe(cmd);
  expect(screen.getByLabelText('Append value')).toHaveValue('');
  const size = cmd.split('.').length - 1;
  expect(screen.getByText(`Step ${size} of ${size}`)).toBeInTheDocument();
});

test('only this layout is active, so no switcher shows', async () => {
  const { PRESETS } = require('../index');
  expect(PRESETS.map((p) => p.id)).toEqual(['3']);
  await open('array.append(1)');
  expect(screen.queryByRole('group', { name: 'Layout' })).toBeNull();
});
