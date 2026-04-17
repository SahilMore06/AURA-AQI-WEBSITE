import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Restore theme immediately — no flash of wrong theme on load
const savedTheme = localStorage.getItem('aura-theme') || 'dark';
document.documentElement.classList.toggle('light', savedTheme === 'light');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
