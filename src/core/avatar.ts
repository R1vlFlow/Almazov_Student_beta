export const AVATAR_PRESETS = [
  {id:'profile',label:'Профиль'}, {id:'graduate',label:'Академия'},
  {id:'medicine',label:'Медицина'}, {id:'books',label:'Книги'},
  {id:'science',label:'Наука'}, {id:'leaf',label:'Природа'}, {id:'star',label:'Звезда'}
] as const;
export function normalizeAvatarPreset(value:unknown):string{
  const legacy:Record<string,string>={'🎓':'graduate','🩺':'medicine','📚':'books','🧬':'science','🌿':'leaf','⭐':'star'};
  if(typeof value!=='string')return 'profile';
  return legacy[value]??(AVATAR_PRESETS.some(p=>p.id===value)?value:'profile');
}
