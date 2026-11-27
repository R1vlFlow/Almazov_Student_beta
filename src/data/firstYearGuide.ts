export const GUIDE_ROOT='./assets/guides/first-year-2026-27/';
export const GUIDE_PDF=GUIDE_ROOT+'guide.pdf';
export const GUIDE_PDF_BYTES=38315294;
export const GUIDE_PAGE_COUNT=71;
const range=(first:number,last:number)=>Array.from({length:last-first+1},(_,i)=>first+i);
export interface GuideChapter {id:string;title:string;description:string;pages:number[];keywords:string;}
export const GUIDE_CHAPTERS:GuideChapter[]=[
 {id:'start',title:'Первые шаги',description:'Кураторы, учебные понятия и вещи для первых занятий.',pages:range(1,14),keywords:'начало куратор деканат справка лекция практика халат сменка тетрадь'},
 {id:'campus',title:'Корпуса и проживание',description:'Знакомство с площадками, пропуском и общежитием.',pages:range(15,20),keywords:'корпус школа башня гкк кпк имо цдти нок солнечное адрес общежитие студенческий билет пропуск'},
 {id:'routes',title:'Как добраться',description:'Фотоориентиры и маршруты из гайда. Актуальный путь открывается в Яндекс Картах.',pages:range(21,45),keywords:'дорога метро удельная пионерская электричка поезд автобус вход транспорт'},
 {id:'community',title:'Студенческая жизнь',description:'Наука, спорт, творчество, волонтёрство и студенческие сообщества.',pages:range(46,58),keywords:'сно спорт совет профсоюз клуб медиа волонтер поддержка психология квн'},
 {id:'break',title:'Между парами',description:'Столовые и места рядом с корпусами — глазами кураторов.',pages:range(59,64),keywords:'еда столовая кофе обед кафе перекус'},
 {id:'questions',title:'Важные вопросы',description:'Стипендии, медпомощь, воинский учёт и авторы памятки.',pages:range(65,71),keywords:'стипендия выплаты поликлиника врач медицинская помощь воинский учет документы авторы'}
];
export interface GuideCampus {id:string;title:string;summary:string;pages:number[];}
export const GUIDE_CAMPUSES:GuideCampus[]=[
 {id:'school',title:'Школа',summary:'Аккуратова, 11. Вход через КПП; возьмите пропуск.',pages:[16,...range(22,29)]},
 {id:'tower',title:'Башня и ГКК',summary:'Аккуратова, 2. Башня и клинический комплекс находятся на одной территории.',pages:[16,30]},
 {id:'imo',title:'ИМО',summary:'Коломяжский, 21. В гайде показаны подходы от Пионерской и Удельной.',pages:[15,...range(31,38)]},
 {id:'cdti',title:'ЦДТИ',summary:'Долгоозерная, 43. Уточните аудиторию до первого посещения.',pages:[17,39,40]},
 {id:'sunny',title:'Солнечное',summary:'Средняя, 6. Нужный корпус сверяйте с местом занятия.',pages:[15,...range(41,45)]},
 {id:'nok',title:'НОК',summary:'Коломяжский, 25 — адрес из гайда кураторов. Вход и назначение занятий уточняйте по расписанию.',pages:[17,37,38]}
];
export const GUIDE_CORRECTIONS:Record<number,string>={
 15:'Для маршрута в Солнечное используем общий адрес: Средняя улица, 6. Внутренний номер корпуса уточняйте по расписанию. ИМО находится на Коломяжском, 21; ДЛРК — на Коломяжском, 21, корпус 2.',
 30:'В заголовке исходной страницы опечатка: Башня и ГКК находятся на Аккуратова, 2. Адрес Аккуратова, 11 относится к Школе.',
 41:'Общий адрес учебной площадки: пос. Солнечное, Средняя улица, 6. Букву или внутренний номер корпуса уточняйте по расписанию.'
};
export function guidePageUrl(page:number):string{if(!Number.isInteger(page)||page<1||page>GUIDE_PAGE_COUNT)throw new Error('Страница вне гайда');return GUIDE_ROOT+'page-'+String(page).padStart(2,'0')+'.webp';}
export function findGuideChapters(query:string):GuideChapter[]{const q=query.trim().toLocaleLowerCase('ru').replace(/ё/g,'е');return GUIDE_CHAPTERS.filter(c=>!q||[c.title,c.description,c.keywords].join(' ').toLocaleLowerCase('ru').replace(/ё/g,'е').includes(q));}
