import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BTreeView from './BTreeView';

const leaf = (id, keys) => ({ id, keys, leaf: true, children: [] });
const plusLeaf = (id, keys, next) => ({
  id,
  keys,
  leaf: true,
  values: keys.map((k) => `row ${k}`),
  next,
  children: [],
});
const limits = { min_order: 3, max_order: 7, max_keys: 40, max_abs: 9999, max_value_len: 12 };
const base = {
  order: 4,
  limits,
  btree: {
    order: 4,
    size: 3,
    height: 2,
    min_keys: 1,
    max_keys: 3,
    root: { id: 'r', keys: [10], leaf: false, children: [leaf('r.0', [5]), leaf('r.1', [20])] },
  },
  bplus: {
    order: 4,
    size: 3,
    height: 2,
    min_keys: 1,
    min_leaf_keys: 2,
    max_keys: 3,
    root: {
      id: 'r',
      keys: [10],
      leaf: false,
      children: [plusLeaf('r.0', [5], 'r.1'), plusLeaf('r.1', [10, 20], null)],
    },
    leaves: [{ id: 'r.0', keys: [5] }, { id: 'r.1', keys: [10, 20] }],
  },
};
const empty = {
  ...base,
  btree: { ...base.btree, size: 0, height: 0, root: leaf('r', []) },
  bplus: {
    ...base.bplus,
    size: 0,
    height: 0,
    root: plusLeaf('r', [], null),
    leaves: [{ id: 'r', keys: [] }],
  },
};

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
const good = (state, result = null) => reply({ success: true, state, result });

beforeEach(() => {
  global.fetch = jest.fn();
});

const loadThen = (...replies) => {
  global.fetch.mockImplementationOnce(() => good(base));
  replies.forEach((r) => global.fetch.mockImplementationOnce(() => r));
};
const lastCall = () => {
  const [url, opts] = global.fetch.mock.calls[global.fetch.mock.calls.length - 1];
  return { url, body: JSON.parse(opts.body) };
};
const nodeById = (testId, id) =>
  screen.getAllByTestId(testId).find((n) => n.getAttribute('data-node-id') === id);

test('draws both trees with nodes, edges and the leaf chain', async () => {
  loadThen();
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  expect(screen.getAllByTestId('btree-node')).toHaveLength(3);
  expect(screen.getAllByTestId('btree-edge')).toHaveLength(2);
  expect(screen.getAllByTestId('bplus-node')).toHaveLength(3);
  expect(screen.getAllByTestId('bplus-edge')).toHaveLength(2);
  expect(screen.getAllByTestId('bplus-link')).toHaveLength(1);
  expect(nodeById('btree-node', 'r.1')).toHaveTextContent('20');
  expect(nodeById('bplus-node', 'r.1')).toHaveTextContent('row 20');
  expect(screen.getByTestId('bplus-chain')).toHaveTextContent('[5] → [10, 20]');
  expect(screen.getByLabelText('Order m')).toHaveValue('4');
});

test('shows what it is and the property table from ds.md', async () => {
  loadThen();
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  expect(screen.getByText(/designed for storage that is read in blocks/)).toBeInTheDocument();
  expect(screen.getByText('At most m; at least ⌈m/2⌉ for internal nodes other than the root')).toBeInTheDocument();
  expect(screen.getByText('All at the same depth')).toBeInTheDocument();
  expect(screen.getByText('O(log n)')).toBeInTheDocument();
  expect(screen.getByText('Split the full node and move the median key up')).toBeInTheDocument();
  expect(screen.getByText('Borrow from a sibling or merge with one')).toBeInTheDocument();
  expect(screen.getByText(/range scans walk the leaf chain/)).toBeInTheDocument();
});

