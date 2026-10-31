import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FibonacciHeapView from './FibonacciHeapView';

const node = (id, key, children = [], mark = false) => ({
  id,
  key,
  degree: children.length,
  mark,
  children,
});

const heapOf = (roots, min = roots[0]) => {
  const all = [];
  const walk = (item) => {
    all.push(item);
    const { children } = item;
    children.forEach(walk);
  };
  roots.forEach(walk);
  const marked = all.filter((n) => n.mark).length;
  return {
    size: all.length,
    min_id: min ? min.id : null,
    min_key: min ? min.key : null,
    trees: roots.length,
    marked,
    potential: roots.length + 2 * marked,
    roots,
  };
};

const limits = { max_items: 63 };
const base = {
  heap: heapOf([
    node(1, 3, [node(2, 7), node(3, 30, [node(4, 46, [], true)])]),
    node(5, 45),
  ]),
  other: heapOf([node(6, 5), node(7, 12)]),
  limits,
};
const empty = { heap: heapOf([]), other: heapOf([]), limits };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('shows loading before the state arrives', async () => {
  global.fetch.mockImplementation(() => new Promise(() => {}));
  render(<FibonacciHeapView />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

test('draws the root list, trees, min pointer and marked nodes', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<FibonacciHeapView />);
  const a = await screen.findByTestId('fibonacci-heap-a');
  expect(within(a).getAllByTestId('fibonacci-heap-node')).toHaveLength(5);
  expect(within(a).getAllByTestId('fibonacci-heap-edge')).toHaveLength(3);
  expect(within(a).getAllByTestId('fibonacci-heap-root-link')).toHaveLength(1);
  expect(within(a).getByTestId('fibonacci-heap-root-wrap')).toBeInTheDocument();
  expect(within(a).getByText('min')).toBeInTheDocument();
  expect(within(a).getByRole('button', { name: 'Node 3, minimum' })).toBeInTheDocument();
  expect(within(a).getByRole('button', { name: 'Node 46, marked' })).toBeInTheDocument();

  const b = screen.getByTestId('fibonacci-heap-b');
  expect(within(b).getAllByTestId('fibonacci-heap-node')).toHaveLength(2);

  expect(screen.getByTestId('fibonacci-heap-stats-a')).toHaveTextContent('5 nodes');
  expect(screen.getByTestId('fibonacci-heap-stats-a')).toHaveTextContent('2 trees');
  expect(screen.getByTestId('fibonacci-heap-stats-a')).toHaveTextContent('1 marked');
  expect(screen.getByTestId('fibonacci-heap-stats-a')).toHaveTextContent('4');
  expect(screen.getByText(/O\(1\) amortized decrease-key/)).toBeInTheDocument();
});

test('a single root draws no root links', async () => {
  const one = { ...base, heap: heapOf([node(1, 3)]) };
  global.fetch.mockImplementation(() => reply({ success: true, state: one, result: null }));
  render(<FibonacciHeapView />);
  const a = await screen.findByTestId('fibonacci-heap-a');
  expect(within(a).queryByTestId('fibonacci-heap-root-link')).toBeNull();
  expect(within(a).queryByTestId('fibonacci-heap-root-wrap')).toBeNull();
});

test('shows empty messages and no selectable nodes', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<FibonacciHeapView />);
  expect(await screen.findByText('Heap A is empty.')).toBeInTheDocument();
  expect(screen.getByText('Heap B is empty.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Decrease key' })).toBeDisabled();
});

test('insert posts the value and shows the result', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: { id: 8, key: 9 } }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.type(screen.getByLabelText('Key to insert'), '9');
  await userEvent.click(screen.getByRole('button', { name: 'Insert into A' }));
  expect(await screen.findByText(/Inserted 9 into heap A/)).toBeInTheDocument();
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/\/fibonacci-heap\/insert$/);
  expect(JSON.parse(opts.body)).toEqual({ value: 9 });
});

test('insert into B uses its own route', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: { id: 8, key: 2 } }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.type(screen.getByLabelText('Key to insert'), '2');
  await userEvent.click(screen.getByRole('button', { name: 'Insert into B' }));
  expect(await screen.findByText(/Inserted 2 into heap B/)).toBeInTheDocument();
  expect(global.fetch.mock.calls[1][0]).toMatch(/\/fibonacci-heap\/other-insert$/);
});

