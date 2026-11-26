import {APPEARANCE_PALETTES,appearanceBackground,type AccentStyle} from '../core/appearance.js';
import {escapeHtml as esc} from './studyPlanner.js';

export function appearancePickerMarkup(color:string,style:AccentStyle):string {
 const custom=!APPEARANCE_PALETTES.some(p=>p.color.toLowerCase()===color.toLowerCase())&&/^#[\da-f]{6}$/i.test(color)?[{id:'custom',name:'Ваш цвет',color,end:color}]:[];
 return [...custom,...APPEARANCE_PALETTES].map(p=>`<button type="button" class="palette-option" data-accent-color="${p.color}" aria-pressed="${p.color.toLowerCase()===color.toLowerCase()}" aria-label="${esc(p.name)}"><span class="palette-sample" style="background:${appearanceBackground(p.color,style)}"><i aria-hidden="true">✓</i></span><span>${esc(p.name)}</span></button>`).join('');
}
