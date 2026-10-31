import React, { useLayoutEffect, useRef, useState } from 'react';
import { searchNotes, withNotes } from './algorithmNotes';
import { Blank, Flags } from './Fields';

// Where each note hangs and how it drifts: fixed per note, so it keeps its character when a search moves it.
// tilt and the drift reach are scaled per screen size and theme in styles.css.
const SCATTER = {
  two_sum_sorted: { tilt: -1.9, w: 19, down: 0.4, across: 0, x: 10, y: 7, time: 19, delay: -3 },
  binary_search: { tilt: 1.4, w: 20.5, down: 1.7, across: 0.5, x: -8, y: 9, time: 23, delay: -11 },
  max_subarray: { tilt: -0.8, w: 18, down: 0, across: 0.2, x: 9, y: -8, time: 17, delay: -6 },
  prefix_sums: { tilt: 2.1, w: 19.5, down: 1.2, across: 0.7, x: -10, y: -6, time: 26, delay: -15 },
  bubble_sort: { tilt: 1.1, w: 20, down: 0.2, across: 0.3, x: 7, y: 9, time: 21, delay: -2 },
  selection_sort: { tilt: -2.2, w: 18.5, down: 1.5, across: 0, x: -9, y: 7, time: 25, delay: -18 },
  insertion_sort: { tilt: 0.7, w: 19.5, down: 0.5, across: 0.6, x: 10, y: -7, time: 18, delay: -9 },
  merge_sort: { tilt: -1.3, w: 21, down: 1.9, across: 0.2, x: -7, y: -9, time: 28, delay: -4 },
  quick_sort: { tilt: 1.8, w: 18.5, down: 0, across: 0.5, x: 8, y: 8, time: 20, delay: -13 },
  heap_sort: { tilt: -0.6, w: 20, down: 1, across: 0, x: -10, y: 6, time: 24, delay: -7 },
};

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function scatterVars(id) {
  const s = SCATTER[id];
  if (!s) return undefined;
  return {
    '--note-tilt': `${s.tilt}deg`,
    '--note-w': `${s.w}rem`,
    '--note-down': `${s.down}rem`,
    '--note-across': `${s.across}rem`,
    '--drift-x': `${s.x}px`,
    '--drift-y': `${s.y}px`,
    '--drift-time': `${s.time}s`,
    '--drift-delay': `${s.delay}s`,
  };
}

function Note({ item, onSubmit }) {
  return (
    <li className="p3-note-spot" data-note={item.id} data-kind={item.kind} style={scatterVars(item.id)}>
      {/* The spot holds still and catches the pointer; only the two layers inside it move. */}
      <div className="p3-note-drift">
        <form className="p3-note" aria-label={item.label} onSubmit={(e) => onSubmit(e, item)}>
          <h4>{item.label}</h4>
          <p id={`p3-about-${item.id}`}>{item.summary}</p>
          <dl>
            <div>
              <dt>What it needs</dt>
              <dd>{item.needs}</dd>
            </div>
            <div>
              <dt>How long it takes</dt>
              <dd>
                <strong>{item.complexity}.</strong> {item.cost}
              </dd>
            </div>
          </dl>
          <div className="p3-note-go">
            {item.inputs.map((input) => (
              <label key={input.id} className="p3-note-field">
                {input.label}
                <Blank item={item} input={input} />
              </label>
            ))}
            <button type="submit" className="control-btn p3-run" disabled={!!item.blockedReason} aria-describedby={`p3-about-${item.id}`}>
              Run {item.label.toLowerCase()}
            </button>
          </div>
          <div className="p3-note-flags">
            <Flags item={item} />
          </div>
        </form>
      </div>
    </li>
  );
}

// The algorithms as notes pinned below the board, with a search over them.
export default function NotesBoard({ session, controls, onSubmit }) {
  const [query, setQuery] = useState('');
  const list = useRef(null);
  const search = useRef(null);
  const before = useRef(null);

  const items = withNotes([...controls.algorithms, ...controls.sorts], session.calls);
  const shown = searchNotes(items, query);

  const changeQuery = (next) => {
    before.current = null;
    if (list.current && !reducedMotion()) {
      before.current = new Map(
        [...list.current.children].map((spot) => [spot.dataset.note, spot.getBoundingClientRect()])
      );
    }
    setQuery(next);
  };

  // Notes that stay glide from where they were to where the new list puts them.
  useLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    if (!was || !list.current) return;
    [...list.current.children].forEach((spot) => {
      const from = was.get(spot.dataset.note);
      if (!from) {
        spot.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
        return;
      }
      const to = spot.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (dx === 0 && dy === 0) return;
      spot.animate?.([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: 300,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      });
    });
  }, [query]);

  return (
    <section className="p3-notes" aria-labelledby="p3-algorithms">
      <div className="p3-notes-head">
        <h3 id="p3-algorithms">Algorithms</h3>
        <p className="p3-notes-lead">
          Run one and the page goes back up to the array so you can watch it, step by step. Each sort starts from the array you made, so you can compare them. The array stays sorted until you make or change it.
        </p>
        <div className="p3-notes-find" role="search">
          <label>
            Search algorithms
            <input
              ref={search}
              type="search"
              value={query}
              placeholder="sort, binary, log n"
              onChange={(e) => changeQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
            />
          </label>
          <p className="p3-notes-count" aria-live="polite" aria-atomic="true">
            {shown.length} of {items.length} shown
          </p>
        </div>
      </div>

      {shown.length > 0 ? (
        <ul className="p3-notes-list" ref={list}>
          {shown.map((item) => (
            <Note key={item.id} item={item} onSubmit={onSubmit} />
          ))}
        </ul>
      ) : (
        <div className="p3-notes-none">
          <p>No algorithm matches that. Try a name like "merge", or a cost like "log n".</p>
          <button
            type="button"
            className="control-btn"
            onClick={() => {
              changeQuery('');
              search.current?.focus();
            }}
          >
            Clear
          </button>
        </div>
      )}
    </section>
  );
}
