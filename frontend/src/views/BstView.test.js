import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BstView from './BstView';

const leaf = (val) => ({ val, left: null, right: null });
const full = {
  tree: { val: 50, left: leaf(30), right: leaf(70) },
  count: 3,
  height: 1,
  inorder: [30, 50, 70],
  limits: { max_nodes: 31 },
};
const empty = { tree: null, count: 0, height: -1, inorder: [], limits: { max_nodes: 31 } };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the tree nodes and stats', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: full, result: null }));
  render(<BstView />);
  expect(await screen.findByTestId('bst-node-50')).toBeInTheDocument();
  expect(screen.getByTestId('bst-node-30')).toBeInTheDocument();
  expect(screen.getByTestId('bst-node-70')).toBeInTheDocument();
  expect(screen.getByText(/Nodes: 3/)).toBeInTheDocument();
  expect(screen.getByText(/O\(h\)/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<BstView />);
  expect(await screen.findByText('Tree is empty.')).toBeInTheDocument();
});

test('delete sends value and reports the case', async () => {
  global.fetch.mockImplementation((url, opts) => {
    if (opts && opts.method === 'POST') {
      return reply({
        success: true,
        state: empty,
        result: { deleted: 50, case: 'two-children', successor: 60, path: [50] },
      });
    }
    return reply({ success: true, state: full, result: null });
  });
  render(<BstView />);
  await screen.findByTestId('bst-node-50');
  await userEvent.type(screen.getByLabelText('Value'), '50');
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Two children');
  const post = global.fetch.mock.calls.find(([, o]) => o && o.method === 'POST');
  expect(post[0]).toMatch(/\/bst\/delete$/);
  expect(JSON.parse(post[1].body)).toEqual({ value: 50 });
});

test('search highlights the path', async () => {
  global.fetch.mockImplementation((url, opts) =>
    opts && opts.method === 'POST'
      ? reply({ success: true, state: full, result: { found: true, path: [50, 30] } })
      : reply({ success: true, state: full, result: null })
  );
  render(<BstView />);
  await screen.findByTestId('bst-node-50');
  await userEvent.type(screen.getByLabelText('Value'), '30');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() =>
    expect(screen.getByTestId('bst-node-30').getAttribute('class')).toContain('bst-node-path')
  );
  expect(screen.getByTestId('bst-node-70').getAttribute('class')).not.toContain('bst-node-path');
});

test('rejects a non-numeric value locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: full, result: null }));
  render(<BstView />);
  await screen.findByTestId('bst-node-50');
  await userEvent.type(screen.getByLabelText('Value'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Insert' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number');
});

test('shows a server error', async () => {
  global.fetch.mockImplementation((url, opts) =>
    opts && opts.method === 'POST'
      ? reply({ success: false, error: '50 is already in the tree', state: full }, false)
      : reply({ success: true, state: full, result: null })
  );
  render(<BstView />);
  await screen.findByTestId('bst-node-50');
  await userEvent.type(screen.getByLabelText('Value'), '50');
  await userEvent.click(screen.getByRole('button', { name: 'Insert' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('already in the tree');
});
