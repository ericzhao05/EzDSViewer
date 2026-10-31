import React, { useLayoutEffect, useState } from 'react';
import Explorer from './Explorer';
import { applyTheme, loadTheme, resolveTheme } from '../theme/themes';

// /v follows the saved theme. /embed ignores it and takes the host page's choice:
// theme=dark in the link gives the dark theme; otherwise the light one.
function playerTheme(embed, params) {
  if (!embed) return loadTheme();
  return params.get('theme') === 'dark'
    ? resolveTheme('chalkboard', 'blackout')
    : resolveTheme('toy-blocks', 'bubblegum');
}

export default function PlayerPage({ embed = false }) {
  const params = new URLSearchParams(window.location.search);
  const command = params.get('c') || 'array';
  const [theme] = useState(() => playerTheme(embed, params));

  useLayoutEffect(() => {
    applyTheme(theme.style, theme.colors);
  }, [theme]);

  return (
    <div className="App">
      <main className="main-content">
        <Explorer initialCommand={command} embed={embed} />
      </main>
    </div>
  );
}
