import React from 'react';
import useExplorerSession from './useExplorerSession';
import useArrayControls from './array/useArrayControls';
import { BOARDS } from './boards';
import { PRESETS } from './array/presets';
import DefaultLayout from './array/presets/DefaultLayout';
import { ErrorMessage, SharePanel } from './parts';
import './Explorer.css';

// Creates the session and controls, then hands them to the chosen layout.
// preset is the id of a layout in PRESETS; an unknown id means the first.
export default function Explorer({ preset = '1', ...options }) {
  const session = useExplorerSession(options);
  const controls = useArrayControls(session);
  const board = session.structure && BOARDS[session.structure];

  let body;
  if (session.embed) {
    // /embed is always the plain player.
    body = <DefaultLayout session={session} controls={controls} Board={board ? board.Board : undefined} />;
  } else if (!board) {
    // Nothing loaded yet or the first load failed: show the error and the Command box, whatever the layout.
    body = <SharePanel session={session} />;
  } else {
    const { Component } = PRESETS.find((p) => p.id === String(preset)) || PRESETS[0];
    body = (
      <Component session={session} controls={controls} intro={board.intro} Board={board.Board} title={board.title} />
    );
  }
  // The error shows here, once, above every layout; layouts may also read session.error.
  return (
    <div className="explorer">
      <ErrorMessage session={session} />
      {body}
    </div>
  );
}
