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
