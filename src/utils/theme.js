import { getSettings, saveSettings } from './storage';

export const initTheme = () => {
  const settings = getSettings();
  const html = document.documentElement;
  const theme = settings.theme || 'dark';
  
  html.setAttribute('data-theme', theme);
  if (theme === 'light') {
    html.classList.add('light');
  } else {
    html.classList.remove('light');
  }
};

export const toggleTheme = () => {
  const settings = getSettings();
  const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
  saveSettings({ theme: nextTheme });
  
  const html = document.documentElement;
  html.setAttribute('data-theme', nextTheme);
  if (nextTheme === 'light') {
    html.classList.add('light');
  } else {
    html.classList.remove('light');
  }
  return nextTheme;
};
