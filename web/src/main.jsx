import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './app.css';
import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {themes, modes, defaultThemeSlug} from '../astryx-themes.js';
import App from './App.jsx';

// The theme picker in the top bar fires `fdr-theme`; the choice is kept in localStorage (a name, nothing private).
const saved = () => { const t = localStorage.getItem('fdr-theme'); return themes[t] ? t : defaultThemeSlug; };
function Root() {
  const [slug, setSlug] = useState(saved);
  useEffect(() => { const f = () => setSlug(saved()); addEventListener('fdr-theme', f); return () => removeEventListener('fdr-theme', f); }, []);
  useEffect(() => { document.documentElement.dataset.fdrTheme = slug; }, [slug]);
  return <Theme theme={themes[slug]} mode={modes[slug] || 'system'}><App /></Theme>;
}
createRoot(document.getElementById('root')).render(<Root />);
