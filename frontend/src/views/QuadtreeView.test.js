import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuadtreeView from './QuadtreeView';

const leaf = (x, y, w, h, depth, points = []) => ({ x, y, w, h, depth, points, children: null });
const emptyState = {
  size: 100, capacity: 2, max_depth: 6, count: 0, depth: 0, node_count: 1,
  tree: leaf(0, 0, 100, 100, 0),
};
const split = {
  ...emptyState,
  count: 3, depth: 1, node_count: 5,
  tree: {
    ...leaf(0, 0, 100, 100, 0),
    children: [
      leaf(0, 0, 50, 50, 1, [[10, 10], [20, 20]]),
      leaf(50, 0, 50, 50, 1),
      leaf(0, 50, 50, 50, 1),
      leaf(50, 50, 50, 50, 1, [[80, 80]]),
    ],
  },
};

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws subdivisions and points', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: split, result: null }));
  render(<QuadtreeView />);
  await screen.findByTestId('quadtree-svg');
  expect(screen.getAllByTestId('quadtree-node')).toHaveLength(5);
  expect(screen.getAllByTestId('quadtree-point')).toHaveLength(3);
  expect(screen.getByText(/3 points, 5 nodes, depth 1/)).toBeInTheDocument();
  expect(screen.getByText(/divides 2D space into four parts/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: emptyState, result: null }));
  render(<QuadtreeView />);
  expect(await screen.findByText(/No points yet/)).toBeInTheDocument();
});

test('insert sends the point', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: split, result: { point: [80, 80] } }));
  render(<QuadtreeView />);
  await screen.findByTestId('quadtree-svg');
  await userEvent.type(screen.getByLabelText('x'), '80');
  await userEvent.type(screen.getByLabelText('y'), '80');
  await userEvent.click(screen.getByRole('button', { name: 'Insert point' }));
  expect(await screen.findByText('Inserted (80, 80).')).toBeInTheDocument();
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/quadtree\/insert/);
  expect(JSON.parse(opts.body)).toEqual({ x: 80, y: 80 });
});

test('range query draws the rectangle and lists points', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: split, result: null }))
    .mockImplementationOnce(() =>
      reply({
        success: true,
        state: split,
        result: {
          rect: [20, 20, 60, 60], points: [[20, 20]], nodes_visited: 2, total_nodes: 5,
          visited: [[0, 0, 100, 100], [0, 0, 50, 50]],
        },
      }));
  render(<QuadtreeView />);
  await screen.findByTestId('quadtree-svg');
  await userEvent.click(screen.getByRole('button', { name: 'Range query' }));
  expect(await screen.findByTestId('quadtree-query-rect')).toBeInTheDocument();
  expect(screen.getByText(/visited 2 of 5 nodes/)).toBeInTheDocument();
  expect(screen.getByTestId('quadtree-found')).toHaveTextContent('(20, 20)');
});

test('rejects non-numeric input without calling the backend', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: emptyState, result: null }));
  render(<QuadtreeView />);
  await screen.findByTestId('quadtree-svg');
  await userEvent.type(screen.getByLabelText('x'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Insert point' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('x and y must be numbers');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows a backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: false, error: 'point must lie within 0 to 100 on both axes', state: emptyState }, false));
  render(<QuadtreeView />);
  await screen.findByTestId('quadtree-svg');
  await userEvent.type(screen.getByLabelText('x'), '500');
  await userEvent.type(screen.getByLabelText('y'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Insert point' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('point must lie within 0 to 100');
});

test('shows an error when loading fails', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<QuadtreeView />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load data');
});
