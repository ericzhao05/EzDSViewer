import React from 'react';
import './ArrayView.css';

const NONE = [];
const NO_POINTERS = {};

// The scrolling row of array cells. highlight lists cell indexes to mark;
// pointers maps a name to the index it points at and is shown under that cell.
export default function ArrayCells({ state, highlight = NONE, pointers = NO_POINTERS }) {
  const names = {};
  Object.entries(pointers).forEach(([name, at]) => {
    (names[at] = names[at] || []).push(name);
  });
  return (
    <div className="array-scroll">
      <div className="array-cells" role="list" aria-label="Array cells">
        {state.data.map((item, i) => {
          const used = i < state.size;
          const marked = highlight.includes(i) ? ' array-cell-highlight' : '';
          return (
            <div className="array-cell-wrap" key={i} role="listitem">
              <div className={`array-cell ${used ? 'array-cell-used' : 'array-cell-free'}${marked}`}>
                {used ? String(item) : ''}
              </div>
              <div className="array-cell-index">{i}</div>
              {names[i] && <div className="array-cell-pointer">{names[i].join(', ')}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
