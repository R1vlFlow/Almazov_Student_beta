export const APPEARANCE_PALETTES=[
 {id:'iris',name:'Ирис',color:'#4059c7',end:'#7252b5'},
 {id:'ocean',name:'Океан',color:'#176e91',end:'#2d59af'},
 {id:'forest',name:'Хвоя',color:'#226e5b',end:'#3d7852'},
 {id:'lavender',name:'Аметист',color:'#7150a8',end:'#99588b'},
 {id:'rose',name:'Гранат',color:'#994468',end:'#ad505a'},
 {id:'clay',name:'Терракота',color:'#a04f3d',end:'#a36332'},
 {id:'slate',name:'Сланец',color:'#4a627e',end:'#5c6387'},
 {id:'graphite',name:'Графит',color:'#454d60',end:'#666078'}
] as const;
export type AccentStyle='solid'|'gradient';
export function appearanceBackground(color:string,style:AccentStyle='solid'):string {
 const safe=/^#[\da-f]{6}$/i.test(color)?color:'#4059c7';
 const palette=APPEARANCE_PALETTES.find(p=>p.color.toLowerCase()===safe.toLowerCase());
 return style==='gradient'&&palette?`linear-gradient(135deg, ${palette.color}, ${palette.end})`:safe;
}
