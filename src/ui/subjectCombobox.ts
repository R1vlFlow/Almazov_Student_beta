import {subjectDisplayName} from '../core/normalize.js';
export {subjectDisplayName} from '../core/normalize.js';
let subjects:string[]=[],installed=false;
export function subjectSuggestions(values:string[]):string[]{const unique=new Map<string,string>();for(const value of values){const name=subjectDisplayName(value),key=name.toLocaleLowerCase('ru');if(name&&!unique.has(key))unique.set(key,name);}return [...unique.values()].sort((a,b)=>a.localeCompare(b,'ru'));}
export function setTaskSubjects(values:string[]){subjects=subjectSuggestions(values);}
export function initSubjectCombobox(){
 if(installed)return;installed=true;
 const input=document.getElementById('taskSubject') as HTMLInputElement,popup=document.getElementById('taskSubjectOptions')!;
 let visible:string[]=[],active=-1;
 const close=()=>{popup.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;};
 const position=()=>{if(popup.hidden)return;const r=input.getBoundingClientRect(),m=input.closest('.modal')!.getBoundingClientRect(),vv=window.visualViewport,top=Math.max(m.top,vv?.offsetTop??0)+8,bottom=Math.min(m.bottom,(vv?.offsetTop??0)+(vv?.height??innerHeight))-8,below=bottom-r.bottom-6,above=r.top-top-6,h=Math.max(44,Math.min(260,Math.max(below,above))),up=below<140&&above>below;Object.assign(popup.style,{position:'fixed',left:r.left+'px',width:r.width+'px',maxHeight:h+'px',top:(up?Math.max(top,r.top-6-Math.min(h,popup.scrollHeight)):r.bottom+6)+'px'});};
 const paintActive=()=>{popup.querySelectorAll<HTMLElement>('[role=option]').forEach((el,i)=>{el.setAttribute('aria-selected',String(i===active));if(i===active){input.setAttribute('aria-activedescendant',el.id);el.scrollIntoView({block:'nearest'});}});};
 const choose=(value:string)=>{input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));close();input.focus();};
 const show=()=>{if(!input.closest('.modal-backdrop')?.classList.contains('open'))return;const q=subjectDisplayName(input.value).toLocaleLowerCase('ru');visible=subjects.filter(s=>!q||s.toLocaleLowerCase('ru').includes(q)).slice(0,40);popup.replaceChildren();for(const [i,name] of visible.entries()){const b=document.createElement('button');b.type='button';b.id='task-subject-option-'+i;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.textContent=name;b.addEventListener('pointerdown',e=>e.preventDefault());b.addEventListener('click',()=>choose(name));popup.append(b);}if(!visible.length){const p=document.createElement('p');p.textContent='Можно оставить своё название предмета';popup.append(p);}active=-1;input.removeAttribute('aria-activedescendant');popup.hidden=false;input.setAttribute('aria-expanded','true');position();};
 input.addEventListener('focus',show);input.addEventListener('input',show);input.addEventListener('blur',()=>setTimeout(close,0));
 input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();if(popup.hidden)show();if(visible.length){active=(active+(e.key==='ArrowDown'?1:-1)+visible.length)%visible.length;paintActive();}return;}if(!popup.hidden&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(!popup.hidden&&e.key==='Enter'&&active>=0){e.preventDefault();e.stopPropagation();choose(visible[active]!);}if(e.key==='Tab')close();});
 document.addEventListener('pointerdown',e=>{if(e.target!==input&&!popup.contains(e.target as Node))close();});
 document.addEventListener('scroll',position,{capture:true,passive:true});window.addEventListener('resize',()=>requestAnimationFrame(position),{passive:true});window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(position),{passive:true});
}
