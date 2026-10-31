import React, { useState } from 'react';
import './theme/index.css';
import TopBar from './theme/TopBar';
import useTheme from './theme/useTheme';
import { GROUPS, STRUCTURES } from './structures/registry';
import PlayerPage from './explorer/PlayerPage';

function Shell() {
  const [activeDS, setActiveDS] = useState(STRUCTURES[0].id);
  const { theme, pickTheme } = useTheme();

  const ActiveView = STRUCTURES.find((s) => s.id === activeDS).Component;

  return (
    <div className="App">
      <TopBar theme={theme} onPick={pickTheme} />

      <div className="app-layout">
        <aside className="ds-sidebar" aria-label="Data structures">
          {GROUPS.map((group) => {
            const items = STRUCTURES.filter((s) => s.group === group);
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <h3 className="ds-sidebar-group">{group}</h3>
                {items.map((s) => (
                  <button
                    key={s.id}
                    className={activeDS === s.id ? 'ds-sidebar-item active' : 'ds-sidebar-item'}
                    aria-current={activeDS === s.id ? 'page' : undefined}
                    onClick={() => setActiveDS(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </section>
            );
          })}
        </aside>
        <main className="main-content">
          <ActiveView key={activeDS} />
        </main>
      </div>
    </div>
  );
}

// The player pages replace the sidebar layout; the check lives here so Shell's hooks stay unconditional.
function App() {
  const path = window.location.pathname;
  if (path === '/v' || path === '/embed') return <PlayerPage embed={path === '/embed'} />;
  return <Shell />;
}

export default App;
