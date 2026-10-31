import React from 'react';
import DefaultLayout from '../DefaultLayout';
import './styles.css';

// Layout 5. Replace DefaultLayout with your own structure; use only session and controls for logic.
export default function Preset5({ session, controls, intro, Board, title }) {
  return (
    <div className="preset-5">
      <DefaultLayout
        session={session}
        controls={controls}
        intro={intro}
        Board={Board}
        title={title}
        presetNumber={5}
      />
    </div>
  );
}
