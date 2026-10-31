import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RangeQueryView from './RangeQueryView';

const state = {
  nums: [5, 2, 7, 1],
  fenwick: [5, 7, 7, 15],
  segment: [0, 1, 2, 1, 5, 2, 7, 1],
};

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the Fenwick tree by default and toggles to the segment tree', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<RangeQueryView />);
  expect(await screen.findByTestId('fenwick-tree')).toBeInTheDocument();
  expect(screen.getByTestId('fenwick-4')).toHaveTextContent('15');
  expect(screen.getByText(/Fenwick \(binary indexed\) tree: update and query O\(log n\)/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Segment tree' }));
  expect(screen.getByTestId('segment-tree')).toBeInTheDocument();
  expect(screen.getByTestId('segment-1')).toHaveTextContent('1');
  expect(screen.getByTestId('segment-4')).toHaveTextContent('5');
});

test('range sum sends request and shows the result', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state, result: { sum: 10, nodes: [4], subtract_nodes: [1] } })
    );
  render(<RangeQueryView />);
  await screen.findByTestId('fenwick-tree');
  await userEvent.click(screen.getByRole('button', { name: 'Range sum' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Range sum: 10');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/range-query\/range-sum$/);
  expect(JSON.parse(opts.body)).toEqual({ left: 1, right: 4 });
  expect(screen.getByTestId('fenwick-4').className).toMatch(/range-query-hit/);
});

test('range min in segment mode', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state, result: { min: 1, nodes: [5, 7] } }));
  render(<RangeQueryView />);
  await screen.findByTestId('fenwick-tree');
  await userEvent.click(screen.getByRole('button', { name: 'Segment tree' }));
  await userEvent.click(screen.getByRole('button', { name: 'Range min' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Range minimum: 1');
});

test('shows a server error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'bad range', state }, false));
  render(<RangeQueryView />);
  await screen.findByTestId('fenwick-tree');
  await userEvent.click(screen.getByRole('button', { name: 'Range sum' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('bad range');
});

test('rejects non-numeric input without calling the server', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<RangeQueryView />);
  await screen.findByTestId('fenwick-tree');
  await userEvent.clear(screen.getByLabelText('Left'));
  await userEvent.type(screen.getByLabelText('Left'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Range sum' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole numbers');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows an error when the backend is down', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<RangeQueryView />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load data');
});
