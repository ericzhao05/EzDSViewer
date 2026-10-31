import React from 'react';
import DefaultLayout from '../DefaultLayout';
import './styles.css';

// Layout 2. Replace DefaultLayout with your own structure; use only session and controls for logic.
export default function Preset2({ session, controls, intro, Board, title }) {
  return (
    <div className="preset-2">
      <DefaultLayout
        session={session}
        controls={controls}
        intro={intro}
        Board={Board}
        title={title}
        presetNumber={2}
      />
    </div>
  );
}
