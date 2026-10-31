import React from 'react';

// Small pieces of the default look that any layout may reuse. They only read the session.

export function ErrorMessage({ session }) {
  const { error } = session;
  if (!error) return null;
  return (
    <div className="error-message" role="alert">
      {error.message}
      {error.available && error.available.length > 0 && <div>Available: {error.available.join(', ')}</div>}
    </div>
  );
}

// The Command box and the copy buttons, inside a collapsed Share section.
export function SharePanel({ session }) {
  const shown = session.shownCommand;
  return (
    <details className="explorer-copy" open={session.shareOpen} onToggle={(e) => session.setShareOpen(e.currentTarget.open)}>
      <summary>Share</summary>
      <form className="explorer-command" onSubmit={session.submit}>
        <label>
          Command
          <input value={session.text} onChange={(e) => session.setText(e.target.value)} spellCheck={false} />
        </label>
        <button type="submit" className="control-btn" disabled={session.loading}>
          Run
        </button>
      </form>
      <div className="explorer-buttons">
        <button className="control-btn" disabled={session.tooLong || !shown} onClick={session.copyLink}>
          Copy link
        </button>
        <button className="control-btn" disabled={session.tooLong || !shown} onClick={session.copyEmbed}>
          Copy embed code
        </button>
        <button className="control-btn" disabled={!session.shownCommandValid} onClick={session.copyQuestion}>
          Copy question for Claude
        </button>
      </div>
      {session.tooLong && <p className="array-legend">This command is too long to share as a link</p>}
      {session.copyNote && <p className="array-legend" aria-live="polite">{session.copyNote}</p>}
    </details>
  );
}

// Previous, Play, Next and Restart, the step slider, the count and the speed buttons.
export function PlayerControls({ session }) {
  const none = !session.hasFrames;
  return (
    <div className="explorer-steps">
      <div className="explorer-buttons">
        <button className="control-btn" disabled={none} onClick={session.prev}>
          Previous step
        </button>
        <button className="control-btn" disabled={none} onClick={session.togglePlay}>
          {session.playing ? 'Pause' : 'Play'}
        </button>
        <button className="control-btn" disabled={none} onClick={session.next}>
          Next step
        </button>
        <button className="control-btn" disabled={none} onClick={session.restart}>
          Restart
        </button>
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
      <div className="explorer-buttons" role="group" aria-label="Speed">
        {session.speeds.map((s) => (
          <button
            key={s.label}
            className={`control-btn${session.speed === s.ms ? ' explorer-speed-on' : ''}`}
            aria-pressed={session.speed === s.ms}
            onClick={() => session.setSpeed(s.ms)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
