import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrieView from './TrieView';

const leaf = (char, is_word = true) => ({ char, is_word, children: [] });
const state = {
  tree: {
    char: '',
    is_word: false,
    children: [
      { char: 'c', is_word: false, children: [{ char: 'a', is_word: false, children: [leaf('r'), leaf('t')] }] },
    ],
  },
  words: ['car', 'cat'],
  limits: { max_words: 40, max_length: 16 },
};
const emptyState = { tree: { char: '', is_word: false, children: [] }, words: [], limits: {} };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws nodes and stored words', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<TrieView />);
  expect(await screen.findByTestId('trie-node-car')).toBeInTheDocument();
  expect(screen.getByTestId('trie-node-ca')).toBeInTheDocument();
  expect(screen.getByLabelText('Stored words')).toHaveTextContent('car, cat');
  expect(screen.getByText(/O\(L\)/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: emptyState, result: null }));
  render(<TrieView />);
  expect(await screen.findByText(/trie is empty/i)).toBeInTheDocument();
});

test('search sends the word and shows the result', async () => {
  global.fetch.mockImplementation((url, opts) =>
    reply({
      success: true,
      state,
      result: opts && opts.method === 'POST' ? { word: 'ca', found: false, matched: 2 } : null,
    })
  );
  render(<TrieView />);
  await screen.findByTestId('trie-node-car');
  userEvent.type(screen.getByLabelText('Word or prefix'), 'ca');
  userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByRole('status')).toHaveTextContent('only a prefix');
  const call = global.fetch.mock.calls.find(([, o]) => o && o.method === 'POST');
  expect(call[0]).toContain('/trie/search');
  expect(JSON.parse(call[1].body)).toEqual({ word: 'ca' });
});

