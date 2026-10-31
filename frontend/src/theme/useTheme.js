import { useCallback, useLayoutEffect, useState } from 'react';
import { applyTheme, loadTheme, resolveTheme, saveTheme } from './themes';

// Starts from the saved theme and saves each pick. A page that must not touch the
// saved theme passes getInitial (called once) and persist: false.
export default function useTheme({ getInitial = loadTheme, persist = true } = {}) {
  const [theme, setTheme] = useState(getInitial);

  useLayoutEffect(() => {
    applyTheme(theme.style, theme.colors);
  }, [theme]);

  const pickTheme = useCallback((styleId, paletteId) => {
    if (persist) saveTheme(styleId, paletteId);
    setTheme(resolveTheme(styleId, paletteId));
  }, [persist]);

  return { theme, pickTheme };
}
