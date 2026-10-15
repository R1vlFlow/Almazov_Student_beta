import { boot } from './app.js';
boot().catch((err) => { window.dispatchEvent(new Event('app:error')); const el = document.getElementById('fatalError'); if (el) {
    el.textContent = err instanceof Error ? err.message : 'Неизвестная ошибка';
    el.classList.add('show');
} });
