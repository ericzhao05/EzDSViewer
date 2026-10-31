import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KdTreeView from './KdTreeView';

const leaf = (point, axis) => ({ point, axis, left: null, right: null });
const root = {
  point: [7, 2],
  axis: 0,
  left: { ...leaf([5, 4], 1), left: leaf([2, 3], 0) },
  right: leaf([9, 6], 1),
};
const base = { k: 2, size: 4, root, limits: { max_points: 63, max_abs: 100 } };
const empty = { k: 2, size: 0, root: null, limits: { max_points: 63, max_abs: 100 } };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the tree and the plane partition', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<KdTreeView />);
  await screen.findByTestId('kdtree-tree');
  expect(screen.getAllByTestId('kdtree-node')).toHaveLength(4);
  expect(screen.getAllByTestId('kdtree-edge')).toHaveLength(3);
  expect(screen.getAllByTestId('kdtree-point')).toHaveLength(4);
  expect(screen.getAllByTestId('kdtree-split')).toHaveLength(4);
  expect(screen.getByText(/Nearest-neighbor search is O\(log n\) on average and O\(n\) in the worst case/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<KdTreeView />);
  expect(await screen.findByText('Tree is empty.')).toBeInTheDocument();
});

test('nearest sends the point and shows the result', async () => {
  const result = { query: [8, 2], point: [7, 2], distance_squared: 1, visited: [[7, 2], [9, 6]] };
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result }));
  render(<KdTreeView />);
  await screen.findByTestId('kdtree-tree');
  await userEvent.type(screen.getByLabelText('x'), '8');
  await userEvent.type(screen.getByLabelText('y'), '2');
  await userEvent.click(screen.getByRole('button', { name: 'Nearest' }));
  expect(await screen.findByText(/Nearest to \(8, 2\) is \(7, 2\), squared distance 1; visited 2 nodes/)).toBeInTheDocument();
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/\/kd-tree\/nearest$/);
  expect(JSON.parse(opts.body)).toEqual({ point: [8, 2] });
  expect(screen.getByTestId('kdtree-query')).toBeInTheDocument();
});

test('rejects non-numeric input locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<KdTreeView />);
  await screen.findByTestId('kdtree-tree');
  await userEvent.type(screen.getByLabelText('x'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Insert' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('number for both x and y');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'tree is empty', state: empty }, false));
  render(<KdTreeView />);
  await screen.findByText('Tree is empty.');
  await userEvent.type(screen.getByLabelText('x'), '1');
  await userEvent.type(screen.getByLabelText('y'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Nearest' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('tree is empty');
});
