import React from 'react';
import Explorer from './Explorer';
import TopBar from '../theme/TopBar';
import useTheme from '../theme/useTheme';
import { resolveTheme } from '../theme/themes';

// /embed starts from the link: theme=dark gives the dark theme, otherwise the light one.
function themeFromLink() {
  return new URLSearchParams(window.location.search).get('theme') === 'dark'
    ? resolveTheme('chalkboard', 'blackout')
    : resolveTheme('toy-blocks', 'bubblegum');
}

// An embed sits on someone else's site, so it neither reads nor writes the saved theme.
const EMBED_THEME = { getInitial: themeFromLink, persist: false };

export default function PlayerPage({ embed = false }) {
  const command = new URLSearchParams(window.location.search).get('c') || 'array';
  const { theme, pickTheme } = useTheme(embed ? EMBED_THEME : undefined);

  return (
    <div className="App">
      <TopBar theme={theme} onPick={pickTheme} />
      <main className="main-content">
        <div className="ds-container">
          <Explorer initialCommand={command} embed={embed} />
        </div>
      </main>
    </div>
  );
}
