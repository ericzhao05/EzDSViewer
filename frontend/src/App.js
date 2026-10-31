import React, { useState } from 'react';
import './theme/index.css';
import ThemeMenu from './theme/ThemeMenu';
import useTheme from './theme/useTheme';
import { GROUPS, STRUCTURES } from './structures/registry';

function App() {
  const [activeDS, setActiveDS] = useState(STRUCTURES[0].id);
  const { theme, pickTheme } = useTheme();

  const ActiveView = STRUCTURES.find((s) => s.id === activeDS).Component;

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-container">
          <h1 className="nav-logo">EzDSViewer</h1>
          <ThemeMenu theme={theme} onPick={pickTheme} />
        </div>
      </nav>

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

export default App;
