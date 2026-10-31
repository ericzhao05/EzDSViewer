import React, { useLayoutEffect, useRef, useState } from 'react';
import './MoveArrows.css';

const HEAD = 10;

// The tip of a line arriving at (x, y) from (fromX, fromY): two short strokes folded back from it.
function head(x, y, fromX, fromY) {
  const angle = Math.atan2(y - fromY, x - fromX);
  const wing = (turn) => `L${x - HEAD * Math.cos(angle + turn)} ${y - HEAD * Math.sin(angle + turn)}`;
  return `M${x} ${y}${wing(0.5)}M${x} ${y}${wing(-0.55)}`;
}

// An uneven arc over the cells, higher for longer moves. A swap gets a head at both ends.
function shape({ from, to, kind }, centers, y) {
  const x1 = centers[from];
  const x2 = centers[to];
  const span = x2 - x1;
  const rise = Math.min(38, 18 + Math.abs(span) * 0.14);
  const c1 = [x1 + span * 0.28, y - rise * 1.3];
  const c2 = [x2 - span * 0.24, y - rise * 1.2];
  return {
    line: `M${x1} ${y}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x2} ${y}`,
    heads: head(x2, y, c2[0], c2[1]) + (kind === 'swap' ? head(x1, y, c1[0], c1[1]) : ''),
  };
}

// Draws what this step moved, over the row of cells. Purely visual: the step's note says it in words.
export default function MoveArrows({ moves }) {
  const svg = useRef(null);
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    const row = svg.current && svg.current.parentElement;
    if (!row) return undefined;
    const measure = () => {
      // The wrappers, because themes animate the cells inside them and would throw the measurement off.
      const cells = [...row.querySelectorAll('.array-cell-wrap')];
      if (cells.length === 0) return;
      const rowBox = row.getBoundingClientRect();
      const boxes = cells.map((c) => c.getBoundingClientRect());
      setLayout({
        centers: boxes.map((b) => b.left - rowBox.left + b.width / 2),
        y: boxes[0].top - rowBox.top - 8,
      });
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (observer) observer.observe(row);
    return () => observer && observer.disconnect();
  }, [moves]);

  return (
    <svg ref={svg} className="move-arrows" aria-hidden="true" focusable="false">
      {layout &&
        moves.map((move) => {
          if (layout.centers[move.from] === undefined || layout.centers[move.to] === undefined) return null;
          const { line, heads } = shape(move, layout.centers, layout.y);
          return (
            <g key={`${move.kind}-${move.from}-${move.to}`} className={`move-arrow move-arrow-${move.kind}`}>
              <path className="move-arrow-line" d={line} pathLength="1" />
              <path className="move-arrow-head" d={heads} />
            </g>
          );
        })}
    </svg>
  );
}
