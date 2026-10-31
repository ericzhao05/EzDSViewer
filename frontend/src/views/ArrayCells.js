import React from 'react';
import MoveArrows from '../explorer/array/MoveArrows';
import './ArrayView.css';

const NONE = [];
const NO_POINTERS = {};

// The scrolling row of array cells. highlight lists cell indexes to mark;
// pointers maps a name to the index it points at and is shown under that cell.
// moves lists what this step moved, drawn as arrows over the cells.
export default function ArrayCells({ state, highlight = NONE, pointers = NO_POINTERS, moves = NONE }) {
  const names = {};
  Object.entries(pointers).forEach(([name, at]) => {
    (names[at] = names[at] || []).push(name);
  });
  return (
    <div className="array-scroll">
      <div className={`array-cells${moves.length ? ' array-cells-moving' : ''}`} role="list" aria-label="Array cells">
        {state.data.map((item, i) => {
          const used = i < state.size;
          const marked = highlight.includes(i) ? ' array-cell-highlight' : '';
          return (
            <div className="array-cell-wrap" key={i} role="listitem">
              <div key={used ? `v:${item}` : 'free'} className={`array-cell ${used ? 'array-cell-used' : 'array-cell-free'}${marked}`}>
                {used ? String(item) : ''}
              </div>
              <div className="array-cell-index">{i}</div>
              {names[i] && <div className="array-cell-pointer">{names[i].join(', ')}</div>}
            </div>
          );
        })}
        {moves.length > 0 && <MoveArrows moves={moves} />}
      </div>
    </div>
  );
}
