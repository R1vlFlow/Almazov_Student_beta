export const APPEARANCE_PALETTES=[
 {id:'iris',name:'Ирис',color:'#4059c7',end:'#7252b5'},
 {id:'ocean',name:'Океан',color:'#176e91',end:'#2d59af'},
 {id:'forest',name:'Хвоя',color:'#226e5b',end:'#3d7852'},
 {id:'lavender',name:'Аметист',color:'#7150a8',end:'#99588b'},
 {id:'rose',name:'Гранат',color:'#994468',end:'#ad505a'},
 {id:'clay',name:'Терракота',color:'#a04f3d',end:'#a36332'},
 {id:'slate',name:'Сланец',color:'#4a627e',end:'#5c6387'},
 {id:'graphite',name:'Графит',color:'#454d60',end:'#666078'},
 {id:'ruby',name:'Рубин',color:'#b91c1c',end:'#be123c'},
 {id:'coral',name:'Коралл',color:'#b34436',end:'#9f2d50'},
 {id:'amber',name:'Янтарь',color:'#9d5a08',end:'#a16207'},
 {id:'olive',name:'Олива',color:'#65721d',end:'#4d7c0f'},
 {id:'lime',name:'Лайм',color:'#4d7c0f',end:'#3f6212'},
 {id:'green',name:'Зелёный',color:'#15803d',end:'#166534'},
 {id:'jade',name:'Нефрит',color:'#047857',end:'#065f46'},
 {id:'teal',name:'Бирюза',color:'#0f766e',end:'#115e59'},
 {id:'cyan',name:'Циан',color:'#0e7490',end:'#155e75'},
 {id:'sky',name:'Лазурь',color:'#0369a1',end:'#075985'},
 {id:'royal',name:'Синий',color:'#1d4ed8',end:'#1e40af'},
 {id:'indigo',name:'Индиго',color:'#4338ca',end:'#3730a3'},
 {id:'violet',name:'Фиолетовый',color:'#6d28d9',end:'#5b21b6'},
 {id:'purple',name:'Пурпур',color:'#7e22ce',end:'#6b21a8'},
 {id:'plum',name:'Слива',color:'#86198f',end:'#701a75'},
 {id:'magenta',name:'Фуксия',color:'#a21caf',end:'#86198f'}
] as const;
export const GRADIENT_PALETTES=[
 {id:'blue-purple',name:'Синий / фиолетовый',color:'#4338ca',from:'#2563eb',to:'#9333ea'},
 {id:'teal-blue',name:'Бирюза / синий',color:'#0f766e',from:'#0f766e',to:'#1d4ed8'},
 {id:'violet-pink',name:'Фиолетовый / розовый',color:'#7e22ce',from:'#6d28d9',to:'#be185d'},
 {id:'rose-orange',name:'Роза / оранжевый',color:'#b91c1c',from:'#be123c',to:'#b45309'},
 {id:'green-teal',name:'Зелёный / бирюза',color:'#047857',from:'#166534',to:'#0e7490'},
 {id:'indigo-rose',name:'Индиго / рубин',color:'#4338ca',from:'#3730a3',to:'#b91c1c'},
 {id:'purple-blue',name:'Пурпур / синий',color:'#7e22ce',from:'#a21caf',to:'#1d4ed8'},
 {id:'amber-red',name:'Янтарь / красный',color:'#9d5a08',from:'#b45309',to:'#b91c1c'},
 {id:'cyan-violet',name:'Циан / фиолетовый',color:'#0e7490',from:'#155e75',to:'#7c3aed'},
 {id:'olive-jade',name:'Олива / нефрит',color:'#047857',from:'#4d7c0f',to:'#047857'},
 {id:'rose-plum',name:'Роза / слива',color:'#994468',from:'#be185d',to:'#581c87'},
 {id:'blue-night',name:'Лазурь / индиго',color:'#1d4ed8',from:'#0369a1',to:'#312e81'},
 {id:'forest-amber',name:'Хвоя / охра',color:'#226e5b',from:'#166534',to:'#92400e'},
 {id:'slate-violet',name:'Сланец / аметист',color:'#4a627e',from:'#334155',to:'#7e22ce'},
 {id:'coral-plum',name:'Коралл / слива',color:'#b34436',from:'#b34436',to:'#86198f'},
 {id:'emerald-indigo',name:'Изумруд / индиго',color:'#047857',from:'#047857',to:'#4338ca'},
 {id:'sky-cherry',name:'Синий / вишня',color:'#1d4ed8',from:'#1d4ed8',to:'#9d174d'},
 {id:'violet-copper',name:'Фиолетовый / медь',color:'#7150a8',from:'#6d28d9',to:'#9a3412'},
 {id:'pastel-pink',name:'Розовый / лаванда',color:'#994468',from:'#f9a8d4',to:'#c4b5fd'},
 {id:'pastel-sky',name:'Мята / голубой',color:'#0369a1',from:'#a5f3fc',to:'#93c5fd'},
 {id:'pastel-peach',name:'Персик / розовый',color:'#a04f3d',from:'#fdba74',to:'#fda4af'},
 {id:'pastel-lime',name:'Лайм / мята',color:'#047857',from:'#d9f99d',to:'#6ee7b7'},
 {id:'pastel-gold',name:'Ваниль / розовый',color:'#9d5a08',from:'#fde68a',to:'#fecdd3'},
 {id:'pastel-lilac',name:'Сирень / пудра',color:'#7150a8',from:'#c7d2fe',to:'#fbcfe8'}
] as const;
export type AccentStyle='solid'|'gradient';
export function validGradientId(value:unknown):value is string{return typeof value==='string'&&GRADIENT_PALETTES.some(p=>p.id===value);}
export function gradientBackground(id:string):string {
 const palette=GRADIENT_PALETTES.find(p=>p.id===id);return palette?`linear-gradient(120deg, ${palette.from} 0%, ${palette.to} 100%)`:'';
}
export function gradientForeground(id?:string):string {return id?.startsWith('pastel-')?'#172033':'#ffffff';}
export function appearanceBackground(color:string,style:AccentStyle='solid',gradientId?:string):string {
 const safe=/^#[\da-f]{6}$/i.test(color)?color:'#4059c7';
 if(style==='gradient'&&gradientId&&validGradientId(gradientId))return gradientBackground(gradientId);
 const palette=APPEARANCE_PALETTES.find(p=>p.color.toLowerCase()===safe.toLowerCase());
 return style==='gradient'&&palette?`linear-gradient(135deg, ${palette.color}, ${palette.end})`:safe;
}