test('rejects a non-numeric key locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.type(screen.getByLabelText('Key to insert'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Insert into A' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('find-min reports the key', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: { id: 1, key: 3 } }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.click(screen.getByRole('button', { name: 'Find min' }));
  expect(await screen.findByText(/Minimum: 3/)).toBeInTheDocument();
});

test('extract-min lists the consolidation links', async () => {
  const result = {
    id: 1,
    key: 3,
    links: [{ child_key: 45, parent_key: 7, degree: 0 }],
  };
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.click(screen.getByRole('button', { name: 'Extract min' }));
  expect(await screen.findByText(/Extracted 3/)).toBeInTheDocument();
  expect(screen.getByTestId('fibonacci-heap-steps')).toHaveTextContent(
    'Linked 45 under 7 (both had degree 0)'
  );
});

test('decrease-key via a clicked node posts the id and lists cuts', async () => {
  const result = {
    id: 4,
    key: 1,
    old_key: 46,
    cuts: [
      { key: 1, old_key: 46, parent_key: 30, cascading: false },
      { key: 30, old_key: 30, parent_key: 3, cascading: true },
    ],
    marked: 7,
  };
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.click(screen.getByRole('button', { name: 'Node 46, marked' }));
  expect(screen.getByLabelText('Node to decrease')).toHaveValue('4');
  await userEvent.type(screen.getByLabelText('New key'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Decrease key' }));
  expect(await screen.findByText(/Decreased 46 to 1/)).toBeInTheDocument();
  const steps = screen.getByTestId('fibonacci-heap-steps');
  expect(steps).toHaveTextContent('Cut 1 from parent 30');
  expect(steps).toHaveTextContent('Cascading cut: 30 from parent 3');
  expect(steps).toHaveTextContent('Marked 7');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/\/fibonacci-heap\/decrease-key$/);
  expect(JSON.parse(opts.body)).toEqual({ id: 4, key: 1 });
});

test('decrease-key that keeps heap order says so', async () => {
  const result = { id: 2, key: 5, old_key: 7, cuts: [], marked: null };
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.selectOptions(screen.getByLabelText('Node to decrease'), '2');
  await userEvent.type(screen.getByLabelText('New key'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Decrease key' }));
  expect(await screen.findByText(/heap order still holds/i)).toBeInTheDocument();
});

test('decrease-key needs a whole number', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.selectOptions(screen.getByLabelText('Node to decrease'), '2');
  await userEvent.click(screen.getByRole('button', { name: 'Decrease key' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('a selection is dropped once its node is gone', async () => {
  const after = { ...base, heap: heapOf([node(5, 45)]) };
  const result = { id: 1, key: 3, links: [] };
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: after, result }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.selectOptions(screen.getByLabelText('Node to decrease'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Extract min' }));
  await screen.findByText(/Extracted 3/);
  expect(screen.getByLabelText('Node to decrease')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Decrease key' })).toBeDisabled();
});

test('merge posts and reports what moved', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: { moved: 2, size: 7 } }));
  render(<FibonacciHeapView />);
  await screen.findByTestId('fibonacci-heap-a');
  await userEvent.click(screen.getByRole('button', { name: 'Merge B into A' }));
  expect(await screen.findByText(/Moved 2 node/)).toBeInTheDocument();
  expect(global.fetch.mock.calls[1][0]).toMatch(/\/fibonacci-heap\/merge$/);
});

test('shows a backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'heap is empty', state: empty }, false));
  render(<FibonacciHeapView />);
  await screen.findByText('Heap A is empty.');
  await userEvent.click(screen.getByRole('button', { name: 'Extract min' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('heap is empty'));
});

test('shows a load failure', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<FibonacciHeapView />);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not load data'));
});

test('reset posts to the reset route', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }));
  render(<FibonacciHeapView />);
  await screen.findByText('Heap A is empty.');
  await userEvent.click(screen.getByRole('button', { name: 'Reset all' }));
  await screen.findByTestId('fibonacci-heap-a');
  expect(global.fetch.mock.calls[1][0]).toMatch(/\/fibonacci-heap\/reset$/);
});
