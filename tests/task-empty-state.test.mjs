import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {taskEmptyStateMarkup} from '../dist/ui/taskEmptyState.js';

test('a genuinely empty task list shows the hamster and keeps a working add-task action',async()=>{
 const markup=taskEmptyStateMarkup('empty');
 assert.match(markup,/Заданий пока нет/);assert.match(markup.replace(/<[^>]*>/g,''),/Мой глазик не видит алмазик/);
 assert.match(markup,/data-action="add-task"/);assert.match(markup,/alt="[^"]+"/);
 const src=markup.match(/src="\.\/([^"]+)"/)[1],image=await readFile(new URL('../dist/'+src,import.meta.url));
 assert.equal(image.subarray(1,4).toString(),'PNG');assert.equal(image.readUInt32BE(16),1254);assert.equal(image.readUInt32BE(20),1254);assert.equal(image[25],6,'RGBA asset preserves transparency');
 assert.match(markup,/loading="lazy"/);assert.match(markup,/decoding="async"/);
});
test('tasks hidden by filters do not masquerade as an empty task list',()=>{
 const markup=taskEmptyStateMarkup('filtered');
 assert.match(markup,/Нет заданий по этим фильтрам/);assert.match(markup,/Измените срок, статус, предмет/);
 assert.doesNotMatch(markup,/task-hamster|Заданий пока нет|Проверил/);assert.match(markup,/data-action="add-task"/);
});
test('an empty group scope keeps a direct route to tasks already saved for other groups',()=>{
 const markup=taskEmptyStateMarkup('empty-scope');
 assert.match(markup,/У этой группы пока нет заданий/);assert.match(markup,/Задания других групп сохранены/);
 assert.match(markup,/data-action="show-all-tasks"/);assert.match(markup,/Все мои задания/);assert.match(markup,/data-action="add-task"/);
 assert.doesNotMatch(taskEmptyStateMarkup('empty'),/data-action="show-all-tasks"/);
});
