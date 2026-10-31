import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BalancedTreesView from './BalancedTreesView';

const avlNode = (val, balance, left = null, right = null) => ({
  val,
  balance,
  height: 1,
  left,
  right,
});
const rbNode = (val, color, left = null, right = null) => ({ val, color, left, right });

const stateOf = (avlTree, rbTree) => ({
  avl: {
    tree: avlTree,
    count: avlTree ? 3 : 0,
    height: avlTree ? 2 : 0,
    height_bound: avlTree ? 2.28 : null,
    inorder: avlTree ? [10, 20, 30] : [],
    rotations: 4,
  },
  rb: {
    tree: rbTree,
    count: rbTree ? 3 : 0,
    height: rbTree ? 2 : 0,
    height_bound: rbTree ? 4 : null,
    inorder: rbTree ? [10, 20, 30] : [],
    rotations: 2,
    black_height: rbTree ? 1 : 0,
  },
  limits: { max_nodes: 31, max_compare: 1000 },
});

const full = stateOf(
  avlNode(20, 0, avlNode(10, 0), avlNode(30, 0)),
  rbNode(20, 'black', rbNode(10, 'red'), rbNode(30, 'red'))
);
const empty = stateOf(null, null);

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

// Answers GET with the initial state and each POST from the given op table.
function serve(initial, ops = {}) {
  global.fetch.mockImplementation((url, opts) => {
    if (opts && opts.method === 'POST') {
      const op = url.split('/').pop();
      return ops[op] ? ops[op](JSON.parse(opts.body)) : reply({ success: true, state: initial, result: null });
    }
    return reply({ success: true, state: initial, result: null });
  });
}

const postsTo = (op) =>
  global.fetch.mock.calls.filter(([url, opts]) => opts && opts.method === 'POST' && url.endsWith(`/${op}`));

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the AVL tree with balance factors and the section figures', async () => {
  serve(full);
  render(<BalancedTreesView />);
  const node = await screen.findByTestId('balanced-trees-node-20');
  expect(node).toHaveAccessibleName('20, balance 0');
  expect(screen.getByTestId('balanced-trees-node-10')).toBeInTheDocument();
  expect(screen.getByText(/Nodes: 3/)).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'About 1.44 log₂ n' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'At most 2 log₂(n + 1)' })).toBeInTheDocument();
  expect(screen.getByText(/O\(log n\)/)).toBeInTheDocument();
});

