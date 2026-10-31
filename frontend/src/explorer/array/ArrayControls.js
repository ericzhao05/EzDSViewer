import React from 'react';

// The default look of the Array controls: three shared fields and a row of buttons.
// The fields are shared for looks only: each one fills in every operation that asks for that label.
export default function ArrayControls({ controls }) {
  const { operations, algorithms, disabled, message } = controls;
  const all = [...operations, ...algorithms];
  const shared = (label) => {
    const inputs = all.flatMap((o) => o.inputs).filter((i) => i.label === label);
    return {
      value: inputs[0].value,
      onChange: (e) => inputs.forEach((i) => i.setValue(e.target.value)),
    };
  };

  const btn = (item) => (
    <button
      key={item.id}
      className="control-btn"
      onClick={item.run}
      disabled={disabled || Boolean(item.blockedReason)}
      title={item.blockedReason || undefined}
    >
      {item.label}
    </button>
  );
  const plain = (label, onClick, off = false) => (
    <button className="control-btn" onClick={onClick} disabled={disabled || off}>
      {label}
    </button>
  );

  return (
    <div className="array-controls-panel">
      <div className="ds-controls array-controls">
        {['Value', 'Index', 'Target'].map((label) => {
          const field = shared(label);
          return (
            <label key={label}>
              {label}
              <input value={field.value} onChange={field.onChange} disabled={disabled} />
            </label>
          );
        })}
      </div>
      <div className="ds-controls array-buttons">
        {operations.map(btn)}
        {plain('Start over', controls.startOver)}
        {plain('Undo', controls.undo, !controls.canUndo)}
      </div>
      <div className="ds-controls array-buttons">{algorithms.map(btn)}</div>
      <p className="array-legend">Two sum and binary search need a sorted array of numbers.</p>
      {message && (
        <p className="explorer-inline-error" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
