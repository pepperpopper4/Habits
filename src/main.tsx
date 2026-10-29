import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

if (Capacitor.isNativePlatform()) {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  void StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
