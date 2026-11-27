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

export interface GuideSection {id:string;chapter:string;title:string;first:number;last:number;keywords:string;}
export const GUIDE_SECTIONS:GuideSection[]=[
 {id:'welcome',chapter:'start',title:'О гайде',first:1,last:2,keywords:'начало авторы памятка'},
 {id:'leadership',chapter:'start',title:'Руководство института',first:3,last:4,keywords:'директор руководство институт'},
 {id:'dean',chapter:'start',title:'Деканат',first:5,last:6,keywords:'декан сотрудники вопросы факультет'},
 {id:'curators',chapter:'start',title:'Кураторы',first:7,last:8,keywords:'помощь поддержка просвет'},
 {id:'terms',chapter:'start',title:'Учебные понятия',first:9,last:10,keywords:'словарь лекция практика пз зачёт экзамен сессия'},
 {id:'subjects',chapter:'start',title:'Предметы первого курса',first:11,last:11,keywords:'дисциплины семестр учеба'},
 {id:'shopping',chapter:'start',title:'Что купить к занятиям',first:12,last:14,keywords:'халат сменка одежда тетрадь канцелярия покупки'},
 {id:'buildings',chapter:'campus',title:'Знакомство с корпусами',first:15,last:17,keywords:'адрес школа башня гкк имо цдти нок солнечное'},
 {id:'pass',chapter:'campus',title:'Студенческий билет и пропуск',first:18,last:18,keywords:'вход документы студенческий карта'},
 {id:'dorm',chapter:'campus',title:'Общежитие',first:19,last:20,keywords:'солнечное проживание вещи комната'},
 {id:'transport',chapter:'routes',title:'О маршрутах',first:21,last:21,keywords:'дорога транспорт'},
 {id:'school-route',chapter:'routes',title:'Дорога до Школы',first:22,last:29,keywords:'школа аккуратова удельная пионерская электричка вход'},
 {id:'tower-route',chapter:'routes',title:'Вход в Башню и ГКК',first:30,last:30,keywords:'башня гкк кпк аккуратова'},
 {id:'imo-route',chapter:'routes',title:'Дорога до ИМО и НОК',first:31,last:38,keywords:'имо нок коломяжский пионерская удельная'},
 {id:'cdti-route',chapter:'routes',title:'Дорога до ЦДТИ',first:39,last:40,keywords:'цдти долгоозерная автобус'},
 {id:'sunny-route',chapter:'routes',title:'Дорога в Солнечное',first:41,last:45,keywords:'солнечное средняя электричка поезд автобус'},
 {id:'communities',chapter:'community',title:'Студенческие сообщества',first:46,last:46,keywords:'внеучебная деятельность'},
 {id:'union',chapter:'community',title:'Профсоюз, спорт и КВН',first:47,last:50,keywords:'профсоюз помощь спорт спортивный клуб квн'},
 {id:'clubs',chapter:'community',title:'Клубы, медиа и волонтёрство',first:51,last:56,keywords:'творчество студии медиа волонтер наука сно сому'},
 {id:'councils',chapter:'community',title:'Студенческие советы',first:57,last:58,keywords:'студсовет совет обучающихся'},
 {id:'food',chapter:'break',title:'Где перекусить рядом с корпусом',first:59,last:63,keywords:'еда кофе кафе обед вкусные места'},
 {id:'canteens',chapter:'break',title:'Столовые',first:64,last:64,keywords:'еда обед питание столовая'},
 {id:'questions-intro',chapter:'questions',title:'Бытовые вопросы',first:65,last:65,keywords:'документы помощь'},
 {id:'scholarships',chapter:'questions',title:'Стипендии',first:66,last:67,keywords:'выплаты материальная помощь деньги'},
 {id:'health',chapter:'questions',title:'Медицинская помощь',first:68,last:68,keywords:'поликлиника врач прикрепление здоровье'},
 {id:'military',chapter:'questions',title:'Воинский учёт',first:69,last:70,keywords:'военкомат документы учет отсрочка'},
 {id:'authors',chapter:'questions',title:'Авторы гайда',first:71,last:71,keywords:'просвет кураторы авторы'}
];
const searchable=(text:string)=>text.toLocaleLowerCase('ru').replace(/ё/g,'е');
export function findGuideSections(query:string):GuideSection[]{const words=searchable(query).trim().split(/\s+/).filter(Boolean);return GUIDE_SECTIONS.filter(s=>words.every(word=>searchable(s.title+' '+s.keywords).includes(word)));}
export function guideSectionForPage(page:number):GuideSection|undefined{return GUIDE_SECTIONS.find(s=>page>=s.first&&page<=s.last);}
