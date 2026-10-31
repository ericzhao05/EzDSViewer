import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BinaryTreeView from './BinaryTreeView';

const leaf = (val) => ({ val, left: null, right: null });
const tree = { val: 1, left: { val: 2, left: leaf(4), right: null }, right: leaf(3) };
const props = { full: false, complete: true, perfect: false, balanced: true };
const state = { tree, count: 4, height: 2, properties: props, depths: {} };
const emptyState = { tree: null, count: 0, height: -1, properties: props, depths: {} };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws every node and the stats', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<BinaryTreeView />);
  expect(await screen.findByTestId('node-4')).toBeInTheDocument();
  for (const v of [1, 2, 3]) expect(screen.getByTestId(`node-${v}`)).toBeInTheDocument();
  expect(screen.getByText(/Nodes: 4/)).toBeInTheDocument();
  expect(screen.getByText(/O\(h\) stack space/)).toBeInTheDocument();
});

test('shows the empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: emptyState, result: null }));
  render(<BinaryTreeView />);
  expect(await screen.findByText('Tree is empty.')).toBeInTheDocument();
});

test('preorder posts and shows the order with numbered nodes', async () => {
  global.fetch.mockImplementation((url, opts) =>
    reply({ success: true, state, result: opts && opts.method === 'POST' ? [1, 2, 4, 3] : null })
  );
  render(<BinaryTreeView />);
  await screen.findByTestId('node-4');
  await userEvent.click(screen.getByRole('button', { name: 'Preorder' }));
  expect(await screen.findByTestId('order-output')).toHaveTextContent('[1, 2, 4, 3]');
  const call = global.fetch.mock.calls.find(([u]) => u.endsWith('/binary-tree/preorder'));
  expect(call[1].method).toBe('POST');
  expect(screen.getByTestId('node-3')).toHaveTextContent('4');
});

test('lca validates input locally, then sends p and q', async () => {
  global.fetch.mockImplementation((url, opts) =>
    reply({ success: true, state, result: opts && opts.method === 'POST' ? 1 : null })
  );
  render(<BinaryTreeView />);
  await screen.findByTestId('node-4');
  await userEvent.click(screen.getByRole('button', { name: 'Lowest common ancestor' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('p and q must be whole numbers');
  await userEvent.type(screen.getByLabelText('Node p'), '4');
  await userEvent.type(screen.getByLabelText('Node q'), '3');
  await userEvent.click(screen.getByRole('button', { name: 'Lowest common ancestor' }));
  expect(await screen.findByRole('status')).toHaveTextContent('ancestor of 4 and 3: 1');
  const call = global.fetch.mock.calls.find(([u]) => u.endsWith('/binary-tree/lca'));
  expect(JSON.parse(call[1].body)).toEqual({ p: 4, q: 3 });
});

test('shows a server error', async () => {
  global.fetch.mockImplementation((url, opts) =>
    opts && opts.method === 'POST'
      ? reply({ success: false, error: 'values must be unique', state }, false)
      : reply({ success: true, state, result: null })
  );
  render(<BinaryTreeView />);
  await screen.findByTestId('node-4');
  await userEvent.click(screen.getByRole('button', { name: 'Build tree' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('values must be unique'));
});
