import React, { useEffect, useRef, useState } from 'react';
import { buildCall } from '../../../commandLang';

const byId = (items, id) => items.find((item) => item.id === id);
const usedValues = (state) => (state && Array.isArray(state.data) ? state.data.slice(0, state.size) : []);

// The cell a person is about to fill: an input drawn in the array, at the place it will land.
function NewCell({ field, label, inputRef, onSubmit, onCancel }) {
  return (
    <input
      ref={inputRef}
      className="p4-new-input"
      aria-label={label}
      autoComplete="off"
      value={field.value}
      placeholder={field.placeholder}
      onChange={(e) => field.setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}

// The array drawn as its own controls, with the small bar that acts on it directly underneath.
export default function HandsOnArray({ session, controls }) {
  const append = byId(controls.operations, 'append');
  const insert = byId(controls.operations, 'insert');
  const pop = byId(controls.operations, 'pop');
  const get = byId(controls.operations, 'get');
  const [insertIndex, insertValue] = insert.inputs;
  const appendValue = append.inputs[0];
  const readIndex = get.inputs[0];
  const removeIndex = pop.inputs[0];

  const { state, frame, frames } = session;
  const data = state && Array.isArray(state.data) ? state.data : [];
  const size = state ? state.size : 0;
  const highlight = (frame && frame.highlight) || [];
  const pointers = (frame && frame.pointers) || {};
  const prefix = frame && frame.aux && frame.aux.prefix;

  // Reading and removing act on the newest array, so they only make sense when that is the one shown.
  const newest = frames.length > 0 ? frames[frames.length - 1].state : null;
  const looksBack = !session.playing && JSON.stringify(usedValues(newest)) !== JSON.stringify(usedValues(state));

  const root = useRef(null);
  const [opened, setOpened] = useState(null);
  const [cursor, setCursor] = useState(null);
  const scroller = useRef(null);
  const newInput = useRef(null);
  const focusNext = useRef(null);
  const removedAt = useRef(null);

  // Blocking or an undo can take away the place that was opened.
  let mode = opened;
  if (mode && mode.kind === 'insert' && (insert.blockedReason || mode.at >= size)) mode = null;
  if (mode && mode.kind === 'append' && append.blockedReason) mode = null;
  const insertingAt = mode && mode.kind === 'insert' ? mode.at : null;
  const appending = Boolean(mode && mode.kind === 'append');

  // One typed index drives both Read and Remove, and is the selection itself.
  const indexText = readIndex.value;
  const setIndex = (text) => {
    readIndex.setValue(text);
    removeIndex.setValue(text);
  };
  const trimmed = indexText.trim();
  const selected = /^\d+$/.test(trimmed) && Number(trimmed) < size ? Number(trimmed) : null;
  const indexProblem = trimmed !== '' && selected === null && size > 0;

  const names = {};
  Object.entries(pointers).forEach(([name, at]) => {
    (names[at] = names[at] || []).push(name);
  });

  const reveal = (el) => {
    const box = scroller.current;
    if (!box || !el || !box.getBoundingClientRect) return;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.left < b.left) box.scrollLeft -= b.left - r.left + 24;
    else if (r.right > b.right) box.scrollLeft += r.right - b.right + 24;
  };

  // Keeps the cell a step is about in view, so a long array still plays readably.
  const firstMark = highlight.length > 0 ? highlight[0] : null;
  useEffect(() => {
    if (firstMark === null || !scroller.current) return;
    reveal(scroller.current.querySelector(`[data-slot="c${firstMark}"]`));
    // Just added the last value: keep the end slot showing, so the next append is in reach.
    if (firstMark === size - 1) reveal(scroller.current.querySelector('[data-slot="a"]'));
  }, [firstMark, session.step, size]); // eslint-disable-line react-hooks/exhaustive-deps

  // An open cell that stops being valid (stepping back to a smaller array) is closed, so it cannot come back later.
  const stale = Boolean(opened) && !mode;
  useEffect(() => {
    if (stale) setOpened(null);
  }, [stale]);

  // Focus goes into the new cell only on the render right after the person opened it, never on later renders.
  const focusNew = useRef(false);
  useEffect(() => {
    if (!focusNew.current) return;
    focusNew.current = false;
    if (!newInput.current) return;
    newInput.current.focus();
    reveal(newInput.current);
  });

  useEffect(() => {
    if (!focusNext.current || !scroller.current) return;
    const target = scroller.current.querySelector(`[data-slot="${focusNext.current}"]`);
    focusNext.current = null;
    if (target) target.focus();
  });

  // A removed cell may have held the focus: hand it to whatever now sits there.
  useEffect(() => {
    if (removedAt.current === null || !scroller.current) return;
    const at = removedAt.current;
    removedAt.current = null;
    const slot = at < size ? `c${at}` : size > 0 ? `c${size - 1}` : 'a';
    const target = scroller.current.querySelector(`[data-slot="${slot}"]`);
    if (target) target.focus();
  }, [size]);

  // A Delete that failed never changes the size, so drop the handoff rather than leave it armed.
  useEffect(() => {
    if (session.error) removedAt.current = null;
  }, [session.error]);

  const openInsert = (at) => {
    if (insert.blockedReason) return;
    insertIndex.setValue(String(at));
    focusNew.current = true;
    setOpened({ kind: 'insert', at });
  };
  const openAppend = () => {
    if (append.blockedReason) return;
    focusNew.current = true;
    setOpened({ kind: 'append' });
  };
  const closeNew = (focusSlot) => {
    insertValue.setValue('');
    appendValue.setValue('');
    setOpened(null);
    focusNext.current = focusSlot;
  };
  const submitInsert = () => {
    if (controls.disabled) return;
    const filled = insertValue.value.trim() !== '';
    insert.run();
    if (filled) closeNew(`c${insertingAt}`);
  };
  const submitAppend = () => {
    if (controls.disabled) return;
    const filled = appendValue.value.trim() !== '';
    append.run();
    if (filled) appendValue.setValue('');
  };
  const pickCell = (i) => {
    setOpened(null);
    setIndex(selected === i ? '' : String(i));
  };
  const removeSelected = () => {
    if (controls.disabled || looksBack || pop.blockedReason || indexProblem) return;
    pop.run();
    setIndex('');
  };
  const read = () => {
    if (controls.disabled || looksBack || get.blockedReason || indexProblem) return;
    get.run();
  };

  // The slots, in reading order. The whole row is one Tab stop; arrow keys move inside it.
  const slots = [];
  for (let i = 0; i < size; i += 1) {
    if (insertingAt !== i) slots.push(`g${i}`);
    slots.push(`c${i}`);
  }
  if (!appending) slots.push('a');
  const tabSlot = slots.includes(cursor) ? cursor : slots[0];

  const onRowKey = (e) => {
    const slot = e.target.dataset && e.target.dataset.slot;
    if (!slot) return;
    const at = slots.indexOf(slot);
    const moves = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: slots.length - 1 };
    if (moves[e.key] !== undefined) {
      e.preventDefault();
      const next = slots[Math.min(Math.max(moves[e.key], 0), slots.length - 1)];
      focusNext.current = next;
      setCursor(next);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && slot[0] === 'c') {
      e.preventDefault();
      if (controls.disabled || looksBack) return;
      setIndex('');
      removedAt.current = Number(slot.slice(1));
      session.runCall(buildCall('pop', [removedAt.current]));
    } else if (e.key === 'Escape') {
      setIndex('');
    }
  };

  const slotProps = (slot) => ({
    type: 'button',
    'data-slot': slot,
    tabIndex: slot === tabSlot ? 0 : -1,
    onFocus: () => setCursor(slot),
  });

  const usedCell = (i) => {
    const item = data[i];
    const isPicked = selected === i;
    const mark = highlight.includes(i) ? ' array-cell-highlight' : '';
    const pointerText = names[i] ? `, pointer ${names[i].join(', ')}` : '';
    return (
      <div className="p4-col">
        <button
          {...slotProps(`c${i}`)}
          className="p4-cell-btn"
          aria-pressed={isPicked}
          aria-label={`Index ${i}, value ${String(item)}${pointerText}`}
          onClick={() => pickCell(i)}
        >
          <span key={`v:${item}`} className={`array-cell array-cell-used${mark}`}>
            {String(item)}
          </span>
        </button>
        <div className="array-cell-index">{i}</div>
        {isPicked && <div className="p4-picked">selected</div>}
        {names[i] && <div className="array-cell-pointer">{names[i].join(', ')}</div>}
      </div>
    );
  };

  const insertBlocked = Boolean(insert.blockedReason);
  const appendBlocked = Boolean(append.blockedReason);
  const atCapacity = state && size >= state.capacity;
  const cells = [];
  for (let i = 0; i < size; i += 1) {
    cells.push(
      <div className="array-cell-wrap p4-wrap" key={i} role="listitem">
        {insertingAt === i ? (
          <div className="p4-col p4-new">
            <NewCell
              field={insertValue}
              label={`Value to insert at index ${i}`}
              inputRef={newInput}
              onSubmit={submitInsert}
              onCancel={() => closeNew(`g${i}`)}
            />
            <div className="array-cell-index">new</div>
          </div>
        ) : (
          <button
            {...slotProps(`g${i}`)}
            className="p4-gap"
            aria-disabled={insertBlocked}
            aria-label={`Insert a value at index ${i}`}
            title={`Insert at index ${i}`}
            onClick={() => openInsert(i)}
          >
            <span className="p4-gap-mark" aria-hidden="true">+</span>
          </button>
        )}
        {usedCell(i)}
      </div>
    );
  }
  const appendSlot = (
    <div className="array-cell-wrap p4-wrap p4-end" key="append" role="listitem">
      {appending ? (
        <div className="p4-col p4-new">
          <NewCell
            field={appendValue}
            label={`Value to append at index ${size}`}
            inputRef={newInput}
            onSubmit={submitAppend}
            onCancel={() => closeNew('a')}
          />
          <div className="array-cell-index">{size}</div>
        </div>
      ) : (
        <div className="p4-col">
          <button
            {...slotProps('a')}
            className="p4-append"
            aria-disabled={appendBlocked}
            aria-label={appendBlocked ? `Append: ${append.blockedReason}` : `Append a value at the end, index ${size}`}
            onClick={openAppend}
          >
            {appendBlocked ? 'Full' : '+ Append'}
          </button>
          <div className="array-cell-index">{appendBlocked ? '' : size}</div>
          {atCapacity && !appendBlocked && <div className="p4-picked">will resize</div>}
        </div>
      )}
    </div>
  );
  cells.push(appendSlot);
  // The append slot takes the place of the first spare cell, so the row stays capacity long.
  for (let i = size + 1; i < data.length; i += 1) {
    cells.push(
      <div className="array-cell-wrap p4-wrap p4-spare" key={i} role="listitem">
        <div className="p4-col">
          <div className="p4-spare-cell">
            <div className="array-cell array-cell-free" />
          </div>
          <div className="array-cell-index">{i}</div>
        </div>
      </div>
    );
  }

  // Shown beside the actions it affects, with the way out.
  const backNote = looksBack && (
    <div className="p4-back">
      <p className="p4-small">
        You are looking at an earlier step. Go to the latest step first to read or remove a cell. Insert and Append
        apply to the newest array.
      </p>
      <button type="button" className="control-btn" onClick={() => session.goTo(session.lastStep)}>
        Go to latest step
      </button>
    </div>
  );

  return (
    <div className="p4-work" ref={root}>
      <div className="array-scroll p4-scroll" ref={scroller}>
        {/* The className keeps array-cells so each theme's highlight and pointer rules apply. */}
        <div className="array-cells p4-row" role="list" aria-label="Array cells" onKeyDown={onRowKey}>
          {cells}
        </div>
      </div>
      {prefix && (
        <div className="array-prefix p4-prefix" role="group" aria-label="Prefix sums">
          Prefix: {prefix.join(', ')}
        </div>
      )}

      <div className="p4-bar">
        {insertingAt !== null && (
          <div className="p4-new-bar">
            <p className="p4-bar-head">Insert at index {insertingAt}</p>
            <p className="p4-small">
              Type the value in the new cell, then press Enter. {insert.summary} {insert.complexity}.
            </p>
            <div className="p4-row-actions">
              <button type="button" className="control-btn" disabled={controls.disabled} onClick={submitInsert}>
                Insert
              </button>
              <button type="button" className="control-btn" onClick={() => closeNew(`g${insertingAt}`)}>
                Cancel
              </button>
            </div>
            {insert.message && <p className="p4-message">{insert.message}</p>}
            {backNote}
          </div>
        )}

        {appending && (
          <div className="p4-new-bar">
            <p className="p4-bar-head">Append at index {size}</p>
            <p className="p4-small">
              Type the value in the new cell, then press Enter. You can keep adding. {append.summary}{' '}
              {append.complexity}.
            </p>
            <div className="p4-row-actions">
              <button type="button" className="control-btn" disabled={controls.disabled} onClick={submitAppend}>
                Append
              </button>
              <button type="button" className="control-btn" onClick={() => closeNew('a')}>
                Done
              </button>
            </div>
            {append.message && <p className="p4-message">{append.message}</p>}
            {backNote}
          </div>
        )}

        {!mode && (
          <>
            <p className="p4-bar-head" aria-live="polite">
              {selected !== null && `Index ${selected} holds ${String(data[selected])}`}
              {selected === null && size > 0 && 'No cell selected. Press a cell to read or remove it, or type its index.'}
              {size === 0 && 'The array is empty. Press + Append to put a value in.'}
            </p>
            <div className="p4-cell-bar">
              <label className="p4-field p4-index">
                Index
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  value={indexText}
                  placeholder="none"
                  onChange={(e) => setIndex(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="control-btn"
                disabled={looksBack}
                aria-disabled={Boolean(get.blockedReason) || indexProblem}
                onClick={read}
              >
                Read
              </button>
              <button
                type="button"
                className="control-btn"
                disabled={looksBack}
                aria-disabled={Boolean(pop.blockedReason) || indexProblem}
                onClick={removeSelected}
              >
                {selected !== null ? `Remove index ${selected}` : 'Remove last'}
              </button>
              <button
                type="button"
                className="control-btn p4-add"
                aria-disabled={appendBlocked}
                onClick={openAppend}
              >
                + Append
              </button>
            </div>
            {backNote}
            {indexProblem && (
              <p className="p4-message">
                No cell at index {trimmed}. Pick from 0 to {size - 1}.
              </p>
            )}
            <ul className="p4-guide">
              {[
                [get, ''],
                [pop, ''],
                [insert, 'Press a + between two cells.'],
                [append, 'Press + Append at the end of the array.'],
              ].map(([op, how]) => (
                <li key={op.id}>
                  <p className="p4-small">
                    <strong className="p4-op">{op.label}</strong> {how && `${how} `}
                    {op.summary} {op.complexity}.
                  </p>
                  {op.blockedReason && <p className="p4-blocked">{op.blockedReason}</p>}
                  {op.message && <p className="p4-message">{op.message}</p>}
                </li>
              ))}
            </ul>
            <p className="p4-small p4-keys">
              On a keyboard: Tab to the array, arrow keys to move along it, Enter to choose, Delete to remove a cell, Esc
              to cancel.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
