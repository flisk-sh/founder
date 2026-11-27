/**
 * Founder uses one warm, light theme: its users are restaurant and shop owners, so it should feel calm and readable.
 * @astryx-theme-record {"themes":{"chocolate":"@astryxdesign/theme-chocolate"},"defaultThemeSlug":"chocolate"}
 */
import {chocolateTheme} from '@astryxdesign/theme-chocolate/built';
import '@astryxdesign/theme-chocolate/theme.css';
import '@astryxdesign/theme-chocolate/fonts.css';

export const themes = {chocolate: chocolateTheme};
export const defaultThemeSlug = 'chocolate';
