import React from 'react';

// The blank a sentence or a note asks you to fill in.
export function Blank({ item, input }) {
  const isIndex = input.label === 'Index';
  return (
    <input
      className="p3-blank"
      aria-label={`${item.label} ${input.label.toLowerCase()}`}
      aria-describedby={`p3-about-${item.id}`}
      data-needed={input.kind !== 'optional-number' && input.value.trim() === ''}
      value={input.value}
      placeholder={input.placeholder}
      onChange={(e) => input.setValue(e.target.value)}
      inputMode={isIndex ? 'numeric' : undefined}
      enterKeyHint="go"
      autoComplete="off"
      spellCheck={false}
    />
  );
}

// A blocked reason or a missing-input message, written next to the thing it is about.
export function Flags({ item }) {
  return (
    <>
      {item.blockedReason && (
        <span className="p3-flag">
          <span className="p3-flag-lead">Can't do this yet: </span>
          <span>{item.blockedReason}</span>
        </span>
      )}
      <span className="p3-message" aria-live="polite">
        {item.message}
      </span>
    </>
  );
}
