import { render, screen, fireEvent, act, within } from '@testing-library/react';
import App from '../../../../App';

function reply(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

// A small stand-in for the backend: appends change the array, two_sum_sorted makes three frames.
function response(cmd) {
  const calls = cmd === 'array' ? [] : cmd.slice('array.'.length).match(/[a-z_]+\([^)]*\)/g);
  const data = [];
  const frames = [];
  const snapshot = () => ({ data: [...data], size: data.length, capacity: Math.max(2, data.length), resizes: 0 });
  calls.forEach((call, i) => {
    const appended = call.match(/^append\((-?\d+)\)$/);
    if (appended) data.push(Number(appended[1]));
    const count = call.startsWith('two_sum_sorted') ? 3 : 1;
    for (let n = 0; n < count; n += 1) {
      frames.push({ call: i, state: snapshot(), highlight: [], pointers: {}, aux: null, note: `note ${i}.${n}` });
    }
  });
  return { success: true, error: null, structure: 'array', command: cmd, calls, frames, state: snapshot(), result: null };
}

const lastCommand = () => {
  const urls = global.fetch.mock.calls.map(([url]) => new URL(url, 'http://x.test').searchParams.get('cmd'));
  return urls[urls.length - 1];
};

async function open(command) {
  window.history.replaceState(null, '', `/?c=${command}&preset=2`);
  render(<App />);
  await screen.findByRole('list', { name: 'Calls so far' });
}

const pressStep = (name) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  window.matchMedia = undefined;
  global.fetch = jest.fn((url) => reply(response(new URL(url, 'http://x.test').searchParams.get('cmd'))));
});
afterEach(() => window.history.replaceState(null, '', '/'));

test('every operation and algorithm is in its own labelled group', async () => {
  await open('array.append(1).append(3)');
  const edit = within(screen.getByRole('region', { name: 'Edit' }));
  ['Append', 'Insert', 'Pop', 'Get'].forEach((name) => expect(edit.getByRole('button', { name })).toBeInTheDocument());
  const algorithms = within(screen.getByRole('region', { name: 'Algorithms' }));
  ['Two sum', 'Binary search', 'Max subarray', 'Prefix sums'].forEach((name) => {
    expect(algorithms.getByRole('button', { name: `Run ${name}` })).toBeInTheDocument();
    expect(algorithms.getByRole('heading', { name })).toBeInTheDocument();
  });
  expect(edit.queryByRole('button', { name: /^Run/ })).not.toBeInTheDocument();
});

test('an input belongs to its action, and an append sends the right call', async () => {
  await open('array.append(1)');
  fireEvent.change(screen.getByLabelText('Append value'), { target: { value: '7' } });
  await act(async () => {
    pressStep('Append');
  });
  expect(lastCommand()).toBe('array.append(1).append(7)');
  expect(await screen.findByRole('button', { name: /^append\(7\)/ })).toBeInTheDocument();
});

test('a missing input shows the message beside its own action and sends nothing', async () => {
  await open('array.append(1)');
  const sent = global.fetch.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Run Two sum' }));
  const message = screen.getByText('Enter a whole-number target first.');
  expect(message.closest('form')).toContainElement(screen.getByLabelText('Two sum target'));
  expect(global.fetch.mock.calls.length).toBe(sent);
});

test('a blocked reason is visible text and stops the action', async () => {
  await open('array.append(3).append(1)');
  fireEvent.change(screen.getByLabelText('Step'), { target: { value: '1' } });
  const reasons = screen.getAllByText('Needs a sorted array');
  expect(reasons).toHaveLength(2);
  expect(reasons[0].closest('form')).toContainElement(screen.getByLabelText('Two sum target'));
  expect(screen.getByRole('button', { name: 'Run Two sum' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Run Max subarray' })).toBeEnabled();
});

test('the strip has one chip per call, marks the current one and jumps when pressed', async () => {
  await open('array.append(1).two_sum_sorted(4).append(5)');
  const strip = within(screen.getByRole('list', { name: 'Calls so far' }));
  const chips = strip.getAllByRole('button');
  expect(chips.map((c) => c.querySelector('.p2-chip-call').textContent)).toEqual(['append(1)', 'two_sum_sorted(4)', 'append(5)']);
  expect(chips[1]).toHaveTextContent('Algorithm, 3 steps');
  expect(chips[0]).toHaveTextContent('Edit, 1 step');

  fireEvent.click(chips[1]);
  expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
  expect(chips[1]).toHaveAttribute('aria-current', 'step');
  expect(chips[0]).not.toHaveAttribute('aria-current');
  expect(chips[1]).toHaveTextContent('Algorithm, step 1 of 3');
  expect(screen.getByRole('status')).toHaveTextContent('note 1.0');
});

test('the strip is one Tab stop that arrow keys move along', async () => {
  await open('array.append(1).append(2).append(3)');
  const chips = within(screen.getByRole('list', { name: 'Calls so far' })).getAllByRole('button');
  expect(chips.filter((c) => c.tabIndex === 0)).toHaveLength(1);
  act(() => chips[0].focus());
  fireEvent.keyDown(chips[0], { key: 'ArrowRight' });
  expect(document.activeElement).toBe(chips[1]);
  fireEvent.keyDown(chips[1], { key: 'End' });
  expect(document.activeElement).toBe(chips[2]);
  expect(chips[2].tabIndex).toBe(0);
  expect(chips[0].tabIndex).toBe(-1);
});

test('the step controls work', async () => {
  await open('array.append(1).append(2).append(3)');
  pressStep('Restart');
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  pressStep('Play');
  pressStep('Pause');
  pressStep('Restart');
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  pressStep('Next step');
  expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  pressStep('Previous step');
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Step'), { target: { value: '2' } });
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
});

test('undo, start over and share are all on the page', async () => {
  await open('array.append(1).append(2)');
  await act(async () => {
    pressStep('Undo');
  });
  expect(lastCommand()).toBe('array.append(1)');
  await act(async () => {
    pressStep('Start over');
  });
  expect(lastCommand()).toBe('array');
  expect(await screen.findByText(/No steps yet\. Add a value/)).toBeInTheDocument();
  const share = within(screen.getByRole('region', { name: 'Share' }));
  ['Copy link', 'Copy embed code', 'Copy question for Claude', 'Run'].forEach((name) => {
    expect(share.getByRole('button', { name })).toBeInTheDocument();
  });
  expect(share.getByLabelText('Command')).toBeInTheDocument();
});

test('no layout number is printed on the page', async () => {
  await open('array.append(1)');
  expect(screen.queryByText(/^Layout \d$/)).toBeNull();
});
