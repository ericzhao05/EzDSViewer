import React, { useRef, useState } from 'react';
import './theme/index.css';
import TopBar from './theme/TopBar';
import useTheme from './theme/useTheme';
import { GROUPS, STRUCTURES } from './structures/registry';
import PlayerPage from './explorer/PlayerPage';
import Explorer from './explorer/Explorer';
import { BOARDS } from './explorer/boards';
import { PRESETS } from './explorer/array/presets';
import PresetSwitcher, { usePreset, withPreset } from './explorer/array/presets/PresetSwitcher';
import { encodeCommand, linkFor, MAX_LINK_CHARS } from './explorer/commandLang';

const ARRAY = STRUCTURES[0].id;
// Shown on a fresh visit, at its last step, so the page starts with something on it.
const STARTER_COMMAND = 'array.append(1).append(3).append(5).append(7)';

const isAvailable = (id) => Boolean(BOARDS[id]);

// Reads the first visit's address: the shared command, and which structure to select.
function readAddress() {
  const params = new URLSearchParams(window.location.search);
  const command = params.get('c');
  const known = (id) => STRUCTURES.some((s) => s.id === id);
  if (command) {
    const first = command.split('.')[0].trim();
    return { command, active: known(first) ? first : ARRAY };
  }
  const ds = params.get('ds');
  return { command: null, active: known(ds) ? ds : ARRAY };
}

function setAddress(path, search) {
  try {
    window.history.replaceState(window.history.state, '', `${path}${search}`);
  } catch (err) {
    // The address bar is a nicety.
  }
}

function ComingSoon({ structure, onOpenArray }) {
  return (
    <section className="coming-soon">
      <h2>{structure.label}</h2>
      <p>This structure is coming soon. Array is ready to try now.</p>
      <button className="control-btn" onClick={onOpenArray}>
        Open Array
      </button>
    </section>
  );
}

function Shell() {
  const [start] = useState(readAddress);
  const [activeDS, setActiveDS] = useState(start.active);
  const { theme, pickTheme } = useTheme();
  const [preset, setPreset] = usePreset(); // test branch: compare Array layouts
  // The array command to put back in the address when returning from a coming-soon item.
  const arrayCommand = useRef(start.active === ARRAY ? start.command : null);

  // A shared link starts the array at step 1 and plays once; a fresh visit shows the starter's last step.
  const shared = start.active === ARRAY ? start.command : null;

  const select = (id) => {
    setActiveDS(id);
    if (id !== ARRAY && !isAvailable(id)) {
      setAddress('/', withPreset(`?ds=${id}`));
      return;
    }
    const cmd = arrayCommand.current;
    const tooLong = cmd && linkFor(window.location.origin, cmd).length > MAX_LINK_CHARS;
    setAddress(window.location.pathname, withPreset(cmd && !tooLong ? `?c=${encodeCommand(cmd)}` : ''));
  };

  const current = STRUCTURES.find((s) => s.id === activeDS);
  // A layout that needs room asks for the wide column; the coming-soon panel never does.
  const wide = activeDS === ARRAY && Boolean(PRESETS.find((p) => p.id === preset)?.wide);

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
                    onClick={() => select(s.id)}
                  >
                    {s.label}
                    {!isAvailable(s.id) && <span className="ds-sidebar-soon"> Soon</span>}
                  </button>
                ))}
              </section>
            );
          })}
        </aside>
        <main className={wide ? 'main-content main-content--wide' : 'main-content'}>
          <div hidden={activeDS !== ARRAY}>
            <div className={wide ? 'ds-container ds-container--wide' : 'ds-container'}>
              <PresetSwitcher value={preset} onChange={setPreset} />
              <Explorer
                preset={preset}
                initialCommand={shared || STARTER_COMMAND}
                autoplay={Boolean(shared)}
                startAtEnd={!shared}
                active={activeDS === ARRAY}
                onEdit={(cmd) => {
                  arrayCommand.current = cmd;
                }}
              />
            </div>
          </div>
          {activeDS !== ARRAY && (
            <div className="ds-container">
              <ComingSoon structure={current} onOpenArray={() => select(ARRAY)} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// /embed is a bare page; the check lives here so Shell's hooks stay unconditional.
function App() {
  if (window.location.pathname === '/embed') return <PlayerPage />;
  return <Shell />;
}

export default App;
