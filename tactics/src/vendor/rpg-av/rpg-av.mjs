// ==========================================
// 由 tactics/tools/extract-rpg-av.cjs 自动生成，请勿手改。
// 源: index.html  sha256=5c1ab2a1a243bb7d7e79b4aca76026ad1058af2a74bf9dfbf8763ae8b13554e7
// arcaneVfxModule 行区间(源 5729–14230): 5730–5730, 5733–5791, 5800–5841, 5849–5913, 5923–5924, 5932–6302, 6642–6850, 7016–7037, 7351–7376, 7383–7584, 7596–9869, 10067–10097, 10102–10107, 10748–10757, 11103–11133, 11142–11240, 11917–12083, 12201–12214, 14179–14208
// 入选语句 157 段 / 3661 行；入口: playEnemyWindup, playAttackIdentityFx, playArcaneProjectile, playHitFeedback, classifyHit, syncHitBar, CombatAudioDirector, clearHitFeedback, warmIdentitySample, playArsenicShot, clearArcaneFx
// 显式存根: clearSummonState, clearStatusLayers, clearSelfDestructState, clearRescueState, clearVariantState
// 宿主适配补丁: fxEngine 不复用页面全局 canvas×1; fxEngine canvas 舞台内绝对定位×1; fxEngine canvas 挂特效舞台×1; fxEngine resize 走舞台×1; fxEngine 宽×1; fxEngine 高×1; fxEngine 去蓄力 overlay×1; fxEngine 去蓄力循环保持×1; 事件总线读宿主 combatToken×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 屏幕矩形 → 特效舞台坐标×11; innerWidth → 舞台宽×7; innerHeight → 舞台高×3; body 挂载 → 特效舞台×5; JS position:fixed → absolute×0; arcane canvas resize 走舞台×1; 舞台震动独立层×2; window.* 声音函数改为工厂内本地×14; 去环境氛围清理×1; CSS position:fixed → absolute×6; CSS 100vw → 舞台宽×1; CSS 100vh/dvh → 舞台高×1
// ==========================================
/* eslint-disable */
// ---- 纯数据导出（原样，供宿主在工厂创建前解析人物头像/语音与预载清单） ----
export const RPG_AVATAR_MAP = {
  "索恩": "https://imgur.la/images/2026/08/13/77fcdf0fd006c4ff1ccae30774322270.png",
  "埃利奥特": "https://imgur.la/images/2026/06/25/31a4dd84a831e3f76082542bf12fcf19.png",
  "玛德琳": "https://imgur.la/images/2026/06/25/585bf7f2f1559168b419b8be56da36a6.png",
  "弗兰克": "https://imgur.la/images/2026/06/25/26f001dbe399876cd74978bbe12a265b.png",
};
export const RPG_HERO_VOICE_LINES = {
  "索恩": {
    first: '索恩/索恩_第一回合.mp3',
    turn: ['索恩/索恩_开始回合1.mp3', '索恩/索恩_开始回合2.mp3', '索恩/索恩_开始回合3.mp3'],
    low: ['索恩/索恩_半血1.mp3', '索恩/索恩_半血2.mp3', '索恩/索恩_半血3.mp3']
  },
  "埃利奥特": {
    first: '埃利奥特/埃利奥特_开始回合.wav', // 无"第一回合"文件，用无编号的"开始回合"充当
    turn: ['埃利奥特/埃利奥特_回合开始1.wav', '埃利奥特/埃利奥特_回合开始2.wav', '埃利奥特/埃利奥特_回合开始3.wav'],
    low: ['埃利奥特/埃利奥特_半血1.mp3', '埃利奥特/埃利奥特_半血2.wav', '埃利奥特/埃利奥特_半血3.wav']
  },
  "玛德琳": {
    first: '玛德琳/玛德琳_第一回合.mp3',
    turn: ['玛德琳/玛德琳_开始回合1.wav', '玛德琳/玛德琳_开始回合2.wav', '玛德琳/玛德琳_开始回合3.wav'],
    low: ['玛德琳/玛德琳_半血1.wav', '玛德琳/玛德琳_半血2.wav', '玛德琳/玛德琳_半血3.wav']
  },
  "弗兰克": {
    first: '弗兰克/弗兰克_第一回合.mp3',
    turn: ['弗兰克/弗兰克_回合开始1.wav', '弗兰克/弗兰克_回合开始2.wav', '弗兰克/弗兰克_回合开始3.wav'],
    low: ['弗兰克/弗兰克_半血1.wav', '弗兰克/弗兰克_半血2.wav', '弗兰克/弗兰克_半血3.wav']
  }
};
export const RPG_USED_AUDIO_KEYS = ["defDown","atk2","taunt","hide","hitDown","shieldUp","defUp","burst","shot","monsterAttack","gunshot1","gunshot2","gunshot3","gunshot_pierce","xiandan","enemySwingGroup","enemyRanged","enemyRangedGroup","enemyMagic","enemyMagicGroup","enemyBuff","enemyDebuff","light_charge","light_impact","thunder_charge","thunder_single_hit","thunder_aoe_hit","bomb_throw","explosion_single","explosion_aoe_charge","explosion_aoe_blast","slash_whoosh_hit_fs434873","claw_bloody_blade_fs323526","frost_crystal_impact_fs550267","aoe_gun_burst_fs482122","aoe_poison_spell_fs219566","aoe_wind_spin_fs772867","fire01","freeze01","wolfman","creature_slime_01","swish_3","parry_3","dodge_2","hit_1a","hit_1b","hit_1c","hit_2a","hit_2b","hit_2c","hit_3a","hit_3b","hit_3c","mx_sand_swish","mx_stygian_whoosh","mx_sword_metal","mx_gear_lock","mx_tunnel","mx_rift_charge","mx_deep_impact","mx_giant_roar","mx_dino_roar","mx_golem_stomp","revive_gather","revive_bloom","molt_crack","molt_snap","molt_empower","rage_exit","link_dash","link_chime","leech_flow","regen_hum","thorn_parry","resist_fluid","resist_phantom","resist_antimagic","resist_vital","resist_fireproof","resist_poisonproof","resist_ironbody","ranshao","fog","mx_rift_tear","mx_vacuum","mx_armor_strike","sd_ring_blast","sd_shatter_blast","huoyan01","parry_perfect","avoid_dash_perfect","sheshen_armor_step","fork432","forkHum","forkMute","bowlBronze","bowlClear","bellPing","crystalSnap","mirrorRing","mirrorStream","bastetChime","bastetCast","bastetHeal","conchCharge","conchMist","windHum","crystalChime","dodgeWind"];

export function createRpgAv(host) {
  // ---- 宿主注入（战棋舞台、单位视图、代际令牌） ----
  const __STAGE = host.stage;              // { el, w, h, onResize(fn), shakeEl() }
  const __GBCR = host.rectSymbol;          // Element.prototype[__GBCR]() → 舞台坐标矩形
  const ASSET_ORIGIN = window.__RPG_ASSET_BASE__ || 'http://192.168.110.83:8766';
  const ASSET_BASE = ASSET_ORIGIN;
  const HERO_VOICE_BASE = ASSET_BASE;
  let combatToken = host.initialToken;
  let _pipelineFrozen = false;
  let heroesData = [], enemiesData = [];
  const WEBM_FX_REGISTRY = {};             // WebM 特效登记未迁移：本 Demo 技能均无 fxTag 视频
  const _fxVideoBlobCache = new Map();
  function playWebMFX(file) { host.report('missing-webm', String(file)); return Promise.resolve(false); }
  const getEntitySpriteDom = e => host.spriteOf(e);
  const isHeroSideEntity = e => host.isHero(e);
  const isCombatActive = e => host.isActive(e);

  // ---- 人物与语音表（原样） ----
  const HERO_VOICE_LINES = {
  "索恩": {
    first: '索恩/索恩_第一回合.mp3',
    turn: ['索恩/索恩_开始回合1.mp3', '索恩/索恩_开始回合2.mp3', '索恩/索恩_开始回合3.mp3'],
    low: ['索恩/索恩_半血1.mp3', '索恩/索恩_半血2.mp3', '索恩/索恩_半血3.mp3']
  },
  "埃利奥特": {
    first: '埃利奥特/埃利奥特_开始回合.wav', // 无"第一回合"文件，用无编号的"开始回合"充当
    turn: ['埃利奥特/埃利奥特_回合开始1.wav', '埃利奥特/埃利奥特_回合开始2.wav', '埃利奥特/埃利奥特_回合开始3.wav'],
    low: ['埃利奥特/埃利奥特_半血1.mp3', '埃利奥特/埃利奥特_半血2.wav', '埃利奥特/埃利奥特_半血3.wav']
  },
  "玛德琳": {
    first: '玛德琳/玛德琳_第一回合.mp3',
    turn: ['玛德琳/玛德琳_开始回合1.wav', '玛德琳/玛德琳_开始回合2.wav', '玛德琳/玛德琳_开始回合3.wav'],
    low: ['玛德琳/玛德琳_半血1.wav', '玛德琳/玛德琳_半血2.wav', '玛德琳/玛德琳_半血3.wav']
  },
  "弗兰克": {
    first: '弗兰克/弗兰克_第一回合.mp3',
    turn: ['弗兰克/弗兰克_回合开始1.wav', '弗兰克/弗兰克_回合开始2.wav', '弗兰克/弗兰克_回合开始3.wav'],
    low: ['弗兰克/弗兰克_半血1.wav', '弗兰克/弗兰克_半血2.wav', '弗兰克/弗兰克_半血3.wav']
  }
};
  function pickHeroVoice(pool, exclude) {
  const candidates = pool.filter(f => f !== exclude);
  const list = candidates.length > 0 ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}
  const AVATAR_MAP = {
    "索恩": "https://imgur.la/images/2026/08/13/77fcdf0fd006c4ff1ccae30774322270.png",
    "埃利奥特": "https://imgur.la/images/2026/06/25/31a4dd84a831e3f76082542bf12fcf19.png",
    "玛德琳": "https://imgur.la/images/2026/06/25/585bf7f2f1559168b419b8be56da36a6.png",
    "弗兰克": "https://imgur.la/images/2026/06/25/26f001dbe399876cd74978bbe12a265b.png",
  };

  // ---- CombatAudioMixer 及采样工具（原样） ----
const _fxAudioCache = new Map();
// 音频 Blob URL 缓存 Map：key=url, value=blobUrl（fetch 全量预载，播放即时；fetch 中为 null 占位）
const _fxAudioBlobCache = new Map(), _fxAudioLoads = new Map();
// 现有采样的前导空白（本地 PCM 起音测量；不裁主体与尾音）。
const AUDIO_CLIP_OFFSETS = new Map([
    ['gunshot2.mp3', 0.259], ['gunshot3.mp3', 0.080], ['gunshot_pierce.mp3', 0.320],
    ['shot01.mp3', 0.025], ['xiandan.mp3', 0.006]
].map(([name, offset]) => [ASSET_BASE + '/' + name, offset]));

const ITEM_SKILL_FX = {
    '谐律之庇': { category:'B', audioKeys:['forkHum','bowlClear','bellPing'], videoFiles:['vfx_harmony_ripple.webm'] },
    '静默之域': { category:'A', audioKeys:['bowlBronze','forkMute','sd_ring_blast'], videoFiles:['vfx_silence_ripple.webm','vfx_silence_crack.webm'] },
    '碎裂之响': { category:'A', audioKeys:['fork432','sd_shatter_blast'], videoFiles:['vfx_shatter_arc.webm','vfx_shatter_spark.webm','vfx_shatter_crystal.webm'] },
    '塞赫美特之愠': { category:'A', audioKeys:['ranshao','mx_giant_roar','crystalSnap','fire01','explosion_aoe_blast'], videoFiles:['vfx_sekhmet_lion.webm','vfx_sekhmet_pillar.webm','vfx_sekhmet_orb.webm'] },
    '逆咒归源镜': { category:'A', audioKeys:['mirrorRing','mx_vacuum','mirrorStream','leech_flow'], videoFiles:['vfx_mirror_cage.webm','vfx_mirror_vortex.webm'] },
    '芭斯特的猫眼石': { category:'B', audioKeys:['bastetChime','bastetCast','bastetHeal'], videoFiles:['vfx_bastet_spiral.webm','vfx_bastet_pillar.webm'] },
    '奇异海螺': { category:'A', audioKeys:['conchCharge','conchMist','mx_stygian_whoosh'], videoFiles:['vfx_conch_vortex.webm','vfx_conch_abyss.webm','vfx_conch_ripple.webm'] },
    '砷弹射击': { category:'A', audioKeys:['gunshot_pierce'], videoFiles:[] },
    '灵风术': { category:'B', audioKeys:['windHum','crystalChime','aoe_wind_spin_fs772867','dodgeWind'], videoFiles:[] }
};
const itemFxAssetUrl = file => ASSET_BASE + '/' + file.split('/').map(encodeURIComponent).join('/');

const CombatAudioMixer = (function () {
    let ctx = null, tracks = {}, categoryTracks = new Map(), generation = 0, nextCueId = 0, audioScope = null;
    const buffers = new Map(), decodes = new Map(), voices = new Set(), protections = new Set(), timers = new Map();
    const categories = {
        A:{ priority:8, gain:1.3 }, C:{ priority:8, gain:1.3 }, M:{ priority:7, gain:1 }, B:{ priority:6, gain:1.3 },
        D:{ priority:5, gain:1 }, E:{ priority:4, gain:1 }, N:{ priority:3, gain:1 }, F:{ priority:2, gain:1 },
        G:{ priority:2, gain:1 }, H:{ priority:1, gain:1 }, I:{ priority:1, gain:1 }, K:{ priority:0, gain:1 },
        J:{ priority:0, gain:1 }, L:{ priority:0, gain:1 }
    };
    const profiles = { short:{ holdMs:180 }, special:{ holdMs:450 } };
    const trackOf = category => ['F','G','H','I'].includes(category) ? 'result' : ['A','B','C','D','E'].includes(category) ? 'skill' : 'aux';
    const categoryOf = opts => opts.category || opts.audioContext?.category || opts.owner?.audioContext?.category || audioScope?.category
        || (opts.track === 'skill' ? 'D' : opts.track === 'result' ? 'F' : 'K');
    function capture(fallback = 'K') { return audioScope || Object.freeze({ category:fallback }); }
    function withContext(value, fn) {
        const previous = audioScope;
        audioScope = Object.freeze({ category:typeof value === 'string' ? value : value.category });
        try { return fn(); } finally { audioScope = previous; }
    }
    function classify(skill) {
        if (ITEM_SKILL_FX[skill?.fxTag]) return ITEM_SKILL_FX[skill.fxTag].category;
        if (skill?.fxTag?.startsWith('group:')) return 'D';
        const damaging = [skill?.type, skill?.type2, skill?.type3].some(tag => tag && ['攻','单体','穿透','眩晕','散射'].some(word => tag.includes(word)));
        return skill?.fxTag ? damaging ? 'A' : 'B' : damaging ? 'D' : 'K';
    }
    function context() {
        if (!ctx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            ctx = new Ctx();
            for (const name of ['skill', 'result', 'aux']) { const bus = ctx.createGain(); bus.connect(ctx.destination); tracks[name] = bus; }
        }
        return ctx;
    }
    function output(track = 'skill', category = null) {
        context();
        if (!category) return tracks[track];
        const key = track + ':' + category;
        if (!categoryTracks.has(key)) {
            const node = ctx.createGain(); node.gain.value = categories[category].gain; node.connect(tracks[track]);
            categoryTracks.set(key, { node, category, envelope:[] }); duck();
        }
        return categoryTracks.get(key).node;
    }
    function load(url) {
        const blob = _fxAudioBlobCache.get(url);
        if (blob) return Promise.resolve(blob);
        if (_fxAudioLoads.has(url)) return _fxAudioLoads.get(url);
        _fxAudioBlobCache.set(url, null);
        const task = fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(blob => {
            const local = URL.createObjectURL(blob); _fxAudioBlobCache.set(url, local); return local;
        }).catch(e => { _fxAudioBlobCache.delete(url); throw e; }).finally(() => _fxAudioLoads.delete(url));
        _fxAudioLoads.set(url, task); return task;
    }
    function prepare(url) {
        if (!url || url === 'none') return Promise.resolve(null);
        if (buffers.has(url)) return Promise.resolve(buffers.get(url));
        if (decodes.has(url)) return decodes.get(url);
        const audioCtx = context();
        if (!audioCtx) return Promise.resolve(null);
        const task = load(url).then(local => fetch(local)).then(r => r.arrayBuffer()).then(data => audioCtx.decodeAudioData(data))
            .then(buffer => { buffers.set(url, buffer); return buffer; }).catch(e => {
                console.warn('[Audio] 采样加载失败:', url, e); buffers.set(url, null); return null;
            }).finally(() => decodes.delete(url));
        decodes.set(url, task); return task;
    }
    function valueAt(points, time) {
        if (!points.length) return 1;
        let prev = points[0];
        for (const p of points) { if (p.t > time) return prev.v + (p.v - prev.v) * Math.max(0, (time - prev.t) / (p.t - prev.t)); prev = p; }
        return prev.v;
    }
    function duck() {
        if (!ctx) return;
        const now = ctx.currentTime;
        for (const p of protections) if (p.end <= now) protections.delete(p);
        const boundaries = [...new Set([now, ...[...protections].flatMap(p => [p.start, p.end]).filter(t => t > now)])].sort((a, b) => a - b);
        for (const entry of categoryTracks.values()) {
            const settings = categories[entry.category], base = settings.gain;
            let points = [{ t:now, v:entry.envelope.length ? valueAt(entry.envelope, now) : base }];
            for (const t of boundaries) {
                const active = [...protections].filter(p => p.start <= t && p.end > t);
                const factor = Math.min(1, ...active.map(p => {
                    const gap = p.priority - settings.priority;
                    return gap <= 0 ? 1 : gap === 1 ? 0.85 : gap < 4 ? 0.65 : 0.40;
                }));
                const target = base * factor, current = valueAt(points, t);
                points = points.filter(p => p.t < t);
                points.push({ t, v:current }, { t:t + (target < current ? 0.010 : 0.120), v:target });
            }
            const gain = entry.node.gain;
            gain.cancelScheduledValues(now); gain.setValueAtTime(points[0].v, now);
            points.slice(1).forEach(p => gain.linearRampToValueAtTime(p.v, p.t)); entry.envelope = points;
        }
    }
    function protect(profile = 'short', when, owner = null, category = null) {
        const audioCtx = context(); if (!audioCtx) return () => {};
        const name = category || owner?.audioContext?.category || audioScope?.category || (profile === 'special' ? 'A' : 'D');
        const priority = categories[name].priority;
        if (!priority) return () => {};
        const holdMs = ['A','B','C'].includes(name) ? profiles.special.holdMs : profiles.short.holdMs;
        const p = { start:when == null ? audioCtx.currentTime : when, owner, category:name, priority, holdMs };
        p.end = p.start + holdMs / 1000; protections.add(p); duck();
        const cancel = () => { protections.delete(p); duck(); };
        atTime(p.end + 0.120, () => { protections.delete(p); }, false);
        return cancel;
    }
    function outputDelay(time) {
        const stamp = ctx.getOutputTimestamp && ctx.getOutputTimestamp();
        if (stamp && stamp.performanceTime > 0) return Math.max(0, stamp.performanceTime + (time - stamp.contextTime) * 1000 - performance.now());
        return Math.max(0, (time - ctx.currentTime + (ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000);
    }
    function atTime(time, fn, audible = true) {
        const audioCtx = ctx, gen = generation;
        let id = null, cancelled = false;
        const cancel = () => { cancelled = true; if (id != null) { clearTimeout(id); timers.delete(id); } audioCtx.removeEventListener('statechange', schedule); };
        function schedule() {
            if (cancelled || gen !== generation) return;
            if (audioCtx.state !== 'running') { audioCtx.addEventListener('statechange', schedule, { once:true }); return; }
            const delay = audible ? outputDelay(time) : Math.max(0, (time - audioCtx.currentTime) * 1000);
            id = setTimeout(() => {
                timers.delete(id); id = null;
                if (cancelled || gen !== generation) return;
                if (audioCtx.state !== 'running') { schedule(); return; }
                fn();
            }, delay);
            timers.set(id, cancel);
        }
        schedule(); return cancel;
    }
    function bindOwner(owner, cue) {
        if (!owner) return cue;
        cue.owner = owner; owner.audioStoppers.add(cue);
        const token = combatToken;
        owner.onClean(() => { if (owner.cancelled || token !== combatToken || _pipelineFrozen) cue(); });
        if (!owner.mixerCancel) {
            owner.mixerCancel = owner.handle.cancel;
            owner.handle.cancel = () => { voices.forEach(v => { if (v.owner === owner) v(); }); owner.mixerCancel(); };
        }
        return cue;
    }
    function play(url, opts = {}) {
        opts = Object.assign({}, opts, { category:categoryOf(opts) });
        let source = null, gain = null, pan = null, media = null, stopped = false, cancelStart = null, cancelProtect = null;
        let resolveReady, resolveStarted, resolveDone;
        const token = combatToken, gen = generation;
        const cue = () => finish(false);
        cue.id = ++nextCueId; cue.track = opts.track || trackOf(opts.category); cue.category = opts.category; cue.baseVolume = opts.vol == null ? 0.5 : opts.vol; cue.when = null;
        cue.ready = new Promise(r => resolveReady = r); cue.started = new Promise(r => resolveStarted = r); cue.done = new Promise(r => resolveDone = r);
        const valid = () => !stopped && gen === generation && token === combatToken && !_pipelineFrozen && !(opts.owner && opts.owner.cancelled);
        function finish(natural) {
            if (stopped) return; stopped = true;
            if (cancelStart) cancelStart();
            if (!natural && cancelProtect) cancelProtect();
            if (media) { media.onplaying = media.onended = media.onerror = media.onloadedmetadata = null; media.pause(); media.removeAttribute('src'); media.load(); }
            if (source) { source.onended = null; if (!natural && source.stop) { try { source.stop(); } catch {} } source.disconnect(); }
            if (gain) gain.disconnect(); if (pan) pan.disconnect();
            voices.delete(cue); if (cue.owner) cue.owner.audioStoppers.delete(cue);
            resolveReady(false); resolveStarted(false); resolveDone(natural);
        }
        function route(audioCtx) {
            gain = audioCtx.createGain();
            if (opts.pan != null && audioCtx.createStereoPanner) { pan = audioCtx.createStereoPanner(); pan.pan.value = opts.pan; gain.connect(pan); pan.connect(output(cue.track, cue.category)); }
            else gain.connect(output(cue.track, cue.category));
        }
        function started(when, duration) {
            cue.when = when;
            if (gain) {
                gain.gain.setValueAtTime(opts.vol == null ? 0.5 : opts.vol, when);
                const fadeIn = opts.fadeInSec || 0, fadeOut = Math.min(opts.fadeOutSec || 0, duration * 0.45);
                if (fadeIn) { gain.gain.setValueAtTime(0.0001, when); gain.gain.linearRampToValueAtTime(opts.vol == null ? 0.5 : opts.vol, when + Math.min(fadeIn, duration * 0.25)); }
                if (fadeOut) { gain.gain.setValueAtTime(opts.vol == null ? 0.5 : opts.vol, when + duration - fadeOut); gain.gain.linearRampToValueAtTime(0.0001, when + duration); }
            }
            cancelProtect = protect(opts.profile || 'short', when, cue.owner, cue.category);
            resolveReady(true);
            cancelStart = atTime(when, () => { if (valid()) resolveStarted(true); else finish(false); });
        }
        voices.add(cue); bindOwner(opts.owner, cue);
        async function launch() {
            const audioCtx = context();
            let buffer = buffers.get(url);
            if (opts.sync && audioCtx && !buffers.has(url)) buffer = await prepare(url);
            if (!valid()) { finish(false); return; }
            if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
            if (!valid()) { finish(false); return; }
            if (opts.sync && audioCtx && !buffer) { finish(false); return; }
            const offset = opts.offsetSec == null ? AUDIO_CLIP_OFFSETS.get(url) || 0 : opts.offsetSec, speed = opts.rate || 1;
            if (buffer && audioCtx) {
                route(audioCtx); source = audioCtx.createBufferSource(); source.buffer = buffer; source.playbackRate.value = speed; source.connect(gain);
                const duration = opts.maxDurSec ? Math.min(opts.maxDurSec, (buffer.duration - offset) / speed) : (buffer.duration - offset) / speed;
                source.onended = () => cue.started.then(ok => finish(ok));
                const when = Math.max(audioCtx.currentTime, opts.when == null ? audioCtx.currentTime : opts.when);
                started(when, duration);
                source.start(when, offset, Math.min(buffer.duration - offset, duration * speed + (opts.sourcePaddingSec || 0)));
                if (opts.stopPaddingSec != null) source.stop(when + duration + opts.stopPaddingSec);
            } else {
                media = new Audio(); media.crossOrigin = 'anonymous'; media.src = _fxAudioBlobCache.get(url) || url; media.playbackRate = speed;
                if (audioCtx) { route(audioCtx); source = audioCtx.createMediaElementSource(media); source.connect(gain); gain.gain.value = 0; }
                else media.volume = Math.min(1, (opts.vol == null ? 0.5 : opts.vol) * categories[cue.category].gain);
                media.onloadedmetadata = () => { if (!stopped && offset) media.currentTime = offset; };
                media.onplaying = () => {
                    if (!valid()) { finish(false); return; }
                    media.onplaying = null;
                    const duration = opts.maxDurSec ? Math.min(opts.maxDurSec, (media.duration - offset) / speed) : (media.duration - offset) / speed;
                    if (audioCtx) started(audioCtx.currentTime, duration);
                    else { resolveReady(true); resolveStarted(true); }
                    if (opts.maxDurSec) {
                        const cancelEnd = audioCtx ? atTime(audioCtx.currentTime + duration, () => finish(true), false) : (() => { const id = setTimeout(() => finish(true), duration * 1000); return () => clearTimeout(id); })();
                        cue.done.then(cancelEnd);
                    }
                };
                media.onended = () => cue.started.then(ok => finish(ok)); media.onerror = () => finish(false); media.play().catch(e => { console.warn('[Audio] 起播失败:', url, e); finish(false); });
            }
        }
        launch().catch(e => { console.warn('[Audio] 起播失败:', url, e); finish(false); }); return cue;
    }
    function media(element, volume, track = 'skill', opts = {}) {
        const category = categoryOf(Object.assign({ track }, opts));
        const audioCtx = context(); if (!audioCtx) { element.volume = Math.min(1, volume * categories[category].gain); return () => {}; }
        const source = audioCtx.createMediaElementSource(element), gain = audioCtx.createGain();
        let released = false, cancelProtect = null;
        gain.gain.value = volume; source.connect(gain); gain.connect(output(track, category));
        function release(stop) {
            if (released) return; released = true;
            if (stop) element.pause();
            if (cancelProtect) cancelProtect();
            source.disconnect(); gain.disconnect(); voices.delete(cue);
        }
        const cue = () => release(true);
        voices.add(cue);
        element.addEventListener('ended', () => release(false), { once:true });
        element.addEventListener('playing', () => { cancelProtect = protect('special', audioCtx.currentTime, opts.owner, category); }, { once:true });
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return cue;
    }
    function clear() {
        generation++; voices.forEach(stop => stop()); voices.clear();
        timers.forEach(cancel => cancel()); timers.clear(); protections.clear(); categoryTracks.clear();
        if (ctx) ctx.close(); ctx = null; tracks = {};
    }
    function prepareSkill(skill) {
        const keys = new Set(), tag = [skill.type, skill.type2, skill.type3].filter(Boolean).join(' ');
        if (skill.fxTag) {
            const itemFx = ITEM_SKILL_FX[skill.fxTag];
            if (itemFx) itemFx.audioKeys.forEach(key => keys.add(audioUrls[key]));
            const entry = WEBM_FX_REGISTRY[skill.fxTag];
            if (entry && entry.audioUrl && entry.audioUrl !== 'none') keys.add(entry.audioUrl);
            if (skill.fxTag === '远程重击') { keys.add(audioUrls.shot); keys.add(audioUrls.hitDown); }
            if (skill.fxTag === '近战重击') keys.add(audioUrls.hitDown);
        } else {
            if (tag.includes('枪击')) ['gunshot1', 'gunshot2', 'gunshot3'].forEach(key => keys.add(audioUrls[key]));
            if (tag.includes('霰弹')) keys.add(audioUrls.xiandan);
            if (tag.includes('火焰') || (skill.damageType === '法术' && tag.includes('单'))) keys.add(audioUrls.light_impact);
        }
        return Promise.all([...keys].map(prepare));
    }
    function skillContext() {
        const audioCtx = context();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }
    return { context, skillContext, output, load, prepare, prepareSkill, play, protect, atTime, bindOwner, media, clear, buffers, decodes, categories, classify, capture, withContext, trackOf };
})();

function applyAudioVolume(audio, volume, opts = {}) { return CombatAudioMixer.media(audio, volume, 'skill', opts); }

/** 播放自定义采样；返回可调用停止句柄，started 对应实际输出起音而非 play() 请求。 */
function playCustomAudio(url, volume, rate = 1, opts = {}) {
    if (!url || url === 'none') return;
    return CombatAudioMixer.play(url, Object.assign({ vol:volume != null && volume !== 1 ? volume : 0.5, rate }, opts));
}

function playCustomAudio(url, volume, rate = 1, opts = {}) {
    if (!url || url === 'none') return;
    return CombatAudioMixer.play(url, Object.assign({ vol:volume != null && volume !== 1 ? volume : 0.5, rate }, opts));
}

const audioUrls = {
    'hitUp': `${ASSET_BASE}/hitUp.mp3`,
    'mpHeal': `${ASSET_BASE}/mpHeal.mp3`,
    'defDown': `${ASSET_BASE}/defDown.mp3`,
    'atk2': `${ASSET_BASE}/atk2.mp3`,
    'atk1': `${ASSET_BASE}/atk1.mp3`,
    'atkUp': `${ASSET_BASE}/atkUp.mp3`,
    'hpHeal': `${ASSET_BASE}/hpHeal.mp3`,
    'taunt': `${ASSET_BASE}/taunt.mp3`,
    'hide': `${ASSET_BASE}/hide.mp3`,
    'hitDown': `${ASSET_BASE}/hitDown.mp3`,
    'shieldUp': `${ASSET_BASE}/shieldUp.mp3`,
    'defUp': `${ASSET_BASE}/defUp.mp3`,
    'miss': `${ASSET_BASE}/miss.mp3`,
    'burst': `${ASSET_BASE}/burst.mp3`,
    'avatarClick': `${ASSET_BASE}/avatarClick.mp3`,
    'heroTurn': `${ASSET_BASE}/heroTurn.mp3`,
    'kill': `${ASSET_BASE}/kill.mp3`,
    'shot': `${ASSET_BASE}/shot01.mp3`,
    'monsterAttack': `${ASSET_BASE}/monsterattack2.mp3`,
    'herocharge': `${ASSET_BASE}/herocharge.mp3`,
    'herochargedone': `${ASSET_BASE}/herochargedone.mp3`,
    'combatKill': `${ASSET_BASE}/combat_kill.mp3`,
    'magicKill': `${ASSET_BASE}/magic_kill.wav`,
    'kanpo': `${ASSET_BASE}/defDown.mp3`,
    // [单体(枪击)] 中小口径随机 + [特效:枪击穿透] 专属
    'gunshot1': `${ASSET_BASE}/gunshot1.mp3`,
    'gunshot2': `${ASSET_BASE}/gunshot2.mp3`,
    'gunshot3': `${ASSET_BASE}/gunshot3.mp3`,
    'gunshot_pierce': `${ASSET_BASE}/gunshot_pierce.mp3`,
    // [散射(霰弹)] 12-Gauge 鹿弹击发（demo-shotgun-vfx.html 方案1）
    'xiandan': `${ASSET_BASE}/xiandan.mp3`,
    // 敌方攻击前摇七类（omenSound）：近战群攻/远程单群/法术单群/自身增益/施加减益
    'enemySwingGroup': `${ASSET_BASE}/enemySwingGroup.mp3`,
    'enemyRanged': `${ASSET_BASE}/enemyRanged.mp3`,
    'enemyRangedGroup': `${ASSET_BASE}/enemyRangedGroup.mp3`,
    'enemyMagic': `${ASSET_BASE}/enemyMagic.mp3`,
    'enemyMagicGroup': `${ASSET_BASE}/enemyMagicGroup.mp3`,
    'enemyBuff': `${ASSET_BASE}/enemyBuff.mp3`,
    'enemyDebuff': `${ASSET_BASE}/enemyDebuff.mp3`,
    // 敌方兜底群攻 L2+ 命中（350ms 爆发，前摇音频保持独立）
    'enemyMeleeGroupHit': `${ASSET_BASE}/enemyMeleeGroupHit.mp3`,
    'enemyRangedGroupHit': `${ASSET_BASE}/enemyRangedGroupHit.mp3`,
    // 两期攻击身份采样：短音统一倍速，长音由模块按本地Blob裁窗
    'light_charge': `${ASSET_BASE}/light_charge.mp3`,
    'light_impact': `${ASSET_BASE}/light_impact.mp3`,
    'thunder_charge': `${ASSET_BASE}/thunder_charge.mp3`,
    'thunder_single_hit': `${ASSET_BASE}/thunder_single_hit.mp3`,
    'thunder_aoe_hit': `${ASSET_BASE}/thunder_aoe_hit.mp3`,
    'bomb_throw': `${ASSET_BASE}/bomb_throw.mp3`,
    'explosion_single': `${ASSET_BASE}/explosion_single.mp3`,
    'explosion_aoe_charge': `${ASSET_BASE}/explosion_aoe_charge.mp3`,
    'explosion_aoe_blast': `${ASSET_BASE}/explosion_aoe_blast.mp3`,
    'slash_whoosh_hit_fs434873': `${ASSET_BASE}/slash_whoosh_hit_fs434873.mp3`,
    'claw_bloody_blade_fs323526': `${ASSET_BASE}/claw_bloody_blade_fs323526.mp3`,
    'frost_crystal_impact_fs550267': `${ASSET_BASE}/frost_crystal_impact_fs550267.mp3`,
    'aoe_gun_burst_fs482122': `${ASSET_BASE}/aoe_gun_burst_fs482122.mp3`,
    'aoe_poison_spell_fs219566': `${ASSET_BASE}/aoe_poison_spell_fs219566.mp3`,
    'aoe_wind_spin_fs772867': `${ASSET_BASE}/aoe_wind_spin_fs772867.mp3`,
    'fire01': `${ASSET_BASE}/fire01.mp3`,
    'freeze01': `${ASSET_BASE}/freeze01.mp3`,
    'wolfman': `${ASSET_BASE}/wolfman.wav`,
    'creature_slime_01': `${ASSET_BASE}/creature_slime_01.ogg`,
    'swish_3': `${ASSET_BASE}/swish_3.wav`,
    // 格挡三档（破盾瞬间固定最大档 GuardBreak）+ 闪避三档（Demo 选定 1B/2C/3C）+ 受击三档×3音（防连重随机池）
    'parry_1': `${ASSET_BASE}/parry_Weapon_1.wav`,
    'parry_2': `${ASSET_BASE}/parry_Weapon_3.wav`,
    'parry_3': `${ASSET_BASE}/parry_Weapon_GuardBreak.wav`,
    'dodge_1': `${ASSET_BASE}/dodge_1.mp3`,
    'dodge_2': `${ASSET_BASE}/dodge_2.mp3`,
    'dodge_3': `${ASSET_BASE}/dodge_3.mp3`,
    'hit_1a': `${ASSET_BASE}/hit_1a.wav`,
    'hit_1b': `${ASSET_BASE}/hit_1b.wav`,
    'hit_1c': `${ASSET_BASE}/hit_1c.wav`,
    'hit_2a': `${ASSET_BASE}/hit_2a.wav`,
    'hit_2b': `${ASSET_BASE}/hit_2b.wav`,
    'hit_2c': `${ASSET_BASE}/hit_2c.wav`,
    'hit_3a': `${ASSET_BASE}/hit_3a.wav`,
    'hit_3b': `${ASSET_BASE}/hit_3b.wav`,
    'hit_3c': `${ASSET_BASE}/hit_3c.wav`,
    // 飞沙化甲 / 蝎眼钥匙：定稿 abyss 音轨，defUp / shieldUp 复用既有键
    'mx_sand_swish': `${ASSET_BASE}/vfx_sand_swish_mx1494.mp3`,
    'mx_stygian_whoosh': `${ASSET_BASE}/vfx_stygian_whoosh_mx2918.mp3`,
    'mx_sword_metal': `${ASSET_BASE}/vfx_sword_metal_mx2795.mp3`,
    'mx_gear_lock': `${ASSET_BASE}/vfx_gear_lock_mx2160.mp3`,
    'mx_tunnel': `${ASSET_BASE}/vfx_tunnel_whoosh_mx1486.mp3`,
    'mx_rift_charge': `${ASSET_BASE}/vfx_rift_charge_mx2900.mp3`,
    'mx_deep_impact': `${ASSET_BASE}/vfx_deep_impact_mx1143.mp3`,
    'mx_giant_roar': `${ASSET_BASE}/vfx_giant_roar_mx1972.mp3`,
    'mx_dino_roar': `${ASSET_BASE}/vfx_dino_roar_mx1976.mp3`,
    'mx_golem_stomp': `${ASSET_BASE}/vfx_golem_stomp_mx2150.mp3`,
    // 变种触发：Demo 原采样外置，rage_roar 直接使用 taunt
    'revive_gather': `${ASSET_BASE}/vfx_variant_revive_gather.mp3`,
    'revive_bloom': `${ASSET_BASE}/vfx_variant_revive_bloom.mp3`,
    'molt_crack': `${ASSET_BASE}/vfx_variant_molt_crack.mp3`,
    'molt_snap': `${ASSET_BASE}/vfx_variant_molt_snap.mp3`,
    'molt_empower': `${ASSET_BASE}/vfx_variant_molt_empower.mp3`,
    'rage_exit': `${ASSET_BASE}/vfx_variant_rage_exit.mp3`,
    'link_dash': `${ASSET_BASE}/vfx_variant_link_dash.mp3`,
    'link_chime': `${ASSET_BASE}/vfx_variant_link_chime.mp3`,
    'leech_flow': `${ASSET_BASE}/vfx_variant_leech_flow.mp3`,
    'regen_hum': `${ASSET_BASE}/vfx_variant_regen_hum.mp3`,
    'thorn_parry': `${ASSET_BASE}/vfx_variant_thorn_parry.mp3`,
    // 抗性与免疫：七条定稿采样外置，与一期变种共用音频总线
    'resist_fluid': `${ASSET_BASE}/vfx_variant_resist_fluid.mp3`,
    'resist_phantom': `${ASSET_BASE}/vfx_variant_resist_phantom.mp3`,
    'resist_antimagic': `${ASSET_BASE}/vfx_variant_resist_antimagic.mp3`,
    'resist_vital': `${ASSET_BASE}/vfx_variant_resist_vital.mp3`,
    'resist_fireproof': `${ASSET_BASE}/vfx_variant_resist_fireproof.mp3`,
    'resist_poisonproof': `${ASSET_BASE}/vfx_variant_resist_poisonproof.mp3`,
    'resist_ironbody': `${ASSET_BASE}/vfx_variant_resist_ironbody.mp3`,
    // 状态 / 自爆 / 救场：只补同源真音，其余复用已有键
    'ranshao': `${ASSET_BASE}/ranshao.mp3`,
    'fog': `${ASSET_BASE}/fog.mp3`,
    'mx_rift_tear': `${ASSET_BASE}/vfx_rift_tear_mx788.mp3`,
    'mx_vacuum': `${ASSET_BASE}/vfx_vacuum_suck_mx2608.mp3`,
    'mx_armor_strike': `${ASSET_BASE}/vfx_armor_strike_mx2765.mp3`,
    'sd_ring_blast': `${ASSET_BASE}/B2_脉冲环状冲击波爆_fs211423_Ring_Blast_Explosion.mp3`,
    'sd_shatter_blast': `${ASSET_BASE}/B4_破片贯穿引爆_mx1693_Shatter_shot_explosion.mp3`,
    'huoyan01': `${ASSET_BASE}/huoyan01.mp3`,
    'parry_perfect': `${ASSET_BASE}/parry_Weapon_Perfect.wav`,
    'avoid_dash_perfect': `${ASSET_BASE}/avoid_dash_fs521999.mp3`,
    'sheshen_armor_step': `${ASSET_BASE}/sheshen_armor_step_fs705490.mp3`,
    // 五项奇物/技能定稿：暗铁音叉、狮吼炎与秘银镜；复用音保持根级键
    'fork432': `${ASSET_BASE}/RpgCombat_Sound/vfx_fork_432_strike.mp3`,
    'forkHum': `${ASSET_BASE}/RpgCombat_Sound/vfx_fork_physics_hum.mp3`,
    'forkMute': `${ASSET_BASE}/RpgCombat_Sound/vfx_fork_muted_stop.mp3`,
    'bowlBronze': `${ASSET_BASE}/RpgCombat_Sound/vfx_bowl_bronze_silence.mp3`,
    'bowlClear': `${ASSET_BASE}/RpgCombat_Sound/vfx_bowl_crystal_clear.mp3`,
    'bellPing': `${ASSET_BASE}/RpgCombat_Sound/vfx_bell_dispel_ping.mp3`,
    'crystalSnap': `${ASSET_BASE}/RpgCombat_Sound/vfx_crystal_shatter_snap.mp3`,
    'mirrorRing': `${ASSET_BASE}/RpgCombat_Sound/vfx_mirror_ring_activate.mp3`,
    'mirrorStream': `${ASSET_BASE}/RpgCombat_Sound/vfx_mirror_mana_stream.mp3`,
    // 猫眼石 / 海螺 / 灵风 A 组与近战阻挡：其余音轨复用已有键
    'bastetChime': `${ASSET_BASE}/RpgCombat_Sound/vfx_bastet_harp_sweep.mp3`,
    'bastetCast': `${ASSET_BASE}/RpgCombat_Sound/vfx_magic_sparkle_whoosh.mp3`,
    'bastetHeal': `${ASSET_BASE}/RpgCombat_Sound/vfx_bastet_sanctuary_heal.mp3`,
    'conchCharge': `${ASSET_BASE}/RpgCombat_Sound/vfx_bowl_nepal_harmony.mp3`,
    'conchMist': `${ASSET_BASE}/RpgCombat_Sound/vfx_conch_deep_bubbles.mp3`,
    'windHum': `${ASSET_BASE}/vfx_wind_hum_mx1177.mp3`,
    'crystalChime': `${ASSET_BASE}/vfx_crystal_chime_mx2950.mp3`,
    'dodgeWind': `${ASSET_BASE}/dodge_candidates/dodge_t3_c_cinematic_wind.mp3`,
    'parryShield': `${ASSET_BASE}/parry_Shield3.wav`
};

const playSound = (key, volume = 1, rate = 1, opts = {}) => {
    const url = audioUrls[key];
    if (url) return playCustomAudio(url, volume, rate, opts);
};

function playRandomStandardGunshot(owner = null) {
    const candidates = ['gunshot1', 'gunshot2', 'gunshot3'];
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const cue = playSound(chosen, 0.95, 1, { track:'skill', sync:true, owner, audioContext:owner?.audioContext || CombatAudioMixer.capture('D') });
    if (owner) owner.attackCue = cue;
    return chosen;
}

function playShotgunSound(owner = null) {
    const cue = playSound('xiandan', 0.95, 1, { track:'skill', sync:true, owner, audioContext:owner?.audioContext || CombatAudioMixer.capture('D') });
    if (owner) owner.attackCue = cue;
    return cue;
}

  // ---- 粒子引擎（原样，仅换挂载层） ----
class CanvasFxEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationFrameId = null;
        this.hitStop = 0; // 定帧剩余毫秒：>0 时粒子冻结，制造重击顿挫感
        this.lastFrameTime = 0; // 上一帧时间戳：用于计算真实帧间隔 dt
        this.lastDt = 16.7;     // 最近一帧的真实间隔（毫秒），供雷电 overlay 等外部特效对齐
        this.init();
    }

    init() {
        this.canvas = null;
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'fx-canvas';
            this.canvas.style.cssText = 'position:absolute; left:0; top:0; pointer-events:none; z-index:99;'; this.canvas.setAttribute('data-tactics-fx', 'engine');
            __STAGE.el.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        __STAGE.onResize(() => this.resize());
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = __STAGE.w;
            this.canvas.height = __STAGE.h;
        }
    }

    addParticle(p) {
        this.particles.push(p);
        if (this.particles.length === 1) {
            this.startLoop();
        }
    }

    startLoop() {
        if (!this.animationFrameId) {
            // 重置时间戳，避免空闲后重启的首帧因间隔过大而跳变（配合 update 内 33ms 上限钳制）
            this.lastFrameTime = 0;
            const loop = () => {
                this.update();
                this.draw();
                if (this.particles.length > 0 || false) {
                    this.animationFrameId = requestAnimationFrame(loop);
                } else {
                    this.animationFrameId = null;
                }
            };
            this.animationFrameId = requestAnimationFrame(loop);
        }
    }

    update() {
        // Delta-time：按真实帧间隔推进动画，速度与 FPS 解耦（高刷屏不加速、掉帧不减速）
        // dt 上限 33ms：标签页休眠/卡顿后恢复时防止粒子瞬移跳变
        const now = performance.now();
        const dt = this.lastFrameTime ? Math.min(now - this.lastFrameTime, 33) : 16.7;
        this.lastDt = dt;
        this.lastFrameTime = now;
        const k = dt / 16.7; // 归一化时间系数：1 = 60fps 基准步长

        // Hit Stop 定帧：命中瞬间冻结粒子若干毫秒，制造"重击砸进肉里"的顿挫落差
        if (this.hitStop > 0) {
            this.hitStop -= dt;
            return;
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;

            p.x += p.vx * k;
            p.y += p.vy * k;

            if (p.gravity) p.vy += p.gravity * k;
            if (p.drag) {
                const d = Math.pow(p.drag, k); // 阻尼按时间比例复合衰减
                p.vx *= d;
                p.vy *= d;
            }
            if (p.update) p.update(p);

            if (p.age >= p.life) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 使用 'screen' 混合模式实现极具发光感的爆燃、辉光效果
        this.ctx.globalCompositeOperation = 'screen';
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const pct = p.age / p.life;
            this.ctx.save();
            p.draw(this.ctx, pct);
            this.ctx.restore();
        }
        
        // 绘制我方英雄 [延迟] 蓄力物理雷电特效 overlay
        if (false) { // 蓄力雷电 overlay 未迁移
            drawHeroChargeLightningOverlay(this.ctx);
        }

        this.ctx.globalCompositeOperation = 'source-over';
    }
}
  const fxEngine = new CanvasFxEngine();

  // ---- 事件总线（原样） ----
const EVENTS = {
    BEFORE_SKILL_RESOLVE: 'before_skill_resolve', // 技能宣告后、结算前（看破中断点）
    TURN_START:      'turn_start',      // 回合开始（毒 tick、眩晕检查前）
    TURN_END:        'turn_end',        // 回合结束（充能积攒、多重施法触发）
    BEFORE_DAMAGE:   'before_damage',   // 伤害结算前（可修改 rawDamage）
    AFTER_DAMAGE:    'after_damage',    // 伤害结算后（淬毒、眩晕、仇恨附加）
    BEFORE_HEAL:     'before_heal',     // 治疗前
    AFTER_HEAL:      'after_heal',      // 治疗后（溢出转盾）
    ON_KILL:         'on_kill',         // 目标被击杀时
    ON_FATAL_DAMAGE: 'on_fatal_damage', // 致命伤害时（毅力留存、回避致命）
    ON_DODGE:        'on_dodge',        // 闪避成功时
    DAMAGE_RESOLVED: 'damage_resolved', // 已提交的角色伤害结果，只读表现通知
    DODGE_RESOLVED:  'dodge_resolved',  // 已确认的闪避结果，只读表现通知
    BUFF_APPLIED:    'buff_applied',    // Buff 施加时
    BUFF_EXPIRED:    'buff_expired',    // Buff 过期时
};
const CombatEvents = {
    _listeners: {},

    on(event, listener, priority = 0) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push({ fn: listener, priority });
        this._listeners[event].sort((a, b) => b.priority - a.priority);
        return this; // 支持链式调用
    },

    off(event, listener) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(l => l.fn !== listener);
    },

    emit(event, ctx = {}) {
        const listeners = this._listeners[event];
        if (!listeners || listeners.length === 0) return;
        const resolved = event === EVENTS.DAMAGE_RESOLVED || event === EVENTS.DODGE_RESOLVED;
        for (const l of listeners) {
            if (resolved) {
                try { l.fn(ctx); } catch (e) { console.warn('战斗音频通知处理失败:', e); }
            } else {
                l.fn(ctx);
                if (ctx.cancelled) break; // 支持拦截中断
            }
        }
    },

    async emitAsync(event, ctx = {}) {
        const _actionToken = combatToken;
        if (_pipelineFrozen) return;
        const listeners = this._listeners[event];
        if (!listeners || listeners.length === 0) return;
        for (const l of listeners) {
            await l.fn(ctx); if (_actionToken !== combatToken || _pipelineFrozen) return;
            if (ctx.cancelled) break; // 支持拦截中断
        }
    }
};

  // ---- arcaneVfxModule 入选段（原样 + 坐标/挂载补丁） ----
  const arcane = (function () {
function clearSummonState() { /* 未迁移段：本 Demo 不产生该状态 */ }
function clearStatusLayers() { /* 未迁移段：本 Demo 不产生该状态 */ }
function clearSelfDestructState() { /* 未迁移段：本 Demo 不产生该状态 */ }
function clearRescueState() { /* 未迁移段：本 Demo 不产生该状态 */ }
function clearVariantState() { /* 未迁移段：本 Demo 不产生该状态 */ }
    'use strict';
    const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
    const GROUP_COLORS = {
        melee: ['#fff1dc', '#ff916d', '#e53532'],
        ranged: ['#fff9e0', '#ffe075', '#d99b15'],
        spell: ['#ffffff', '#e0f2fe', '#38bdf8']
    };

    // —— 共享状态（clearArcaneFx 同步清空） ——
    const S = {
        uid: 0,
        particles: [],
        particleTimer: null,
        particleUntil: 0,
        flights: [],    // 贝塞尔弹道飞行物
        timers: new Set(),     // combatToken 守卫的延时/收尾定时
        rawTimers: new Map(),  // 弹道拍点及其完成回调，清理时同步解除等待
        intervals: new Set(),  // 周期任务（蓄力抖动/羽流/光雨），回调内自守 token
        layers: new Set(),     // data-arcane-fx 临时 DOM 层
        anchors: new Set(),    // impactDom 无视觉锚点
        handles: new Set(),    // 活动技能 handle
        videos: new Set(),     // 透明 WebM 播放与解码帧清理
        sampleAudios: new Set(), // 奇物定稿采样 cue，取消与全局清场统一止音
        rowAimLayers: new Set(), // 近战选敌锁盾与前排护卫弧，退出选敌同步回收
        flashes: new Set(),    // 被加 arcane-flash-* 类的精灵
        shakeEls: new Set(),   // 被加 arcane-shake-* 类的舞台
        driver: null,          // 挂在 fxEngine.particles 里的驱动粒子
        canvas: null, ctx: null,
        dark: null, itemDarkOwner: null,
    };
    let audioCtx = null, sfxBus = null, sfxVerb = null, sfxNoise = null, sfxIR = null, resultOutput = false;
    const synthBuses = new Map();
    let groupChargeOutput = null;

    // ===== combatToken 守卫定时 =====
    function after(ms, fn) {
        const token = combatToken, sound = CombatAudioMixer.capture('D');
        const id = setTimeout(() => { S.timers.delete(id); if (token !== combatToken) return; CombatAudioMixer.withContext(sound, fn); }, ms);
        S.timers.add(id);
        return id;
    }
    function every(ms, fn) {
        const token = combatToken, sound = CombatAudioMixer.capture('D');
        const id = setInterval(() => { if (token !== combatToken) { clearInterval(id); S.intervals.delete(id); return; } CombatAudioMixer.withContext(sound, fn); }, ms);
        S.intervals.add(id);
        return id;
    }
    function stopEvery(id) { if (id != null) { clearInterval(id); S.intervals.delete(id); } }

    // ===== 临时层 / 锚点 / 舞台效果 =====
    function fsLayer(html, ms) {
        const d = document.createElement('div');
        d.className = 'arcane-fs-layer';
        d.setAttribute('data-arcane-fx', 'layer');
        d.innerHTML = html;
        __STAGE.el.appendChild(d);
        S.layers.add(d);
        if (ms) setTimeout(() => { S.layers.delete(d); d.remove(); }, ms); // 纯清理回调，恒执行
        return d;
    }
    function dropAnchor(d) { if (d && d.isConnected) { S.anchors.delete(d); d.remove(); } }
    function flash(el, cls) {
        if (!el || isEntityVariantLocked(el)) return;
        el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
        S.flashes.add(el);
        after(700, () => { el.classList.remove(cls); S.flashes.delete(el); });
    }
    function shake(type) {
        const scene = __STAGE.shakeEl();
        if (!scene) return;
        const cls = 'arcane-shake-' + type;
        scene.classList.remove('arcane-shake-light', 'arcane-shake-heavy', 'arcane-shake-quake');
        void scene.offsetWidth;
        scene.classList.add(cls);
        S.shakeEls.add(scene);
        after(type === 'quake' ? 560 : (type === 'heavy' ? 330 : 190), () => { scene.classList.remove(cls); S.shakeEls.delete(scene); });
    }
    function darken(o) {
        if (!o && !S.dark) return;
        if (!S.dark || !S.dark.isConnected) {
            S.dark = document.createElement('div');
            S.dark.id = 'arcane-dark';
            S.dark.setAttribute('data-arcane-fx', 'dark');
            __STAGE.el.appendChild(S.dark);
        }
        if (S.dark) S.dark.style.opacity = o;
        if (!o && S.dark) {
            const layer = S.dark;
            after(360, () => { if (layer === S.dark && layer.style.opacity === '0') { layer.remove(); S.dark = null; } });
        }
    }

    // ===== 几何 =====
    function ctr(el) { const r = el[__GBCR](); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }
    function domOf(e) { return getEntitySpriteDom(e); }
    function unionRect(doms) {
        const rs = doms.map(d => d[__GBCR]()).filter(r => r.width || r.height);
        if (!rs.length) return null;
        const l = Math.min(...rs.map(r => r.left)), rr = Math.max(...rs.map(r => r.right));
        const t = Math.min(...rs.map(r => r.top)), b = Math.max(...rs.map(r => r.bottom));
        return { x: (l + rr) / 2, y: (t + b) / 2, l, r: rr, t, b, w: rr - l, h: b - t };
    }
    // ===== 私有合成音色（demo 原样移植，局部隔离） =====
    function audio() {
        if (!audioCtx || audioCtx !== CombatAudioMixer.context()) {
            audioCtx = CombatAudioMixer.context();
            const ctx = audioCtx;
            synthBuses.clear();
            const len = ctx.sampleRate * 3; sfxIR = ctx.createBuffer(2, len, ctx.sampleRate);
            for (let ch = 0; ch < 2; ch++) { const dd = sfxIR.getChannelData(ch); for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); }
            sfxNoise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate); const nd = sfxNoise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
            const base = synthBus('D'); sfxBus = base.bus; sfxVerb = base.verb;
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }
    function synthBus(category) {
        if (!synthBuses.has(category)) {
            const ctx = audioCtx, comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -10; comp.knee.value = 4; comp.ratio.value = 6; comp.attack.value = 0.001; comp.release.value = 0.12;
            comp.connect(CombatAudioMixer.output(CombatAudioMixer.trackOf(category), category));
            const sat = shaper(ctx, 1.6); sat.connect(comp);
            const bus = ctx.createGain(); bus.gain.value = identitySfxOn ? 0.9 : 0; bus.connect(sat);
            const verb = ctx.createConvolver(); verb.buffer = sfxIR; const vg = ctx.createGain(); vg.gain.value = 0.5; verb.connect(vg); vg.connect(comp);
            synthBuses.set(category, { bus, verb });
        }
        return synthBuses.get(category);
    }
    function shaper(ctx, drive) { const ws = ctx.createWaveShaper(), c = new Float32Array(2048); for (let i = 0; i < 2048; i++) c[i] = Math.tanh((i / 1024 - 1) * drive) / Math.tanh(drive); ws.curve = c; ws.oversample = '2x'; return ws; }
    function chain(ctx, src, t, o) {
        const gn = ctx.createGain(), pk = o.peak || 0.002;
        gn.gain.setValueAtTime(0.0001, t); gn.gain[o.peak ? 'exponentialRampToValueAtTime' : 'linearRampToValueAtTime'](o.vol, t + pk);
        if (o.cut) { gn.gain.setValueAtTime(o.vol, t + o.dur - 0.012); gn.gain.linearRampToValueAtTime(0.0001, t + o.dur); }
        else gn.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
        const p = ctx.createStereoPanner(); p.pan.setValueAtTime(o.pan || 0, t); if (o.pan1 !== undefined) p.pan.linearRampToValueAtTime(o.pan1, t + o.dur);
        const category = resultOutput ? CombatAudioMixer.capture('F').category : CombatAudioMixer.capture('D').category;
        const sound = synthBus(category);
        src.connect(gn); gn.connect(p); p.connect(resultOutput ? CombatAudioMixer.output('result', category) : groupChargeOutput || identityOutput || sound.bus);
        if (o.wet && !resultOutput && !groupChargeOutput && !identityOutput) { const w = ctx.createGain(); w.gain.value = o.wet; p.connect(w); w.connect(sound.verb); }
        if (!resultOutput && !identityOutput && !groupChargeOutput) CombatAudioMixer.protect('short', t, null, category);
    }
    function noiseSrc(ctx, t, dur, rate) { const s = ctx.createBufferSource(); s.buffer = sfxNoise; s.playbackRate.value = rate || 1; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; }
    function biquad(ctx, type, f0, f1, q, t, dur, fd) { const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + (fd || dur)); return f; }
    function click(d, vol = 0.7, f = 3500, dur = 0.012, pan = 0) { const ctx = audio(), t = ctx.currentTime + d; const f1 = biquad(ctx, 'highpass', f, 0, 0.7, t, dur); noiseSrc(ctx, t, dur).connect(f1); chain(ctx, f1, t, { vol, dur, pan }); }
    function kick(d, o) {
        const ctx = audio(), t = ctx.currentTime + d; const s = ctx.createOscillator();
        s.frequency.setValueAtTime(o.hi, t); s.frequency.exponentialRampToValueAtTime(o.lo, t + o.pd); s.frequency.exponentialRampToValueAtTime(o.lo * 0.7, t + o.dur);
        const sh = shaper(ctx, o.drive || 3); s.connect(sh); s.start(t); s.stop(t + o.dur + 0.05); chain(ctx, sh, t, { vol: o.vol, dur: o.dur, wet: o.wet || 0 });
    }
    function crunch(d, o) { const ctx = audio(), t = ctx.currentTime + d; const bp = biquad(ctx, 'bandpass', o.f, o.f1, o.q || 1, t, o.dur); const sh = shaper(ctx, o.drive || 6); noiseSrc(ctx, t, o.dur).connect(bp); bp.connect(sh); chain(ctx, sh, t, { vol: o.vol, dur: o.dur, pan: o.pan || 0, wet: o.wet || 0 }); }
    function boom(d, o) { const ctx = audio(), t = ctx.currentTime + d; const lp = biquad(ctx, 'lowpass', o.f0, o.f1, 0.9, t, o.dur, o.fd || o.dur * 0.6); noiseSrc(ctx, t, o.dur, o.rate).connect(lp); chain(ctx, lp, t, { vol: o.vol, dur: o.dur, peak: o.peak, wet: o.wet || 0, pan: o.pan || 0 }); }
    function whoosh(d, o) {
        const ctx = audio(), t = ctx.currentTime + d; const f = biquad(ctx, o.type || 'bandpass', o.f0, o.f1, o.q || 1.2, t, o.dur);
        if (o.wob) o.wob.forEach(([dt, hz]) => f.frequency.linearRampToValueAtTime(hz, t + dt));
        noiseSrc(ctx, t, o.dur, o.rate).connect(f); chain(ctx, f, t, { vol: o.vol, dur: o.dur, peak: o.peak || o.dur * 0.5, cut: o.cut, pan: o.pan || 0, pan1: o.pan1, wet: o.wet || 0 });
    }
    function drone(d, o) {
        const ctx = audio(), t = ctx.currentTime + d;
        [-12, 0, 9].forEach(dt => { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.detune.value = dt; s.frequency.setValueAtTime(o.f0, t); s.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
            const lp = biquad(ctx, 'lowpass', o.lp0, o.lp1, 3, t, o.dur); s.connect(lp); s.start(t); s.stop(t + o.dur + 0.05); chain(ctx, lp, t, { vol: o.vol, dur: o.dur, peak: o.dur * 0.95, cut: true }); });
    }
    function tone(d, o) {
        const ctx = audio(), t = ctx.currentTime + d; const s = ctx.createOscillator(); s.type = o.type || 'sine'; s.detune.value = o.detune || 0;
        s.frequency.setValueAtTime(o.f0, t); if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + (o.fd || o.dur));
        let node = s; if (o.lp) { const f = biquad(ctx, 'lowpass', o.lp, o.lp1, o.q || 0.8, t, o.dur); s.connect(f); node = f; }
        s.start(t); s.stop(t + o.dur + 0.05); chain(ctx, node, t, o);
    }
    function chime(d, f, dur = 1.2, vol = 0.1, pan = 0) { [[1, 1], [2.4, 0.4], [3.9, 0.18]].forEach(([m, v]) => tone(d, { f0: f * m, dur: dur / Math.sqrt(m), vol: vol * v, pan, wet: 0.7 })); }
    function crystal(d, f, vol = 0.12, pan = 0) { tone(d, { f0: f, dur: 0.16, vol, pan, wet: 0.5 }); tone(d, { f0: f * 1.5, dur: 0.09, vol: vol * 0.5, pan }); click(d, vol * 1.5, 6000, 0.005, pan); }
    // ===== arcane canvas 粒子层（绘制在 z55，低于浮字；调度复用 fxEngine 循环） =====
    function ensureCanvas() {
        if (S.canvas && S.canvas.isConnected) return;
        const c = document.createElement('canvas');
        c.id = 'arcane-fx-canvas';
        c.setAttribute('data-arcane-fx', 'canvas');
        __STAGE.el.appendChild(c);
        S.canvas = c; S.ctx = c.getContext('2d');
        resizeCanvas();
    }
    function resizeCanvas() { if (S.canvas) { S.canvas.width = __STAGE.w; S.canvas.height = __STAGE.h; } }
    __STAGE.onResize(resizeCanvas);
    const DRAW = {
        dot(g, p) { g.fillStyle = p.color; g.beginPath(); g.arc(0, 0, p.size, 0, 6.283); g.fill(); },
        ring(g, p) { g.strokeStyle = p.color; g.lineWidth = 3 * p.life; g.beginPath(); g.arc(0, 0, 4 + p.size * (1 - p.life) * 40, 0, 6.283); g.stroke(); },
        flame(g, p) { const r = p.size * (0.4 + p.life * 0.8); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, '#fff7d6'); gr.addColorStop(0.35, p.color); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill(); },
        smoke(g, p) { const r = p.size * (1.6 - p.life); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, p.color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill(); },
        feather(g, p) { const s = p.size; g.fillStyle = p.color; g.beginPath(); g.moveTo(-s * 1.5, 0); g.quadraticCurveTo(0, -s * 0.55, s * 1.5, 0); g.quadraticCurveTo(0, s * 0.4, -s * 1.5, 0); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-s * 1.8, 0); g.lineTo(s * 1.5, 0); g.stroke(); },
        shard(g, p) { const s = p.size; g.fillStyle = p.fill || 'rgba(224,242,254,0.25)'; g.strokeStyle = p.color; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.7, s * 0.3); g.lineTo(s * 0.1, s * 0.9); g.lineTo(-s * 0.6, s * 0.2); g.closePath(); g.fill(); g.stroke(); },
        streak(g, p) { g.strokeStyle = p.color; g.lineWidth = p.size; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-p.vx * 4, -p.vy * 4); g.stroke(); },
        gradRing(g, p) {
            if (p.itemFx) return DRAW.item_gradRing(g, p);
            const out = 10 + p.size * (1 - p.life) * 44, inn = Math.max(0.1, out * 0.58);
            const gr = g.createRadialGradient(0, 0, inn, 0, 0, out);
            gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.58, p.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, out, 0, 6.283); g.fill();
        },
        gradOrb(g, p) {
            if (p.itemFx) return DRAW.item_gradOrb(g, p);
            const r = Math.max(1.2, p.size * (0.45 + 0.55 * p.life));
            if (p.hist && p.hist.length) {
                const a0 = g.globalAlpha;
                for (let j = p.hist.length - 1; j >= 0; j--) {
                    const hp = p.hist[j], k = (j + 1) / (p.hist.length + 1), tr = r * (0.94 - k * 0.62);
                    const tgr = g.createRadialGradient(hp[0] - p.x, hp[1] - p.y, 0, hp[0] - p.x, hp[1] - p.y, tr * 2.1);
                    tgr.addColorStop(0, p.color); tgr.addColorStop(0.45, p.edge || p.color); tgr.addColorStop(1, 'rgba(0,0,0,0)');
                    g.globalAlpha = a0 * (0.44 - k * 0.34);
                    g.fillStyle = tgr; g.beginPath(); g.arc(hp[0] - p.x, hp[1] - p.y, tr * 2.1, 0, 6.283); g.fill();
                }
                g.globalAlpha = a0;
            }
            const halo = g.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
            halo.addColorStop(0, p.color); halo.addColorStop(0.42, p.edge || p.color); halo.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = halo; g.beginPath(); g.arc(0, 0, r * 2.5, 0, 6.283); g.fill();
            const orb = g.createRadialGradient(r * 0.18, 0, 0, 0, 0, r);
            orb.addColorStop(0, p.core || 'rgba(245,243,255,0.96)'); orb.addColorStop(0.42, p.color); orb.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = orb; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        },
        gradMist(g, p) {
            if (p.itemFx) return DRAW.item_gradMist(g, p);
            const r = p.size * (1.72 - p.life * 0.62);
            g.save(); g.scale(p.sx || 1.45, p.sy || 0.78);
            const gr = g.createRadialGradient(-r * 0.14, 0, 0, 0, 0, r);
            gr.addColorStop(0, p.mistCore || p.color); gr.addColorStop(0.46, p.color); gr.addColorStop(1, p.fade || 'rgba(18,12,28,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
            g.restore();
        },
        gradFlare(g, p) {
            if (p.itemFx) return DRAW.item_gradFlare(g, p);
            const r = p.size * (0.6 + 0.55 * Math.sin((1 - p.life) * Math.PI));
            const core = p.core || 'rgba(255,251,235,0.95)', col = p.color || 'rgba(167,139,250,0.6)';
            [[1, 0.15], [0.15, 1]].forEach(([sx, sy]) => {
                g.save(); g.scale(sx, sy);
                const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
                gr.addColorStop(0, core); gr.addColorStop(0.28, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
                g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 2.2, 0, 6.283); g.fill();
                g.restore();
            });
        },
        item_gradOrb(g, p) {
            const r = Math.max(2, p.size * (p.pulse ? (0.85 + 0.35 * Math.sin(p.life * 9)) : (0.55 + 0.45 * p.life)));
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, p.core || '#ffffff');
            gr.addColorStop(0.26, p.mid || p.color || '#7dd3fc');
            gr.addColorStop(0.66, p.outer || 'rgba(56,189,248,0.18)');
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        },
        item_gradMist(g, p) {
            // 严禁共用亮白 core，防止暗/彩雾呈现出白心黑圈气泡伪影
            const r = Math.max(4, p.size * (1.55 - 0.55 * p.life));
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, p.inner || 'rgba(99,102,241,0.34)');
            gr.addColorStop(0.55, p.outer || 'rgba(49,46,129,0.14)');
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        },
        item_gradFlare(g, p) {
            const rx = Math.max(4, p.rx || p.size * 3.8), ry = Math.max(2, p.ry || p.size * 0.65);
            g.save(); g.scale(1, ry / rx);
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
            gr.addColorStop(0, p.core || '#ffffff');
            gr.addColorStop(0.28, p.mid || p.color || '#bae6fd');
            gr.addColorStop(0.72, p.outer || 'rgba(14,165,233,0.15)');
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 6.283); g.fill();
            g.restore();
        },
        item_gradRing(g, p) {
            const R = Math.max(8, (p.r0 || 12) + (p.r1 || 90) * (1 - p.life));
            const sy = p.sy ?? 1;
            const inner = Math.max(0, R * 0.87);
            g.save();
            if (sy !== 1) g.scale(1, sy);
            const gr = g.createRadialGradient(0, 0, inner, 0, 0, R);
            gr.addColorStop(0, 'rgba(0,0,0,0)');
            gr.addColorStop(0.35, p.color || 'rgba(125,211,252,0.22)');
            gr.addColorStop(0.68, p.edge || 'rgba(224,242,254,0.52)');
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.globalAlpha *= 0.65;
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.fill();
            g.restore();
        },
        histOrb(g, p) {
            const h = p.hist;
            if (h && h.length > 1) {
                g.save();
                for (let i = 0; i < h.length; i++) {
                    const pt = h[i], f = (i + 1) / h.length, x = pt.x - p.x, y = pt.y - p.y;
                    const rr = Math.max(1.5, p.size * 0.62 * f);
                    g.globalAlpha = Math.min(1, p.life) * f * 0.45;
                    const tr = g.createRadialGradient(x, y, 0, x, y, rr);
                    tr.addColorStop(0, p.core || '#fff'); tr.addColorStop(0.4, p.mid || p.color); tr.addColorStop(1, 'rgba(0,0,0,0)');
                    g.fillStyle = tr; g.beginPath(); g.arc(x, y, rr, 0, 6.283); g.fill();
                }
                g.restore();
            }
            DRAW.item_gradOrb(g, p);
        },
        glowOrb(g, p) {
            const r = Math.max(2, p.size * (0.7 + p.life * 0.55));
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, p.core || 'rgba(255,255,255,0.92)');
            gr.addColorStop(0.28, p.color);
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        },
        bloom(g, p) {
            const r = Math.max(4, p.size * (1.25 - p.life * 0.35));
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, p.color);
            gr.addColorStop(0.45, p.mid || p.color);
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        },
        spark(g, p) {
            const tx = -p.vx * (p.tail || 4.8), ty = -p.vy * (p.tail || 4.8);
            const gr = g.createLinearGradient(0, 0, tx, ty);
            gr.addColorStop(0, '#ffffff');
            gr.addColorStop(0.35, p.color);
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.strokeStyle = gr; g.lineWidth = p.size * 1.45; g.lineCap = 'round';
            g.beginPath(); g.moveTo(0, 0); g.lineTo(tx, ty); g.stroke();
            const r = p.size * 2.2;
            const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
            rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.4, p.color); rg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        },
        bloodMist(g, p) {
            const r = p.size * (0.55 + (1 - p.life) * 1.35);
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, p.color || 'rgba(153,27,27,0.72)');
            gr.addColorStop(0.55, p.midColor || 'rgba(127,29,29,0.42)');
            gr.addColorStop(1, 'rgba(69,10,10,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        },
        bloodDrop(g, p) {
            const spd = Math.hypot(p.vx, p.vy), len = p.size * (1.5 + Math.min(2.6, spd * 0.28)), w = p.size * 0.65;
            g.rotate(Math.atan2(p.vy, p.vx));
            g.fillStyle = p.color || '#dc2626';
            g.beginPath(); g.moveTo(len, 0); g.quadraticCurveTo(0, -w, -len * 0.65, 0); g.quadraticCurveTo(0, w, len, 0); g.fill();
        },
        droplet(g, p) {
            const spd = Math.hypot(p.vx, p.vy), len = p.size * (1.25 + Math.min(2.1, spd * 0.24)), w = p.size * 0.72;
            g.rotate(Math.atan2(p.vy, p.vx));
            g.fillStyle = p.color || '#84cc16';
            g.beginPath(); g.moveTo(len, 0); g.quadraticCurveTo(0, -w, -len * 0.72, 0); g.quadraticCurveTo(0, w, len, 0); g.fill();
            g.fillStyle = p.hiColor || '#ecfccb';
            g.beginPath(); g.arc(len * 0.22, -w * 0.2, Math.max(0.8, p.size * 0.28), 0, 6.283); g.fill();
        },
        frostShard(g, p) {
            const s = p.size;
            g.fillStyle = p.fill || 'rgba(186,230,253,0.42)';
            g.strokeStyle = p.color || '#e0f2fe';
            g.lineWidth = 1.1;
            g.beginPath();
            g.moveTo(0, -s * 1.35); g.lineTo(s * 0.65, -s * 0.2); g.lineTo(s * 0.25, s * 1.15);
            g.lineTo(-s * 0.55, s * 0.45); g.lineTo(-s * 0.48, -s * 0.45); g.closePath();
            g.fill(); g.stroke();
        },
        shell(g, p) {
            const s = p.size;
            g.fillStyle = p.color || '#fbbf24';
            g.fillRect(-s * 0.9, -s * 0.42, s * 1.8, s * 0.84);
            g.fillStyle = '#fef3c7';
            g.fillRect(-s * 0.6, -s * 0.3, s * 0.8, s * 0.24);
        },
        dust(g, p) {
            const w = p.size * (1.6 + Math.hypot(p.vx, p.vy) * 0.42);
            g.strokeStyle = p.color || 'rgba(167,243,208,0.68)';
            g.lineWidth = Math.max(1, p.size * 0.55);
            g.lineCap = 'round';
            g.beginPath(); g.moveTo(-w * 0.5, 0); g.lineTo(w * 0.5, 0); g.stroke();
        },
        omen(g, p) { drawOmenParticle(g, p); }
    };
    DRAW.rescueBloodDrop = function(g, p) {
    const s = p.size || 3;
    g.fillStyle = p.color || '#dc2626';
    g.beginPath();
    g.moveTo(0, -s * 1.55);
    g.quadraticCurveTo(s * 0.95, 0, 0, s);
    g.quadraticCurveTo(-s * 0.95, 0, 0, -s * 1.55);
    g.fill();
    if (p.glint) {
        g.fillStyle = p.glint;
        g.beginPath();
        g.arc(-s * 0.22, s * 0.12, s * 0.28, 0, 6.283);
        g.fill();
    }
};
    function releaseIdleCanvas() {
        if (S.driver || S.handles.size || S.particles.length || S.flights.length || !S.canvas) return;
        S.canvas.remove(); S.canvas = null; S.ctx = null;
    }
    function scheduleParticleCleanup() {
        if (S.particleTimer !== null) return;
        S.particleTimer = after(Math.max(0, S.particleUntil - performance.now()), () => {
            S.particleTimer = null;
            const now = performance.now();
            S.particles = S.particles.filter(p => p.expiresAt > now);
            if (S.particles.length) { scheduleParticleCleanup(); return; }
            if (!S.flights.length && S.driver) {
                const index = fxEngine.particles.indexOf(S.driver);
                if (index >= 0) fxEngine.particles.splice(index, 1);
                S.driver = null;
            }
            if (S.ctx) S.ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
            releaseIdleCanvas();
        });
    }
    function addP(o) {
        const p = Object.assign({ vx: 0, vy: 0, life: 1, decay: 0.02, size: 3, color: '#fde68a', grav: 0, drag: 0.98, rot: 0, vr: 0, shape: 'dot', blend: 'lighter' }, o);
        p.expiresAt = performance.now() + p.life / p.decay * 16.7;
        S.particleUntil = Math.max(S.particleUntil, p.expiresAt);
        S.particles.push(p);
        ensureCanvas(); ensureDriver(); scheduleParticleCleanup();
    }
    function burst(n, fn) { for (let i = 0; i < n; i++) addP(fn(i)); }
    // 绕场收束（demo orbitCharge 原样）
    function orbitCharge(c, n, dur, mk, rx, ry, shrink = 0.8) {
        const orb = []; for (let i = 0; i < n; i++) orb.push({ a: Math.random() * 6.283, r: rnd(0.45, 1), s: rnd(0.025, 0.05), k: Math.random() });
        const t0 = performance.now();
        const id = every(33, () => { const k = Math.min(1, (performance.now() - t0) / dur); orb.forEach(o => { o.a += o.s * (1 + k * 3); const r = o.r * (1 - k * shrink); addP(Object.assign({ x: c.x + Math.cos(o.a) * rx * r, y: c.y + Math.sin(o.a) * ry * r, decay: 0.25 }, mk(o))); }); });
        after(dur, () => stopEvery(id));
    }
    // 贝塞尔弹道（demo fly 原样；由驱动粒子步进，不另启 rAF）
    function flyBezier(a, ctrl, b, dur, draw, done, ease) {
        ease = ease || (k => k * k);
        const startedAt = performance.now(), sound = CombatAudioMixer.capture('D');
        const f = {
            age: 0, dur, timer: null,
            step(pr) { const t = ease(pr), u = 1 - t; CombatAudioMixer.withContext(sound, () => draw(u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x, u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y, pr)); },
            progress() { return Math.min(1, (performance.now() - startedAt) / dur); }
        };
        S.flights.push(f);
        ensureCanvas(); ensureDriver();
        f.timer = after(dur, () => {
            const index = S.flights.indexOf(f);
            if (index >= 0) S.flights.splice(index, 1);
            f.step(1);
            if (done) done();
        });
        return f;
    }
    function fly(a, b, lift, dur, draw, done, ease) {
        return flyBezier(a, { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift }, b, dur, draw, done, ease);
    }
    function ensureDriver() {
        if (S.driver) return;
        const driver = {
            age: 0, life: 1e9, x: 0, y: 0, vx: 0, vy: 0,
            update(p) {
                step(fxEngine.lastDt || 16.7);
                if (!S.particles.length && !S.flights.length) {
                    p.age = p.life; S.driver = null;
                    if (S.ctx) S.ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
                    releaseIdleCanvas();
                }
            },
            draw() { render(); }
        };
        S.driver = driver;
        fxEngine.addParticle(driver);
    }
    function step(dt) {
        const k = dt / 16.7;
        for (const f of S.flights) f.step(f.progress());
        for (let i = S.particles.length - 1; i >= 0; i--) {
            const p = S.particles[i];
            p.vx *= Math.pow(p.drag, k); p.vy *= Math.pow(p.drag, k);
            p.vy += p.grav * k;
            p.x += p.vx * k; p.y += p.vy * k;
            if (p.trailMax) { (p.hist || (p.hist = [])).push({ x:p.x, y:p.y }); if (p.hist.length > p.trailMax) p.hist.shift(); }
            else if (p.trail) { (p.hist || (p.hist = [])).unshift([p.x, p.y]); if (p.hist.length > p.trail) p.hist.pop(); }
            p.rot += p.vr * k;
            p.life = Math.min(p.life - p.decay * k, Math.max(0, (p.expiresAt - performance.now()) * p.decay / 16.7));
            if (p.life <= 0) S.particles.splice(i, 1);
        }
    }
    function render() {
        const g = S.ctx; if (!g || !S.canvas) return;
        g.clearRect(0, 0, S.canvas.width, S.canvas.height);
        for (const owner of new Set(S.particles.filter(p => p.owner && p.owner.dom).map(p => p.owner))) {
            const r = ctr(owner.dom);
            owner.frame = Object.assign(r, { left: r.left, clipBottom: Math.min(r.bottom, owner.barTop - 2), now: performance.now() });
        }
        for (let i = 0; i < S.particles.length; i++) {
            const p = S.particles[i];
            g.save();
            g.globalAlpha = Math.min(1, p.life * 1.4);
            g.globalCompositeOperation = p.blend;
            g.translate(p.x, p.y);
            if (p.shape !== 'streak' && p.shape !== 'bloodDrop' && p.shape !== 'droplet' && p.shape !== 'gradOrb' && p.shape !== 'spark') g.rotate(p.rot);
            DRAW[p.shape](g, p);
            g.restore();
        }
    }

    // ===== ① 通用火焰弹（240 蓄 + 340 飞 = 580ms 命中拍点） =====
    function fireProjectile(fromDom, toDom, dodged, token, onImpact) {
        const h = ctr(fromDom), t = ctr(toDom);
        const a = { x: h.x + 10, y: h.top - 16 }, b = { x: t.x, y: t.y };
        burst(22, () => { const ang = Math.random() * 6.283, d = rnd(40, 70); return { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d, vx: -Math.cos(ang) * d / 9, vy: -Math.sin(ang) * d / 9, drag: 0.86, decay: 0.06, size: rnd(1.2, 2.4), color: pick(['#fdba74', '#f97316', '#fde68a']) }; });
        fsLayer(`<div class="arcane-fs-anchor" style="left:${a.x}px; top:${a.y}px; width:64px; height:64px; border-radius:50%; background: radial-gradient(circle, #fff7d6 0%, #fb923c 35%, rgba(220,38,38,0.45) 60%, transparent 72%); animation: arcane-seed-bloom 0.26s ease-out both;"></div>`, 320);
        after(240, () => {
            if (token !== combatToken) return; // 重置后停止绘制/音效启动
            fly(a, b, 90, 340, (x, y) => {
                if (token !== combatToken) return;
                addP({ x, y, shape: 'flame', size: 16, decay: 0.2, color: '#fb923c' });
                burst(5, () => ({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: rnd(-1, 1), vy: rnd(-1.6, -0.3), drag: 0.94, decay: rnd(0.04, 0.07), size: rnd(6, 11), shape: 'flame', color: pick(['#f97316', '#ef4444', '#fbbf24']) }));
                for (let j = 0; j < 2; j++) { const an = performance.now() / 45 + j * 3.14; addP({ x: x + Math.cos(an) * 11, y: y + Math.sin(an) * 11, decay: 0.3, size: 2, color: '#fff7d6' }); }
            }, () => {
                if (onImpact) onImpact();
                if (token !== combatToken || _pipelineFrozen || dodged) return; // 闪避保留原弹道，命中采样不双播
                idSample(null, 'light_impact', 0.92);
                fsLayer(`<div class="arcane-fs-anchor" style="left:${b.x}px; top:${b.y}px; width:140px; height:140px; border-radius:50%; background: radial-gradient(circle, #fff 0%, #fdba74 30%, rgba(239,68,68,0.5) 58%, transparent 72%); animation: arcane-hit-flash 0.34s ease-out both;"></div>`, 420);
                burst(2, i => ({ x: b.x, y: b.y, shape: 'ring', size: 1.8 + i, decay: 0.07 - i * 0.02, color: i ? '#f97316' : '#fde68a' }));
                burst(40, () => { const an = Math.random() * 6.283, s = rnd(2, 8); return { x: b.x, y: b.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 1, grav: 0.13, drag: 0.93, decay: rnd(0.025, 0.05), size: rnd(1, 2.2), color: pick(['#fde68a', '#fb923c', '#fff7d6']) }; });
                burst(10, () => ({ x: b.x + rnd(-14, 14), y: b.y + rnd(-14, 14), vx: rnd(-1, 1), vy: rnd(-2, -0.5), drag: 0.95, decay: rnd(0.03, 0.05), size: rnd(12, 20), shape: 'flame', color: '#f97316' }));
                burst(9, () => ({ x: b.x + rnd(-24, 24), y: b.y + rnd(-18, 18), vx: rnd(-0.3, 0.3), vy: rnd(-0.9, -0.4), drag: 0.99, decay: 0.011, size: rnd(16, 28), shape: 'smoke', blend: 'source-over', color: 'rgba(40,32,30,0.55)' }));
            });
        });
    }

    // ===== ② 敌方紫色法术弹（480ms 命中拍点） =====
    function enemySpellProjectile(fromDom, toDom, dodged, token, onImpact) {
        const t = ctr(fromDom), h = ctr(toDom);
        const a = { x: t.x - 20, y: t.y - 10 }, b = { x: h.x, y: toDom.hasAttribute('data-arcane-fx') ? h.y : h.top + 30 };
        fly(a, b, 30, 480, (x, y) => {
            if (token !== combatToken) return;
            addP({ x, y, size: 9, decay: 0.22, color: '#c084fc' }); addP({ x, y, size: 4, decay: 0.3, color: '#fff' });
            burst(3, () => ({ x: x + rnd(-5, 5), y: y + rnd(-5, 5), vx: rnd(0.5, 1.5), vy: rnd(-0.5, 0.5), drag: 0.94, decay: 0.06, size: rnd(1.5, 3), color: pick(['#7c3aed', '#a855f7']) }));
        }, () => {
            if (onImpact) onImpact();
            if (token !== combatToken || _pipelineFrozen || dodged) return;
            idSample(null, 'light_impact', 0.92);
            burst(24, () => { const an = Math.random() * 6.283, s = rnd(1.5, 5); return { x: b.x, y: b.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.93, decay: 0.04, size: rnd(1, 2.4), color: pick(['#e9d5ff', '#c084fc', '#7c3aed']) }; });
        }, k => k);
    }

    // ===== 敌方攻击前摇：一级（普通行动起手） =====
    // 统一节奏：0–330ms 预备蓄势，330ms 为出手拍点（正式版以此为结算起点），600ms 完全回位。
    // 七类新增前摇使用贴身渐变粒子；红色单体基线不添加粒子。
    const OMEN_MS = 600, OMEN_BEAT = 330;

    // combatToken 守卫、且能被 handle.cancel() 单独摘除的定时器（after() 只随全局重置清理）
    function localAfter(ms, fn, bag) {
        const token = combatToken;
        const id = setTimeout(() => { S.timers.delete(id); bag.delete(id); if (token !== combatToken) return; fn(); }, ms);
        S.timers.add(id); bag.add(id);
        return id;
    }

    const OMEN_COLORS = {
        'red-wide': ['#fff1dc', '#ff916d', '#e53532'],
        'amber-single': ['#fff9e0', '#ffe075', '#d99b15'],
        'amber-wide': ['#fff9e0', '#ffe075', '#d99b15'],
        'violet-single': ['#fbf0ff', '#cc9bff', '#733bed'],
        'violet-wide': ['#fbf0ff', '#cc9bff', '#733bed'],
        'rose-self': ['#fff4f0', '#ffc6dd', '#eb72a2'],
        'gloom-foe': ['#b6c2d0', '#536174', '#080d16']
    };

    // 粒子在图标局部坐标中运动；亮芯、彩色过渡与透明边缘均由渐变绘制，不画轮廓线。
    function drawOmenParticle(g, p) {
        const frame = p.owner.frame, k = frame.h / 96;
        const t = Math.max(0, Math.min(1, (frame.now - p.born) / p.dur));
        const sample = u => {
            const q = 1 - u;
            return { x: (q * q * p.from[0] + 2 * q * u * p.via[0] + u * u * p.to[0]) * frame.w,
                     y: (q * q * p.from[1] + 2 * q * u * p.via[1] + u * u * p.to[1]) * frame.h };
        };
        const pos = sample(t), prev = sample(Math.max(0, t - 0.02));
        const angle = Math.atan2(pos.y - prev.y, pos.x - prev.x);
        const [core, color, edge] = p.colors;
        const alpha = g.globalAlpha * Math.min(1, t / 0.1) * Math.pow(1 - t, 0.35);
        const radius = p.size * k * (0.5 + 0.6 * Math.sin(Math.PI * t));
        g.save();
        g.beginPath();
        g.rect(frame.left - 6 * k, frame.top - 6 * k, frame.w + 12 * k, frame.clipBottom - frame.top + 6 * k);
        g.clip();
        g.translate(frame.x, frame.y);

        // 拖尾是一串渐变微粒，不是等宽实线；各粒的尺寸、透明度沿轨迹衰减。
        for (let i = 5; i > 0; i--) {
            const u = t - i * p.tail / 5;
            if (u < 0) continue;
            const s = sample(u), r = radius * (0.9 - i * 0.11);
            const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2);
            gr.addColorStop(0, color + 'c0'); gr.addColorStop(0.35, color + '60'); gr.addColorStop(1, edge + '00');
            g.globalAlpha = alpha * (0.4 - i * 0.05);
            g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, r * 2, 0, 6.283); g.fill();
        }
        g.translate(pos.x, pos.y); g.rotate(angle);
        g.globalAlpha = alpha;
        if (p.texture === 'mist') {
            const gr = g.createRadialGradient(-radius * 0.2, 0, 0, 0, 0, radius * 2.2);
            gr.addColorStop(0, edge + 'e0'); gr.addColorStop(0.35, color + 'b0'); gr.addColorStop(0.7, color + '45'); gr.addColorStop(1, edge + '00');
            g.scale(1.3, 0.8); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, radius * 2.2, 0, 6.283); g.fill();
            g.globalAlpha = alpha * 0.5;
            const rim = g.createRadialGradient(0, -radius * 0.55, 0, 0, -radius * 0.55, radius * 0.8);
            rim.addColorStop(0, core + 'b0'); rim.addColorStop(1, color + '00');
            g.fillStyle = rim; g.beginPath(); g.arc(0, -radius * 0.55, radius * 0.8, 0, 6.283); g.fill();
        } else {
            const halo = g.createRadialGradient(0, 0, 0, 0, 0, radius * 2.4);
            halo.addColorStop(0, color + '85'); halo.addColorStop(0.35, color + '35'); halo.addColorStop(1, edge + '00');
            g.fillStyle = halo; g.beginPath(); g.arc(0, 0, radius * 2.4, 0, 6.283); g.fill();
            const gr = g.createRadialGradient(radius * 0.22, 0, 0, 0, 0, radius);
            gr.addColorStop(0, core); gr.addColorStop(0.2, core + 'e0'); gr.addColorStop(0.5, color + 'c0'); gr.addColorStop(1, edge + '00');
            g.fillStyle = gr;
            if (p.texture === 'crystal') {
                g.beginPath(); g.moveTo(radius * 1.5, 0); g.lineTo(0, radius * 0.65); g.lineTo(-radius * 1.2, 0); g.lineTo(0, -radius * 0.65); g.closePath(); g.fill();
            } else {
                g.scale(p.texture === 'spark' ? 1.7 : 1, p.texture === 'spark' ? 0.6 : 1);
                g.beginPath(); g.arc(0, 0, radius, 0, 6.283); g.fill();
            }
        }
        g.restore();
    }

    function omenParticle(owner, dur, from, via, to, size, texture = 'spark', tail = 0.2) {
        addP({ shape: 'omen', owner, born: performance.now(), dur, decay: 16.7 / dur,
               from, via, to, size, texture, tail, colors: OMEN_COLORS[owner.kind], x: 0, y: 0,
               blend: texture === 'mist' ? 'source-over' : 'screen' });
    }

    // 八次微粒凝聚 → 短停 → 330ms 同拍释放；所有轨迹只在身体侧缘及下缘活动。
    function omenAura(kind, owner, bag) {
        if (kind === 'red-single') return;
        for (let wave = 0; wave < 8; wave++) {
            const at = wave * 36, dur = Math.min(190, 308 - at);
            localAfter(at, () => {
                for (let i = 0; i < 5; i++) {
                    const side = i % 2 ? 1 : -1, jitter = rnd(-0.025, 0.025);
                    if (kind === 'red-wide') {
                        omenParticle(owner, dur, [-0.39 + jitter, rnd(-0.18, 0.24)], [-0.46, 0.15], [-0.32, 0.23], rnd(1.4, 2.5));
                    } else if (kind === 'amber-single') {
                        omenParticle(owner, dur, [side * 0.34, rnd(0.02, 0.25)], [side * 0.22, 0.34], [jitter, 0.29], rnd(1.1, 2));
                    } else if (kind === 'amber-wide') {
                        omenParticle(owner, dur, [side * 0.43, rnd(0.04, 0.28)], [side * 0.25, 0.33], [side * 0.17, 0.28], rnd(1.2, 2.2));
                    } else if (kind === 'violet-single') {
                        omenParticle(owner, dur, [side * 0.43, rnd(-0.35, 0.18)], [side * 0.36, 0.27], [side * 0.1, 0.27], rnd(1.5, 2.5), 'crystal', 0.16);
                    } else if (kind === 'violet-wide') {
                        omenParticle(owner, dur, [side * 0.19, rnd(0.13, 0.29)], [side * 0.33, 0.12], [side * 0.4, rnd(-0.21, 0.22)], rnd(1.4, 2.5), 'crystal', 0.14);
                    } else if (kind === 'rose-self') {
                        omenParticle(owner, dur, [side * 0.37, rnd(0.2, 0.32)], [side * 0.45, -0.1], [side * 0.3, -0.32 + jitter], rnd(1.4, 2.2), 'glow', 0.22);
                    } else if (kind === 'gloom-foe') {
                        omenParticle(owner, dur, [side * 0.37, rnd(-0.32, 0.12)], [side * 0.43, 0.16], [side * 0.34, 0.27], rnd(2.2, 3.5), 'mist', 0.1);
                    }
                }
            }, bag);
        }
        localAfter(OMEN_BEAT, () => {
            for (let i = 0; i < 22; i++) {
                const side = i % 2 ? 1 : -1, jitter = rnd(-0.035, 0.035), dur = rnd(135, 230);
                if (kind === 'red-wide') {
                    const y = rnd(0.17, 0.31);
                    omenParticle(owner, dur, [-0.38, y], [0.04, y + 0.03], [0.42, y - 0.05], rnd(1.5, 2.8), 'spark', 0.24);
                } else if (kind === 'amber-single') {
                    omenParticle(owner, dur, [jitter, 0.27], [jitter * 1.5, 0.31], [jitter * 2, 0.39], rnd(1.4, 2.5), 'spark', 0.25);
                } else if (kind === 'amber-wide') {
                    const lane = i % 3 - 1;
                    omenParticle(owner, dur, [lane * 0.16, 0.25], [lane * 0.27, 0.31], [lane * 0.41 + jitter, 0.37], rnd(1.3, 2.6), 'spark', 0.23);
                } else if (kind === 'violet-single') {
                    omenParticle(owner, dur, [side * 0.08, 0.26], [side * 0.2, 0.28], [side * rnd(0.28, 0.42), rnd(0.02, 0.26)], rnd(1.5, 2.8), 'crystal', 0.12);
                } else if (kind === 'violet-wide') {
                    const y = rnd(-0.3, 0.29);
                    omenParticle(owner, dur, [side * 0.27, y * 0.6], [side * 0.37, y], [side * 0.46, y + jitter], rnd(1.6, 2.7), 'crystal', 0.18);
                } else if (kind === 'rose-self') {
                    omenParticle(owner, dur, [side * 0.4, rnd(0.05, 0.28)], [side * 0.38, -0.23], [side * 0.26, -0.38 + jitter], rnd(1.4, 2.4), 'glow', 0.25);
                } else if (kind === 'gloom-foe') {
                    omenParticle(owner, dur, [side * 0.35, rnd(-0.14, 0.22)], [side * 0.45, 0.24], [side * 0.41, 0.33 + jitter], rnd(2.5, 4), i % 3 ? 'mist' : 'crystal', 0.15);
                }
            }
            if (kind === 'amber-single' || kind === 'amber-wide' || kind === 'violet-single') {
                const xs = kind === 'amber-wide' ? [-0.17, 0, 0.17] : [0];
                xs.forEach(x => omenParticle(owner, 120, [x, 0.28], [x, 0.29], [x, 0.3], 3.8, 'glow', 0));
            }
        }, bag);
    }

    // 敌方前摇音效：红色单体保留原版采样，其余七类各配专属前摇音频（audioUrls 预热缓存）
    function omenSound(kind) {
        if (kind === 'red-single') {
            if (playSound) playSound('monsterAttack', 1, 1, { track:'skill', category:'L' }); // 原·单体近战预警音效
        } else if (kind === 'red-wide') {
            if (playSound) playSound('enemySwingGroup');
        } else if (kind === 'amber-single') {
            if (playSound) playSound('enemyRanged');
        } else if (kind === 'amber-wide') {
            if (playSound) playSound('enemyRangedGroup');
        } else if (kind === 'violet-single') {
            if (playSound) playSound('enemyMagic');
        } else if (kind === 'violet-wide') {
            if (playSound) playSound('enemyMagicGroup');
        } else if (kind === 'rose-self') {
            if (playSound) playSound('enemyBuff');
        } else if (kind === 'gloom-foe') {
            if (playSound) playSound('enemyDebuff');
        }
    }

    // 红色单体基线沿用现有 .enemy-omen 路径；其余七类才登记贴身粒子及自己的收尾。
    function playEnemyWindup(caster, kind) {
        const dom = domOf(caster);
        if (!dom) return null;
        if (kind !== 'red-single') audio();
        const cls = kind === 'red-single' ? 'enemy-omen' : 'omen-' + kind;
        const bag = new Set();
        const hadBreathe = dom.classList.contains('breathe');
        let owner = null;
        if (kind !== 'red-single') {
            const r = ctr(dom);
            owner = { kind, dom, barTop: document.getElementById(caster.id + '-hp-bar')[__GBCR]().top,
                      frame: Object.assign(r, { clipBottom: r.bottom, now: performance.now() }) };
        }

        dom.classList.remove('breathe');
        void dom.offsetWidth;
        dom.classList.add(cls);
        omenAura(kind, owner, bag);
        CombatAudioMixer.withContext('L', () => omenSound(kind));

        const restore = () => {
            dom.classList.remove(cls);
            if (hadBreathe && caster.isAlive && !dom.classList.contains('breathe')) dom.classList.add('breathe');
        };
        const dropParticles = () => {
            S.particles = S.particles.filter(p => p.owner !== owner);
            if (S.particles.length || S.flights.length) return;
            if (S.particleTimer !== null) { clearTimeout(S.particleTimer); S.timers.delete(S.particleTimer); S.particleTimer = null; }
            S.particleUntil = 0;
            if (S.driver) {
                const idx = fxEngine.particles.indexOf(S.driver);
                if (idx >= 0) fxEngine.particles.splice(idx, 1);
                S.driver = null;
            }
            if (S.ctx) S.ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
        };
        const finish = () => {
            bag.forEach(id => { clearTimeout(id); S.timers.delete(id); }); bag.clear();
            restore(); dropParticles(); S.handles.delete(handle); releaseIdleCanvas();
        };
        const handle = { doneAt: Date.now() + OMEN_MS, impactDom: dom, cancel: finish };
        S.handles.add(handle);
        localAfter(OMEN_MS, finish, bag);
        return handle;
    }

    DRAW.group = function(g, p) {
        const [core, color, edge] = GROUP_COLORS[p.kind], r = p.size;
        const alpha = g.globalAlpha;
        for (let i = 4; i > 0; i--) {
            const x = -i * (p.tail || 0) / 4, rr = r * (0.65 - i * .1);
            const gr = g.createRadialGradient(x, 0, 0, x, 0, rr * 2);
            gr.addColorStop(0, color + '90'); gr.addColorStop(1, edge + '00');
            g.globalAlpha = alpha * (.28 - i * .045);
            g.fillStyle = gr; g.beginPath(); g.arc(x, 0, rr * 2, 0, 6.283); g.fill();
        }
        g.globalAlpha = alpha;
        if (p.texture === 'crystal') {
            const gr = g.createLinearGradient(-r, -r, r, r);
            gr.addColorStop(0, core); gr.addColorStop(.35, color); gr.addColorStop(1, edge + '20');
            g.fillStyle = gr; g.beginPath(); g.moveTo(r * 1.8, 0); g.lineTo(-r * .5, r * .9); g.lineTo(-r, -r * .65); g.closePath(); g.fill();
            g.fillStyle = core + 'b0'; g.beginPath(); g.moveTo(r * 1.8, 0); g.lineTo(-r * .4, 0); g.lineTo(-r, -r * .65); g.closePath(); g.fill();
        } else {
            const gr = g.createRadialGradient(r * .22, 0, 0, 0, 0, r);
            gr.addColorStop(0, core); gr.addColorStop(.22, core + 'e0'); gr.addColorStop(.55, color + 'c0'); gr.addColorStop(1, edge + '00');
            g.fillStyle = gr; g.scale(2, .55); g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
        }
    };
    // ===== 攻击身份与同拍命中反馈（两期统合） BEGIN =====
    const IDENTITY_TIMINGS = {
        gunshot: { chargeMs: 0, impactMs: 90, totalMs: 460 },
        shotgun: { chargeMs: 0, impactMs: 115, totalMs: 620 },
        light: { chargeMs: 160, flightMs: 280, impactMs: 440, totalMs: 820 },
        thunder: { chargeMs: 140, connectMs: 210, conductEndMs: 410, totalMs: 680 },
        explosion: { chargeMs: 150, flightMs: 380, impactMs: 530, totalMs: 980 },
        aoeExplosion: { chargeMs: 350, flightMs: 160, impactMs: 510, totalMs: 1320 },
        aoeThunder: { chargeMs: 350, trunkMs: 80, impactMs: 430, conductEndMs: 780, totalMs: 1280 },
        slash:     { chargeMs: 0,   impactMs: 160, totalMs: 640 },
        punch:     { chargeMs: 0,   impactMs: 150, totalMs: 600 },
        claw:      { chargeMs: 0,   impactMs: 150, totalMs: 760 },
        bite:      { chargeMs: 0,   impactMs: 180, totalMs: 780 },
        venom:     { chargeMs: 140, flightMs: 320, impactMs: 460, totalMs: 900 },
        arrow:     { chargeMs: 90,  flightMs: 180, impactMs: 270, totalMs: 700 },
        frost:     { chargeMs: 160, flightMs: 280, impactMs: 440, totalMs: 900 },
        aoeFire:   { chargeMs: 350, sweepMs: 380,  impactMs: 430, totalMs: 1380 },
        aoeGun:    { chargeMs: 160, sweepMs: 520,  impactMs: 210, totalMs: 1280 },
        aoePoison: { chargeMs: 350, swellMs: 460,  impactMs: 430, totalMs: 1450 },
        aoeFrost:  { chargeMs: 350, rainMs: 460,   impactMs: 440, totalMs: 1420 },
        aoeWind:   { chargeMs: 350, sweepMs: 480,  impactMs: 430, totalMs: 1380 },
        aoeLight:  { chargeMs: 350, flightMs: 240, impactMs: 590, totalMs: 1300 }
    };
    let identitySfxOn = true, identityOutput = null;
    const identityBuffers = CombatAudioMixer.buffers, identityDecodes = CombatAudioMixer.decodes, identityAudioStoppers = new Set();
    const IDENTITY_CLIP_KEYS = new Set(['slash_whoosh_hit_fs434873','atk2','claw_bloody_blade_fs323526','wolfman','creature_slime_01','swish_3','frost_crystal_impact_fs550267','fire01','freeze01','aoe_gun_burst_fs482122','aoe_poison_spell_fs219566','aoe_wind_spin_fs772867','light_impact','mx_sand_swish','mx_stygian_whoosh','mx_sword_metal','mx_gear_lock','mx_tunnel','mx_rift_charge','mx_deep_impact','mx_giant_roar','mx_dino_roar','mx_golem_stomp','defUp','shieldUp','taunt','revive_gather','revive_bloom','molt_crack','molt_snap','molt_empower','rage_exit','link_dash','link_chime','leech_flow','regen_hum','thorn_parry','resist_fluid','resist_phantom','resist_antimagic','resist_vital','resist_fireproof','resist_poisonproof','resist_ironbody','thunder_charge','ranshao','fog','mx_rift_tear','mx_vacuum','mx_armor_strike','sd_ring_blast','sd_shatter_blast','huoyan01','explosion_aoe_charge','defDown','dodge_2','parry_perfect','avoid_dash_perfect','sheshen_armor_step','hide']);
    function idSfx(owner, fn, profile = 'special') {
        if (!identitySfxOn || (owner && (owner.cancelled || owner.finished)) || !(window.AudioContext || window.webkitAudioContext)) return;
        const prev = identityOutput;
        if (owner) {
            if (!owner.soundGate) {
                const ctx = audio(), gate = ctx.createGain();
                gate.connect(synthBus(CombatAudioMixer.capture('D').category).bus); owner.soundGate = gate;
                owner.onClean(() => { gate.gain.value = 0; gate.disconnect(); });
            }
            identityOutput = owner.soundGate;
        }
        const category = owner?.audioContext?.category || CombatAudioMixer.capture('D').category;
        CombatAudioMixer.protect(profile, audio().currentTime, owner, category);
        try { CombatAudioMixer.withContext(owner?.audioContext || { category }, fn); } finally { identityOutput = prev; }
    }
    function warmIdentitySample(key) {
        const url = audioUrls[key];
        if ((!IDENTITY_CLIP_KEYS.has(key) && !Object.values(ITEM_SKILL_FX).some(fx => fx.audioKeys.includes(key))) || !url) return;
        return CombatAudioMixer.prepare(url);
    }
    function idSample(owner, key, optsOrVol = 0.9, rate = 1) {
        if (!identitySfxOn || (owner && (owner.cancelled || owner.finished))) return true;
        const opts = typeof optsOrVol === 'object' ? Object.assign({ vol:0.9, rate:1, offsetSec:0 }, optsOrVol) : { vol:optsOrVol, rate };
        if (opts.sampled) return playSampleClip(owner, key, opts);
        if (opts.maxDurSec || opts.offsetSec) {
            warmIdentitySample(key);
            if (!identityBuffers.get(audioUrls[key])) return false;
        }
        const cue = playSound(key, opts.vol, opts.rate, Object.assign({ owner, audioContext:owner?.audioContext || CombatAudioMixer.capture('D'), fadeOutSec:opts.maxDurSec ? 0.2 : 0,
            sourcePaddingSec:opts.maxDurSec ? 0.04 : 0, stopPaddingSec:opts.maxDurSec ? 0.03 : undefined }, opts));
        if (typeof cue === 'function') {
            identityAudioStoppers.add(cue);
            if (cue.done) cue.done.then(() => identityAudioStoppers.delete(cue));
        }
        return !!audioUrls[key];
    }
    // 新演出复用 Blob 解码与既有音频总线；冷解码只播本次真实采样，不补播第二遍。
    const variantAudioStoppers = new Set();
    function playSampleClip(owner, key, opts) {
        if (!identitySfxOn || (owner && (owner.cancelled || owner.finished))) return true;
        if (!audioUrls[key]) return false;
        warmIdentitySample(key);
        const cue = playCustomAudio(audioUrls[key], opts.vol, opts.rate, Object.assign({ owner, audioContext:owner?.audioContext || CombatAudioMixer.capture('D'), profile:'special', fadeOutSec:0.2 }, opts));
        if (typeof cue === 'function') {
            identityAudioStoppers.add(cue);
            if (opts.variant) variantAudioStoppers.add(cue);
            if (cue.done) cue.done.then(() => { identityAudioStoppers.delete(cue); variantAudioStoppers.delete(cue); });
        }
        return true;
    }

    function identityTargetKey(target) {
        if (target && target.nodeType === 1) {
            return target.dataset.arcaneTargetId || target.id.replace(/^hero-(?:card|wrap)-/, '').replace(/-sprite$/, '') || target;
        }
        return target && target.id ? target.id : target;
    }
    function entityVisualRect(entityOrDom) {
        const dom = entityOrDom && entityOrDom.nodeType === 1 ? entityOrDom : entityOrDom && entityOrDom.identityDom
            ? entityOrDom.identityDom : entityOrDom && entityOrDom.isBarrierTarget
            ? document.getElementById('team-barrier-dome') || document.getElementById('team-barrier-wrapper') : domOf(entityOrDom);
        if (!dom) return null;
        const portrait = dom.querySelector('.portrait');
        const normal = dom.classList.contains('hero-card-inner');
        const image = dom.querySelector('img');
        const visualDom = portrait || image || (normal ? dom.querySelector('.bg-gray-900') : null) || dom;
        const r = ctr(visualDom), prev = portrait ? portrait.previousElementSibling : normal && image && image.previousElementSibling;
        const top = prev ? Math.max(r.top, prev[__GBCR]().bottom) : r.top;
        return { dom, visualDom, isHero: !!portrait || normal || isHeroSideEntity(heroesData.concat(enemiesData).find(e => e.id === identityTargetKey(dom)) || { id: identityTargetKey(dom) }), x: r.x, y: (top + r.bottom) / 2, w: r.w, h: Math.max(2, r.bottom - top), top, bottom: r.bottom, left: r.left, right: r.right };
    }
    function computeLineGeom(fromRect, toRect, dodged, missScale = 0.72, phase = 2) {
        const dx = toRect.x - fromRect.x, dy = toRect.y - fromRect.y, dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist, nx = -uy, ny = ux, angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
        const muzzleOff = Math.min(fromRect.w, fromRect.h) * 0.34;
        const muzzle = { x: fromRect.x + ux * muzzleOff, y: fromRect.y + uy * muzzleOff };
        const side = toRect.x > __STAGE.w * 0.55 ? -1 : 1;
        const missSpan = Math.max(toRect.w, toRect.h) * missScale + (phase === 1 ? 26 : 28);
        const missPt = { x: toRect.x + nx * side * missSpan, y: toRect.y + ny * side * missSpan * (phase === 1 ? 0.55 : 0.45) + (phase === 1 ? 10 : 14) };
        return { dx, dy, dist, ux, uy, nx, ny, angleDeg, muzzle, missPt, endPt: dodged ? missPt : { x: toRect.x, y: toRect.y }, side };
    }
    function computeParabolaLift(a, b, base = 70) {
        return Math.round((b.y > a.y + 40 ? base * 0.58 : base * 1.12) + Math.min(45, Math.abs(b.x - a.x) * 0.1));
    }
    function normalizeOutcomes(outcomes) {
        if (typeof outcomes === 'function') return t => outcomes(t) === 'dodge' ? 'dodge' : 'hit';
        if (outcomes && Object.prototype.toString.call(outcomes) === '[object Map]') return t => (outcomes.has(t) ? outcomes.get(t) : outcomes.get(identityTargetKey(t))) === 'dodge' ? 'dodge' : 'hit';
        if (outcomes && typeof outcomes === 'object') return t => (outcomes[identityTargetKey(t)] || (t && outcomes[t.id])) === 'dodge' ? 'dodge' : 'hit';
        return () => 'hit';
    }
    function identityRun(totalMs, phase = 2) {
        const token = combatToken;
        ensureCanvas(); ensureDriver();
        const owner = { cancelled: false, finished: false, token, audioContext:CombatAudioMixer.capture('D'), timers: new Set(), intervals: new Set(), animations: new Set(),
            layers: new Set(), anchors: new Set(), flights: new Set(), audioStoppers: new Set(), onCleanups: new Set() };
        let finishTimer;
        const handle = { doneAt: Date.now() + totalMs, cancel() { owner.cancelled = true; cleanup(true); }, onFinish: new Set() };
        function finishLater() {
            clearTimeout(finishTimer); S.timers.delete(finishTimer);
            if (owner.held || owner.finished || owner.cancelled) { finishTimer = null; return; }
            finishTimer = setTimeout(() => {
                S.timers.delete(finishTimer); finishTimer = null;
                if (token !== combatToken || _pipelineFrozen) { handle.cancel(); return; }
                if (owner.fixedLife || (!owner.timers.size && !owner.flights.size)) cleanup(false);
            }, Math.max(0, handle.doneAt - Date.now()));
            S.timers.add(finishTimer);
        }
        owner.retain = ms => {
            handle.doneAt = Math.max(handle.doneAt, Date.now() + ms);
            if (!owner.finished) finishLater();
        };
        owner.hold = () => { owner.held = true; finishLater(); };
        owner.resume = ms => {
            if (owner.finished || owner.cancelled) return;
            owner.held = false; handle.doneAt = Date.now() + ms; finishLater();
        };
        owner.at = (delay, fn) => {
            const id = after(delay, () => {
                owner.timers.delete(id);
                if (owner.cancelled || owner.finished || token !== combatToken || _pipelineFrozen) { handle.cancel(); return; }
                CombatAudioMixer.withContext(owner.audioContext, fn);
                if (!owner.finished) finishLater();
            });
            owner.timers.add(id); owner.retain(delay);
            return id;
        };
        owner.every = (ms, fn) => {
            const id = every(ms, () => {
                if (owner.cancelled || owner.finished || token !== combatToken || _pipelineFrozen) { stopEvery(id); owner.intervals.delete(id); return; }
                CombatAudioMixer.withContext(owner.audioContext, fn);
            });
            owner.intervals.add(id); return id;
        };
        owner.anim = (el, frames, opts) => {
            const anim = el.animate(frames, opts); owner.animations.add(anim);
            const timing = typeof opts === 'number' ? { duration: opts } : opts;
            owner.retain((timing.delay || 0) + (timing.duration || 0) * (timing.iterations || 1));
            return anim;
        };
        owner.layer = markup => {
            const layer = fsLayer(markup); owner.layers.add(layer);
            if (phase === 2) layer.querySelectorAll('[style*="arcane-identity-bloom"],[style*="arcane-identity-gun-flash"]').forEach(el => {
                const style = getComputedStyle(el), name = style.animationName;
                const frames = name === 'arcane-identity-bloom'
                    ? [{ transform: 'translate(-50%,-50%) scale(0.18) rotate(-14deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.14) rotate(8deg)', opacity: 1, offset: 0.22 }, { transform: 'translate(-50%,-50%) scale(1.42) rotate(32deg)', opacity: 0 }]
                    : [{ transform: 'translate(-50%,-50%) scale(0.18) rotate(0deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15) rotate(12deg)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-50%) scale(1.3) rotate(28deg)', opacity: 0 }];
                const duration = parseFloat(style.animationDuration) * 1000, delay = parseFloat(style.animationDelay) * 1000, easing = style.animationTimingFunction;
                el.style.animationName = 'none';
                owner.anim(el, frames, { duration, delay, easing, fill: 'both' });
            });
            return layer;
        };
        owner.addP = opts => addP(Object.assign({ owner }, opts));
        owner.burst = (n, fn) => { for (let i = 0; i < n; i++) owner.addP(fn(i)); };
        owner.fly = (a, b, lift, dur, draw, done, ease) => {
            let f;
            f = fly(a, b, lift, dur, draw, () => {
                owner.flights.delete(f);
                if (owner.cancelled || owner.finished || token !== combatToken || _pipelineFrozen) { handle.cancel(); return; }
                if (done) CombatAudioMixer.withContext(owner.audioContext, done);
                if (!owner.finished) finishLater();
            }, ease);
            owner.flights.add(f); owner.retain(dur);
            return f;
        };
        owner.onClean = fn => owner.onCleanups.add(fn);
        owner.audioAt = (delay, fn) => {
            const cue = owner.attackCue;
            if (!cue || !cue.ready) { owner.at(delay, fn); return; }
            cue.ready.then(ok => {
                if (owner.cancelled || owner.finished || token !== combatToken || _pipelineFrozen) return;
                if (!ok || cue.when == null) { owner.at(delay, fn); return; }
                const remaining = Math.max(0, (cue.when - CombatAudioMixer.context().currentTime) * 1000);
                owner.retain(remaining + totalMs);
                const cancel = CombatAudioMixer.atTime(cue.when + delay / 1000, () => {
                    if (owner.cancelled || owner.finished || token !== combatToken || _pipelineFrozen) { handle.cancel(); return; }
                    CombatAudioMixer.withContext(owner.audioContext, fn);
                });
                owner.onClean(cancel);
            });
        };
        function cleanup(stopAudio) {
            if (owner.finished) return;
            owner.finished = true;
            clearTimeout(finishTimer); S.timers.delete(finishTimer);
            owner.timers.forEach(id => { clearTimeout(id); S.timers.delete(id); }); owner.timers.clear();
            owner.intervals.forEach(id => { clearInterval(id); S.intervals.delete(id); }); owner.intervals.clear();
            owner.animations.forEach(a => a.cancel()); owner.animations.clear();
            owner.onCleanups.forEach(fn => fn()); owner.onCleanups.clear();
            owner.layers.forEach(d => { S.layers.delete(d); d.remove(); }); owner.layers.clear();
            owner.anchors.forEach(d => dropAnchor(d)); owner.anchors.clear();
            owner.flights.forEach(f => { clearTimeout(f.timer); S.timers.delete(f.timer); });
            S.flights = S.flights.filter(f => !owner.flights.has(f)); owner.flights.clear();
            S.particles = S.particles.filter(p => p.owner !== owner);
            if (stopAudio) owner.audioStoppers.forEach(stop => stop());
            owner.audioStoppers.clear();
            S.handles.delete(handle);
            handle.onFinish.forEach(fn => fn(!owner.cancelled && token === combatToken && !_pipelineFrozen)); handle.onFinish.clear();
            releaseIdleCanvas();
        }
        S.handles.add(handle); owner.handle = handle; finishLater();
        return owner;
    }
    function makeBoltPoints(a, b, segs = 9, jitter = 18) {
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist, ny = dx / dist;
        const pts = [{ x: a.x, y: a.y }];
        for (let i = 1; i < segs; i++) {
            const t = i / segs;
            const env = Math.sin(t * Math.PI);
            const off = (Math.random() - 0.5) * 2 * jitter * env;
            pts.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
        }
        pts.push({ x: b.x, y: b.y });
        return pts;
    }
    function ptsToD(pts) {
        return pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    }
    function makeBranchPaths(pts, count = 2, spread = 34) {
        const out = [];
        for (let i = 0; i < count; i++) {
            const idx = Math.max(1, Math.min(pts.length - 2, Math.floor(pts.length * (0.3 + i * 0.28))));
            const p0 = pts[idx], next = pts[idx + 1] || pts[idx];
            const ang = Math.atan2(next.y - p0.y, next.x - p0.x) + (i % 2 ? 0.65 : -0.65) + rnd(-0.25, 0.25);
            const len = spread * rnd(0.75, 1.25);
            const p1 = { x: p0.x + Math.cos(ang) * len, y: p0.y + Math.sin(ang) * len };
            out.push(ptsToD(makeBoltPoints(p0, p1, 4, 8)));
        }
        return out;
    }
    // ===== ① 单体(枪击)：极快射线（0ms 枪口闪光 → 90ms 射线抵达 → 460ms 余韵收尾） =====
    function playSingleGunshot(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.gunshot;
        const owner = identityRun(T.totalMs, 1);
        const uid = ++S.uid;
        const g = computeLineGeom(fromRect, toRect, dodged, 0.56, 1);
        const hitCenter = { x: toRect.x, y: toRect.y };
        const endPt = dodged ? { x: g.missPt.x + g.ux * 115, y: g.missPt.y + g.uy * 115 } : hitCenter;
        const rayLen = Math.max(40, Math.hypot(endPt.x - g.muzzle.x, endPt.y - g.muzzle.y));
        const pktLen = Math.min(rayLen * 0.62, 165);

        // 1. 施法者端枪口闪光（严格锚定施法者侧，绝不放到目标脸上）
        idSfx(owner, () => {
            if (typeof playRandomStandardGunshot === 'function') {
                playRandomStandardGunshot(owner);
            } else {
                click(0, 0.75, 4200, 0.015); kick(0, { hi: 240, lo: 70, pd: 0.02, dur: 0.14, vol: 0.7, drive: 4 });
            }
        }, 'short');
        const muzzleLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${g.muzzle.x}px;top:${g.muzzle.y}px;width:92px;height:92px;transform:translate(-50%,-50%) rotate(${g.angleDeg}deg);">
            <svg viewBox="-46 -46 92 92" class="w-full h-full arcane-identity-glow-amber" style="overflow:visible;">
              <defs><radialGradient id="id-muz-${uid}"><stop offset="0%" stop-color="#fff"/><stop offset="40%" stop-color="#fef08a"/><stop offset="100%" stop-color="#f97316" stop-opacity="0"/></radialGradient></defs>
              <g class="id-muz-core" style="transform-origin:0 0;">
                <polygon points="-6,0 4,-14 38,0 4,14" fill="url(#id-muz-${uid})"/>
                <polygon points="0,-20 5,-4 20,0 5,4 0,20 -5,4 -12,0 -5,-4" fill="#fef08a" opacity="0.9"/>
                <circle cx="3" cy="0" r="8" fill="#fff"/>
              </g>
            </svg>
          </div>`);
        owner.anim(muzzleLayer.querySelector('.id-muz-core'), [
            { transform: 'scale(0.25)', opacity: 1 },
            { transform: 'scale(1.18)', opacity: 1, offset: 0.25 },
            { transform: 'scale(0.85)', opacity: 0 }
        ], { duration: 150, easing: 'ease-out', fill: 'forwards' });
        owner.burst(5, () => {
            const ang = (g.angleDeg + rnd(-26, 26)) * Math.PI / 180, spd = rnd(4.5, 9);
            return { x: g.muzzle.x, y: g.muzzle.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, drag: 0.88, decay: 0.09, size: rnd(1.4, 2.2), shape: 'streak', color: '#fde68a' };
        });

        // 2. 高速曳光射线（亮芯+短尾急速推进，不是球也不是长期激光）
        const rayLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${g.muzzle.x}px;top:${g.muzzle.y}px;width:${rayLen}px;height:24px;transform:translate(0,-50%) rotate(${g.angleDeg}deg);transform-origin:0 50%;">
            <svg viewBox="0 0 ${rayLen} 24" class="w-full h-full" style="overflow:visible;">
              <defs>
                <linearGradient id="id-gun-ray-${uid}" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stop-color="#f59e0b" stop-opacity="0"/>
                  <stop offset="55%" stop-color="#fbbf24" stop-opacity="0.72"/>
                  <stop offset="88%" stop-color="#fef08a"/>
                  <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
              </defs>
              <line class="id-gun-wake" x1="0" y1="12" x2="${rayLen}" y2="12" stroke="#fde68a" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/>
              <g class="id-gun-tracer">
                <polygon points="0,10 ${pktLen * 0.72},7.5 ${pktLen},12 ${pktLen * 0.72},16.5 0,14" fill="url(#id-gun-ray-${uid})"/>
                <line x1="${pktLen * 0.35}" y1="12" x2="${pktLen}" y2="12" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/>
              </g>
            </svg>
          </div>`);
        const tracer = rayLayer.querySelector('.id-gun-tracer'), wake = rayLayer.querySelector('.id-gun-wake');
        owner.anim(tracer, [
            { transform: 'translateX(0px) scaleX(0.45)', opacity: 1 },
            { transform: `translateX(${Math.max(0, rayLen - pktLen)}px) scaleX(1.08)`, opacity: 1, offset: 0.74 },
            { transform: `translateX(${rayLen}px) scaleX(0.15)`, opacity: 0 }
        ], { duration: 125, easing: 'cubic-bezier(0.12,0.85,0.28,1)', fill: 'forwards' });
        owner.anim(wake, [{ opacity: 0.48 }, { opacity: 0.25, offset: 0.45 }, { opacity: 0 }], { duration: 220, easing: 'ease-out', fill: 'forwards' });

        // 3. 接触拍点（90ms）：以枪声实际输出起点计时，仅通知一次。
        owner.audioAt(T.impactMs, () => {
            if (onImpact) onImpact(target, { subtype: '枪击', scope: 'single', outcome, point: dodged ? g.missPt : hitCenter, beatMs: T.impactMs });
            if (dodged) {
                owner.burst(4, () => ({ x: g.missPt.x, y: g.missPt.y, vx: g.ux * rnd(3, 6) + rnd(-1, 1), vy: g.uy * rnd(3, 6) + rnd(-1, 1), drag: 0.9, decay: 0.08, size: 1.4, shape: 'streak', color: '#fde68a' }));
                return;
            }
            const impLayer = owner.layer(`
              <div class="arcane-identity-anchor" style="left:${hitCenter.x}px;top:${hitCenter.y}px;width:140px;height:140px;transform:translate(-50%,-50%);">
                <svg viewBox="0 0 100 100" class="absolute inset-0 w-full h-full arcane-identity-glow-amber" style="animation:arcane-identity-shock-ring 0.28s cubic-bezier(0.1,0.8,0.2,1) both;">
                  <circle cx="50" cy="50" r="22" stroke="#fef08a" stroke-width="3" fill="none"/>
                  <circle cx="50" cy="50" r="16" stroke="#f97316" stroke-width="2" fill="none" stroke-dasharray="4 3" opacity="0.82"/>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  ${[0, 60, 120, 180, 240, 300].map(deg => `<div class="absolute w-1.5 h-8 bg-gradient-to-t from-transparent via-amber-300 to-white rounded-full" style="--ray-rot:${deg}deg;animation:arcane-identity-spark-ray 0.26s cubic-bezier(0.15,0.85,0.35,1) both;"></div>`).join('')}
                </div>
                <div class="absolute left-1/2 top-1/2 w-full h-full" style="animation:arcane-identity-gun-flash 0.32s cubic-bezier(0.12,0.9,0.25,1) both;">
                  <svg viewBox="0 0 100 100" class="w-full h-full arcane-identity-glow-amber">
                    <defs><radialGradient id="id-gun-imp-${uid}"><stop offset="0%" stop-color="#fff"/><stop offset="35%" stop-color="#fef08a"/><stop offset="70%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626" stop-opacity="0"/></radialGradient></defs>
                    <polygon points="50,15 56,40 85,50 56,60 50,85 44,60 15,50 44,40" fill="url(#id-gun-imp-${uid})"/>
                    <circle cx="50" cy="50" r="14" fill="#fff"/>
                    <circle cx="50" cy="50" r="22" fill="#fde047" opacity="0.58"/>
                  </svg>
                </div>
              </div>`);
            void impLayer;
            owner.burst(14, () => {
                const an = Math.random() * 6.283, s = rnd(2.8, 7.5);
                return { x: hitCenter.x, y: hitCenter.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.91, decay: rnd(0.04, 0.075), size: rnd(1.5, 2.6), shape: 'streak', color: pick(['#ffffff', '#fde68a', '#fb923c']) };
            });
            owner.burst(3, () => ({ x: hitCenter.x + rnd(-8, 8), y: hitCenter.y + rnd(-8, 8), vx: rnd(-0.3, 0.3), vy: rnd(-0.9, -0.4), drag: 0.97, decay: 0.022, size: rnd(8, 13), shape: 'smoke', blend: 'source-over', color: 'rgba(71,85,105,0.42)' }));
        });
        return owner.handle;
    }

    // ===== ② 单体(霰弹)：高速扇面多射线（0ms 扇面爆焰 → 115ms 扇面弹道抵达 → 620ms 硝烟收尾） =====
    function playSingleShotgun(caster, target, outcome = 'hit', onImpact, suppressImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.shotgun;
        const owner = identityRun(T.totalMs, 1);
        const uid = ++S.uid;
        const g = computeLineGeom(fromRect, toRect, dodged, 0.72, 1);
        const k = Math.min(1.15, Math.max(0.75, toRect.h / 100));

        // 1. 施法端大口径喇叭形扇面枪口爆焰 + 激波弧 + 硝烟（朝向由双方实时位置计算）
        idSfx(owner, () => {
            if (typeof playShotgunSound === 'function') {
                playShotgunSound(owner);
            } else {
                kick(0, { hi: 220, lo: 55, pd: 0.03, dur: 0.25, vol: 0.85, drive: 5 });
                crunch(0, { f: 1800, f1: 650, dur: 0.18, vol: 0.52, drive: 4 });
            }
        }, 'short');
        const muzzleRot = g.angleDeg + 90; // 原喇叭弧朝上(-90deg)，旋转至指向目标方向
        const muzzleLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${g.muzzle.x}px;top:${g.muzzle.y}px;width:220px;height:220px;transform:translate(-50%,-50%) rotate(${muzzleRot}deg);">
            <svg viewBox="0 0 200 200" class="absolute inset-0 w-full h-full arcane-identity-glow-amber" style="animation:arcane-identity-shock-ring 0.34s cubic-bezier(0.08,0.85,0.25,1) both;">
              <path d="M 32,100 A 68,68 0 0,1 168,100" stroke="#fef08a" stroke-width="4.5" stroke-linecap="round" fill="none"/>
              <path d="M 48,100 A 52,52 0 0,1 152,100" stroke="#f97316" stroke-width="2.5" stroke-dasharray="8 4" fill="none" opacity="0.85"/>
            </svg>
            <div class="absolute inset-0 id-sg-flare">
              <svg viewBox="0 0 200 200" class="w-full h-full arcane-identity-glow-amber">
                <defs><radialGradient id="id-sg-fl-${uid}"><stop offset="0%" stop-color="#fff"/><stop offset="28%" stop-color="#fef08a"/><stop offset="60%" stop-color="#f97316"/><stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/></radialGradient></defs>
                <polygon points="100,14 114,66 154,48 124,90 164,102 122,114 100,142 78,114 36,102 76,90 46,48 86,66" fill="url(#id-sg-fl-${uid})"/>
                <circle cx="100" cy="100" r="22" fill="#fff"/>
              </svg>
            </div>
            <div class="absolute inset-0" style="--smk-x:0px;--smk-y:-44px;animation:arcane-identity-smoke 0.48s 0.02s ease-out both;">
              <svg viewBox="0 0 200 200" class="w-full h-full" style="opacity:0.55;filter:blur(6px);">
                <circle cx="84" cy="72" r="22" fill="#475569"/><circle cx="118" cy="76" r="19" fill="#334155"/><circle cx="100" cy="56" r="20" fill="#1e293b"/>
              </svg>
            </div>
          </div>`);
        owner.anim(muzzleLayer.querySelector('.id-sg-flare'), [
            { transform: 'scale(0.15)', opacity: 0 },
            { transform: 'scale(1.18)', opacity: 1, offset: 0.18 },
            { transform: 'scale(0.95)', opacity: 0.72, offset: 0.55 },
            { transform: 'scale(1.22)', opacity: 0 }
        ], { duration: 280, easing: 'ease-out', fill: 'forwards' });

        // 2. 8 条扇面高速散射弹道（代表同一次攻击，不增加伤害段数）
        const impactOffsets = [
            { x: -24 * k, y: -18 * k, r: 7.5, delay: 0.02 },
            { x: 14 * k, y: -24 * k, r: 8.5, delay: 0.04 },
            { x: 24 * k, y: 10 * k, r: 7, delay: 0.03 },
            { x: -10 * k, y: 20 * k, r: 8, delay: 0.05 },
            { x: 2 * k, y: -3 * k, r: 10, delay: 0.01 },
            { x: -28 * k, y: 8 * k, r: 6.8, delay: 0.06 }
        ];
        const baseCenter = dodged ? g.missPt : { x: toRect.x, y: toRect.y };
        const raySpecs = impactOffsets.map(o => ({ x: baseCenter.x + o.x, y: baseCenter.y + o.y }));
        // 追加 2 条外翼散射曳光增强扇面感
        raySpecs.push(
            { x: baseCenter.x + g.nx * 46 * k + g.ux * 36, y: baseCenter.y + g.ny * 46 * k + g.uy * 36 },
            { x: baseCenter.x - g.nx * 46 * k + g.ux * 36, y: baseCenter.y - g.ny * 46 * k + g.uy * 36 }
        );
        const tracersHtml = raySpecs.map((pt, i) => {
            const targetPt = dodged ? { x: pt.x + g.ux * 95, y: pt.y + g.uy * 95 } : pt;
            const rdx = targetPt.x - g.muzzle.x, rdy = targetPt.y - g.muzzle.y;
            const len = Math.max(40, Math.hypot(rdx, rdy)), ang = Math.atan2(rdy, rdx) * 180 / Math.PI;
            const pLen = Math.min(len * 0.45, 96);
            return `<div class="arcane-identity-anchor id-sg-pellet" data-len="${len}" data-plen="${pLen}" data-idx="${i}" style="left:${g.muzzle.x}px;top:${g.muzzle.y}px;width:${len}px;height:12px;transform:translate(0,-50%) rotate(${ang}deg);transform-origin:0 50%;">
              <svg viewBox="0 0 ${len} 12" class="w-full h-full" style="overflow:visible;">
                <defs><linearGradient id="id-sg-p-${uid}-${i}"><stop offset="0%" stop-color="#f59e0b" stop-opacity="0"/><stop offset="50%" stop-color="#fde047" stop-opacity="0.75"/><stop offset="100%" stop-color="#fff"/></linearGradient></defs>
                <g class="id-sg-pellet-body"><polygon points="0,4.5 ${pLen * 0.72},2.5 ${pLen},6 ${pLen * 0.72},9.5 0,7.5" fill="url(#id-sg-p-${uid}-${i})"/><circle cx="${pLen}" cy="6" r="2.2" fill="#fff"/></g>
              </svg>
            </div>`;
        }).join('');
        const pelletsLayer = owner.layer(tracersHtml);
        pelletsLayer.querySelectorAll('.id-sg-pellet').forEach(el => {
            const len = Number(el.dataset.len), pLen = Number(el.dataset.plen), idx = Number(el.dataset.idx);
            const body = el.querySelector('.id-sg-pellet-body');
            owner.anim(body, [
                { transform: 'translateX(0px) scaleX(0.4)', opacity: 0.9 },
                { transform: `translateX(${Math.max(0, len - pLen)}px) scaleX(1.1)`, opacity: 1, offset: 0.78 },
                { transform: `translateX(${len}px) scaleX(0.2)`, opacity: 0 }
            ], { duration: 115 + (idx % 3) * 10, delay: (idx % 4) * 6, easing: 'cubic-bezier(0.12,0.85,0.28,1)', fill: 'forwards' });
        });

        // 3. 主接触拍点（115ms）：以霰弹实际输出起点计时，仅通知一次。
        owner.audioAt(T.impactMs, () => {
            if (onImpact) onImpact(target, { subtype: '霰弹', scope: 'single', outcome, point: baseCenter, beatMs: T.impactMs });
            if (suppressImpact) return;
            if (dodged) {
                owner.burst(5, () => ({ x: g.missPt.x + rnd(-18, 18), y: g.missPt.y + rnd(-18, 18), vx: g.ux * rnd(3, 6), vy: g.uy * rnd(3, 6), drag: 0.9, decay: 0.08, size: 1.5, shape: 'streak', color: '#fde68a' }));
                return;
            }
            const cratersHtml = impactOffsets.map(pt => `
              <div class="arcane-identity-anchor" style="left:${toRect.x + pt.x}px;top:${toRect.y + pt.y}px;">
                <div class="arcane-identity-anchor" style="width:${pt.r * 5}px;height:${pt.r * 5}px;animation:arcane-identity-puncture 0.36s ${pt.delay}s cubic-bezier(0.12,0.9,0.25,1) both;">
                  <svg viewBox="0 0 60 60" class="w-full h-full arcane-identity-glow-amber">
                    <circle cx="30" cy="30" r="16" stroke="#fde047" stroke-width="2" fill="none" opacity="0.8"/>
                    <polygon points="30,8 33,26 50,30 33,34 30,52 27,34 10,30 27,26" fill="#fff"/>
                    <circle cx="30" cy="30" r="7" fill="#f97316"/><circle cx="30" cy="30" r="3.5" fill="#fff"/>
                  </svg>
                </div>
                ${[-35, 20, 75].map((sDeg, si) => {
                    const sr = sDeg * Math.PI / 180, d = 24 + si * 10;
                    return `<div class="absolute w-1.5 h-1.5 rounded-full" style="--spk-x:${(d * Math.cos(sr)).toFixed(1)}px;--spk-y:${(d * Math.sin(sr)).toFixed(1)}px;background:#fde68a;animation:arcane-identity-shrapnel 0.28s ${pt.delay + 0.02}s ease-out both;"></div>`;
                }).join('')}
              </div>`).join('');
            owner.layer(cratersHtml);
            owner.burst(16, () => {
                const an = Math.random() * 6.283, s = rnd(3, 8.5);
                return { x: toRect.x + rnd(-16, 16), y: toRect.y + rnd(-16, 16), vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.92, decay: rnd(0.035, 0.06), size: rnd(1.6, 2.8), shape: 'streak', color: pick(['#f59e0b', '#fde68a', '#ffffff']) };
            });
            owner.burst(6, () => ({ x: toRect.x + rnd(-22, 22), y: toRect.y + rnd(-18, 18), vx: rnd(-0.4, 0.4), vy: rnd(-1.1, -0.4), drag: 0.98, decay: 0.016, size: rnd(12, 20), shape: 'smoke', blend: 'source-over', color: 'rgba(51,65,85,0.48)' }));
        });
        return owner.handle;
    }
    // ===== ③ 单体(光)：光核投射物（160ms 白金凝聚 → 280ms 形变飞行 → 440ms 光瓣绽放/偏飞衰减 → 820ms） =====
    function playSingleLight(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.light;
        const owner = identityRun(T.totalMs, 1);
        const uid = ++S.uid;
        const g = computeLineGeom(fromRect, toRect, dodged, 0.66, 1);
        const isUp = toRect.y < fromRect.y;
        const a = { x: fromRect.x + (toRect.x >= fromRect.x ? 10 : -10), y: isUp ? fromRect.top - 12 : fromRect.y + 8 };
        const b = dodged ? g.missPt : { x: toRect.x, y: toRect.y };
        const lift = isUp ? 52 : 34;

        // 1. 施法者侧凝聚清亮白金光核与向心细光丝
        idSample(owner, 'light_charge', 0.68) || idSfx(owner, () => {
            crystal(0, 1760, 0.08);
            tone(0.01, { type: 'sine', f0: 880, f1: 1760, dur: 0.15, vol: 0.06, wet: 0.45 });
            whoosh(0, { type: 'highpass', f0: 1500, f1: 4200, dur: 0.16, vol: 0.16 });
        });
        owner.burst(16, () => {
            const ang = Math.random() * 6.283, d = rnd(32, 62);
            return { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d, vx: -Math.cos(ang) * d / 8.5, vy: -Math.sin(ang) * d / 8.5, drag: 0.85, decay: 0.08, size: rnd(1.0, 2.0), color: pick(['#ffffff', '#fef9c3', '#e0f2fe']) };
        });
        const chargeLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${a.x}px;top:${a.y}px;width:84px;height:84px;transform:translate(-50%,-50%);">
            <svg viewBox="-42 -42 84 84" class="w-full h-full arcane-identity-glow-light">
              <defs><radialGradient id="id-lcore-${uid}"><stop offset="0%" stop-color="#fff"/><stop offset="45%" stop-color="#fef9c3" stop-opacity="0.9"/><stop offset="100%" stop-color="#fde047" stop-opacity="0"/></radialGradient></defs>
              <g class="id-lcharge-filaments" stroke="#fffbeb" stroke-width="1.4" stroke-linecap="round" opacity="0.9">
                <line x1="-34" y1="0" x2="-12" y2="0"/><line x1="34" y1="0" x2="12" y2="0"/>
                <line x1="0" y1="-34" x2="0" y2="-12"/><line x1="0" y1="34" x2="0" y2="12"/>
              </g>
              <circle class="id-lcharge-orb" r="24" fill="url(#id-lcore-${uid})"/>
              <circle r="7" fill="#ffffff"/>
            </svg>
          </div>`);
        owner.anim(chargeLayer.querySelector('.id-lcharge-filaments'), [
            { transform: 'scale(1.5) rotate(-45deg)', opacity: 0.15 },
            { transform: 'scale(0.35) rotate(35deg)', opacity: 1 }
        ], { duration: T.chargeMs, easing: 'ease-in', fill: 'forwards' });
        owner.anim(chargeLayer.querySelector('.id-lcharge-orb'), [
            { transform: 'scale(0.2)', opacity: 0.3 },
            { transform: 'scale(1.1)', opacity: 1, offset: 0.7 },
            { transform: 'scale(0.75)', opacity: 0 }
        ], { duration: T.chargeMs + 40, fill: 'forwards' });

        // 2. 飞行阶段（160~440ms）：随切线速度拉伸形变，拖出细光丝与星屑
        owner.at(T.chargeMs, () => {
            if (dodged) idSfx(owner, () => whoosh(0, { type: 'bandpass', f0: 1400, f1: 2800, q: 1.5, dur: 0.34, vol: 0.18, cut: true }));
            const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - lift;
            const orbLayer = owner.layer(`
              <div class="arcane-identity-anchor id-light-orb" style="left:${a.x}px;top:${a.y}px;width:96px;height:44px;transform:translate(-50%,-50%);">
                <svg viewBox="-64 -22 96 44" class="w-full h-full arcane-identity-glow-light" style="overflow:visible;">
                  <defs><linearGradient id="id-ltail-${uid}" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stop-color="#e0f2fe" stop-opacity="0"/><stop offset="65%" stop-color="#fef9c3" stop-opacity="0.72"/><stop offset="100%" stop-color="#ffffff"/></linearGradient></defs>
                  <path d="M-58,0 Q-22,-5 8,0 Q-22,5 -58,0 Z" fill="url(#id-ltail-${uid})"/>
                  <path d="M-42,-8 Q-12,-2 10,0" fill="none" stroke="#e0f2fe" stroke-width="1" opacity="0.75"/>
                  <path d="M-42,8 Q-12,2 10,0" fill="none" stroke="#fef08a" stroke-width="1" opacity="0.75"/>
                  <ellipse cx="10" cy="0" rx="12" ry="7.5" fill="#fffbeb"/>
                  <polygon points="10,-15 13,-2 24,0 13,2 10,15 7,2 -2,0 7,-2" fill="#ffffff"/>
                </svg>
              </div>`);
            const orbEl = orbLayer.querySelector('.id-light-orb');
            owner.fly(a, b, lift, T.flightMs, (x, y, pr) => {
                const t = pr * pr;
                const tx = (1 - t) * (cx - a.x) + t * (b.x - cx);
                const ty = (1 - t) * (cy - a.y) + t * (b.y - cy);
                const deg = Math.atan2(ty, tx) * 180 / Math.PI;
                const stretch = 1 + 0.35 * Math.sin(pr * Math.PI);
                orbEl.style.left = x + 'px';
                orbEl.style.top = y + 'px';
                orbEl.style.transform = `translate(-50%,-50%) rotate(${deg}deg) scale(${stretch}, ${(2 - stretch).toFixed(2)})`;
                owner.addP({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: -tx * 0.008 + rnd(-0.4, 0.4), vy: -ty * 0.008 + rnd(-0.4, 0.4), drag: 0.94, decay: rnd(0.055, 0.095), size: rnd(1.0, 2.0), color: pick(['#ffffff', '#fef9c3', '#e0f2fe']) });
            }, () => {
                if (onImpact) onImpact(target, { subtype: '光', scope: 'single', outcome, point: b, beatMs: T.impactMs });
                if (dodged) {
                    // 闪避：光核偏离目标继续飞出并逐渐缩小衰减，不在目标上绽开光瓣
                    const exitPt = { x: b.x + g.ux * 115, y: b.y + g.uy * 115 };
                    owner.fly(b, exitPt, 6, 180, (x, y, pr) => {
                        orbEl.style.left = x + 'px';
                        orbEl.style.top = y + 'px';
                        orbEl.style.opacity = String(Math.max(0, 1 - pr));
                        orbEl.style.transform = `translate(-50%,-50%) rotate(${g.angleDeg}deg) scale(${(1 - pr * 0.72).toFixed(2)})`;
                        if (Math.random() < 0.6) owner.addP({ x, y, decay: 0.1, size: 1.2, color: '#fef9c3' });
                    }, () => orbLayer.remove(), k => k);
                    return;
                }
                orbLayer.remove();
                idSample(owner, 'light_impact', 0.92) || idSfx(owner, () => {
                    crystal(0, 2637, 0.1);
                    chime(0, 1568, 0.42, 0.075);
                    click(0, 0.32, 5200, 0.008);
                });
                // 3. 命中：光核绽开成尖锐白金光瓣 + 短放射射线 + 星屑淡出
                const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((d, i) => `<line x1="0" y1="${i % 2 ? -14 : -10}" x2="0" y2="${i % 2 ? -42 : -56}" stroke="${i % 2 ? '#fef08a' : '#ffffff'}" stroke-width="${i % 2 ? 1.5 : 2.4}" stroke-linecap="round" transform="rotate(${d})"/>`).join('');
                const petals = [0, 45, 90, 135, 180, 225, 270, 315].map((d, i) => `<path d="M0,0 C-5,-12 -4,-30 0,-${i % 2 ? 44 : 58} C4,-30 5,-12 0,0 Z" fill="${i % 2 ? '#fef08a' : '#ffffff'}" opacity="${i % 2 ? 0.85 : 0.95}" transform="rotate(${d})"/>`).join('');
                const bloomLayer = owner.layer(`
                  <div class="arcane-identity-anchor" style="left:${b.x}px;top:${b.y}px;width:150px;height:150px;animation:arcane-identity-bloom 0.38s cubic-bezier(0.14,0.85,0.28,1) both;">
                    <svg viewBox="-75 -75 150 150" class="w-full h-full arcane-identity-glow-light">
                      <circle r="24" fill="#ffffff" opacity="0.85"/>
                      ${petals}${rays}
                    </svg>
                  </div>`);
                void bloomLayer;
                owner.addP({ x: b.x, y: b.y, shape: 'ring', size: 1.5, decay: 0.055, color: '#fef9c3' });
                owner.burst(28, () => {
                    const an = Math.random() * 6.283, s = rnd(1.5, 5.5);
                    return { x: b.x, y: b.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, grav: -0.015, drag: 0.93, decay: rnd(0.025, 0.05), size: rnd(1.1, 2.2), color: pick(['#ffffff', '#fef9c3', '#fde68a', '#e0f2fe']) };
                });
            }, k => k);
        });
        return owner.handle;
    }

    // ===== ④ 单体(雷)：连接双方的电流（140ms 电荷聚集 → 210ms 接通 → 210~410ms 导电脉冲 → 410~680ms 分段断裂） =====
    function playSingleThunder(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.thunder;
        const owner = identityRun(T.totalMs, 1);
        const g = computeLineGeom(fromRect, toRect, dodged, 0.7, 1);
        const dest = dodged ? g.missPt : { x: toRect.x, y: toRect.y };
        const W = __STAGE.w, H = __STAGE.h;

        // 1. 施法端电荷聚集
        idSample(owner, 'thunder_charge', 0.72, 1.35) || idSfx(owner, () => {
            tone(0, { type: 'sawtooth', f0: 320, f1: 1080, dur: 0.14, vol: 0.06, lp: 2800 });
            click(0.03, 0.25, 4800, 0.008); click(0.09, 0.3, 5600, 0.008);
        });
        owner.burst(14, () => {
            const an = Math.random() * 6.283, d = rnd(26, 52);
            return { x: g.muzzle.x + Math.cos(an) * d, y: g.muzzle.y + Math.sin(an) * d, vx: -Math.cos(an) * d / 7, vy: -Math.sin(an) * d / 7, drag: 0.84, decay: 0.09, size: 1.5, color: pick(['#e0f2fe', '#38bdf8', '#ffffff']) };
        });
        const chgLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${g.muzzle.x}px;top:${g.muzzle.y}px;width:88px;height:88px;transform:translate(-50%,-50%);">
            <svg viewBox="-44 -44 88 88" class="w-full h-full arcane-identity-glow-bolt">
              <circle class="id-th-ring" r="28" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="10 7"/>
              <path class="id-th-sparks" d="M-24,-10 L-8,-3 L-18,14 M22,-14 L9,2 L24,12 M-4,-26 L3,-10 L-6,22" fill="none" stroke="#e0f2fe" stroke-width="2" stroke-linecap="round"/>
              <circle r="8" fill="#ffffff"/>
            </svg>
          </div>`);
        owner.anim(chgLayer.querySelector('.id-th-ring'), [{ transform: 'scale(1.3) rotate(0deg)', opacity: 0.3 }, { transform: 'scale(0.55) rotate(110deg)', opacity: 1 }], { duration: T.chargeMs, fill: 'forwards' });
        owner.at(T.chargeMs + 60, () => chgLayer.remove());

        // 2. 接通 → 导电脉冲 → 分段断裂全屏 SVG 层
        const arcLayer = owner.layer(`
          <svg viewBox="0 0 ${W} ${H}" class="arcane-identity-svg-full arcane-identity-glow-bolt">
            <g class="id-bolt-group">
              <path class="id-bolt-glow" fill="none" stroke="#38bdf8" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;"/>
              <path class="id-bolt-core" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;"/>
              <path class="id-bolt-branches" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>
              <path class="id-bolt-pulse" fill="none" stroke="#ffffff" stroke-width="5.2" stroke-linecap="round" pathLength="1" style="stroke-dasharray:0.16 1;stroke-dashoffset:0.2;opacity:0;"/>
            </g>
            <g class="id-bolt-segs" opacity="0"></g>
          </svg>`);
        const bGlow = arcLayer.querySelector('.id-bolt-glow'), bCore = arcLayer.querySelector('.id-bolt-core');
        const bBranches = arcLayer.querySelector('.id-bolt-branches'), bPulse = arcLayer.querySelector('.id-bolt-pulse');
        const bGroup = arcLayer.querySelector('.id-bolt-group'), bSegs = arcLayer.querySelector('.id-bolt-segs');
        let lastPts = makeBoltPoints(g.muzzle, dest, 10, 22);
        const setArcShape = pts => {
            lastPts = pts;
            const d = ptsToD(pts);
            bGlow.setAttribute('d', d); bCore.setAttribute('d', d); bPulse.setAttribute('d', d);
            bBranches.setAttribute('d', makeBranchPaths(pts, 3, 36).join(' '));
        };
        setArcShape(lastPts);

        owner.at(T.chargeMs, () => {
            owner.anim(bGlow, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: T.connectMs - T.chargeMs, easing: 'ease-out', fill: 'forwards' });
            owner.anim(bCore, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: T.connectMs - T.chargeMs, easing: 'ease-out', fill: 'forwards' });
        });

        // 3. 接通拍点（210ms）：触发唯一一次结算通知 + 命中端电晕火花 + 2道导电脉冲
        owner.at(T.connectMs, () => {
            if (onImpact) onImpact(target, { subtype: '雷', scope: 'single', outcome, point: dest, beatMs: T.connectMs });
            owner.addP({ x: dest.x, y: dest.y, shape: 'ring', size: dodged ? 1.0 : 1.7, decay: 0.075, color: '#7dd3fc' });
            owner.burst(dodged ? 8 : 18, () => {
                const an = Math.random() * 6.283, s = rnd(2.2, dodged ? 5 : 8);
                return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.9, decay: 0.06, size: rnd(1.3, 2.3), shape: 'streak', color: pick(['#ffffff', '#38bdf8', '#bae6fd']) };
            });
            bPulse.style.opacity = '1';
            owner.anim(bPulse, [{ strokeDashoffset: 0.2 }, { strokeDashoffset: -1.0 }], { duration: 95, iterations: 2, easing: 'linear' });
            idSample(owner, 'thunder_single_hit', dodged ? 0.48 : 0.92, dodged ? 0.95 : 1.0) || idSfx(owner, () => {
                crunch(0, { f: 3000, f1: 900, q: 1.4, dur: 0.22, vol: 0.45 });
                click(0.05, 0.55, 5200, 0.012);
            });
            const jitterId = owner.every(48, () => {
                setArcShape(makeBoltPoints(g.muzzle, dest, 10, 20));
                if (!dodged) owner.burst(3, () => ({ x: dest.x + rnd(-10, 10), y: dest.y + rnd(-10, 10), vx: rnd(-3, 3), vy: rnd(-3, 3), drag: 0.9, decay: 0.1, size: 1.4, shape: 'streak', color: '#e0f2fe' }));
            });
            // 4. 分段断裂熄灭（410~680ms）
            owner.at(T.conductEndMs - T.connectMs, () => {
                stopEvery(jitterId); owner.intervals.delete(jitterId);
                bGroup.setAttribute('opacity', '0');
                bSegs.setAttribute('opacity', '1');
                const segCount = 4, step = Math.floor((lastPts.length - 1) / segCount);
                const segEls = [];
                for (let s = 0; s < segCount; s++) {
                    const slice = lastPts.slice(s * step, s === segCount - 1 ? lastPts.length : (s + 1) * step + 1);
                    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    p.setAttribute('d', ptsToD(slice));
                    p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#e0f2fe');
                    p.setAttribute('stroke-width', '2.5'); p.setAttribute('stroke-linecap', 'round');
                    bSegs.appendChild(p); segEls.push(p);
                }
                [1, 2, 0, 3].forEach((idx, order) => {
                    owner.at(order * 55, () => {
                        if (segEls[idx]) owner.anim(segEls[idx], [{ opacity: 1 }, { opacity: 0.15, offset: 0.4 }, { opacity: 0 }], { duration: 90, fill: 'forwards' });
                        const pt = lastPts[Math.min(lastPts.length - 1, idx * step + 1)];
                        if (pt) owner.burst(3, () => ({ x: pt.x, y: pt.y, vx: rnd(-1.5, 1.5), vy: rnd(0.5, 2.5), grav: 0.08, decay: 0.08, size: 1.4, color: '#7dd3fc' }));
                    });
                });
            });
        });
        return owner.handle;
    }
    // ===== ⑤ 单体(爆炸)：黑球投掷（150ms 黑球成形 → 380ms 高抛物线旋转 → 530ms 引爆/旁侧落点爆破 → 980ms 余韵） =====
    function playSingleExplosion(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.explosion;
        const owner = identityRun(T.totalMs, 1);
        const uid = ++S.uid;
        const g = computeLineGeom(fromRect, toRect, dodged, 0.72, 1);
        const a = { x: fromRect.x + (toRect.x >= fromRect.x ? 12 : -12), y: toRect.y < fromRect.y ? fromRect.top - 10 : fromRect.y + 8 };
        const dest = dodged ? g.missPt : { x: toRect.x, y: toRect.y };
        const dirSign = dest.x >= a.x ? 1 : -1;

        // 1. 施法端出现立体黑铁爆弹（体积、冷白高光、引信火星）
        idSfx(owner, () => {
            click(0, 0.35, 3800, 0.01);
            whoosh(0.02, { type: 'highpass', f0: 2800, f1: 4200, dur: 0.13, vol: 0.1 });
        });
        const bombLayer = owner.layer(`
          <div class="arcane-identity-anchor id-bomb-wrap" style="left:${a.x}px;top:${a.y}px;width:36px;height:36px;transform:translate(-50%,-50%) scale(0.2);">
            <svg viewBox="-18 -18 36 36" class="w-full h-full" style="overflow:visible;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.65));">
              <defs>
                <radialGradient id="id-bomb-iron-${uid}" cx="35%" cy="30%" r="68%">
                  <stop offset="0%" stop-color="#94a3b8"/><stop offset="30%" stop-color="#334155"/><stop offset="72%" stop-color="#0f172a"/><stop offset="100%" stop-color="#020617"/>
                </radialGradient>
              </defs>
              <rect x="-3.5" y="-15" width="7" height="4" rx="1" fill="#475569" stroke="#94a3b8" stroke-width="0.6"/>
              <path d="M0,-15 Q5,-20 8,-17" fill="none" stroke="#a8a29e" stroke-width="1.6" stroke-linecap="round"/>
              <circle cx="0" cy="0" r="11.5" fill="url(#id-bomb-iron-${uid})" stroke="#475569" stroke-width="0.8"/>
              <path d="M-6,-5 A7,7 0 0,1 1,-7.5" fill="none" stroke="#e2e8f0" stroke-width="1.6" stroke-linecap="round" opacity="0.65"/>
              <circle cx="8" cy="-17" r="2.8" fill="#fb923c"/><circle cx="8" cy="-17" r="1.4" fill="#ffffff"/>
            </svg>
          </div>`);
        const bombEl = bombLayer.querySelector('.id-bomb-wrap');
        owner.anim(bombEl, [
            { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(1.12)', opacity: 1, offset: 0.65 },
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
        ], { duration: T.chargeMs, easing: 'ease-out', fill: 'forwards' });
        const fuseTimer = owner.every(40, () => {
            owner.addP({ x: a.x + 8, y: a.y - 16, vx: rnd(-1.2, 1.4), vy: rnd(-2.2, -0.5), grav: 0.12, decay: 0.08, size: rnd(1.1, 1.8), color: pick(['#fde047', '#fb923c', '#ffffff']) });
        });

        // 2. 重量感高抛物线投掷（150~530ms）：旋转 + 引信火星与少量白烟（不做魔法光球长尾）
        owner.at(T.chargeMs, () => {
            stopEvery(fuseTimer); owner.intervals.delete(fuseTimer);
            idSample(owner, 'bomb_throw', 0.76) || idSfx(owner, () => whoosh(0, { type: 'lowpass', f0: 620, f1: 220, q: 1.0, dur: 0.34, vol: 0.24 }));
            owner.fly(a, dest, 125, T.flightMs, (x, y, pr) => {
                const rot = pr * 540 * dirSign;
                const sc = (1 + 0.16 * Math.sin(pr * Math.PI)).toFixed(2);
                bombEl.style.left = x + 'px';
                bombEl.style.top = y + 'px';
                bombEl.style.transform = `translate(-50%,-50%) rotate(${rot.toFixed(1)}deg) scale(${sc})`;
                const rad = (rot - 64) * Math.PI / 180;
                const fx = x + Math.cos(rad) * 16, fy = y + Math.sin(rad) * 16;
                owner.burst(2, () => ({ x: fx, y: fy, vx: rnd(-1.4, 1.4), vy: rnd(-1.6, 0.8), grav: 0.14, drag: 0.94, decay: rnd(0.055, 0.095), size: rnd(1.0, 1.9), color: pick(['#fef08a', '#fb923c', '#ef4444']) }));
                if (Math.random() < 0.6) owner.addP({ x: fx, y: fy, vx: rnd(-0.3, 0.3), vy: rnd(-0.8, -0.3), drag: 0.97, decay: 0.038, size: rnd(4, 7), shape: 'smoke', blend: 'source-over', color: 'rgba(100,116,139,0.42)' });
            }, () => {
                // 3. 命中/旁侧落点引爆（530ms）：黑球瞬间消失 → 爆芯/碎片/冲击环/火星下坠/烟团上浮
                bombLayer.remove();
                if (onImpact) onImpact(target, { subtype: '爆炸', scope: 'single', outcome, point: dest, beatMs: T.impactMs });
                idSample(owner, 'explosion_single', dodged ? 0.54 : 0.94, dodged ? 0.92 : 1.0) || idSfx(owner, () => {
                    kick(0, { hi: 190, lo: 42, pd: 0.045, dur: 0.3, vol: 0.84, drive: 4 });
                    boom(0.005, { f0: 2800, f1: 140, dur: 0.48, vol: 0.46, wet: 0.25 });
                    crunch(0.01, { f: 1200, f1: 420, q: 1.2, dur: 0.16, vol: 0.4 });
                });
                if (!dodged) shake('light');
                const coreLayer = owner.layer(`
                  <div class="arcane-identity-anchor" style="left:${dest.x}px;top:${dest.y}px;width:168px;height:168px;transform:translate(-50%,-50%);">
                    <svg viewBox="-84 -84 168 168" class="w-full h-full arcane-identity-glow-blast">
                      <defs><radialGradient id="id-exp-core-${uid}"><stop offset="0%" stop-color="#ffffff"/><stop offset="32%" stop-color="#fde047"/><stop offset="66%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626" stop-opacity="0"/></radialGradient></defs>
                      <polygon class="id-exp-lobe" points="0,-68 14,-24 56,-46 26,-10 72,4 24,18 52,58 10,28 -4,70 -16,24 -58,50 -26,10 -70,-8 -24,-18 -48,-58 -12,-26" fill="url(#id-exp-core-${uid})"/>
                      <circle class="id-exp-inner" r="26" fill="#fff7d6"/>
                    </svg>
                  </div>`);
                owner.anim(coreLayer.querySelector('.id-exp-lobe'), [
                    { transform: 'scale(0.18) rotate(-12deg)', opacity: 1 },
                    { transform: 'scale(1.18) rotate(8deg)', opacity: 0.95, offset: 0.35 },
                    { transform: 'scale(1.38) rotate(18deg)', opacity: 0 }
                ], { duration: 300, easing: 'cubic-bezier(0.14,0.86,0.28,1)', fill: 'forwards' });
                owner.anim(coreLayer.querySelector('.id-exp-inner'), [
                    { transform: 'scale(0.2)', opacity: 1 },
                    { transform: 'scale(1.15)', opacity: 0.85, offset: 0.25 },
                    { transform: 'scale(0.4)', opacity: 0 }
                ], { duration: 190, easing: 'ease-out', fill: 'forwards' });
                owner.burst(2, i => ({ x: dest.x, y: dest.y, shape: 'ring', size: 1.6 + i * 0.9, decay: 0.065 - i * 0.015, color: i ? '#f97316' : '#fde68a' }));
                owner.burst(28, () => {
                    const an = Math.random() * 6.283, s = rnd(2.4, 8.2);
                    return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 1.6, grav: 0.18, drag: 0.93, decay: rnd(0.022, 0.042), size: rnd(1.2, 2.5), color: pick(['#fde68a', '#fb923c', '#ffffff']) };
                });
                owner.burst(10, () => {
                    const an = Math.random() * 6.283, s = rnd(3.2, 7.2);
                    return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 2.2, grav: 0.2, drag: 0.95, rot: rnd(0, 6), vr: rnd(-0.28, 0.28), size: rnd(4, 7), shape: 'shard', fill: 'rgba(30,41,59,0.9)', color: '#fb923c', decay: 0.03 };
                });
                owner.burst(12, () => ({ x: dest.x + rnd(-22, 22), y: dest.y + rnd(-16, 16), vx: rnd(-0.5, 0.5), vy: rnd(-1.2, -0.45), drag: 0.985, decay: 0.013, size: rnd(14, 24), shape: 'smoke', blend: 'source-over', color: 'rgba(36,34,34,0.62)' }));
            }, k => k * (0.64 + 0.36 * k));
        });
        return owner.handle;
    }

    // ===== ⑥ 群体(爆炸)：蓄势与跨阵冲击波（350ms 聚能坍缩 → 510ms 几何中心起爆横扫 → 1320ms 烟尘余韵） =====
    function playAoeExplosion(caster, targets, outcomes, onImpact, areaBounds) {
        const fromRect = entityVisualRect(caster);
        const getOutcome = normalizeOutcomes(outcomes);
        const entries = (targets || []).map(t => {
            const rect = entityVisualRect(t);
            return rect ? { entity: t, rect, outcome: getOutcome(t) } : null;
        }).filter(Boolean);
        if (!fromRect || (!entries.length && !areaBounds)) return null;

        const T = IDENTITY_TIMINGS.aoeExplosion;
        const owner = identityRun(T.totalMs, 1);
        const uid = ++S.uid;
        const area = areaBounds || unionRect(entries.map(e => e.rect.dom)) || {
            x: entries[0].rect.x, y: entries[0].rect.y, w: entries[0].rect.w, h: entries[0].rect.h,
            l: entries[0].rect.left, r: entries[0].rect.right, t: entries[0].rect.top, b: entries[0].rect.bottom
        };
        const stageW = areaBounds ? area.w : Math.max(area.w * 1.42, 320), stageH = areaBounds ? area.h : Math.max(area.h * 1.9, 220);

        // 第一幕（0~350ms）：施法者侧爆核聚能压缩，火星向心吸入，爆前急剧坍缩“收”
        idSample(owner, 'explosion_aoe_charge', 0.85, 1.08) || idSfx(owner, () => {
            drone(0, { f0: 72, f1: 175, lp0: 220, lp1: 1850, dur: 0.31, vol: 0.16 });
            whoosh(0, { f0: 340, f1: 2000, q: 1.6, dur: 0.31, vol: 0.36, cut: true });
            click(0.32, 0.55, 4200, 0.01);
        });
        for (let i = 0; i < 34; i++) {
            const ang = Math.random() * 6.283, dist = rnd(70, 150), spd = dist / 10.5;
            owner.addP({ x: fromRect.x + Math.cos(ang) * dist, y: fromRect.y + Math.sin(ang) * dist, vx: -Math.cos(ang) * spd, vy: -Math.sin(ang) * spd, drag: 0.9, decay: 0.065, size: rnd(1.5, 2.8), color: pick(['#fde047', '#fb923c', '#ef4444', '#ffffff']) });
        }
        const chgLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${fromRect.x}px;top:${fromRect.y}px;width:136px;height:136px;transform:translate(-50%,-50%);">
            <svg viewBox="-68 -68 136 136" class="w-full h-full arcane-identity-glow-blast">
              <defs><radialGradient id="id-aexp-c-${uid}"><stop offset="0%" stop-color="#ffffff"/><stop offset="40%" stop-color="#fde047"/><stop offset="78%" stop-color="#f97316"/><stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/></radialGradient></defs>
              <circle class="id-aexp-ring" r="56" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-dasharray="14 8"/>
              <g class="id-aexp-core">
                <polygon points="0,-42 10,-16 36,-28 16,-6 44,4 14,14 30,38 6,16 -4,44 -14,14 -38,30 -16,6 -42,-4 -14,-14 -30,-38 -6,-16" fill="url(#id-aexp-c-${uid})"/>
                <circle r="16" fill="#fff7d6"/>
              </g>
            </svg>
          </div>`);
        owner.anim(chgLayer.querySelector('.id-aexp-ring'), [
            { transform: 'scale(1.45) rotate(0deg)', opacity: 0.15 },
            { transform: 'scale(0.95) rotate(90deg)', opacity: 0.95, offset: 0.5 },
            { transform: 'scale(0.24) rotate(210deg)', opacity: 1 }
        ], { duration: T.chargeMs, fill: 'forwards' });
        owner.anim(chgLayer.querySelector('.id-aexp-core'), [
            { transform: 'scale(0.18) rotate(-25deg)', opacity: 0.2 },
            { transform: 'scale(1.16) rotate(8deg)', opacity: 1, offset: 0.78 },
            { transform: 'scale(0.24) rotate(24deg)', opacity: 1 } // 爆前急剧坍缩
        ], { duration: T.chargeMs, easing: 'cubic-bezier(0.22,0.8,0.25,1)', fill: 'forwards' });

        // 第二幕：350~510ms 压缩爆核投向目标群几何中心 → 510ms 跨阵爆破冲击波
        owner.at(T.chargeMs, () => {
            chgLayer.remove();
            idSfx(owner, () => whoosh(0, { type: 'lowpass', f0: 950, f1: 320, q: 1.0, dur: 0.18, vol: 0.3 }));
            const slugLayer = owner.layer(`
              <div class="arcane-identity-anchor id-aexp-slug" style="left:${fromRect.x}px;top:${fromRect.y}px;width:44px;height:44px;transform:translate(-50%,-50%);">
                <svg viewBox="-22 -22 44 44" class="w-full h-full arcane-identity-glow-blast">
                  <circle r="15" fill="#f97316" opacity="0.85"/><circle r="8" fill="#ffffff"/>
                </svg>
              </div>`);
            const slugEl = slugLayer.querySelector('.id-aexp-slug');
            owner.fly({ x: fromRect.x, y: fromRect.y }, { x: area.x, y: area.y }, 78, T.flightMs, (x, y) => {
                slugEl.style.left = x + 'px'; slugEl.style.top = y + 'px';
                owner.burst(3, () => ({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: rnd(-1.4, 1.4), vy: rnd(-1.4, 1.4), drag: 0.92, decay: 0.07, size: rnd(1.5, 2.8), color: pick(['#fde047', '#fb923c', '#ffffff']) }));
                owner.addP({ x, y, vx: rnd(-0.4, 0.4), vy: rnd(-0.8, -0.2), decay: 0.045, size: rnd(7, 11), shape: 'smoke', blend: 'source-over', color: 'rgba(68,64,60,0.48)' });
            }, () => {
                slugLayer.remove();
                // 510ms 主爆发：单一整体事件，不为每个目标重播整套爆炸与主重音
                shake('heavy');
                idSample(owner, 'explosion_aoe_blast', 0.96) || idSfx(owner, () => {
                    kick(0, { hi: 172, lo: 34, pd: 0.05, dur: 0.38, vol: 0.94, drive: 4.5 });
                    boom(0.005, { f0: 2400, f1: 95, dur: 0.72, vol: 0.55, wet: 0.3 });
                    crunch(0.01, { f: 1100, f1: 350, q: 1.1, dur: 0.22, vol: 0.45 });
                });
                const swOff = Math.min(area.w * 0.28, 120);
                const blastLayer = owner.layer(`
                  <div class="arcane-identity-anchor" style="left:${area.x}px;top:${area.y}px;width:${stageW}px;height:${stageH}px;transform:translate(-50%,-50%);">
                    <svg viewBox="${-stageW / 2} ${-stageH / 2} ${stageW} ${stageH}" class="w-full h-full arcane-identity-glow-blast" style="overflow:visible;">
                      <defs>
                        <radialGradient id="id-aexp-glow-${uid}"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.82"/><stop offset="35%" stop-color="#fb923c" stop-opacity="0.48"/><stop offset="70%" stop-color="#dc2626" stop-opacity="0.22"/><stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/></radialGradient>
                        <linearGradient id="id-aexp-wave-${uid}" x1="0" x2="1"><stop offset="0%" stop-color="#f97316" stop-opacity="0"/><stop offset="25%" stop-color="#fb923c" stop-opacity="0.85"/><stop offset="50%" stop-color="#fff7d6"/><stop offset="75%" stop-color="#fb923c" stop-opacity="0.85"/><stop offset="100%" stop-color="#f97316" stop-opacity="0"/></linearGradient>
                      </defs>
                      <ellipse class="id-aexp-aura" rx="${stageW * 0.46}" ry="${stageH * 0.42}" fill="url(#id-aexp-glow-${uid})"/>
                      <path class="id-aexp-wave" d="M${-stageW * 0.48},0 Q0,${-stageH * 0.16} ${stageW * 0.48},0 Q0,${stageH * 0.16} ${-stageW * 0.48},0 Z" fill="url(#id-aexp-wave-${uid})"/>
                      <g class="id-aexp-plumes">
                        <polygon points="0,-78 18,-26 72,-48 32,-12 86,6 28,22 60,68 12,30 -4,76 -18,28 -68,58 -32,12 -82,-8 -28,-22 -56,-64 -14,-28" fill="#f97316" opacity="0.9"/>
                        <circle cx="${-swOff}" cy="-8" r="42" fill="#fb923c" opacity="0.72"/>
                        <circle cx="${swOff}" cy="10" r="38" fill="#ef4444" opacity="0.72"/>
                        <circle r="34" fill="#fffbeb"/>
                      </g>
                    </svg>
                  </div>`);
                owner.anim(blastLayer.querySelector('.id-aexp-aura'), [{ transform: 'scale(0.35)', opacity: 0.95 }, { transform: 'scale(1.18)', opacity: 0 }], { duration: 480, easing: 'ease-out', fill: 'forwards' });
                owner.anim(blastLayer.querySelector('.id-aexp-wave'), [{ transform: 'scaleX(0.15) scaleY(1.4)', opacity: 1 }, { transform: 'scaleX(1.12) scaleY(0.55)', opacity: 0.88, offset: 0.3 }, { transform: 'scaleX(1.26) scaleY(0.15)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(0.14,0.85,0.28,1)', fill: 'forwards' });
                owner.anim(blastLayer.querySelector('.id-aexp-plumes'), [{ transform: 'scale(0.14)', opacity: 1 }, { transform: 'scale(1.16)', opacity: 0.92, offset: 0.32 }, { transform: 'scale(1.36)', opacity: 0 }], { duration: 390, easing: 'ease-out', fill: 'forwards' });

                [0, 1, 2].forEach(i => owner.addP({ x: area.x, y: area.y, shape: 'ring', size: 2.8 + i * 1.1, decay: 0.045 - i * 0.008, color: i === 0 ? '#fff7d6' : (i === 1 ? '#fb923c' : '#ef4444') }));
                owner.burst(48, () => {
                    const an = Math.random() * 6.283, s = rnd(3.5, 11.5);
                    return { x: area.x + rnd(-area.w * 0.25, area.w * 0.25), y: area.y + rnd(-16, 16), vx: Math.cos(an) * s, vy: Math.sin(an) * s - 2.6, grav: 0.17, drag: 0.93, decay: rnd(0.018, 0.036), size: rnd(1.5, 3.0), color: pick(['#fde68a', '#fb923c', '#ffffff', '#ef4444']) };
                });
                owner.burst(18, () => ({ x: area.x + rnd(-area.w * 0.3, area.w * 0.3), y: area.y + rnd(-12, 12), vx: rnd(-6.5, 6.5), vy: rnd(-9.5, -3.8), grav: 0.22, drag: 0.96, rot: rnd(0, 6), vr: rnd(-0.28, 0.28), size: rnd(5, 9), shape: 'shard', fill: 'rgba(30,41,59,0.92)', color: '#f97316', decay: 0.022 }));

                // 冲击波扫过各目标：逐目标只通知一次；闪避者仅外缘气浪擦过
                entries.forEach(entry => {
                    const d = Math.hypot(entry.rect.x - area.x, entry.rect.y - area.y);
                    const stag = Math.min(48, Math.round(d * 0.14));
                    owner.at(stag, () => {
                        if (onImpact) onImpact(entry.entity, { subtype: '爆炸', scope: 'aoe', outcome: entry.outcome, point: { x: entry.rect.x, y: entry.rect.y }, beatMs: T.impactMs + stag });
                        if (entry.outcome !== 'dodge') {
                            owner.burst(7, () => {
                                const an = Math.random() * 6.283, s = rnd(2, 5.5);
                                return { x: entry.rect.x + rnd(-12, 12), y: entry.rect.y + rnd(-12, 12), vx: Math.cos(an) * s, vy: Math.sin(an) * s - 1, grav: 0.15, drag: 0.93, decay: 0.035, size: rnd(1.4, 2.4), color: pick(['#fde047', '#fb923c']) };
                            });
                        }
                    });
                });

                // 第三幕：烟尘层次展开与火星下坠余韵
                owner.at(60, () => {
                    owner.burst(14, () => ({ x: area.x + rnd(-area.w * 0.44, area.w * 0.44), y: area.y + rnd(-22, 22), vx: rnd(-0.7, 0.7), vy: rnd(-1.1, -0.4), drag: 0.988, decay: 0.011, size: rnd(20, 34), shape: 'smoke', blend: 'source-over', color: 'rgba(38,34,34,0.62)' }));
                });
                owner.at(210, () => {
                    owner.burst(10, () => ({ x: area.x + rnd(-area.w * 0.48, area.w * 0.48), y: area.y + rnd(-26, 18), vx: rnd(-0.4, 0.4), vy: rnd(-0.9, -0.35), drag: 0.99, decay: 0.012, size: rnd(18, 30), shape: 'smoke', blend: 'source-over', color: 'rgba(51,65,85,0.45)' }));
                });
            }, k => k * k);
        });
        return owner.handle;
    }

    // ===== ⑦ 群体(雷)：蓄势与分叉电网（350ms 电荷环聚能 → 430ms 主干甩出与分叉电网接通 → 780~1280ms 逐段断裂残弧） =====
    function playAoeThunder(caster, targets, outcomes, onImpact, areaBounds) {
        const fromRect = entityVisualRect(caster);
        const getOutcome = normalizeOutcomes(outcomes);
        const entries = (targets || []).map(t => {
            const rect = entityVisualRect(t);
            return rect ? { entity: t, rect, outcome: getOutcome(t) } : null;
        }).filter(Boolean);
        if (!fromRect || (!entries.length && !areaBounds)) return null;

        const T = IDENTITY_TIMINGS.aoeThunder;
        const owner = identityRun(T.totalMs, 1);
        const area = areaBounds || unionRect(entries.map(e => e.rect.dom)) || {
            x: entries[0].rect.x, y: entries[0].rect.y, w: entries[0].rect.w, h: entries[0].rect.h
        };
        const dx = area.x - fromRect.x, dy = area.y - fromRect.y, dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;
        const hub = areaBounds || {
            x: area.x - ux * Math.min(46, Math.max(20, dist * 0.16)),
            y: area.y - uy * Math.min(46, Math.max(20, dist * 0.16))
        };
        const nodes = entries.map(e => {
            const dodged = e.outcome === 'dodge';
            const g = computeLineGeom(fromRect, e.rect, dodged, 0.72, 1);
            const dest = dodged ? g.missPt : { x: e.rect.x, y: e.rect.y };
            const dH = Math.hypot(dest.x - hub.x, dest.y - hub.y);
            return { entity: e.entity, rect: e.rect, outcome: e.outcome, dodged, dest, dH, arriveDelay: Math.min(45, Math.round(dH * 0.16)) };
        });
        const hitNodesSorted = nodes.filter(n => !n.dodged).sort((a, b) => a.dest.x - b.dest.x);
        const W = __STAGE.w, H = __STAGE.h;

        // 第一幕（0~350ms）：施法者电荷环、分叉电弧与脉冲汇集
        idSample(owner, 'thunder_charge', 0.82, 1.06) || idSfx(owner, () => {
            tone(0, { type: 'sawtooth', f0: 220, f1: 860, dur: 0.32, vol: 0.08, lp: 2800, lp1: 5800 });
            whoosh(0, { type: 'bandpass', f0: 850, f1: 3800, q: 2.2, dur: 0.31, vol: 0.3, cut: true });
        });
        for (let i = 0; i < 30; i++) {
            const ang = Math.random() * 6.283, d = rnd(58, 128), spd = d / 9.5;
            owner.addP({ x: fromRect.x + Math.cos(ang) * d, y: fromRect.y + Math.sin(ang) * d, vx: -Math.cos(ang) * spd, vy: -Math.sin(ang) * spd, drag: 0.88, decay: 0.075, size: rnd(1.3, 2.2), color: pick(['#e0f2fe', '#38bdf8', '#ffffff']) });
        }
        const chgLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${fromRect.x}px;top:${fromRect.y}px;width:136px;height:136px;transform:translate(-50%,-50%);">
            <svg viewBox="-68 -68 136 136" class="w-full h-full arcane-identity-glow-bolt">
              <circle class="id-ath-r1" r="56" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-dasharray="18 10"/>
              <circle class="id-ath-r2" r="38" fill="none" stroke="#e0f2fe" stroke-width="1.8" stroke-dasharray="9 8"/>
              <path class="id-ath-arcs" d="M-46,-18 L-24,-6 L-34,12 M44,-22 L22,-4 L38,16 M-10,-52 L4,-24 L-12,42 M18,-44 L8,-16 L24,38" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              <circle r="12" fill="#ffffff"/>
            </svg>
          </div>`);
        owner.anim(chgLayer.querySelector('.id-ath-r1'), [{ transform: 'scale(1.35) rotate(0deg)', opacity: 0.2 }, { transform: 'scale(0.35) rotate(180deg)', opacity: 1 }], { duration: T.chargeMs, fill: 'forwards' });
        owner.anim(chgLayer.querySelector('.id-ath-r2'), [{ transform: 'scale(1.1) rotate(0deg)', opacity: 0.4 }, { transform: 'scale(0.28) rotate(-210deg)', opacity: 1 }], { duration: T.chargeMs, fill: 'forwards' });

        // 电网主 SVG 层（主干 + 目标支路 + 横向连接 + 脉冲包 + 断裂段）
        const netLayer = owner.layer(`
          <svg viewBox="0 0 ${W} ${H}" class="arcane-identity-svg-full arcane-identity-glow-bolt">
            <g class="id-net-live">
              <path class="id-net-trunk-glow" fill="none" stroke="#38bdf8" stroke-width="11" stroke-linecap="round" opacity="0.52" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;"/>
              <path class="id-net-trunk-core" fill="none" stroke="#ffffff" stroke-width="3.8" stroke-linecap="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;"/>
              <g class="id-net-branches"></g>
              <g class="id-net-cross"></g>
              <path class="id-net-trunk-pulse" fill="none" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" pathLength="1" style="stroke-dasharray:0.18 1;stroke-dashoffset:0.2;opacity:0;"/>
            </g>
            <g class="id-net-broken"></g>
          </svg>`);
        const tGlow = netLayer.querySelector('.id-net-trunk-glow'), tCore = netLayer.querySelector('.id-net-trunk-core');
        const tPulse = netLayer.querySelector('.id-net-trunk-pulse');
        const brGroup = netLayer.querySelector('.id-net-branches'), crGroup = netLayer.querySelector('.id-net-cross');
        const liveGroup = netLayer.querySelector('.id-net-live'), brokenGroup = netLayer.querySelector('.id-net-broken');

        const trunkStart = { x: fromRect.x, y: fromRect.y };
        let trunkPts = makeBoltPoints(trunkStart, hub, 8, 22);
        let branchData = [];
        let crossData = [];

        function renderGrid(withAnim) {
            trunkPts = makeBoltPoints(trunkStart, hub, 8, 20);
            const td = ptsToD(trunkPts);
            tGlow.setAttribute('d', td); tCore.setAttribute('d', td); tPulse.setAttribute('d', td);
            brGroup.replaceChildren(); crGroup.replaceChildren();
            branchData = nodes.map(n => {
                const pts = makeBoltPoints(hub, n.dest, 6, n.dodged ? 18 : 14);
                const d = ptsToD(pts), forks = makeBranchPaths(pts, 1, 24);
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.innerHTML = `<path d="${d}" fill="none" stroke="#38bdf8" stroke-width="6.5" stroke-linecap="round" opacity="0.5" pathLength="1"/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" pathLength="1"/><path d="${forks[0] || ''}" fill="none" stroke="#7dd3fc" stroke-width="1.3" opacity="0.8"/><path class="id-br-pulse" d="${d}" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" pathLength="1" style="stroke-dasharray:0.2 1;stroke-dashoffset:0.2;opacity:${withAnim ? 0 : 0.95};"/>`;
                brGroup.appendChild(g);
                return { node: n, pts, el: g, pulse: g.querySelector('.id-br-pulse') };
            });
            crossData = [];
            for (let i = 0; i < hitNodesSorted.length - 1; i++) {
                const pts = makeBoltPoints(hitNodesSorted[i].dest, hitNodesSorted[i + 1].dest, 5, 11);
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p.setAttribute('d', ptsToD(pts));
                p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#7dd3fc');
                p.setAttribute('stroke-width', '1.8'); p.setAttribute('opacity', '0.78');
                crGroup.appendChild(p);
                crossData.push({ pts, el: p });
            }
        }
        renderGrid(true);
        brGroup.style.opacity = '0'; crGroup.style.opacity = '0';

        // 第二幕（350ms）：主干甩向目标区枢纽 → 430ms 分叉成连接各目标的电网并交替脉冲
        owner.at(T.chargeMs, () => {
            chgLayer.remove();
            idSample(owner, 'thunder_aoe_hit', 0.94) || idSfx(owner, () => {
                kick(0, { hi: 220, lo: 65, pd: 0.03, dur: 0.22, vol: 0.68, drive: 3 });
                crunch(0.01, { f: 3200, f1: 850, q: 1.3, dur: 0.28, vol: 0.48 });
            });
            owner.anim(tGlow, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: T.trunkMs, easing: 'ease-out', fill: 'forwards' });
            owner.anim(tCore, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: T.trunkMs, easing: 'ease-out', fill: 'forwards' });
        });

        owner.at(T.impactMs, () => {
            brGroup.style.opacity = '1'; crGroup.style.opacity = '1';
            shake('light');
            tPulse.style.opacity = '1';
            owner.anim(tPulse, [{ strokeDashoffset: 0.2 }, { strokeDashoffset: -1.0 }], { duration: 110, iterations: 3, easing: 'linear' });
            branchData.forEach(b => {
                const n = b.node;
                b.el.querySelectorAll('path').forEach((p, pi) => {
                    if (pi < 2) owner.anim(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 50 + n.arriveDelay, easing: 'ease-out', fill: 'forwards' });
                });
                owner.at(n.arriveDelay, () => {
                    if (onImpact) onImpact(n.entity, { subtype: '雷', scope: 'aoe', outcome: n.outcome, point: n.dest, beatMs: T.impactMs + n.arriveDelay });
                    owner.addP({ x: n.dest.x, y: n.dest.y, shape: 'ring', size: n.dodged ? 0.9 : 1.5, decay: 0.075, color: '#7dd3fc' });
                    owner.burst(n.dodged ? 6 : 14, () => {
                        const an = Math.random() * 6.283, s = rnd(2, n.dodged ? 4.5 : 7.5);
                        return { x: n.dest.x, y: n.dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.9, decay: 0.06, size: rnd(1.2, 2.2), shape: 'streak', color: pick(['#ffffff', '#38bdf8', '#bae6fd']) };
                    });
                    if (b.pulse) {
                        b.pulse.style.opacity = '1';
                        owner.anim(b.pulse, [{ strokeDashoffset: 0.2 }, { strokeDashoffset: -1.0 }], { duration: 110, delay: 40, iterations: 2, easing: 'linear' });
                    }
                });
            });
            const jitterId = owner.every(58, () => {
                renderGrid(false);
                branchData.forEach(b => {
                    if (b.pulse) owner.anim(b.pulse, [{ strokeDashoffset: 0.2 }, { strokeDashoffset: -1.0 }], { duration: 100, easing: 'linear' });
                });
            });

            // 第三幕（780~1280ms）：逐段断裂与残余短弧游走熄灭
            owner.at(T.conductEndMs - T.impactMs, () => {
                stopEvery(jitterId); owner.intervals.delete(jitterId);
                liveGroup.setAttribute('opacity', '0');
                const segPool = [];
                const pushSegs = (pts, width, color) => {
                    for (let i = 0; i < pts.length - 1; i += 2) {
                        const slice = pts.slice(i, Math.min(pts.length, i + 3));
                        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        p.setAttribute('d', ptsToD(slice)); p.setAttribute('fill', 'none');
                        p.setAttribute('stroke', color); p.setAttribute('stroke-width', String(width));
                        p.setAttribute('stroke-linecap', 'round');
                        brokenGroup.appendChild(p);
                        segPool.push({ el: p, pt: slice[0] });
                    }
                };
                crossData.forEach(c => pushSegs(c.pts, 1.6, '#7dd3fc'));
                branchData.forEach(b => pushSegs(b.pts, 2.2, '#e0f2fe'));
                pushSegs(trunkPts, 3.2, '#bae6fd');
                segPool.forEach((seg, idx) => {
                    owner.at((idx % 6) * 48 + rnd(0, 25), () => {
                        owner.anim(seg.el, [{ opacity: 1 }, { opacity: 0.2, offset: 0.45 }, { opacity: 0 }], { duration: 110, fill: 'forwards' });
                        owner.burst(2, () => ({ x: seg.pt.x, y: seg.pt.y, vx: rnd(-1.5, 1.5), vy: rnd(0.5, 2.2), grav: 0.08, decay: 0.08, size: 1.3, color: '#7dd3fc' }));
                    });
                });
                // 残余短弧游走
                [0, 1].forEach(k => {
                    owner.at(120 + k * 140, () => {
                        const n = hitNodesSorted[k % Math.max(1, hitNodesSorted.length)] || nodes[0];
                        const dest = n ? n.dest : hub;
                        const p0 = { x: dest.x + rnd(-24, 24), y: dest.y + rnd(-20, 20) };
                        const p1 = { x: p0.x + rnd(-34, 34), y: p0.y + rnd(-22, 22) };
                        const wisp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        wisp.setAttribute('d', ptsToD(makeBoltPoints(p0, p1, 4, 9)));
                        wisp.setAttribute('fill', 'none'); wisp.setAttribute('stroke', '#e0f2fe'); wisp.setAttribute('stroke-width', '1.6');
                        brokenGroup.appendChild(wisp);
                        owner.anim(wisp, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
                    });
                });
            });
        });
        return owner.handle;
    }
    // 接入点 2：在这里写 playXxx(caster, targets, isReaction)，使用 domOf / ctr / unionRect 定位。
    // 延时用 after / every；SVG 用 fsLayer(html, 生命周期毫秒)；粒子用 addP / burst / fly；不要另起永久 rAF。
    // 无固定寿命的图层由 handle.cancel() 和自然收尾显式移除；darken(o) 收尾必须调用 darken(0)。
    // 保持纯演出：不改 HP/状态，不负责浮字或战斗结算；测试反馈放在下方演示控制区。
    // 持续演出返回 handle：doneAt: Date.now() + 总演出毫秒（含尾韵），不能用 performance.now()。
    // cancel() 只清理自身图层、计时和 WAAPI 动画，不在技能内部调用全局 clearArcaneFx()。
    // 按需提供 dodge(success) / hit(type) / dispel(dom) / impactDom，与正式版反应接口一致。
    // impactDom 可指向实体或 mkAnchor() 自建落点；dropAnchor() 只用于后者，不能删除真实角色 DOM。
    // handle 加入 S.handles；结束时删除并调用 releaseIdleCanvas()；WAAPI 动画由 cancel() 取消。
    // 普通/反应演练及完整可运行接入示例见根目录《技能SVG模板使用与快速移植.md》。
    // ===== 新技能实现 END =====

    // 施法者半透明近战残影动势（复制视觉本体在独立浮层位移，绝不打断原卡 .breathe 待机动画）
    function spawnGhostLunge(owner, fromRect, toPt, opts = {}) {
        const dx = toPt.x - fromRect.x, dy = toPt.y - fromRect.y, dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;
        const reach = Math.min(dist * (opts.frac || 0.42), opts.maxReach || 96);
        const visualDom = fromRect.visualDom || fromRect.dom;
        const clone = visualDom.cloneNode(true);
        clone.removeAttribute('id');
        clone.querySelectorAll && clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        clone.classList.remove('breathe');
        clone.querySelectorAll && clone.querySelectorAll('.breathe').forEach(el => el.classList.remove('breathe'));
        clone.className = 'arcane-identity-ghost ' + (clone.className || '');
        const r = visualDom[__GBCR]();
        const wrap = owner.layer('');
        clone.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;opacity:0;filter:brightness(1.15);`;
        wrap.appendChild(clone);
        const dur = opts.dur || 260, peak = opts.peak || 0.72, sc = opts.scale || 1.06;
        owner.anim(clone, [
            { transform: 'translate3d(0,0,0) scale(1)', opacity: 0 },
            { transform: `translate3d(${(ux * reach * 0.92).toFixed(1)}px,${(uy * reach * 0.92).toFixed(1)}px,0) scale(${sc})`, opacity: peak, offset: 0.42 },
            { transform: `translate3d(${(ux * reach * 1.1).toFixed(1)}px,${(uy * reach * 1.1).toFixed(1)}px,0) scale(${(sc * 0.96).toFixed(2)})`, opacity: peak * 0.55, offset: 0.65 },
            { transform: `translate3d(${(ux * reach * 0.4).toFixed(1)}px,${(uy * reach * 0.4).toFixed(1)}px,0) scale(0.98)`, opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(0.18,0.88,0.32,1)', fill: 'forwards' });
    }
    // ===== 1. 单体(刀砍)：施法挥击残影 + 明暗宽窄渐变弧形刀锋 + 定向切痕火花 =====
    function playSingleSlash(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.slash, owner = identityRun(T.totalMs, 2), uid = ++S.uid;
        const g = computeLineGeom(fromRect, toRect, dodged, 0.72);
        const dest = dodged ? g.missPt : { x: toRect.x, y: toRect.y };

        spawnGhostLunge(owner, fromRect, dest, { frac: 0.44, maxReach: 90, dur: 250, peak: 0.72 });
        if (!dodged) {
            idSample(owner, 'slash_whoosh_hit_fs434873', { vol: 0.9, maxDurSec: 0.62, fadeOutSec: 0.16 }) || idSfx(owner, () => {
                whoosh(0.02, { f0: 550, f1: 2400, q: 1.5, dur: 0.18, vol: 0.4 });
                crunch(0.14, { f: 2200, f1: 900, q: 1.2, dur: 0.14, vol: 0.48 });
            });
        } else {
            idSfx(owner, () => whoosh(0.04, { type: 'bandpass', f0: 1100, f1: 3100, q: 1.4, dur: 0.24, vol: 0.34, cut: true }));
        }

        const arcLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${dest.x}px;top:${dest.y}px;width:220px;height:220px;transform:translate(-50%,-50%) rotate(${g.angleDeg.toFixed(1)}deg);">
            <svg viewBox="-110 -110 220 220" class="w-full h-full arcane-identity-glow-slash" style="overflow:visible;">
              <defs>
                <linearGradient id="id-sl-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${dodged ? '#94a3b8' : '#9f1239'}" stop-opacity="0"/>
                  <stop offset="52%" stop-color="${dodged ? '#cbd5e1' : '#fb7185'}" stop-opacity="${dodged ? 0.55 : 0.9}"/>
                  <stop offset="100%" stop-color="${dodged ? '#f8fafc' : '#fff1f2'}"/>
                </linearGradient>
              </defs>
              <g class="id-sl-swing" style="transform-origin:0 0;">
                <path d="M-86,62 Q-6,-74 96,-14 Q14,-18 -64,68 Z" fill="url(#id-sl-${uid})"/>
                <path d="M-54,48 Q-2,-52 94,-14" fill="none" stroke="${dodged ? '#e2e8f0' : '#ffffff'}" stroke-width="2.6" stroke-linecap="round"/>
              </g>
              <g class="id-sl-trail" style="transform-origin:0 0;">
                <path d="M-80,58 Q-10,-62 90,-10 Q10,-12 -60,62 Z" fill="url(#id-sl-${uid})" opacity="0.45"/>
              </g>
            </svg>
          </div>`);
        owner.anim(arcLayer.querySelector('.id-sl-swing'), [
            { transform: 'rotate(-58deg) scale(0.76)', opacity: 0 },
            { transform: 'rotate(2deg) scale(1.06)', opacity: 1, offset: 0.45 },
            { transform: 'rotate(46deg) scale(1.12)', opacity: dodged ? 0.5 : 0.92, offset: 0.72 },
            { transform: 'rotate(64deg) scale(1.18)', opacity: 0 }
        ], { duration: 300, delay: 40, easing: 'cubic-bezier(0.12,0.88,0.28,1)', fill: 'forwards' });
        owner.anim(arcLayer.querySelector('.id-sl-trail'), [
            { transform: 'rotate(-64deg) scale(0.7)', opacity: 0 },
            { transform: 'rotate(-6deg) scale(1.0)', opacity: 0.6, offset: 0.5 },
            { transform: 'rotate(40deg) scale(1.1)', opacity: 0 }
        ], { duration: 340, delay: 95, easing: 'cubic-bezier(0.12,0.88,0.28,1)', fill: 'forwards' });

        owner.at(T.impactMs, () => {
            if (onImpact) onImpact(target, { subtype: '刀砍', scope: 'single', outcome, point: dest, beatMs: T.impactMs });
            if (dodged) return;
            const cutDeg = g.angleDeg + 34;
            owner.layer(`
              <div class="arcane-identity-anchor" style="left:${dest.x}px;top:${dest.y}px;width:150px;height:60px;transform:translate(-50%,-50%) rotate(${cutDeg.toFixed(1)}deg);animation:arcane-identity-slash-spark 0.34s ease-out both;">
                <svg viewBox="-75 -30 150 60" class="w-full h-full arcane-identity-glow-slash">
                  <polygon points="-72,0 -12,-5 0,-18 12,-5 72,0 12,5 0,18 -12,5" fill="#fff1f2"/>
                  <line x1="-68" y1="0" x2="68" y2="0" stroke="#fb7185" stroke-width="3" stroke-linecap="round"/>
                </svg>
              </div>`);
            owner.addP({ x: dest.x, y: dest.y, shape: 'ring', size: 1.3, decay: 0.09, color: '#fecdd3' });
            const scarL = owner.layer(`<div class="arcane-identity-anchor" style="left:${dest.x}px;top:${dest.y}px;width:120px;height:10px;transform:translate(-50%,-50%) rotate(${cutDeg.toFixed(1)}deg);"><div class="id-sl-scar" style="width:100%;height:100%;border-radius:6px;background:linear-gradient(90deg,transparent,#fb7185 30%,#fff 50%,#fb7185 70%,transparent);"></div></div>`);
            owner.anim(scarL.querySelector('.id-sl-scar'), [{ transform: 'scaleX(0.1) scaleY(1.4)', opacity: 1 }, { transform: 'scaleX(1) scaleY(0.6)', opacity: 0.9, offset: 0.3 }, { transform: 'scaleX(1.05) scaleY(0.2)', opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
            const rad = cutDeg * Math.PI / 180;
            owner.burst(20, i => {
                const dir = i % 2 ? rad : rad + Math.PI, an = dir + rnd(-0.34, 0.34), s = rnd(3.5, 9.5);
                return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.9, decay: rnd(0.04, 0.075), size: rnd(1.4, 2.5), shape: 'streak', color: pick(['#ffffff', '#fecdd3', '#fda4af', '#fbbf24']) };
            });
        });
        return owner.handle;
    }

    // ===== 2. 单体(拳击)：前冲动势 + 压缩冲击面与小气浪（绝无刀光切割线） =====
    function playSinglePunch(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.punch, owner = identityRun(T.totalMs, 2), uid = ++S.uid;
        const g = computeLineGeom(fromRect, toRect, dodged, 0.7);
        const dest = dodged ? g.missPt : { x: toRect.x, y: toRect.y };

        spawnGhostLunge(owner, fromRect, dest, { frac: 0.5, maxReach: 108, dur: 220, peak: 0.78, scale: 1.09 });
        idSfx(owner, () => whoosh(0, { type: 'lowpass', f0: 520, f1: 240, q: 1.1, dur: 0.16, vol: 0.34 }));

        const fistWave = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${dest.x - g.ux * 28}px;top:${dest.y - g.uy * 28}px;width:90px;height:60px;transform:translate(-50%,-50%) rotate(${g.angleDeg.toFixed(1)}deg);">
            <svg viewBox="-45 -30 90 60" class="w-full h-full arcane-identity-glow-punch">
              <polygon class="id-pn-cone" points="-36,-10 18,-2 26,0 18,2 -36,10 -14,0" fill="#fef3c7" opacity="0.82"/>
            </svg>
          </div>`);
        owner.anim(fistWave.querySelector('.id-pn-cone'), [
            { transform: 'translateX(-28px) scaleX(0.4)', opacity: 0 },
            { transform: 'translateX(22px) scaleX(1.15)', opacity: 0.92, offset: 0.65 },
            { transform: 'translateX(34px) scaleX(0.3)', opacity: 0 }
        ], { duration: 170, fill: 'forwards' });

        owner.at(T.impactMs, () => {
            if (onImpact) onImpact(target, { subtype: '拳击', scope: 'single', outcome, point: dest, beatMs: T.impactMs });
            if (dodged) {
                owner.burst(8, () => {
                    const an = g.angleDeg * Math.PI / 180 + rnd(-0.6, 0.6), s = rnd(2, 5.2);
                    return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.92, decay: 0.06, size: rnd(3, 6), shape: 'dust', blend: 'source-over', color: 'rgba(226,232,240,0.45)' };
                });
                return;
            }
            idSample(owner, 'atk2', { vol: 0.95, maxDurSec: 0.45, fadeOutSec: 0.12 }) || idSfx(owner, () => {
                kick(0, { hi: 160, lo: 42, pd: 0.045, dur: 0.24, vol: 0.9, drive: 4 });
                boom(0.01, { f0: 900, f1: 140, dur: 0.25, vol: 0.4 });
            });
            const planeLayer = owner.layer(`
              <div class="arcane-identity-anchor" style="left:${dest.x}px;top:${dest.y}px;width:160px;height:160px;transform:translate(-50%,-50%) rotate(${g.angleDeg.toFixed(1)}deg);">
                <svg viewBox="-80 -80 160 160" class="w-full h-full arcane-identity-glow-punch" style="overflow:visible;">
                  <defs><radialGradient id="id-pn-${uid}"><stop offset="0%" stop-color="#ffffff"/><stop offset="48%" stop-color="#fde68a" stop-opacity="0.72"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/></radialGradient></defs>
                  <g class="id-pn-plane">
                    <ellipse rx="24" ry="56" fill="url(#id-pn-${uid})"/>
                    <ellipse rx="14" ry="44" fill="none" stroke="#ffffff" stroke-width="3.5"/>
                    <ellipse rx="26" ry="66" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="14 8" opacity="0.85"/>
                  </g>
                </svg>
              </div>`);
            owner.anim(planeLayer.querySelector('.id-pn-plane'), [
                { transform: 'scaleX(0.32) scaleY(0.55)', opacity: 1 },
                { transform: 'scaleX(0.62) scaleY(1.25)', opacity: 1, offset: 0.22 },
                { transform: 'scaleX(1.38) scaleY(0.95)', opacity: 0 }
            ], { duration: 310, easing: 'cubic-bezier(0.14,0.88,0.28,1)', fill: 'forwards' });
            owner.addP({ x: dest.x, y: dest.y, shape: 'ring', size: 1.8, decay: 0.07, color: '#fef3c7' });
            owner.at(50, () => owner.addP({ x: dest.x, y: dest.y, shape: 'ring', size: 2.6, decay: 0.06, color: '#fbbf24' }));
            shake('light');
            owner.burst(12, i => { const an = i / 12 * 6.283, s = rnd(6, 10); return { x: dest.x + Math.cos(an) * 14, y: dest.y + Math.sin(an) * 14, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.86, decay: 0.09, size: 2, shape: 'streak', color: '#fff7ed' }; });
            owner.burst(14, () => {
                const an = Math.random() * 6.283, s = rnd(2.2, 6.2);
                return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.9, decay: 0.048, size: rnd(4, 8), shape: 'dust', color: pick(['#fef3c7', '#fde68a', '#ffffff']) };
            });
        });
        return owner.handle;
    }
    // ===== 3. 单体(爪击)：扑袭动势 + 4条平行错拍弯曲爪痕 + 撕裂碎屑（视觉多段，仅一次 onImpact） =====
    function playSingleClaw(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.claw, owner = identityRun(T.totalMs, 2);
        const g = computeLineGeom(fromRect, toRect, dodged, 0.72);
        const dest = dodged ? g.missPt : { x: toRect.x, y: toRect.y };
        const slashDeg = g.angleDeg + (g.dx >= 0 ? 34 : -34);
        const clawRad = slashDeg * Math.PI / 180;

        spawnGhostLunge(owner, fromRect, dest, { frac: 0.48, maxReach: 98, dur: 250, peak: 0.76, scale: 1.08 });
        if (!dodged) {
            owner.at(95, () => idSample(owner, 'claw_bloody_blade_fs323526', { vol: 0.92, maxDurSec: 0.65, fadeOutSec: 0.18 }) || idSfx(owner, () => {
                for (let k = 0; k < 3; k++) crunch(k * 0.045, { f: 2800 - k * 350, f1: 750, q: 1.5, dur: 0.11, vol: 0.46 });
            }));
        } else {
            idSfx(owner, () => whoosh(0.05, { type: 'bandpass', f0: 1400, f1: 3600, q: 1.7, dur: 0.22, vol: 0.34, cut: true }));
        }

        const offsets = [-24, -8, 8, 24];
        const pathsHtml = offsets.map((off, idx) => {
            const len = 104 - Math.abs(off) * 0.6;
            const d = `M${-len * 0.52},${off - 6} Q0,${off + (idx % 2 ? -10 : -7)} ${len * 0.52},${off + 7}`;
            return `<g class="id-cl-g" data-idx="${idx}"><path class="id-cl-shadow" d="${d}" fill="none" stroke="rgba(69,10,10,0.65)" stroke-width="${dodged ? 0 : 12}" stroke-linecap="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;"/><path class="id-cl-outer" d="${d}" fill="none" stroke="${dodged ? '#94a3b8' : '#ef4444'}" stroke-width="${dodged ? 4 : 7.5}" stroke-linecap="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:${dodged ? 0.5 : 0.85};"/><path class="id-cl-core" d="${d}" fill="none" stroke="${dodged ? '#e2e8f0' : '#fff1f2'}" stroke-width="${dodged ? 1.8 : 2.8}" stroke-linecap="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;"/><circle class="id-cl-tip" cx="${len * 0.52}" cy="${off + 7}" r="${dodged ? 0 : 3.2}" fill="#ffffff" opacity="0"/></g>`;
        }).join('');
        const clawLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${dest.x}px;top:${dest.y}px;width:150px;height:130px;transform:translate(-50%,-50%) rotate(${slashDeg.toFixed(1)}deg);">
            <svg viewBox="-75 -65 150 130" class="w-full h-full ${dodged ? '' : 'arcane-identity-glow-claw'}" style="overflow:visible;">${pathsHtml}</svg>
          </div>`);

        clawLayer.querySelectorAll('.id-cl-g').forEach((grp, idx) => {
            const delay = 100 + idx * 36;
            const shd = grp.querySelector('.id-cl-shadow'), outer = grp.querySelector('.id-cl-outer'), core = grp.querySelector('.id-cl-core'), tip = grp.querySelector('.id-cl-tip');
            const lifeAnim = dodged ? [{ strokeDashoffset: 1, opacity: 0.6 }, { strokeDashoffset: 0, opacity: 0.75, offset: 0.45 }, { strokeDashoffset: -0.6, opacity: 0 }]
                : [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, offset: 0.24 }, { strokeDashoffset: 0, opacity: 0.88, offset: 0.62 }, { strokeDashoffset: 0, opacity: 0 }];
            if (!dodged && shd) owner.anim(shd, [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 0.85, offset: 0.25 }, { strokeDashoffset: 0, opacity: 0.65, offset: 0.72 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 540, delay, easing: 'ease-out', fill: 'forwards' });
            owner.anim(outer, lifeAnim, { duration: dodged ? 230 : 480, delay, easing: 'ease-out', fill: 'forwards' });
            owner.anim(core, lifeAnim, { duration: dodged ? 220 : 450, delay, easing: 'ease-out', fill: 'forwards' });
            if (!dodged && tip) owner.anim(tip, [{ opacity: 0, transform: 'scale(0.3)' }, { opacity: 1, transform: 'scale(1.6)', offset: 0.35 }, { opacity: 0, transform: 'scale(0.2)' }], { duration: 240, delay: delay + 25, fill: 'forwards' });
            if (!dodged) {
                owner.at(delay + 28, () => {
                    owner.burst(5, () => {
                        const an = clawRad + rnd(-0.35, 0.35), s = rnd(2.8, 7.6);
                        return { x: dest.x + rnd(-10, 10), y: dest.y + rnd(-10, 10), vx: Math.cos(an) * s, vy: Math.sin(an) * s, grav: 0.14, drag: 0.93, rot: rnd(0, 6), vr: rnd(-0.2, 0.2), decay: 0.045, size: rnd(2.2, 4.2), shape: Math.random() < 0.55 ? 'droplet' : 'shard', fill: 'rgba(220,38,38,0.65)', color: pick(['#f87171', '#fca5a5', '#fee2e2']), blend: 'source-over' };
                    });
                });
            }
        });
        owner.at(T.impactMs, () => {
            if (onImpact) onImpact(target, { subtype: '爪击', scope: 'single', outcome, point: dest, beatMs: T.impactMs });
        });
        return owner.handle;
    }

    // ===== 4. 单体(撕咬)：短扑残影 + 开口朝向目标（敌→我自上方下咬）上下颚咬合挤压 + 撕扯碎屑 =====
    function playSingleBite(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.bite, owner = identityRun(T.totalMs, 2);
        const g = computeLineGeom(fromRect, toRect, dodged, 0.72);
        const dest = dodged ? g.missPt : { x: toRect.x, y: toRect.y };
        // 开口方向严格按敌我相对位置：敌→我（上方俯冲下咬 0deg）；我→敌（正向迎咬微斜）
        const fromAbove = fromRect.y < toRect.y;
        const jawAngle = fromAbove ? 0 : (toRect.x >= fromRect.x ? -16 : 16);

        spawnGhostLunge(owner, fromRect, dest, { frac: 0.38, maxReach: 82, dur: 230, peak: 0.72, scale: 1.07 });
        if (!dodged) {
            idSample(owner, 'wolfman', { vol: 0.88, offsetSec: 0.04, maxDurSec: 0.7, fadeOutSec: 0.2 }) || idSfx(owner, () => {
                kick(0.14, { hi: 150, lo: 36, pd: 0.04, dur: 0.22, vol: 0.85, drive: 4 });
                crunch(0.16, { f: 1100, f1: 420, q: 1.3, dur: 0.14, vol: 0.48 });
            });
            idSfx(owner, () => { crunch(0.18, { f: 1450, f1: 520, q: 1.5, dur: 0.14, vol: 0.34 }); tone(0.18, { type: 'sawtooth', f0: 95, f1: 55, dur: 0.18, vol: 0.1, lp: 420 }); });
        } else {
            idSfx(owner, () => { whoosh(0.08, { type: 'lowpass', f0: 480, f1: 190, q: 1.1, dur: 0.18, vol: 0.32 }); click(0.18, 0.45, 2200, 0.015); });
        }

        const jawCol = dodged ? '#cbd5e1' : '#fff1f2', rimCol = dodged ? '#64748b' : '#f43f5e';
        const jawLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${dest.x}px;top:${dest.y}px;width:150px;height:150px;transform:translate(-50%,-50%) rotate(${jawAngle}deg);">
            <svg viewBox="-75 -75 150 150" class="w-full h-full ${dodged ? '' : 'arcane-identity-glow-bite'}" style="overflow:visible;">
              <ellipse class="id-bt-crush" cx="0" cy="2" rx="58" ry="36" fill="rgba(159,18,57,0.45)" opacity="0"/>
              <g class="id-bt-upper">
                <path d="M-54,-8 Q0,-34 54,-8 L42,-4 L32,20 L22,-4 L10,24 L0,-4 L-10,24 L-22,-4 L-32,20 L-42,-4 Z" fill="${jawCol}" stroke="${rimCol}" stroke-width="2" stroke-linejoin="round"/>
              </g>
              <g class="id-bt-lower">
                <path d="M-50,12 Q0,38 50,12 L38,6 L28,-16 L18,6 L6,-20 L0,6 L-6,-20 L-18,6 L-28,-16 L-38,6 Z" fill="${jawCol}" stroke="${rimCol}" stroke-width="2" stroke-linejoin="round"/>
              </g>
              <line class="id-bt-seam" x1="-46" y1="2" x2="46" y2="2" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0"/>
              <polygon class="id-bt-glint" points="0,-16 3,-2 22,2 3,6 0,20 -3,6 -22,2 -3,-2" fill="#ffffff" opacity="0"/>
            </svg>
          </div>`);
        const up = jawLayer.querySelector('.id-bt-upper'), lo = jawLayer.querySelector('.id-bt-lower'), seam = jawLayer.querySelector('.id-bt-seam'), crush = jawLayer.querySelector('.id-bt-crush'), glint = jawLayer.querySelector('.id-bt-glint');
        owner.anim(up, [
            { transform: 'translateY(-36px) scale(0.85)', opacity: 0 },
            { transform: 'translateY(-28px) scale(1)', opacity: 1, offset: 0.25 },
            { transform: 'translateY(4px) scale(1.04)', opacity: 1, offset: 0.45 },
            { transform: 'translateY(6px) scale(0.98)', opacity: 1, offset: 0.64 },
            { transform: 'translateY(-8px) scale(0.95)', opacity: 0 }
        ], { duration: dodged ? 360 : 520, fill: 'forwards' });
        owner.anim(lo, [
            { transform: 'translateY(34px) scale(0.85)', opacity: 0 },
            { transform: 'translateY(26px) scale(1)', opacity: 1, offset: 0.25 },
            { transform: 'translateY(-4px) scale(1.04)', opacity: 1, offset: 0.45 },
            { transform: 'translateY(-6px) scale(0.98)', opacity: 1, offset: 0.64 },
            { transform: 'translateY(8px) scale(0.95)', opacity: 0 }
        ], { duration: dodged ? 360 : 520, fill: 'forwards' });

        owner.at(T.impactMs, () => {
            if (onImpact) onImpact(target, { subtype: '撕咬', scope: 'single', outcome, point: dest, beatMs: T.impactMs });
            if (dodged) {
                owner.addP({ x: dest.x, y: dest.y, shape: 'ring', size: 0.9, decay: 0.085, color: '#cbd5e1' });
                return;
            }
            owner.anim(seam, [{ opacity: 1, transform: 'scaleX(0.3)' }, { opacity: 1, transform: 'scaleX(1.1)', offset: 0.35 }, { opacity: 0, transform: 'scaleX(0.9)' }], { duration: 240, fill: 'forwards' });
            owner.anim(crush, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 0.9, transform: 'scale(0.85,0.6)', offset: 0.35 }, { opacity: 0, transform: 'scale(1.2)' }], { duration: 310, fill: 'forwards' });
            owner.anim(glint, [{ opacity: 0, transform: 'scale(0.2) rotate(0deg)' }, { opacity: 1, transform: 'scale(1.3) rotate(25deg)', offset: 0.35 }, { opacity: 0, transform: 'scale(0.4) rotate(50deg)' }], { duration: 230, fill: 'forwards' });
            owner.at(90, () => {
                owner.burst(18, i => {
                    const sideAng = (i % 2 ? 0 : Math.PI) + rnd(-0.55, 0.55), s = rnd(2.2, 6.4);
                    return { x: dest.x + rnd(-10, 10), y: dest.y, vx: Math.cos(sideAng) * s, vy: Math.sin(sideAng) * s - 0.8, grav: 0.2, drag: 0.94, rot: rnd(0, 6), vr: rnd(-0.25, 0.25), decay: 0.04, size: rnd(2.4, 4.4), shape: i % 3 ? 'shard' : 'droplet', fill: 'rgba(244,63,94,0.65)', color: pick(['#fff1f2', '#fb7185', '#f43f5e']), blend: 'source-over' };
                });
            });
        });
        return owner.handle;
    }
    // ===== 5. 单体(毒液)：黏稠液团沿抛物线拉丝变形飞行 + 命中不规则溅面/气泡上浮/毒烟下沉 + 闪避旁侧溅地 =====
    function playSingleVenom(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.venom, owner = identityRun(T.totalMs, 2), uid = ++S.uid;
        const g = computeLineGeom(fromRect, toRect, dodged, 0.78);
        const a = { x: fromRect.x + g.ux * 16, y: toRect.y < fromRect.y ? fromRect.top - 10 : fromRect.y + 8 };
        const dest = dodged ? { x: g.missPt.x, y: toRect.bottom - 4 } : { x: toRect.x, y: toRect.y };
        const lift = computeParabolaLift(a, dest, 76);

        idSfx(owner, () => whoosh(0.02, { type: 'bandpass', f0: 280, f1: 780, q: 2.2, dur: 0.16, vol: 0.22 }));
        const sacLayer = owner.layer(`
          <div class="arcane-identity-anchor id-vn-sac" style="left:${a.x}px;top:${a.y}px;width:44px;height:44px;transform:translate(-50%,-50%);">
            <svg viewBox="-22 -22 44 44" class="w-full h-full arcane-identity-glow-venom">
              <path d="M-12,-4 Q-4,-15 8,-10 Q16,-2 11,9 Q2,15 -9,10 Q-16,2 -12,-4 Z" fill="#65a30d" opacity="0.9"/>
              <circle cx="-3" cy="-3" r="4" fill="#d9f99d"/>
            </svg>
          </div>`);
        owner.anim(sacLayer.querySelector('.id-vn-sac'), [{ transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.12,0.88)', opacity: 1, offset: 0.65 }, { transform: 'translate(-50%,-50%) scale(0.85,1.15)', opacity: 0.9 }], { duration: T.chargeMs, fill: 'forwards' });

        owner.at(T.chargeMs, () => {
            sacLayer.remove();
            const globLayer = owner.layer(`
              <div class="arcane-identity-anchor id-vn-glob" style="left:${a.x}px;top:${a.y}px;width:68px;height:36px;transform:translate(-50%,-50%);">
                <svg viewBox="-46 -18 68 36" class="w-full h-full arcane-identity-glow-venom" style="overflow:visible;">
                  <defs><radialGradient id="id-vn-${uid}" cx="65%" cy="40%" r="65%"><stop offset="0%" stop-color="#ecfccb"/><stop offset="45%" stop-color="#84cc16"/><stop offset="100%" stop-color="#365314"/></radialGradient></defs>
                  <path d="M-40,0 Q-18,-6 2,-10 Q18,-10 18,0 Q18,10 2,10 Q-18,6 -40,0 Z" fill="url(#id-vn-${uid})"/>
                  <circle cx="7" cy="-3" r="3" fill="#f7fee7" opacity="0.85"/>
                </svg>
              </div>`);
            const globEl = globLayer.querySelector('.id-vn-glob');
            const cx = (a.x + dest.x) / 2, cy = Math.min(a.y, dest.y) - lift;
            owner.fly(a, dest, lift, T.flightMs, (x, y, pr) => {
                const tx = (1 - pr) * (cx - a.x) + pr * (dest.x - cx), ty = (1 - pr) * (cy - a.y) + pr * (dest.y - cy);
                const deg = Math.atan2(ty, tx) * 180 / Math.PI;
                const wobble = 1 + 0.28 * Math.sin(pr * Math.PI * 3);
                globEl.style.left = x + 'px'; globEl.style.top = y + 'px';
                globEl.style.transform = `translate(-50%,-50%) rotate(${deg.toFixed(1)}deg) scale(${(1.12 * wobble).toFixed(2)}, ${(0.9 / wobble).toFixed(2)})`;
                if (Math.random() < 0.72) {
                    owner.addP({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: -tx * 0.008 + rnd(-0.5, 0.5), vy: rnd(0.4, 1.8), grav: 0.14, drag: 0.96, decay: 0.048, size: rnd(2.2, 4.0), shape: 'droplet', blend: 'source-over', color: pick(['#84cc16', '#bef264', '#4d7c0f']), hiColor: '#f7fee7' });
                }
            }, () => {
                globLayer.remove();
                if (onImpact) onImpact(target, { subtype: '毒液', scope: 'single', outcome, point: dest, beatMs: T.impactMs });
                idSample(owner, 'creature_slime_01', { vol: dodged ? 0.65 : 0.92, maxDurSec: 0.42, fadeOutSec: 0.14 }) || idSfx(owner, () => crunch(0, { f: 950, f1: 320, q: 2.0, dur: 0.18, vol: 0.38 }));
                const splatScale = dodged ? 0.85 : 1.05;
                const splatLayer = owner.layer(`
                  <div class="arcane-identity-anchor id-vn-splat" style="left:${dest.x}px;top:${dest.y}px;width:130px;height:110px;transform:translate(-50%,-50%) scale(${splatScale});">
                    <svg viewBox="-65 -55 130 110" class="w-full h-full arcane-identity-glow-venom">
                      <ellipse cx="0" cy="4" rx="52" ry="34" fill="none" stroke="#bef264" stroke-width="1.6" stroke-dasharray="10 6" opacity="0.65"/>
                      <path d="M-38,-8 Q-14,-28 14,-22 Q38,-14 42,6 Q28,28 -6,26 Q-36,24 -44,6 Z" fill="#65a30d" opacity="0.72"/>
                      <path d="M-24,-2 Q-6,-16 14,-10 Q24,2 10,14 Q-12,18 -24,-2 Z" fill="#a3e635" opacity="0.82"/>
                      <circle cx="-8" cy="-4" r="4.5" fill="#1a2e05" opacity="0.55"/><circle cx="11" cy="5" r="3.5" fill="#1a2e05" opacity="0.55"/>
                      <circle cx="-18" cy="-28" r="5" fill="#bef264"/><circle cx="34" cy="-20" r="4" fill="#84cc16"/><circle cx="28" cy="24" r="5.5" fill="#65a30d"/><circle cx="-36" cy="18" r="3.8" fill="#a3e635"/>
                    </svg>
                  </div>`);
                owner.anim(splatLayer.querySelector('.id-vn-splat'), [{ transform: `translate(-50%,-50%) scale(0.35)`, opacity: 1 }, { transform: `translate(-50%,-50%) scale(${splatScale * 1.12})`, opacity: 0.9, offset: 0.28 }, { transform: `translate(-50%,-50%) scale(${splatScale * 1.25})`, opacity: 0 }], { duration: 420, fill: 'forwards' });
                owner.burst(14, () => { const an = Math.random() * 6.283, s = rnd(1.8, 5.4); return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 1.2, grav: 0.2, drag: 0.94, decay: 0.036, size: rnd(2.2, 3.8), shape: 'droplet', blend: 'source-over', color: pick(['#84cc16', '#a3e635', '#4d7c0f']) }; });
                owner.burst(7, () => ({ x: dest.x + rnd(-22, 22), y: dest.y + rnd(-10, 10), vx: rnd(-0.35, 0.35), vy: rnd(-1.4, -0.5), drag: 0.97, decay: 0.025, size: rnd(0.28, 0.45), shape: 'ring', color: '#bef264' }));
                owner.burst(5, () => ({ x: dest.x + rnd(-26, 26), y: dest.y + rnd(0, 12), vx: rnd(-0.4, 0.4), vy: rnd(0.25, 0.85), drag: 0.98, decay: 0.022, size: rnd(12, 20), shape: 'smoke', blend: 'source-over', color: 'rgba(101,163,13,0.34)' }));
            }, k => k);
        });
        return owner.handle;
    }

    // ===== 6. 单体(箭矢)：实体箭杆箭头尾羽高速飞行 + 定向刺入留一瞬后消散 / 闪避擦身偏飞出 =====
    function playSingleArrow(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.arrow, owner = identityRun(T.totalMs, 2);
        const g = computeLineGeom(fromRect, toRect, dodged, 0.62);
        const a = { x: fromRect.x + g.ux * 14, y: fromRect.y + g.uy * 14 };
        const dest = dodged ? g.missPt : { x: toRect.x, y: toRect.y };

        const bowLayer = owner.layer(`
          <div class="arcane-identity-anchor id-ar-bow" style="left:${a.x}px;top:${a.y}px;width:54px;height:54px;transform:translate(-50%,-50%) rotate(${g.angleDeg.toFixed(1)}deg);">
            <svg viewBox="-27 -27 54 54" class="w-full h-full arcane-identity-glow-arrow">
              <path d="M-8,-22 Q14,0 -8,22" fill="none" stroke="#bae6fd" stroke-width="2.4" stroke-linecap="round"/>
              <line x1="-8" y1="-22" x2="-15" y2="0" stroke="#e2e8f0" stroke-width="1"/><line x1="-8" y1="22" x2="-15" y2="0" stroke="#e2e8f0" stroke-width="1"/>
            </svg>
          </div>`);
        owner.anim(bowLayer.querySelector('.id-ar-bow'), [{ opacity: 0, transform: `translate(-50%,-50%) rotate(${g.angleDeg}deg) scale(0.7)` }, { opacity: 0.9, transform: `translate(-50%,-50%) rotate(${g.angleDeg}deg) scale(1)`, offset: 0.65 }, { opacity: 0, transform: `translate(-50%,-50%) rotate(${g.angleDeg}deg) scale(1.1)` }], { duration: 130, fill: 'forwards' });

        owner.at(T.chargeMs, () => {
            idSample(owner, 'swish_3', { vol: 0.86, maxDurSec: 0.45, fadeOutSec: 0.14 }) || idSfx(owner, () => whoosh(0, { type: 'bandpass', f0: 2100, f1: 4800, q: 1.8, dur: 0.17, vol: 0.3, cut: true }));
            const flightDeg = Math.atan2(dest.y - a.y, dest.x - a.x) * 180 / Math.PI;
            const arrLayer = owner.layer(`
              <div class="arcane-identity-anchor id-ar-body" style="left:${a.x}px;top:${a.y}px;width:72px;height:24px;transform:translate(-50%,-50%) rotate(${flightDeg.toFixed(1)}deg);">
                <svg viewBox="-46 -12 72 24" class="w-full h-full arcane-identity-glow-arrow" style="overflow:visible;">
                  <g class="id-ar-fletch">
                    <polygon points="-40,0 -48,-6 -31,-2" fill="#e0f2fe"/><polygon points="-40,0 -48,6 -31,2" fill="#7dd3fc"/>
                  </g>
                  <line x1="-40" y1="0" x2="10" y2="0" stroke="#d6d3d1" stroke-width="2.4" stroke-linecap="round"/>
                  <polygon points="8,-5 24,0 8,5 12,0" fill="#f8fafc" stroke="#38bdf8" stroke-width="0.9"/>
                </svg>
              </div>`);
            const arrEl = arrLayer.querySelector('.id-ar-body'), fletchEl = arrLayer.querySelector('.id-ar-fletch');
            owner.anim(fletchEl, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.75)', offset: 0.5 }, { transform: 'scaleY(1)' }], { duration: 75, iterations: 4 });
            owner.fly(a, dest, 10, T.flightMs, (x, y) => {
                arrEl.style.left = x + 'px'; arrEl.style.top = y + 'px';
                if (Math.random() < 0.7) owner.addP({ x: x - g.ux * 22, y: y - g.uy * 22, vx: -g.ux * 1.4, vy: -g.uy * 1.4, drag: 0.92, decay: 0.16, size: 1.4, shape: 'streak', color: '#e0f2fe' });
            }, () => {
                if (onImpact) onImpact(target, { subtype: '箭矢', scope: 'single', outcome, point: dest, beatMs: T.impactMs });
                if (dodged) {
                    const outPt = { x: dest.x + g.ux * 165, y: dest.y + g.uy * 165 };
                    owner.fly(dest, outPt, 0, 160, (x, y, pr) => {
                        arrEl.style.left = x + 'px'; arrEl.style.top = y + 'px';
                        arrEl.style.opacity = String(Math.max(0, 1 - pr));
                    }, () => arrLayer.remove(), k => k);
                    return;
                }
                idSfx(owner, () => { click(0, 0.7, 3600, 0.01); tone(0, { type: 'triangle', f0: 260, f1: 110, dur: 0.08, vol: 0.16 }); });
                owner.addP({ x: dest.x, y: dest.y, shape: 'ring', size: 0.9, decay: 0.11, color: '#e0f2fe' });
                owner.burst(6, () => { const an = Math.atan2(-g.uy, -g.ux) + rnd(-0.5, 0.5), s = rnd(3, 6); return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.88, decay: 0.09, size: 1.4, shape: 'streak', color: '#bae6fd' }; });
                arrEl.querySelector('polygon:last-of-type').setAttribute('opacity', '0.15');
                owner.anim(arrEl, [
                    { transform: `translate(-50%,-50%) rotate(${flightDeg}deg) scaleX(1)`, opacity: 1 },
                    { transform: `translate(-50%,-50%) rotate(${flightDeg + 2.5}deg) scaleX(0.95)`, opacity: 0.95, offset: 0.2 },
                    { transform: `translate(-50%,-50%) rotate(${flightDeg - 1.5}deg) scaleX(1)`, opacity: 0.85, offset: 0.45 },
                    { transform: `translate(-50%,-50%) rotate(${flightDeg}deg) scaleX(0.9)`, opacity: 0 }
                ], { duration: 280, fill: 'forwards' });
                owner.burst(10, () => { const an = Math.random() * 6.283, s = rnd(1.5, 4.5); return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 0.5, grav: 0.14, drag: 0.92, decay: 0.055, size: rnd(1.6, 2.8), shape: 'shard', color: '#e2e8f0' }; });
            }, k => k);
        });
        return owner.handle;
    }
    // ===== 7. 单体(冰霜)：多面晶体冰锥成形 + 晶体拖尾飞射 + 向外瞬间结晶崩碎冷雾沉降 =====
    function playSingleFrost(caster, target, outcome = 'hit', onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        if (!fromRect || !toRect) return null;
        const dodged = outcome === 'dodge';
        const T = IDENTITY_TIMINGS.frost, owner = identityRun(T.totalMs, 2), uid = ++S.uid;
        const g = computeLineGeom(fromRect, toRect, dodged, 0.76);
        const a = { x: fromRect.x + g.ux * 16, y: toRect.y < fromRect.y ? fromRect.top - 12 : fromRect.y + 8 };
        const dest = dodged ? { x: g.missPt.x, y: toRect.bottom - 6 } : { x: toRect.x, y: toRect.y };
        const lift = computeParabolaLift(a, dest, 38);

        idSfx(owner, () => { crystal(0, 2093, 0.09); crystal(0.05, 2637, 0.06); });
        const formLayer = owner.layer(`
          <div class="arcane-identity-anchor id-fr-form" style="left:${a.x}px;top:${a.y}px;width:64px;height:64px;transform:translate(-50%,-50%) rotate(${g.angleDeg.toFixed(1)}deg);">
            <svg viewBox="-32 -32 64 64" class="w-full h-full arcane-identity-glow-frost">
              <polygon points="-24,0 -6,-10 26,0 -6,10" fill="#bae6fd" stroke="#ffffff" stroke-width="1.2"/>
              <polygon points="-14,0 26,0 -6,-10" fill="#ffffff" opacity="0.68"/>
            </svg>
          </div>`);
        owner.anim(formLayer.querySelector('.id-fr-form'), [{ transform: `translate(-50%,-50%) rotate(${g.angleDeg}deg) scale(0.15)`, opacity: 0 }, { transform: `translate(-50%,-50%) rotate(${g.angleDeg}deg) scale(1.08)`, opacity: 1, offset: 0.7 }, { transform: `translate(-50%,-50%) rotate(${g.angleDeg}deg) scale(0.95)`, opacity: 0.9 }], { duration: T.chargeMs, fill: 'forwards' });
        owner.burst(10, () => { const ang = Math.random() * 6.283, d = rnd(24, 48); return { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d, vx: -Math.cos(ang) * d / 8, vy: -Math.sin(ang) * d / 8, decay: 0.08, size: rnd(2.2, 3.6), shape: 'frostShard', color: '#e0f2fe' }; });

        owner.at(T.chargeMs, () => {
            formLayer.remove();
            idSfx(owner, () => whoosh(0, { type: 'highpass', f0: 1400, f1: 3800, dur: 0.25, vol: 0.22 }));
            const lanceLayer = owner.layer(`
              <div class="arcane-identity-anchor id-fr-lance" style="left:${a.x}px;top:${a.y}px;width:82px;height:36px;transform:translate(-50%,-50%);">
                <svg viewBox="-52 -18 82 36" class="w-full h-full arcane-identity-glow-frost" style="overflow:visible;">
                  <defs><linearGradient id="id-fr-${uid}" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/><stop offset="45%" stop-color="#7dd3fc" stop-opacity="0.82"/><stop offset="100%" stop-color="#ffffff"/></linearGradient></defs>
                  <polygon points="-46,0 -10,-9 28,0 -10,9" fill="url(#id-fr-${uid})"/>
                  <polygon points="-14,0 28,0 -8,-7" fill="#ffffff" opacity="0.72"/>
                  <polygon points="-14,0 28,0 -8,7" fill="#38bdf8" opacity="0.6"/>
                </svg>
              </div>`);
            const lanceEl = lanceLayer.querySelector('.id-fr-lance');
            const cx = (a.x + dest.x) / 2, cy = Math.min(a.y, dest.y) - lift;
            owner.fly(a, dest, lift, T.flightMs, (x, y, pr) => {
                const tx = (1 - pr) * (cx - a.x) + pr * (dest.x - cx), ty = (1 - pr) * (cy - a.y) + pr * (dest.y - cy);
                const deg = Math.atan2(ty, tx) * 180 / Math.PI;
                lanceEl.style.left = x + 'px'; lanceEl.style.top = y + 'px';
                lanceEl.style.transform = `translate(-50%,-50%) rotate(${deg.toFixed(1)}deg)`;
                if (Math.random() < 0.78) owner.addP({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(-0.6, 0.6), vy: rnd(-0.4, 0.6), rot: rnd(0, 6), vr: rnd(-0.15, 0.15), decay: 0.06, size: rnd(2.2, 4.0), shape: 'frostShard', color: pick(['#e0f2fe', '#7dd3fc', '#ffffff']) });
            }, () => {
                lanceLayer.remove();
                if (onImpact) onImpact(target, { subtype: '冰霜', scope: 'single', outcome, point: dest, beatMs: T.impactMs });
                idSample(owner, 'frost_crystal_impact_fs550267', { vol: dodged ? 0.56 : 0.9, maxDurSec: dodged ? 0.45 : 0.72, fadeOutSec: 0.2 }) || idSfx(owner, () => {
                    crystal(0, 2637, 0.12); crunch(0, { f: 2800, f1: 1100, q: 1.4, dur: 0.16, vol: 0.42 });
                });
                const clusterSize = dodged ? 84 : 136;
                const spikes = [-75, -35, 10, 55, 115, 165].map((ang, idx) => `<polygon points="0,0 -7,-${dodged ? 18 : 26} 0,-${dodged ? 36 : 56 + (idx % 2) * 10} 7,-${dodged ? 18 : 26}" fill="${idx % 2 ? '#bae6fd' : '#e0f2fe'}" stroke="#ffffff" stroke-width="0.9" opacity="0.9" transform="rotate(${ang})"/>`).join('');
                const hexLines = [0, 60, 120].map(a => `<line x1="-48" y1="0" x2="48" y2="0" stroke="#e0f2fe" stroke-width="1.3" opacity="0.7" transform="rotate(${a})"/>`).join('');
                const crystalLayer = owner.layer(`
                  <div class="arcane-identity-anchor id-fr-bloom" style="left:${dest.x}px;top:${dest.y}px;width:${clusterSize}px;height:${clusterSize}px;transform:translate(-50%,-50%);">
                    <svg viewBox="-68 -68 136 136" class="w-full h-full arcane-identity-glow-frost"><polygon points="0,-44 38,-22 38,22 0,44 -38,22 -38,-22" fill="none" stroke="#7dd3fc" stroke-width="1.5" opacity="0.75"/>${hexLines}${spikes}<circle r="14" fill="#ffffff" opacity="0.88"/></svg>
                  </div>`);
                owner.addP({ x: dest.x, y: dest.y, shape: 'ring', size: dodged ? 0.9 : 1.35, decay: 0.085, color: '#bae6fd' });
                owner.anim(crystalLayer.querySelector('.id-fr-bloom'), [
                    { transform: 'translate(-50%,-50%) scale(0.18)', opacity: 1 },
                    { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 1, offset: 0.24 },
                    { transform: 'translate(-50%,-50%) scale(1.04)', opacity: 0.95, offset: 0.55 },
                    { transform: 'translate(-50%,-50%) scale(1.26)', opacity: 0 }
                ], { duration: dodged ? 280 : 390, fill: 'forwards' });
                owner.at(dodged ? 70 : 120, () => {
                    owner.burst(dodged ? 12 : 22, () => {
                        const an = Math.random() * 6.283, s = rnd(2.2, dodged ? 5.2 : 7.8);
                        return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 0.8, grav: 0.17, drag: 0.94, rot: rnd(0, 6), vr: rnd(-0.24, 0.24), decay: 0.032, size: rnd(2.6, 5.2), shape: 'frostShard', color: pick(['#ffffff', '#bae6fd', '#7dd3fc']) };
                    });
                    owner.burst(dodged ? 5 : 9, () => ({ x: dest.x + rnd(-22, 22), y: dest.y + rnd(2, 16), vx: rnd(-0.5, 0.5), vy: rnd(0.2, 0.7), drag: 0.985, decay: 0.018, size: rnd(14, 24), shape: 'smoke', blend: 'source-over', color: 'rgba(186,230,253,0.34)' }));
                });
            }, k => k * k);
        });
        return owner.handle;
    }
    function prepareAoeEntries(caster, targets, outcomes, areaBounds) {
        const fromRect = entityVisualRect(caster);
        const getOutcome = normalizeOutcomes(outcomes);
        const raw = (targets || []).map(t => {
            const rect = entityVisualRect(t);
            if (!rect) return null;
            const outcome = getOutcome(t), dodged = outcome === 'dodge';
            const g = fromRect ? computeLineGeom(fromRect, rect, dodged, 0.68) : null;
            return { entity: t, rect, outcome, dodged, dest: dodged && g ? g.missPt : { x: rect.x, y: rect.y }, g };
        }).filter(Boolean);
        if (!fromRect || (!raw.length && !areaBounds)) return null;
        const area = areaBounds || unionRect(raw.map(e => e.rect.dom)) || { x: raw[0].rect.x, y: raw[0].rect.y, w: raw[0].rect.w, h: raw[0].rect.h, l: raw[0].rect.left, r: raw[0].rect.right, t: raw[0].rect.top, b: raw[0].rect.bottom };
        const sorted = raw.slice().sort((a, b) => a.rect.x - b.rect.x);
        const spanX = Math.max(1, area.r - area.l);
        sorted.forEach(e => { e.tFrac = (e.rect.x - area.l) / spanX; });
        return { fromRect, entries: sorted, area, stageW: areaBounds ? area.w : Math.max(area.w * 1.36, 280), stageH: areaBounds ? area.h : Math.max(area.h * 1.48, 168) };
    }

    // ===== 8. 群攻(火焰)补齐：施法侧火流收束压缩 → 扇形/横向火浪横扫目标区 + 错峰小爆点 → 贴地残焰 =====
    function playAoeFire(caster, targets, outcomes, onImpact, areaBounds) {
        const ctx = prepareAoeEntries(caster, targets, outcomes, areaBounds);
        if (!ctx) return null;
        const { fromRect, entries, area, stageW, stageH } = ctx;
        const T = IDENTITY_TIMINGS.aoeFire, owner = identityRun(T.totalMs, 2), uid = ++S.uid;

        // 1. 蓄势（0~350ms）：施法侧螺旋火流收束压缩
        idSfx(owner, () => {
            whoosh(0, { type: 'bandpass', f0: 260, f1: 1100, q: 1.4, dur: 0.32, vol: 0.34, cut: true });
            tone(0.02, { type: 'sawtooth', f0: 90, f1: 210, dur: 0.3, vol: 0.08, lp: 900 });
        });
        owner.burst(26, () => { const ang = Math.random() * 6.283, d = rnd(58, 130); return { x: fromRect.x + Math.cos(ang) * d, y: fromRect.y + Math.sin(ang) * d, vx: -Math.cos(ang) * d / 10, vy: -Math.sin(ang) * d / 10, drag: 0.88, decay: 0.068, size: rnd(6, 11), shape: 'flame', color: pick(['#f97316', '#ef4444', '#fbbf24']) }; });
        const chgLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${fromRect.x}px;top:${fromRect.y}px;width:128px;height:128px;transform:translate(-50%,-50%);">
            <svg viewBox="-64 -64 128 128" class="w-full h-full arcane-identity-glow-fire">
              <path class="id-afw-swirl" d="M-48,0 A48,48 0 0,1 48,0 A36,36 0 0,1 -32,12" fill="none" stroke="#fb923c" stroke-width="5" stroke-linecap="round"/>
              <circle class="id-afw-core" r="22" fill="#f97316" opacity="0.85"/><circle r="9" fill="#fff7d6"/>
            </svg>
          </div>`);
        owner.anim(chgLayer.querySelector('.id-afw-swirl'), [{ transform: 'rotate(0deg) scale(1.3)', opacity: 0.25 }, { transform: 'rotate(240deg) scale(0.32)', opacity: 1 }], { duration: T.chargeMs, fill: 'forwards' });
        owner.anim(chgLayer.querySelector('.id-afw-core'), [{ transform: 'scale(0.3)', opacity: 0.4 }, { transform: 'scale(1.18)', opacity: 1, offset: 0.75 }, { transform: 'scale(0.36)', opacity: 1 }], { duration: T.chargeMs, fill: 'forwards' });

        // 2. 爆发（350ms）：面状火浪横向席卷目标区 + 各目标错峰小爆点
        owner.at(T.chargeMs, () => {
            chgLayer.remove();
            idSample(owner, 'fire01', { vol: 0.88, maxDurSec: 1.0, fadeOutSec: 0.26 }) || idSfx(owner, () => {
                whoosh(0, { type: 'lowpass', f0: 1400, f1: 280, q: 0.9, dur: 0.58, vol: 0.55 });
                boom(0.05, { f0: 1800, f1: 120, dur: 0.65, vol: 0.42, wet: 0.25 });
            });
            const waveW = areaBounds ? stageW : Math.max(stageW * 1.15, 360), waveH = areaBounds ? stageH : Math.max(stageH * 0.92, 136);
            const waveLayer = owner.layer(`
              <div class="arcane-identity-anchor" style="left:${area.x}px;top:${area.y}px;width:${waveW}px;height:${waveH}px;transform:translate(-50%,-50%);">
                <svg viewBox="${-waveW / 2} ${-waveH / 2} ${waveW} ${waveH}" class="w-full h-full arcane-identity-glow-fire" style="overflow:visible;">
                  <defs><linearGradient id="id-afw-g-${uid}" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stop-color="#ea580c" stop-opacity="0"/><stop offset="38%" stop-color="#f97316" stop-opacity="0.88"/><stop offset="78%" stop-color="#fde047" stop-opacity="0.96"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0.8"/></linearGradient></defs>
                  <g class="id-afw-billow">
                    <path d="M${-waveW * 0.5},${waveH * 0.16} Q${-waveW * 0.14},${-waveH * 0.42} ${waveW * 0.36},${-waveH * 0.14} Q${waveW * 0.52},0 ${waveW * 0.32},${waveH * 0.26} Q${-waveW * 0.12},${waveH * 0.46} ${-waveW * 0.5},${waveH * 0.16} Z" fill="url(#id-afw-g-${uid})"/>
                    <path d="M${-waveW * 0.34},6 Q${waveW * 0.08},${-waveH * 0.28} ${waveW * 0.42},0 Q${waveW * 0.06},${waveH * 0.22} ${-waveW * 0.34},6 Z" fill="#fef08a" opacity="0.65"/>
                  </g>
                </svg>
              </div>`);
            owner.anim(waveLayer.querySelector('.id-afw-billow'), [
                { transform: `translateX(${-waveW * 0.42}px) scaleX(0.35) scaleY(0.7)`, opacity: 0 },
                { transform: 'translateX(0px) scaleX(1.06) scaleY(1.04)', opacity: 1, offset: 0.42 },
                { transform: `translateX(${waveW * 0.28}px) scaleX(1.16) scaleY(0.65)`, opacity: 0 }
            ], { duration: 480, easing: 'cubic-bezier(0.16,0.85,0.28,1)', fill: 'forwards' });
            const heatL = owner.layer(`<div class="arcane-identity-anchor" style="left:${area.x}px;top:${area.b - 6}px;width:${waveW}px;height:60px;transform:translate(-50%,-50%);"><div class="id-afw-heat" style="width:100%;height:100%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(251,146,60,0.55),rgba(220,38,38,0.25) 45%,transparent 72%);"></div></div>`);
            owner.anim(heatL.querySelector('.id-afw-heat'), [{ transform: 'scaleX(0.3)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.3 }, { transform: 'scaleX(1.05)', opacity: 0.6, offset: 0.7 }, { transform: 'scaleX(1.08)', opacity: 0 }], { duration: 950, fill: 'forwards' });

            entries.forEach((e, idx) => {
                const stag = 60 + Math.round(e.tFrac * 180);
                owner.at(stag, () => {
                    if (onImpact) onImpact(e.entity, { subtype: '火焰', scope: 'aoe', outcome: e.outcome, point: e.dest, beatMs: T.chargeMs + stag });
                    if (e.dodged) {
                        owner.burst(5, () => ({ x: e.dest.x, y: e.dest.y, vx: rnd(1, 3), vy: rnd(-2, -0.5), decay: 0.06, size: rnd(7, 12), shape: 'flame', color: '#fb923c' }));
                        return;
                    }
                    owner.burst(8, () => ({ x: e.rect.x + rnd(-16, 16), y: e.rect.y + rnd(-10, 14), vx: rnd(-1.6, 1.6), vy: rnd(-3.4, -1.0), drag: 0.94, decay: 0.036, size: rnd(9, 17), shape: 'flame', color: pick(['#fde047', '#fb923c', '#ef4444']) }));
                    owner.burst(10, () => ({ x: e.rect.x + rnd(-18, 18), y: e.rect.y + rnd(-8, 12), vx: rnd(-1.2, 2.2), vy: rnd(-3.8, -1.2), grav: -0.02, drag: 0.96, decay: 0.024, size: rnd(1.3, 2.5), color: pick(['#fef9c3', '#fdba74']) }));
                });
            });
            // 3. 余韵（贴地残焰与火星上飘）
            owner.at(320, () => {
                owner.burst(22, () => ({ x: area.x + rnd(-area.w * 0.48, area.w * 0.48), y: area.b - rnd(0, 18), vx: rnd(-0.6, 1.0), vy: rnd(-2.2, -0.6), grav: -0.02, drag: 0.97, decay: 0.018, size: rnd(1.4, 2.8), color: pick(['#fde047', '#fb923c', '#ffffff']) }));
                owner.burst(8, () => ({ x: area.x + rnd(-area.w * 0.44, area.w * 0.44), y: area.b - 6, vx: rnd(-0.4, 0.4), vy: rnd(-0.9, -0.3), drag: 0.985, decay: 0.015, size: rnd(14, 24), shape: 'smoke', blend: 'source-over', color: 'rgba(68,64,60,0.45)' }));
            });
        });
        return owner.handle;
    }

    // ===== 9. 群攻(枪击)补齐：短起手枪口闪光 + 扇形高速曳光齐射各目标 + 错峰弹着、抛壳与硝烟 =====
    function playAoeGunshot(caster, targets, outcomes, onImpact) {
        const ctx = prepareAoeEntries(caster, targets, outcomes);
        if (!ctx) return null;
        const { fromRect, entries, area } = ctx;
        const T = IDENTITY_TIMINGS.aoeGun, owner = identityRun(T.totalMs, 2), uid = ++S.uid;
        const gBase = computeLineGeom(fromRect, { x: area.x, y: area.y, w: area.w, h: area.h }, false);

        idSample(owner, 'aoe_gun_burst_fs482122', { vol: 0.9, maxDurSec: 1.2, fadeOutSec: 0.24 }) || idSfx(owner, () => {
            for (let k = 0; k < 5; k++) { click(0.14 + k * 0.09, 0.65, 3600); crunch(0.14 + k * 0.09, { f: 1800, f1: 550, q: 1.0, dur: 0.07, vol: 0.42 }); }
        });

        const muzzleLayer = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${gBase.muzzle.x}px;top:${gBase.muzzle.y}px;width:96px;height:96px;transform:translate(-50%,-50%);animation:arcane-identity-gun-flash 0.24s ease-out both;">
            <svg viewBox="0 0 100 100" class="w-full h-full arcane-identity-glow-gun"><circle cx="50" cy="50" r="38" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="12 6" opacity="0.75"/><polygon points="50,12 58,40 88,50 58,60 50,88 42,60 12,50 42,40" fill="#fde047"/><circle cx="50" cy="50" r="14" fill="#ffffff"/></svg>
          </div>`);
        void muzzleLayer;

        entries.forEach((e, idx) => {
            const shotDelay = 120 + idx * 65;
            const endPt = e.dodged ? { x: e.dest.x + e.g.ux * 90, y: e.dest.y + e.g.uy * 90 } : e.dest;
            const rdx = endPt.x - gBase.muzzle.x, rdy = endPt.y - gBase.muzzle.y;
            const len = Math.max(40, Math.hypot(rdx, rdy)), ang = Math.atan2(rdy, rdx) * 180 / Math.PI, pkt = Math.min(len * 0.5, 130);
            owner.at(shotDelay, () => {
                // 抛壳 + 枪口小焰 + 高速曳光射线
                owner.addP({ x: gBase.muzzle.x, y: gBase.muzzle.y, vx: -e.g.nx * rnd(1.8, 3.6) + rnd(-0.8, 0.8), vy: rnd(-4.2, -2.2), grav: 0.28, drag: 0.98, rot: rnd(0, 6), vr: rnd(-0.35, 0.35), decay: 0.025, size: 3.2, shape: 'shell', blend: 'source-over', color: '#fbbf24' });
                const rayL = owner.layer(`
                  <div class="arcane-identity-anchor" style="left:${gBase.muzzle.x}px;top:${gBase.muzzle.y}px;width:${len}px;height:14px;transform:translate(0,-50%) rotate(${ang.toFixed(1)}deg);transform-origin:0 50%;">
                    <div class="id-agn-trace" style="position:absolute;inset:0;pointer-events:none;-webkit-mask-image:linear-gradient(90deg,transparent 0%,black 22%,black 90%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0%,black 22%,black 90%,transparent 100%);">
                      <svg viewBox="0 0 ${len} 14" class="w-full h-full arcane-identity-glow-gun" style="overflow:visible;">
                        <line x1="0" y1="7" x2="${len}" y2="7" stroke="rgba(253,224,71,0.42)" stroke-width="1.3" stroke-dasharray="10 8" stroke-linecap="round"/>
                      </svg>
                    </div>
                    <svg viewBox="0 0 ${len} 14" class="w-full h-full arcane-identity-glow-gun" style="position:relative;overflow:visible;">
                      <defs><linearGradient id="id-agn-${uid}-${idx}"><stop offset="0%" stop-color="#f59e0b" stop-opacity="0"/><stop offset="60%" stop-color="#fde047"/><stop offset="100%" stop-color="#ffffff"/></linearGradient></defs>
                      <polygon class="id-agn-bolt" points="0,5.5 ${pkt * 0.7},3.5 ${pkt},7 ${pkt * 0.7},10.5 0,8.5" fill="url(#id-agn-${uid}-${idx})"/>
                    </svg>
                  </div>`);
                owner.anim(rayL.querySelector('.id-agn-trace'), [
                    { clipPath: 'inset(0 100% 0 0)', opacity: 0.75 },
                    { clipPath: 'inset(0 0% 0 0)', opacity: 0.55, offset: 0.45 },
                    { clipPath: 'inset(0 0% 0 48%)', opacity: 0.22, offset: 0.78 },
                    { clipPath: 'inset(0 0% 0 100%)', opacity: 0 }
                ], { duration: 150, easing: 'ease-out', fill: 'forwards' });
                owner.anim(rayL.querySelector('.id-agn-bolt'), [{ transform: 'translateX(0px)', opacity: 0.9 }, { transform: `translateX(${Math.max(0, len - pkt)}px)`, opacity: 1, offset: 0.78 }, { transform: `translateX(${len}px) scaleX(0.2)`, opacity: 0 }], { duration: 95, easing: 'linear', fill: 'forwards' });
                owner.at(180, () => rayL.remove());

                owner.at(88, () => {
                    if (onImpact) onImpact(e.entity, { subtype: '枪击', scope: 'aoe', outcome: e.outcome, point: e.dest, beatMs: shotDelay + 88 });
                    if (e.dodged) return;
                    owner.addP({ x: e.dest.x, y: e.dest.y, shape: 'ring', size: 0.95, decay: 0.1, color: '#fde047' });
                    owner.layer(`
                      <div class="arcane-identity-anchor" style="left:${e.dest.x}px;top:${e.dest.y}px;width:96px;height:96px;animation:arcane-identity-gun-flash 0.24s ease-out both;">
                        <svg viewBox="0 0 100 100" class="w-full h-full arcane-identity-glow-gun"><polygon points="50,18 55,44 82,50 55,56 50,82 45,56 18,50 45,44" fill="#fde047"/><polygon points="24,24 47,47 76,24 53,47 76,76 53,53 24,76 47,53" fill="#fb923c" opacity="0.8"/><circle cx="50" cy="50" r="10" fill="#ffffff"/></svg>
                      </div>`);
                    owner.burst(10, () => { const an = Math.random() * 6.283, s = rnd(2.2, 6.2); return { x: e.dest.x, y: e.dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.91, decay: 0.05, size: rnd(1.3, 2.2), shape: 'streak', color: pick(['#fef08a', '#ffffff', '#f59e0b']) }; });
                    owner.burst(4, () => ({ x: e.dest.x + rnd(-12, 12), y: e.dest.y + rnd(-10, 10), vx: rnd(-0.3, 0.3), vy: rnd(-1.1, -0.4), drag: 0.98, decay: 0.015, size: rnd(12, 18), shape: 'smoke', blend: 'source-over', color: 'rgba(100,116,139,0.42)' }));
                });
            });
        });
        return owner.handle;
    }
    // ===== 10. 群攻(毒雾)新增：毒核鼓胀蓄势 → 黏稠腐蚀绿雾翻涌覆盖 + 气泡破裂/毒液下坠 → 下沉消散残痕 =====
    function playAoePoison(caster, targets, outcomes, onImpact) {
        const ctx = prepareAoeEntries(caster, targets, outcomes);
        if (!ctx) return null;
        const { fromRect, entries, area, stageW, stageH } = ctx;
        const T = IDENTITY_TIMINGS.aoePoison, owner = identityRun(T.totalMs, 2), uid = ++S.uid;

        idSample(owner, 'aoe_poison_spell_fs219566', { vol: 0.88, maxDurSec: 1.4, fadeOutSec: 0.28 }) || idSfx(owner, () => {
            drone(0, { f0: 68, f1: 112, lp0: 260, lp1: 920, dur: 0.34, vol: 0.14 });
            whoosh(0.34, { type: 'lowpass', f0: 1200, f1: 320, q: 1.8, dur: 0.8, vol: 0.42 });
        });
        const coreL = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${fromRect.x}px;top:${fromRect.y}px;width:96px;height:96px;transform:translate(-50%,-50%);">
            <svg viewBox="-48 -48 96 96" class="w-full h-full arcane-identity-glow-venom">
              <path class="id-ap-orb" d="M-26,-8 Q-6,-32 22,-18 Q36,2 18,26 Q-12,32 -28,12 Z" fill="#65a30d" opacity="0.86"/>
              <circle class="id-ap-orb2" cx="4" cy="-2" r="14" fill="#bef264" opacity="0.72"/>
            </svg>
          </div>`);
        owner.anim(coreL.querySelector('.id-ap-orb'), [{ transform: 'scale(0.3) rotate(0deg)', opacity: 0.2 }, { transform: 'scale(1.24) rotate(25deg)', opacity: 1, offset: 0.72 }, { transform: 'scale(0.55) rotate(45deg)', opacity: 0.9 }], { duration: T.chargeMs, fill: 'forwards' });
        owner.burst(18, () => { const an = Math.random() * 6.283, d = rnd(40, 96); return { x: fromRect.x + Math.cos(an) * d, y: fromRect.y + Math.sin(an) * d, vx: -Math.cos(an) * d / 11, vy: -Math.sin(an) * d / 11, decay: 0.075, size: rnd(2.4, 4.2), shape: 'droplet', blend: 'source-over', color: pick(['#84cc16', '#bef264']) }; });

        owner.at(T.chargeMs, () => {
            coreL.remove();
            const rw = Math.max(stageW * 1.08, 300), rh = Math.max(stageH * 0.95, 160);
            const cloudLayer = owner.layer(`
              <div class="arcane-identity-anchor" style="left:${area.x}px;top:${area.y}px;width:${rw}px;height:${rh}px;transform:translate(-50%,-50%);">
                <svg viewBox="${-rw / 2} ${-rh / 2} ${rw} ${rh}" class="w-full h-full arcane-identity-glow-venom" style="overflow:visible;">
                  <defs><radialGradient id="id-apg-${uid}"><stop offset="0%" stop-color="#84cc16" stop-opacity="0.58"/><stop offset="55%" stop-color="#4d7c0f" stop-opacity="0.46"/><stop offset="100%" stop-color="#1a2e05" stop-opacity="0"/></radialGradient></defs>
                  <ellipse class="id-ap-stain" cx="0" cy="${rh * 0.34}" rx="${rw * 0.44}" ry="${rh * 0.22}" fill="#65a30d" opacity="0"/>
                  <g class="id-ap-cloud">
                    <ellipse cx="${-rw * 0.18}" cy="-4" rx="${rw * 0.28}" ry="${rh * 0.38}" fill="url(#id-apg-${uid})"/>
                    <ellipse cx="${rw * 0.16}" cy="6" rx="${rw * 0.30}" ry="${rh * 0.40}" fill="url(#id-apg-${uid})"/>
                    <ellipse cx="0" cy="-12" rx="${rw * 0.36}" ry="${rh * 0.36}" fill="#84cc16" opacity="0.22"/>
                    <path d="M${-rw * 0.32},${rh * 0.12} Q${-rw * 0.08},${-rh * 0.24} ${rw * 0.12},${rh * 0.08} T${rw * 0.34},${-rh * 0.1}" fill="none" stroke="#bef264" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
                    <path d="M${-rw * 0.24},${-rh * 0.08} Q0,${rh * 0.22} ${rw * 0.26},${-rh * 0.06}" fill="none" stroke="#ecfccb" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>
                  </g>
                </svg>
              </div>`);
            owner.anim(cloudLayer.querySelector('.id-ap-cloud'), [
                { transform: 'scale(0.35) translateY(-10px)', opacity: 0 },
                { transform: 'scale(1.06) translateY(0px)', opacity: 0.95, offset: 0.35 },
                { transform: 'scale(1.12) translateY(8px)', opacity: 0.85, offset: 0.68 },
                { transform: 'scale(1.02) translateY(28px)', opacity: 0 }
            ], { duration: 960, fill: 'forwards' });
            owner.anim(cloudLayer.querySelector('.id-ap-stain'), [
                { opacity: 0, transform: 'scale(0.6)' }, { opacity: 0.45, transform: 'scale(1.02)', offset: 0.42 }, { opacity: 0.28, transform: 'scale(1.06)', offset: 0.72 }, { opacity: 0, transform: 'scale(1.1)' }
            ], { duration: 1050, fill: 'forwards' });

            const bubbleTimer = owner.every(65, () => {
                owner.burst(2, () => ({ x: area.x + rnd(-area.w * 0.44, area.w * 0.44), y: area.y + rnd(-area.h * 0.32, area.h * 0.25), vx: rnd(-0.35, 0.35), vy: rnd(-1.1, -0.3), decay: 0.045, size: rnd(0.28, 0.52), shape: 'ring', color: '#bef264' }));
                owner.burst(2, () => ({ x: area.x + rnd(-area.w * 0.45, area.w * 0.45), y: area.y + rnd(-area.h * 0.2, area.h * 0.15), vx: rnd(-0.3, 0.3), vy: rnd(0.8, 2.2), grav: 0.14, decay: 0.042, size: rnd(2.2, 3.8), shape: 'droplet', blend: 'source-over', color: pick(['#84cc16', '#65a30d']) }));
                owner.addP({ x: area.x + rnd(-area.w * 0.42, area.w * 0.42), y: area.y + rnd(-16, 14), vx: rnd(-0.4, 0.4), vy: rnd(0.15, 0.55), drag: 0.985, decay: 0.016, size: rnd(18, 30), shape: 'smoke', blend: 'source-over', color: 'rgba(101,163,13,0.28)' });
            });
            owner.at(680, () => { stopEvery(bubbleTimer); owner.intervals.delete(bubbleTimer); });

            entries.forEach(e => {
                const stag = 75 + Math.round(e.tFrac * 180);
                owner.at(stag, () => {
                    if (onImpact) onImpact(e.entity, { subtype: '毒雾', scope: 'aoe', outcome: e.outcome, point: e.dest, beatMs: T.chargeMs + stag });
                    if (e.dodged) {
                        owner.addP({ x: e.rect.x, y: e.rect.y, shape: 'ring', size: 1.0, decay: 0.09, color: '#bef264' });
                        return;
                    }
                    owner.burst(7, () => ({ x: e.rect.x + rnd(-16, 16), y: e.rect.y + rnd(-10, 12), vx: rnd(-0.8, 0.8), vy: rnd(-1.4, 0.6), grav: 0.1, decay: 0.036, size: rnd(2.2, 3.6), shape: 'droplet', blend: 'source-over', color: '#a3e635' }));
                });
            });
        });
        return owner.handle;
    }

    // ===== 11. 群攻(冰霜)新增：上方多枚冰晶阵列蓄势 → 冰锥雨错峰砸落 + 横向冻结波结霜微光 → 晶簇崩裂沉降 =====
    function playAoeFrost(caster, targets, outcomes, onImpact, areaBounds) {
        const ctx = prepareAoeEntries(caster, targets, outcomes, areaBounds);
        if (!ctx) return null;
        const { fromRect, entries, area, stageW, stageH } = ctx;
        const T = IDENTITY_TIMINGS.aoeFrost, owner = identityRun(T.totalMs, 2), uid = ++S.uid;

        idSfx(owner, () => {
            for (let k = 0; k < 4; k++) crystal(k * 0.06, 1760 + k * 240, 0.07);
            whoosh(0.02, { type: 'highpass', f0: 1400, f1: 4200, dur: 0.31, vol: 0.2 });
        });
        const arrayBase = { x: fromRect.x, y: Math.max(46, fromRect.top - 22) };
        const iconsHtml = [-48, -24, 0, 24, 48].map((dx, i) => `<polygon class="id-afr-c" points="${dx},${-8 - (i % 2) * 8} ${dx - 5},6 ${dx},22 ${dx + 5},6" fill="${i % 2 ? '#e0f2fe' : '#bae6fd'}" stroke="#ffffff" stroke-width="0.9"/>`).join('');
        const prepL = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${arrayBase.x}px;top:${arrayBase.y}px;width:130px;height:68px;transform:translate(-50%,-50%);">
            <svg viewBox="-65 -34 130 68" class="w-full h-full arcane-identity-glow-frost"><ellipse cx="0" cy="6" rx="58" ry="12" fill="none" stroke="#7dd3fc" stroke-width="1.4" stroke-dasharray="8 5" opacity="0.8"/>${iconsHtml}</svg>
          </div>`);
        owner.anim(prepL.firstElementChild, [{ transform: 'translate(-50%,-50%) scale(0.35)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 1, offset: 0.72 }, { transform: 'translate(-50%,-50%) scale(0.82)', opacity: 0.9 }], { duration: T.chargeMs, fill: 'forwards' });
        owner.burst(20, () => { const an = Math.random() * 6.283, d = rnd(44, 98); return { x: arrayBase.x + Math.cos(an) * d, y: arrayBase.y + Math.sin(an) * d, vx: -Math.cos(an) * d / 10, vy: -Math.sin(an) * d / 10, decay: 0.075, size: rnd(2.2, 3.8), shape: 'frostShard', color: '#e0f2fe' }; });

        owner.at(T.chargeMs, () => {
            prepL.remove();
            idSample(owner, 'freeze01', { vol: 0.9, maxDurSec: 1.0, fadeOutSec: 0.26 }) || idSfx(owner, () => {
                crunch(0.08, { f: 2800, f1: 1100, q: 1.5, dur: 0.25, vol: 0.45 });
                crystal(0.12, 2637, 0.12);
            });
            // 横向冻结波扫过目标矩形区
            const fWave = owner.layer(`
              <div class="arcane-identity-anchor" style="left:${area.x}px;top:${area.y}px;width:${stageW}px;height:${areaBounds ? stageH : Math.max(88, stageH * 0.68)}px;transform:translate(-50%,-50%);">
                <svg viewBox="${-stageW / 2} -44 ${stageW} 88" class="w-full h-full arcane-identity-glow-frost" style="overflow:visible;">
                  <defs><linearGradient id="id-afr-w-${uid}" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/><stop offset="45%" stop-color="#bae6fd" stop-opacity="0.72"/><stop offset="80%" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="100%" stop-color="#7dd3fc" stop-opacity="0"/></linearGradient></defs>
                  <path class="id-afr-sweep" d="M${-stageW * 0.48},0 Q0,-36 ${stageW * 0.48},0 Q0,36 ${-stageW * 0.48},0 Z" fill="url(#id-afr-w-${uid})"/>
                </svg>
              </div>`);
            owner.anim(fWave.querySelector('.id-afr-sweep'), [{ transform: 'scaleX(0.18)', opacity: 0 }, { transform: 'scaleX(1.06)', opacity: 0.95, offset: 0.45 }, { transform: 'scaleX(1.22)', opacity: 0 }], { duration: 480, delay: 90, fill: 'forwards' });

            // 错峰冰锥雨砸向各目标
            const trackedFrostDoms = [];
            owner.onClean(() => trackedFrostDoms.forEach(d => d && d.classList.remove('arcane-identity-frost-rim')));
            entries.forEach((e, idx) => {
                const dropStartDelay = idx * 48;
                const dest = e.dodged ? { x: e.dest.x, y: e.rect.bottom - 6 } : e.dest;
                const dropFrom = { x: dest.x - 42, y: Math.max(24, dest.y - 165) };
                const deg = Math.atan2(dest.y - dropFrom.y, dest.x - dropFrom.x) * 180 / Math.PI;
                owner.at(dropStartDelay, () => {
                    const icicleL = owner.layer(`
                      <div class="arcane-identity-anchor id-afr-drop" style="left:${dropFrom.x}px;top:${dropFrom.y}px;width:54px;height:22px;transform:translate(-50%,-50%) rotate(${deg.toFixed(1)}deg);">
                        <svg viewBox="-32 -11 54 22" class="w-full h-full arcane-identity-glow-frost"><polygon points="-28,0 -6,-7 22,0 -6,7" fill="#e0f2fe" stroke="#ffffff" stroke-width="0.9"/></svg>
                      </div>`);
                    const icEl = icicleL.querySelector('.id-afr-drop');
                    owner.fly(dropFrom, dest, 0, 145, (x, y) => {
                        icEl.style.left = x + 'px'; icEl.style.top = y + 'px';
                    }, () => {
                        icicleL.remove();
                        const beatMs = T.chargeMs + dropStartDelay + 145;
                        if (onImpact) onImpact(e.entity, { subtype: '冰霜', scope: 'aoe', outcome: e.outcome, point: dest, beatMs });
                        if (!e.dodged) {
                            e.rect.dom.classList.add('arcane-identity-frost-rim');
                            trackedFrostDoms.push(e.rect.dom);
                        }
                        const spireL = owner.layer(`<div class="arcane-identity-anchor id-afr-sp" style="left:${dest.x}px;top:${dest.y + 10}px;width:76px;height:68px;transform:translate(-50%,-75%);"><svg viewBox="-38 -52 76 68" class="w-full h-full arcane-identity-glow-frost"><polygon points="-22,12 -14,-28 -4,12" fill="#bae6fd" stroke="#fff" stroke-width="0.8"/><polygon points="-8,14 0,-46 10,14" fill="#e0f2fe" stroke="#fff" stroke-width="1"/><polygon points="6,12 18,-24 24,12" fill="#7dd3fc" stroke="#fff" stroke-width="0.8"/></svg></div>`);
                        owner.anim(spireL.querySelector('.id-afr-sp'), [{ transform: 'translate(-50%,-75%) scaleY(0.1)', opacity: 0 }, { transform: 'translate(-50%,-75%) scaleY(1.08)', opacity: 0.95, offset: 0.25 }, { transform: 'translate(-50%,-75%) scaleY(1)', opacity: 0.85, offset: 0.65 }, { transform: 'translate(-50%,-75%) scale(1.18,0.4)', opacity: 0 }], { duration: 420, fill: 'forwards' });
                        owner.burst(e.dodged ? 6 : 14, () => { const an = Math.random() * 6.283, s = rnd(1.8, 6.2); return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 0.8, grav: 0.16, drag: 0.94, rot: rnd(0, 6), vr: rnd(-0.2, 0.2), decay: 0.032, size: rnd(2.4, 4.6), shape: 'frostShard', color: pick(['#ffffff', '#bae6fd', '#7dd3fc']) }; });
                    }, k => k * k);
                });
            });
            owner.at(320, () => {
                owner.burst(14, () => ({ x: area.x + rnd(-area.w * 0.48, area.w * 0.48), y: area.b - rnd(-4, 14), vx: rnd(-0.5, 0.5), vy: rnd(0.2, 0.65), drag: 0.985, decay: 0.015, size: rnd(16, 28), shape: 'smoke', blend: 'source-over', color: 'rgba(186,230,253,0.34)' }));
            });
        });
        return owner.handle;
    }
    // ===== 12. 群攻(风)新增：气流旋聚卷尘 → 多条贝塞尔弯曲风刃与螺旋风涡错峰横扫（非大亮球/不靠重震）→ 尘屑卷走衰减 =====
    function playAoeWind(caster, targets, outcomes, onImpact) {
        const ctx = prepareAoeEntries(caster, targets, outcomes);
        if (!ctx) return null;
        const { fromRect, entries, area, stageW, stageH } = ctx;
        const T = IDENTITY_TIMINGS.aoeWind, owner = identityRun(T.totalMs, 2);

        // 1. 蓄势（0~350ms）：气流旋聚，目标下方尘屑起风螺旋卷动
        idSample(owner, 'aoe_wind_spin_fs772867', { vol: 0.88, maxDurSec: 1.32, fadeOutSec: 0.26 }) || idSfx(owner, () => {
            whoosh(0, { type: 'bandpass', f0: 420, f1: 1600, q: 2.2, dur: 0.34, vol: 0.28, cut: true });
            whoosh(0.35, { type: 'bandpass', f0: 1400, f1: 2800, q: 1.8, dur: 0.65, vol: 0.44 });
        });
        const swFrom = owner.layer(`
          <div class="arcane-identity-anchor" style="left:${fromRect.x}px;top:${fromRect.y}px;width:120px;height:120px;transform:translate(-50%,-50%);">
            <svg viewBox="-60 -60 120 120" class="w-full h-full arcane-identity-glow-wind">
              <path class="id-aw-spin" d="M-44,0 A44,44 0 0,1 44,0 A28,28 0 0,1 -24,14 A14,14 0 0,1 14,-6" fill="none" stroke="#a7f3d0" stroke-width="2.4" stroke-linecap="round"/>
            </svg>
          </div>`);
        owner.anim(swFrom.querySelector('.id-aw-spin'), [{ transform: 'rotate(0deg) scale(1.25)', opacity: 0.2 }, { transform: 'rotate(360deg) scale(0.45)', opacity: 0.95, offset: 0.8 }, { transform: 'rotate(460deg) scale(0.2)', opacity: 0 }], { duration: T.chargeMs, fill: 'forwards' });
        const dustTimer = owner.every(55, () => {
            owner.burst(3, () => {
                const px = area.x + rnd(-area.w * 0.5, area.w * 0.5), py = area.b - rnd(-8, 22);
                return { x: px, y: py, vx: rnd(1.8, 3.6), vy: rnd(-2.2, -0.5), drag: 0.96, decay: 0.042, size: rnd(2.2, 4.0), shape: 'dust', color: pick(['#a7f3d0', '#e2e8f0', '#6ee7b7']) };
            });
        });

        // 2. 爆发（350~860ms）：多条贝塞尔弯曲风刃 + 横向螺旋旋涡卷过目标矩形区
        owner.at(T.chargeMs, () => {
            swFrom.remove();
            stopEvery(dustTimer); owner.intervals.delete(dustTimer);
            const blades = [-0.36, -0.18, 0, 0.18, 0.34].map((yf, idx) => {
                const y0 = stageH * yf, bend = (idx % 2 ? -1 : 1) * stageH * 0.24;
                const d = `M${-stageW * 0.52},${(y0 + bend * 0.4).toFixed(1)} Q0,${(y0 - bend).toFixed(1)} ${stageW * 0.52},${(y0 + bend * 0.2).toFixed(1)}`;
                return `<g><path class="id-aw-blade" data-idx="${idx}" d="${d}" fill="none" stroke="${idx % 2 ? '#ecfdf5' : '#6ee7b7'}" stroke-width="${idx === 2 ? 5.2 : 3.2}" stroke-linecap="round" pathLength="1" style="stroke-dasharray:0.42 1;stroke-dashoffset:0.48;opacity:0;"/></g>`;
            }).join('');
            const vortexPath = `M${-stageW * 0.44},0 C${-stageW * 0.28},${-stageH * 0.34} ${stageW * 0.12},${stageH * 0.32} ${stageW * 0.44},-6 C${stageW * 0.22},${-stageH * 0.26} ${-stageW * 0.14},${stageH * 0.26} ${-stageW * 0.36},8`;
            const windLayer = owner.layer(`
              <div class="arcane-identity-anchor" style="left:${area.x}px;top:${area.y}px;width:${stageW}px;height:${stageH}px;transform:translate(-50%,-50%);">
                <svg viewBox="${-stageW / 2} ${-stageH / 2} ${stageW} ${stageH}" class="w-full h-full arcane-identity-glow-wind" style="overflow:visible;">
                  <path class="id-aw-vortex" d="${vortexPath}" fill="none" stroke="#99f6e4" stroke-width="2.6" stroke-linecap="round" pathLength="1" opacity="0.72" style="stroke-dasharray:0.55 1;stroke-dashoffset:0.6;"/>
                  ${blades}
                </svg>
              </div>`);
            owner.anim(windLayer.querySelector('.id-aw-vortex'), [{ strokeDashoffset: 0.65, opacity: 0 }, { strokeDashoffset: 0.0, opacity: 0.85, offset: 0.4 }, { strokeDashoffset: -0.95, opacity: 0 }], { duration: 640, fill: 'forwards' });
            const crescL = owner.layer([-0.22, 0.04, 0.26].map((yf, i) => `<div class="arcane-identity-anchor id-aw-cres" data-i="${i}" style="left:${area.x - stageW * 0.55}px;top:${area.y + stageH * yf}px;width:70px;height:70px;transform:translate(-50%,-50%);"><svg viewBox="-35 -35 70 70" class="w-full h-full arcane-identity-glow-wind"><path d="M-6,-30 Q30,0 -6,30 Q14,0 -6,-30 Z" fill="#ecfdf5" opacity="0.85"/></svg></div>`).join(''));
            crescL.querySelectorAll('.id-aw-cres').forEach(el => {
                const i = Number(el.dataset.i);
                owner.anim(el, [{ transform: 'translate(-50%,-50%) rotate(0deg) scale(0.6)', opacity: 0 }, { transform: `translate(calc(-50% + ${stageW * 0.55}px),-50%) rotate(360deg) scale(1)`, opacity: 1, offset: 0.5 }, { transform: `translate(calc(-50% + ${stageW * 1.1}px),-50%) rotate(720deg) scale(0.7)`, opacity: 0 }], { duration: 520, delay: i * 70, easing: 'cubic-bezier(0.3,0.6,0.4,1)', fill: 'forwards' });
            });
            windLayer.querySelectorAll('.id-aw-blade').forEach(el => {
                const idx = Number(el.dataset.idx);
                owner.anim(el, [
                    { strokeDashoffset: 0.48, opacity: 0 },
                    { strokeDashoffset: -0.1, opacity: 0.96, offset: 0.38 },
                    { strokeDashoffset: -1.05, opacity: 0 }
                ], { duration: 380, delay: idx * 52, easing: 'cubic-bezier(0.18,0.85,0.32,1)', fill: 'forwards' });
            });

            entries.forEach(e => {
                const stag = 75 + Math.round(e.tFrac * 185);
                owner.at(stag, () => {
                    if (onImpact) onImpact(e.entity, { subtype: '风', scope: 'aoe', outcome: e.outcome, point: e.dest, beatMs: T.chargeMs + stag });
                    owner.burst(e.dodged ? 5 : 10, () => ({ x: e.dest.x + rnd(-10, 10), y: e.dest.y + rnd(-10, 10), vx: rnd(4.2, 8.8), vy: rnd(-2.2, 0.8), drag: 0.94, decay: 0.042, size: rnd(2.0, 3.8), shape: 'dust', color: pick(['#ecfdf5', '#6ee7b7', '#cbd5e1']) }));
                });
            });
            // 3. 余韵：尘屑被横向气流卷走散开
            owner.at(300, () => {
                owner.burst(24, () => ({ x: area.x + rnd(-area.w * 0.45, area.w * 0.45), y: area.y + rnd(-area.h * 0.35, area.h * 0.35), vx: rnd(5.5, 10.5), vy: rnd(-2.4, -0.4), drag: 0.965, decay: 0.025, size: rnd(2.2, 4.0), shape: 'dust', color: pick(['#a7f3d0', '#e2e8f0']) }));
            });
        });
        return owner.handle;
    }

    // ===== 13. 群攻(光)补齐：多个白金光核施法侧成阵 → 齐射飞向各目标绽放光瓣与光屑雨 =====
    function playAoeLight(caster, targets, outcomes, onImpact) {
        const ctx = prepareAoeEntries(caster, targets, outcomes);
        if (!ctx) return null;
        const { fromRect, entries, area } = ctx;
        const T = IDENTITY_TIMINGS.aoeLight, owner = identityRun(T.totalMs, 2), uid = ++S.uid;
        const gBase = computeLineGeom(fromRect, { x: area.x, y: area.y, w: area.w, h: area.h }, false);
        const dirSign = area.y < fromRect.y ? -1 : 1;

        idSfx(owner, () => { crystal(0, 1760, 0.08); crystal(0.1, 2093, 0.08); crystal(0.2, 2637, 0.09); });
        const arrayN = entries.length;
        const launchPts = entries.map((e, i) => {
            const ang = (i - (arrayN - 1) / 2) * 0.24;
            return { x: fromRect.x + Math.sin(ang) * 44 + gBase.ux * 14, y: fromRect.y + dirSign * 22 - Math.cos(ang) * 14 };
        });
        const arrayL = owner.layer(launchPts.map(pt => `
          <div class="arcane-identity-anchor id-alg-node" style="left:${pt.x}px;top:${pt.y}px;width:44px;height:44px;transform:translate(-50%,-50%);">
            <svg viewBox="-22 -22 44 44" class="w-full h-full arcane-identity-glow-light">
              <polygon points="0,-16 3,-3 16,0 3,3 0,16 -3,3 -16,0 -3,-3" fill="#ffffff"/>
              <circle r="6" fill="#fef08a" opacity="0.9"/>
            </svg>
          </div>`).join(''));
        arrayL.querySelectorAll('.id-alg-node').forEach((node, i) => {
            owner.anim(node, [{ transform: 'translate(-50%,-50%) scale(0.15)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 1, offset: 0.72 }, { transform: 'translate(-50%,-50%) scale(0.85)', opacity: 0.9 }], { duration: T.chargeMs, delay: i * 18, fill: 'forwards' });
        });

        owner.at(T.chargeMs, () => {
            arrayL.remove();
            idSfx(owner, () => whoosh(0, { type: 'highpass', f0: 1600, f1: 4200, dur: 0.22, vol: 0.16 }));
            owner.at(320, () => owner.burst(26, () => ({ x: area.x + rnd(-area.w * 0.55, area.w * 0.55), y: area.t - rnd(10, 60), vx: rnd(-0.3, 0.3), vy: rnd(1.2, 2.4), drag: 0.99, decay: 0.016, size: rnd(1, 2), color: pick(['#ffffff', '#fef9c3', '#fde68a']) })));
            entries.forEach((e, idx) => {
                const startPt = launchPts[idx], delay = idx * 32, lift = computeParabolaLift(startPt, e.dest, 46);
                owner.at(delay, () => {
                    const boltL = owner.layer(`
                      <div class="arcane-identity-anchor id-alg-bolt" style="left:${startPt.x}px;top:${startPt.y}px;width:60px;height:28px;transform:translate(-50%,-50%);">
                        <svg viewBox="-38 -14 60 28" class="w-full h-full arcane-identity-glow-light" style="overflow:visible;">
                          <path d="M-36,0 Q-12,-4 6,0 Q-12,4 -36,0 Z" fill="#fef9c3"/><circle cx="7" cy="0" r="6" fill="#ffffff"/>
                        </svg>
                      </div>`);
                    const bEl = boltL.querySelector('.id-alg-bolt'), cx = (startPt.x + e.dest.x) / 2, cy = Math.min(startPt.y, e.dest.y) - lift;
                    owner.fly(startPt, e.dest, lift, T.flightMs, (x, y, pr) => {
                        const tx = (1 - pr) * (cx - startPt.x) + pr * (e.dest.x - cx), ty = (1 - pr) * (cy - startPt.y) + pr * (e.dest.y - cy);
                        bEl.style.left = x + 'px'; bEl.style.top = y + 'px';
                        bEl.style.transform = `translate(-50%,-50%) rotate(${(Math.atan2(ty, tx) * 180 / Math.PI).toFixed(1)}deg)`;
                        if (Math.random() < 0.7) owner.addP({ x, y, decay: 0.12, size: rnd(1.1, 2.0), color: pick(['#ffffff', '#fef9c3', '#e0f2fe']) });
                    }, () => {
                        const beatMs = T.chargeMs + delay + T.flightMs;
                        if (onImpact) onImpact(e.entity, { subtype: '光', scope: 'aoe', outcome: e.outcome, point: e.dest, beatMs });
                        if (idx === 0) idSample(owner, 'light_impact', { vol: 0.88, maxDurSec: 0.72, fadeOutSec: 0.2 }) || idSfx(owner, () => chime(0, 1568, 0.5, 0.09));
                        if (e.dodged) {
                            const outPt = { x: e.dest.x + e.g.ux * 95, y: e.dest.y + e.g.uy * 95 };
                            owner.fly(e.dest, outPt, 6, 150, (x, y, pr) => { bEl.style.left = x + 'px'; bEl.style.top = y + 'px'; bEl.style.opacity = String(1 - pr); }, () => boltL.remove(), k => k);
                            return;
                        }
                        boltL.remove();
                        const petals = [0, 60, 120, 180, 240, 300].map((d, pi) => `<path d="M0,0 C-4,-10 -3,-24 0,-${pi % 2 ? 34 : 46} C3,-24 4,-10 0,0 Z" fill="${pi % 2 ? '#fef08a' : '#ffffff'}" transform="rotate(${d})"/>`).join('');
                        owner.layer(`<div class="arcane-identity-anchor" style="left:${e.dest.x}px;top:${e.dest.y}px;width:120px;height:120px;animation:arcane-identity-bloom 0.36s ease-out both;"><svg viewBox="-60 -60 120 120" class="w-full h-full arcane-identity-glow-light"><circle r="16" fill="#fff"/>${petals}</svg></div>`);
                        owner.burst(14, () => { const an = Math.random() * 6.283, s = rnd(1.2, 4.2); return { x: e.dest.x, y: e.dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s + 0.4, grav: 0.04, drag: 0.95, decay: 0.022, size: rnd(1.1, 2.2), color: pick(['#ffffff', '#fef9c3', '#fde68a']) }; });
                    }, k => k);
                });
            });
        });
        return owner.handle;
    }
    // ===== 命中结果反馈 BEGIN（可移植）=====
    // 输入：{ targetId, outcome:'hit'|'dodge'|'block', maxHp, hpBefore, hpAfter, hpDmg,
    //        shieldBefore, shieldAfter, shieldDmg, isCrit, isBurst, dirX?, dirY? }
    const HIT_HOLD_MS = 450, HIT_COLLAPSE_MS = 500, HIT_STOP_MS = 60, HIT_LIFE_MS = 1320, HIT_HEAL_MS = 320;
    const H = { ghosts: new Map(), stacks: new Map(), handles: new Set() };

    function classifyHit(r) {
        const hpDmg = Math.max(0, r.hpDmg || 0), shieldDmg = Math.max(0, r.shieldDmg || 0);
        const incomingDmg = Math.max(0, r.blockedDmg ?? r.incomingDmg ?? 0);
        let kind;
        if (r.outcome === 'dodge') kind = 'dodge';
        else if (r.outcome === 'prevented') kind = 'prevented';
        else if (r.outcome === 'block' || (hpDmg === 0 && shieldDmg === 0)) kind = 'block';
        else if (hpDmg > 0) kind = 'hp';
        else kind = 'shield';
        const ratio = r.maxHp > 0 ? hpDmg / r.maxHp : 0;
        const tier = kind !== 'hp' ? 0 : ratio < 0.10 ? 1 : ratio < 0.50 ? 2 : 3;
        const inRatio = r.maxHp > 0 ? incomingDmg / r.maxHp : 0;
        const blockTier = r.blockTier || (inRatio < 0.10 ? 1 : inRatio < 0.50 ? 2 : 3);
        const dodgeTier = r.dodgeTier || (inRatio < 0.10 ? 1 : inRatio < 0.50 ? 2 : 3);
        const shieldBroken = shieldDmg > 0 && (r.shieldBefore || 0) > 0 && (r.shieldAfter || 0) === 0;
        const landed = kind === 'hp' || kind === 'shield';
        return { kind, tier, blockTier, dodgeTier, incomingDmg, hpDmg, shieldDmg, shieldBroken, crit: landed && !!r.isCrit, burst: landed && !!r.isBurst };
    }

    function syncHitBar(id, hp, maxHp, force = false) {
        const ghost = document.getElementById(id + '-hp-ghost'), st = H.ghosts.get(id);
        if (!ghost) return;
        if (st && st.el !== ghost) { clearTimeout(st.timer); H.ghosts.delete(id); }
        if (force || !H.ghosts.has(id)) {
            if (force && st) { clearTimeout(st.timer); H.ghosts.delete(id); }
            const fill = document.getElementById(id + '-hp-bar');
            const healing = !force && fill && fill._hpHealTimer;
            ghost.style.transition = healing ? 'width ' + HIT_HEAL_MS + 'ms cubic-bezier(0.2,0.8,0.2,1)' : 'none';
            ghost.style.width = Math.max(0, Math.min(100, hp / maxHp * 100)) + '%';
        } else if (st) {
            st.hpAfter = hp;
            const pct = Math.max(0, Math.min(100, hp / maxHp * 100));
            const width = ghost[__GBCR]().width / (ghost.parentElement[__GBCR]().width || 1) * 100;
            if (pct > width + 0.01) { ghost.style.transition = 'width ' + HIT_HEAL_MS + 'ms cubic-bezier(0.2,0.8,0.2,1)'; ghost.style.width = pct + '%'; }
            else if (st.collapsing) { ghost.style.transition = 'none'; ghost.style.width = pct + '%'; }
        }
    }
    function hitBar(id, hpBefore, hpAfter, maxHp) {
        const fill = document.getElementById(id + '-hp-bar'), ghost = document.getElementById(id + '-hp-ghost');
        if (!fill) return;
        const pct = v => Math.max(0, Math.min(100, v / maxHp * 100));
        clearTimeout(fill._hpHealTimer); fill._hpHealTimer = null;
        fill.style.transition = 'none';
        fill.style.width = pct(hpAfter) + '%';
        fill.classList.remove('arcane-hit-fill-blink'); void fill.offsetWidth; fill.classList.add('arcane-hit-fill-blink');
        if (!ghost) return;
        const st = H.ghosts.get(id);
        const width = st && st.el === ghost ? ghost[__GBCR]().width / (ghost.parentElement[__GBCR]().width || 1) * 100 : pct(hpBefore);
        if (st) clearTimeout(st.timer);
        ghost.style.transition = 'none';
        ghost.style.width = Math.max(pct(hpAfter), width) + '%';
        const next = { el: ghost, timer: null, hpAfter, collapsing: false };
        next.timer = setTimeout(() => {
            if (!ghost.isConnected) { H.ghosts.delete(id); return; }
            next.collapsing = true;
            ghost.style.transition = 'width ' + HIT_COLLAPSE_MS + 'ms cubic-bezier(0.3,0,0.2,1)';
            ghost.style.width = pct(next.hpAfter) + '%';
            next.timer = setTimeout(() => { if (H.ghosts.get(id) === next) H.ghosts.delete(id); }, HIT_COLLAPSE_MS);
        }, HIT_HOLD_MS);
        H.ghosts.set(id, next);
    }

    function stackSlot(id) {
        const now = Date.now(), s = H.stacks.get(id);
        const k = s && now - s.at < 750 ? s.k + 1 : 0;
        H.stacks.set(id, { k, at: now });
        return { dx: [0, 8, -10, 12, -6][k % 5], dy: -Math.min(k, 4) * 24 };
    }
    function hitNumLayer() {
        const d = document.createElement('div');
        d.className = 'arcane-hit-num-layer';
        d.setAttribute('data-arcane-fx', 'hit-num');
        __STAGE.el.appendChild(d);
        S.layers.add(d);
        return d;
    }
    function hitAnchor(dom, slot) {
        const r = entityVisualRect(dom) || ctr(dom), c = ctr(dom);
        let x = r.right - 8 + slot.dx, y = r.top + 12 + slot.dy;
        const menu = document.getElementById('menu-container');
        if (menu) { const m = menu[__GBCR](); if (y > m.top - 28 && x > m.left - 14) x = m.left - 14; }
        const topSafe = x > __STAGE.w - 360 ? 58 : 34;
        return { x: Math.max(100, Math.min(__STAGE.w - 18, x)), y: Math.max(topSafe, y), c };
    }
    function hitNumEl(layer, cls, text, x, y) {
        const el = document.createElement('div');
        el.className = cls; el.textContent = text;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        layer.appendChild(el);
        return el;
    }
    function hitTagEl(layer, cls, text, x, y) {
        const el = document.createElement('div');
        el.className = cls; el.textContent = text;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        layer.appendChild(el);
        return el;
    }
    const T = 'translate(-50%,-50%) ', TN = 'translate(-100%,-18%) ', TT = 'translate(-100%,-50%) ';
    const NUM_KF = {
        1: [{ transform: TN + 'translateY(4px) scale(0.92)', opacity: 0 }, { transform: TN + 'translateY(-3px) scale(1)', opacity: 1, offset: 0.16 }, { transform: TN + 'translateY(-6px) scale(1)', opacity: 1, offset: 0.72 }, { transform: TN + 'translateY(-14px) scale(0.96)', opacity: 0 }],
        2: [{ transform: TN + 'translateY(6px) scale(0.84)', opacity: 0 }, { transform: TN + 'translateY(-4px) scale(1.10)', opacity: 1, offset: 0.14 }, { transform: TN + 'translateY(-6px) scale(1)', opacity: 1, offset: 0.28 }, { transform: TN + 'translateY(-8px) scale(1)', opacity: 1, offset: 0.76 }, { transform: TN + 'translateY(-18px) scale(0.96)', opacity: 0 }],
        3: [{ transform: TN + 'scale(1.26)', opacity: 0 }, { transform: TN + 'translateY(-2px) scale(0.97)', opacity: 1, offset: 0.12 }, { transform: TN + 'translateY(-4px) scale(1.03)', opacity: 1, offset: 0.24 }, { transform: TN + 'translateY(-5px) scale(1)', opacity: 1, offset: 0.78 }, { transform: TN + 'translateY(-16px) scale(0.97)', opacity: 0 }],
        shield: [{ transform: TN + 'scale(0.9)', opacity: 0 }, { transform: TN + 'translateY(-3px) scale(1)', opacity: 1, offset: 0.16 }, { transform: TN + 'translateY(-6px) scale(1)', opacity: 1, offset: 0.72 }, { transform: TN + 'translateY(-14px)', opacity: 0 }],
        block: [{ transform: TN + 'scale(1.14)', opacity: 0 }, { transform: TN + 'scale(1)', opacity: 1, offset: 0.14 }, { transform: TN + 'scale(1)', opacity: 1, offset: 0.7 }, { transform: TN + 'translateY(-8px)', opacity: 0 }],
        dodge: [{ transform: TN + 'translateX(-10px)', opacity: 0 }, { transform: TN + 'translateX(3px)', opacity: 1, offset: 0.18 }, { transform: TN + 'translateX(8px)', opacity: 1, offset: 0.7 }, { transform: TN + 'translate(18px,-6px)', opacity: 0 }],
        tag: [{ transform: TT + 'translateX(-6px) scale(0.88)', opacity: 0 }, { transform: TT + 'translateX(0) scale(1)', opacity: 1, offset: 0.15 }, { transform: TT + 'translateY(-3px) scale(1)', opacity: 1, offset: 0.72 }, { transform: TT + 'translateY(-10px)', opacity: 0 }]
    };
    const NUM_MS = { 1: 1000, 2: 1000, 3: 1200, shield: 1000, block: 1000, dodge: 1000, tag: 1050 };
    function hitCore(layer, x, y, size, inner, outer, ring, ms, anims) {
        const uid = 'arcane-hit-g' + (++S.uid);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arcane-hit-core'); svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.cssText = 'left:' + x + 'px; top:' + y + 'px; width:' + size + 'px; height:' + size + 'px;';
        svg.innerHTML = '<defs><radialGradient id="' + uid + '"><stop offset="0" stop-color="#fff"/><stop offset="0.32" stop-color="' + inner + '"/><stop offset="1" stop-color="' + outer + '" stop-opacity="0"/></radialGradient></defs>'
            + '<circle cx="50" cy="50" r="30" fill="url(#' + uid + ')"/>' + (ring ? '<circle cx="50" cy="50" r="46" fill="none" stroke="' + ring + '" stroke-width="2.6"/>' : '');
        layer.appendChild(svg);
        anims.push(svg.animate([{ transform: T + 'scale(0.3)', opacity: 1 }, { transform: T + 'scale(1)', opacity: 1, offset: 0.35 }, { transform: T + 'scale(1.22)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(0.2,0.8,0.3,1)', fill: 'forwards' }));
    }
    function hitCritSlash(layer, x, y, size, anims) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arcane-hit-core'); svg.setAttribute('viewBox', '0 0 120 120');
        svg.style.cssText = 'left:' + x + 'px; top:' + y + 'px; width:' + size + 'px; height:' + size + 'px;';
        svg.innerHTML = '<path d="M18 102 L60 58 L102 18 L62 62 Z" fill="#fef3c7" opacity="0.82"/>';
        layer.appendChild(svg);
        anims.push(svg.animate([{ transform: T + 'scale(0.4) rotate(-6deg)', opacity: 1 }, { transform: T + 'scale(1.12) rotate(0deg)', opacity: 0.78, offset: 0.3 }, { transform: T + 'scale(1.28) rotate(3deg)', opacity: 0 }], { duration: 210, easing: 'ease-out', fill: 'forwards' }));
    }
    function hitBurstHalo(layer, x, y, size, anims) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arcane-hit-core'); svg.setAttribute('viewBox', '0 0 120 120');
        svg.style.cssText = 'left:' + x + 'px; top:' + y + 'px; width:' + size + 'px; height:' + size + 'px;';
        svg.innerHTML = '<polygon points="60,8 66,52 112,60 66,68 60,112 54,68 8,60 54,52" fill="#fffbeb" opacity="0.92"/><circle cx="60" cy="60" r="36" fill="none" stroke="#fde047" stroke-width="2" stroke-dasharray="6 4"/>';
        layer.appendChild(svg);
        anims.push(svg.animate([{ transform: T + 'scale(0.25) rotate(0deg)', opacity: 1 }, { transform: T + 'scale(1.1) rotate(22deg)', opacity: 0.95, offset: 0.35 }, { transform: T + 'scale(1.4) rotate(45deg)', opacity: 0 }], { duration: 360, easing: 'ease-out', fill: 'forwards' }));
    }
    function hitShieldArc(layer, x, y, w, broken, anims) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arcane-hit-core'); svg.setAttribute('viewBox', '0 0 120 60');
        svg.style.cssText = 'left:' + x + 'px; top:' + y + 'px; width:' + w + 'px; height:' + (w / 2) + 'px;';
        svg.innerHTML = '<path d="M8 54 Q60 -10 112 54" fill="none" stroke="#e0f2fe" stroke-width="3" stroke-linecap="round"/><path d="M18 54 Q60 4 102 54" fill="none" stroke="#7dd3fc" stroke-opacity="0.6" stroke-width="1.5"/>'
            + (broken ? '<path d="M52 14 L58 28 L50 34 L60 50 M66 16 L62 30 L72 38" fill="none" stroke="#fff" stroke-width="2.2"/>' : '');
        layer.appendChild(svg);
        anims.push(svg.animate(broken
            ? [{ transform: T + 'scale(0.9)', opacity: 0 }, { transform: T + 'scale(1)', opacity: 1, offset: 0.2 }, { transform: T + 'scale(1.02)', opacity: 1, offset: 0.4 }, { transform: T + 'scale(1.25,0.8) translateY(14px)', opacity: 0 }]
            : [{ transform: T + 'scale(0.85)', opacity: 0 }, { transform: T + 'scale(1)', opacity: 1, offset: 0.25 }, { transform: T + 'scale(1.06)', opacity: 0 }],
            { duration: broken ? 520 : 420, easing: 'ease-out', fill: 'forwards' }));
    }
    function hitBlockSpark(layer, x, y, anims) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arcane-hit-core'); svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.cssText = 'left:' + x + 'px; top:' + y + 'px; width:74px; height:74px;';
        svg.innerHTML = '<g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M50 14V36M50 64V86M14 50H36M64 50H86"/></g><g stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"><path d="M26 26L38 38M62 62L74 74M74 26L62 38M26 74L38 62"/></g>';
        layer.appendChild(svg);
        anims.push(svg.animate([{ transform: T + 'scale(0.5) rotate(0deg)', opacity: 1 }, { transform: T + 'scale(1.15) rotate(28deg)', opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' }));
    }
    function emitBloodMist(cx, cy, tier, dx = 0.25, dy = -0.35) {
        const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const mistN = tier === 1 ? 2 : tier === 2 ? 6 : 11;
        const dropN = tier === 1 ? 4 : tier === 2 ? 10 : 18;
        const mistColors = ['rgba(153,27,27,0.72)', 'rgba(185,28,28,0.62)', 'rgba(109,15,24,0.78)'];
        burst(mistN, () => {
            const ang = Math.atan2(uy, ux) + rnd(-1.45, 1.45), spd = rnd(0.5, tier === 3 ? 2.4 : 1.5);
            return {
                x: cx + rnd(-12, 12), y: cy + rnd(-10, 10),
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - (tier === 3 ? 0.35 : 0.15),
                grav: 0.015, drag: 0.945, decay: tier === 1 ? 0.032 : tier === 2 ? 0.021 : 0.014,
                size: rnd(tier === 1 ? 15 : 24, tier === 1 ? 22 : tier === 2 ? 36 : 52),
                shape: 'bloodMist', blend: 'source-over', color: pick(mistColors)
            };
        });
        burst(dropN, () => {
            const ang = Math.atan2(uy, ux) + rnd(-1.6, 1.6), spd = rnd(tier === 1 ? 2.2 : 3.2, tier === 3 ? 8.2 : 5.6);
            return {
                x: cx + rnd(-6, 6), y: cy + rnd(-6, 6),
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - rnd(0.8, 2.2),
                grav: tier === 1 ? 0.25 : tier === 2 ? 0.30 : 0.36, drag: 0.96,
                decay: tier === 1 ? 0.045 : tier === 2 ? 0.032 : 0.023,
                size: rnd(tier === 1 ? 1.5 : 2.0, tier === 1 ? 2.2 : tier === 2 ? 3.2 : 4.2),
                shape: 'bloodDrop', blend: 'source-over', color: pick(['#ef4444', '#dc2626', '#991b1b'])
            };
        });
    }
    function hitRecoil(dom, isHero, kind, tier, anims) {
        if (isEntityVariantLocked(dom)) return;
        const dir = isHero ? 1 : -1;
        let kf, ms;
        if (kind === 'dodge') {
            const dx = (Math.random() < 0.5 ? -1 : 1) * 30;
            kf = [{ translate: '0 0' }, { translate: dx + 'px 0', offset: 0.2 }, { translate: dx + 'px 0', offset: 0.55 }, { translate: '0 0' }]; ms = 520;
        } else if (kind === 'block') { kf = [{ translate: '0 0' }, { translate: '0 ' + (dir * 3) + 'px', offset: 0.2 }, { translate: '0 0' }]; ms = 160; }
        else if (kind === 'shield') { kf = [{ translate: '0 0' }, { translate: '0 ' + (dir * 2) + 'px', offset: 0.25 }, { translate: '0 0' }]; ms = 180; }
        else if (tier === 1) { kf = [{ translate: '0 0' }, { translate: '2px ' + (dir * 3) + 'px', offset: 0.2 }, { translate: '-1px 0', offset: 0.5 }, { translate: '0 0' }]; ms = 200; }
        else if (tier === 2) { kf = [{ translate: '0 0', rotate: '0deg' }, { translate: '4px ' + (dir * 10) + 'px', rotate: (dir * -3) + 'deg', offset: 0.18 }, { translate: '-2px ' + (dir * 2) + 'px', rotate: (dir * 1) + 'deg', offset: 0.5 }, { translate: '0 0', rotate: '0deg' }]; ms = 360; }
        else { kf = [{ translate: '0 0', rotate: '0deg' }, { translate: '7px ' + (dir * 19) + 'px', rotate: (dir * -6) + 'deg', offset: 0.14 }, { translate: '6px ' + (dir * 16) + 'px', rotate: (dir * -5) + 'deg', offset: 0.36 }, { translate: '-3px ' + (dir * 3) + 'px', rotate: (dir * 1.5) + 'deg', offset: 0.66 }, { translate: '0 0', rotate: '0deg' }]; ms = 560; }
        dom.classList.add('arcane-hit-recoil');
        const a = dom.animate(kf, { duration: ms, easing: 'cubic-bezier(0.2,0.7,0.3,1)', composite: 'replace' });
        a.onfinish = () => dom.classList.remove('arcane-hit-recoil');
        after(ms + 40, () => dom.classList.remove('arcane-hit-recoil'));
        anims.push(a);
        if (kind === 'hp' && tier >= 2) {
            anims.push(dom.animate([{ filter: 'brightness(2.2) saturate(0)' }, { filter: 'brightness(2.2) saturate(0)', offset: 0.45 }, { filter: 'none', offset: 0.5 }, tier === 3 ? { filter: 'brightness(1.8) saturate(0.3)', offset: 0.75 } : { filter: 'none', offset: 0.75 }, { filter: 'none' }], { duration: tier === 3 ? 230 : 110, easing: 'steps(1)' }));
        }
    }
    function hitDodgeGhost(layer, dom, anims) {
        const r = dom[__GBCR]();
        const isCard = dom.id && dom.id.startsWith('hero-card-');
        const g = document.createElement('div');
        g.style.cssText = 'position:absolute; left:' + r.left + 'px; top:' + r.top + 'px; width:' + r.width + 'px; height:' + r.height + 'px; opacity:0.45; filter:grayscale(1) brightness(1.5); overflow:hidden;' + (isCard ? 'display:block; border-radius:0.25rem;' : 'display:flex; align-items:center; justify-content:center; font-size:' + getComputedStyle(dom).fontSize + ';');
        g.innerHTML = dom.innerHTML.replace(/ id="[^"]*"/g, '');
        layer.appendChild(g);
        anims.push(g.animate([{ opacity: 0.45, transform: 'none' }, { opacity: 0, transform: 'scale(1.06)' }], { duration: 380, easing: 'ease-out', fill: 'forwards' }));
    }
    function hitVisual(layer, r, h, anims, timers) {
        const dom = domOf(r.targetId); if (!dom) return;
        const entity = [...heroesData, ...enemiesData].find(e => e.id === r.targetId);
        const isHero = r.isHero !== undefined ? r.isHero : (entity ? isHeroSideEntity(entity) : String(r.targetId).startsWith('h'));
        const slot = stackSlot(r.targetId), p = hitAnchor(dom, slot), c = p.c;
        const vr = entityVisualRect(dom) || c;
        const cy = vr.top + vr.h * 0.45;
        if (h.kind === 'prevented') return;
        if (h.kind === 'dodge') {
            if (!r.suppressDodgeFx) hitDodgeGhost(layer, dom, anims);
            if (!r.suppressDodgeFx) burst(8, () => ({ x: c.x + rnd(-20, 20), y: c.bottom - 10, vx: rnd(-1.2, 1.2), vy: rnd(-0.8, -0.2), drag: 0.96, decay: 0.03, size: rnd(10, 18), shape: 'smoke', blend: 'source-over', color: 'rgba(148,163,184,0.35)' }));
            if (!r.suppressRecoil && !r.suppressDodgeFx) hitRecoil(dom, isHero, 'dodge', 0, anims);
            const el = hitNumEl(layer, 'arcane-hit-num word dodge', '闪避', p.x, p.y);
            anims.push(el.animate(NUM_KF.dodge, { duration: NUM_MS.dodge, easing: 'ease-out', fill: 'forwards' }));
            return;
        }
        if (h.kind === 'block') {
            hitBlockSpark(layer, c.x, cy, anims);
            burst(7, () => { const a = rnd(0, 6.283), s = rnd(3, 6.2); return { x: c.x, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.86, decay: 0.085, size: 1.8, shape: 'streak', color: '#f1f5f9' }; });
            if (!r.suppressRecoil) hitRecoil(dom, isHero, 'block', 0, anims);
            const el = hitNumEl(layer, 'arcane-hit-num word block', '格挡', p.x, p.y);
            anims.push(el.animate(NUM_KF.block, { duration: NUM_MS.block, easing: 'ease-out', fill: 'forwards' }));
            return;
        }
        if (h.shieldDmg > 0) {
            hitShieldArc(layer, c.x, c.top + c.h * 0.35, Math.max(70, c.w * 1.1), h.shieldBroken, anims);
            if (h.shieldBroken) burst(14, () => { const a = rnd(-2.8, -0.3), s = rnd(2, 5); return { x: c.x + rnd(-24, 24), y: c.top + c.h * 0.3, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 0.18, drag: 0.95, decay: 0.03, size: rnd(4, 7), vr: rnd(-0.2, 0.2), shape: 'shard', color: '#e0f2fe' }; });
            else burst(5, () => ({ x: c.x + rnd(-18, 18), y: c.top + c.h * 0.3, vx: rnd(-1, 1), vy: rnd(-1.5, -0.5), drag: 0.93, decay: 0.06, size: rnd(1, 2), color: '#bae6fd' }));
        }
        if (h.kind === 'shield') {
            if (!r.suppressRecoil) hitRecoil(dom, isHero, 'shield', 0, anims);
            const el = hitNumEl(layer, 'arcane-hit-num shield', '-' + h.shieldDmg, p.x, p.y);
            anims.push(el.animate(NUM_KF.shield, { duration: NUM_MS.shield, easing: 'ease-out', fill: 'forwards' }));
            if (h.shieldBroken) {
                const b = hitTagEl(layer, 'arcane-hit-num word break', '破盾', p.x, p.y - 22);
                anims.push(b.animate(NUM_KF.tag, { duration: NUM_MS.tag, easing: 'ease-out', fill: 'forwards' }));
            }
            return;
        }
        const col = h.burst ? ['#fef08a', '#facc15', '#fffbeb'] : h.crit ? ['#fdba74', '#f97316', '#fed7aa'] : ['#fecdd3', '#e11d48', '#fda4af'];
        const size = [0, 58, 100, 146][h.tier];
        hitCore(layer, c.x, cy, size, col[0], col[1], h.tier >= 2 ? col[2] : null, [0, 200, 300, 420][h.tier], anims);
        if (h.crit && !h.burst) hitCritSlash(layer, c.x, cy, h.tier === 3 ? 104 : 78, anims);
        if (h.burst) {
            hitBurstHalo(layer, c.x, cy, h.tier === 3 ? 132 : 98, anims);
            burst(10, () => { const a = rnd(0, 6.283), s = rnd(1.2, 3.2); return { x: c.x, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, drag: 0.95, decay: 0.03, size: rnd(1.5, 2.5), color: pick(['#fffbeb', '#fde047']) }; });
        }
        if (h.tier >= 2) burst(h.tier === 3 ? 16 : 8, () => { const a = rnd(0, 6.283), s = rnd(3, h.tier === 3 ? 9 : 6); return { x: c.x, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.88, decay: rnd(0.05, 0.08), size: rnd(1.2, 2.3), shape: 'streak', color: pick(col) }; });
        emitBloodMist(c.x, cy, h.tier, r.dirX, r.dirY);
        const stopMs = h.tier === 3 ? HIT_STOP_MS : 0;
        const pop = () => {
            if (!r.suppressRecoil) hitRecoil(dom, isHero, 'hp', h.tier, anims);
            const cls = 'arcane-hit-num l' + h.tier + (h.burst ? ' burst' : h.crit ? ' crit' : '');
            const el = hitNumEl(layer, cls, '-' + h.hpDmg, p.x, p.y);
            let kf = NUM_KF[h.tier];
            if (h.crit && !h.burst) kf = kf.map((f, idx) => idx === 1 ? Object.assign({}, f, { transform: f.transform + ' scale(1.14)' }) : f);
            anims.push(el.animate(kf, { duration: h.burst ? 1200 : NUM_MS[h.tier], easing: 'cubic-bezier(0.2,0.8,0.3,1)', fill: 'forwards' }));
            const fs = [0, 24, 27, 32][h.tier];
            if (h.crit || h.burst) {
                const t = hitTagEl(layer, 'arcane-hit-tag ' + (h.burst ? 'burst' : 'crit'), h.burst ? '爆发' : '暴击', p.x, p.y - fs * 0.25 - 12);
                anims.push(t.animate(NUM_KF.tag, { duration: h.burst ? 1200 : NUM_MS.tag, easing: 'ease-out', fill: 'forwards' }));
            }
            if (h.shieldDmg > 0) {
                const sy = p.y + fs * 0.92 + 5;
                const s = hitNumEl(layer, 'arcane-hit-num shield sub', '盾-' + h.shieldDmg, p.x, sy);
                anims.push(s.animate(NUM_KF.shield, { duration: NUM_MS.shield, easing: 'ease-out', fill: 'forwards' }));
                if (h.shieldBroken) {
                    const b = hitTagEl(layer, 'arcane-hit-num word break', '破盾', p.x, sy + 20);
                    anims.push(b.animate(NUM_KF.tag, { duration: NUM_MS.tag, easing: 'ease-out', fill: 'forwards' }));
                }
            }
        };
        if (stopMs) timers.push(after(stopMs, pop)); else pop();
    }
    // ===== 受击三档×3音随机防连重音频池（demo-parry-dodge-counter 原样移植） =====
    const HIT_AUDIO_POOL = {
        1: ['hit_1a', 'hit_1b', 'hit_1c'],
        2: ['hit_2a', 'hit_2b', 'hit_2c'],
        3: ['hit_3a', 'hit_3b', 'hit_3c']
    };
    const _lastHitAudioIdx = { 1: -1, 2: -1, 3: -1 };
    const impactWaves = new Map();
    const impactAudioEvents = new Set();
    let nextImpactWaveId = 0, nextImpactEventId = 0, nextAudioActionId = 0;

    function impactAudioScore(hit) {
        if (hit.shieldBroken) return 1000;
        if (hit.kind === 'hp') return 700 + (hit.tier || 1);
        if (hit.kind === 'shield') return 600;
        if (hit.kind === 'block') return 400 + (hit.blockTier || 1);
        if (hit.kind === 'dodge') return 200 + (hit.dodgeTier || 1);
        return 0;
    }

    function publishImpactAudio(result) {
        if (impactAudioEvents.has(result.eventId)) return;
        impactAudioEvents.add(result.eventId);
        if (result.waveId) {
            const wave = impactWaves.get(result.waveId);
            if (!wave) return;
            if (result.isHero) { if (!_pipelineFrozen) hitAudio([result]); }
            else wave.results.set(result.targetId, result);
            return;
        }
        if (!_pipelineFrozen) hitAudio([result]);
    }

    function beginImpactWave(targetIds, actionId) {
        const id = 'impact-' + (++nextImpactWaveId);
        const wave = { id, actionId:actionId || ('audio-action-' + (++nextAudioActionId)), pending:new Set(targetIds), completed:new Set(), results:new Map(), closed:false };
        impactWaves.set(id, wave);
        return wave;
    }

    function flushImpactWave(wave) {
        if (!wave || impactWaves.get(wave.id) !== wave || !wave.closed || wave.pending.size) return;
        impactWaves.delete(wave.id);
        const results = [...wave.results.values()];
        if (!results.length || !identitySfxOn || _pipelineFrozen) return;
        const score = Math.max(...results.map(impactAudioScore));
        hitAudio(results.filter(result => impactAudioScore(result) === score));
    }

    function replaceImpactWaveTargets(wave, targetIds) {
        if (!wave || wave.closed || impactWaves.get(wave.id) !== wave) return;
        const targets = new Set(targetIds);
        wave.pending = new Set(targetIds.filter(id => !wave.completed.has(id)));
        for (const id of wave.results.keys()) if (!targets.has(id)) wave.results.delete(id);
    }

    function completeImpactWaveTarget(wave, targetId) {
        if (!wave || impactWaves.get(wave.id) !== wave) return;
        wave.pending.delete(targetId);
        wave.completed.add(targetId);
        flushImpactWave(wave);
    }

    function closeImpactWave(wave) {
        if (!wave || impactWaves.get(wave.id) !== wave) return;
        wave.closed = true;
        flushImpactWave(wave);
    }

    function cancelImpactWave(wave) {
        if (!wave) return;
        impactWaves.delete(wave.id);
        wave.closed = true;
    }

    function clearCombatAudio() {
        impactWaves.clear();
        impactAudioEvents.clear();
    }

    const CombatAudioDirector = {
        beginAction() { return 'audio-action-' + (++nextAudioActionId); },
        publish(result) {
            const classified = classifyHit(result);
            const source = result.source || 'attack';
            const resultType = classified.kind === 'prevented' ? 'DamagePrevented' : classified.kind === 'dodge' ? 'Dodge' : classified.shieldBroken ? 'ShieldBroken'
                : classified.kind === 'block' ? 'Block' : classified.kind === 'shield' ? 'ShieldHit'
                : source === 'counter' ? 'CounterHit' : source === 'dot' ? 'PeriodicDamage' : source === 'reflect' ? 'ReflectDamage' : 'Hit';
            const event = Object.freeze(Object.assign({}, classified, {
                targetId:result.targetId, sourceId:result.sourceId || null, source, resultType, isHero:!!result.isHero,
                maxHp:result.maxHp, hpBefore:result.hpBefore, hpAfter:result.hpAfter,
                shieldBefore:result.shieldBefore || 0, shieldAfter:result.shieldAfter || 0,
                damageType:result.damageType || '近战',
                actionId:result.actionId || result.wave?.actionId || this.beginAction(),
                waveId:result.waveId || result.wave?.id || null,
                eventId:result.eventId || ('impact-event-' + (++nextImpactEventId))
            }));
            CombatEvents.emit(classified.kind === 'dodge' ? EVENTS.DODGE_RESOLVED : EVENTS.DAMAGE_RESOLVED, event);
            return event;
        },
        consume: publishImpactAudio,
        beginWave: beginImpactWave,
        replaceTargets: replaceImpactWaveTargets,
        completeTarget: completeImpactWaveTarget,
        closeWave: closeImpactWave,
        cancelWave: cancelImpactWave,
        clear: clearCombatAudio
    };

    function playHitTierAudio(tier) {
        const t = tier >= 3 ? 3 : tier === 2 ? 2 : 1;
        const list = HIT_AUDIO_POOL[t] || HIT_AUDIO_POOL[1];
        let idx = Math.floor(Math.random() * list.length);
        if (list.length > 1 && idx === _lastHitAudioIdx[t]) {
            idx = (idx + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
        }
        _lastHitAudioIdx[t] = idx;
        playSound(list[idx], t === 3 ? 0.94 : t === 2 ? 0.88 : 0.82, 1, { track:'result', category:'F' });
    }
    function hitAudio(list) {
        list = list.filter(h => h.kind !== 'prevented');
        if (!identitySfxOn || !list.length) return;
        const anyBreak = list.some(h => h.shieldBroken), anyCrit = list.some(h => h.crit), anyBurst = list.some(h => h.burst);
        // 破盾瞬间无论多少伤害均播最大档 (GuardBreak)
        if (anyBreak) { playSound('parry_3', 0.95, 1, { track:'result', category:'G' }); return; }
        const score = h => h.kind === 'hp' ? 10 + h.tier * 10 : h.kind === 'shield' ? (h.shieldBroken ? 15 : 5) : h.kind === 'block' ? 3 : 1;
        const top = list.reduce((a, b) => score(b) > score(a) ? b : a);
        if (top.kind === 'dodge') { playSound('dodge_' + (top.dodgeTier || 1), (top.dodgeTier || 1) === 3 ? 0.92 : 0.82, 1, { track:'result', category:'H' }); return; }
        if (top.kind === 'block') { playSound('parry_' + (top.blockTier || 1), (top.blockTier || 1) === 3 ? 0.95 : 0.85, 1, { track:'result', category:'G' }); return; }
        resultOutput = true;
        try { CombatAudioMixer.withContext(top.kind === 'shield' ? 'G' : 'F', () => {
            CombatAudioMixer.protect('short', audio().currentTime, null, top.kind === 'shield' ? 'G' : 'F');
            if (top.kind === 'shield') { crystal(0, 1900, 0.1); tone(0, { f0: 1200, f1: 900, dur: 0.16, vol: 0.05, wet: 0.5 }); }
            if (top.kind === 'hp') playHitTierAudio(top.tier || 1);
            if (anyBurst) { chime(0, 1320, 0.6, 0.07); tone(0, { f0: 660, f1: 990, dur: 0.25, vol: 0.05, wet: 0.6 }); }
            else if (anyCrit) { tone(0, { type: 'square', f0: 2400, f1: 1500, dur: 0.07, vol: 0.05 }); click(0, 0.6, 7000, 0.006); crystal(0.012, 3200, 0.07); }
        }); } finally { resultOutput = false; }
    }

    function playHitFeedback(results, opts = {}) {
        const list = (Array.isArray(results) ? results : [results]).filter(Boolean);
        const anims = [], timers = [], layer = hitNumLayer(), hs = list.map(classifyHit), w = opts.wave;
        if (opts.onBeat) opts.onBeat(list);
        if (w) { if (!w.classified) w.classified = []; w.classified.push(...hs); }
        list.forEach((r, i) => { if (hs[i].hpDmg > 0) hitBar(r.targetId, r.hpBefore, r.hpAfter, r.maxHp); });
        const hasHeavy = hs.some(h => h.tier === 3);
        if (w && hasHeavy) w.hasHeavy = true;
        if (hasHeavy) {
            if (!w || !w.shook) { if (!opts.suppressShake) shake('light'); if (w) w.shook = true; }
            if (!w || !w.hitStopped) { fxEngine.hitStop = Math.max(fxEngine.hitStop || 0, HIT_STOP_MS); if (w) w.hitStopped = true; }
        }
        list.forEach((r, i) => hitVisual(layer, Object.assign({}, r, { suppressRecoil: opts.suppressRecoil || r.suppressRecoil, suppressDodgeFx: opts.suppressDodgeFx || r.suppressDodgeFx }), hs[i], anims, timers));
        const handle = {
            doneAt: Date.now() + HIT_LIFE_MS,
            cancel() {
                timers.forEach(id => { clearTimeout(id); S.timers.delete(id); });
                anims.forEach(a => a.cancel());
                layer.remove(); S.layers.delete(layer);
                H.handles.delete(handle); S.handles.delete(handle);
                releaseIdleCanvas();
            }
        };
        H.handles.add(handle); S.handles.add(handle);
        timers.push(after(HIT_LIFE_MS, () => handle.cancel()));
        return handle;
    }
    function clearHitFeedback() {
        H.ghosts.forEach((st, id) => { clearTimeout(st.timer); if (st.el.isConnected) { st.el.style.transition = 'none'; const fill = document.getElementById(id + '-hp-bar'); if (fill) st.el.style.width = fill.style.width; } });
        H.ghosts.clear(); H.stacks.clear();
        H.handles.forEach(h => h.cancel()); H.handles.clear();
        document.querySelectorAll('.arcane-hit-recoil').forEach(el => el.classList.remove('arcane-hit-recoil'));
    }
    function playAttackIdentityFx({ scope = 'single', subtype, caster, targets = [], outcomes = null, onImpact = null, audioContext = null, areaBounds = null, suppressImpact = false } = {}) {
        return CombatAudioMixer.withContext(audioContext || CombatAudioMixer.capture('D'), () => {
            const list = Array.isArray(targets) ? targets.filter(Boolean) : (targets ? [targets] : []);
            const first = list[0];
            if (scope === 'aoe') {
                if (subtype === '爆炸') return playAoeExplosion(caster, list, outcomes, onImpact, areaBounds);
                if (subtype === '雷') return playAoeThunder(caster, list, outcomes, onImpact, areaBounds);
                if (subtype === '火焰') return playAoeFire(caster, list, outcomes, onImpact, areaBounds);
                if (subtype === '枪击') return playAoeGunshot(caster, list, outcomes, onImpact);
                if (subtype === '毒雾') return playAoePoison(caster, list, outcomes, onImpact);
                if (subtype === '冰霜') return playAoeFrost(caster, list, outcomes, onImpact, areaBounds);
                if (subtype === '风') return playAoeWind(caster, list, outcomes, onImpact);
                if (subtype === '光') return playAoeLight(caster, list, outcomes, onImpact);
                return null;
            }
            const outcome = first ? normalizeOutcomes(outcomes)(first) : 'hit';
            if (subtype === '枪击') return playSingleGunshot(caster, first, outcome, onImpact);
            if (subtype === '霰弹') return playSingleShotgun(caster, first, outcome, onImpact, suppressImpact);
            if (subtype === '光') return playSingleLight(caster, first, outcome, onImpact);
            if (subtype === '雷') return playSingleThunder(caster, first, outcome, onImpact);
            if (subtype === '爆炸') return playSingleExplosion(caster, first, outcome, onImpact);
            if (subtype === '刀砍') return playSingleSlash(caster, first, outcome, onImpact);
            if (subtype === '拳击') return playSinglePunch(caster, first, outcome, onImpact);
            if (subtype === '爪击') return playSingleClaw(caster, first, outcome, onImpact);
            if (subtype === '撕咬') return playSingleBite(caster, first, outcome, onImpact);
            if (subtype === '毒液') return playSingleVenom(caster, first, outcome, onImpact);
            if (subtype === '箭矢') return playSingleArrow(caster, first, outcome, onImpact);
            if (subtype === '冰霜') return playSingleFrost(caster, first, outcome, onImpact);
            return null;
        });
    }
    const V = { locks: new Map(), persists: new Map(), runs: new Set(), rage: new Set() };
    function entityIdOf(entity) {
        if (entity && entity.nodeType === 1) return String(identityTargetKey(entity));
        return entity && typeof entity === 'object' ? String(entity.id || '') : String(entity || '');
    }
    function isEntityVariantLocked(entity) { return (V.locks.get(entityIdOf(entity)) || 0) > 0; }
    function skillLayer(owner, markup, ms) {
        const layer = owner.layer(markup);
        if (ms) owner.at(ms, () => { owner.layers.delete(layer); S.layers.delete(layer); layer.remove(); });
        return layer;
    }
    function flashOwned(owner, dom, cls) {
        if (!dom || isEntityVariantLocked(dom)) return;
        flash(dom, cls);
        owner.onClean(() => { dom.classList.remove(cls); S.flashes.delete(dom); });
    }
    function itemSkillRun(totalMs) {
        const owner = identityRun(totalMs, 1);
        owner.handle.owner = owner;
        owner.cancel = () => owner.handle.cancel();
        owner.onClean(() => {
            if (S.itemDarkOwner === owner) { if (S.dark) S.dark.remove(); S.dark = null; S.itemDarkOwner = null; }
        });
        return owner;
    }
    function fixedItemSkillRun(totalMs) {
        const owner = itemSkillRun(totalMs), deadline = owner.handle.doneAt;
        owner.fixedLife = true;
        Object.defineProperty(owner.handle, 'doneAt', { get:() => deadline, set() {} });
        return owner;
    }
    function orbitItemCharge(owner, c, n, dur, mk, rx, ry, shrink = 0.8) {
        const orb = []; for (let i = 0; i < n; i++) orb.push({ a:Math.random() * 6.283, r:rnd(0.45, 1), s:rnd(0.025, 0.05), k:Math.random() });
        const t0 = performance.now();
        const id = owner.every(33, () => {
            const k = Math.min(1, (performance.now() - t0) / dur);
            orb.forEach(o => {
                o.a += o.s * (1 + k * 3); const r = o.r * (1 - k * shrink);
                owner.addP(Object.assign({ itemFx:true, x:c.x + Math.cos(o.a) * rx * r, y:c.y + Math.sin(o.a) * ry * r, decay:0.25 }, mk(o)));
            });
        });
        owner.at(dur, () => { stopEvery(id); owner.intervals.delete(id); });
    }
    function itemDarken(owner, opacity) {
        if (opacity) { darken(opacity); S.itemDarkOwner = owner; }
        else if (S.itemDarkOwner === owner) darken(0);
    }
    function playItemSample(owner, key, delaySec = 0, opts = {}) {
        const play = () => {
            if (owner.cancelled || owner.finished || owner.token !== combatToken || _pipelineFrozen) return;
            const cue = playSound(key, opts.volume ?? 0.78, opts.rate ?? 1, {
                owner, audioContext:owner.audioContext, category:owner.audioContext.category, sync:true,
                pan:opts.pan ?? 0, offsetSec:opts.offset ?? 0, maxDurSec:opts.durCap, fadeInSec:opts.fadeIn ?? 0, fadeOutSec:opts.fadeOut ?? 0
            });
            if (typeof cue === 'function') {
                S.sampleAudios.add(cue);
                cue.done.then(() => S.sampleAudios.delete(cue));
            }
        };
        if (delaySec > 0) owner.at(Math.round(delaySec * 1000), play);
        else play();
    }
    function flyItemBezier(owner, a, ctrl, b, dur, draw, done, ease) {
        const valid = () => !owner.cancelled && !owner.finished && owner.token === combatToken && !_pipelineFrozen;
        const f = flyBezier(a, ctrl, b, dur, (x, y, pr) => { if (valid()) draw(x, y, pr); }, () => {
            owner.flights.delete(f);
            if (valid() && done) done();
        }, ease);
        owner.flights.add(f); owner.retain(dur);
        return f;
    }

    function playArcaneWebM(file, x, y, opts = {}, owner) {
        const token = combatToken;
        const cleanups = [];
        const cleanup = () => { while (cleanups.length) { try { cleanups.pop()(); } catch (_) {} } S.videos.delete(cleanup); };
        S.videos.add(cleanup);
        owner.onClean(cleanup);
        const startPlay = () => {
            if (token !== combatToken || owner.cancelled || owner.finished) { cleanup(); return; }
            const v = document.createElement('video');
            v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
            const url = itemFxAssetUrl(file.indexOf('/') === -1 ? `RpmCombat_Spine/${file}` : file);
            v.src = _fxVideoBlobCache.get(url) || url;
            const cv = document.createElement('canvas');
            cv.className = 'arcane-webm-cv';
            cv.setAttribute('data-arcane-fx', 'webm');
            cv.style.left = `${x}px`; cv.style.top = `${y}px`;
            cv.style.zIndex = String(opts.zIndex || 54);
            cv.style.mixBlendMode = opts.blend || 'screen';
            cv.style.opacity = String(opts.opacity ?? 0.96);
            if (opts.filter) cv.style.filter = opts.filter;
            __STAGE.el.appendChild(cv);
            let stopped = false, rafId = 0, rvfcId = 0;
            cleanups.push(() => {
                stopped = true;
                if (rafId) cancelAnimationFrame(rafId);
                if (rvfcId && v.cancelVideoFrameCallback) try { v.cancelVideoFrameCallback(rvfcId); } catch (_) {}
                try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {}
                cv.remove();
            });
            const scale = opts.scale ?? 1.0, rate = opts.playbackRate ?? 1.0;
            v.playbackRate = rate;
            v.addEventListener('loadedmetadata', () => {
                if (stopped || token !== combatToken || owner.cancelled || owner.finished) { cleanup(); return; }
                const natW = v.videoWidth || 480, natH = v.videoHeight || 360;
                const drawW = opts.width ? opts.width : Math.round(natW * scale);
                const drawH = opts.height ? opts.height : Math.round(natH * scale);
                const keyW = Math.min(drawW, 960), keyH = Math.round(keyW * (drawH / Math.max(1, drawW)));
                cv.width = keyW; cv.height = keyH;
                cv.style.width = `${drawW}px`; cv.style.height = `${drawH}px`;
                if (opts.flipX) cv.style.transform = 'translate(-50%, -50%) scaleX(-1)';
                const g = cv.getContext('2d', { willReadFrequently: true });
                const renderFrame = () => {
                    if (stopped || token !== combatToken || owner.cancelled || owner.finished || v.ended) { cleanup(); return; }
                    if (v.readyState >= 2) {
                        g.clearRect(0, 0, keyW, keyH);
                        g.drawImage(v, 0, 0, keyW, keyH);
                        if (opts.keyDark) {
                            const img = g.getImageData(0, 0, keyW, keyH), d = img.data;
                            for (let i = 0; i < d.length; i += 4) {
                                const mx = Math.max(d[i], d[i + 1], d[i + 2]);
                                if (mx < 10) d[i + 3] = 0;
                                else if (mx < 26) d[i + 3] = Math.round(d[i + 3] * (mx - 10) / 16);
                            }
                            g.putImageData(img, 0, 0);
                        }
                    }
                    if (v.requestVideoFrameCallback) rvfcId = v.requestVideoFrameCallback(renderFrame);
                    else rafId = requestAnimationFrame(renderFrame);
                };
                v.play().then(() => {
                    if (stopped || token !== combatToken || owner.cancelled || owner.finished) { cleanup(); return; }
                    renderFrame();
                    if (opts.onStart) opts.onStart(v);
                }).catch(() => cleanup());
            }, { once: true });
            v.addEventListener('ended', cleanup, { once: true });
            v.addEventListener('error', cleanup, { once: true });
            if (opts.durMs) owner.at(opts.durMs, cleanup);
        };
        if (opts.delayMs) owner.at(opts.delayMs, startPlay);
        else startPlay();
        return cleanup;
    }

    // ===== ③ 【砷弹射击】L1+ 枪口蓄力 → 黑弹破甲 → 命中爆炸与毒液溅射 (1180ms / 音效沿用枪击穿透) =====
    function playArsenicShot(caster, targets) {
        const token = combatToken, uid = ++S.uid;
        const cDom = domOf(caster);
        const tDom = domOf(targets && targets[0]);
        const tp = entityVisualRect(tDom), cp = entityVisualRect(cDom); if (!tp || !cp) return null;
        const owner = fixedItemSkillRun(1180);
        const after = owner.at, fsLayer = (markup, ms) => skillLayer(owner, markup, ms);
        const addP = p => owner.addP(Object.assign({ itemFx:true, inner:p.mistCore }, p)), burst = (n, fn) => { for (let i = 0; i < n; i++) addP(fn(i)); };
        const playSfxSample = (key, delay, opts) => playItemSample(owner, key, delay, opts);
        const playWebMFX = (file, x, y, opts) => playArcaneWebM(file, x, y, opts, owner);
        const darken = opacity => itemDarken(owner, opacity), flash = (dom, cls) => flashOwned(owner, dom, cls);
        const orbitCharge = (c, n, dur, mk, rx, ry, shrink) => orbitItemCharge(owner, c, n, dur, mk, rx, ry, shrink);
        const flyBezier = (a, ctrl, b, dur, draw, done, ease) => flyItemBezier(owner, a, ctrl, b, dur, draw, done, ease);
        const muzzle = { x: cp.x + cp.w * 0.16, y: cp.y - cp.h * 0.04 };
        const dx = tp.x - muzzle.x, dy = tp.y - muzzle.y, dist = Math.max(40, Math.hypot(dx, dy));
        const ux = dx / dist, uy = dy / dist, deg = Math.atan2(dy, dx) * 180 / Math.PI;
        const pan = Math.max(-0.7, Math.min(0.7, (tp.x / __STAGE.w - 0.5) * 1.4));
        const CHARGE = 340, FLIGHT = 160;

        // 全程沿用枪击穿透真音，紧扣枪口蓄满击发与命中爆轰
        playSfxSample('gunshot_pierce', 0.26, { volume: 0.86, pan });

        // 1. 施法端显眼蓄力：枪口毒能涡流螺旋吸入 + 黑铁聚压双弧环与弹核凝形 (0 ~ 340ms)
        if (cDom && cDom.animate) owner.anim(cDom, [
            { transform: 'translate(0,0) scale(1)' },
            { transform: 'translate(-4px,3px) scale(0.95)', offset: 0.68 },
            { transform: 'translate(3px,-1px) scale(1.02)', offset: 0.90 },
            { transform: 'translate(0,0) scale(1)' }
        ], { duration: CHARGE + 120, easing: 'ease-out' });
        orbitCharge(muzzle, 24, CHARGE - 20, o => ({ size: rnd(4.2, 7.2), shape: 'gradOrb', blend: 'source-over', core: '#ecfccb', mid: o.k < 0.65 ? '#84cc16' : '#7e22ce', outer: 'rgba(54,83,20,0.22)' }), 52, 52, 0.88);
        const chgLayer = fsLayer(`<div class="arcane-fs-anchor ar-chg" style="left:${muzzle.x}px; top:${muzzle.y}px; width:104px; height:104px; filter:drop-shadow(0 0 6px rgba(101,163,13,0.65));">
          <svg viewBox="-52 -52 104 104" class="w-full h-full overflow-visible">
            <defs><radialGradient id="ar-cg-${uid}"><stop offset="0%" stop-color="#84cc16" stop-opacity="0.52"/><stop offset="55%" stop-color="#365314" stop-opacity="0.28"/><stop offset="100%" stop-color="#090d16" stop-opacity="0"/></radialGradient></defs>
            <circle cx="0" cy="0" r="46" fill="url(#ar-cg-${uid})"/>
            <path d="M-36,0 A36,36 0 0,1 0,-36 M36,0 A36,36 0 0,1 0,36" fill="none" stroke="#94a3b8" stroke-width="2.6" stroke-linecap="round"/>
            <path d="M0,-24 A24,24 0 0,1 24,0 M0,24 A24,24 0 0,1 -24,0" fill="none" stroke="#a3e635" stroke-width="2.6" stroke-linecap="round"/>
            <circle cx="0" cy="0" r="9.5" fill="#090d16" stroke="#84cc16" stroke-width="2"/>
            <circle cx="0" cy="0" r="4" fill="#bef264" opacity="0.85"/>
          </svg></div>`, CHARGE + 25);
        const chgEl = chgLayer.querySelector('.ar-chg');
        if (chgEl && chgEl.animate) owner.anim(chgEl, [
            { transform: 'translate(-50%,-50%) scale(1.45) rotate(-75deg)', opacity: 0.25 },
            { transform: 'translate(-50%,-50%) scale(0.95) rotate(15deg)', opacity: 1, offset: 0.72 },
            { transform: 'translate(-50%,-50%) scale(0.45) rotate(55deg)', opacity: 0 }
        ], { duration: CHARGE, easing: 'cubic-bezier(0.25,0.8,0.3,1)', fill: 'forwards' });

        // 2. 发射黑弹穿行 (340 ~ 500ms)
        after(CHARGE, () => {
            if (token !== combatToken) return;
            fsLayer(`<div class="arcane-fs-anchor" style="left:${muzzle.x}px; top:${muzzle.y}px; width:54px; height:30px; transform:translate(-25%,-50%) rotate(${deg.toFixed(1)}deg);">
              <svg viewBox="0 0 54 30" class="w-full h-full overflow-visible"><path d="M6,15 L32,6 L20,15 L32,24 Z" fill="#1e293b" opacity="0.9"/><path d="M8,15 L44,12 L18,15 L44,18 Z" fill="#84cc16" opacity="0.78"/></svg></div>`, 135);
            burst(6, () => ({ x: muzzle.x, y: muzzle.y, vx: ux * rnd(1.6, 3.8) + rnd(-0.6, 0.6), vy: uy * rnd(1.6, 3.8) + rnd(-0.6, 0.6), drag: 0.92, decay: 0.055, size: rnd(7, 13), shape: 'smoke', blend: 'source-over', color: 'rgba(15,23,42,0.62)' }));
            burst(6, () => { const a = (deg + rnd(-22, 22)) * Math.PI / 180, s = rnd(3.8, 7.6); return { x: muzzle.x, y: muzzle.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.88, decay: 0.085, size: rnd(1.2, 2.0), shape: 'streak', blend: 'source-over', color: pick(['#94a3b8', '#d97706', '#84cc16']) }; });

            const bulletLayer = fsLayer(`<div class="arcane-fs-anchor ar-bullet" style="left:${muzzle.x}px; top:${muzzle.y}px; width:68px; height:24px; transform:translate(-50%,-50%) rotate(${deg.toFixed(1)}deg); filter:drop-shadow(0 2px 4px rgba(0,0,0,0.78));">
              <svg viewBox="0 0 68 24" class="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="ar-bk-${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#020617" stop-opacity="0"/><stop offset="45%" stop-color="#0f172a" stop-opacity="0.78"/><stop offset="100%" stop-color="#020617"/></linearGradient>
                  <linearGradient id="ar-bl-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#64748b"/><stop offset="32%" stop-color="#0f172a"/><stop offset="100%" stop-color="#020617"/></linearGradient>
                </defs>
                <polygon points="0,10 38,8 38,16 0,14" fill="url(#ar-bk-${uid})"/>
                <path d="M28,7.4 L50,7.4 Q62,8.8 66,12 Q62,15.2 50,16.6 L28,16.6 L30,12 Z" fill="url(#ar-bl-${uid})" stroke="#64748b" stroke-width="0.95"/>
                <line x1="33" y1="9.2" x2="57" y2="10.2" stroke="#cbd5e1" stroke-width="1" stroke-linecap="round" opacity="0.82"/>
                <line x1="32" y1="12" x2="52" y2="12" stroke="#84cc16" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/>
              </svg></div>`, FLIGHT + 35);
            const bulletEl = bulletLayer.querySelector('.ar-bullet');
            const ctrl = { x: (muzzle.x + tp.x) * 0.5, y: (muzzle.y + tp.y) * 0.5 - 8 };
            flyBezier(muzzle, ctrl, tp, FLIGHT, (bx, by, pr) => {
                if (!bulletEl || !bulletEl.isConnected) return;
                const k = Math.pow(pr, 0.88), tx = (1 - k) * (ctrl.x - muzzle.x) + k * (tp.x - ctrl.x), ty = (1 - k) * (ctrl.y - muzzle.y) + k * (tp.y - ctrl.y);
                bulletEl.style.left = bx + 'px'; bulletEl.style.top = by + 'px';
                bulletEl.style.transform = `translate(-50%,-50%) rotate(${(Math.atan2(ty, tx) * 180 / Math.PI).toFixed(1)}deg)`;
                if (pr > 0.08 && pr < 0.96 && Math.random() < 0.72) {
                    addP({ x: bx - ux * 14 + rnd(-2, 2), y: by - uy * 14 + rnd(-2, 2), vx: -ux * 0.4 + rnd(-0.3, 0.3), vy: rnd(-0.2, 0.5), drag: 0.94, decay: 0.065, size: rnd(3.5, 6), shape: 'smoke', blend: 'source-over', color: 'rgba(15,23,42,0.44)' });
                    if (Math.random() < 0.55) addP({ x: bx - ux * 10, y: by - uy * 10, vx: -ux * 0.6 + rnd(-0.4, 0.4), vy: rnd(0.2, 1.1), grav: 0.12, drag: 0.95, decay: 0.06, size: rnd(1.6, 2.6), shape: 'droplet', blend: 'source-over', color: pick(['#4d7c0f', '#65a30d']), hiColor: '#a3e635' });
                }
            }, () => {
                if (bulletEl) bulletEl.style.opacity = '0';
                if (token !== combatToken) return;
                const scene = __STAGE.shakeEl();
                if (scene) {
                    scene.classList.remove('arcane-arsenic-shake'); void scene.offsetWidth; scene.classList.add('arcane-arsenic-shake'); S.shakeEls.add(scene);
                    const cleanShake = () => { scene.classList.remove('arcane-arsenic-shake'); S.shakeEls.delete(scene); };
                    after(230, cleanShake); owner.onClean(cleanShake);
                }
                if (tDom) {
                    const sp = tDom.querySelector('.enemy-sprite') || tDom;
                    flash(sp, 'arcane-flash-arsenic');
                    if (sp.animate) owner.anim(sp, [
                        { transform: 'scale(1) translate(0,0)' },
                        { transform: `scale(0.91) translate(${Math.round(ux * 12)}px,${Math.round(uy * 5)}px)`, offset: 0.16 },
                        { transform: `scale(1.04) translate(${Math.round(-ux * 5)}px,${Math.round(-uy * 2)}px)`, offset: 0.44 },
                        { transform: 'scale(1) translate(0,0)' }
                    ], { duration: 360, easing: 'cubic-bezier(0.18,0.85,0.35,1)' });
                }
                // 3. 命中黑弹猛烈爆轰（火药爆焰 + 翻滚黑/毒浓烟 + 金属破片） + 浓稠毒液飞溅 (500 ~ 1180ms)
                const boomLayer = fsLayer(`<div class="arcane-fs-anchor ar-boom" style="left:${tp.x}px; top:${tp.y}px; width:196px; height:196px; filter:drop-shadow(0 4px 10px rgba(9,13,22,0.86));">
                  <svg viewBox="-98 -98 196 196" class="w-full h-full overflow-visible">
                    <defs><radialGradient id="ar-ex-${uid}"><stop offset="0%" stop-color="#fef08a" stop-opacity="0.92"/><stop offset="28%" stop-color="#d97706" stop-opacity="0.88"/><stop offset="62%" stop-color="#65a30d" stop-opacity="0.78"/><stop offset="100%" stop-color="#1a2e05" stop-opacity="0"/></radialGradient></defs>
                    <circle cx="0" cy="0" r="74" fill="none" stroke="#1e293b" stroke-width="6" opacity="0.76"/>
                    <circle cx="0" cy="0" r="56" fill="none" stroke="#84cc16" stroke-width="3.5" opacity="0.8"/>
                    <path d="M0,-82 L18,-28 L72,-48 L34,-8 L82,22 L26,28 L46,74 L0,34 L-46,76 L-26,26 L-82,18 L-34,-8 L-68,-50 L-18,-28 Z" fill="#090d16" opacity="0.84"/>
                    <path d="M0,-58 L14,-20 L52,-32 L24,-6 L58,16 L18,20 L32,54 L0,24 L-32,56 L-18,18 L-58,12 L-24,-6 L-48,-34 L-14,-20 Z" fill="url(#ar-ex-${uid})"/>
                  </svg></div>`, 440);
                const boomEl = boomLayer.querySelector('.ar-boom');
                if (boomEl && boomEl.animate) owner.anim(boomEl, [
                    { transform: 'translate(-50%,-50%) scale(0.24)', opacity: 0.98 },
                    { transform: 'translate(-50%,-50%) scale(1.12)', opacity: 0.94, offset: 0.34 },
                    { transform: 'translate(-50%,-50%) scale(1.38)', opacity: 0 }
                ], { duration: 420, easing: 'cubic-bezier(0.15,0.85,0.3,1)', fill: 'forwards' });

                addP({ x: tp.x, y: tp.y, shape: 'ring', blend: 'source-over', size: 1.25, decay: 0.055, color: 'rgba(15,23,42,0.7)' });
                addP({ x: tp.x, y: tp.y, shape: 'ring', blend: 'source-over', size: 1.0, decay: 0.065, color: 'rgba(132,204,22,0.68)' });
                burst(14, () => { const a = Math.random() * 6.283, s = rnd(1.2, 4.0); return { x: tp.x + rnd(-12, 12), y: tp.y + rnd(-12, 12), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.35, drag: 0.93, decay: 0.028, size: rnd(13, 24), shape: 'smoke', blend: 'source-over', color: pick(['rgba(15,23,42,0.74)', 'rgba(30,41,59,0.64)', 'rgba(54,83,20,0.54)']) }; });
                burst(16, () => { const a = Math.random() * 6.283, s = rnd(3.2, 8.2); return { x: tp.x, y: tp.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.9, grav: 0.2, drag: 0.93, rot: rnd(0, 6.28), vr: rnd(-0.24, 0.24), decay: 0.032, size: rnd(3.4, 6.0), shape: 'shard', blend: 'source-over', fill: '#020617', color: '#94a3b8' }; });
                burst(10, () => { const a = Math.random() * 6.283, s = rnd(4.6, 9.6); return { x: tp.x, y: tp.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.88, decay: 0.072, size: rnd(1.4, 2.4), shape: 'streak', blend: 'source-over', color: pick(['#f59e0b', '#84cc16', '#94a3b8']) }; });

                const splatLayer = fsLayer(`<div class="arcane-fs-anchor ar-splat" style="left:${tp.x + ux * 6}px; top:${tp.y + uy * 4}px; width:146px; height:124px; filter:drop-shadow(0 2px 6px rgba(26,46,5,0.78));">
                  <svg viewBox="-72 -62 144 124" class="w-full h-full overflow-visible">
                    <path d="M-40,-6 Q-18,-34 12,-24 Q42,-16 48,4 Q36,30 -2,28 Q-36,28 -48,10 Z" fill="#365314" opacity="0.82"/>
                    <path d="M-28,-8 Q-8,-24 18,-18 Q36,-6 32,12 Q16,24 -10,20 Q-32,16 -34,-2 Z" fill="#65a30d" opacity="0.88"/>
                    <path d="M-16,-4 Q-2,-15 16,-9 Q24,2 10,12 Q-8,15 -18,2 Z" fill="#a3e635" opacity="0.72"/>
                    <circle cx="-4" cy="0" r="6.5" fill="#090d16" opacity="0.76"/><circle cx="-4" cy="0" r="9" fill="none" stroke="#1a2e05" stroke-width="2" opacity="0.65"/>
                    <circle cx="-12" cy="-7" r="3.6" fill="#1a2e05" opacity="0.62"/><circle cx="13" cy="6" r="3.2" fill="#1a2e05" opacity="0.58"/>
                    <circle cx="-26" cy="-28" r="4.8" fill="#84cc16" opacity="0.86"/><circle cx="38" cy="-22" r="4.2" fill="#65a30d" opacity="0.86"/><circle cx="46" cy="18" r="5" fill="#7e22ce" opacity="0.72"/><circle cx="-38" cy="22" r="3.8" fill="#a3e635" opacity="0.82"/>
                  </svg></div>`, 540);
                const splatEl = splatLayer.querySelector('.ar-splat');
                if (splatEl && splatEl.animate) owner.anim(splatEl, [
                    { transform: 'translate(-50%,-50%) scale(0.28)', opacity: 0.95 },
                    { transform: 'translate(-50%,-50%) scale(1.08)', opacity: 0.92, offset: 0.25 },
                    { transform: 'translate(-50%,-44%) scale(1.14)', opacity: 0 }
                ], { duration: 500, easing: 'ease-out', fill: 'forwards' });

                burst(28, () => { const a = Math.random() * 6.283, sp = rnd(2.4, 7.0); return { x: tp.x + rnd(-6, 6), y: tp.y + rnd(-6, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, grav: 0.24, drag: 0.94, decay: rnd(0.028, 0.044), size: rnd(2.2, 4.1), shape: 'droplet', blend: 'source-over', color: pick(['#65a30d', '#84cc16', '#4d7c0f', '#a3e635', '#7e22ce']), hiColor: '#d9f99d' }; });
                const bubW = Math.max(88, Math.round(tp.w * 1.1)), bubH = Math.max(88, Math.round(tp.h * 1.1));
                const bubPts = [[-0.24, 0.1, 5.2, 0], [0.22, -0.05, 6.0, 1], [-0.08, -0.24, 4.6, 0], [0.16, 0.22, 5.5, 1], [-0.28, -0.18, 4.4, 0]];
                const bubLayer = fsLayer(`<div class="arcane-fs-anchor" style="left:${tp.x}px; top:${tp.y}px; width:${bubW}px; height:${bubH}px;">
                  <svg viewBox="0 0 ${bubW} ${bubH}" class="w-full h-full overflow-visible"><defs>
                    <radialGradient id="ar-bp-${uid}" cx="0.35" cy="0.32"><stop offset="0" stop-color="#e9d5ff" stop-opacity="0.4"/><stop offset="0.58" stop-color="#a855f7" stop-opacity="0.72"/><stop offset="0.9" stop-color="#7e22ce" stop-opacity="0.88"/><stop offset="1" stop-color="#581c87" stop-opacity="0"/></radialGradient>
                    <radialGradient id="ar-bg-${uid}" cx="0.35" cy="0.32"><stop offset="0" stop-color="#ecfccb" stop-opacity="0.4"/><stop offset="0.58" stop-color="#84cc16" stop-opacity="0.72"/><stop offset="0.9" stop-color="#4d7c0f" stop-opacity="0.88"/><stop offset="1" stop-color="#1a2e05" stop-opacity="0"/></radialGradient>
                    <radialGradient id="ar-st-${uid}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(88,28,135,0.48)"/><stop offset="55%" stop-color="rgba(54,83,20,0.34)"/><stop offset="100%" stop-color="rgba(26,46,5,0)"/></radialGradient>
                  </defs>
                  <ellipse class="ar-stain" cx="${bubW * 0.5}" cy="${bubH * 0.84}" rx="${bubW * 0.36}" ry="${bubH * 0.14}" fill="url(#ar-st-${uid})" opacity="0"/>
                  ${bubPts.map(([ox, oy, br, isp]) => { const bx = (bubW * (0.5 + ox)).toFixed(1), by = (bubH * (0.5 + oy)).toFixed(1); return `<g class="ar-bub" data-rx="${(tp.x + ox * bubW).toFixed(1)}" data-ry="${(tp.y + oy * bubH - 8).toFixed(1)}" style="transform-origin:${bx}px ${by}px; opacity:0;"><circle cx="${bx}" cy="${by}" r="${br}" fill="url(#ar-${isp ? 'bp' : 'bg'}-${uid})"/><circle cx="${(Number(bx) - br * 0.32).toFixed(1)}" cy="${(Number(by) - br * 0.32).toFixed(1)}" r="${(br * 0.25).toFixed(1)}" fill="${isp ? '#f3e8ff' : '#ecfccb'}" opacity="0.72"/></g>`; }).join('')}
                  </svg></div>`, 660);
                const stainEl = bubLayer.querySelector('.ar-stain');
                if (stainEl && stainEl.animate) owner.anim(stainEl, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.32 }, { opacity: 0, transform: 'scale(1.08)' }], { duration: 600, fill: 'forwards' });
                bubLayer.querySelectorAll('.ar-bub').forEach((bEl, bi) => {
                    after(35 + bi * 72, () => {
                        if (token !== combatToken || !bEl.isConnected) return;
                        if (bEl.animate) owner.anim(bEl, [{ opacity: 0, transform: 'translateY(4px) scale(0.35)' }, { opacity: 0.95, transform: 'translateY(-7px) scale(1.08)', offset: 0.6 }, { opacity: 0, transform: 'translateY(-14px) scale(1.26)' }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
                        after(130, () => { if (token !== combatToken) return; const rx = Number(bEl.dataset.rx), ry = Number(bEl.dataset.ry); burst(3, () => { const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1), sp = rnd(0.8, 1.8); return { x: rx, y: ry, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.3, grav: 0.08, drag: 0.94, decay: 0.048, size: rnd(1.8, 3.0), shape: 'droplet', blend: 'source-over', color: pick(['#84cc16', '#a855f7']), hiColor: '#d9f99d' }; }); addP({ x: rx, y: ry, vx: rnd(-0.25, 0.25), vy: rnd(-0.7, -0.3), drag: 0.96, decay: 0.036, size: rnd(7, 11), shape: 'gradMist', blend: 'source-over', mistCore: 'rgba(88,28,135,0.34)', outer: 'rgba(26,46,5,0.1)' }); });
                    });
                });
                for (let m = 0; m < 5; m++) addP({ x: tp.x + rnd(-20, 20), y: tp.bottom - 8, vx: rnd(-0.3, 0.3), vy: rnd(0.12, 0.4), drag: 0.97, decay: 0.02, size: rnd(14, 21), shape: 'smoke', blend: 'source-over', color: pick(['rgba(54,83,20,0.36)', 'rgba(88,28,135,0.32)']) });
            }, k => Math.pow(k, 0.88));
        });
        return owner.handle;
    }
    // ===== 猫眼石 / 海螺 / 砷弹定稿 v12.15 END =====

    // ===== 我方近战点后排：无字瞄准锁盾与前排阻挡 v12.15 =====
    function clearRowAimCues() {
        S.rowAimLayers.forEach(d => d.remove()); S.rowAimLayers.clear();
        document.querySelectorAll('.arcane-row-back-locked').forEach(el => el.classList.remove('arcane-row-back-locked'));
    }
    function playArcaneProjectile(type, fromDom, toDom, dodged = false) {
        if (!fromDom || !toDom) return Promise.resolve(true);
        if (_pipelineFrozen) return Promise.resolve(false);
        const token = combatToken;
        ensureCanvas(); ensureDriver();
        return new Promise(resolve => {
            let settled = false;
            const done = ok => { if (settled) return; settled = true; S.rawTimers.delete(done); resolve(ok && token === combatToken && !_pipelineFrozen); };
            S.rawTimers.set(done, done);
            if (type === 'fire') fireProjectile(fromDom, toDom, !!dodged, token, () => done(true));
            else if (type === 'enemy_spell') enemySpellProjectile(fromDom, toDom, !!dodged, token, () => done(true));
            else done(false);
        });
    }
    // ===== 召唤三瞬默认演出 v12.12 END =====

    function clearArcaneFx() {
        clearRowAimCues();
        clearSummonState();
        clearStatusLayers(); clearSelfDestructState(); clearRescueState();
        clearHitFeedback();
        identityAudioStoppers.forEach(stop => stop()); identityAudioStoppers.clear();
        S.timers.forEach(id => clearTimeout(id)); S.timers.clear();
        S.rawTimers.forEach((resolve, id) => { clearTimeout(id); resolve(false); }); S.rawTimers.clear();
        S.intervals.forEach(id => clearInterval(id)); S.intervals.clear();
        S.flights.length = 0; S.particles.length = 0;
        S.particleTimer = null; S.particleUntil = 0;
        if (S.driver) { const idx = fxEngine.particles.indexOf(S.driver); if (idx >= 0) fxEngine.particles.splice(idx, 1); S.driver = null; }
        S.handles.forEach(h => { if (h && h.cancel) h.cancel(); }); S.handles.clear();
        S.videos.forEach(cleanup => cleanup()); S.videos.clear();
        S.sampleAudios.forEach(stop => stop()); S.sampleAudios.clear();
        S.layers.forEach(d => d.remove()); S.layers.clear();
        S.anchors.forEach(d => d.remove()); S.anchors.clear();
        S.flashes.forEach(el => el.classList.remove('arcane-flash-cold', 'arcane-flash-heal', 'arcane-flash-melee', 'arcane-flash-ranged', 'arcane-flash-spell', 'arcane-flash-silence', 'arcane-flash-shatter', 'arcane-flash-lava', 'arcane-flash-drain', 'arcane-flash-arsenic', 'arcane-item-heal')); S.flashes.clear();
        S.shakeEls.forEach(el => el.classList.remove('arcane-shake-light', 'arcane-shake-heavy', 'arcane-shake-quake', 'arcane-arsenic-shake')); S.shakeEls.clear();
        if (S.dark) { S.dark.remove(); S.dark = null; }
        S.itemDarkOwner = null;
        if (S.canvas) { S.canvas.remove(); S.canvas = null; S.ctx = null; }
        identityBuffers.clear(); identityDecodes.clear();
        CombatAudioDirector.clear();
        clearVariantState();
        /* 环境氛围模块未迁移（战棋背景声由宿主 ambient 管理） */
        CombatAudioMixer.clear(); audioCtx = null; sfxBus = null; sfxVerb = null; sfxNoise = null; sfxIR = null; synthBuses.clear();
    }
    return { playEnemyWindup, playAttackIdentityFx, playArcaneProjectile, playHitFeedback, classifyHit, syncHitBar,
      CombatAudioDirector, clearHitFeedback, warmIdentitySample, playArsenicShot, clearArcaneFx };
  })();
CombatEvents.on(EVENTS.DAMAGE_RESOLVED, arcane.CombatAudioDirector.consume);
CombatEvents.on(EVENTS.DODGE_RESOLVED, arcane.CombatAudioDirector.consume);

  return Object.assign({}, arcane, {
    CombatAudioMixer, audioUrls, playSound, playCustomAudio, HERO_VOICE_LINES, pickHeroVoice, AVATAR_MAP, fxEngine,
    ASSET_BASE, HERO_VOICE_BASE, itemFxAssetUrl,
    setToken(t) { combatToken = t; },
    getToken() { return combatToken; },
    setRoster(h, e) { heroesData = h; enemiesData = e; },
  });
}
