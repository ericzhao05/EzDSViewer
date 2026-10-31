import { render, screen, fireEvent, act, within } from '@testing-library/react';
import Explorer from '../../../Explorer';

// Follows real calls just far enough: each append adds its value and a frame.
function response(cmd) {
  const calls = cmd === 'array' ? [] : cmd.slice('array.'.length).split(/\.(?=[a-z_]+\()/);
  const data = [];
  calls.forEach((c) => {
    const m = /^append\((.*)\)$/.exec(c);
    if (m) data.push(JSON.parse(m[1]));
  });
  const state = { data, size: data.length, capacity: Math.max(4, data.length), resizes: 0 };
  return {
    success: true,
    error: null,
    structure: 'array',
    command: cmd,
    calls,
    frames: calls.map((c, i) => ({ call: i, state, highlight: [], pointers: {}, aux: null, note: `note ${i}` })),
    state,
    result: null,
  };
}

const sentCommands = () => global.fetch.mock.calls.map(([url]) => new URL(url, 'http://x.test').searchParams.get('cmd'));

beforeEach(() => {
  window.matchMedia = undefined;
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response(new URL(url, 'http://x.test').searchParams.get('cmd'))),
    })
  );
  Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
});
afterEach(() => window.history.replaceState(null, '', '/'));

async function open(cmd) {
  render(<Explorer preset="1" initialCommand={cmd} autoplay={false} />);
  await screen.findByRole('tablist', { name: 'What do you want to do?' });
}

const pane = (name) => screen.getByRole('tabpanel', { name });
const showTab = (name) => fireEvent.click(screen.getByRole('tab', { name }));

test('only one kind of action shows at a time, and every one is reachable', async () => {
  await open('array.append(1)');
  const change = pane('Change the array');
  ['Append', 'Insert', 'Pop', 'Get'].forEach((name) => {
    expect(within(change).getByRole('button', { name })).toBeInTheDocument();
  });
  expect(screen.queryByRole('button', { name: 'Run Two sum' })).not.toBeInTheDocument();

  showTab('Run an algorithm');
  const run = pane('Run an algorithm');
  ['Run Two sum', 'Run Binary search', 'Run Max subarray', 'Run Prefix sums'].forEach((name) => {
    expect(within(run).getByRole('button', { name })).toBeInTheDocument();
  });
  expect(screen.queryByRole('button', { name: 'Append' })).not.toBeInTheDocument();
});

test('the arrow keys move between tabs', async () => {
  await open('array.append(1)');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Change the array' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Run an algorithm' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Run an algorithm' })).toHaveFocus();
});

test('a link ending in an algorithm opens on the algorithm tab', async () => {
  await open('array.append(1).append(3).two_sum_sorted(4)');
  expect(screen.getByRole('tab', { name: 'Run an algorithm' })).toHaveAttribute('aria-selected', 'true');
});

test('each action has its own inputs, and Append sends the right call', async () => {
  await open('array.append(1)');
  const form = screen.getByRole('form', { name: 'Append' });
  fireEvent.change(within(form).getByLabelText('Value'), { target: { value: '5' } });
  await act(async () => {
    fireEvent.click(within(form).getByRole('button', { name: 'Append' }));
  });
  await screen.findByText('Step 2 of 2');
  expect(sentCommands().pop()).toBe('array.append(1).append(5)');
  expect(within(screen.getByRole('form', { name: 'Insert' })).getByLabelText('Index')).toHaveValue('');
});

test('a missing input shows its message beside that action and sends nothing', async () => {
  await open('array.append(1)');
  const sent = global.fetch.mock.calls.length;
  const form = screen.getByRole('form', { name: 'Append' });
  fireEvent.click(within(form).getByRole('button', { name: 'Append' }));
  expect(within(form).getByText('Enter a value first.')).toBeInTheDocument();
  expect(global.fetch.mock.calls.length).toBe(sent);
});

test('a blocked reason is visible as text, and the action sends nothing', async () => {
  await open('array.append(3).append(1)');
  showTab('Run an algorithm');
  const form = screen.getByRole('form', { name: 'Two sum' });
  expect(within(form).getByText('Needs a sorted array')).toBeVisible();
  const button = within(form).getByRole('button', { name: 'Run Two sum' });
  expect(button).toHaveAttribute('aria-disabled', 'true');
  fireEvent.change(within(form).getByLabelText('Target'), { target: { value: '4' } });
  const sent = global.fetch.mock.calls.length;
  fireEvent.click(button);
  fireEvent.submit(form);
  expect(global.fetch.mock.calls.length).toBe(sent);
});

test('the step controls move through the steps', async () => {
  await open('array.append(1).append(2).append(3)');
  const status = screen.getByRole('status');
  expect(status).toHaveTextContent('note 0');
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  expect(status).toHaveTextContent('note 1');
  fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Step'), { target: { value: '2' } });
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Slow' }));
  expect(screen.getByRole('button', { name: 'Slow' })).toHaveAttribute('aria-pressed', 'true');
});

test('the list of actions jumps to any of them', async () => {
  await open('array.append(1).append(2).append(3)');
  fireEvent.click(screen.getByRole('button', { name: 'Append 3' }));
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Append 3' })).toHaveAttribute('aria-current', 'step');
});

test('Undo, Start over and everything in Share are there', async () => {
  await open('array.append(1).append(2)');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  });
  expect(sentCommands().pop()).toBe('array.append(1)');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  });
  expect(screen.getByText('Copied')).toBeInTheDocument();
  ['Copy embed code', 'Copy question for Claude', 'Run', 'Start over'].forEach((name) => {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
  expect(screen.getByLabelText('Command')).toBeInTheDocument();
});
