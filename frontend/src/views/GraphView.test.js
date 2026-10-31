import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GraphView from './GraphView';

const state = {
  n: 3,
  directed: false,
  edges: [
    { u: 0, v: 1, w: 4 },
    { u: 1, v: 2, w: 7 },
  ],
};
const empty = { n: 0, directed: false, edges: [] };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws nodes and weighted edges', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<GraphView />);
  expect(await screen.findByTestId('node-0')).toBeInTheDocument();
  expect(screen.getByTestId('node-2')).toBeInTheDocument();
  expect(screen.getByTestId('edge-0-1')).toHaveTextContent('4');
  expect(screen.getByTestId('edge-1-2')).toHaveTextContent('7');
  expect(screen.getByText('Undirected')).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<GraphView />);
  expect(await screen.findByText(/Graph is empty/)).toBeInTheDocument();
});

test('BFS posts the start node and shows the order', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state, result: { start: 0, order: [0, 1, 2], tree_edges: [[0, 1], [1, 2]] } })
    );
  render(<GraphView />);
  await screen.findByTestId('node-0');
  await userEvent.click(screen.getByRole('button', { name: 'BFS' }));
  expect(await screen.findByRole('status')).toHaveTextContent('BFS from 0: 0 → 1 → 2');
  const call = global.fetch.mock.calls[1];
  expect(call[0]).toMatch(/\/graph\/bfs$/);
  expect(JSON.parse(call[1].body)).toEqual({ start: 0 });
});

test('rejects non-numeric input locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<GraphView />);
  await screen.findByTestId('node-0');
  await userEvent.click(screen.getByRole('button', { name: 'Add edge' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('From must be a whole number');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'graph is limited to 12 nodes', state }, false));
  render(<GraphView />);
  await screen.findByTestId('node-0');
  await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('limited to 12 nodes');
});
