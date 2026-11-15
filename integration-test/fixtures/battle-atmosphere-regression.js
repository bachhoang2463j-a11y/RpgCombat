/* 战场氛围：真实 iframe 主题、即时设置、生命周期与光环居中回归。 */
(function () {
  'use strict';
  window.runBattleAtmosphereRegression = async function ({ w, check, eq, mock, source = '' }) {
    const ev = code => w.eval(code), wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const mod = w.arcaneAtmoModule, doc = w.document, pending = [];
    const names = ['resolveBattleAtmosphere', 'setBattleAtmosphereData', 'startBattleAtmosphere', 'stopBattleAtmosphere',
      'refreshBattleAtmosphere', 'setBattleAtmosphereSelection', 'setBattleAtmosphereSound', 'buildBattleAtmosphereSettingsHtml', 'syncBattleAtmosphereControls'];
    names.forEach(name => check(typeof w[name] === 'function', '氛围公开入口：' + name));
    ['setTheme', 'getTheme', 'setAmbientSound', 'getAmbientSound', 'isAmbientActive', 'resize', 'clearAtmosphere', 'stopAmbientAudio']
      .forEach(name => check(typeof mod?.[name] === 'function', '氛围模块入口：' + name));
    if (!mod || names.some(name => typeof w[name] !== 'function')) return { pending: ['模块未落地'] };
    const section = name => {
      const from = source.indexOf('function ' + name + '(');
      const end = source.indexOf('\nfunction ', from + 10);
      return from < 0 ? '' : source.slice(from, end < 0 ? source.length : end);
    };
    check(/setBattleAtmosphereData\(block\[['"]战场氛围['"]\]\)/.test(section('buildCombatDataFromYAML')), 'YAML成功入口读取战场氛围');
    check(section('startGame').includes('startBattleAtmosphere()'), '正式开战恢复氛围');
    check(section('runResetPipeline').includes('refreshBattleAtmosphere()'), '重置本场恢复氛围而不清手选');
    const clear = source.slice(source.indexOf('    function clearArcaneFx()'), source.indexOf('    window.isArcaneSkillFx'));
    check(clear.indexOf('arcaneAtmoModule.stopAmbientAudio(true)') >= 0 && clear.indexOf('arcaneAtmoModule.stopAmbientAudio(true)') < clear.indexOf('CombatAudioMixer.clear()'), '同步停环境音先于共享Mixer.close');
    check(source.includes("CombatAudioMixer.output('aux', 'L')"), '环境音接最低优先级aux:L，技能避让复用Mixer');
    check(source.includes('new ResizeObserver(resizeCanvas)') && source.includes("'fullscreenchange', resizeCanvas"), '容器resize与全屏联动');
    check(source.includes("window.addEventListener('pagehide'") && source.includes('sceneObserver.disconnect(); stopBattleAtmosphere()'), '真正离开页面停画停音');
    check(source.includes('opacity: 0.05') && source.includes('-4.2s both infinite'), '废墟光束低亮度与负延迟保留');
    check(/mist:\s*\{ max: 16, kind: 'frost'/.test(source) && /ruins:\s*\{ max: 36, kind: 'dust'/.test(source) && /eldritch:\s*\{ max: 24, kind: 'spore'/.test(source), '三类粒子规模保持定稿');
    check(source.includes('Math.min(window.devicePixelRatio || 1, 2)'), 'Canvas dpr封顶2');
    check(!source.includes('body.arcane-atmo-mobile-preview'), 'Demo移动预览规则不入包');
    const titan = w.buildTitanGazeFxHtml();
    check(!titan.includes('-translate-x-1/2') && !titan.includes('-translate-y-1/2'), '泰坦光环移除Tailwind双重平移');
    check(titan.includes('1.40s') && section('_spawnFullscreenSvgFx').includes('1500'), '1.4秒演出与1500ms回收保留');
    const gen0 = mock?.genCount?.();
    ev(`window.__atmoRegressionSaved = {
      theme:battleAtmosphereTheme, override:battleAtmosphereOverride, active:battleAtmosphereActive,
      sound:defendSettings.atmosphereSound, moduleTheme:arcaneAtmoModule.getTheme(), moduleSound:arcaneAtmoModule.getAmbientSound(),
      skillContext:CombatAudioMixer.skillContext, output:CombatAudioMixer.output, persist:persistDefendSettings,
      token:combatToken, heroes:heroesData, enemies:enemiesData, field:activeField,
      stateStarted:state.isGameStarted, queue:state.actionQueue, queueIndex:state.queueIndex,
      editor:document.getElementById('editor-modal').innerHTML, expanded:window.__editorGlobalExpanded
    }; stopBattleAtmosphere(); defendSettings.atmosphereSound=false; arcaneAtmoModule.setAmbientSound(false);`);
    const audio = { nodes: [], routes: [], persists: 0 };
    const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
    const node = () => {
      const n = { gain:param(), frequency:param(), Q:param(), started:0, stopped:0, disconnected:0,
        connect(target) { this.target = target; return target; }, disconnect() { this.disconnected++; },
        start() { this.started++; }, stop() { this.stopped++; } };
      audio.nodes.push(n); return n;
    };
    const fakeCtx = { currentTime:0, sampleRate:8000, state:'running', createGain:node, createBiquadFilter:node, createOscillator:node, createBufferSource:node,
      createBuffer(channels, length, sampleRate) { const data = Array.from({ length:channels }, () => new Float32Array(length)); return { sampleRate, getChannelData(i) { return data[i]; } }; } };
    const mixer = w.CombatAudioMixer;
    mixer.skillContext = () => fakeCtx;
    mixer.output = (track, category) => { audio.routes.push([track, category]); return node(); };
    w.persistDefendSettings = () => { audio.persists++; };
    const root = () => doc.querySelector('[data-arcane-atmo="root"]');
    const canvas = () => doc.getElementById('arcane-atmo-canvas');
    try {
      for (const [id, label] of Object.entries(ev('BATTLE_ATMOSPHERE_THEMES'))) {
        eq(w.resolveBattleAtmosphere(label), id, '中文主题：' + label);
        eq(w.resolveBattleAtmosphere(id), id, '主题枚举：' + id);
        mod.setTheme(id);
        eq(mod.getTheme(), id, '主题切换：' + id);
        eq(doc.querySelectorAll('[data-arcane-atmo="root"]').length, id === 'baseline' ? 0 : 1, '主题根层唯一：' + id);
        eq(doc.querySelectorAll('#arcane-atmo-canvas').length, ['mist','ruins','eldritch'].includes(id) ? 1 : 0, '共享canvas：' + id);
        if (root()) {
          eq(w.getComputedStyle(root()).pointerEvents, 'none', '根层指针穿透：' + id);
          eq(w.getComputedStyle(root()).zIndex, 'auto', '根层不抢z-index：' + id);
          check(!!(root().compareDocumentPosition(doc.getElementById('enemies-container')) & w.Node.DOCUMENT_POSITION_FOLLOWING), '氛围插在敌容器前：' + id);
          check([...root().querySelectorAll('*')].every(n => w.getComputedStyle(n).pointerEvents === 'none'), '所有氛围子层指针穿透：' + id);
          check([...root().children].every(n => { const z = w.getComputedStyle(n).zIndex; return z === 'auto' || Number(z) >= 1 && Number(z) <= 5; }), '氛围内部层级仅1至5：' + id);
          const savedRoot = root(), savedCanvas = canvas(); mod.setTheme(id);
          check(root() === savedRoot && canvas() === savedCanvas, '重复主题保留DOM引用：' + id);
          if (canvas()) check(canvas().width <= doc.getElementById('battle-scene').clientWidth * 2 + 1, '实际canvas物理宽度dpr封顶：' + id);
        }
      }
      eq(w.resolveBattleAtmosphere(), 'baseline', '缺省氛围保持旧背景');
      eq(w.resolveBattleAtmosphere('未知场景'), 'baseline', '未知主题不阻断战斗');
      w.setBattleAtmosphereData('夜雨');
      eq(ev('battleAtmosphereTheme'), 'rain', '新YAML存本场主题');
      eq(ev('battleAtmosphereOverride'), null, '新YAML清手选');
      check(!root() && !mod.isAmbientActive(), '准备阶段不播放环境音');
      w.startBattleAtmosphere(); eq(mod.getTheme(), 'rain', '开战后采用YAML主题');
      const snap = ev('({token:combatToken,heroes:heroesData,enemies:enemiesData,queue:state.actionQueue,index:state.queueIndex,field:activeField,hp:heroesData.map(h=>[h.hp,h.mp])})');
      w.setBattleAtmosphereSelection('冷雾'); eq(mod.getTheme(), 'mist', '手选即时覆写YAML');
      w.refreshBattleAtmosphere(); eq(mod.getTheme(), 'mist', '同场刷新保留手选');
      check(ev('combatToken===window.__atmoRegressionSaved.token') && ev('heroesData===window.__atmoRegressionSaved.heroes') && ev('enemiesData===window.__atmoRegressionSaved.enemies'), '即时切换不换token和战斗数组');
      eq(ev('heroesData.map(h=>[h.hp,h.mp])'), snap.hp, '即时切换不碰HP/MP');
      check(ev('state.actionQueue===window.__atmoRegressionSaved.queue') && ev('state.queueIndex') === snap.index && ev('activeField') === snap.field, '即时切换不改队列/场地buff');
      w.setBattleAtmosphereSelection('yaml'); eq(mod.getTheme(), 'rain', '一键恢复跟随YAML');
      w.setBattleAtmosphereSelection('ruins'); w.setBattleAtmosphereData('异界低光');
      eq(ev('battleAtmosphereOverride'), null, '新战局不继承旧手选'); w.startBattleAtmosphere(); eq(mod.getTheme(), 'eldritch', '新战局使用新YAML');
      w.setBattleAtmosphereSound(true);
      eq(ev('defendSettings.atmosphereSound'), true, '音频偏好写全局设置'); check(audio.persists > 0, '环境音开关持久化');
      check(mod.isAmbientActive() && audio.nodes.some(n => n.started), '非默认主题开启持续环境音');
      check(audio.routes.every(([track, category]) => track === 'aux' && category === 'L'), '所有环境音接aux:L');
      const starts = audio.nodes.reduce((n, x) => n + x.started, 0); w.refreshBattleAtmosphere();
      eq(audio.nodes.reduce((n, x) => n + x.started, 0), starts, '重复刷新不重建音源');
      mod.stopAmbientAudio(true); check(!mod.isAmbientActive(), '关闭共享ctx前同步撤会话');
      check(audio.nodes.filter(n => n.started).every(n => n.stopped > 0), '同步清场时源已停止');
      w.refreshBattleAtmosphere(); check(mod.isAmbientActive(), 'ctx清场后按原偏好重建');
      mod.clearAtmosphere(); check(!root() && !canvas() && !mod.isAmbientActive(), 'clear同时删画面/音频/会话');
      check(!doc.body.hasAttribute('data-atmo-theme'), 'clear恢复body原属性');
      eq(mod.getTheme(), 'eldritch', 'clear保留本场主题偏好'); await wait(230);
      check(audio.nodes.filter(n => n.started).every(n => n.stopped > 0), '淡出后全部环境源停止');
      w.refreshBattleAtmosphere(); check(mod.isAmbientActive(), '重置式恢复重新起音');
      w.setBattleAtmosphereSelection('rain');
      const oldSources = audio.nodes.filter(n => n.started && !n.stopped);
      w.setBattleAtmosphereSelection('mist'); await wait(230);
      check(mod.getTheme() === 'mist' && mod.isAmbientActive(), '切主题后新环境音会话保持激活');
      check(oldSources.every(n => n.stopped > 0), '切主题后旧环境音源全部回收');
      const scene = doc.getElementById('battle-scene'), oldWidth = scene.style.width;
      try {
        scene.style.width = '420px'; w.dispatchEvent(new w.Event('resize'));
        eq(canvas().width, Math.round(scene.clientWidth * Math.min(w.devicePixelRatio || 1, 2)), '真实resize更新canvas物理宽度');
      } finally { scene.style.width = oldWidth; mod.resize(); }
      w.stopBattleAtmosphere(); check(!mod.isAmbientActive() && !root(), '离开战场停画停音');
      w.setBattleAtmosphereData('未知'); w.setBattleAtmosphereSelection('mist'); w.startBattleAtmosphere(); eq(mod.getTheme(), 'mist', '准备阶段手选可带入本场');
      w.openEditor(); const group = doc.getElementById('global-settings-body'), select = doc.getElementById('edit-battle-atmosphere'), sound = doc.getElementById('edit-atmosphere-sound');
      check(!!group && group.contains(select) && group.contains(sound), '控件仅在已有战斗全局设置内');
      eq(select.value, 'mist', '控件显示本场手选');
      select.value = 'ruins'; select.dispatchEvent(new w.Event('change', { bubbles:true })); eq(mod.getTheme(), 'ruins', '真实下拉change即时生效');
      sound.checked = false; sound.dispatchEvent(new w.Event('change', { bubbles:true })); check(!mod.isAmbientActive(), '真实checkbox关闭环境音');
      w.closeEditor(); eq(mod.getTheme(), 'ruins', '关闭编辑器不撤销即时氛围');
      check(ev('combatToken===window.__atmoRegressionSaved.token') && ev('state.queueIndex') === snap.index, '操作设置不重置或推进战斗');
      check(!w.setBattleAtmosphereSelection.toString().includes('runResetPipeline') && !w.setBattleAtmosphereSound.toString().includes('runResetPipeline'), '视听设置与重置管线解耦');
      check(!ev('Object.prototype.hasOwnProperty.call(defendSettings,"atmosphereTheme")'), '手选不存全局设置');
      const frame = doc.createElement('div'); frame.style.cssText = 'position:fixed;inset:0;pointer-events:none'; frame.innerHTML = titan; doc.body.appendChild(frame);
      const wave = [...frame.querySelectorAll('div')].find(n => n.style.animation.includes('psychic-tsunami-surge'));
      const wr = wave.getBoundingClientRect(), fr = frame.getBoundingClientRect();
      check(Math.abs(wr.left + wr.width / 2 - fr.left - fr.width / 2) < 2 && Math.abs(wr.top + wr.height / 2 - fr.top - fr.height / 2) < 2, '真实SVG光环中心与特效容器中心一致'); frame.remove();
      eq(mock?.genCount?.(), gen0, '氛围全程未调用LLM');
    } finally {
      mod.stopAmbientAudio(true); mod.clearAtmosphere();
      ev(`CombatAudioMixer.skillContext=window.__atmoRegressionSaved.skillContext; CombatAudioMixer.output=window.__atmoRegressionSaved.output;
        persistDefendSettings=window.__atmoRegressionSaved.persist; battleAtmosphereTheme=window.__atmoRegressionSaved.theme;
        battleAtmosphereOverride=window.__atmoRegressionSaved.override; battleAtmosphereActive=window.__atmoRegressionSaved.active;
        defendSettings.atmosphereSound=window.__atmoRegressionSaved.sound; state.isGameStarted=window.__atmoRegressionSaved.stateStarted;
        document.getElementById('editor-modal').innerHTML=window.__atmoRegressionSaved.editor;
        window.__editorGlobalExpanded=window.__atmoRegressionSaved.expanded;
        if(battleAtmosphereActive) refreshBattleAtmosphere(); else arcaneAtmoModule.setAmbientSound(window.__atmoRegressionSaved.moduleSound);
        delete window.__atmoRegressionSaved;`);
    }
    return { pending };
  };
})();
