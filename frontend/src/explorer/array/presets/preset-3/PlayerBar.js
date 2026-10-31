import React from 'react';

// Small hand-drawn icons: slightly uneven strokes in currentColor, so each theme can ink them its own way.
const PATHS = {
  prev: (
    <>
      <path d="M5.6 5.2 C5.8 9 5.5 15 5.7 18.8" />
      <path d="M18.5 5.3 C15 7.8 12.5 9.9 9.3 12.1 C12.6 14.2 15 16.4 18.4 18.9 Z" />
    </>
  ),
  next: (
    <g transform="translate(24 0) scale(-1 1)">
      <path d="M5.6 5.2 C5.8 9 5.5 15 5.7 18.8" />
      <path d="M18.5 5.3 C15 7.8 12.5 9.9 9.3 12.1 C12.6 14.2 15 16.4 18.4 18.9 Z" />
    </g>
  ),
  play: <path d="M7.5 4.8 L19 11.8 L8 19.4 C7.6 14 7.9 10 7.5 4.8 Z" />,
  pause: (
    <>
      <path d="M8.3 5 C8.1 9 8.4 15 8.1 19" />
      <path d="M15.7 4.8 C15.9 9 15.6 15 15.9 19.2" />
    </>
  ),
  restart: (
    <>
      <path d="M19.2 12.4 C19 16.4 15.8 19.4 11.9 19.2 C8 19 4.9 15.8 5.1 11.8 C5.3 7.9 8.5 4.9 12.4 5.1 C14.4 5.2 16 6 17.2 7.3" />
      <path d="M17.9 3.4 C17.6 4.9 17.5 6.2 17.3 7.4 C15.9 7.6 14.8 7.7 13.5 7.8" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg
      className="p3-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

function IconButton({ label, icon, disabled, onClick }) {
  return (
    <button type="button" className="control-btn p3-icon-btn" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}

// Step buttons as icons with speed at the right end of the same row, then the timeline and its count.
export default function PlayerBar({ session }) {
  const none = !session.hasFrames;
  return (
    <div className="explorer-steps p3-bar">
      <div className="explorer-buttons">
        <IconButton label="Previous step" icon="prev" disabled={none} onClick={session.prev} />
        <IconButton label={session.playing ? 'Pause' : 'Play'} icon={session.playing ? 'pause' : 'play'} disabled={none} onClick={session.togglePlay} />
        <IconButton label="Next step" icon="next" disabled={none} onClick={session.next} />
        <IconButton label="Restart" icon="restart" disabled={none} onClick={session.restart} />
      </div>
      <div className="explorer-buttons p3-speed" role="group" aria-label="Speed">
        {session.speeds.map((s) => (
          <button
            key={s.label}
            type="button"
            className={`control-btn${session.speed === s.ms ? ' explorer-speed-on' : ''}`}
            aria-pressed={session.speed === s.ms}
            onClick={() => session.setSpeed(s.ms)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <input
        type="range"
        aria-label="Step"
        className="explorer-slider"
        min={0}
        max={session.lastStep}
        value={session.step}
        disabled={none}
        onChange={(e) => session.goTo(Number(e.target.value))}
      />
      <span className="explorer-count">{session.stepLabel}</span>
    </div>
  );
}
