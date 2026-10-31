import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HashTableView from './HashTableView';

const emptyState = {
  capacity: 8, size: 0, load_factor: 0, threshold: 0.75,
  buckets: Array.from({ length: 8 }, () => []),
};
const filled = {
  capacity: 8, size: 2, load_factor: 0.25, threshold: 0.75,
  buckets: [[], [[1, 'a'], [9, 'b']], [], [], [], [], [], []],
};

const reply = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws buckets and chains with load factor', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: filled, result: null }));
  render(<HashTableView />);
  expect(await screen.findByText(/Load factor:/)).toHaveTextContent('Load factor: 0.25 / 0.75');
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
  const row = screen.getByTestId('bucket-1');
  expect(row).toHaveTextContent('1a');
  expect(row).toHaveTextContent('9b');
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: emptyState, result: null }));
  render(<HashTableView />);
  expect(await screen.findByText(/Hash table is empty/)).toBeInTheDocument();
});

test('put sends request and shows resize result', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: filled, result: { updated: false, resized: true } })
    );
  render(<HashTableView />);
  await screen.findByText(/Hash table is empty/);
  await userEvent.type(screen.getByLabelText('Key'), 'a');
  await userEvent.type(screen.getByLabelText('Value'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Put' }));
  expect(await screen.findByRole('status')).toHaveTextContent(/doubled and rehashed/);
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/hash-table\/put$/);
  expect(JSON.parse(opts.body)).toEqual({ key: 'a', value: 5 });
});

test('shows backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'Table is limited', state: emptyState }, false));
  render(<HashTableView />);
  await screen.findByText(/Hash table is empty/);
  await userEvent.type(screen.getByLabelText('Key'), 'a');
  await userEvent.type(screen.getByLabelText('Value'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Put' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Table is limited');
});

test('shows load error and validates empty key locally', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<HashTableView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load data/);
  await userEvent.click(screen.getByRole('button', { name: 'Get' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Please enter a key'));
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
