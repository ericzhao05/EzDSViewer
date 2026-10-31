import React from 'react';
import ThemeMenu from './ThemeMenu';

// The bar across the top of every page: logo on the left, theme menu on the right.
export default function TopBar({ theme, onPick }) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="nav-logo">EzDSViewer</h1>
        <ThemeMenu theme={theme} onPick={onPick} />
      </div>
    </nav>
  );
}
