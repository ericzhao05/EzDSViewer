import React, { useEffect } from 'react';
import Explorer from './Explorer';
import '../App.css';

// Standalone player for /v (follows the saved theme) and /embed (theme=dark in the link).
export default function PlayerPage({ embed = false }) {
  const params = new URLSearchParams(window.location.search);
  const command = params.get('c') || 'array';
  const dark = embed ? params.get('theme') === 'dark' : localStorage.getItem('darkMode') === 'true';

  // The theme variables in App.css hang off the body's dark-mode class.
  useEffect(() => {
    document.body.classList.toggle('dark-mode', dark);
    return () => document.body.classList.remove('dark-mode');
  }, [dark]);

  return (
    <div className={`App ${dark ? 'dark-mode' : 'light-mode'}`}>
      <Explorer initialCommand={command} embed={embed} />
    </div>
  );
}
