import { render, screen, fireEvent } from '@testing-library/react';
import ArrayBoard from './ArrayBoard';
import ArrayControls from './ArrayControls';
import useArrayControls from './useArrayControls';

const state = { data: [1, 2, null, null], size: 2, capacity: 4, resizes: 1 };
const frame = (extra = {}) => ({ call: 0, state, highlight: [], pointers: {}, aux: null, note: '', ...extra });

test('shows size, capacity, resizes and cells', () => {
  render(<ArrayBoard frame={frame()} state={state} />);
  expect(screen.getByText('Size:').parentElement).toHaveTextContent('2');
  expect(screen.getByText('Capacity:').parentElement).toHaveTextContent('4');
  expect(screen.getByText('Resizes:').parentElement).toHaveTextContent('1');
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
});

test('marks highlighted cells and shows pointer names', () => {
  const { container } = render(
    <ArrayBoard frame={frame({ highlight: [1], pointers: { left: 0, right: 1 } })} state={state} />
  );
  expect(container.querySelectorAll('.array-cell-highlight')).toHaveLength(1);
  expect(screen.getByText('left')).toBeInTheDocument();
  expect(screen.getByText('right')).toBeInTheDocument();
});

test('shows prefix values when aux has them', () => {
  render(<ArrayBoard frame={frame({ aux: { prefix: [0, 1, 3] } })} state={state} />);
  expect(screen.getByLabelText('Prefix sums')).toHaveTextContent('0, 1, 3');
});

test('renders without a frame', () => {
  render(<ArrayBoard frame={null} state={state} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
});

describe('ArrayControls', () => {
  // The default look, fed by the real hook over a small fake session.
  function Harness({ session }) {
    return <ArrayControls controls={useArrayControls(session)} />;
  }
  function setup({ onStartOver = jest.fn(), disabled = false } = {}) {
    const onCall = jest.fn();
    const session = {
      state, calls: [], frames: [], loading: disabled, canUndo: true,
      runCall: onCall, undo: jest.fn(), startOver: onStartOver, goTo: jest.fn(),
    };
    render(<Harness session={session} />);
    return onCall;
  }
  const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const press = (name) => fireEvent.click(screen.getByRole('button', { name }));

  test('whole numbers become integers, other text a string', () => {
    const onCall = setup();
    type('Value', '5');
    press('Append');
    expect(onCall).toHaveBeenLastCalledWith('append(5)');
    type('Value', '5.5');
    press('Append');
    expect(onCall).toHaveBeenLastCalledWith('append("5.5")');
    type('Value', 'hi');
    press('Append');
    expect(onCall).toHaveBeenLastCalledWith('append("hi")');
  });

  test('builds the other calls', () => {
    const onCall = setup();
    type('Value', '7');
    type('Index', '1');
    type('Target', '9');
    press('Insert');
    expect(onCall).toHaveBeenLastCalledWith('insert(1, 7)');
    press('Pop');
    expect(onCall).toHaveBeenLastCalledWith('pop(1)');
    press('Get');
    expect(onCall).toHaveBeenLastCalledWith('get(1)');
    press('Two sum');
    expect(onCall).toHaveBeenLastCalledWith('two_sum_sorted(9)');
    press('Binary search');
    expect(onCall).toHaveBeenLastCalledWith('binary_search(9)');
    press('Max subarray');
    expect(onCall).toHaveBeenLastCalledWith('max_subarray()');
    press('Prefix sums');
    expect(onCall).toHaveBeenLastCalledWith('prefix_sums()');
  });

  test('Start over calls onStartOver and there is no Reset button', () => {
    const onStartOver = jest.fn();
    const onCall = setup({ onStartOver });
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
    press('Start over');
    expect(onStartOver).toHaveBeenCalledTimes(1);
    expect(onCall).not.toHaveBeenCalled();
  });

  test('Pop with no index pops the end', () => {
    const onCall = setup();
    press('Pop');
    expect(onCall).toHaveBeenLastCalledWith('pop()');
  });

  test('missing input shows a message and sends nothing', () => {
    const onCall = setup();
    press('Append');
    expect(screen.getByText('Enter a value first.')).toBeInTheDocument();
    press('Get');
    expect(screen.getByText('Enter a whole-number index first.')).toBeInTheDocument();
    press('Binary search');
    expect(screen.getByText('Enter a whole-number target first.')).toBeInTheDocument();
    expect(onCall).not.toHaveBeenCalled();
  });

  test('disabled disables everything', () => {
    setup({ disabled: true });
    expect(screen.getByLabelText('Value')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Append' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
});

describe('move arrows', () => {
  const state = { data: [3, 1, 2], size: 3, capacity: 4, resizes: 1 };
  const frameWith = (moves) => ({ highlight: [], pointers: {}, aux: moves ? { moves } : null, note: 'x' });
  const headStrokes = (el) => el.querySelector('.move-arrow-head').getAttribute('d').match(/M/g).length;

  test('a swap has a head at both ends, an insert at one', () => {
    const { container, rerender } = render(<ArrayBoard frame={frameWith([{ kind: 'swap', from: 0, to: 1 }])} state={state} />);
    expect(headStrokes(container.querySelector('.move-arrow-swap'))).toBe(4);
    rerender(<ArrayBoard frame={frameWith([{ kind: 'insert', from: 2, to: 0 }])} state={state} />);
    expect(container.querySelector('.move-arrow-swap')).toBeNull();
    expect(headStrokes(container.querySelector('.move-arrow-insert'))).toBe(2);
  });

  test('a step with no move draws nothing, and bad indexes are ignored', () => {
    const { container, rerender } = render(<ArrayBoard frame={frameWith(null)} state={state} />);
    expect(container.querySelector('.move-arrows')).toBeNull();
    rerender(<ArrayBoard frame={frameWith([{ kind: 'swap', from: 0, to: 99 }])} state={state} />);
    expect(container.querySelector('.move-arrow')).toBeNull();
  });
});
