const paths:Record<string,string>={
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 brain:'<path d="M12 5a3 3 0 0 0-5.8-1A4 4 0 0 0 3 10a4 4 0 0 0 1 7 4 4 0 0 0 8 2V5Zm0 0a3 3 0 0 1 5.8-1A4 4 0 0 1 21 10a4 4 0 0 1-1 7 4 4 0 0 1-8 2M7 8l2 2m8-2-2 2M6 15h3m6 0h3"/>',
 microscope:'<path d="m10 3 5 3-4 7-5-3 4-7Zm-3 8-1 2m8-5a7 7 0 0 1-1 13M3 21h17M5 17h6M9 4l2-2 5 3-1 2"/>',
 atom:'<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1"/>',
 flask:'<path d="M9 3h6m-5 0v7L4 19a1.5 1.5 0 0 0 1.3 2h13.4A1.5 1.5 0 0 0 20 19l-6-9V3M7 15h10M9 18h.01m5-1h.01"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
 moon:'<path d="M20.5 13.2A9 9 0 0 1 10.8 3.5 9 9 0 1 0 20.5 13.2Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 mountain:'<path d="m2 20 7-15 5 10 3-6 5 11H2Zm4-9 3 2 3-2"/>',
 waves:'<path d="M2 6c3-4 5 4 10 0s7 4 10 0M2 12c3-4 5 4 10 0s7 4 10 0M2 18c3-4 5 4 10 0s7 4 10 0"/>',
 flower:'<path d="M12 8C5 0 1 10 8 12c-8 7 2 11 4 4 7 8 11-2 4-4 8-7-2-11-4-4Z"/><circle cx="12" cy="12" r="2"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
 orbit:'<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/><path d="M7 4a10 10 0 0 1 14 9M3 11a10 10 0 0 0 14 9"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 refresh:'<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
 paperclip:'<path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L12 3M6 15l9-9"/>',
 flag:'<path d="M5 22V3c5-4 9 4 14 0v11c-5 4-9-4-14 0"/>',
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 graduate:'<path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v6c4 3 8 3 12 0v-6M22 9v8"/>',
 medicine:'<path d="M5 3v6a5 5 0 0 0 10 0V3M5 3h2m6 0h2M10 14v2a5 5 0 0 0 10 0v-3"/><circle cx="20" cy="10" r="3"/>',
 books:'<path d="M12 5v16M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V4Z"/>',
 science:'<path d="M8 3v4c0 5 8 5 8 10v4M16 3v4c0 5-8 5-8 10v4M8 4h8M9 8h6M9 16h6M8 20h8"/>',
 leaf:'<path d="M20 3c-9 0-16 3-16 10a7 7 0 0 0 7 7c7 0 9-8 9-17ZM3 21 15 9"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
 home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m6 0h2m-10 3h2"/>',
 tasks:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--surface)"/><circle cx="15" cy="17" r="3" fill="var(--surface)"/>'
};
/** Only fixed, trusted path data is rendered; user input never becomes SVG markup. */
export function icon(name:string):string{
 return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]??paths.profile}</svg>`;
}
