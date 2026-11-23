import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// A file dropped outside a drop zone would make the window open that file in place of the app.
// Drop zones call preventDefault first; anywhere else the drop is refused.
window.addEventListener('dragover', (event) => {
  if (event.defaultPrevented || !event.dataTransfer) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'none';
});
window.addEventListener('drop', (event) => event.preventDefault());

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
