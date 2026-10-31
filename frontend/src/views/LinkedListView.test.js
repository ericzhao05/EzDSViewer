import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkedListView from './LinkedListView';

const list = { values: [1, 2, 3], length: 3, cycle_to: null };
const empty = { values: [], length: 0, cycle_to: null };
const cyclic = { values: [1, 2, 3], length: 3, cycle_to: 1 };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws nodes with head, tail and null', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: list, result: null }));
  render(<LinkedListView />);
  expect(await screen.findByTestId('node-0')).toHaveTextContent('head');
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByTestId('node-2')).toHaveTextContent('tail');
  expect(screen.getByTestId('list-end')).toHaveTextContent('null');
});

test('shows cycle target', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: cyclic, result: null }));
  render(<LinkedListView />);
  expect(await screen.findByTestId('list-end')).toHaveTextContent('node 1');
  expect(screen.getByText(/tail points back to index 1/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<LinkedListView />);
  expect(await screen.findByText(/Linked list is empty/)).toBeInTheDocument();
});

test('push back sends request and redraws', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: { values: [7], length: 1, cycle_to: null }, result: null })
    );
  render(<LinkedListView />);
  await screen.findByText(/Linked list is empty/);
  await userEvent.type(screen.getByLabelText('Value'), '7');
  await userEvent.click(screen.getByRole('button', { name: 'Push back' }));
  expect(await screen.findByTestId('node-0')).toHaveTextContent('7');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/linked-list\/push-back$/);
  expect(JSON.parse(opts.body)).toEqual({ value: 7 });
});

