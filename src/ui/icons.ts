import {UI_ICON_PATHS,AVATAR_ICON_PATHS} from './iconAssets.js';
/** Trusted, locally bundled Phosphor paths. No external fonts or requests. */
export function icon(name:string):string{return `<svg class="ui-icon" viewBox="0 0 256 256" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">${UI_ICON_PATHS[name]??UI_ICON_PATHS.profile}</svg>`;}
export function avatarIcon(name:string):string{return `<svg class="ui-icon avatar-symbol" viewBox="0 0 256 256" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">${AVATAR_ICON_PATHS[name]??AVATAR_ICON_PATHS.profile}</svg>`;}
