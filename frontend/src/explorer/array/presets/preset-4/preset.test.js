import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import Preset4 from './index';
import useArrayControls from '../../useArrayControls';

function makeSession(values, overrides = {}) {
  const state = { data: [...values, null, null], size: values.length, capacity: values.length + 2, resizes: 0 };
  return {
    structure: 'array',
    command: 'array',
    shownCommand: 'array',
    shownCommandValid: true,
    calls: [],
    frames: [{ state, note: 'Hello', highlight: [], pointers: {}, call: 0 }],
    step: 0,
    frame: { state, note: 'Hello', highlight: [], pointers: {}, call: 0 },
    state,
    loading: false,
    hasFrames: true,
    lastStep: 0,
    stepLabel: 'Step 1 of 1',
    note: 'Hello',
    playing: false,
    togglePlay: jest.fn(),
    canPrev: false,
    canNext: false,
    prev: jest.fn(),
    next: jest.fn(),
    restart: jest.fn(),
    goTo: jest.fn(),
    speeds: [{ label: 'Normal', ms: 900 }],
    speed: 900,
    setSpeed: jest.fn(),
    runCall: jest.fn(),
    undo: jest.fn(),
    startOver: jest.fn(),
    canUndo: true,
    text: 'array',
    setText: jest.fn(),
    submit: jest.fn(),
    viewLink: 'x',
    embedLink: 'y',
    tooLong: false,
    copyLink: jest.fn(),
    copyEmbed: jest.fn(),
    copyQuestion: jest.fn(),
    copyNote: '',
    shareOpen: true,
    setShareOpen: jest.fn(),
    ...overrides,
  };
}

function Harness({ session }) {
  const controls = useArrayControls(session);
  return <Preset4 session={session} controls={controls} title="Array" />;
}

const setup = (values = [1, 3, 5], overrides) => {
  const session = makeSession(values, overrides);
  render(<Harness session={session} />);
  return session;
};

describe('acting on the array', () => {
  it('appends from the slot at the end, with the value typed in the new cell', () => {
    const session = setup();
    fireEvent.click(screen.getByRole('button', { name: /Append a value at the end/ }));
    const input = screen.getByLabelText('Value to append at index 3');
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(session.runCall).toHaveBeenCalledWith('append(9)');
  });

  it('inserts from a gap at that gap\'s index', () => {
    const session = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Insert a value at index 1' }));
    fireEvent.change(screen.getByLabelText('Value to insert at index 1'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
    expect(session.runCall).toHaveBeenCalledWith('insert(1, 7)');
  });

  it('says what is missing and sends nothing when the new cell is empty', () => {
    const session = setup();
    fireEvent.click(screen.getByRole('button', { name: /Append a value at the end/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Append' }));
    expect(screen.getByText('Enter a value first.')).toBeInTheDocument();
    expect(session.runCall).not.toHaveBeenCalled();
  });

  it('fills the Index input from a selected cell, then reads or removes it', () => {
    const session = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Index 2, value 5' }));
    expect(screen.getByLabelText('Index')).toHaveValue('2');
    expect(screen.getByText('Index 2 holds 5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Read' }));
    expect(session.runCall).toHaveBeenCalledWith('get(2)');
    fireEvent.click(screen.getByRole('button', { name: 'Remove index 2' }));
    expect(session.runCall).toHaveBeenCalledWith('pop(2)');
    expect(screen.getByRole('button', { name: 'Remove last' })).toBeInTheDocument();
  });

  it('removes the last value when nothing is selected', () => {
    const session = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove last' }));
    expect(session.runCall).toHaveBeenCalledWith('pop()');
  });

  it('refuses an index that is not in the array, and says why', () => {
    const session = setup();
    fireEvent.change(screen.getByLabelText('Index'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Read' }));
    expect(session.runCall).not.toHaveBeenCalled();
    expect(screen.getByText('No cell at index 9. Pick from 0 to 2.')).toBeInTheDocument();
  });
});

describe('the keyboard route', () => {
  it('is one Tab stop that arrow keys move along', () => {
    setup();
    const first = screen.getByRole('button', { name: 'Insert a value at index 0' });
    const cell = screen.getByRole('button', { name: 'Index 0, value 1' });
    expect(first).toHaveAttribute('tabindex', '0');
    expect(cell).toHaveAttribute('tabindex', '-1');
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell);
    fireEvent.keyDown(cell, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Append a value at the end/ }));
  });

  it('removes a cell with Delete', () => {
    const session = setup();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Index 1, value 3' }), { key: 'Delete' });
    expect(session.runCall).toHaveBeenCalledWith('pop(1)');
  });

  it('closes the new cell with Escape without sending', () => {
    const session = setup();
    fireEvent.click(screen.getByRole('button', { name: /Append a value at the end/ }));
    fireEvent.keyDown(screen.getByLabelText('Value to append at index 3'), { key: 'Escape' });
    expect(session.runCall).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Append a value at the end/ }));
  });
});

