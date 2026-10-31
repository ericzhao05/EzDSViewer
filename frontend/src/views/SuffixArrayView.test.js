import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SuffixArrayView from './SuffixArrayView';

const banana = {
  text: 'banana',
  sa: [5, 3, 1, 0, 4, 2],
  lcp: [0, 1, 3, 0, 0, 2],
  suffixes: ['a', 'ana', 'anana', 'banana', 'na', 'nana'],
};
const empty = { text: '', sa: [], lcp: [], suffixes: [] };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the text and sorted suffix table', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: banana, result: null }));
  render(<SuffixArrayView />);
  await screen.findByTestId('sa-chars');
  expect(screen.getAllByTestId('sa-row')).toHaveLength(6);
  expect(screen.getByText('anana')).toBeInTheDocument();
  expect(screen.getByText(/Pattern search by binary search costs O\(m log n\)/)).toBeInTheDocument();
  expect(screen.getByText(/LCP array/, { selector: '.suffix-array-intro' })).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<SuffixArrayView />);
  expect(await screen.findByText('The text is empty.')).toBeInTheDocument();
});

test('search sends the pattern and highlights matching rows', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: banana, result: null }))
    .mockImplementationOnce(() =>
      reply({
        success: true,
        state: banana,
        result: { pattern: 'an', positions: [1, 3], count: 2, range: [1, 3] },
      }));
  render(<SuffixArrayView />);
  await screen.findByTestId('sa-chars');
  await userEvent.type(screen.getByLabelText('Pattern'), 'an');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByText(/"an" occurs 2 times at positions 1, 3/)).toBeInTheDocument();
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/\/suffix-array\/search$/);
  expect(JSON.parse(opts.body)).toEqual({ pattern: 'an' });
  const rows = screen.getAllByTestId('sa-row');
  expect(rows[1]).toHaveClass('suffix-array-match');
  expect(rows[2]).toHaveClass('suffix-array-match');
  expect(rows[3]).not.toHaveClass('suffix-array-match');
});

test('shows a backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: banana, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'pattern too long', state: banana }, false));
  render(<SuffixArrayView />);
  await screen.findByTestId('sa-chars');
  await userEvent.type(screen.getByLabelText('Pattern'), 'zz');
  await userEvent.click(screen.getByRole('button', { name: 'Count' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('pattern too long');
});

test('asks for a pattern before searching', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: banana, result: null }));
  render(<SuffixArrayView />);
  await screen.findByTestId('sa-chars');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please enter a pattern');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
