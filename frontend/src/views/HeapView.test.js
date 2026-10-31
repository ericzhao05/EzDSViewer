import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HeapView from './HeapView';

const median0 = { low: [], high: [], count: 0, value: null };
const base = { items: [1, 3, 2, 9], size: 4, median: median0 };
const empty = { items: [], size: 0, median: median0 };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws tree and array forms', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<HeapView />);
  await screen.findByTestId('heap-tree');
  expect(screen.getAllByTestId('heap-node')).toHaveLength(4);
  expect(screen.getAllByTestId('heap-edge')).toHaveLength(3);
  expect(screen.getByLabelText('Heap array')).toHaveTextContent('10312293');
  expect(screen.getByText(/Build from n items O\(n\)/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<HeapView />);
  expect(await screen.findByText('Heap is empty.')).toBeInTheDocument();
});

test('push sends the value, pop shows the result', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: 1 }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: 1 }));
  render(<HeapView />);
  await screen.findByText('Heap is empty.');
  await userEvent.type(screen.getByLabelText('Value'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Push' }));
  await screen.findByTestId('heap-tree');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/\/heap\/push$/);
  expect(JSON.parse(opts.body)).toEqual({ value: 1 });
  await userEvent.click(screen.getByRole('button', { name: 'Pop' }));
  expect(await screen.findByText('Popped the minimum: 1')).toBeInTheDocument();
});

test('rejects non-numeric value locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<HeapView />);
  await screen.findByTestId('heap-tree');
  await userEvent.type(screen.getByLabelText('Value'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Push' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows a backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'heap is empty', state: empty }, false));
  render(<HeapView />);
  await screen.findByText('Heap is empty.');
  await userEvent.click(screen.getByRole('button', { name: 'Pop' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('heap is empty'));
});

test('kth largest shows result', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: 5 }));
  render(<HeapView />);
  await screen.findByTestId('heap-tree');
  await userEvent.click(screen.getByRole('button', { name: 'Kth largest' }));
  expect(await screen.findByText('Kth largest: 5')).toBeInTheDocument();
});
