(()=>{
  const BUILD_ID='__BUILD_ID__';
  document.documentElement.dataset.buildId=BUILD_ID;
  const showBuildLabel=()=>{const buildLabel=document.getElementById('appBuildLabel');if(buildLabel)buildLabel.textContent=BUILD_ID;};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showBuildLabel,{once:true});
  else showBuildLabel();
  try{
    const stored=localStorage.getItem('almazov.theme')||'system';
    const prefersLight=window.matchMedia?.('(prefers-color-scheme: light)').matches===true;
    const light=stored==='light'||(stored==='system'&&prefersLight);
    const actual=light?'light':'dark';
    document.documentElement.dataset.theme=actual;
    document.documentElement.dataset.themePreference=stored;
    document.documentElement.style.colorScheme=actual;
    const meta=document.querySelector('meta[name=theme-color]');
    if(meta)meta.setAttribute('content',actual==='dark'?'#111722':'#f4f7fb');
  }catch{
    document.documentElement.dataset.theme='dark';
    document.documentElement.dataset.themePreference='system';
    document.documentElement.style.colorScheme='dark';
    const meta=document.querySelector('meta[name=theme-color]');
    if(meta)meta.setAttribute('content','#111722');
  }

  // Verify the deployed build on every page load. The unique query and no-store
  // bypass both the browser HTTP cache and stale service-worker entries.
  let updateCheckRunning=false;
  async function checkForNewBuild(showStatus=false){
    if(updateCheckRunning)return;
    updateCheckRunning=true;
    const abort=new AbortController();
    const timeout=setTimeout(()=>abort.abort(),10000);
    const status=document.getElementById('appUpdateStatus');
    if(showStatus&&status)status.textContent='Проверяем опубликованную версию…';
    try{
      if(window.Capacitor?.isNativePlatform?.()){
        const current=await fetch('./android-release.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('metadata');return r.json();});
        const remote=await fetch('https://r1vlflow.github.io/Almazov_Student_beta/android-release.json?check='+Date.now(),{cache:'no-store',signal:abort.signal}).then(r=>{if(!r.ok)throw Error('metadata');return r.json();});
        if(!Number.isInteger(current.versionCode)||!Number.isInteger(remote.versionCode))throw Error('metadata');
        if(remote.versionCode>current.versionCode){
          if(status)status.textContent='Доступна новая версия Android. Сохраните резервную копию перед установкой.';
          const href=new URL(remote.apkUrl);
          if(href.origin==='https://github.com'&&href.pathname.startsWith('/R1vlFlow/Almazov_Student_beta/releases/download/')&&href.pathname.endsWith('.apk')&&document.body&&!document.getElementById('availableAndroidUpdate')){
            const banner=document.createElement('aside');banner.id='availableAndroidUpdate';banner.className='card update-offer';banner.setAttribute('role','status');const text=document.createElement('p');text.textContent='Доступно обновление Android '+String(remote.version)+'. Сначала сохраните резервную копию в настройках.';const link=document.createElement('a');link.className='btn primary';link.href=href.href;link.textContent='Скачать обновление APK';banner.append(text,link);document.body.append(banner);
          }
        }else if(showStatus&&status)status.textContent='Установлена актуальная опубликованная версия Android '+current.version+'.';
        return;
      }
      const url=new URL('./version.json',window.location.href);
      url.searchParams.set('check',String(Date.now()));
      const response=await fetch(url,{cache:'no-store',signal:abort.signal,headers:{'Cache-Control':'no-cache'}});
      if(!response.ok){if(showStatus&&status)status.textContent=`Не удалось проверить релиз (HTTP ${response.status}).`;return;}
      const release=await response.json();
      if(!release?.buildId){if(showStatus&&status)status.textContent='Опубликованный version.json не содержит идентификатор сборки.';return;}
      const pageUrl=new URL(window.location.href);
      if(release.buildId===BUILD_ID){
        let cleanUrl=false;
        for(const key of ['__app_build','__root_refresh']){if(pageUrl.searchParams.has(key)){pageUrl.searchParams.delete(key);cleanUrl=true;}}
        if(cleanUrl)history.replaceState(history.state,'',pageUrl.href);
        if(showStatus&&window.Capacitor?.isNativePlatform?.()){if(status)status.textContent='Проверена встроенная версия APK. Обновления Android устанавливаются отдельным APK; веб-версия обновляется на сайте.';return;}
        if(showStatus){const status=document.getElementById('appUpdateStatus');if(status)status.textContent=`Приложение обновлено: ${BUILD_ID}`;}
        return;
      }
      // One cache-busting navigation per newly discovered build; never reload-loop.
      let previous='',lastAttempt=0;
      try{previous=sessionStorage.getItem('almazov:last-build-refresh')||'';lastAttempt=Number(sessionStorage.getItem('almazov:last-build-refresh-at')||0);}catch{}
      if(previous===release.buildId&&Date.now()-lastAttempt<60000){if(showStatus&&status)status.textContent=`Обнаружен релиз ${release.buildId}; обновите страницу ещё раз, если интерфейс не изменился.`;return;}
      try{sessionStorage.setItem('almazov:last-build-refresh',release.buildId);sessionStorage.setItem('almazov:last-build-refresh-at',String(Date.now()));}catch{}
      pageUrl.searchParams.set('__app_build',release.buildId);
      if(showStatus&&status)status.textContent=`Новая версия ${release.buildId} найдена. Перезагружаем приложение…`;
      const offer=()=>{
        let banner=document.getElementById('availableUpdate');
        if(!banner){
          banner=document.createElement('aside');banner.id='availableUpdate';banner.className='card update-offer';banner.setAttribute('role','status');
          const message=document.createElement('p');message.textContent='Доступна новая версия. Сохраните изменения перед обновлением.';
          const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent='Обновить сейчас';
          button.addEventListener('click',async()=>{
            if(!window.confirm('Сохранены ли ваши изменения? Страница будет перезагружена.'))return;
            button.disabled=true;
            try{const registration=await navigator.serviceWorker?.getRegistration();if(registration?.waiting){await new Promise(resolve=>{const timer=setTimeout(resolve,5000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve();},{once:true});registration.waiting.postMessage({type:'SKIP_WAITING'});});}}catch{}
            window.location.replace(pageUrl.href);
          });
          banner.append(message,button);document.body.append(banner);
        }
      };
      if(document.body)offer();else document.addEventListener('DOMContentLoaded',offer,{once:true});
      if(status)status.textContent='Доступно обновление. Нажмите «Обновить сейчас», когда сохраните изменения.';
    }catch{if(showStatus&&status)status.textContent='Не удалось проверить обновление. Проверьте интернет и повторите попытку.';}
    finally{clearTimeout(timeout);updateCheckRunning=false;}
  }

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'})
      .then(registration=>registration.update().catch(()=>{}))
      .catch(()=>{});
  }
  window.addEventListener('app:check-update',async()=>{
    try{const registration=await navigator.serviceWorker?.getRegistration();if(registration)await registration.update().catch(()=>{});}catch{}
    try{sessionStorage.removeItem('almazov:last-build-refresh');}catch{}
    await checkForNewBuild(true);
  });
  navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='APP_UPDATE_AVAILABLE')void checkForNewBuild();});
  void checkForNewBuild();
  // Resume from background / back-forward cache and recover after going online.
  function resumeUpdateCheck(){if(document.visibilityState==='hidden')return;void checkForNewBuild();navigator.serviceWorker?.getRegistration().then(r=>r?.update()).catch(()=>{});}
  window.addEventListener('pageshow',resumeUpdateCheck);
  window.addEventListener('online',resumeUpdateCheck);
  document.addEventListener('visibilitychange',resumeUpdateCheck);
  setInterval(resumeUpdateCheck,5*60*1000);

  // Native install prompt (Chrome/Android) plus accurate Safari/iOS guidance.
  var deferredInstallPrompt = null;
  function installDialog(message) {
    var dialog = document.getElementById('installHelpDialog');
    var hint = document.getElementById('installPlatformHint');
    if (hint && message) hint.textContent = message;
    if (dialog && typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else if (message) {
      window.alert(message + '\n\nДля iPhone используйте Safari → Поделиться → На экран «Домой».');
    }
  }
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    document.querySelectorAll('[data-install-pwa]').forEach(function (button) {
      button.textContent = 'Добавить на главный экран';
      button.setAttribute('aria-label', 'Добавить веб-приложение на главный экран');
    });
  });
  window.addEventListener('appinstalled', function () {
    deferredInstallPrompt = null;
    document.querySelectorAll('[data-install-pwa]').forEach(function (button) { button.textContent = 'Приложение установлено'; });
    installDialog('Приложение установлено на это устройство.');
  });
  document.addEventListener('click', async function (event) {
    var target = event.target instanceof Element ? event.target.closest('[data-install-pwa], [data-install-close]') : null;
    if (!target) return;
    if (target.hasAttribute('data-install-close')) {
      var dialog = document.getElementById('installHelpDialog');
      if (dialog && typeof dialog.close === 'function') dialog.close();
      return;
    }
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) {
      installDialog('Веб-приложение уже открыто в установленном режиме. Повторная установка не нужна.');
      return;
    }
    if (target.disabled) return;
    if (deferredInstallPrompt) {
      try {
        var promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = null;
        target.disabled = true;
        target.textContent = 'Открываем окно браузера…';
        var status = document.getElementById('pwaInstallStatus');
        if (status) status.textContent = 'Подтвердите установку в окне браузера. APK не скачивается.';
        var promptTimer;
        var result = await Promise.race([Promise.resolve(promptEvent.prompt()).then(function () { return promptEvent.userChoice; }), new Promise(function (resolve) { promptTimer = setTimeout(function () { resolve({outcome:'timeout'}); }, 12000); })]);
        clearTimeout(promptTimer);
        if (result && result.outcome === 'timeout') {
          if (status) status.textContent = 'Окно браузера не ответило. Откройте меню браузера → Установить приложение / На главный экран.';
          return;
        }
        if (status) status.textContent = result && result.outcome === 'accepted' ? 'Установка запущена.' : 'Установка отменена. Её можно повторить из меню браузера.';
        if (window.zalmaTrack) window.zalmaTrack(result && result.outcome === 'accepted' ? 'pwa_install_accepted' : 'pwa_install_dismissed');
      } catch (_) { installDialog('Браузер не смог открыть системное окно установки. Используйте меню браузера или инструкцию ниже.'); }
      finally { clearTimeout(promptTimer); target.disabled = false; target.textContent = 'Добавить на главный экран'; }
      return;
    }
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    installDialog(isIOS ? 'Для установки на iPhone или iPad откройте этот сайт в Safari.' : 'Системный запрос установки сейчас недоступен. Откройте меню браузера и выберите установку приложения. Для этого не нужно скачивать APK.');
  });
  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target.closest('[data-download-apk]') : null;
    if (!target) return;
    var status = document.getElementById('apkDownloadStatus');
    if (status) status.textContent = navigator.onLine === false ? 'Нет подключения. Подключитесь к интернету и повторите скачивание.' : 'Запрос на скачивание отправлен в GitHub. Проверьте загрузки браузера; если файл не появился, используйте резервную ссылку ниже.';
    if (window.zalmaTrack) window.zalmaTrack('apk_download_clicked');
  });
  function initStartupNotice(){
    const splash=document.getElementById('appSplash'),app=document.querySelector('.app');if(splash&&app)app.inert=true;
    const notice=document.getElementById('releaseNotice'),dismiss=document.getElementById('dismissReleaseNotice');
    try{if(notice&&localStorage.getItem('almazov.notice.build')!==BUILD_ID)notice.hidden=false;}catch{}
    dismiss?.addEventListener('click',()=>{if(notice)notice.hidden=true;try{localStorage.setItem('almazov.notice.build',BUILD_ID);}catch{}});
    if(!splash)return;const started=performance.now(),fill=document.getElementById('splashFill'),track=document.getElementById('splashTrack'),status=document.getElementById('splashStatus'),note=document.getElementById('splashNote');let progress=8,ready=false;
    const paint=(value)=>{progress=Math.max(progress,Math.min(100,value));if(fill)fill.style.width=progress+'%';if(track)track.setAttribute('aria-valuenow',String(Math.round(progress)));if(status)status.textContent=progress>74?'Проверяем, всё ли на месте…':progress>42?'Повторяем анатомию…':progress>16?'Раскладываем учебники…':'Собираем расписание…';};
    const timer=setInterval(()=>{if(!ready)paint(progress<86?progress+Math.max(.3,(86-progress)*.035):86);},180);
    const finish=()=>{if(ready)return;ready=true;clearInterval(timer);const wait=Math.max(0,750-(performance.now()-started));setTimeout(()=>{paint(100);if(note)note.textContent='Команда готова. И ты тоже.';setTimeout(()=>{splash.classList.add('is-hidden');if(app)app.inert=false;setTimeout(()=>splash.remove(),420);},180);},wait);};
    window.addEventListener('app:ready',finish,{once:true});window.addEventListener('app:error',finish,{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initStartupNotice,{once:true});else initStartupNotice();

})();
