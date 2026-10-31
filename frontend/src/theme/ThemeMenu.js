import React, { useEffect, useRef, useState } from 'react';
import { themeChoices } from './themes';

// Hamburger in the top-right corner. Stays open while choosing so themes can be
// compared; Escape, the button, a click outside or tabbing away closes it.
export default function ThemeMenu({ theme, onPick }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    rootRef.current.querySelector('input:checked')?.focus();
    const onMouseDown = (e) => {
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current.focus();
      } else if (e.key === 'Tab') {
        // Focus has not moved yet during keydown.
        setTimeout(() => {
          if (rootRef.current && !rootRef.current.contains(document.activeElement)) setOpen(false);
        });
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="theme-menu" ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className="theme-menu-button"
        aria-label="Choose style"
        aria-expanded={open}
        aria-controls="theme-menu-panel"
        onClick={() => setOpen(!open)}
      >
        <span className="theme-menu-bars" aria-hidden="true" />
      </button>
      {open && (
        <fieldset className="theme-menu-panel" id="theme-menu-panel">
          <legend className="theme-menu-heading">Style</legend>
          {themeChoices().map(({ style, colors }) => (
            <label className="theme-menu-option" key={`${style.id}/${colors.id}`}>
              <input
                type="radio"
                name="ezds-theme"
                checked={style.id === theme.style.id && colors.id === theme.colors.id}
                onChange={() => onPick(style.id, colors.id)}
              />
              <span className="theme-menu-row">
                <span className="theme-menu-swatch" style={{ backgroundColor: colors.colors.bg }} aria-hidden="true">
                  <span style={{ backgroundColor: colors.colors.cell }} />
                  <span style={{ backgroundColor: colors.colors.accent }} />
                  <span style={{ backgroundColor: colors.colors.ink }} />
                </span>
                <span className="theme-menu-text">
                  <span className="theme-menu-name" style={{ fontFamily: style.display }}>{style.name}</span>
                  <span className="theme-menu-palette">{colors.name}</span>
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