test('find shows result message', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: list, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: list, result: { found: true, index: 2 } })
    );
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  await userEvent.type(screen.getByLabelText('Value'), '3');
  await userEvent.click(screen.getByRole('button', { name: 'Find value' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Found at index 2');
});

test('rejects non-integer input locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: list, result: null }));
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  await userEvent.type(screen.getByLabelText('Value'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Push front' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Value must be a whole number');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: list, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: false, error: 'index must be between 0 and 2', state: list }, false)
    );
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  await userEvent.type(screen.getByLabelText('Index'), '9');
  await userEvent.click(screen.getByRole('button', { name: 'Delete at index' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('index must be between 0 and 2');
});

// Doubly linked list: these mocks copy the shapes returned by /linked-list/doubly.
const dnode = (id, value, prev, next) => ({ id, value, prev, next });
const dstate = (nodes) => ({
  values: nodes.map((n) => n.value),
  length: nodes.length,
  head: nodes.length ? nodes[0].id : null,
  tail: nodes.length ? nodes[nodes.length - 1].id : null,
  nodes,
});
const threeNodes = dstate([dnode(1, 10, null, 2), dnode(2, 20, 1, 3), dnode(3, 30, 2, null)]);
const twoNodes = dstate([dnode(1, 10, null, 3), dnode(3, 30, 1, null)]);
const fourNodes = dstate([
  dnode(1, 10, null, 2),
  dnode(2, 20, 1, 6),
  dnode(6, 99, 2, 3),
  dnode(3, 30, 6, null),
]);
const emptyDoubly = dstate([]);

// Routes requests by URL, so each test states exactly what each operation answers.
const serve = (singly, doubly, posts = {}) => {
  global.fetch.mockImplementation((url, opts) => {
    if (opts && opts.method === 'POST') {
      const op = url.split('/').pop();
      if (posts[op]) return reply(posts[op], posts[op].success);
      throw new Error(`Unexpected POST ${url}`);
    }
    return reply({ success: true, state: url.endsWith('/doubly') ? doubly : singly, result: null });
  });
};
const posted = () => global.fetch.mock.calls.filter(([, o]) => o && o.method === 'POST');
const toDoubly = async () => {
  await screen.findByTestId('node-0');
  userEvent.click(screen.getByRole('button', { name: 'Doubly' }));
  return screen.findByTestId('dnode-1');
};

test('starts on singly and only loads the singly state', async () => {
  serve(list, threeNodes);
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  expect(screen.getByRole('button', { name: 'Singly' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Doubly' })).toHaveAttribute('aria-pressed', 'false');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toMatch(/linked-list$/);
  expect(screen.queryByTestId('dnode-1')).not.toBeInTheDocument();
});

test('toggle switches to doubly and back', async () => {
  serve(list, threeNodes);
  render(<LinkedListView />);
  await toDoubly();
  expect(global.fetch.mock.calls[1][0]).toMatch(/linked-list\/doubly$/);
  expect(screen.getByRole('button', { name: 'Doubly' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Linked List Visualization');
  expect(screen.queryByRole('button', { name: 'Reverse' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Singly' }));
  expect(await screen.findByTestId('node-0')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reverse' })).toBeInTheDocument();
  expect(screen.queryByTestId('dnode-1')).not.toBeInTheDocument();
});

test('doubly draws prev and next pointers, head and tail', async () => {
  serve(list, threeNodes);
  render(<LinkedListView />);
  await toDoubly();
  expect(screen.getByTestId('dnode-1-prev')).toHaveTextContent('prev null');
  expect(screen.getByTestId('dnode-1-next')).toHaveTextContent('next #2');
  expect(screen.getByTestId('dnode-2-prev')).toHaveTextContent('prev #1');
  expect(screen.getByTestId('dnode-2-next')).toHaveTextContent('next #3');
  expect(screen.getByTestId('dnode-3-prev')).toHaveTextContent('prev #2');
  expect(screen.getByTestId('dnode-3-next')).toHaveTextContent('next null');
  expect(screen.getByTestId('dnode-1')).toHaveTextContent('head');
  expect(screen.getByTestId('dnode-1')).not.toHaveTextContent('tail');
  expect(screen.getByTestId('dnode-3')).toHaveTextContent('tail');
  expect(screen.getByTestId('dnode-2')).toHaveTextContent('20');
  // A link in each direction between neighbours, none after the tail.
  expect(screen.getByTestId('dlink-1')).toHaveTextContent('→');
  expect(screen.getByTestId('dlink-1')).toHaveTextContent('←');
  expect(screen.queryByTestId('dlink-3')).not.toBeInTheDocument();
});

test('doubly shows the figures from ds.md', async () => {
  serve(list, threeNodes);
  render(<LinkedListView />);
  await toDoubly();
  const text = screen.getByTestId('doubly-complexity').textContent;
  expect(text).toContain('Access: O(n)');
  expect(text).toContain('Search: O(n)');
  expect(text).toContain('Insert: O(1) at a known node');
  expect(text).toContain('Delete: O(1) at a known node');
  expect(text).toContain('Space: O(n)');
});

test('doubly shows an empty message and no nodes', async () => {
  serve(list, emptyDoubly);
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  userEvent.click(screen.getByRole('button', { name: 'Doubly' }));
  expect(await screen.findByText(/Doubly linked list is empty/)).toBeInTheDocument();
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
});

test('doubly push sends the value and redraws', async () => {
  const pushed = dstate([dnode(1, 10, null, 2), dnode(2, 20, 1, 3), dnode(3, 30, 2, 6), dnode(6, 7, 3, null)]);
  serve(list, threeNodes, { 'push-back': { success: true, state: pushed, result: { node: 6 } } });
  render(<LinkedListView />);
  await toDoubly();
  userEvent.type(screen.getByLabelText('Value'), '7');
  userEvent.click(screen.getByRole('button', { name: 'Push back' }));
  expect(await screen.findByTestId('dnode-6')).toHaveTextContent('tail');
  const [url, opts] = posted()[0];
  expect(url).toMatch(/linked-list\/doubly\/push-back$/);
  expect(JSON.parse(opts.body)).toEqual({ value: 7 });
  expect(screen.getByTestId('dnode-6')).toHaveClass('linked-list-highlight');
});

test('doubly pop reports the removed value', async () => {
  const popped = dstate([dnode(2, 20, null, 3), dnode(3, 30, 2, null)]);
  serve(list, threeNodes, { 'pop-front': { success: true, state: popped, result: { removed: 10, node: 1 } } });
  render(<LinkedListView />);
  await toDoubly();
  userEvent.click(screen.getByRole('button', { name: 'Pop front' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Removed value 10');
  expect(screen.queryByTestId('dnode-1')).not.toBeInTheDocument();
  expect(screen.getByTestId('dnode-2')).toHaveTextContent('head');
  expect(posted()[0][0]).toMatch(/linked-list\/doubly\/pop-front$/);
});

test('insert after and delete need a selected node', async () => {
  serve(list, threeNodes);
  render(<LinkedListView />);
  await toDoubly();
  userEvent.type(screen.getByLabelText('Value'), '9');
  userEvent.click(screen.getByRole('button', { name: 'Insert after selected' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Select a node first');
  userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Select a node first');
  expect(posted()).toHaveLength(0);
  userEvent.click(screen.getByRole('button', { name: 'Select node #1, value 10' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('insert after addresses the selected node by id', async () => {
  serve(list, threeNodes, { 'insert-after': { success: true, state: fourNodes, result: { node: 6, after: 2 } } });
  render(<LinkedListView />);
  await toDoubly();
  const pick = screen.getByRole('button', { name: 'Select node #2, value 20' });
  userEvent.click(pick);
  expect(pick).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('doubly-selected')).toHaveTextContent('#2');
  userEvent.type(screen.getByLabelText('Value'), '99');
  userEvent.click(screen.getByRole('button', { name: 'Insert after selected' }));
  expect(await screen.findByTestId('dnode-6')).toHaveTextContent('99');
  expect(screen.getByTestId('dnode-6-prev')).toHaveTextContent('prev #2');
  expect(screen.getByTestId('dnode-6-next')).toHaveTextContent('next #3');
  expect(screen.getByRole('status')).toHaveTextContent('Inserted node #6 after node #2');
  expect(JSON.parse(posted()[0][1].body)).toEqual({ node: 2, value: 99 });
});

test('deleting the selected node drops the selection and redraws pointers', async () => {
  serve(list, threeNodes, { delete: { success: true, state: twoNodes, result: { removed: 20, node: 2 } } });
  render(<LinkedListView />);
  await toDoubly();
  userEvent.click(screen.getByRole('button', { name: 'Select node #2, value 20' }));
  userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Removed value 20');
  expect(JSON.parse(posted()[0][1].body)).toEqual({ node: 2 });
  expect(screen.queryByTestId('dnode-2')).not.toBeInTheDocument();
  expect(screen.getByTestId('dnode-1-next')).toHaveTextContent('next #3');
  expect(screen.getByTestId('dnode-3-prev')).toHaveTextContent('prev #1');
  expect(screen.getByTestId('doubly-selected')).toHaveTextContent('none');
  userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Select a node first');
  expect(posted()).toHaveLength(1);
});

test('clicking the selected node again deselects it', async () => {
  serve(list, threeNodes);
  render(<LinkedListView />);
  await toDoubly();
  const pick = screen.getByRole('button', { name: 'Select node #2, value 20' });
  userEvent.click(pick);
  userEvent.click(pick);
  expect(pick).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByTestId('doubly-selected')).toHaveTextContent('none');
});

test('doubly find highlights the node', async () => {
  serve(list, threeNodes, { find: { success: true, state: threeNodes, result: { found: true, node: 3, index: 2 } } });
  render(<LinkedListView />);
  await toDoubly();
  userEvent.type(screen.getByLabelText('Value'), '30');
  userEvent.click(screen.getByRole('button', { name: 'Find value' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Found at index 2 (node #3)');
  expect(screen.getByTestId('dnode-3')).toHaveClass('linked-list-highlight');
  expect(JSON.parse(posted()[0][1].body)).toEqual({ value: 30 });
});

test('doubly find reports a missing value', async () => {
  serve(list, threeNodes, { find: { success: true, state: threeNodes, result: { found: false, node: null, index: null } } });
  render(<LinkedListView />);
  await toDoubly();
  userEvent.type(screen.getByLabelText('Value'), '5');
  userEvent.click(screen.getByRole('button', { name: 'Find value' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Value not found');
});

test('traversal shows each direction', async () => {
  serve(list, threeNodes, {
    'traverse-forward': {
      success: true,
      state: threeNodes,
      result: { direction: 'forward', values: [10, 20, 30], nodes: [1, 2, 3] },
    },
    'traverse-backward': {
      success: true,
      state: threeNodes,
      result: { direction: 'backward', values: [30, 20, 10], nodes: [3, 2, 1] },
    },
  });
  render(<LinkedListView />);
  await toDoubly();
  userEvent.click(screen.getByRole('button', { name: 'Traverse forward' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Forward from head: 10 → 20 → 30');
  userEvent.click(screen.getByRole('button', { name: 'Traverse backward' }));
  expect(await screen.findByText('Backward from tail: 30 → 20 → 10')).toBeInTheDocument();
});

test('doubly reset clears the selection', async () => {
  serve(list, twoNodes, { reset: { success: true, state: threeNodes, result: null } });
  render(<LinkedListView />);
  await toDoubly();
  userEvent.click(screen.getByRole('button', { name: 'Select node #1, value 10' }));
  userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(await screen.findByTestId('dnode-2')).toBeInTheDocument();
  expect(screen.getByTestId('doubly-selected')).toHaveTextContent('none');
  expect(posted()[0][0]).toMatch(/linked-list\/doubly\/reset$/);
});

test('doubly rejects non-integer input locally', async () => {
  serve(list, threeNodes);
  render(<LinkedListView />);
  await toDoubly();
  userEvent.type(screen.getByLabelText('Value'), 'abc');
  userEvent.click(screen.getByRole('button', { name: 'Push front' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Value must be a whole number');
  expect(posted()).toHaveLength(0);
});

test('doubly shows a backend error and keeps the drawing', async () => {
  serve(list, threeNodes, { 'pop-back': { success: false, error: 'List is empty', state: threeNodes } });
  render(<LinkedListView />);
  await toDoubly();
  userEvent.click(screen.getByRole('button', { name: 'Pop back' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('List is empty');
  expect(screen.getByTestId('dnode-1')).toBeInTheDocument();
});

test('doubly shows a load failure', async () => {
  global.fetch.mockImplementation((url) =>
    url.endsWith('/doubly')
      ? Promise.reject(new Error('down'))
      : reply({ success: true, state: list, result: null })
  );
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  userEvent.click(screen.getByRole('button', { name: 'Doubly' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load data');
});

test('controls and the toggle are disabled while an operation runs', async () => {
  let finish;
  global.fetch.mockImplementation((url, opts) =>
    opts && opts.method === 'POST'
      ? new Promise((resolve) => {
          finish = () => resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, state: threeNodes, result: { removed: 1, node: 9 } }) });
        })
      : reply({ success: true, state: url.endsWith('/doubly') ? threeNodes : list, result: null })
  );
  render(<LinkedListView />);
  await toDoubly();
  userEvent.click(screen.getByRole('button', { name: 'Pop front' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Singly' })).toBeDisabled());
  expect(screen.getByRole('button', { name: 'Pop back' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Select node #2, value 20' })).toBeDisabled();
  finish();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Singly' })).toBeEnabled());
});
