import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BloomFilterView from './BloomFilterView';

const mk = (over = {}) => ({
  size: 8,
  num_hashes: 2,
  bits: [0, 1, 0, 0, 1, 0, 0, 0],
  count: 1,
  bits_set: 2,
  false_positive_rate: 0.0123,
  added: ['apple'],
  ...over,
});
const empty = mk({ bits: Array(8).fill(0), count: 0, bits_set: 0, false_positive_rate: 0, added: [] });

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the bit array and stats', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: mk(), result: null }));
  render(<BloomFilterView />);
  await screen.findByTestId('bloom-bits');
  expect(screen.getAllByTestId('bloom-bit')).toHaveLength(8);
  expect(screen.getByText(/8 bits, 2 hash functions, 1 adds, 2 bits set/)).toBeInTheDocument();
  expect(screen.getByText('apple')).toBeInTheDocument();
  expect(screen.getByText(/Add and lookup cost O\(k\)/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<BloomFilterView />);
  expect(await screen.findByText('Filter is empty: all bits are 0.')).toBeInTheDocument();
});

test('add sends the item, check reports possibly present', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: mk(), result: { item: 'apple', positions: [1, 4] } }))
    .mockImplementationOnce(() =>
      reply({
        success: true,
        state: mk(),
        result: { item: 'apple', positions: [1, 4], possibly_present: true, actually_added: true, false_positive: false },
      }));
  render(<BloomFilterView />);
  await screen.findByText('Filter is empty: all bits are 0.');
  await userEvent.type(screen.getByLabelText('Item'), 'apple');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByText('Added "apple": set bits 1, 4')).toBeInTheDocument();
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/\/bloom-filter\/add$/);
  expect(JSON.parse(opts.body)).toEqual({ item: 'apple' });
  await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  expect(await screen.findByText(/"apple": possibly present \(bits 1, 4 are all 1\)/)).toBeInTheDocument();
});

test('reports a definite absence', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk(), result: null }))
    .mockImplementationOnce(() =>
      reply({
        success: true,
        state: mk(),
        result: { item: 'pear', positions: [2, 3], possibly_present: false, actually_added: false, false_positive: false },
      }));
  render(<BloomFilterView />);
  await screen.findByTestId('bloom-bits');
  await userEvent.type(screen.getByLabelText('Item'), 'pear');
  await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  expect(await screen.findByText(/"pear" is definitely not present/)).toBeInTheDocument();
});

test('rejects an empty item locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: mk(), result: null }));
  render(<BloomFilterView />);
  await screen.findByTestId('bloom-bits');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please enter an item');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows a server error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk(), result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'size must be a whole number from 8 to 128', state: mk() }, false));
  render(<BloomFilterView />);
  await screen.findByTestId('bloom-bits');
  await userEvent.type(screen.getByLabelText('Number of bits'), '3');
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/size must be/);
});

test('shows load failure', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<BloomFilterView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load data/);
});
