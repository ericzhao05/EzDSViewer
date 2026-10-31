import React from 'react';
import ArrayCells from '../../views/ArrayCells';

// Stats, cells and (for prefix_sums) the prefix array for one animation frame.
export default function ArrayBoard({ frame, state }) {
  if (!state) return null;
  const prefix = frame && frame.aux && frame.aux.prefix;
  return (
    <div className="array-board">
      <div className="array-stats" aria-label="Array statistics">
        <span>
          Size: <strong>{state.size}</strong>
        </span>
        <span>
          Capacity: <strong>{state.capacity}</strong>
        </span>
        <span>
          Resizes: <strong>{state.resizes}</strong>
        </span>
      </div>
      <ArrayCells
        state={state}
        highlight={frame ? frame.highlight : undefined}
        pointers={frame ? frame.pointers : undefined}
        moves={frame && frame.aux && frame.aux.moves ? frame.aux.moves : undefined}
      />
      {prefix && (
        <div className="array-prefix" role="group" aria-label="Prefix sums">
          Prefix: {prefix.join(', ')}
        </div>
      )}
    </div>
  );
}