test('shows a loading message before the state arrives', () => {
  global.fetch.mockImplementation(() => new Promise(() => {}));
  render(<BTreeView />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

test('shows empty messages instead of drawing empty trees', async () => {
  global.fetch.mockImplementationOnce(() => good(empty));
  render(<BTreeView />);
  expect(await screen.findByText('B-tree is empty.')).toBeInTheDocument();
  expect(screen.getByText('B+ tree is empty.')).toBeInTheDocument();
  expect(screen.queryByTestId('btree-svg')).not.toBeInTheDocument();
});

test('shows an error when the state cannot load', async () => {
  global.fetch.mockImplementationOnce(() => Promise.reject(new Error('down')));
  render(<BTreeView />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load data');
});

test('insert sends the key and lists what the tree did', async () => {
  loadThen(good(base, { key: 7, inserted: true, events: ['split [1, 2, 3, 4]: median 3 moves up'] }));
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  await userEvent.type(screen.getByLabelText('B-tree key'), '7');
  await userEvent.click(screen.getByRole('button', { name: 'Insert into B-tree' }));
  expect(await screen.findByText('Inserted 7.')).toBeInTheDocument();
  expect(screen.getByText('split [1, 2, 3, 4]: median 3 moves up')).toBeInTheDocument();
  const { url, body } = lastCall();
  expect(url).toMatch(/\/b-tree\/insert$/);
  expect(body).toEqual({ key: 7 });
});

test('duplicate insert says nothing changed', async () => {
  loadThen(good(base, { key: 5, inserted: false, events: [] }));
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  await userEvent.type(screen.getByLabelText('B-tree key'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Insert into B-tree' }));
  expect(await screen.findByText('5 is already in the B-tree; nothing changed.')).toBeInTheDocument();
});

test('search highlights the visited path, then the next op clears it', async () => {
  loadThen(
    good(base, { key: 20, found: true, path: ['r', 'r.1'] }),
    good(base, { key: 20, events: [] })
  );
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  await userEvent.type(screen.getByLabelText('B-tree key'), '20');
  await userEvent.click(screen.getByRole('button', { name: 'Search B-tree' }));
  expect(await screen.findByText('Found 20 after reading 2 node(s).')).toBeInTheDocument();
  expect(nodeById('btree-node', 'r.1')).toHaveClass('b-tree-node-hl');
  expect(nodeById('btree-node', 'r.0')).not.toHaveClass('b-tree-node-hl');
  expect(nodeById('bplus-node', 'r.1')).not.toHaveClass('b-tree-node-hl');
  await userEvent.click(screen.getByRole('button', { name: 'Delete from B-tree' }));
  await screen.findByText('Deleted 20.');
  expect(nodeById('btree-node', 'r.1')).not.toHaveClass('b-tree-node-hl');
});

test('delete reports a borrow', async () => {
  loadThen(good(base, { key: 5, events: ['borrow from right sibling, through the parent'] }));
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  await userEvent.type(screen.getByLabelText('B-tree key'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Delete from B-tree' }));
  expect(await screen.findByText('borrow from right sibling, through the parent')).toBeInTheDocument();
  expect(lastCall().url).toMatch(/\/b-tree\/delete$/);
});

test('B+ insert omits a blank value and sends a typed one', async () => {
  loadThen(
    good(base, { key: 7, value: 'row 7', inserted: true, events: [] }),
    good(base, { key: 7, value: 'hello', inserted: false, events: [] })
  );
  render(<BTreeView />);
  await screen.findByTestId('bplus-svg');
  await userEvent.type(screen.getByLabelText('B+ tree key'), '7');
  await userEvent.click(screen.getByRole('button', { name: 'Insert into B+ tree' }));
  await screen.findByText('Inserted 7 with value "row 7".');
  expect(lastCall().url).toMatch(/\/b-tree\/bplus-insert$/);
  expect(lastCall().body).toEqual({ key: 7 });
  await userEvent.type(screen.getByLabelText('B+ tree value'), 'hello');
  await userEvent.click(screen.getByRole('button', { name: 'Insert into B+ tree' }));
  await screen.findByText('7 already existed: its value is now "hello".');
  expect(lastCall().body).toEqual({ key: 7, value: 'hello' });
});

test('B+ search shows the value from the leaf', async () => {
  loadThen(good(base, { key: 20, found: true, value: 'row 20', path: ['r', 'r.1'] }));
  render(<BTreeView />);
  await screen.findByTestId('bplus-svg');
  await userEvent.type(screen.getByLabelText('B+ tree key'), '20');
  await userEvent.click(screen.getByRole('button', { name: 'Search B+ tree' }));
  expect(await screen.findByText('Found 20 = "row 20" after reading 2 node(s).')).toBeInTheDocument();
  expect(nodeById('bplus-node', 'r.1')).toHaveClass('b-tree-node-hl');
  expect(nodeById('btree-node', 'r.1')).not.toHaveClass('b-tree-node-hl');
});

test('B+ delete shows the removed value', async () => {
  loadThen(good(base, { key: 5, value: 'row 5', events: ['merge leaves: separator 10 is dropped, the chain is relinked'] }));
  render(<BTreeView />);
  await screen.findByTestId('bplus-svg');
  await userEvent.type(screen.getByLabelText('B+ tree key'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Delete from B+ tree' }));
  expect(await screen.findByText('Deleted 5, which held "row 5".')).toBeInTheDocument();
  expect(lastCall().url).toMatch(/\/b-tree\/bplus-delete$/);
});

test('range scan sends bounds, lists items and highlights walked leaves', async () => {
  loadThen(
    good(base, {
      low: 5,
      high: 10,
      items: [{ key: 5, value: 'row 5' }, { key: 10, value: 'row 10' }],
      path: ['r', 'r.0'],
      leaves: ['r.0', 'r.1'],
    })
  );
  render(<BTreeView />);
  await screen.findByTestId('bplus-svg');
  await userEvent.type(screen.getByLabelText('Range low'), '5');
  await userEvent.type(screen.getByLabelText('Range high'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Range scan' }));
  expect(await screen.findByText('Range [5, 10]: 2 item(s) from 2 leaf node(s): 5 = row 5, 10 = row 10.')).toBeInTheDocument();
  expect(lastCall().body).toEqual({ low: 5, high: 10 });
  expect(nodeById('bplus-node', 'r.1')).toHaveClass('b-tree-node-hl');
  expect(screen.getByTestId('bplus-link')).toHaveClass('b-tree-link-hl');
});

test('rejects non-numeric input locally', async () => {
  loadThen();
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  await userEvent.type(screen.getByLabelText('B-tree key'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Insert into B-tree' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number');
  await userEvent.click(screen.getByRole('button', { name: 'Range scan' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number');
  await userEvent.clear(screen.getByLabelText('Keys for both trees'));
  await userEvent.type(screen.getByLabelText('Keys for both trees'), '1, x');
  await userEvent.click(screen.getByRole('button', { name: 'Build both trees' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows a backend error and keeps drawing the tree', async () => {
  loadThen(reply({ success: false, error: 'key 9 is not in the B-tree', state: base }, false));
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  await userEvent.type(screen.getByLabelText('B-tree key'), '9');
  await userEvent.click(screen.getByRole('button', { name: 'Delete from B-tree' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('key 9 is not in the B-tree'));
  expect(screen.getByTestId('btree-svg')).toBeInTheDocument();
});

test('changing the order posts it', async () => {
  loadThen(good({ ...base, order: 5 }, { order: 5 }));
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  await userEvent.selectOptions(screen.getByLabelText('Order m'), '5');
  await waitFor(() => expect(screen.getByLabelText('Order m')).toHaveValue('5'));
  expect(lastCall().url).toMatch(/\/b-tree\/set-order$/);
  expect(lastCall().body).toEqual({ order: 5 });
});

test('build sends the keys, an empty box clears, and reset posts', async () => {
  loadThen(good(base, { btree_size: 3, bplus_size: 3 }), good(empty, { btree_size: 0, bplus_size: 0 }), good(base));
  render(<BTreeView />);
  await screen.findByTestId('btree-svg');
  const box = screen.getByLabelText('Keys for both trees');
  await userEvent.clear(box);
  await userEvent.type(box, '3, 1, 2');
  await userEvent.click(screen.getByRole('button', { name: 'Build both trees' }));
  await screen.findByText('Built both trees: 3 key(s).');
  expect(lastCall().body).toEqual({ keys: [3, 1, 2] });
  await userEvent.clear(box);
  await userEvent.click(screen.getByRole('button', { name: 'Build both trees' }));
  await screen.findByText('B-tree is empty.');
  expect(lastCall().body).toEqual({ keys: [] });
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  await screen.findByTestId('btree-svg');
  expect(lastCall().url).toMatch(/\/b-tree\/reset$/);
});

test('wide trees are laid out without overlapping cells', async () => {
  const keys = (id) => [1, 2, 3].map((k) => id.length * 1000 + k * 100 + (id.charCodeAt(id.length - 1) % 50));
  const grow = (id, depth) =>
    depth === 0
      ? { ...plusLeaf(id, keys(id), null), values: ['twelve chars', 'x', 'y'] }
      : {
          id,
          keys: keys(id),
          leaf: false,
          children: [0, 1, 2, 3].map((i) => grow(`${id}.${i}`, depth - 1)),
        };
  const root = grow('r', 2);
  const wide = { ...base, bplus: { ...base.bplus, size: 48, height: 3, root } };
  global.fetch.mockImplementationOnce(() => good(wide));
  render(<BTreeView />);
  const svg = await screen.findByTestId('bplus-svg');
  const rows = {};
  screen.getAllByTestId('bplus-cell').forEach((rect) => {
    const y = rect.getAttribute('y');
    rows[y] = rows[y] || [];
    rows[y].push({ x: Number(rect.getAttribute('x')), w: Number(rect.getAttribute('width')) });
  });
  expect(Object.keys(rows)).toHaveLength(4);
  const width = Number(svg.getAttribute('width'));
  const overlaps = [];
  Object.values(rows).forEach((row) => {
    row.sort((a, b) => a.x - b.x);
    row.forEach((cell, i) => {
      const hitsPrevious = i > 0 && row[i - 1].x + row[i - 1].w > cell.x;
      if (cell.x < 0 || cell.x + cell.w > width || hitsPrevious) overlaps.push(cell);
    });
  });
  expect(overlaps).toEqual([]);
});
