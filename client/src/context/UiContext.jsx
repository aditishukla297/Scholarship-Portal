import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { STRINGS } from '../data/strings';

const UiContext = createContext(null);

const FONT_STEPS = [14, 15, 16, 17.6, 19.2]; // px applied to <html>
const DEFAULT_STEP = 2;

export function UiProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('mota_lang') || 'en');
  const [fontStep, setFontStep] = useState(() => Number(localStorage.getItem('mota_font') ?? DEFAULT_STEP));
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('mota_contrast') === '1');

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_STEPS[fontStep]}px`;
    localStorage.setItem('mota_font', String(fontStep));
  }, [fontStep]);

  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    localStorage.setItem('mota_lang', lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle('contrast-more', highContrast);
    localStorage.setItem('mota_contrast', highContrast ? '1' : '0');
  }, [highContrast]);

  const t = useCallback(
    (key) => {
      const entry = STRINGS[key];
      if (!entry) return key;
      return entry[lang] ?? entry.en ?? key;
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      fontStep,
      increaseFont: () => setFontStep((s) => Math.min(FONT_STEPS.length - 1, s + 1)),
      decreaseFont: () => setFontStep((s) => Math.max(0, s - 1)),
      resetFont: () => setFontStep(DEFAULT_STEP),
      highContrast,
      toggleContrast: () => setHighContrast((v) => !v),
    }),
    [lang, t, fontStep, highContrast]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside UiProvider');
  return ctx;
}
