import React from 'react';
import ArrayControls from '../ArrayControls';
import { ErrorMessage, PlayerControls, SharePanel } from '../../parts';

// Today's page structure. Every preset starts as this; a designer replaces it in their own preset folder.
// Also used for /embed (embed is true), where only the player and the Open link show.
export default function DefaultLayout({ session, controls, intro: Intro, Board, title, presetNumber }) {
  const { embed } = session;
  return (
    <>
      {presetNumber && <p className="preset-note">Layout {presetNumber}</p>}
      {!embed && title && <h2>{title}</h2>}
      {!embed && Intro && <Intro />}

      <ErrorMessage session={session} />

      {session.structure && Board && (
        <>
          <div className="explorer-board">
            <Board frame={session.frame} state={session.state} />
          </div>
          <div className="explorer-note" role="status">
            {session.note}
          </div>
          <PlayerControls session={session} />
          {!embed && <ArrayControls controls={controls} />}
        </>
      )}

      {embed ? (
        <a className="explorer-open" href={session.viewLink} target="_blank" rel="noopener noreferrer">
          Open in EzDSViewer
        </a>
      ) : (
        <SharePanel session={session} />
      )}
    </>
  );
}
