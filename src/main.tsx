import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Shot from './Shot';
import './styles.css';

// `?shot=<assetId>&s=<sessionId>` is the connector's camera angle: one asset
// out of one campaign, no chrome, so a headless screenshot is of the
// deliverable and nothing else.
const q = new URLSearchParams(location.search);
const shot = q.get('shot'), session = q.get('s');
if (shot) document.body.classList.add('shot');

// The board fonts the Adobe kit lacks (public/fonts/): Quiet Sans 600 and 800,
// Tiempos Headline, PestoFresco -- shipped with the app, which is internal.
document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/fonts/fonts.css' }));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shot && session ? <Shot id={shot} session={session} /> : <App />}
  </StrictMode>);
