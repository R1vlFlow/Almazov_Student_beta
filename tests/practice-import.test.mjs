import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

const {parsePracticeScheduleFile}=await import('../dist/services/practiceScheduleImport.js');

function file(name, content, type='text/plain') {
  return new File([content], name, {type});
}

const baseHeaders='Дата;Начало;Окончание;Предмет;Аудитория;Преподаватель;Группа;Программа;Курс;Тип';
const csvRow=(course,group,subject='ОРГ',type='Практика',program='31.05.01')=>`17.10.2026;09:00;12:25;${subject};ауд. 3.6;Петров П.П.;${group};${program};${course};${type}`;

for (const course of [4,5,6]) {
  test(`CSV import reads course ${course} practice and scopes it to the selected group`,async()=>{
    const csv=[baseHeaders,csvRow(course,`${course}24`),csvRow(course,`${course}25`,'Лекция','Лекция'),csvRow(course===6?5:6,`${course}24`,'Чужой курс')].join('\n');
    const rows=await parsePracticeScheduleFile(file('practice.csv',csv),{program:'31.05.01',course,group:`${course}24`});
    assert.equal(rows.length,1);
    assert.deepEqual([rows[0].course,rows[0].group,rows[0].date,rows[0].start,rows[0].end,rows[0].subject,rows[0].teacher],[course,`${course}24`,'2026-10-17','09:00','12:25','ОРГ','Петров П.П.']);
  });
}

test('TSV import accepts one time-range column and keeps the selected group',async()=>{
  const text=['Дата\tВремя\tПредмет\tГруппа\tТип','17.10.2026\t09:00–12:25\tАнатомия\t424\tПЗ'].join('\n');
  const rows=await parsePracticeScheduleFile(file('practice.tsv',text),{program:'31.05.01',course:4,group:'424'});
  assert.equal(rows.length,1);
  assert.deepEqual([rows[0].start,rows[0].end,rows[0].group],['09:00','12:25','424']);
});

test('Excel import converts numeric time cells and preserves teacher',async()=>{
  const workbook=XLSX.utils.book_new();
  const sheet=XLSX.utils.aoa_to_sheet([
    ['Дата','Начало','Окончание','Предмет','Аудитория','Преподаватель','Группа','Курс','Тип'],
    ['17.10.2026',0.375,0.5,'Фармакология','ауд. 1','Сидорова А.А.','524',5,'Практика']
  ]);
  XLSX.utils.book_append_sheet(workbook,sheet,'ПЗ');
  const bytes=XLSX.write(workbook,{type:'array',bookType:'xlsx'});
  const rows=await parsePracticeScheduleFile(file('practice.xlsx',bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),{program:'31.05.01',course:5,group:'524'});
  assert.equal(rows.length,1);
  assert.deepEqual([rows[0].date,rows[0].start,rows[0].end,rows[0].teacher],['2026-10-17','09:00','12:00','Сидорова А.А.']);
});

test('ICS import reads Moscow local time, group and teacher',async()=>{
  const ics=['BEGIN:VCALENDAR','BEGIN:VEVENT','DTSTART;TZID=Europe/Moscow:20261017T090000','DTEND;TZID=Europe/Moscow:20261017T102500','SUMMARY:Клиническая практика','LOCATION:ауд. 3.6','ATTENDEE:Иванов И.И.','GROUP:624','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const rows=await parsePracticeScheduleFile(file('practice.ics',ics,'text/calendar'),{program:'31.05.01',course:6,group:'624'});
  assert.equal(rows.length,1);
  assert.deepEqual([rows[0].date,rows[0].start,rows[0].end,rows[0].group,rows[0].teacher],['2026-10-17','09:00','10:25','624','Иванов И.И.']);
});
