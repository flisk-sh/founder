import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './app.css';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug} from '../astryx-themes.js';
import App from './App.jsx';

// Always light: easier to read for most people.
createRoot(document.getElementById('root')).render(<Theme theme={themes[defaultThemeSlug]} mode="light"><App /></Theme>);