describe('algorithms', () => {
  it('sit in their own band and all run', () => {
    const session = setup();
    const band = within(screen.getByRole('region', { name: 'Run an algorithm' }));
    const twoSum = within(band.getByRole('form', { name: 'Two sum' }));
    fireEvent.change(twoSum.getByLabelText('Target'), { target: { value: '8' } });
    fireEvent.click(twoSum.getByRole('button', { name: 'Run Two sum' }));
    expect(session.runCall).toHaveBeenCalledWith('two_sum_sorted(8)');
    const search = within(band.getByRole('form', { name: 'Binary search' }));
    fireEvent.change(search.getByLabelText('Target'), { target: { value: '5' } });
    fireEvent.click(search.getByRole('button', { name: 'Run Binary search' }));
    expect(session.runCall).toHaveBeenCalledWith('binary_search(5)');
    fireEvent.click(band.getByRole('button', { name: 'Run Max subarray' }));
    expect(session.runCall).toHaveBeenCalledWith('max_subarray()');
    fireEvent.click(band.getByRole('button', { name: 'Run Prefix sums' }));
    expect(session.runCall).toHaveBeenCalledWith('prefix_sums()');
  });

  it('shows a blocked reason as text and does not run', () => {
    const session = setup([5, 1]);
    const band = within(screen.getByRole('region', { name: 'Run an algorithm' }));
    expect(band.getAllByText('Needs a sorted array')).toHaveLength(2);
    fireEvent.click(band.getByRole('button', { name: 'Run Max subarray' }));
    expect(session.runCall).toHaveBeenCalledWith('max_subarray()');
    session.runCall.mockClear();
    const twoSum = within(band.getByRole('form', { name: 'Two sum' }));
    fireEvent.change(twoSum.getByLabelText('Target'), { target: { value: '8' } });
    fireEvent.click(twoSum.getByRole('button', { name: 'Run Two sum' }));
    expect(session.runCall).not.toHaveBeenCalled();
  });

  it('shows Array is empty as text on an empty array', () => {
    setup([]);
    expect(screen.getAllByText('Array is empty')).toHaveLength(2);
  });

  it('shows Array is full as text and blocks the end slot at 64 values', () => {
    const session = setup(Array.from({ length: 64 }, (_, i) => i));
    expect(screen.getAllByText('Array is full')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Append: Array is full' }));
    expect(screen.queryByLabelText(/Value to append/)).not.toBeInTheDocument();
    expect(session.runCall).not.toHaveBeenCalled();
  });
});

describe('the rest of the page', () => {
  it('steps, undoes and starts over through the session', () => {
    const session = setup([1, 3], { canPrev: true, canNext: true, lastStep: 3, stepLabel: 'Step 2 of 4', step: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    fireEvent.change(screen.getByLabelText('Step'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(session.prev).toHaveBeenCalled();
    expect(session.next).toHaveBeenCalled();
    expect(session.togglePlay).toHaveBeenCalled();
    expect(session.restart).toHaveBeenCalled();
    expect(session.goTo).toHaveBeenCalledWith(2);
    expect(session.undo).toHaveBeenCalled();
    expect(session.startOver).toHaveBeenCalled();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Hello');
  });

  it('shows the prefix values and a pointer', () => {
    const frame = { note: '', highlight: [1], pointers: { left: 1 }, aux: { prefix: [1, 4] }, call: 0 };
    setup([1, 3], { frame: { ...frame, state: makeSession([1, 3]).state } });
    expect(screen.getByRole('group', { name: 'Prefix sums' })).toHaveTextContent('Prefix: 1, 4');
    expect(screen.getByText('left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Index 1, value 3, pointer left' }).querySelector('.array-cell-highlight')).not.toBeNull();
  });

  it('offers the whole Share area', () => {
    setup();
    ['Copy link', 'Copy embed code', 'Copy question for Claude', 'Run'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Command')).toBeInTheDocument();
  });
});
