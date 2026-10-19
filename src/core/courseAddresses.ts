import type {AlmazovAddress} from '../data/addresses.js';

const normalize=(s:string)=>s.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/ли\.\s*т(?=[.\s])/gu,'лит').replace(/[«»"']/g,'').replace(/\s+/g,' ').trim();
export function matchCourseAddresses(directory:AlmazovAddress[],locations:string[]){
  const matched=new Set<AlmazovAddress>();
  const unresolved:string[]=[];
  for(const raw of new Set(locations.map(x=>x.trim()).filter(Boolean))){
    const text=normalize(raw);
    const candidates=directory.filter(item=>{
      const name=normalize(item.name),address=normalize(item.address);
      const token=(s:string)=>new RegExp('(^|[^а-яa-z])'+s+'(?=$|[^а-яa-z])','u').test(text);
      if(name.startsWith('клинико-поликлинический')&&token('кпк'))return true;
      if(name.startsWith('центр доклинических')&&token('цдти'))return true;
      if(name.startsWith('детский лечебно')&&token('длрк'))return true;
      if(name.startsWith('федеральный перинатальный')&&token('пц'))return true;
      if(name==='институт медицинского образования'&&token('имо'))return true;
      if(name.includes('солнечный')&&text.includes('солнечное')){
        const letter=address.match(/лит\.\s*([а-я])/u)?.[1];
        return !!letter&&new RegExp('лит\\.?\\s*'+letter+'(?=$|[^а-я])','u').test(text);
      }
      // Full institution name is reliable; generic/partial names are not.
      if(name.length>20&&text.includes(name))return true;
      // Require an explicit street AND house; room numbers alone cannot match.
      const street=address.match(/(?:ул\.|пр-т|пр\.|пер\.|проспект|улица)\s*([^,]+)/u)?.[1]?.trim();
      const house=address.match(/(?:^|[\s,])д\.?\s*([0-9]+(?:[а-я]|\/[0-9]+)?)/u)?.[1];
      if(!street||!house||!text.includes(street))return false;
      if(!new RegExp('(?:д\\.?|дом)\\s*'+house.replace('/','\\/')+'(?=$|[^0-9а-я/])','u').test(text))return false;
      const letter=address.match(/лит\.\s*([а-я])/u)?.[1];
      return !letter||new RegExp('лит\\.?\\s*'+letter+'(?=$|[^а-я])','u').test(text);
    });
    if(candidates.length===1)matched.add(candidates[0]!);
    else unresolved.push(raw);
  }
  return {addresses:directory.filter(x=>matched.has(x)),unresolved};
}

export interface AddressPlace {key:string;name:string;address:string;members:AlmazovAddress[];locations:string[];subjects:string[];}
// Campus grouping is presentation-only: lesson routes retain the precise matcher above.
export function groupAddressPlaces(directory:AlmazovAddress[],rows:{location?:string;subject:string}[]){
  const places=new Map<string,AddressPlace>();
  const memberKeys=new Map<AlmazovAddress,string>();
  for(const item of directory){
    const sunny=/солнечное/u.test(normalize(item.address));
    const address=sunny?'г. Санкт-Петербург, пос. Солнечное, ул. Средняя, д. 6':item.address.replace(/,?\s*(?:лит\.|ауд\.|аудитория)\s*.*$/iu,'').trim();
    const key=normalize(address);
    let place=places.get(key);
    if(!place){place={key,name:sunny?'Солнечное':item.name,address,members:[],locations:[],subjects:[]};places.set(key,place);}
    place.members.push(item);memberKeys.set(item,key);
    if(!sunny&&new Set(place.members.map(x=>x.name)).size>1)place.name=address.replace(/^г\. Санкт-Петербург,\s*/u,'');
  }
  const unresolved=new Map<string,Set<string>>();
  const cache=new Map<string,AddressPlace|undefined>();
  for(const row of rows){
    const raw=row.location?.trim();if(!raw)continue;
    let place=cache.get(raw);
    if(!cache.has(raw)){
      const keys=new Set(matchCourseAddresses(directory,[raw]).addresses.map(x=>memberKeys.get(x)!));
      if(/солнечн(?:ое|ый)/u.test(normalize(raw))){for(const p of places.values())if(p.name==='Солнечное')keys.add(p.key);}
      place=keys.size===1?places.get([...keys][0]!):undefined;cache.set(raw,place);
    }
    if(place){if(!place.locations.includes(raw))place.locations.push(raw);if(!place.subjects.includes(row.subject))place.subjects.push(row.subject);}
    else {const name=raw.replace(/[,;\s]*(?:ауд(?:итория)?\.?|каб(?:инет)?\.?)\s*[\d].*$/iu,'').trim()||'Адрес не указан';const details=unresolved.get(name)??new Set<string>();details.add(raw);unresolved.set(name,details);}
  }
  return {places:[...places.values()],unresolved:[...unresolved].map(([name,details])=>({name,details:[...details]}))};
}
