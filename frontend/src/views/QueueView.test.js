import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueueView from './QueueView';

const emptyState = {
  circular: { capacity: 4, head: 0, size: 0, slots: [null, null, null, null] },
  stacks: { incoming: [], outgoing: [] },
  deque: [],
};
const filled = {
  circular: { capacity: 4, head: 3, size: 2, slots: ['b', null, null, 'a'] },
  stacks: { incoming: [7], outgoing: [9, 8] },
  deque: [1, 2],
};

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws circular slots, stacks and deque', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: filled, result: null }));
  render(<QueueView />);
  const slots = await screen.findByTestId('circular-slots');
  expect(slots).toHaveTextContent('head');
  expect(slots).toHaveTextContent('tail');
  expect(screen.getByLabelText('Outgoing stack')).toHaveTextContent('98');
  expect(screen.getByLabelText('Deque items')).toHaveTextContent('12');
});

test('shows empty messages', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: emptyState, result: null }));
  render(<QueueView />);
  expect(await screen.findByText('Deque is empty.')).toBeInTheDocument();
  expect(screen.getAllByText('Queue is empty.')).toHaveLength(2);
});

test('enqueue sends the value and dequeue shows the result', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: filled, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: filled, result: 'a' }));
  render(<QueueView />);
  await screen.findByText('Deque is empty.');
  await userEvent.type(screen.getByLabelText('Value'), '5');
  await userEvent.click(screen.getAllByRole('button', { name: 'Enqueue' })[0]);
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Dequeue' })[0]).toBeEnabled());
  expect(screen.getByTestId('circular-slots')).toHaveTextContent('head');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/queue\/circular-enqueue$/);
  expect(JSON.parse(opts.body)).toEqual({ value: 5 });
  await userEvent.click(screen.getAllByRole('button', { name: 'Dequeue' })[0]);
  expect(await screen.findByRole('status')).toHaveTextContent('Dequeued: "a"');
});

test('sliding window shows trace steps', async () => {
  const result = {
    nums: [1, 3], k: 2, maxes: [3],
    steps: [
      { index: 0, deque: [0], max: null },
      { index: 1, deque: [1], max: 3 },
    ],
  };
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result }));
  render(<QueueView />);
  await screen.findByText('Deque is empty.');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(await screen.findByTestId('trace-step')).toHaveTextContent('window not full yet');
  await userEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByTestId('trace-step')).toHaveTextContent('window max: 3');
});

test('shows an error from the backend', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: false, error: 'Cannot dequeue from an empty queue', state: emptyState }, false)
    );
  render(<QueueView />);
  await screen.findByText('Deque is empty.');
  await userEvent.click(screen.getAllByRole('button', { name: 'Dequeue' })[0]);
  expect(await screen.findByRole('alert')).toHaveTextContent('Cannot dequeue from an empty queue');
});

test('load failure shows an error', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<QueueView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load data/);
});
