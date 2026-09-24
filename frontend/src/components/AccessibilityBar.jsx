import { useEffect, useState } from 'react';

const STORAGE_KEY = 'wisdom-studio:a11y';
const MIN_SCALE = 100;
const MAX_SCALE = 200;
const BASE_FONT_PX = 16;

const defaultSettings = { fontScale: 100, highContrast: false };

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing / storage disabled — settings just won't persist.
  }
}

export default function AccessibilityBar() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    document.documentElement.style.fontSize = `${(BASE_FONT_PX * settings.fontScale) / 100}px`;
    document.documentElement.setAttribute('data-contrast', settings.highContrast ? 'high' : 'normal');
    saveSettings(settings);
  }, [settings]);

  return (
    <div className="a11y-bar" role="region" aria-label="Accessibility settings">
      <label className="a11y-bar-field">
        <span>Text size</span>
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={10}
          value={settings.fontScale}
          onChange={(e) => setSettings((s) => ({ ...s, fontScale: Number(e.target.value) }))}
          aria-valuetext={`${settings.fontScale}%`}
        />
        <span aria-hidden="true">{settings.fontScale}%</span>
      </label>
      <label className="a11y-bar-field a11y-bar-checkbox">
        <input
          type="checkbox"
          checked={settings.highContrast}
          onChange={(e) => setSettings((s) => ({ ...s, highContrast: e.target.checked }))}
        />
        <span>High contrast</span>
      </label>
    </div>
  );
}