test('requires input before an operation', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<TrieView />);
  await screen.findByTestId('trie-node-car');
  userEvent.click(screen.getByRole('button', { name: 'Insert' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a word');
});

test('shows a backend error', async () => {
  global.fetch.mockImplementation((url, opts) =>
    opts && opts.method === 'POST'
      ? reply({ success: false, error: 'word must be 1 to 16 letters (a to z)', state }, false)
      : reply({ success: true, state, result: null })
  );
  render(<TrieView />);
  await screen.findByTestId('trie-node-car');
  userEvent.type(screen.getByLabelText('Word or prefix'), 'a1');
  userEvent.click(screen.getByRole('button', { name: 'Insert' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('letters'));
});

// Delete: these mocks copy the shapes returned by POST /trie/delete.
const wordLeaf = (char, children = []) => ({ char, is_word: true, children });
const treeOf = (...children) => ({ char: '', is_word: false, children });
const stateOf = (tree, words) => ({ tree, words, limits: { max_words: 40, max_length: 16 } });
const car = { char: 'c', is_word: false, children: [{ char: 'a', is_word: false, children: [wordLeaf('r', [leaf('d')])] }] };
const carPruned = { char: 'c', is_word: false, children: [{ char: 'a', is_word: false, children: [wordLeaf('r')] }] };
const carUnmarked = {
  char: 'c',
  is_word: false,
  children: [{ char: 'a', is_word: false, children: [{ char: 'r', is_word: false, children: [leaf('d')] }] }],
};
const carAndCard = stateOf(treeOf(car), ['car', 'card']);

const serveDelete = (before, after, result, extra = {}) => {
  global.fetch.mockImplementation((url, opts) => {
    if (opts && opts.method === 'POST') {
      if (url.endsWith('/delete')) return reply({ success: true, state: after, result });
      const op = url.split('/').pop();
      if (extra[op]) return reply({ success: true, state: before, result: extra[op] });
      throw new Error(`Unexpected POST ${url}`);
    }
    return reply({ success: true, state: before, result: null });
  });
};
const type = (text) => {
  const box = screen.getByLabelText('Word or prefix');
  userEvent.clear(box);
  userEvent.type(box, text);
};
const click = (name) => userEvent.click(screen.getByRole('button', { name }));
const hot = () =>
  ['root', 'c', 'ca', 'car'].filter((path) => {
    const node = screen.getByTestId(`trie-node-${path}`);
    return node.classList.contains('trie-hot');
  }).length;

test('delete sends the word, shows the result and draws the pruned tree', async () => {
  serveDelete(carAndCard, stateOf(treeOf(carPruned), ['car']), {
    word: 'card',
    deleted: true,
    pruned: 1,
    matched: 3,
  });
  render(<TrieView />);
  await screen.findByTestId('trie-node-card');
  type('card');
  click('Delete');
  expect(await screen.findByRole('status')).toHaveTextContent('Deleted "card": pruned 1 node');
  expect(screen.queryByTestId('trie-node-card')).not.toBeInTheDocument();
  expect(screen.getByTestId('trie-node-car')).toBeInTheDocument();
  expect(screen.getByLabelText('Stored words')).toHaveTextContent('Stored words (1): car');
  const call = global.fetch.mock.calls.find(([, o]) => o && o.method === 'POST');
  expect(call[0]).toMatch(/\/trie\/delete$/);
  expect(JSON.parse(call[1].body)).toEqual({ word: 'card' });
});

test('deleting a prefix word only unmarks its node', async () => {
  serveDelete(carAndCard, stateOf(treeOf(carUnmarked), ['card']), {
    word: 'car',
    deleted: true,
    pruned: 0,
    matched: 3,
  });
  render(<TrieView />);
  await screen.findByTestId('trie-node-card');
  expect(screen.getByTestId('trie-node-car')).toHaveClass('trie-word');
  type('car');
  click('Delete');
  expect(await screen.findByRole('status')).toHaveTextContent('no nodes pruned');
  expect(screen.getByTestId('trie-node-car')).not.toHaveClass('trie-word');
  expect(screen.getByTestId('trie-node-card')).toBeInTheDocument();
});

test('delete clears a highlight that pointed at removed nodes', async () => {
  serveDelete(
    carAndCard,
    stateOf(treeOf(carPruned), ['car']),
    { word: 'card', deleted: true, pruned: 1, matched: 3 },
    { search: { word: 'card', found: true, matched: 4 } }
  );
  render(<TrieView />);
  await screen.findByTestId('trie-node-card');
  type('card');
  click('Search');
  await screen.findByRole('status');
  expect(screen.getByTestId('trie-node-card')).toHaveClass('trie-hot');
  click('Delete');
  await screen.findByText(/Deleted "card"/);
  expect(hot()).toBe(0);
});

test('delete also clears the highlight when it fails', async () => {
  global.fetch.mockImplementation((url, opts) => {
    if (opts && opts.method === 'POST') {
      return url.endsWith('/search')
        ? reply({ success: true, state: carAndCard, result: { word: 'card', found: true, matched: 4 } })
        : reply({ success: false, error: 'word must be 1 to 16 letters (a to z)', state: carAndCard }, false);
    }
    return reply({ success: true, state: carAndCard, result: null });
  });
  render(<TrieView />);
  await screen.findByTestId('trie-node-card');
  type('card');
  click('Search');
  await screen.findByRole('status');
  expect(hot()).toBeGreaterThan(0);
  type('a1');
  click('Delete');
  expect(await screen.findByRole('alert')).toHaveTextContent('letters');
  expect(hot()).toBe(0);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('deleting an absent word says so and marks how far the path goes', async () => {
  serveDelete(carAndCard, carAndCard, { word: 'cat', deleted: false, pruned: 0, matched: 2 });
  render(<TrieView />);
  await screen.findByTestId('trie-node-card');
  type('cat');
  click('Delete');
  expect(await screen.findByRole('status')).toHaveTextContent('"cat" is not stored, so nothing was deleted');
  expect(screen.getByTestId('trie-node-ca')).toHaveClass('trie-hot');
  expect(screen.getByTestId('trie-node-car')).not.toHaveClass('trie-hot');
});

test('deleting a mere prefix says so', async () => {
  serveDelete(carAndCard, carAndCard, { word: 'ca', deleted: false, pruned: 0, matched: 2 });
  render(<TrieView />);
  await screen.findByTestId('trie-node-card');
  type('ca');
  click('Delete');
  expect(await screen.findByRole('status')).toHaveTextContent('"ca" is only a prefix, so nothing was deleted');
});

test('deleting the last word shows the empty message', async () => {
  const only = stateOf(treeOf({ char: 'a', is_word: true, children: [] }), ['a']);
  serveDelete(only, stateOf(treeOf(), []), { word: 'a', deleted: true, pruned: 1, matched: 0 });
  render(<TrieView />);
  await screen.findByTestId('trie-node-a');
  type('a');
  click('Delete');
  expect(await screen.findByText(/trie is empty/i)).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('pruned 1 node');
  expect(screen.queryByTestId('trie-node-a')).not.toBeInTheDocument();
});

test('delete requires a word', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: carAndCard, result: null }));
  render(<TrieView />);
  await screen.findByTestId('trie-node-card');
  click('Delete');
  expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a word');
  expect(global.fetch.mock.calls.filter(([, o]) => o && o.method === 'POST')).toHaveLength(0);
});

test('delete is listed with its O(L) cost', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: carAndCard, result: null }));
  render(<TrieView />);
  await screen.findByTestId('trie-node-card');
  expect(screen.getByText(/O\(L\)/)).toHaveTextContent(/delete/i);
});
