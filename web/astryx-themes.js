/**
 * Themes Founder ships. Each theme's CSS is scoped to [data-astryx-theme="<slug>"], so loading all of them is safe.
 * @astryx-theme-record {"themes":{"gothic":"@astryxdesign/theme-gothic","chocolate":"@astryxdesign/theme-chocolate","matcha":"@astryxdesign/theme-matcha","neutral":"@astryxdesign/theme-neutral"},"defaultThemeSlug":"gothic"}
 */
import {gothicTheme} from '@astryxdesign/theme-gothic/built';
import {chocolateTheme} from '@astryxdesign/theme-chocolate/built';
import {matchaTheme} from '@astryxdesign/theme-matcha/built';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/theme-gothic/theme.css';
import '@astryxdesign/theme-gothic/fonts.css';
import '@astryxdesign/theme-chocolate/theme.css';
import '@astryxdesign/theme-chocolate/fonts.css';
import '@astryxdesign/theme-matcha/theme.css';
import '@astryxdesign/theme-matcha/fonts.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';

export const themes = {gothic: gothicTheme, chocolate: chocolateTheme, matcha: matchaTheme, neutral: neutralTheme};
// Gothic only has a dark palette.
export const modes = {gothic: 'dark'};
export const defaultThemeSlug = 'gothic';
