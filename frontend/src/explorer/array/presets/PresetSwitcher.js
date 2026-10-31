// TEST BRANCH ONLY: this file exists so the owner can compare the Array layouts side by side.
// To remove it, delete this file, the <PresetSwitcher> in App.js, and the withPreset() calls.
import React, { useState } from 'react';
import { PRESETS } from './index';
import './PresetSwitcher.css';

const isPreset = (id) => PRESETS.some((p) => p.id === id);

// The preset in the address bar; anything missing or invalid means 1.
export function readPreset() {
  const id = new URLSearchParams(window.location.search).get('preset');
  return isPreset(id) ? id : '1';
}

// Sets the preset in a search string such as '?c=array', leaving the other parameters byte for byte.
function searchWith(search, id) {
  const rest = search.replace(/^\?/, '').split('&').filter((p) => p && !p.startsWith('preset='));
  if (id) rest.push(`preset=${id}`);
  return rest.length ? `?${rest.join('&')}` : '';
}

// Adds the current preset to a search string so address updates keep it.
export function withPreset(search) {
  const id = new URLSearchParams(window.location.search).get('preset');
  return isPreset(id) ? searchWith(search, id) : search;
}

export function usePreset() {
  const [preset, setPreset] = useState(readPreset);
  const choose = (id) => {
    setPreset(id);
    try {
      const search = searchWith(window.location.search, id);
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`);
    } catch (err) {
      // The address bar is a nicety.
    }
  };
  return [preset, choose];
}

export default function PresetSwitcher({ value, onChange }) {
  return (
    <div className="preset-switcher" role="group" aria-label="Layout">
      <span className="preset-switcher-label">Layout:</span>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          className="control-btn"
          aria-pressed={value === p.id}
          onClick={() => onChange(p.id)}
        >
          <span className="preset-switcher-num">{p.id}</span> {p.name}
        </button>
      ))}
    </div>
  );
}
