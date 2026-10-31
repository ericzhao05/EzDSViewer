import { useCallback, useLayoutEffect, useState } from 'react';
import { applyTheme, loadTheme, resolveTheme, saveTheme } from './themes';

export default function useTheme() {
  const [theme, setTheme] = useState(loadTheme);

  useLayoutEffect(() => {
    applyTheme(theme.style, theme.colors);
  }, [theme]);

  const pickTheme = useCallback((styleId, paletteId) => {
    saveTheme(styleId, paletteId);
    setTheme(resolveTheme(styleId, paletteId));
  }, []);

  return { theme, pickTheme };
}