test('toggling to red-black draws colors and sends red-black ops', async () => {
  serve(full, {
    'rb-insert': () =>
      reply({ success: true, state: full, result: { value: 5, steps: [], rotations: 0 } }),
  });
  render(<BalancedTreesView />);
  await screen.findByTestId('balanced-trees-node-20');
  const toggle = screen.getByRole('button', { name: 'Red-black' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('balanced-trees-node-20')).toHaveAccessibleName('20, black');
  expect(screen.getByTestId('balanced-trees-node-10')).toHaveAccessibleName('10, red');
  expect(screen.getByText(/Black height: 1/)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText('Value'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Insert' }));
  await waitFor(() => expect(postsTo('rb-insert')).toHaveLength(1));
  expect(JSON.parse(postsTo('rb-insert')[0][1].body)).toEqual({ value: 5 });
});

test('insert shows the rotation steps and steps back through the pictures', async () => {
  const steps = [
    { kind: 'start', text: 'Before inserting 10.', tree: avlNode(30, 1, avlNode(20, 0)) },
    {
      kind: 'imbalance',
      text: '30 has balance +2: left-left case.',
      pivot: 30,
      case: 'left-left',
      tree: avlNode(30, 2, avlNode(20, 1, avlNode(10, 0))),
    },
    {
      kind: 'rotate',
      text: 'Rotate right at 30: 20 moves up.',
      pivot: 30,
      direction: 'right',
      tree: avlNode(20, 0, avlNode(10, 0), avlNode(30, 0)),
    },
  ];
  serve(full, {
    'avl-insert': () =>
      reply({ success: true, state: full, result: { value: 10, steps, rotations: 1 } }),
  });
  render(<BalancedTreesView />);
  await screen.findByTestId('balanced-trees-node-20');
  await userEvent.type(screen.getByLabelText('Value'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Insert' }));

  expect(await screen.findByText(/Inserted 10 with 1 rotation\./)).toBeInTheDocument();
  expect(screen.getByText('Rotate right at 30: 20 moves up.')).toBeInTheDocument();
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  expect(screen.getByTestId('balanced-trees-node-20')).toHaveClass('balanced-trees-node');
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: 'Previous step' }));
  expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  expect(screen.getByTestId('balanced-trees-node-30')).toHaveAccessibleName('30, balance +2');
  expect(screen.getByTestId('balanced-trees-node-30')).toHaveClass('balanced-trees-node-unbalanced');
  expect(screen.getByTestId('balanced-trees-node-30')).toHaveClass('balanced-trees-node-mark');

  await userEvent.click(screen.getByRole('button', { name: /Before inserting 10/ }));
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  expect(screen.queryByTestId('balanced-trees-node-10')).not.toBeInTheDocument();
});

test('shows the server error and rejects a non-number before sending', async () => {
  serve(full, {
    'avl-delete': () => reply({ success: false, error: '99 is not in the tree', state: full }, false),
  });
  render(<BalancedTreesView />);
  await screen.findByTestId('balanced-trees-node-20');

  await userEvent.type(screen.getByLabelText('Value'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Value must be a whole number');
  expect(postsTo('avl-delete')).toHaveLength(0);

  await userEvent.clear(screen.getByLabelText('Value'));
  await userEvent.type(screen.getByLabelText('Value'), '99');
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(await screen.findByText('99 is not in the tree')).toBeInTheDocument();
});

test('shows a load error and the empty and loading states', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  const { unmount } = render(<BalancedTreesView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load/);
  unmount();

  global.fetch.mockImplementation(() => new Promise(() => {}));
  const { unmount: unmountPending } = render(<BalancedTreesView />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  unmountPending();

  serve(empty);
  render(<BalancedTreesView />);
  expect(await screen.findByText('Tree is empty.')).toBeInTheDocument();
});

test('search marks the path and reports the outcome', async () => {
  serve(full, {
    'avl-search': () =>
      reply({ success: true, state: full, result: { value: 10, found: true, path: [20, 10] } }),
  });
  render(<BalancedTreesView />);
  await screen.findByTestId('balanced-trees-node-20');
  await userEvent.type(screen.getByLabelText('Value'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByText('Found 10. Path: 20 > 10')).toBeInTheDocument();
  expect(screen.getByTestId('balanced-trees-node-10')).toHaveClass('balanced-trees-node-mark');
});

test('build, clear and reset send the expected ops', async () => {
  serve(full, {
    'avl-build': (payload) =>
      reply({
        success: true,
        state: payload.values.length ? full : empty,
        result: { count: payload.values.length, rotations: 1 },
      }),
  });
  render(<BalancedTreesView />);
  await screen.findByTestId('balanced-trees-node-20');
  const list = screen.getByLabelText('Values');
  await userEvent.clear(list);
  await userEvent.type(list, '1, 2, 3');
  await userEvent.click(screen.getByRole('button', { name: 'Build' }));
  expect(await screen.findByText(/Built a tree of 3 nodes/)).toBeInTheDocument();
  expect(JSON.parse(postsTo('avl-build')[0][1].body)).toEqual({ values: [1, 2, 3] });

  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(await screen.findByText('Tree is empty.')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Reset both' }));
  expect(await screen.findByText('Reset both trees.')).toBeInTheDocument();
  expect(postsTo('reset')).toHaveLength(1);

  await userEvent.clear(list);
  await userEvent.type(list, '1, x');
  await userEvent.click(screen.getByRole('button', { name: 'Build' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/whole numbers separated by commas/);
});

test('imbalance case buttons appear only for AVL and send the case', async () => {
  serve(full, {
    'avl-case': () =>
      reply({
        success: true,
        state: full,
        result: {
          case: 'left-right',
          rotations: 2,
          steps: [{ kind: 'start', text: 'Before inserting 20.', tree: avlNode(30, 1, avlNode(10, 0)) }],
        },
      }),
  });
  render(<BalancedTreesView />);
  await screen.findByTestId('balanced-trees-node-20');
  await userEvent.click(screen.getByRole('button', { name: 'Show left-right' }));
  await waitFor(() => expect(postsTo('avl-case')).toHaveLength(1));
  expect(JSON.parse(postsTo('avl-case')[0][1].body)).toEqual({ case: 'left-right' });
  expect(await screen.findByText(/Left-right case: 2 rotations\./)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Red-black' }));
  expect(screen.queryByRole('button', { name: 'Show left-right' })).not.toBeInTheDocument();
  expect(screen.queryByText('Before inserting 20.')).not.toBeInTheDocument();
});

test('rotation demo draws before and after', async () => {
  const before = avlNode(4, 1, avlNode(2, 0, avlNode(1, 0), avlNode(3, 0)), avlNode(5, 0));
  const after = avlNode(2, -1, avlNode(1, 0), avlNode(4, 0, avlNode(3, 0), avlNode(5, 0)));
  serve(full, {
    rotate: () =>
      reply({
        success: true,
        state: full,
        result: { direction: 'right', before, after, inorder: [1, 2, 3, 4, 5] },
      }),
  });
  render(<BalancedTreesView />);
  await screen.findByTestId('balanced-trees-node-20');
  await userEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
  expect(await screen.findByRole('img', { name: 'Tree before rotating right' })).toBeInTheDocument();
  const shown = screen.getByRole('img', { name: 'Tree after rotating right' });
  expect(within(shown).getByText('4')).toBeInTheDocument();
  expect(screen.getByText(/Sorted order stays 1, 2, 3, 4, 5/)).toBeInTheDocument();
});

test('compare shows both trees in a table', async () => {
  const side = (height, ins, del) => ({
    height,
    height_bound: 4,
    insert_rotations: ins,
    delete_rotations: del,
  });
  serve(full, {
    compare: () =>
      reply({
        success: true,
        state: full,
        result: { count: 7, avl: side(3, 4, 2), rb: side(4, 3, 1) },
      }),
  });
  render(<BalancedTreesView />);
  await screen.findByTestId('balanced-trees-node-20');
  await userEvent.click(screen.getByRole('button', { name: 'Compare both' }));
  const table = await screen.findByRole('table', { name: /Comparison/ });
  const avlRow = within(table).getByRole('row', { name: /^AVL/ });
  expect(avlRow).toHaveTextContent('AVL3424');
  expect(within(table).getByRole('row', { name: /^Red-black/ })).toHaveTextContent('Red-black4314');
});
