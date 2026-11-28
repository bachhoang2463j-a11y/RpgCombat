// ==========================================
// 由 tactics/tools/extract-rpg-av.cjs 自动生成，请勿手改。
// 源: index.html  sha256=5c1ab2a1a243bb7d7e79b4aca76026ad1058af2a74bf9dfbf8763ae8b13554e7
// arcaneVfxModule 行区间(源 5729–14230): 5730–5924, 5932–6356, 6431–6485, 6565–7584, 7596–11500, 11829–12083, 12201–12562, 12565–14208
// 入选语句 316 段 / 7861 行；入口: playEnemyWindup, playAttackIdentityFx, playArcaneProjectile, playHitFeedback, classifyHit, syncHitBar, CombatAudioDirector, clearHitFeedback, warmIdentitySample, playArsenicShot, clearArcaneFx, syncStatusLayers, clearStatusLayers, playStatusTickFx, syncVariantState, clearVariantState, playVariantTriggerFx, isEntityVariantLocked, playSummonEnter, playSummonExit, playSummonGuard, clearSummonState, playLingFeng, playIsis, playFeiShaHuaJia, playXieYanKey, playHarmonyShelter, playSilenceDomain, playShatterResonance, playZheYingBu, playStrangeConch, playMeleeGroup, playRangedGroup, playSpellGroup, playRescueGrit, playRescueAvoidFatal, clearRescueState, playVariantResistFx, playCounterAttackL1, playSelfDestructWindup, playSelfDestructBurst, playSelfDestructInterrupt, clearSelfDestructState, syncSelfDestructWarning, setIdentitySfx, setVariantSfx, setStatusSfx, setSelfDestructSfx
// 显式存根: 
// 宿主适配补丁: 混音器分轨音量与声像提示状态×1; 混音器主总线与五轨×1; 语音独立轨×1; 战斗音效声像提示×1; 混音器分轨音量与声像接口×1; 攻防混音上下文×1; 攻防混音上下文×1; 攻防角色分轨×1; 攻防角色分轨×1; 攻防角色分轨×1; 攻防角色之间不削音×1; 记录削音来源角色×1; 记录削音来源角色×1; 采样保留攻防角色×1; 采样走攻防角色分轨×2; 采样保留攻防削音角色×1; 媒体保留攻防角色×1; 媒体走攻防角色分轨×1; 媒体保留攻防削音角色×1; 枪击采样相邻去重×1; 远程击杀隐藏我方名称×1; 特写挂屏幕宿主×2; 特写收尾登记×2; 特写震屏走舞台震动层×1; 特写计时可随重开清理×6; 环境音脱离#battle-scene DOM×1; 环境音独立轨×1; 辅助粒子注入所属句柄×1; fxEngine 不复用页面全局 canvas×1; fxEngine canvas 舞台内绝对定位×1; fxEngine canvas 挂特效舞台×1; fxEngine resize 走舞台×1; fxEngine 宽×1; fxEngine 高×1; fxEngine 去蓄力 overlay×1; fxEngine 去蓄力循环保持×1; 事件总线读宿主 combatToken×1; 连续数字上下错位保留可读×1; 受击数字世界锚点与类型格式×1; 受击数字类型标记×2; 受击数字贴身右侧对齐×1; 闪避残影保留主体尺度×1; 受击数字宿主缩放×1; 受击数字保持原版时序与远景可读×8; 击杀只放大实际 HP 数字×1; 受击数字分层间距×1; 破盾词牌间距×1; 暴击词牌间距×1; 护盾副数字间距×1; 混合破盾词牌间距×1; 受击视觉数字适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 战棋攻击身份适配×1; 重击数字不等定帧×1; 蝎眼钥匙落点参数×1; 蝎眼钥匙裂隙钉召唤落点×1; 蝎眼钥匙裂隙舞台定位×1; 折影步去卡片横移×1; 折影步落点参数×1; 折影步落点涟漪×1; 折影步残影保留圆形尺度×1; 奇异海螺去顿帧×1; 谐律之庇音叉悬于受益者上方×1; 屏幕矩形 → 特效舞台坐标×14; innerWidth → 舞台宽×22; innerHeight → 舞台高×15; body 挂载 → 特效舞台×6; JS position:fixed → absolute×2; arcane canvas resize 走舞台×1; 舞台震动独立层×3; window.* 声音函数改为工厂内本地×14; 按实际吸盾量计算招架档位×1; 受击分类透传护盾档位与免伤破防×1; 去掉波次全类择强×1; 接触拍点按音档播结果×1; 波次只记已播音档×1; 波次收口不再补播×1; 波次重定向只保留待结算目标×1; 波次不缓存结算结果×1; 区分盾与免伤破防×1; 结果音保留接触对象声像与致死重击×1; 受击采样保留播放选项×1; 受击采样保留播放选项×1; 攻防结果分层播放×1; 敌方攻击前摇纳入攻防混音×1; 合成攻击声音保留分轨角色×1; 合成攻击声音保留分轨角色×1; 合成节点按角色缓存×1; 合成节点按角色缓存×1; 重音跟随结算分轨×1; 环境氛围音随清场停止×1; 去抗性全局挂载×1; 毅力血幕挂圆形棋子内框×1; 致命回避残影保留圆形尺度×1; 反击残影保留圆形尺度×1; 灵风术法阵按头像尺度×1; 灵风术法阵透视原点钉在阵心×1; 灵风术收尾羽翼按头像尺度×1; 技能视频随演出倍速×1; 强力反击原版震屏函数×1; 强力反击震屏宿主×1; 强力反击震屏清理登记×1; 强力反击震屏代际×1; 强力反击震屏帧登记×2; 强力反击爆发粒子注入×1; 强力反击蓄力粒子注入×1; 强力反击回调契约×1; 强力反击代际句柄×1; 强力反击取消结果×1; 强力反击闪避缓冲可取消×1; 强力反击蓄力可取消×1; 强力反击预载取消×1; 强力反击起播等待可取消×1; 强力反击登记蓄力光×1; 强力反击音效取消登记×1; 强力反击阶段取消结果×1; 强力反击舞台坐标×1; 强力反击实体DOM蓄力光×1; 强力反击实体DOM×1; 强力反击蓄力粒子×1; 强力反击聚气使用本地函数×1; 强力反击蓄力坐标×1; 强力反击方向坐标×1; 强力反击锁定读取本地模块×1; 强力反击白闪舞台挂载×1; 强力反击白闪计时×1; 强力反击准星舞台坐标×1; 强力反击准星舞台挂载×1; 强力反击准星计时×1; 强力反击爆发与命中回调×1; 强力反击攻击方向实体×1; 强力反击目标震动清理×1; 强力反击原版震屏调用×1; 强力反击余波等待可取消×1; 强力反击保留余波并返回成功×1; CSS position:fixed → absolute×13; CSS 100vw → 舞台宽×1; CSS 100vh/dvh → 舞台高×1; CSS 残留视口单位(按舞台尺度保留)×42; 底座计时随演出倍速×12; 底座间隔随演出倍速×1; 底座时刻随演出倍速×19; 底座句柄时刻随演出倍速×23
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
export const RPG_USED_AUDIO_KEYS = ["defDown","atk2","atk1","taunt","hide","hitDown","shieldUp","defUp","burst","shot","monsterAttack","kanpo","gunshot1","gunshot2","gunshot3","gunshot_pierce","xiandan","enemySwingGroup","enemyRanged","enemyRangedGroup","enemyMagic","enemyMagicGroup","enemyBuff","enemyDebuff","enemyMeleeGroupHit","enemyRangedGroupHit","light_charge","light_impact","thunder_charge","thunder_single_hit","thunder_aoe_hit","bomb_throw","explosion_single","explosion_aoe_charge","explosion_aoe_blast","slash_whoosh_hit_fs434873","claw_bloody_blade_fs323526","frost_crystal_impact_fs550267","aoe_gun_burst_fs482122","aoe_poison_spell_fs219566","aoe_wind_spin_fs772867","fire01","freeze01","wolfman","creature_slime_01","swish_3","parry_3","dodge_2","hit_1a","hit_1b","hit_1c","hit_2a","hit_2b","hit_2c","hit_3a","hit_3b","hit_3c","mx_sand_swish","mx_stygian_whoosh","mx_sword_metal","mx_gear_lock","mx_tunnel","mx_rift_charge","mx_deep_impact","mx_giant_roar","mx_dino_roar","mx_golem_stomp","revive_gather","revive_bloom","molt_crack","molt_snap","molt_empower","rage_exit","link_dash","link_chime","leech_flow","regen_hum","thorn_parry","resist_fluid","resist_phantom","resist_antimagic","resist_vital","resist_fireproof","resist_poisonproof","resist_ironbody","ranshao","fog","mx_rift_tear","mx_vacuum","mx_armor_strike","sd_ring_blast","sd_shatter_blast","huoyan01","parry_perfect","avoid_dash_perfect","sheshen_armor_step","fork432","forkHum","forkMute","bowlBronze","bowlClear","bellPing","crystalSnap","mirrorRing","mirrorStream","bastetChime","bastetCast","bastetHeal","conchCharge","conchMist","windHum","crystalChime","dodgeWind","parryShield"];

export function createRpgAv(host) {
  // ---- 宿主注入（战棋舞台、单位视图、代际令牌） ----
  const __STAGE = host.stage;              // { el, w, h, onResize(fn), shakeEl() }
  const __GBCR = host.rectSymbol;          // Element.prototype[__GBCR]() → 舞台坐标矩形
  const __fxNow = host.clock.now, __fxDateNow = host.clock.dateNow, __fxTimeout = host.clock.timeout, __fxInterval = host.clock.interval, __fxScale = host.clock.scale;
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
  const hasVariantTag = (e, name) => host.hasVariantTag(e, name);
  const summonEnterPending = new Set(); // 仅隐藏本批尚未显象的占位，不参与名额、存档或结算。

// 【召唤】名额与硬闸（调参点集中在这里）
const SUMMON_SIDE_LIMIT = 4;    // 每阵营（我方/敌方各自）存活召唤物名额；带 [众召] 的技能不受此限
const SUMMON_CAST_MAX = 12;     // 单次释放（一个技能/物品）的召唤总数硬闸，防 *N 手滑把界面冻住
const ENEMY_TOTAL_HARD_CAP = 12; // 敌方阵营总数硬闸（含非召唤物）；[众召] 不绕过它（性能/UI 安全阀）

// 占用名额的召唤物数：[众召] 召唤出来的（summonNoLimit）不计入
function countLimitedSummons(side) {
    const arr = side === 'hero' ? heroesData : enemiesData;
    return (arr || []).filter(e => e.isAlive && !e.isSubdued && e.isSummon && !e.summonNoLimit).length;
}

  // ---- 击杀特写 / 大招 Cut-in（原版顶层函数；屏幕宿主由战棋提供，重开/清场统一取消计时与遮罩） ----
  const __MOMENTS = new Set(), __momentTimers = new Set();
  const __SCREEN = () => (host.screen ? host.screen() : __STAGE.el);
  function __momentTimeout(fn, ms) { const id = __fxTimeout(() => { __momentTimers.delete(id); fn(); }, ms); __momentTimers.add(id); return id; }
  function clearMoments() { __momentTimers.forEach(clearTimeout); __momentTimers.clear(); __MOMENTS.forEach(o => o.remove()); __MOMENTS.clear(); }
async function playExecutionAnimation(hero, killedEnemies, damageType) {
    return new Promise(resolve => {
        const type = damageType || '近战';
        const n = killedEnemies.length;
        // 多敌时敌人单元尺寸/字号动态收缩，避免竖屏溢出
        const sizeCls = n > 2 ? 'text-[3rem] sm:text-[4.5rem]' : n > 1 ? 'text-[4rem] sm:text-[6rem]' : 'text-[5.5rem] sm:text-[8rem]';
        const unitSize = n > 2 ? 'clamp(38px,10vh,110px)' : n > 1 ? 'clamp(58px,15vh,150px)' : 'clamp(80px,18vh,170px)';
        const enemyVisual = enemy => enemy.img
            ? `<img src="${enemy.img}" class="w-full h-full object-contain rounded-xl" />`
            : `<div class="${sizeCls} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">${enemy.emoji || '☠️'}</div>`;

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[200] flex items-center justify-center overflow-hidden transition-opacity duration-300 pointer-events-none';

        let html = '';
        let killDelay = 280; // kill 音效 + 重震屏触发时刻

        function createBloodSplatterHtml(count = 5) {
            const splatters = [
                `M20,10 C35,2 50,15 45,30 C55,40 60,60 45,70 C30,80 15,65 10,50 C5,35 10,18 20,10 Z`,
                `M30,5 C45,5 55,20 50,35 C65,30 75,45 70,60 C55,75 40,70 30,80 C15,75 10,55 15,40 C5,25 20,10 30,5 Z`,
                `M15,20 C30,10 50,10 40,30 C55,35 60,55 45,65 C35,75 20,80 15,60 C5,45 5,30 15,20 Z`,
                `M25,12 C40,4 55,18 48,32 C60,42 62,65 48,72 C32,82 18,68 12,52 C8,38 12,20 25,12 Z`
            ];
            let splatItems = '';
            const positions = [
                { top: '16%', left: '18%', scale: 1.35, rot: -25, delay: '0.18s' },
                { top: '66%', left: '24%', scale: 1.15, rot: 45, delay: '0.22s' },
                { top: '24%', right: '18%', scale: 1.45, rot: 15, delay: '0.20s' },
                { top: '60%', right: '22%', scale: 1.25, rot: -60, delay: '0.24s' },
                { top: '44%', left: '48%', scale: 1.65, rot: 10, delay: '0.16s' },
                { top: '12%', left: '42%', scale: 1.1, rot: 75, delay: '0.25s' },
                { top: '78%', right: '35%', scale: 1.3, rot: -40, delay: '0.26s' },
                { top: '38%', left: '10%', scale: 1.2, rot: -15, delay: '0.21s' }
            ];
            for (let i = 0; i < Math.min(count, positions.length); i++) {
                const p = positions[i];
                const path = splatters[i % splatters.length];
                splatItems += `
                    <div class="absolute pointer-events-none opacity-0 z-40"
                         style="${p.top ? `top:${p.top};` : ''} ${p.left ? `left:${p.left};` : ''} ${p.right ? `right:${p.right};` : ''} width:140px; height:140px; --splat-rot:${p.rot}deg; animation: blood-splat-burst 1.1s ${p.delay} cubic-bezier(0.12, 0.85, 0.25, 1) both; will-change: transform, opacity;">
                        <svg viewBox="0 0 100 100" class="w-full h-full fill-red-800" style="filter: drop-shadow(0 0 8px #3f0000);">
                            <path d="${path}" />
                            <circle cx="85" cy="20" r="4.5" class="fill-red-700"/>
                            <circle cx="15" cy="88" r="4" class="fill-red-900"/>
                            <circle cx="90" cy="75" r="5" class="fill-red-800"/>
                            <circle cx="5" cy="15" r="3.5" class="fill-red-700"/>
                        </svg>
                    </div>`;
            }
            const drips = `
                <div class="absolute top-0 right-[28%] w-1 bg-gradient-to-b from-red-700 via-red-900 to-transparent rounded-full opacity-0 z-40 pointer-events-none"
                     style="height:140px; animation: blood-drip-flow 1.25s 0.22s ease-out both;"></div>
                <div class="absolute top-0 left-[25%] w-1.5 bg-gradient-to-b from-red-800 via-red-950 to-transparent rounded-full opacity-0 z-40 pointer-events-none"
                     style="height:170px; animation: blood-drip-flow 1.35s 0.18s ease-out both;"></div>`;
            return splatItems + drips;
        }

        if (type === '法术') {
            // Style 3：次元裂隙·空间碎镜
            overlay.className += ' bg-slate-950/85';
            overlay.style.setProperty('--hero-ox', '0px');
            overlay.style.setProperty('--hero-oy', '0px');
            killDelay = 250;
            const enemiesHtml = killedEnemies.map(enemy => `
                <div class="flex flex-col items-center gap-1 shrink-0">
                    <div style="width:${unitSize};height:${unitSize};" class="relative flex items-center justify-center">
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(0 0, 50% 0, 50% 50%, 0 50%); animation: s3-shard-1 0.85s 0.25s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(50% 0, 100% 0, 100% 50%, 50% 50%); animation: s3-shard-2 0.85s 0.25s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(0 50%, 50% 50%, 50% 100%, 0 100%); animation: s3-shard-3 0.85s 0.25s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%); animation: s3-shard-4 0.85s 0.25s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                    </div>
                    <div class="text-purple-300 text-[10px] sm:text-xs font-bold tracking-widest whitespace-nowrap">${enemy.name}</div>
                </div>`).join('');

            html = `
                <!-- 紫红高能空间裂隙光带（h-40 为 scaleY 动画基准高，will-change 提示 GPU 合成） -->
                <div class="absolute h-40 w-[160vw] bg-gradient-to-r from-transparent via-purple-600/50 to-transparent left-1/2 top-1/2 opacity-0 z-10"
                     style="animation: s3-rift-beam 1.2s 0.2s cubic-bezier(0.1, 0.9, 0.2, 1) both; will-change: transform, opacity;"></div>
                <div class="absolute h-40 w-[160vw] bg-fuchsia-300 left-1/2 top-1/2 opacity-0 z-20 shadow-[0_0_30px_#c084fc,0_0_60px_#a855f7]"
                     style="animation: s3-rift-beam 1.2s 0.2s cubic-bezier(0.1, 0.9, 0.2, 1) both; will-change: transform, opacity;"></div>

                <!-- 左侧英雄入场 -->
                <div class="absolute left-[12vw] top-1/2 -translate-y-1/2 opacity-0 z-20"
                     style="animation: s1-hero-in 0.3s cubic-bezier(0.12, 0.8, 0.3, 1) both; will-change: transform, opacity;">
                    <div class="w-28 h-28 sm:w-40 sm:h-40 rounded-full border-4 border-purple-400 overflow-hidden shadow-[0_0_40px_#a855f7] bg-gray-900">
                        <img src="${hero.img}" class="w-full h-full object-cover">
                    </div>
                </div>

                <!-- 空间湮灭文字 -->
                <div class="text-[clamp(3.5rem,9vw,9rem)] italic font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-rose-400 text-outline-thick absolute left-1/2 top-1/2 opacity-0 z-30 tracking-[0.3em] whitespace-nowrap"
                     style="animation: s1-vs-anim 1.1s 0.25s ease-out both; will-change: transform, opacity;">
                    ${n > 1 ? '全灭' : '湮灭'}
                </div>

                <!-- 右侧敌人区：每敌四象限晶体碎片崩解 -->
                <div class="absolute right-[10vw] top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 sm:gap-3">
                    ${enemiesHtml}
                </div>`;
        } else if (type === '远程') {
            // Style 4：1920年代芝加哥打字机（.45 ACP 弹幕与屏幕溅血）
            overlay.className += ' bg-black/80';
            overlay.style.setProperty('--hero-ox', '0px');
            overlay.style.setProperty('--hero-oy', '0px');
            killDelay = 220;
            const enemiesHtml = killedEnemies.map(enemy => `
                <div class="flex flex-col items-center gap-1.5 shrink-0">
                    <div style="width:${unitSize};height:${unitSize};" class="relative flex items-center justify-center">
                        <!-- 老式黄铜转盘准星（SVG 硬件加速） -->
                        <div class="absolute left-1/2 top-1/2 opacity-0 z-30 pointer-events-none"
                             style="width:125%; height:125%; animation: v1-tommy-scope 1.1s cubic-bezier(0.1, 0.9, 0.2, 1) both; will-change: transform, opacity;">
                            <svg viewBox="0 0 100 100" class="w-full h-full text-amber-500 stroke-current fill-none" style="filter: drop-shadow(0 0 8px #f59e0b);">
                                <circle cx="50" cy="50" r="44" stroke-width="1.8" stroke-dasharray="10 4" opacity="0.85"/>
                                <circle cx="50" cy="50" r="32" stroke-width="1" opacity="0.7"/>
                                <line x1="50" y1="4" x2="50" y2="30" stroke-width="2.5" stroke="#ef4444"/>
                                <line x1="50" y1="70" x2="50" y2="96" stroke-width="2.5" stroke="#ef4444"/>
                                <line x1="4" y1="50" x2="30" y2="50" stroke-width="2.5" stroke="#ef4444"/>
                                <line x1="70" y1="50" x2="96" y2="50" stroke-width="2.5" stroke="#ef4444"/>
                                <circle cx="50" cy="50" r="4" fill="#dc2626" stroke="none"/>
                            </svg>
                        </div>
                        <!-- 敌人被密集弹雨打成四象限崩碎 -->
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(0 0, 50% 0, 50% 50%, 0 50%); animation: v1-enemy-shatter-tl 0.8s 0.22s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(50% 0, 100% 0, 100% 50%, 50% 50%); animation: v1-enemy-shatter-tr 0.8s 0.22s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(0 50%, 50% 50%, 50% 100%, 0 100%); animation: v1-enemy-shatter-bl 0.8s 0.22s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%); animation: v1-enemy-shatter-br 0.8s 0.22s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                    </div>
                    <div class="text-rose-400 font-mono text-[10px] sm:text-xs font-bold tracking-widest whitespace-nowrap drop-shadow">${enemy.name}</div>
                </div>`).join('');

            html = `
                <!-- 镜头暗红血圈 (Lens Vignette) -->
                <div class="absolute inset-0 pointer-events-none z-10 opacity-0"
                     style="background: radial-gradient(circle, transparent 35%, rgba(136,8,8,0.4) 65%, rgba(63,0,0,0.85) 100%); animation: blood-vignette-pulse 1.1s cubic-bezier(0.1, 0.8, 0.2, 1) both;"></div>

                <!-- 左侧 1920s 怀旧档案相框 -->
                <div class="absolute left-[8vw] top-1/2 -translate-y-1/2 opacity-0 z-20"
                     style="animation: v-hero-in 0.28s cubic-bezier(0.12, 0.8, 0.3, 1) both; will-change: transform, opacity;">
                    <div class="w-32 h-32 sm:w-40 sm:h-40 rounded-xl border-2 border-amber-600/80 bg-stone-900/95 shadow-[0_0_30px_rgba(217,119,6,0.4)] p-1.5 relative overflow-hidden">
                        <img src="${hero.img}" class="w-full h-full object-cover rounded filter contrast-125 sepia-[0.25]">
                    </div>
                </div>

                <!-- 居中 1920s 血印大字 -->
                <div class="absolute left-1/2 top-1/2 opacity-0 z-30 flex flex-col items-center"
                     style="animation: v-stamp-text 1.15s 0.2s cubic-bezier(0.1, 0.9, 0.2, 1) both; will-change: transform, opacity;">
                    <div class="font-cinzel text-[clamp(3.8rem,9.5vw,9rem)] font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-red-500 to-rose-900 text-outline-crimson tracking-wider whitespace-nowrap">
                        ${n > 1 ? '歼 灭' : '处 决'}
                    </div>
                </div>

                <!-- 右侧目标区 -->
                <div class="absolute right-[8vw] top-1/2 -translate-y-1/2 z-20 flex items-center gap-3">
                    ${enemiesHtml}
                </div>

                <!-- 金红弹道贯穿火光 -->
                <div class="absolute left-1/2 top-1/2 w-[160vw] h-2 bg-gradient-to-r from-transparent via-amber-300 to-red-600 opacity-0 z-30 shadow-[0_0_25px_#dc2626]"
                     style="animation: v1-tracer-fire 0.65s 0.2s cubic-bezier(0.1, 0.9, 0.2, 1) both; will-change: transform, opacity;"></div>

                <!-- 屏幕真实喷溅血液 -->
                ${createBloodSplatterHtml(5)}`;
        } else {
            // Style 2（近战，默认）：⚔️ 居合一闪·血溅镜头（8朵血花 + 镜头深暗红暗角）
            overlay.className += ' bg-black/85';
            killDelay = 280;

            const enemiesHtml = killedEnemies.map(enemy => `
                <div class="flex flex-col items-center gap-1 shrink-0">
                    <div style="width:${unitSize};height:${unitSize};" class="relative flex items-center justify-center">
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(0 0, 100% 0, 100% 44%, 0 56%); animation: s1-top-shatter 0.8s 0.28s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                        <div class="absolute inset-0 flex items-center justify-center opacity-0" style="clip-path: polygon(0 56%, 100% 44%, 100% 100%, 0 100%); animation: s1-bottom-shatter 0.8s 0.28s cubic-bezier(0.1, 0.8, 0.2, 1) both; will-change: transform, opacity;">${enemyVisual(enemy)}</div>
                    </div>
                    <div class="text-rose-300 text-[10px] sm:text-xs font-bold tracking-widest whitespace-nowrap drop-shadow">${enemy.name}</div>
                </div>`).join('');

            html = `
                <!-- 1. 镜头深暗红暗角 (Lens Vignette) 与 8 朵飞溅血花 (彻底替代刺眼白闪) -->
                <div class="absolute inset-0 pointer-events-none z-10 opacity-0"
                     style="background: radial-gradient(circle, transparent 25%, rgba(160,10,10,0.55) 60%, rgba(80,0,0,0.92) 100%); animation: blood-vignette-pulse 1.15s cubic-bezier(0.1, 0.8, 0.2, 1) both;"></div>
                ${createBloodSplatterHtml(8)}

                <!-- 2. 全屏撕裂光带与锐利刀光核心 (GPU scaleY 驱动) -->
                <div class="absolute h-24 w-[180vw] bg-gradient-to-r from-transparent via-rose-600/50 to-transparent left-1/2 top-1/2 opacity-0 z-10"
                     style="animation: s2-blade-flash 0.9s 0.25s cubic-bezier(0.1, 0.9, 0.2, 1) both; will-change: transform, opacity;"></div>
                <div class="absolute h-1.5 bg-rose-400 w-[180vw] left-1/2 top-1/2 opacity-0 z-20 shadow-[0_0_30px_#f43f5e,0_0_60px_#fff]"
                     style="animation: s2-blade-flash 0.9s 0.25s cubic-bezier(0.1, 0.9, 0.2, 1) both; will-change: transform, opacity;"></div>

                <!-- 3. 英雄残影极速瞬步穿梭 (从左侧穿刺至右侧定格) -->
                <div class="absolute left-1/2 top-1/2 opacity-0 z-30" 
                     style="animation: s2-hero-blur-dash 1.2s cubic-bezier(0.14, 1, 0.28, 1) both; will-change: transform, opacity, filter;">
                    <div class="w-32 h-32 sm:w-44 sm:h-44 rounded-full border-4 border-rose-500 overflow-hidden shadow-[0_0_40px_#f43f5e] bg-black">
                        <img src="${hero.img}" class="w-full h-full object-cover">
                    </div>
                </div>

                <!-- 4. 居中金石水墨印章大字「斬」/「全滅」-->
                <div class="absolute left-1/2 top-1/2 opacity-0 z-30 flex flex-col items-center pointer-events-none" 
                     style="animation: s2-ink-stamp 1.2s 0.28s cubic-bezier(0.14, 1, 0.28, 1) both; will-change: transform, opacity;">
                    <div class="font-cinzel text-[clamp(4.5rem,12vw,12rem)] font-black text-rose-500 text-outline-crimson tracking-wider drop-shadow-[0_0_50px_#e11d48]">
                        ${n > 1 ? '全 滅' : '斬'}
                    </div>
                    <div class="text-rose-200 text-xs sm:text-base font-bold tracking-[0.8em] -mt-3 sm:-mt-5 uppercase drop-shadow">
                        ${n > 1 ? 'ALL TARGETS NEUTRALIZED' : 'EXECUTION COMPLETE'}
                    </div>
                </div>

                <!-- 5. 右侧被斩敌人碎裂区 (支持单体与多目标 flex 排布) -->
                <div class="absolute right-[12vw] top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 sm:gap-4">
                    ${enemiesHtml}
                </div>`;
        }

        overlay.innerHTML = html;
        __SCREEN().appendChild(overlay); __MOMENTS.add(overlay);

        // 风格开场音效（击杀相关 2 倍音量）
        if (type === '法术') playSound('burst', 2, 1, { category:'M' });
        else if (type === '远程') playSound('shot', 2, 1, { category:'M' });
        else if (type === '近战') playSound('atk1', 2, 1, { category:'M' });

        __momentTimeout(() => {
            playSound('kill', 2, 1, { category:'M' });
            if (type === '近战') playSound('combatKill', 2, 1, { category:'M' });
            else if (type === '法术') playSound('magicKill', 2, 1, { category:'M' });
            const scene = __STAGE.shakeEl();
            if (scene) { scene.classList.add('heavy-shake'); __momentTimeout(() => scene.classList.remove('heavy-shake'), 500); }
        }, killDelay);

        __momentTimeout(() => { overlay.style.opacity = '0'; __momentTimeout(() => { overlay.remove(); __MOMENTS.delete(overlay); resolve(); }, 300); }, 1450);
    });
}

async function playEnemyUltimateCutin(enemy, skillName) {
    return new Promise(resolve => {
        // 创建全屏遮罩
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[200] bg-black/70 flex items-center justify-center overflow-hidden anim-cutin-overlay pointer-events-none';
        
        // 判断是使用图片还是 Emoji
        const visualContent = enemy.img 
            ? `<img src="${enemy.img}" class="w-48 h-48 sm:w-80 sm:h-80 object-cover rounded-full border-4 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.8)]" />` 
            : `<div class="text-[8rem] sm:text-[12rem] drop-shadow-[0_0_30px_rgba(244,63,94,1)]">${enemy.emoji}</div>`;

        overlay.innerHTML = `
            <!-- 背后压暗的撕裂色带 -->
            <div class="absolute top-1/2 left-1/2 w-[150vw] bg-gradient-to-r from-transparent via-rose-950/80 to-transparent anim-cutin-slash z-0"></div>
            
            <div class="relative w-full max-w-6xl h-full flex items-center justify-between px-4 sm:px-20 z-10 overflow-visible">
                <!-- 左侧滑入技能名 -->
                <div class="anim-cutin-text flex-1 text-left relative z-20">
                    <div class="text-rose-500 font-black text-outline text-5xl sm:text-8xl tracking-widest italic whitespace-nowrap mb-2">
                        ${skillName}
                    </div>
                    <div class="text-rose-300/80 font-bold text-xl sm:text-3xl tracking-[0.5em] uppercase">
                        CRITICAL THREAT
                    </div>
                </div>
                
                <!-- 右侧滑入敌人视觉体 -->
                <div class="anim-cutin-avatar flex-shrink-0 z-10 relative">
                    ${visualContent}
                </div>
            </div>
        `;

        __SCREEN().appendChild(overlay); __MOMENTS.add(overlay);

        // 播放警告音效
        playSound('taunt', 1, 1, { category:'L' });
        __momentTimeout(() => playSound('burst', 1, 1, { category:'L' }), 200);

        // 1.6秒动画结束后清理 DOM 并释放 Promise
        __momentTimeout(() => {
            overlay.remove(); __MOMENTS.delete(overlay);
            resolve();
        }, 1600);
    });
}

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
    const __busVol = { master: 1, skill: 1, result: 1, aux: 1, voice: 1, atmo: 1 }; let __panHint = null;
    const buffers = new Map(), decodes = new Map(), voices = new Set(), protections = new Set(), timers = new Map();
    const categories = {
        A:{ priority:8, gain:1.3 }, C:{ priority:8, gain:1.3 }, M:{ priority:7, gain:1 }, B:{ priority:6, gain:1.3 },
        D:{ priority:5, gain:1 }, E:{ priority:4, gain:1 }, N:{ priority:3, gain:1 }, F:{ priority:2, gain:1 },
        G:{ priority:2, gain:1 }, H:{ priority:1, gain:1 }, I:{ priority:1, gain:1 }, K:{ priority:0, gain:1 },
        J:{ priority:0, gain:1 }, L:{ priority:0, gain:1 }
    };
    const profiles = { short:{ holdMs:180 }, special:{ holdMs:450 } };
    const trackOf = category => category === 'N' ? 'voice' : ['F','G','H','I'].includes(category) ? 'result' : ['A','B','C','D','E'].includes(category) ? 'skill' : 'aux';
    const categoryOf = opts => opts.category || opts.audioContext?.category || opts.owner?.audioContext?.category || audioScope?.category
        || (opts.track === 'skill' ? 'D' : opts.track === 'result' ? 'F' : 'K');
    const combatOf = opts => opts.combat ?? opts.audioContext?.combat ?? opts.owner?.audioContext?.combat ?? audioScope?.combat ?? false;
    function capture(fallback = 'K') { return audioScope || Object.freeze({ category:fallback }); }
    function withContext(value, fn) {
        const previous = audioScope;
        audioScope = Object.freeze(typeof value === 'string' ? { category:value } : { ...value });
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
            const __master = ctx.createGain(); __master.gain.value = __busVol.master; __master.connect(ctx.destination); tracks.master = __master;
            for (const name of ['skill', 'result', 'aux', 'voice', 'atmo']) { const bus = ctx.createGain(); bus.gain.value = __busVol[name]; bus.connect(__master); tracks[name] = bus; }
        }
        return ctx;
    }
    function output(track = 'skill', category = null, combat = false) {
        context();
        if (!category) return tracks[track];
        const key = track + ':' + category + (combat ? ':combat' : '');
        if (!categoryTracks.has(key)) {
            const node = ctx.createGain(); node.gain.value = categories[category].gain; node.connect(tracks[track]);
            categoryTracks.set(key, { node, category, combat, envelope:[] }); duck();
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
                    const gap = p.combat && entry.combat ? 0 : p.priority - settings.priority;
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
    function protect(profile = 'short', when, owner = null, category = null, combat = combatOf({ owner })) {
        const audioCtx = context(); if (!audioCtx) return () => {};
        const name = category || owner?.audioContext?.category || audioScope?.category || (profile === 'special' ? 'A' : 'D');
        const priority = categories[name].priority;
        if (!priority) return () => {};
        const holdMs = ['A','B','C'].includes(name) ? profiles.special.holdMs : profiles.short.holdMs;
        const p = { start:when == null ? audioCtx.currentTime : when, owner, category:name, priority, holdMs, combat };
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
        const combat = combatOf(opts);
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
            const __p = opts.pan != null ? opts.pan : (cue.track === 'skill' || cue.track === 'result') ? __panHint : null;
            if (__p != null && audioCtx.createStereoPanner) { pan = audioCtx.createStereoPanner(); pan.pan.value = __p; gain.connect(pan); pan.connect(output(cue.track, cue.category, combat)); }
            else gain.connect(output(cue.track, cue.category, combat));
        }
        function started(when, duration) {
            cue.when = when;
            if (gain) {
                gain.gain.setValueAtTime(opts.vol == null ? 0.5 : opts.vol, when);
                const fadeIn = opts.fadeInSec || 0, fadeOut = Math.min(opts.fadeOutSec || 0, duration * 0.45);
                if (fadeIn) { gain.gain.setValueAtTime(0.0001, when); gain.gain.linearRampToValueAtTime(opts.vol == null ? 0.5 : opts.vol, when + Math.min(fadeIn, duration * 0.25)); }
                if (fadeOut) { gain.gain.setValueAtTime(opts.vol == null ? 0.5 : opts.vol, when + duration - fadeOut); gain.gain.linearRampToValueAtTime(0.0001, when + duration); }
            }
            cancelProtect = protect(opts.profile || 'short', when, cue.owner, cue.category, combat);
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
        const category = categoryOf(Object.assign({ track }, opts)), combat = combatOf(opts);
        const audioCtx = context(); if (!audioCtx) { element.volume = Math.min(1, volume * categories[category].gain); return () => {}; }
        const source = audioCtx.createMediaElementSource(element), gain = audioCtx.createGain();
        let released = false, cancelProtect = null;
        gain.gain.value = volume; source.connect(gain); gain.connect(output(track, category, combat));
        function release(stop) {
            if (released) return; released = true;
            if (stop) element.pause();
            if (cancelProtect) cancelProtect();
            source.disconnect(); gain.disconnect(); voices.delete(cue);
        }
        const cue = () => release(true);
        voices.add(cue);
        element.addEventListener('ended', () => release(false), { once:true });
        element.addEventListener('playing', () => { cancelProtect = protect('special', audioCtx.currentTime, opts.owner, category, combat); }, { once:true });
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
    function setBusVolume(name, v) { __busVol[name] = v; if (ctx && tracks[name]) tracks[name].gain.setTargetAtTime(v, ctx.currentTime, 0.015); }
    function setPanHint(p) { __panHint = p; }
    return { setBusVolume, setPanHint, context, skillContext, output, load, prepare, prepareSkill, play, protect, atTime, bindOwner, media, clear, buffers, decodes, categories, classify, capture, withContext, trackOf };
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
    const previous = playRandomStandardGunshot.last;
    const available = candidates.filter(key => key !== previous);
    const chosen = available[Math.floor(Math.random() * available.length)];
    playRandomStandardGunshot.last = chosen;
    const cue = playSound(chosen, 0.95, 1, { track:'skill', sync:true, owner, audioContext:owner?.audioContext || CombatAudioMixer.capture('D') });
    if (owner) owner.attackCue = cue;
    return chosen;
}
playRandomStandardGunshot.last = null;

function playShotgunSound(owner = null) {
    const cue = playSound('xiandan', 0.95, 1, { track:'skill', sync:true, owner, audioContext:owner?.audioContext || CombatAudioMixer.capture('D') });
    if (owner) owner.attackCue = cue;
    return cue;
}


  const POWER_COUNTER_SOUND_URL = `${ASSET_BASE}/shot01.mp3`;
  const powerRuns = new Set();
  function powerCounterRun() {
    const run = { active: true, timers: new Set(), frames: new Set(), nodes: new Set(), waits: new Set(), particles: new Set(), cue: null, glow: null, shaking: null, shakeScene: null };
    powerRuns.add(run);
    return run;
  }
  function powerSchedule(run, fn, ms) {
    const id = __fxTimeout(() => { run.timers.delete(id); if (run.active) fn(); }, ms);
    run.timers.add(id);
    return id;
  }
  function powerWait(run, ms) {
    return new Promise(resolve => {
      run.waits.add(resolve);
      powerSchedule(run, () => { run.waits.delete(resolve); resolve(true); }, ms);
    });
  }
  function powerFrame(run, fn) {
    const id = requestAnimationFrame(() => { run.frames.delete(id); if (run.active) fn(); });
    run.frames.add(id);
  }
  function powerAwait(run, promise) {
    return new Promise((resolve, reject) => {
      run.waits.add(resolve);
      Promise.resolve(promise).then(value => { run.waits.delete(resolve); resolve(value); }, error => { run.waits.delete(resolve); reject(error); });
    });
  }
  function powerParticle(run, particle) { run.particles.add(particle); fxEngine.addParticle(particle); }
  function powerCenter(dom) {
    const r = dom ? dom[__GBCR]() : { left: __STAGE.w / 2, top: __STAGE.h / 2, width: 0, height: 0 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function powerFinish(run, cancelled = true) {
    run.active = false;
    run.timers.forEach(clearTimeout); run.timers.clear();
    run.frames.forEach(cancelAnimationFrame); run.frames.clear();
    if (run.shakeScene) run.shakeScene.style.transform = '';
    run.waits.forEach(resolve => resolve(false)); run.waits.clear();
    run.nodes.forEach(n => n.remove()); run.nodes.clear();
    run.glow?.classList.remove('power-glow');
    run.shaking?.classList.remove('shake');
    if (cancelled) {
      run.cue?.stop?.();
      fxEngine.particles = fxEngine.particles.filter(p => !run.particles.has(p));
    }
    run.particles.clear();
    powerRuns.delete(run);
  }
  function clearPowerCounterEffects() { for (const run of [...powerRuns]) powerFinish(run); }
function playPowerCounterShake(run, intensity = 6, duration = 300) {
    const scene = __STAGE.shakeEl();
    if (!scene) return;
    run.shakeScene = scene;
    const startTime = __fxDateNow();

    const shakeLoop = () => {
        if (!run.active) { scene.style.transform = ''; return; }
        const elapsed = __fxDateNow() - startTime;
        if (elapsed < duration) {
            const decay = 1 - (elapsed / duration);
            const dx = (Math.random() - 0.5) * intensity * decay;
            const dy = (Math.random() - 0.5) * intensity * decay;
            scene.style.transform = `translate(${dx}px, ${dy}px)`;
            powerFrame(run, shakeLoop);
        } else {
            scene.style.transform = '';
        }
    };
    powerFrame(run, shakeLoop);
};
function spawnPowerBurst(addParticle, x, y, dirAngle = 0) {
    // ── 强力反击三层粒子：冲击波环 + 定向碎片 + 余波血雾 ──

    // 【第一层】白→红双环冲击波，极速扩散消散（≈80ms 扩至最大）
    addParticle({
        x, y, vx: 0, vy: 0, age: 0, life: 90, maxR: 70,
        draw(ctx, pct) {
            const r = this.maxR * Math.pow(pct, 0.45); // 先快后慢
            const a = 1 - pct;
            ctx.lineWidth = 7 * (1 - pct) + 1;
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = a * 0.9;
            ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#ff4040';
            ctx.lineWidth = 4 * (1 - pct) + 1;
            ctx.globalAlpha = a * 0.7;
            ctx.beginPath(); ctx.arc(this.x, this.y, r * 1.18, 0, Math.PI * 2); ctx.stroke();
        }
    });
    // 辅助小环（稍慢，增加层次感）
    addParticle({
        x, y, vx: 0, vy: 0, age: 0, life: 160, maxR: 48,
        draw(ctx, pct) {
            const r = this.maxR * pct;
            ctx.strokeStyle = '#ff8060';
            ctx.lineWidth = 3 * (1 - pct);
            ctx.globalAlpha = (1 - pct) * 0.55;
            ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
        }
    });

    // 【第二层】定向碎片：以 dirAngle 为主轴，120° 扇形内高速喷射，红/白双色
    const SHARD_COUNT = 52;
    for (let i = 0; i < SHARD_COUNT; i++) {
        const isFront = i < SHARD_COUNT * 0.65; // 65% 沿攻击方向集中
        const spread = isFront ? (Math.random() - 0.5) * Math.PI * 0.7 : Math.random() * Math.PI * 2;
        const angle = isFront ? dirAngle + spread : spread;
        const speed = isFront ? (14 + Math.random() * 26) : (6 + Math.random() * 12);
        const isWhite = Math.random() < 0.28; // 28% 为白色高光碎片
        const color = isWhite ? '#ffffff' : (['#ff1a1a', '#cc0000', '#e03020', '#8b0000'])[Math.floor(Math.random() * 4)];
        const sz = isWhite ? (1.5 + Math.random() * 3) : (3 + Math.random() * 7);
        addParticle({
            x, y,
            vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
            gravity: 0.38, drag: 0.90, age: 0,
            life: isWhite ? (60 + Math.random() * 80) : (180 + Math.random() * 180),
            size: sz, color, isWhite,
            draw(ctx, pct) {
                const alpha = this.isWhite ? (1 - pct) * 0.95 : 1 - Math.pow(pct, 1.6);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.size * (1 - pct * 0.4), 0, Math.PI * 2); ctx.fill();
                // 白色粒子额外绘制十字高光
                if (this.isWhite && pct < 0.4) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = alpha * 0.6;
                    const r = this.size * 2.5;
                    ctx.beginPath();
                    ctx.moveTo(this.x - r, this.y); ctx.lineTo(this.x + r, this.y);
                    ctx.moveTo(this.x, this.y - r); ctx.lineTo(this.x, this.y + r);
                    ctx.stroke();
                }
            }
        });
    }

    // 【第三层】余波血雾：低速、持续时间长、向下飘落，模拟残留血气
    for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3.5;
        addParticle({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 20,
            vx: speed * Math.cos(angle), vy: speed * Math.sin(angle) - 0.5,
            gravity: -0.04, drag: 0.97, age: 0,
            life: 400 + Math.random() * 300,
            size: 5 + Math.random() * 9,
            color: '#6b0000',
            draw(ctx, pct) {
                const alpha = Math.sin(pct * Math.PI) * 0.45;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.size * (1 - pct * 0.6), 0, Math.PI * 2); ctx.fill();
            }
        });
    }
}
function spawnChargeUpParticles(addParticle, schedule, cx, cy, color = '#a78bfa', duration = 320) {
    // duration 为真实毫秒（粒子引擎已 delta-time 化，动画速度与 FPS 解耦）
    // 校准基准：高刷屏 165fps 下的历史观感 ≈ 320ms，故主调用点从 490 收敛到 320
    const count = 28;
    for (let i = 0; i < count; i++) {
        const spawnRadius = 90 + Math.random() * 60;
        const angle = Math.random() * Math.PI * 2;
        const startX = cx + spawnRadius * Math.cos(angle);
        const startY = cy + spawnRadius * Math.sin(angle);
        // 粒子最大延迟也等比压缩（0.6→0.42），让聚拢感更紧凑有力
        const spawnDelay = Math.random() * (duration * 0.42);

        schedule(() => {
            const life = duration - spawnDelay + 35;

            addParticle({
                x: startX, y: startY,
                vx: 0, vy: 0,
                age: 0, life: life,
                cx: cx, cy: cy,
                color: color,
                size: 2.5 + Math.random() * 2.5,
                startX: startX, startY: startY,
                draw(ctx, pct) {
                    this.x = this.startX + (this.cx - this.startX) * pct;
                    this.y = this.startY + (this.cy - this.startY) * pct;

                    const alpha = Math.sin(pct * Math.PI);
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = alpha * 0.9;

                    const trailLen = 1 - pct;
                    if (trailLen > 0.1) {
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = this.size * 0.8;
                        ctx.globalAlpha = alpha * 0.5;
                        ctx.beginPath();
                        const trailX = this.startX + (this.cx - this.startX) * Math.max(0, pct - 0.08);
                        const trailY = this.startY + (this.cy - this.startY) * Math.max(0, pct - 0.08);
                        ctx.moveTo(trailX, trailY);
                        ctx.lineTo(this.x, this.y);
                        ctx.stroke();
                    }

                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * (1 - pct * 0.5), 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }, spawnDelay);
    }

    // 旋转光环（随duration加快，旋转圈数不变，但速度更快）
    addParticle({
        x: cx, y: cy, vx: 0, vy: 0, age: 0, life: duration,
        draw(ctx, pct) {
            const alpha = Math.sin(pct * Math.PI) * 0.7;
            const radius = 30 + pct * 25;
            const rotation = pct * Math.PI * 3;

            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, rotation, rotation + Math.PI * 1.5);
            ctx.stroke();

            ctx.lineWidth = 1.2;
            ctx.globalAlpha = alpha * 0.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.65, -rotation * 1.3, -rotation * 1.3 + Math.PI);
            ctx.stroke();
        }
    });
};
async function playPowerCounterEffect(counter, victim, counterDom, onImpact) {
    const _actionToken = combatToken;
    const run = powerCounterRun();
    const alive = () => run.active && _actionToken === combatToken && !_pipelineFrozen;
    const shotReady = CombatAudioMixer.prepare(POWER_COUNTER_SOUND_URL);
    if (!alive()) return false;
    const victimDom = getEntitySpriteDom(victim) || (victim.id.startsWith('h') ? document.getElementById(`hero-card-${victim.id}`) : document.getElementById(`${victim.id}-sprite`));
    const victimCenter = powerCenter(victimDom);

    // ── 立即清除瞄准框（targeting-mode-enemy 会让敌方精灵上留有准星 CSS 动画）──
    document.getElementById('enemies-container')?.classList.remove('targeting-mode-enemy');
    document.getElementById('heroes-container')?.classList.remove('targeting-mode-hero');

    // ── 观感缓冲：先让"闪避"特效（烟雾 + 抖动，约 500ms）完整呈现，再开始聚气 ──
    // 避免强力反击的聚气红光/粒子立刻盖过闪避演出，导致角色看起来"径直打了敌人一下"
    await powerWait(run, 500); if (!alive()) return false;

    // ── 阶段1：蓄力前摇（350ms）── 聚气光效 + 蓄力音效 + 聚气粒子
    playSound('atkUp', 1, 1, { category:'C' });
    const heroCard = counterDom;
    if (heroCard) {
        run.glow = heroCard;
        heroCard.classList.remove('burst-active', 'burst-ready');
        heroCard.classList.add('power-glow');
    }
    // 在反击者位置生成红色聚气粒子，让蓄力阶段可见
    const counterDomEl2 = counterDom || getEntitySpriteDom(counter);
    if (counterDomEl2) {
        const cc = powerCenter(counterDomEl2);
        spawnChargeUpParticles(p => powerParticle(run, p), (fn, ms) => powerSchedule(run, fn, ms), cc.x, cc.y, '#ff4040', 210);
    }
    await powerWait(run, 350); if (!alive()) return false;

    // ── 阶段2：命中瞬间 ──
    await powerAwait(run, shotReady); if (!alive()) return false;
    const cue = run.cue = playCustomAudio(POWER_COUNTER_SOUND_URL, undefined, 1, { track:'skill', sync:true, profile:'special', category:'C' });
    if (cue && cue.started) await powerAwait(run, cue.started);
    if (!alive()) return false;
    // 2a. 径向白闪（以受击者为圆心）
    const flash = document.createElement('div');
    flash.className = 'pc-radial-flash';
    flash.style.left = `${victimCenter.x}px`;
    flash.style.top  = `${victimCenter.y}px`;
    __STAGE.el.appendChild(flash); run.nodes.add(flash);
    powerSchedule(run, () => { flash.remove(); run.nodes.delete(flash); }, 240);

    // 2b. 主音已在命中拍点起播。

    // 2c. 命中准星（圆形+十字线+辉光，替换有方块渲染问题的刀光）
    (() => {
        const rect = victimDom ? victimDom[__GBCR]() : { left: victimCenter.x, top: victimCenter.y, width: 0, height: 0 };
        const cx = rect.left + rect.width / 2;
        const cy = rect.top  + rect.height / 2;
        const ch = document.createElement('div');
        ch.className = 'pc-crosshair';
        ch.style.left = `${cx}px`;
        ch.style.top  = `${cy}px`;
        ch.innerHTML = `<svg style="width:90px;height:90px;" viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="ch-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- 圆形 -->
          <circle cx="50" cy="50" r="34" fill="none" stroke="#ff3030" stroke-width="3"
            stroke-dasharray="14 7" filter="url(#ch-glow)" opacity="0.95"/>
          <circle cx="50" cy="50" r="8" fill="none" stroke="#ff6060" stroke-width="2.5"
            filter="url(#ch-glow)"/>
          <!-- 十字长臂 -->
          <line x1="50" y1="4"  x2="50" y2="30" stroke="#ff3030" stroke-width="3.5" stroke-linecap="round" filter="url(#ch-glow)"/>
          <line x1="50" y1="70" x2="50" y2="96" stroke="#ff3030" stroke-width="3.5" stroke-linecap="round" filter="url(#ch-glow)"/>
          <line x1="4"  y1="50" x2="30" y2="50" stroke="#ff3030" stroke-width="3.5" stroke-linecap="round" filter="url(#ch-glow)"/>
          <line x1="70" y1="50" x2="96" y2="50" stroke="#ff3030" stroke-width="3.5" stroke-linecap="round" filter="url(#ch-glow)"/>
          <!-- 内短臂（白色高光） -->
          <line x1="50" y1="38" x2="50" y2="45" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
          <line x1="50" y1="55" x2="50" y2="62" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
          <line x1="38" y1="50" x2="45" y2="50" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
          <line x1="55" y1="50" x2="62" y2="50" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        </svg>`;
        __STAGE.el.appendChild(ch); run.nodes.add(ch);
        powerSchedule(run, () => { ch.remove(); run.nodes.delete(ch); }, 340);
    })();

    // 2d. 顿帧（仅粒子层）
    fxEngine.hitStop = 80;

    // 2e. 三层爆发粒子：计算攻击方向角（counter → victim）
    const counterDomEl = counterDom || getEntitySpriteDom(counter);
    const counterCenter = counterDomEl ? powerCenter(counterDomEl) : { x: victimCenter.x - 100, y: victimCenter.y };
    const dirAngle = Math.atan2(victimCenter.y - counterCenter.y, victimCenter.x - counterCenter.x);
    spawnPowerBurst(p => powerParticle(run, p), victimCenter.x, victimCenter.y, dirAngle); onImpact?.();

    // 2f. 受击方抖动 + 屏幕震动（短促高强度）
    if (victimDom && !arcane.isEntityVariantLocked(victimDom)) { run.shaking = victimDom; victimDom.classList.add('shake'); powerSchedule(run, () => { victimDom.classList.remove('shake'); run.shaking = null; }, 300); }
    playPowerCounterShake(run, 20, 180);

    // ── 阶段3：余波等待 ──
    await powerWait(run, 220); if (!alive()) return false;
    if (heroCard) heroCard.classList.remove('power-glow');
    powerSchedule(run, () => powerFinish(run, false), 900);
    return true;
}

  // ---- 造雾术 / 高阶召唤术全屏 SVG 构件（原样） ----
const RLYEH_FOG_CLOUD_URL = `${ASSET_BASE}/fog.mp3`;
function getEldritchAudioContext() { const ctx = CombatAudioMixer.skillContext(); if (ctx) CombatAudioMixer.protect('special', ctx.currentTime, null, CombatAudioMixer.capture('B').category); return ctx; }
function playEldritchWhisper() {
    try {
        const ctx = getEldritchAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [440, 622.25, 880, 1244.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            osc.frequency.linearRampToValueAtTime(freq + (idx % 2 === 0 ? 12 : -12), now + 0.8);
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc.connect(gain); gain.connect(CombatAudioMixer.output('skill', CombatAudioMixer.capture('B').category));
            osc.start(now); osc.stop(now + 0.95);
        });
    } catch(e) {}
}
function buildRlyehSedimentFxHtml() {
    const dur = 1.35.toFixed(2);
    return `
        <div class="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div class="absolute left-1/2 bottom-8 pointer-events-none" style="width:720px;height:340px;animation: mist-obsidian-carpet ${dur}s cubic-bezier(0.12, 0.9, 0.25, 1) both;">
            <svg viewBox="0 0 500 200" class="w-full h-full">
              <defs>
                <linearGradient id="fx-rlyeh-obsidian-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stop-color="#020617" stop-opacity="0.98" />
                  <stop offset="35%" stop-color="#0369a1" stop-opacity="0.85" />
                  <stop offset="70%" stop-color="#38bdf8" stop-opacity="0.55" />
                  <stop offset="100%" stop-color="#e0f2fe" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path d="M10,180 Q80,60 170,110 Q260,30 350,90 Q430,40 490,180 Z" fill="url(#fx-rlyeh-obsidian-grad)" style="filter: drop-shadow(0 0 35px #0284c7);" />
              <path d="M50,190 Q130,100 220,130 Q310,70 400,140 Q450,110 470,190 Z" fill="#38bdf8" opacity="0.45" />
            </svg>
          </div>
          <div class="absolute left-1/2 top-1/2 pointer-events-none" style="width:480px;height:520px;animation: mist-vertical-jet ${dur}s cubic-bezier(0.15, 0.95, 0.25, 1) both;">
            <svg viewBox="0 0 300 320" class="w-full h-full">
              <defs>
                <linearGradient id="fx-rlyeh-steam-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stop-color="#0c4a6e" stop-opacity="0.9" />
                  <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.7" />
                  <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path d="M80,310 Q60,180 85,90 Q105,20 120,10 Q135,20 145,90 Q155,180 135,310 Z" fill="url(#fx-rlyeh-steam-grad)" style="filter: drop-shadow(0 0 25px #38bdf8);" />
              <path d="M170,310 Q150,190 175,110 Q195,40 210,30 Q225,40 235,110 Q245,190 225,310 Z" fill="url(#fx-rlyeh-steam-grad)" opacity="0.8" />
            </svg>
          </div>
        </div>
      `;
}
function buildTitanGazeFxHtml() {
    const dur = 1.4.toFixed(2);
    return `
        <div class="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div class="fixed inset-0 pointer-events-none" style="background:radial-gradient(circle at center, transparent 15%, rgba(20,5,10,0.85) 70%, rgba(0,0,0,0.98) 100%);animation: brine-drown-vignette ${dur}s ease-in-out both;"></div>
          <div class="absolute left-1/2 top-1/2 pointer-events-none" style="width:600px;height:600px;animation: titan-shadow-loom ${dur}s cubic-bezier(0.15, 0.9, 0.25, 1) both;">
            <svg viewBox="0 0 300 300" class="w-full h-full fill-current text-[#16060c]" style="filter: drop-shadow(0 0 40px #dc2626);">
              <path d="M150,40 C110,40 80,70 70,110 C50,120 10,130 0,170 C30,175 60,165 75,150 C70,190 90,240 100,280 C115,260 130,220 135,180 C145,210 155,210 165,180 C170,220 185,260 200,280 C210,240 230,190 225,150 C240,165 270,175 300,170 C290,130 250,120 230,110 C220,70 190,40 150,40 Z" />
            </svg>
          </div>
          <div class="absolute left-1/2 top-1/2 pointer-events-none" style="width:192px;height:128px;animation: titan-baleful-glare ${dur}s cubic-bezier(0.12, 0.9, 0.25, 1) both;">
            <svg viewBox="0 0 120 80" class="w-full h-full">
              <defs>
                <radialGradient id="fx-titan-eye-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#ffffff" />
                  <stop offset="30%" stop-color="#fef08a" />
                  <stop offset="60%" stop-color="#ef4444" />
                  <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0" />
                </radialGradient>
              </defs>
              <path d="M10,40 Q60,5 110,40 Q60,75 10,40 Z" fill="#450a0a" stroke="#f87171" stroke-width="3" />
              <circle cx="60" cy="40" r="22" fill="url(#fx-titan-eye-glow)" />
              <ellipse cx="60" cy="40" rx="6" ry="18" fill="#1c0505" stroke="#fca5a5" stroke-width="1.5" />
            </svg>
          </div>
          <div class="absolute left-1/2 top-1/2 pointer-events-none" style="width:550px;height:550px;animation: psychic-tsunami-surge ${dur}s cubic-bezier(0.12, 0.85, 0.25, 1) both;">
            <svg viewBox="0 0 200 200" class="w-full h-full fill-none stroke-current text-rose-500" style="filter: drop-shadow(0 0 25px #ef4444);">
              <circle cx="100" cy="100" r="45" stroke-width="6" />
              <circle cx="100" cy="100" r="30" stroke-width="3" stroke-dasharray="8 4" opacity="0.8" />
            </svg>
          </div>
        </div>
      `;
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
        const now = __fxNow();
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
  const atmoState = { theme: 'baseline', ambientSound: false, pinkNoiseBuf: null, audioSession: null };
  const atmoAudio = (function () {
    const state = atmoState;
    function getPinkNoise(ctx) {
        if (state.pinkNoiseBuf && state.pinkNoiseBuf.sampleRate === ctx.sampleRate) return state.pinkNoiseBuf;
        const len = ctx.sampleRate * 4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < len; i++) {
                const w = Math.random() * 2 - 1;
                b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
                d[i] = Math.max(-0.95, Math.min(0.95, (b0 + b1 + b2 + w * 0.1848) * 0.11));
            }
        }
        state.pinkNoiseBuf = buf;
        return buf;
    }
    function stopAmbientAudio(immediate = false) {
        const sess = state.audioSession;
        if (!sess) return;
        state.audioSession = null;
        const release = () => {
            sess.stoppers.forEach(s => { try { s.stop(); } catch {} });
            sess.nodes.forEach(n => { try { n.disconnect(); } catch {} });
        };
        if (immediate) { release(); return; }
        try {
            const t = sess.ctx.currentTime;
            sess.bus.gain.cancelScheduledValues(t);
            sess.bus.gain.setValueAtTime(Math.max(0.0001, sess.bus.gain.value), t);
            sess.bus.gain.linearRampToValueAtTime(0.0001, t + 0.16);
        } catch {}
        __fxTimeout(release, 190);
    }
    function syncAmbientAudio() {
        if (!state.ambientSound || state.theme === 'baseline') { stopAmbientAudio(); return; }
        if (state.audioSession?.theme === state.theme && state.audioSession.ctx.state !== 'closed') return;
        stopAmbientAudio();
        const ctx = CombatAudioMixer.skillContext();
        if (!ctx) return;
        const t = ctx.currentTime, bus = ctx.createGain();
        const volMap = { rain: 0.036, mist: 0.034, ruins: 0.034, eldritch: 0.038 };
        bus.gain.setValueAtTime(0.0001, t);
        bus.gain.linearRampToValueAtTime(volMap[state.theme] || 0.034, t + 0.35);
        bus.connect(CombatAudioMixer.output('atmo', 'L'));
        const stoppers = [], nodes = [bus];
        const mkNoise = () => { const s = ctx.createBufferSource(); s.buffer = getPinkNoise(ctx); s.loop = true; s.start(t); stoppers.push(s); nodes.push(s); return s; };
        const mkLfo = (hz, amp, target) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hz; g.gain.value = amp; o.connect(g); g.connect(target); o.start(t); stoppers.push(o); nodes.push(o, g); };
        if (state.theme === 'rain') {
            const src = mkNoise(), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g1 = ctx.createGain(), g2 = ctx.createGain();
            bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 0.45; g1.gain.value = 0.72;
            lp.type = 'lowpass'; lp.frequency.value = 240; g2.gain.value = 0.45;
            src.connect(bp); bp.connect(g1); g1.connect(bus);
            src.connect(lp); lp.connect(g2); g2.connect(bus);
            nodes.push(bp, lp, g1, g2);
        } else if (state.theme === 'mist') {
            const src = mkNoise(), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 1.9;
            lp.type = 'lowpass'; lp.frequency.value = 210;
            mkLfo(0.09, 85, bp.frequency);
            src.connect(bp); bp.connect(lp); lp.connect(bus);
            nodes.push(bp, lp);
        } else if (state.theme === 'ruins') {
            const src = mkNoise(), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 1.3;
            lp.type = 'lowpass'; lp.frequency.value = 850;
            mkLfo(0.13, 140, bp.frequency);
            src.connect(bp); bp.connect(lp); lp.connect(bus);
            nodes.push(bp, lp);
        } else if (state.theme === 'eldritch') {
            const src = mkNoise(), nLp = ctx.createBiquadFilter(), nG = ctx.createGain(), mainLp = ctx.createBiquadFilter();
            nLp.type = 'lowpass'; nLp.frequency.value = 190; nG.gain.value = 0.45;
            mainLp.type = 'lowpass'; mainLp.frequency.value = 165; mainLp.Q.value = 1.2;
            mkLfo(0.07, 50, mainLp.frequency);
            src.connect(nLp); nLp.connect(nG); nG.connect(mainLp);
            [[46, 'triangle', 0.28], [69.5, 'sine', 0.22]].forEach(([hz, tp, gv]) => {
                const osc = ctx.createOscillator(), og = ctx.createGain();
                osc.type = tp; osc.frequency.value = hz; og.gain.value = gv;
                osc.connect(og); og.connect(mainLp); osc.start(t);
                stoppers.push(osc); nodes.push(osc, og);
            });
            mainLp.connect(bus);
            nodes.push(nLp, nG, mainLp);
        }
        state.audioSession = { ctx, bus, stoppers, nodes, theme: state.theme };
    }
    return {
      setTheme(theme) { state.theme = ['baseline', 'rain', 'mist', 'ruins', 'eldritch'].includes(theme) ? theme : 'baseline'; syncAmbientAudio(); return state.theme; },
      getTheme() { return state.theme; },
      setAmbientSound(on) { state.ambientSound = !!on; syncAmbientAudio(); return state.ambientSound; },
      getAmbientSound() { return state.ambientSound; },
      stop(immediate = false) { stopAmbientAudio(immediate); },
    };
  })();

function spawnHealParticles(addParticle, x, y, colorTheme = 'green') {
    let colorMain, colorGlow;
    if (colorTheme === 'green') { colorMain = '#34d399'; colorGlow = '#059669'; }
    else if (colorTheme === 'blue') { colorMain = '#38bdf8'; colorGlow = '#0284c7'; }
    else if (colorTheme === 'gold') { colorMain = '#fbbf24'; colorGlow = '#d97706'; }
    else if (colorTheme === 'purple') { colorMain = '#c084fc'; colorGlow = '#7c3aed'; }
    else if (colorTheme === 'shield') { colorMain = '#cbd5e1'; colorGlow = '#64748b'; }
    else if (colorTheme === 'taunt') { colorMain = '#f87171'; colorGlow = '#dc2626'; }
    
    const count = colorTheme === 'purple' ? 20 : 25;
    const directionY = colorTheme === 'purple' ? 1.5 : -2; // debuff往下飘，heal/buff往上飘
    
    for (let i = 0; i < count; i++) {
        const vx = (Math.random() - 0.5) * 2;
        const vy = directionY * (0.6 + Math.random() * 0.8);
        const size = 3 + Math.random() * 3.5;
        const life = 700 + Math.random() * 400;
        
        addParticle({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (colorTheme === 'purple' ? -30 : 20),
            vx: vx,
            vy: vy,
            age: 0,
            life: life,
            size: size,
            type: Math.random() > 0.45 ? 'cross' : 'star',
            draw(ctx, pct) {
                const alpha = Math.sin(pct * Math.PI) * 0.9;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = colorMain;
                
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(pct * Math.PI * 1.5);
                
                if (colorTheme === 'green' && this.type === 'cross') {
                    // 绿色治愈十字
                    const w = this.size;
                    const h = this.size * 3;
                    ctx.fillRect(-w/2, -h/2, w, h);
                    ctx.fillRect(-h/2, -w/2, h, w);
                } else {
                    // 亮晶晶的四角星
                    ctx.beginPath();
                    ctx.moveTo(0, -this.size * 2);
                    ctx.quadraticCurveTo(0, 0, this.size * 2, 0);
                    ctx.quadraticCurveTo(0, 0, 0, this.size * 2);
                    ctx.quadraticCurveTo(0, 0, -this.size * 2, 0);
                    ctx.quadraticCurveTo(0, 0, 0, -this.size * 2);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
                
                // 外圈光晕
                ctx.fillStyle = colorGlow;
                ctx.globalAlpha = alpha * 0.35;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}
  const supportHandles = new Set();
  function playGenericSupportFx(entity, type, { soundKey = null, volume = 0.5, onImpact } = {}) {
    const theme = { heal:'green', buff:'gold', shield:'shield', mpHeal:'blue' }[type];
    const dom = getEntitySpriteDom(entity);
    if (!dom) { onImpact?.(); return null; }
    const rect = dom[__GBCR]();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const svgWrapper = document.createElement('div');
    svgWrapper.style.cssText = 'position:absolute;pointer-events:none;z-index:95;left:' + x + 'px;top:' + y + 'px;';
    let innerHTML, duration;
    if (type === 'heal') { svgWrapper.className = 'anim-heal'; innerHTML = `<svg class="absolute" style="width: 60px; height: 60px; transform: translate(-50%, -50%);" viewBox="0 0 100 100"><path d="M35,15 L65,15 L65,35 L85,35 L85,65 L65,65 L65,85 L35,85 L35,65 L15,65 L15,35 L35,35 Z" fill="#34d399" opacity="0.8" style="filter: drop-shadow(0 0 10px #10b981);" /><circle cx="50" cy="50" r="45" stroke="#6ee7b7" stroke-width="2" fill="none" opacity="0.5" /></svg>`; duration = 800; }
    else if (type === 'buff') { svgWrapper.className = 'anim-buff'; innerHTML = `<svg class="absolute" style="width: 80px; height: 80px; transform: translate(-50%, -50%);" viewBox="0 0 100 100"><polygon points="50,5 85,25 85,75 50,95 15,75 15,25" stroke="#fbbf24" stroke-width="3" fill="none" /><circle cx="50" cy="50" r="30" stroke="#fef08a" stroke-width="1" fill="none" stroke-dasharray="5,5" /></svg>`; duration = 600; }
    else if (type === 'debuff') { svgWrapper.className = 'anim-debuff'; innerHTML = `<svg class="absolute" style="width: 100px; height: 100px; transform: translate(-50%, -50%);" viewBox="0 0 100 100"><path d="M50,10 L60,40 L90,50 L60,60 L50,90 L40,60 L10,50 L40,40 Z" fill="#c084fc" opacity="0.7" filter="url(#bloom-purple)" /><circle cx="50" cy="50" r="40" stroke="#d8b4fe" stroke-width="4" fill="none" opacity="0.5" /></svg>`; duration = 500; }
    else if (type === 'shield') { svgWrapper.className = 'anim-shield'; innerHTML = `<svg class="absolute" style="width: 80px; height: 80px; transform: translate(-50%, -50%);" viewBox="0 0 100 100"><path d="M50,10 L90,30 L90,60 C90,80 50,95 50,95 C50,95 10,80 10,60 L10,30 Z" fill="#cbd5e1" opacity="0.8" stroke="#f8fafc" stroke-width="3" style="filter: drop-shadow(0 0 10px #e2e8f0);" /></svg>`; duration = 600; }
    else if (type === 'mpHeal') { svgWrapper.className = 'anim-mp'; innerHTML = `<svg class="absolute" style="width: 60px; height: 60px; transform: translate(-50%, -50%);" viewBox="0 0 100 100"><path d="M50,15 C50,15 25,50 25,70 C25,85 35,95 50,95 C65,95 75,85 75,70 C75,50 50,15 50,15 Z" fill="#38bdf8" opacity="0.8" style="filter: drop-shadow(0 0 10px #7dd3fc);" /><circle cx="50" cy="50" r="45" stroke="#bae6fd" stroke-width="2" fill="none" opacity="0.5" /></svg>`; duration = 800; }
    else if (type === 'taunt') { svgWrapper.className = 'anim-taunt'; innerHTML = `<svg class="absolute" style="width: 80px; height: 80px; transform: translate(-50%, -50%);" viewBox="0 0 100 100"><path d="M25,25 L45,45 M75,25 L55,45 M35,75 Q50,60 65,75" stroke="#ef4444" stroke-width="6" stroke-linecap="round" fill="none" filter="url(#bloom-red)" /><circle cx="50" cy="50" r="45" stroke="#fca5a5" stroke-width="3" fill="none" stroke-dasharray="10,10" opacity="0.8" /></svg>`; duration = 700; }
    duration /= 1.5;
    svgWrapper.style.animationDuration = duration + 'ms';
    svgWrapper.innerHTML = innerHTML;
    svgWrapper.firstElementChild.style.position = 'absolute';
    __STAGE.el.appendChild(svgWrapper);
    const particles = new Set();
    if (theme) spawnHealParticles(p => { p.life /= 1.5; p.vx *= 1.5; p.vy *= 1.5; particles.add(p); fxEngine.addParticle(p); }, x, y, theme);
    const cue = soundKey ? playSound(soundKey, volume) : null;
    const onFinish = new Set();
    const finish = ok => {
      supportHandles.delete(handle);
      onFinish.forEach(fn => fn(ok));
      onFinish.clear();
    };
    const totalMs = 1100 / 1.5;
    const handle = { doneAt: __fxDateNow() + totalMs, onFinish, cancel() {
      clearTimeout(svgTimer);
      clearTimeout(endTimer);
      svgWrapper.remove();
      fxEngine.particles = fxEngine.particles.filter(p => !particles.has(p));
      cue?.stop?.();
      finish(false);
    } };
    const svgTimer = __fxTimeout(() => svgWrapper.remove(), duration);
    const endTimer = __fxTimeout(() => finish(true), totalMs);
    supportHandles.add(handle);
    onImpact?.();
    return handle;
  }


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

    'use strict';
    // 精确特效名；group:* 为敌方兜底群攻的内部演出键
    const ARCANE_TAGS = ['灵风术', '纳克提特障壁术', '伊西丝之拥', '折影步', '巫师护盾', 'group:melee', 'group:ranged', 'group:spell', '飞沙化甲', '蝎眼钥匙', '谐律之庇', '静默之域', '碎裂之响', '塞赫美特之愠', '逆咒归源镜', '芭斯特的猫眼石', '奇异海螺', '砷弹射击'];
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
        const id = __fxTimeout(() => { S.timers.delete(id); if (token !== combatToken) return; CombatAudioMixer.withContext(sound, fn); }, ms);
        S.timers.add(id);
        return id;
    }
    function every(ms, fn) {
        const token = combatToken, sound = CombatAudioMixer.capture('D');
        const id = __fxInterval(() => { if (token !== combatToken) { clearInterval(id); S.intervals.delete(id); return; } CombatAudioMixer.withContext(sound, fn); }, ms);
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
        if (ms) __fxTimeout(() => { S.layers.delete(d); d.remove(); }, ms); // 纯清理回调，恒执行
        return d;
    }
    function mkAnchor(x, y) {
        const d = document.createElement('div');
        d.style.cssText = 'position:absolute; left:' + (x - 1) + 'px; top:' + (y - 1) + 'px; width:2px; height:2px; pointer-events:none; z-index:56; opacity:0;';
        d.setAttribute('data-arcane-fx', 'anchor');
        __STAGE.el.appendChild(d);
        S.anchors.add(d);
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
    // NK：施法者所属全队存活对象（heroesData/enemiesData 含召唤物，isAlive 过滤）
    function teamSprites(caster) {
        const isHero = caster && (caster.isSummon ? caster.side === 'hero' : String(caster.id || '').startsWith('h'));
        const arr = isHero ? heroesData : enemiesData;
        return arr.filter(e => e.isAlive).map(e => domOf(e)).filter(Boolean);
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
        const combat = CombatAudioMixer.capture().combat, key = combat ? category + ':combat' : category;
        if (!synthBuses.has(key)) {
            const ctx = audioCtx, comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -10; comp.knee.value = 4; comp.ratio.value = 6; comp.attack.value = 0.001; comp.release.value = 0.12;
            comp.connect(CombatAudioMixer.output(CombatAudioMixer.trackOf(category), category, combat));
            const sat = shaper(ctx, 1.6); sat.connect(comp);
            const bus = ctx.createGain(); bus.gain.value = identitySfxOn ? 0.9 : 0; bus.connect(sat);
            const verb = ctx.createConvolver(); verb.buffer = sfxIR; const vg = ctx.createGain(); vg.gain.value = 0.5; verb.connect(vg); vg.connect(comp);
            synthBuses.set(key, { bus, verb });
        }
        return synthBuses.get(key);
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
        src.connect(gn); gn.connect(p); p.connect(resultOutput ? CombatAudioMixer.output('result', category, CombatAudioMixer.capture().combat) : groupChargeOutput || identityOutput || sound.bus);
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
    function choir(d, freqs, dur, vol, peakFrac = 0.4, cut = false) {
        const ctx = audio(), t = ctx.currentTime + d;
        freqs.forEach((f, i) => [-9, 0, 8].forEach(dt => {
            const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = dt;
            const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5 + i * 0.4; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(s.frequency);
            const lp = biquad(ctx, 'lowpass', 900 + i * 200, 0, 0.6, t, dur); s.connect(lp); s.start(t); lfo.start(t); s.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
            chain(ctx, lp, t, { vol: vol / 3, dur, peak: dur * peakFrac, cut, wet: 0.7, pan: (i - 1) * 0.3 });
        }));
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
        S.particleTimer = after(Math.max(0, S.particleUntil - __fxNow()), () => {
            S.particleTimer = null;
            const now = __fxNow();
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
        p.expiresAt = __fxNow() + p.life / p.decay * 16.7;
        S.particleUntil = Math.max(S.particleUntil, p.expiresAt);
        S.particles.push(p);
        ensureCanvas(); ensureDriver(); scheduleParticleCleanup();
    }
    function burst(n, fn) { for (let i = 0; i < n; i++) addP(fn(i)); }
    // 绕场收束（demo orbitCharge 原样）
    function orbitCharge(c, n, dur, mk, rx, ry, shrink = 0.8) {
        const orb = []; for (let i = 0; i < n; i++) orb.push({ a: Math.random() * 6.283, r: rnd(0.45, 1), s: rnd(0.025, 0.05), k: Math.random() });
        const t0 = __fxNow();
        const id = every(33, () => { const k = Math.min(1, (__fxNow() - t0) / dur); orb.forEach(o => { o.a += o.s * (1 + k * 3); const r = o.r * (1 - k * shrink); addP(Object.assign({ x: c.x + Math.cos(o.a) * rx * r, y: c.y + Math.sin(o.a) * ry * r, decay: 0.25 }, mk(o))); }); });
        after(dur, () => stopEvery(id));
    }
    // 贝塞尔弹道（demo fly 原样；由驱动粒子步进，不另启 rAF）
    function flyBezier(a, ctrl, b, dur, draw, done, ease) {
        ease = ease || (k => k * k);
        const startedAt = __fxNow(), sound = CombatAudioMixer.capture('D');
        const f = {
            age: 0, dur, timer: null,
            step(pr) { const t = ease(pr), u = 1 - t; CombatAudioMixer.withContext(sound, () => draw(u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x, u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y, pr)); },
            progress() { return Math.min(1, (__fxNow() - startedAt) / dur); }
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
            p.life = Math.min(p.life - p.decay * k, Math.max(0, (p.expiresAt - __fxNow()) * p.decay / 16.7));
            if (p.life <= 0) S.particles.splice(i, 1);
        }
    }
    function render() {
        const g = S.ctx; if (!g || !S.canvas) return;
        g.clearRect(0, 0, S.canvas.width, S.canvas.height);
        for (const owner of new Set(S.particles.filter(p => p.owner && p.owner.dom).map(p => p.owner))) {
            const r = ctr(owner.dom);
            owner.frame = Object.assign(r, { left: r.left, clipBottom: Math.min(r.bottom, owner.barTop - 2), now: __fxNow() });
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
                for (let j = 0; j < 2; j++) { const an = __fxNow() / 45 + j * 3.14; addP({ x: x + Math.cos(an) * 11, y: y + Math.sin(an) * 11, decay: 0.3, size: 2, color: '#fff7d6' }); }
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

    // ===== ③ 折影步：准备冷闪+原位锚点 → dodge(true) 才错身/残影碎裂（WAAPI，不碰 inline transform） =====
    function playZheYingBu(caster, targets, isReaction) {
        const el = domOf(caster); if (!el) return null;
        const token = combatToken;
        ensureCanvas(); ensureDriver();
        const r = el[__GBCR](), c = ctr(el);
        let done = false, cancelled = false, anim = null, held = false;
        const retreatTimers = new Set();
        const retire = delay => { const id = after(delay, () => { retreatTimers.delete(id); if (!held) { dropAnchor(anchor); S.handles.delete(handle); releaseIdleCanvas(); } }); retreatTimers.add(id); };
        const anchor = mkAnchor(c.x, c.y); // 原位无视觉落点锚（主代理把弹道 toDom 指向它）
        retire(8000);
        const handle = { doneAt: 0, impactDom: anchor, dodge: null, hit: null, cancel: null };
        S.handles.add(handle);
        whoosh(0, { type: 'highpass', f0: 6000, f1: 700, q: 0.7, dur: 0.18, vol: 0.45, peak: 0.17, cut: true });
        kick(0.16, { hi: 70, lo: 40, pd: 0.06, dur: 0.3, vol: 0.4, drive: 2 }); tone(0.16, { f0: 220, f1: 110, dur: 0.45, vol: 0.1, wet: 0.6 });
        flash(el, 'arcane-flash-cold');
        fsLayer(`<div style="position:absolute; inset:0; background:radial-gradient(circle at ${c.x}px ${c.y}px, rgba(99,102,241,0.0) 0%, rgba(30,27,75,0.35) 60%); animation: arcane-tint 0.9s ease both;"></div>
          <div class="arcane-fs-anchor" style="left:${c.x}px; top:${c.y}px; width:180px; height:180px; border-radius:50%; border:2px solid #a5b4fc; box-shadow:0 0 20px #6366f1; animation: arcane-ripple 0.4s ease-out both;"></div>`, 950);
        handle.dodge = (success, land = null) => {
            if (done || cancelled || token !== combatToken) return;
            if (!success) { done = true; retire(1200); return; }
            done = true;
            handle.doneAt = __fxDateNow() + 1900;
            const ghosts = [0, 1, 2].map(i => `<div style="position:absolute; left:${r.left + i * 10}px; top:${r.top}px; width:${r.width}px; height:${r.height}px; --d:${r.width}px; border-radius:50%; opacity:${0.75 - i * 0.18}; filter: grayscale(1) brightness(1.4) sepia(1) hue-rotate(200deg) saturate(4) drop-shadow(0 0 10px #6366f1); animation: arcane-ghost-shatter 0.32s ${0.18 + i * 0.12}s ease-in both;">${el.innerHTML.replace(/ id="[^"]*"/g, '')}</div>`).join('');
            fsLayer(ghosts, 900);
            /* 战棋：真实位移由宿主滑步演出 */
            whoosh(0, { type: 'highpass', f0: 5000, f1: 2500, q: 0.8, dur: 0.14, vol: 0.45, peak: 0.03, pan: 0.2, pan1: -0.4 });
            [0, 1, 2].forEach(i => after(180 + i * 120, () => {
                if (cancelled || token !== combatToken) return;
                const gx = r.left + r.width / 2 + i * 10, gy = r.top + r.height / 2;
                burst(14, () => ({ x: gx + rnd(-30, 30), y: gy + rnd(-60, 60), vx: rnd(-2.5, 2.5), vy: rnd(-2, 1.5), grav: 0.06, drag: 0.96, rot: rnd(0, 6), vr: rnd(-0.2, 0.2), decay: rnd(0.025, 0.04), size: rnd(4, 8), shape: 'shard', color: '#a5b4fc', fill: 'rgba(99,102,241,0.35)' }));
                whoosh(0, { type: 'highpass', f0: 4500, f1: 2000, q: 0.8, dur: 0.1, vol: 0.3, peak: 0.02, pan: 0.1 * i });
                for (let k = 0; k < 4; k++) crystal(k * 0.025, rnd(3000, 6000), 0.05, rnd(-0.3, 0.3));
            }));
            after(280, () => {
                if (cancelled || token !== combatToken) return;
                fsLayer(`<div class="arcane-fs-anchor" style="left:${land ? land.x : r.left + r.width / 2 - 90}px; top:${land ? land.y : r.bottom - 8}px; width:160px; height:40px; border-radius:50%; border:2px solid #c7d2fe; box-shadow:0 0 16px #818cf8; animation: arcane-ripple 0.6s ease-out both;"></div>`, 700);
                tone(0, { f0: 880, dur: 0.5, vol: 0.06, wet: 0.7 }); // 不写 MISS 文本
            });
            retire(2000);
        };
        if (isReaction) { handle.doneAt = __fxDateNow() + 1000; }
        else { handle.doneAt = __fxDateNow() + 2100; after(160, () => handle.dodge(true)); } // 非反应自主演出
        handle.holdForImpact = () => { held = true; retreatTimers.forEach(id => { clearTimeout(id); S.timers.delete(id); }); retreatTimers.clear(); };
        handle.releaseImpact = () => { held = false; retire(Math.max(0, handle.doneAt - __fxDateNow())); };
        handle.cancel = () => { cancelled = true; done = true; retreatTimers.forEach(id => { clearTimeout(id); S.timers.delete(id); }); retreatTimers.clear(); if (anim) { anim.cancel(); anim = null; } dropAnchor(anchor); S.handles.delete(handle); };
        return handle;
    }

    // ===== ⑤ 灵风术（L3，蓄势 1000ms）：风玫瑰阵 + 羽毛绕场 → 全屏疾风 → 翼纹加身 =====
    function playLingFeng(caster) {
        const el = domOf(caster); if (!el) return null;
        const token = combatToken;
        ensureCanvas(); ensureDriver();
        const CHARGE = 1000;
        const c = ctr(el), vmax = c.h * 7, SZ = c.h * 4.2;
        const owner = fixedItemSkillRun(CHARGE + 2200), handle = owner.handle;
        Object.assign(handle, { impactDom:null, dodge:null, hit:null });
        const after = owner.at, every = owner.every, fsLayer = (markup, ms) => skillLayer(owner, markup, ms), burst = owner.burst;
        const orbitCharge = (c, n, dur, mk, rx, ry, shrink) => orbitItemCharge(owner, c, n, dur, mk, rx, ry, shrink);
        const darken = opacity => itemDarken(owner, opacity), flash = (dom, cls) => flashOwned(owner, dom, cls);
        const playSfxSample = (key, delay, opts) => playItemSample(owner, key, delay, opts);
        darken(0.75);
        playSfxSample('windHum', 0.02, { volume:0.62, offset:0.15, durCap:0.94, fadeIn:0.18, fadeOut:0.14, pan:-0.3 });
        playSfxSample('crystalChime', 0.12, { volume:0.36, rate:1.25, durCap:0.85, fadeOut:0.3, pan:0.25 });
        const winds = ['BOREAS', 'EURUS', 'NOTUS', 'ZEPHYRUS'];
        const rose = fsLayer(`<div style="position:absolute; inset:0; perspective:${SZ * 3}px; perspective-origin:${c.x}px ${c.bottom - 6}px;">
          <div class="arcane-fs-anchor" data-arcane-part="rose" style="left:${c.x}px; top:${c.bottom - 6}px; width:${SZ}px; height:${SZ}px; animation: arcane-rose-in ${CHARGE}ms cubic-bezier(0.2,0.8,0.2,1) both; filter: drop-shadow(0 0 12px rgba(52,211,153,0.8));">
            <svg viewBox="-500 -500 1000 1000" style="width:100%;height:100%">
              <circle r="480" fill="none" stroke="#d4af37" stroke-width="4"/><circle r="440" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-dasharray="4 14"/><circle r="300" fill="none" stroke="#d4af37" stroke-width="2"/>
              ${Array.from({ length: 72 }, (_, i) => `<line x1="0" y1="-480" x2="0" y2="${i % 6 ? -462 : -440}" stroke="#d4af37" stroke-width="2" transform="rotate(${i * 5})"/>`).join('')}
              ${winds.map((w, i) => `<text x="0" y="-360" font-family="Cinzel" font-size="44" fill="#fde68a" text-anchor="middle" transform="rotate(${i * 90})">${w}</text>`).join('')}
              ${[0, 45, 90, 135, 180, 225, 270, 315].map((d, i) => `<path d="M0,0 L${i % 2 ? 26 : 40},-${i % 2 ? 60 : 90} L0,-${i % 2 ? 210 : 290} L-${i % 2 ? 26 : 40},-${i % 2 ? 60 : 90} Z" fill="${i % 2 ? 'rgba(110,231,183,0.35)' : 'rgba(212,175,55,0.4)'}" stroke="#fde68a" stroke-width="2" transform="rotate(${d})"/>`).join('')}
              <circle r="38" fill="none" stroke="#fde68a" stroke-width="3"/><circle r="10" fill="#fff4c2"/>
            </svg></div></div>`, CHARGE + 600);
        orbitCharge({ x: c.x, y: c.y }, 70, CHARGE, o => ({ size: 6 + o.k * 5, shape: 'feather', rot: o.a + 1.57, color: o.k < 0.5 ? '#fef3c7' : '#a7f3d0' }), vmax * 0.5, vmax * 0.3);
        const rumble = every(320, () => shake('light'));
        function release() {
            if (owner.cancelled || owner.finished || token !== combatToken) return;
            stopEvery(rumble);
            const ra = rose.querySelector('[data-arcane-part="rose"]'); if (ra) ra.style.animation = 'arcane-rose-out 0.5s ease-out both';
            playSfxSample('aoe_wind_spin_fs772867', 0, { volume:0.78, durCap:1.0, fadeOut:0.28, pan:-0.2 });
            playSfxSample('dodgeWind', 0.04, { volume:0.62, durCap:1.15, fadeOut:0.35, pan:0.25 });
            playSfxSample('crystalChime', 0.34, { volume:0.58, durCap:1.5, fadeOut:0.5 });
            shake('heavy'); flash(el, 'arcane-flash-heal');
            const streaks = Array.from({ length: 14 }, (_, i) => `<div style="position:absolute; left:0; top:${rnd(5, 95)}%; width:40vw; height:${rnd(2, 5)}px; background: linear-gradient(90deg, transparent, rgba(167,243,208,0.8), #fffbe8, transparent); filter: drop-shadow(0 0 8px #34d399); animation: arcane-streak ${rnd(0.45, 0.8)}s ${rnd(0, 0.45)}s cubic-bezier(0.2,0.7,0.3,1) both;"></div>`).join('');
            const tw = [0, 1, 2, 3].map(i => `<div class="arcane-fs-anchor" style="left:${c.x}px; top:${c.y + 40 - i * 46}px; width:${140 + i * 70}px; height:${36 + i * 14}px; border-radius:50%; border:3px solid ${i % 2 ? '#a7f3d0' : '#fde68a'}; box-shadow:0 0 18px #10b981; animation: arcane-twister 1.1s ${i * 0.05}s cubic-bezier(0.2,0.8,0.3,1) both;"></div>`).join('');
            fsLayer(`<div style="position:absolute;inset:0;background:radial-gradient(circle at ${c.x}px ${c.y}px, rgba(255,251,232,0.9), rgba(52,211,153,0.35) 35%, transparent 70%); animation: arcane-fs-flash 0.5s ease-out both;"></div>${streaks}${tw}`, 1400);
            burst(90, () => { const an = Math.random() * 6.283, s = rnd(5, 16); return { x: c.x, y: c.y, vx: Math.cos(an) * s + 4, vy: Math.sin(an) * s * 0.6, drag: 0.965, decay: rnd(0.008, 0.016), size: rnd(6, 11), shape: 'feather', rot: an, vr: rnd(-0.15, 0.15), color: pick(['#fef3c7', '#a7f3d0', '#fde68a', '#ffffff']) }; });
            const gust = every(45, () => burst(6, () => ({ x: -20, y: rnd(0, __STAGE.h), vx: rnd(14, 24), vy: rnd(-1, 1), drag: 1, decay: 0.014, size: rnd(5, 9), shape: 'feather', rot: 0, vr: rnd(-0.1, 0.1), color: pick(['#fef3c7', '#a7f3d0']) })));
            after(700, () => stopEvery(gust));
            after(350, () => {
                if (owner.cancelled || owner.finished || token !== combatToken) return;
                const feather = (rx, ry, rot, L, wd, op) => `<path d="M0,0 Q${wd},${-L * 0.55} 0,${-L} Q${-wd},${-L * 0.55} 0,0 Z" transform="translate(${rx},${ry}) rotate(${rot})" fill="rgba(255,255,255,${op})" stroke="rgba(255,255,255,0.85)" stroke-width="1"/>`;
                const side = [[0, 11, 135, 13, 0.22], [1, 9, 95, 12, 0.3], [2, 7, 60, 10, 0.42]].map(([row, n, Lmax, wd, op]) => Array.from({ length: n }, (_, i) => { const k = i / (n - 1); return feather(12 + k * (30 - row * 6), -row * 6 - k * 14, 8 + k * 72, Lmax * (1 - k * 0.38), wd, op); }).join('')).join('');
                fsLayer(`<div class="arcane-fs-anchor" style="left:${c.x}px; top:${c.y - 6}px; width:${c.h * 3.3}px; height:${c.h * 2}px; animation: arcane-wing-glyph 1.7s ease both; filter: drop-shadow(0 0 10px rgba(255,255,255,0.9)) drop-shadow(0 0 22px rgba(186,230,253,0.6));">
                  <svg viewBox="-165 -150 330 200" style="width:100%;height:100%;overflow:visible">${[-1, 1].map(sg => `<g transform="scale(${sg},1)"><g style="transform-origin: 12px 0px; animation: arcane-angel-flap 0.8s 0.1s ease-in-out 2 both;">${side}</g></g>`).join('')}</svg></div>`, 1750);
                darken(0);
            });
        }
        after(CHARGE, release);
        return handle;
    }

    // ===== ⑦ 伊西丝之拥（L3，蓄势 1100ms）：金翼日轮 → 双翼合抱 + 翡翠光雨（实际 targets） =====
    // dispel(targetDom)：仅主代理在真实驱散 removed.length>0 时调用，独立短尾韵，可晚至启动后 2.4~3.0s
    function playIsis(caster, targets) {
        const el = domOf(caster); if (!el) return null;
        const token = combatToken;
        ensureCanvas(); ensureDriver();
        const CHARGE = 1100;
        const tDoms = (targets || []).map(t => domOf(t)).filter(Boolean);
        const pc = unionRect(tDoms.length ? tDoms : [el]) || ctr(el);
        const Wd = Math.min(__STAGE.w * 0.95, 1300), Hd = Wd * 0.42, ax = pc.x, ay = pc.t - Hd * 0.12;
        let cancelled = false;
        const handle = { doneAt: __fxDateNow() + CHARGE + 2000, impactDom: null, dodge: null, hit: null, dispel: null, cancel: null };
        S.handles.add(handle);
        darken(0.72);
        const end = CHARGE / 1000 - 0.12;
        choir(0, [220, 277, 330], end, 0.09, 0.95, true); choir(0.4, [440, 554, 659], end - 0.4, 0.06, 0.95, true);
        for (let i = 0; i < 8; i++) chime(rnd(0.1, end - 0.1), rnd(1800, 3200), 0.5, 0.025, rnd(-0.7, 0.7));
        const uid = ++S.uid;
        const wfId = 'arcane-wf-' + uid, sunId = 'arcane-sun-' + uid;
        const feathers = [];
        for (let r = 0; r < 4; r++) for (let i = 0; i <= 15; i++) {
            const t = i / 15, bx = 30 + t * 520, by = -150 - Math.sin(t * Math.PI) * 50 + t * 70 + r * 36, L = 70 + t * 130 - r * 18, ang = -(12 + t * 55);
            feathers.push(`<path d="M0,0 Q-14,${L * 0.5} 0,${L} Q14,${L * 0.5} 0,0 Z" transform="translate(${-bx},${by}) rotate(${-ang})" fill="url(#${wfId})" stroke="#fff4c2" stroke-width="1.2" opacity="${1 - r * 0.15}"/>`);
        }
        const wing = `<g style="transform-origin: -30px -150px; animation: arcane-wing-fold 0.6s ${CHARGE}ms cubic-bezier(0.5,0,0.3,1) both;">${feathers.reverse().join('')}</g>`;
        const layer = fsLayer(`
          <div class="arcane-fs-anchor" data-arcane-part="wings" style="left:${ax}px; top:${ay}px; width:${Wd}px; height:${Hd * 1.5}px; animation: arcane-wings-in ${CHARGE}ms cubic-bezier(0.2,0.8,0.2,1) both; filter: drop-shadow(0 0 14px rgba(253,230,138,0.7));">
            <svg viewBox="-600 -300 1200 520" style="width:100%;height:100%;overflow:visible">
              <defs><linearGradient id="${wfId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="0.6" stop-color="#d4af37"/><stop offset="1" stop-color="#059669"/></linearGradient>
                <radialGradient id="${sunId}"><stop offset="0" stop-color="#fff7d6"/><stop offset="0.6" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/></radialGradient></defs>
              ${wing}<g transform="scale(-1,1)">${wing}</g>
              <g style="transform-origin: 0px -200px; animation: arcane-sun-grow ${CHARGE}ms ease-out both;">
                ${Array.from({ length: 24 }, (_, i) => `<line x1="0" y1="-200" x2="0" y2="-310" stroke="#fde68a" stroke-width="2" opacity="0.6" transform="rotate(${i * 15} 0 -200)"/>`).join('')}
                <circle cx="0" cy="-200" r="56" fill="url(#${sunId})" stroke="#fff4c2" stroke-width="3"/>
                <path d="M-30,-130 Q-50,-150 -30,-160 M30,-130 Q50,-150 30,-160" fill="none" stroke="#d4af37" stroke-width="5" stroke-linecap="round"/>
              </g>
            </svg></div>`, CHARGE + 1900);
        const rise = every(40, () => burst(4, () => ({ x: ax + rnd(-Wd / 2, Wd / 2), y: __STAGE.h + 10, vx: 0, vy: rnd(-9, -5), drag: 0.985, decay: 0.02, size: rnd(1.2, 2.4), color: pick(['#fde68a', '#6ee7b7']) })));
        function release() {
            if (cancelled || token !== combatToken) return;
            stopEvery(rise);
            boom(0, { f0: 900, f1: 150, dur: 0.35, vol: 0.6, peak: 0.05 }); boom(0.18, { f0: 900, f1: 150, dur: 0.35, vol: 0.55, peak: 0.05 }); whoosh(0, { f0: 300, f1: 900, q: 0.7, dur: 0.5, vol: 0.4, peak: 0.15 });
            kick(0.18, { hi: 140, lo: 45, pd: 0.06, dur: 0.6, vol: 0.8, drive: 2, wet: 0.2 });
            chime(0.2, 392, 3, 0.15); chime(0.24, 588, 2.6, 0.09); choir(0.15, [523, 659, 784], 2.2, 0.07, 0.15);
            for (let i = 0; i < 12; i++) chime(0.3 + rnd(0, 1.2), rnd(2600, 4200), 0.4, 0.02, rnd(-0.7, 0.7));
            shake('heavy');
            after(700, () => { const w = layer.querySelector('[data-arcane-part="wings"]'); if (w) w.style.animation = 'arcane-wings-out 0.9s ease-in both'; });
            fsLayer(`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at ${pc.x}px ${pc.y}px, rgba(255,247,214,0.9), rgba(52,211,153,0.4) 35%, transparent 70%); animation: arcane-fs-flash 0.7s 0.15s ease-out both;"></div>`, 1000);
            const rain = every(40, () => burst(7, () => ({ x: pc.x + rnd(-pc.w / 2 - 80, pc.w / 2 + 80), y: rnd(-20, pc.t - 40), vx: 0, vy: rnd(7, 11), drag: 1, decay: 0.022, size: 1.8, shape: 'streak', color: pick(['#6ee7b7', '#a7f3d0', '#fde68a']) })));
            after(1100, () => stopEvery(rain));
            after(260, () => { // 群体真实结算依次 200ms，视觉同步错开；不写数字
                tDoms.forEach((td, i) => after(i * 200, () => {
                    if (cancelled || token !== combatToken || !td.isConnected) return;
                    flash(td, 'arcane-flash-heal');
                    const tc = ctr(td);
                    burst(14, () => ({ x: tc.x + rnd(-24, 24), y: tc.y + rnd(-50, 50), vx: rnd(-0.4, 0.4), vy: rnd(-1.6, -0.5), decay: 0.025, size: rnd(1.4, 2.4), color: '#a7f3d0' }));
                }));
            });
            after(1500, () => darken(0));
        }
        after(CHARGE, release);
        handle.dispel = (targetDom) => {
            if (cancelled || token !== combatToken || !targetDom) return;
            ensureCanvas(); ensureDriver();
            const sp = (typeof targetDom.getBoundingClientRect === 'function') ? targetDom : domOf(targetDom);
            if (!sp) return;
            const cc = ctr(sp);
            whoosh(0, { type: 'highpass', f0: 3000, f1: 6000, q: 0.7, dur: 0.5, vol: 0.3, peak: 0.02 });
            for (let i = 0; i < 10; i++) click(rnd(0, 0.4), 0.12, rnd(2500, 5000), 0.006, rnd(-0.5, 0.5));
            burst(12, () => { const an = rnd(-2.6, -0.5), s = rnd(2, 5); return { x: cc.x, y: cc.top, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.95, rot: rnd(0, 6), vr: rnd(-0.3, 0.3), decay: 0.035, size: rnd(4, 7), shape: 'shard', blend: 'source-over', color: '#a855f7', fill: 'rgba(20,6,30,0.9)' }; });
            burst(16, () => ({ x: cc.x + rnd(-20, 20), y: cc.top + rnd(-20, 10), vx: rnd(-1, 1), vy: rnd(-2, -0.6), drag: 0.96, decay: 0.03, size: rnd(1, 2), color: pick(['#fb923c', '#fde68a']) }));
        };
        handle.cancel = () => { cancelled = true; stopEvery(rise); S.layers.delete(layer); layer.remove(); darken(0); S.handles.delete(handle); };
        after(CHARGE + 2000, () => { S.handles.delete(handle); releaseIdleCanvas(); });
        return handle;
    }

    // ===== 敌方攻击前摇：一级（普通行动起手） =====
    // 统一节奏：0–330ms 预备蓄势，330ms 为出手拍点（正式版以此为结算起点），600ms 完全回位。
    // 七类新增前摇使用贴身渐变粒子；红色单体基线不添加粒子。
    const OMEN_MS = 600, OMEN_BEAT = 330;

    // combatToken 守卫、且能被 handle.cancel() 单独摘除的定时器（after() 只随全局重置清理）
    function localAfter(ms, fn, bag) {
        const token = combatToken;
        const id = __fxTimeout(() => { S.timers.delete(id); bag.delete(id); if (token !== combatToken) return; fn(); }, ms);
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
        addP({ shape: 'omen', owner, born: __fxNow(), dur, decay: 16.7 / dur,
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
                      frame: Object.assign(r, { clipBottom: r.bottom, now: __fxNow() }) };
        }

        dom.classList.remove('breathe');
        void dom.offsetWidth;
        dom.classList.add(cls);
        omenAura(kind, owner, bag);
        CombatAudioMixer.withContext({ category:'L', combat:kind !== 'rose-self' && kind !== 'gloom-foe' }, () => omenSound(kind));

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
        const handle = { doneAt: __fxDateNow() + OMEN_MS, impactDom: dom, cancel: finish };
        S.handles.add(handle);
        localAfter(OMEN_MS, finish, bag);
        return handle;
    }

    // ===== 敌方兜底群攻 L2+（350ms 蓄势，纯演出） =====
    function portraitFrame(target) {
        if (target.isBarrierTarget) {
            const frames = heroesData.filter(h => isCombatActive(h) && !h.isSummon).map(portraitFrame).filter(Boolean);
            const proxy = target.proxyHero && portraitFrame(target.proxyHero);
            if (!frames.length && !proxy) return null;
            const bounds = groupBounds(frames.length ? frames : [proxy]);
            const dom = document.getElementById('team-barrier-dome') || document.getElementById('team-barrier-wrapper') || (proxy && proxy.dom);
            if (!dom) return null;
            return Object.assign({ card: null, dom, isBarrier: true, imageTop: bounds.top, imageH: bounds.h }, bounds);
        }
        const card = domOf(target);
        if (!card) return null;
        const image = card.querySelector('img'), normal = card.classList.contains('hero-card-inner');
        const dom = image || (normal ? card : (card.firstElementChild || card)), r = ctr(dom);
        const label = normal && image && image.previousElementSibling;
        const top = label ? Math.max(r.top, label[__GBCR]().bottom) : r.top;
        if (!r.w || r.bottom <= top) return null;
        return { card, dom, x: r.x, y: (top + r.bottom) / 2, left: r.left, right: r.right,
            top, bottom: r.bottom, w: r.w, h: r.bottom - top, imageTop: r.top, imageH: r.h };
    }
    function groupBounds(frames) {
        const left = Math.min(...frames.map(f => f.left)), right = Math.max(...frames.map(f => f.right));
        const top = Math.min(...frames.map(f => f.top)), bottom = Math.max(...frames.map(f => f.bottom));
        return { left, right, top, bottom, x: (left + right) / 2, y: (top + bottom) / 2, w: right - left, h: bottom - top };
    }
    function groupRun(ms) {
        const owner = { cancelled:false, finished:false, audioContext:CombatAudioMixer.capture('D'), audioStoppers:new Set(), onCleanups:new Set(), timers: new Set(), layers: new Set(), animations: new Set(), flights: new Set(), hostParticles: new Set(), flashes: new Map(), soundGates: new Set() };
        owner.onClean = fn => owner.onCleanups.add(fn);
        owner.at = (delay, fn) => {
            const id = after(delay, () => { owner.timers.delete(id); CombatAudioMixer.withContext(owner.audioContext, fn); });
            owner.timers.add(id); return id;
        };
        const finish = () => {
            if (owner.finished) return;
            owner.finished = true;
            owner.onCleanups.forEach(fn => fn()); owner.onCleanups.clear();
            owner.timers.forEach(id => { clearTimeout(id); S.timers.delete(id); }); owner.timers.clear();
            owner.animations.forEach(a => a.cancel()); owner.animations.clear();
            owner.layers.forEach(d => { S.layers.delete(d); d.remove(); }); owner.layers.clear();
            owner.flights.forEach(f => { clearTimeout(f.timer); S.timers.delete(f.timer); });
            S.flights = S.flights.filter(f => !owner.flights.has(f)); owner.flights.clear();
            owner.flashes.forEach((classes, el) => {
                classes.forEach((record, cls) => { if (!record.wasPresent) el.classList.remove(cls); });
                if (!Array.from(el.classList).some(cls => cls.startsWith('arcane-flash-'))) S.flashes.delete(el);
            }); owner.flashes.clear();
            owner.soundGates.forEach(g => { g.gain.value = 0; g.disconnect(); }); owner.soundGates.clear();
            S.particles = S.particles.filter(p => p.owner !== owner);
            fxEngine.particles = fxEngine.particles.filter(p => !owner.hostParticles.has(p)); owner.hostParticles.clear();
            if (!S.particles.length && !S.flights.length) {
                clearTimeout(S.particleTimer); S.timers.delete(S.particleTimer); S.particleTimer = null; S.particleUntil = 0;
                if (S.driver) { fxEngine.particles = fxEngine.particles.filter(p => p !== S.driver); S.driver = null; }
                if (S.ctx) S.ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
            }
            S.handles.delete(handle); releaseIdleCanvas();
        };
        const handle = { doneAt: __fxDateNow() + ms, cancel() { owner.cancelled = true; owner.audioStoppers.forEach(stop => stop()); owner.audioStoppers.clear(); finish(); } };
        S.handles.add(handle); owner.at(ms, finish); owner.handle = handle;
        return owner;
    }
    function groupLayer(owner, html) {
        const layer = fsLayer(html); owner.layers.add(layer); return layer;
    }
    function groupAnimate(owner, el, frames, duration, easing = 'cubic-bezier(0.16,0.8,0.3,1)') {
        const animation = el.animate(frames, { duration, easing, fill: 'forwards' });
        owner.animations.add(animation); return animation;
    }
    function groupShake(owner, intensity, duration) {
        const scene = __STAGE.shakeEl();
        if (!scene) return;
        const base = getComputedStyle(scene).transform;
        const frames = Array.from({ length: 10 }, (_, i) => {
            const k = 1 - i / 9, dx = i && i < 9 ? rnd(-intensity / 2, intensity / 2) * k : 0, dy = i && i < 9 ? rnd(-intensity / 2, intensity / 2) * k : 0;
            return { transform: `translate3d(${dx}px,${dy}px,0)${base === 'none' ? '' : ' ' + base}`, offset: i / 9 };
        });
        groupAnimate(owner, scene, frames, duration, 'linear');
    }
    function groupFlash(owner, el, cls) {
        let classes = owner.flashes.get(el);
        if (!classes) { classes = new Map(); owner.flashes.set(el, classes); }
        const record = classes.get(cls) || { wasPresent: el.classList.contains(cls), timer: null };
        if (record.timer !== null) { clearTimeout(record.timer); S.timers.delete(record.timer); owner.timers.delete(record.timer); }
        classes.set(cls, record);
        el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); S.flashes.add(el);
        record.timer = owner.at(owner.kind === 'spell' ? 380 : 340, () => {
            if (!record.wasPresent) el.classList.remove(cls);
            classes.delete(cls); if (!classes.size) owner.flashes.delete(el);
            if (!Array.from(el.classList).some(name => name.startsWith('arcane-flash-'))) S.flashes.delete(el);
        });
    }
    function groupCharge(owner, source) {
        const red = owner.kind === 'melee', spell = owner.kind === 'spell';
        const color = red ? '#ff2938' : (spell ? '#38bdf8' : '#facc15'), sub = red ? '#ff916d' : (spell ? '#e0f2fe' : '#fef08a');
        const darkStop = red ? '#7f0924' : (spell ? '#0c4a6e' : '#92400e');
        const uid = ++S.uid, size = source.h * (spell ? 2.05 : 1.85);
        const claws = [-22, 0, 22].map((y, i) => `<path d="M-54,${y + 20} Q-14,${y - 24} 48,${y - 14} Q-4,${y - 6} -34,${y + 28} Z" fill="url(#group-charge-${uid})" opacity="${0.95 - i * 0.08}"/><path d="M-42,${y + 16} Q-6,${y - 14} 44,${y - 14}" fill="none" stroke="#fff1dc" stroke-width="1.8"/>`).join('');
        const stars = [0, 45, 90, 135, 180, 225, 270, 315].map(d => `<path d="M0,0 L-6,-22 L0,-54 L6,-22 Z" fill="url(#group-charge-${uid})" transform="rotate(${d})"/>`).join('');
        const hexagram = `<polygon points="0,-58 50,29 -50,29" fill="none" stroke="#ffffff" stroke-width="2.2"/><polygon points="0,58 50,-29 -50,-29" fill="none" stroke="${sub}" stroke-width="2.2"/>` + stars;
        const layer = groupLayer(owner, `<div class="arcane-group-charge" style="left:${source.x}px;top:${source.y}px;width:${size}px;height:${size}px;">
            <svg viewBox="-80 -80 160 160"><defs><linearGradient id="group-charge-${uid}" x1="0" x2="1"><stop stop-color="${darkStop}"/><stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
                <g class="arcane-charge-ring" style="transform-box:fill-box;transform-origin:center;" fill="none" stroke="${color}" stroke-width="2"><circle r="66" stroke-dasharray="18 10" opacity=".85"/><circle r="50" stroke="${sub}" stroke-width="1.4" stroke-dasharray="8 8" opacity=".75"/></g>
                <g class="arcane-charge-ring2" style="transform-box:fill-box;transform-origin:center;" fill="none" stroke="${sub}" stroke-width="1.6"><path d="M-60,-20 A64,50 0 0 1 54,-28 M60,20 A64,50 0 0 1 -54,28"/><circle r="34" stroke="#fff" stroke-width="1.2" opacity=".6"/></g>
                <g class="arcane-charge-core" style="transform-box:fill-box;transform-origin:center;filter:drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color});">${red ? claws : (spell ? hexagram : stars)}<circle r="14" fill="#ffffff" opacity=".95"/></g>
            </svg></div>`);
        const core = layer.querySelector('.arcane-charge-core');
        for (let i = 0; i < 32; i++) {
            const ang = Math.random() * 6.283, dist = rnd(80, 165), spd = dist / 11;
            groupParticle(owner, null, { x: source.x + Math.cos(ang) * dist, y: source.y + Math.sin(ang) * dist,
                vx: -Math.cos(ang) * spd, vy: -Math.sin(ang) * spd, rot: ang + 3.1416,
                size: rnd(2.4, 4.5), texture: red ? 'spark' : 'crystal', tail: 12, decay: 16.7 / 280 });
        }
        groupAnimate(owner, core, [
            { transform: 'scale(.15) rotate(-35deg)', opacity: 0 },
            { transform: 'scale(.95) rotate(-8deg)', opacity: 1, offset: .55 },
            { transform: 'scale(1.18) rotate(6deg)', opacity: 1, offset: .82 },
            { transform: 'scale(.24) rotate(18deg)', opacity: 1 }
        ], 350, 'cubic-bezier(0.22,0.8,0.25,1)');
        groupAnimate(owner, layer.querySelector('.arcane-charge-ring'), [
            { transform: 'scale(1.55) rotate(0deg)', opacity: 0 },
            { transform: 'scale(1.05) rotate(110deg)', opacity: .95, offset: .45 },
            { transform: 'scale(.28) rotate(240deg)', opacity: 1 }
        ], 350);
        groupAnimate(owner, layer.querySelector('.arcane-charge-ring2'), [
            { transform: 'scale(1.35) rotate(0deg)', opacity: 0 },
            { transform: 'scale(.9) rotate(-140deg)', opacity: .9, offset: .5 },
            { transform: 'scale(.22) rotate(-260deg)', opacity: 0 }
        ], 350);
        owner.at(350, () => {
            addP({ x: source.x, y: source.y, shape: 'ring', size: 2.2, decay: 0.065, color: sub, owner });
            groupAnimate(owner, core, [{ opacity: 1, transform: 'scale(.28)' }, { opacity: 0, transform: 'scale(1.75)' }], 110);
        });
        owner.at(470, () => { layer.remove(); owner.layers.delete(layer); S.layers.delete(layer); });
        // 前摇复用同一音色库；本组干声门在350ms截断，不让晶鸣/混响叠进命中采样。
        const ctx = audio(), gate = ctx.createGain(), previous = groupChargeOutput;
        gate.gain.setValueAtTime(1, ctx.currentTime); gate.gain.setValueAtTime(0, ctx.currentTime + .35);
        gate.connect(synthBus(CombatAudioMixer.capture('D').category).bus); owner.soundGates.add(gate); groupChargeOutput = gate;
        try {
            drone(0, { f0: red ? 85 : (spell ? 130 : 140), f1: red ? 195 : (spell ? 260 : 330), lp0: 280, lp1: 2600, dur: .29, vol: .15 });
            whoosh(0, { f0: red ? 380 : (spell ? 600 : 900), f1: red ? 2600 : (spell ? 4200 : 4800), q: 1.8, dur: .29, vol: .46, peak: .26, cut: true });
            tone(0, { type: spell ? 'sine' : 'triangle', f0: red ? 160 : (spell ? 528 : 520), f1: red ? 340 : (spell ? 1056 : 1240), dur: .29, vol: .15, peak: .25, cut: true });
            if (spell) crystal(.3, 2400, .14, 0);
            else click(.3, .55, red ? 3200 : 5400, .01);
        } finally { groupChargeOutput = previous; }
        owner.at(350, () => { gate.disconnect(); owner.soundGates.delete(gate); });
    }
    function groupFlinch(owner, frame, direction) {
        const k = frame.h / 96, dx = direction * k * 1.45, dy = Math.abs(direction) * k * .65;
        const flashCls = owner.kind === 'melee' ? 'arcane-flash-melee' : (owner.kind === 'spell' ? 'arcane-flash-spell' : 'arcane-flash-ranged');
        groupFlash(owner, frame.card || frame.dom, flashCls);
        const base = getComputedStyle(frame.dom).transform, suffix = base === 'none' ? '' : ' ' + base;
        groupAnimate(owner, frame.dom, [
            { transform: 'translate3d(0,0,0) scale(1)' + suffix },
            { transform: `translate3d(${dx}px,${dy}px,0) scale(.91,.94)${suffix}`, offset: .18 },
            { transform: `translate3d(${-dx * .45}px,${-dy * .3}px,0) scale(1.03,1.02)${suffix}`, offset: .52 },
            { transform: 'translate3d(0,0,0) scale(1)' + suffix }
        ], 280);
        if (frame.card && frame.card !== frame.dom) {
            groupAnimate(owner, frame.card, [
                { transform: 'translate3d(0,0,0)' },
                { transform: `translate3d(${dx * .65}px,${dy * .7}px,0) scale(.96)`, offset: .2 },
                { transform: `translate3d(${-dx * .25}px,0,0)`, offset: .55 },
                { transform: 'translate3d(0,0,0)' }
            ], 280);
        }
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
    function groupParticle(owner, _frame, o) {
        addP(Object.assign({ shape: 'group', kind: owner.kind, owner, blend: 'screen', clip: null, drag: .95 }, o));
    }

    function playMeleeGroup(caster, targets) {
        const frames = targets.map(portraitFrame).filter(Boolean).sort((a, b) => a.left - b.left), casterDom = domOf(caster);
        if (!frames.length || !casterDom) return null;
        const bounds = groupBounds(frames), rTop = bounds.top, rBottom = bounds.bottom;
        const padX = 58, padY = 44;
        const row = { left: bounds.left - padX, top: rTop - padY, w: bounds.w + padX * 2, h: bounds.h + padY * 2 };
        row.cx = row.left + row.w / 2; row.cy = row.top + row.h / 2;
        const owner = groupRun(1220); owner.kind = 'melee';
        const uid = ++S.uid, w = row.w, h = row.h, k = (rBottom - rTop) / 96;
        groupCharge(owner, ctr(casterDom));
        const blades = [0, 1, 2].map(i => {
            const y = h * (.25 + i * .24), thick = (22 - i * 2.2) * k, lift = (28 + i * 6) * k;
            const center = `M-18,${y + 10 * k} C${w * .26},${y + 18 * k} ${w * .62},${y - lift * .45} ${w + 18},${y - lift}`;
            const ribbon = `M-18,${y + 10 * k - thick * .12} C${w * .25},${y - thick * .58 + 18 * k} ${w * .62},${y - lift * .45 - thick * .48} ${w + 18},${y - lift} C${w * .62},${y - lift * .45 + thick * .52} ${w * .25},${y + thick * .95 + 18 * k} -18,${y + 10 * k + thick * .18} Z`;
            const core = `M-18,${y + 10 * k} C${w * .26},${y + 15 * k} ${w * .62},${y - lift * .45 - 3 * k} ${w + 18},${y - lift} C${w * .62},${y - lift * .45 + 3 * k} ${w * .26},${y + 21 * k} -18,${y + 10 * k + .4 * k} Z`;
            const barbs = [0.22, 0.48, 0.74].map(t => {
                const bx = w * t, by = y + (1 - t) * 10 * k - t * lift;
                return `M${bx},${by} L${bx - 18 * k},${by - (i % 2 ? 16 : -16) * k} L${bx - 6 * k},${by}`;
            }).join(' ');
            return { y, lift, center, ribbon, core, barbs, thick };
        });
        const layer = groupLayer(owner, `<div class="arcane-group-stage" style="left:${row.left}px;top:${row.top}px;width:${w}px;height:${h}px;">
            <svg viewBox="0 0 ${w} ${h}" style="opacity:0;"><defs>
                <linearGradient id="group-slash-${uid}"><stop stop-color="#7f0924" stop-opacity=".25"/><stop offset=".15" stop-color="#e11d48"/><stop offset=".65" stop-color="#ff2938"/><stop offset="1" stop-color="#ffe4d6"/></linearGradient>
                <clipPath id="group-reveal-${uid}"><rect x="-24" y="-40" width="0" height="${h + 80}"/></clipPath>
            </defs><g clip-path="url(#group-reveal-${uid})">
                <g class="arcane-slash-cut">${blades.map(b => `<path d="${b.center}" fill="none" stroke="#2a040d" stroke-width="${b.thick * 2.05}" stroke-linecap="round"/><path d="${b.barbs}" fill="none" stroke="#ff2938" stroke-width="${1.8 * k}" opacity=".85"/>`).join('')}</g>
                <g class="arcane-slash-body">${blades.map(b => `<path class="arcane-group-sweep-glow" d="${b.center}" fill="none" stroke="#ff1e27" stroke-width="${b.thick * 1.45}" opacity=".75"/><path d="${b.ribbon}" fill="url(#group-slash-${uid})"/>`).join('')}</g>
                <g class="arcane-slash-core arcane-group-sweep-core">${blades.map(b => `<path d="${b.core}" fill="#fff5eb"/>`).join('')}</g>
            </g><g class="arcane-slash-tip arcane-group-sweep-core" opacity="0">${blades.map(b => `<path d="M-64,${b.y + 12 * k} Q-16,${b.y - 22 * k} 14,${b.y - 18 * k} Q-4,${b.y - 2 * k} -44,${b.y + 14 * k} Z" fill="#ff9e7d"/><path d="M-42,${b.y + 4 * k} Q-6,${b.y - 19 * k} 14,${b.y - 18 * k}" fill="none" stroke="#ffffff" stroke-width="${3 * k}"/>`).join('')}</g>
            </svg></div>`);
        const svg = layer.querySelector('svg'), reveal = svg.querySelector('clipPath rect'), tip = svg.querySelector('.arcane-slash-tip');
        owner.at(350, () => {
            svg.style.opacity = '1'; tip.setAttribute('opacity', '1');
            groupShake(owner, 16, 340);
            groupLayer(owner, `<div class="absolute inset-0" style="background:radial-gradient(ellipse at ${row.cx}px ${row.cy}px, rgba(255,41,56,0.45) 0%, rgba(153,27,27,0.22) 48%, transparent 76%);animation:arcane-fs-flash 0.44s ease-out both;"></div>
                <div class="arcane-fs-anchor" style="left:${row.cx}px;top:${row.cy}px;width:${w * 1.18}px;height:${42 * k}px;background:linear-gradient(90deg,transparent,rgba(255,41,56,0.75) 20%,#fff1f2 50%,rgba(255,41,56,0.75) 80%,transparent);filter:drop-shadow(0 0 24px #ff2938);animation:arcane-fs-flash 0.36s ease-out both;"></div>`);
            playSound('enemyMeleeGroupHit', 0.72, 1, { owner });
            const struck = new Set();
            const flight = fly({ x: 0, y: 0 }, { x: w + 36, y: 0 }, 0, 175, x => {
                reveal.setAttribute('width', x + 24);
                tip.setAttribute('transform', `translate(${x},0)`);
                blades.forEach(b => {
                    const px = row.left + x, py = row.top + b.y + 10 * k - (x / w) * b.lift;
                    groupParticle(owner, null, { x: px, y: py, vx: rnd(3, 7) * k, vy: rnd(-1.8, 1.4) * k, rot: -.18, size: rnd(2.8, 4.8) * k, texture: 'spark', tail: 16 * k, decay: 16.7 / 220 });
                    addP({ x: px + rnd(-6, 6), y: py + rnd(-6, 6), vx: rnd(1, 3), vy: rnd(-2.2, -.4), size: rnd(8, 14) * k, shape: 'flame', color: '#ff2938', decay: 0.06, owner });
                });
                frames.forEach(f => {
                    if (struck.has(f) || row.left + x < f.x) return;
                    struck.add(f); groupFlinch(owner, f, 8);
                    const cutLayer = groupLayer(owner, `<div class="arcane-fs-anchor" style="left:${f.x}px;top:${f.y}px;width:${f.w * 1.45}px;height:${f.h * 1.45}px;">
                        <svg viewBox="-60 -60 120 120" class="w-full h-full arcane-group-sweep-core"><path d="M-52,-38 L52,38 M-44,44 L44,-44" stroke="#fff1f2" stroke-width="4.5" stroke-linecap="round"/><path d="M-56,-41 L56,41 M-48,48 L48,-48" stroke="#ff2938" stroke-width="2.2"/></svg></div>`);
                    groupAnimate(owner, cutLayer.firstElementChild, [{ transform: 'translate(-50%,-50%) scale(.35)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.35)', opacity: 0 }], 240);
                    burst(2, rIdx => ({ x: f.x, y: f.y, shape: 'ring', size: (1.5 + rIdx * .9) * k, decay: 0.065 - rIdx * 0.015, color: rIdx ? '#ff2938' : '#ffe4d6', owner }));
                    for (let j = 0; j < 18; j++) groupParticle(owner, null, { x: f.x + rnd(-12, 12), y: f.y + rnd(-f.h * .3, f.h * .3),
                        vx: rnd(3.5, 11) * k * (j % 3 ? 1 : -.5), vy: rnd(-6.5, 5.5) * k, grav: .12 * k, rot: rnd(-1.2, 1.2), size: rnd(2.8, 5.6) * k,
                        texture: j % 3 ? 'spark' : 'crystal', tail: 12 * k, decay: 16.7 / rnd(280, 440) });
                    burst(6, () => ({ x: f.x + rnd(-16, 16), y: f.y + rnd(-12, 12), vx: rnd(-1.5, 2.5), vy: rnd(-3.2, -.8), size: rnd(12, 20) * k, shape: 'flame', color: pick(['#ff2938', '#f97316', '#fde68a']), decay: rnd(0.035, 0.055), owner }));
                    burst(4, () => ({ x: f.x + rnd(-20, 20), y: f.y + rnd(-14, 14), vx: rnd(-.5, .5), vy: rnd(-1.2, -.4), drag: .99, size: rnd(16, 26) * k, shape: 'smoke', blend: 'source-over', color: 'rgba(45,10,18,0.6)', decay: 0.016, owner }));
                });
            }, () => {
                tip.setAttribute('opacity', '0'); reveal.setAttribute('width', w + 48);
                groupShake(owner, 6, 180);
                groupAnimate(owner, svg.querySelector('.arcane-slash-core'), [{ opacity: 1 }, { opacity: 1, offset: .35 }, { opacity: 0 }], 260);
                groupAnimate(owner, svg.querySelector('.arcane-slash-body'), [{ opacity: 1 }, { opacity: .88, offset: .4 }, { opacity: 0 }], 560);
                groupAnimate(owner, svg.querySelector('.arcane-slash-cut'), [{ opacity: .95 }, { opacity: .75, offset: .5 }, { opacity: 0 }], 660);
            }, t => 1 - Math.pow(1 - t, 1.6));
            owner.flights.add(flight);
        });
        return owner.handle;
    }
    function shatterPortrait(frame, owner) {
        if (frame.isBarrier) return;
        const layer = groupLayer(owner, ''), box = document.createElement('div'); box.className = 'arcane-portrait-fragments';
        box.style.cssText = `left:${frame.left}px;top:${frame.top}px;width:${frame.w}px;height:${frame.h}px;`;
        layer.appendChild(box);
        const rim = [[0, 0], [32, 0], [68, 0], [100, 0], [100, 48], [100, 100], [66, 100], [34, 100], [0, 100], [0, 50]];
        rim.forEach((point, i) => {
            const next = rim[(i + 1) % rim.length], fragment = document.createElement('div');
            fragment.className = 'arcane-portrait-fragment';
            fragment.style.clipPath = `polygon(50% 55%, ${point[0]}% ${point[1]}%, ${next[0]}% ${next[1]}%)`;
            const image = frame.dom.cloneNode(true); image.removeAttribute('id');
            image.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            image.style.cssText = `position:absolute;left:0;top:${frame.imageTop - frame.top}px;width:100%;height:${frame.imageH}px;`;
            fragment.appendChild(image); box.appendChild(fragment);
            const k = frame.h / 96, dx = ((point[0] + next[0]) / 2 - 50) * 0.7 * k, dy = ((point[1] + next[1]) / 2 - 55) * 0.65 * k;
            groupAnimate(owner, fragment, [
                { transform: 'translate(0,0) rotate(0)', opacity: 1 },
                { transform: `translate(${dx}px,${dy}px) rotate(${rnd(-18, 18)}deg)`, opacity: 0 }
            ], 340 + i * 7, 'cubic-bezier(0.12,0.75,0.3,1)');
        });
        const opacity = getComputedStyle(frame.dom).opacity;
        groupAnimate(owner, frame.dom, [
            { opacity, offset: 0 }, { opacity: 0, offset: .035 }, { opacity: 0, offset: .42 }, { opacity, offset: 1 }
        ], 460, 'ease-out');
        owner.at(480, () => { layer.remove(); S.layers.delete(layer); owner.layers.delete(layer); });
    }
    function rangedHit(frame, point, owner, direction, isMain = true, isFinale = false) {
        const k = frame.h / 96, uid = ++S.uid, stageR = (isMain ? 72 : 44) * k;
        if (isMain) {
            shatterPortrait(frame, owner); groupFlinch(owner, frame, 7);
            groupShake(owner, isFinale ? 16 : 6, isFinale ? 320 : 180);
        }
        const spikes = (isMain ? [-52, -24, 4, 30, 56] : [-30, 25]).map((deg, i) => {
            const a = direction + (deg - 8) * .0174, len = (isMain ? (i % 2 ? 46 : 62) : 34) * k, w = (isMain ? 9 : 6) * k;
            return `<g transform="rotate(${a * 57.3})"><polygon points="0,${-w} ${len},0 0,${w} ${-w * .8},0" fill="url(#group-spk-${uid})"/><polygon points="0,${-w} ${len},0 0,0" fill="#fffbeb" opacity=".88"/></g>`;
        }).join('');
        const cracks = Array.from({ length: isMain ? 8 : 5 }, (_, i) => {
            const angle = i / (isMain ? 8 : 5) * 6.283 + .25, r = (i % 2 ? 44 : 60) * (isMain ? 1 : .65) * k;
            const x = Math.cos(angle), y = Math.sin(angle);
            return `<path d="M0,0 L${x * r * .42},${y * r * .38} L${x * r * .65 - y * 5 * k},${y * r * .65 + x * 5 * k} L${x * r},${y * r}"/>`;
        }).join('');
        const layer = groupLayer(owner, `<div class="arcane-group-stage" style="left:${point.x - stageR}px;top:${point.y - stageR}px;width:${stageR * 2}px;height:${stageR * 2}px;">
            <svg class="arcane-group-impact" viewBox="${-stageR} ${-stageR} ${stageR * 2} ${stageR * 2}"><defs>
                <radialGradient id="group-hit-${uid}"><stop stop-color="#ffffff"/><stop offset=".28" stop-color="#fef08a"/><stop offset=".6" stop-color="#facc15" stop-opacity=".65"/><stop offset="1" stop-color="#b45309" stop-opacity="0"/></radialGradient>
                <linearGradient id="group-spk-${uid}" x1="0" x2="1"><stop stop-color="#b45309"/><stop offset=".45" stop-color="#facc15"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
            </defs><g>
                <circle class="arcane-crystal-flash" r="${(isMain ? 48 : 28) * k}" fill="url(#group-hit-${uid})"/>
                <g class="arcane-crystal-cluster" style="transform-box:fill-box;transform-origin:center;filter:drop-shadow(0 0 8px #facc15);">${spikes}</g>
                <g class="arcane-crystal-ring" fill="none" stroke="#fef08a" stroke-width="${(isMain ? 3 : 1.8) * k}" style="transform-box:fill-box;transform-origin:center;"><circle r="${(isMain ? 32 : 18) * k}"/></g>
                <g class="arcane-crystal-cracks" fill="none" stroke="#fde047" stroke-width="${(isMain ? 1.8 : 1.2) * k}" stroke-linejoin="bevel">${cracks}</g>
            </g></svg></div>`);
        const svg = layer.querySelector('svg');
        groupAnimate(owner, svg.querySelector('.arcane-crystal-flash'), [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], isMain ? 160 : 110);
        groupAnimate(owner, svg.querySelector('.arcane-crystal-cluster'), [
            { transform: 'scale(.15)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: .28 },
            { transform: 'scale(1)', opacity: .95, offset: .65 }, { transform: 'scale(1.35)', opacity: 0 }
        ], isMain ? 360 : 240);
        groupAnimate(owner, svg.querySelector('.arcane-crystal-ring'), [{ transform: 'scale(.25)', opacity: 1 }, { transform: 'scale(2.1)', opacity: 0 }], isMain ? 260 : 180);
        groupAnimate(owner, svg.querySelector('.arcane-crystal-cracks'), [{ opacity: 1 }, { opacity: .8, offset: .35 }, { opacity: 0 }], isMain ? 420 : 260);
        if (isMain) addP({ x: point.x, y: point.y, shape: 'ring', size: 1.8 * k, decay: .06, color: '#fef08a', owner });
        const pCount = isMain ? 16 : 7;
        for (let i = 0; i < pCount; i++) {
            const angle = direction + rnd(-2.2, 2.2), speed = rnd(3, isMain ? 9.5 : 6) * k;
            groupParticle(owner, null, { x: point.x, y: point.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.2 * k,
                grav: .14 * k, rot: angle, vr: rnd(-.22, .22), size: rnd(3.2, isMain ? 7.2 : 4.8) * k,
                texture: i % 3 ? 'crystal' : 'spark', tail: 7 * k, decay: 16.7 / rnd(280, 450) });
        }
        if (isMain) burst(5, () => {
            const a = Math.random() * 6.283, s = rnd(2.5, 6.5) * k;
            return { x: point.x, y: point.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, grav: .16 * k, rot: a, vr: rnd(-.25, .25), size: rnd(5, 8.5) * k, shape: 'shard', fill: 'rgba(254,240,138,0.45)', color: '#facc15', decay: .032, owner };
        });
    }
    function playRangedGroup(caster, targets) {
        const frames = targets.map(portraitFrame).filter(Boolean).sort((a, b) => a.left - b.left), casterDom = domOf(caster);
        if (!frames.length || !casterDom) return null;
        const source = ctr(casterDom), bounds = groupBounds(frames), rowCx = bounds.x, rowCy = bounds.y;
        const owner = groupRun(1340); owner.kind = 'ranged';
        groupCharge(owner, source);
        const layer = groupLayer(owner, '<div class="arcane-group-flight"></div>'), stage = layer.firstElementChild;
        // 14枚齐射不随人数膨胀；主晶按目标分组，超过14名时同一晶簇覆盖该组。
        const mainCount = Math.min(frames.length, 14);
        const mainIndices = new Set(Array.from({ length: mainCount }, (_, i) => Math.ceil((i + 1) * 14 / mainCount) - 1));
        let mainTargetIdx = 0;
        for (let idx = 0; idx < 14; idx++) {
            const isMain = mainIndices.has(idx), first = Math.floor(mainTargetIdx * frames.length / mainCount);
            const hitFrames = isMain ? frames.slice(first, Math.floor((mainTargetIdx + 1) * frames.length / mainCount)) : [frames[idx % frames.length]];
            const frameIdx = isMain ? first : idx % frames.length;
            if (isMain) mainTargetIdx++;
            const frame = frames[frameIdx], uid = ++S.uid, k = frame.h / 96;
            const length = frame.h * (isMain ? .82 : .54), fanT = idx / 13 - .5;
            const a = { x: source.x + fanT * Math.max(source.w * 2.2, 220), y: source.y - source.h * .18 + Math.abs(fanT) * source.h * .55 + (idx % 2 ? -14 : 10) };
            const b = isMain ? { x: frame.x, y: frame.y } : { x: frame.x + rnd(-frame.w * .36, frame.w * .36), y: frame.y + rnd(-frame.h * .3, frame.h * .3) };
            const lift = (isMain ? 78 : 52) + (idx % 4) * 14;
            const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - lift;
            const missile = document.createElement('div'); missile.className = 'arcane-group-missile';
            missile.innerHTML = `<svg viewBox="-86 -24 94 48" style="left:${-length * 86 / 64}px;top:${-length * 24 / 64}px;width:${length * 94 / 64}px;height:${length * 48 / 64}px;"><defs>
                <linearGradient id="group-crystal-${uid}" gradientUnits="userSpaceOnUse" x1="-72" y1="12" x2="4" y2="-4"><stop stop-color="#92400e"/><stop offset=".3" stop-color="#eab308"/><stop offset=".7" stop-color="#fef08a"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
                <linearGradient id="group-tail-${uid}"><stop stop-color="#d97706" stop-opacity="0"/><stop offset=".6" stop-color="#facc15" stop-opacity=".45"/><stop offset="1" stop-color="#fef9c3" stop-opacity=".9"/></linearGradient>
            </defs><g class="arcane-group-missile-body" opacity="0">
                <path d="M-165,-3 L-58,-6 L-58,6 L-165,3 Z" fill="url(#group-tail-${uid})"/>
                <path d="M6,0 L-58,-15 L-72,0 L-58,15 Z" fill="url(#group-crystal-${uid})" stroke="#ffffff" stroke-width="1"/>
                <path d="M6,0 L-58,-15 L-40,0 Z" fill="#fef9c3" opacity=".95"/>
                <path d="M6,0 L-40,0 L-58,15 Z" fill="#b45309" opacity=".85"/>
                <path d="M-58,-15 L-40,0 L-72,0 Z" fill="#facc15"/>
                <circle cx="-12" cy="0" r="${isMain ? 4.5 : 3}" fill="#ffffff"/>
            </g></svg>`;
            stage.appendChild(missile);
            const body = missile.querySelector('.arcane-group-missile-body'), angle = Math.atan2(b.y - a.y, b.x - a.x);
            missile.style.transform = `translate(${a.x}px,${a.y}px) rotate(${angle}rad)`;
            groupAnimate(owner, body, [
                { transform: 'scale(.08)', opacity: 0 }, { transform: 'scale(1.22)', opacity: 1, offset: .65 },
                { transform: 'scale(.92)', opacity: 1, offset: .85 }, { transform: 'scale(1.08)', opacity: 1 }
            ], 340, 'cubic-bezier(0.2,0.85,0.25,1)');
            const launchDelay = 350 + idx * 22, flyDur = isMain ? 235 : 205;
            owner.at(launchDelay, () => {
                if (idx === 0) {
                    playSound('enemyRangedGroupHit', 0.75, 1, { owner });
                    groupLayer(owner, `<div class="absolute inset-0" style="background:radial-gradient(ellipse at ${rowCx}px ${rowCy}px, rgba(250,204,21,0.32) 0%, rgba(180,83,9,0.14) 50%, transparent 78%);animation:arcane-fs-flash 0.65s ease-out both;"></div>`);
                }
                const flight = fly(a, b, lift, flyDur, (x, y, progress) => {
                    const t = progress * progress;
                    const direction = Math.atan2((1 - t) * (cy - a.y) + t * (b.y - cy), (1 - t) * (cx - a.x) + t * (b.x - cx));
                    missile.style.transform = `translate(${x}px,${y}px) rotate(${direction}rad)`;
                    const tx = x - Math.cos(direction) * length * .75, ty = y - Math.sin(direction) * length * .75;
                    groupParticle(owner, null, { x: tx + rnd(-3, 3), y: ty + rnd(-3, 3),
                        vx: -Math.cos(direction) * (isMain ? 1.8 : 1.1) * k, vy: -Math.sin(direction) * (isMain ? 1.8 : 1.1) * k,
                        rot: direction, size: (isMain ? 3 : 2) * k, texture: isMain ? 'crystal' : 'spark', tail: (isMain ? 14 : 9) * k, decay: 16.7 / 130 });
                }, () => {
                    missile.remove();
                    const direction = Math.atan2(b.y - cy, b.x - cx);
                    hitFrames.forEach(f => rangedHit(f, f === frame ? b : { x: f.x, y: f.y }, owner, direction, isMain, idx === 13));
                });
                owner.flights.add(flight);
            });
        }
        return owner.handle;
    }
    function playSpellGroup(caster, targets) {
        const frames = targets.map(portraitFrame).filter(Boolean).sort((a, b) => a.left - b.left), casterDom = domOf(caster);
        if (!frames.length || !casterDom) return null;
        const owner = groupRun(1280); owner.kind = 'spell';
        const source = ctr(casterDom), bounds = groupBounds(frames), cx = bounds.x, cy = bounds.y, rowW = bounds.w, rowH = bounds.h;
        function spawnSpellGroupParticles(x, y) {
            const add = p => { owner.hostParticles.add(p); fxEngine.addParticle(p); };
            add({ x, y, vx: 0, vy: 0, age: 0, life: 520,
                draw(ctx, pct) {
                    const maxR = Math.max(320, rowW * .55), r = pct * maxR, a = Math.max(0, (1 - pct) * .92);
                    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = Math.max(1.5, 8 * (1 - pct)); ctx.shadowBlur = 22; ctx.shadowColor = '#38bdf8';
                    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
                    if (pct > .08) {
                        ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = Math.max(1, 4.5 * (1 - pct)); ctx.setLineDash([14, 10]);
                        ctx.beginPath(); ctx.arc(this.x, this.y, (pct - .08) * maxR * .82, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
                    }
                    if (pct > .16) {
                        ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = Math.max(1, 3 * (1 - pct));
                        ctx.beginPath(); ctx.arc(this.x, this.y, (pct - .16) * maxR * .58, 0, Math.PI * 2); ctx.stroke();
                    }
                    ctx.restore();
                }
            });
            const palette = ['#ffffff', '#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc'];
            for (let i = 0; i < 90; i++) {
                const angle = Math.random() * Math.PI * 2, speed = rnd(7, 22);
                add({ x, y, vx: speed * Math.cos(angle), vy: speed * Math.sin(angle), drag: .92, gravity: 0,
                    age: 0, life: rnd(440, 760), size: rnd(2.2, 6.4), color: palette[i % palette.length],
                    draw(ctx, pct) {
                        ctx.save(); ctx.globalAlpha = pct < .08 ? pct / .08 : Math.max(0, 1 - pct);
                        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.vx * 4, this.y - this.vy * 4);
                        ctx.strokeStyle = this.color; ctx.lineWidth = this.size; ctx.lineCap = 'round'; ctx.shadowBlur = 14; ctx.shadowColor = '#38bdf8'; ctx.stroke();
                        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size * .65, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                    }
                });
            }
            add({ x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 280,
                draw(ctx, pct) {
                    if (pct > .45) return;
                    ctx.fillStyle = '#f0f9ff'; ctx.globalAlpha = (1 - pct / .45) * .48;
                    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                }
            });
        }
        groupCharge(owner, source);
        owner.at(350, () => {
            playSound('atk1', 0.5, 1, { owner }); spawnSpellGroupParticles(cx, cy);
            groupShake(owner, 28, 550); owner.at(220, () => groupShake(owner, 6, 180));
            const flashLayer = groupLayer(owner, `<div class="arcane-fs-flash" style="background:radial-gradient(ellipse at ${cx}px ${cy}px, rgba(255,255,255,0.68) 0%, rgba(186,230,253,0.42) 38%, rgba(56,189,248,0.16) 65%, transparent 82%);opacity:0;"></div>`);
            groupAnimate(owner, flashLayer.firstElementChild, [{ opacity: .98 }, { opacity: .45, offset: .3 }, { opacity: 0 }], 340);
            const stageW = Math.max(rowW * 1.48, 520), stageH = Math.max(rowH * 2.8, 320), uid = ++S.uid;
            const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((d, i) => `<line x1="0" y1="${i % 2 ? -95 : -78}" x2="0" y2="${i % 2 ? -138 : -162}" stroke="${i % 2 ? '#bae6fd' : '#ffffff'}" stroke-width="${i % 2 ? 2 : 3.2}" stroke-linecap="round" transform="rotate(${d})"/>`).join('');
            const stage = groupLayer(owner, `<div class="arcane-group-stage" style="left:${cx - stageW / 2}px;top:${cy - stageH / 2}px;width:${stageW}px;height:${stageH}px;">
                <svg viewBox="${-stageW / 2} ${-stageH / 2} ${stageW} ${stageH}"><defs>
                    <radialGradient id="spell-core-${uid}"><stop offset="0%" stop-color="#ffffff"/><stop offset="48%" stop-color="#e0f2fe" stop-opacity=".92"/><stop offset="82%" stop-color="#38bdf8" stop-opacity=".4"/><stop offset="100%" stop-color="#0284c7" stop-opacity="0"/></radialGradient>
                </defs><g class="arcane-spell-formation" style="transform-box:fill-box;transform-origin:center;filter:drop-shadow(0 0 14px #38bdf8) drop-shadow(0 0 28px #0284c7);">
                    <circle r="142" fill="url(#spell-core-${uid})"/><circle r="134" fill="none" stroke="#ffffff" stroke-width="3" opacity=".92"/>
                    <circle r="118" fill="none" stroke="#7dd3fc" stroke-width="2" stroke-dasharray="18 10" opacity=".88"/>
                    <polygon points="0,-126 109,63 -109,63" fill="rgba(224,242,254,0.12)" stroke="#ffffff" stroke-width="3.2"/>
                    <polygon points="0,126 109,-63 -109,-63" fill="rgba(56,189,248,0.12)" stroke="#bae6fd" stroke-width="3.2"/>
                    <circle r="68" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="8 6"/>${rays}
                </g><g class="arcane-spell-prism" style="transform-box:fill-box;transform-origin:center;filter:drop-shadow(0 0 16px #ffffff) drop-shadow(0 0 32px #38bdf8);">
                    <path d="M${-stageW * .49},0 Q0,-28 ${stageW * .49},0 Q0,28 ${-stageW * .49},0 Z" fill="#e0f2fe" opacity=".92"/>
                    <path d="M${-stageW * .46},0 Q0,-12 ${stageW * .46},0 Q0,12 ${-stageW * .46},0 Z" fill="#ffffff"/>
                    <path d="M0,${-stageH * .48} Q-24,0 0,${stageH * .48} Q24,0 0,${-stageH * .48} Z" fill="#bae6fd" opacity=".9"/>
                    <path d="M0,${-stageH * .44} Q-10,0 0,${stageH * .44} Q10,0 0,${-stageH * .44} Z" fill="#ffffff"/><circle r="44" fill="#ffffff"/>
                </g></svg></div>`);
            groupAnimate(owner, stage.querySelector('.arcane-spell-formation'), [
                { transform: 'scale(.16) rotate(-35deg)', opacity: 0 }, { transform: 'scale(1.06) rotate(12deg)', opacity: 1, offset: .24 },
                { transform: 'scale(1.24) rotate(32deg)', opacity: .82, offset: .62 }, { transform: 'scale(1.46) rotate(58deg)', opacity: 0 }
            ], 760, 'cubic-bezier(0.16, 0.84, 0.26, 1)');
            groupAnimate(owner, stage.querySelector('.arcane-spell-prism'), [
                { transform: 'scaleX(.12) scaleY(1.8)', opacity: 0 }, { transform: 'scaleX(1.05) scaleY(1.1)', opacity: 1, offset: .18 },
                { transform: 'scaleX(1.16) scaleY(.28)', opacity: .88, offset: .54 }, { transform: 'scaleX(1.28) scaleY(.04)', opacity: 0 }
            ], 520, 'cubic-bezier(0.16, 0.84, 0.26, 1)');
            [0, 1, 2, 3].forEach(k => addP({ x: cx, y: cy, shape: 'ring', size: 3.4 - k * .5, decay: .036 + k * .006, color: k % 2 ? '#7dd3fc' : '#ffffff', owner }));
            for (let i = 0; i < 28; i++) {
                const ang = i / 28 * 6.283 + rnd(-.08, .08), spd = rnd(6.5, 16.5);
                groupParticle(owner, null, { x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                    rot: ang, vr: rnd(-.08, .08), size: rnd(3.2, 6.2), texture: i % 2 ? 'crystal' : 'spark', tail: rnd(14, 24), decay: 16.7 / rnd(380, 620) });
            }
            frames.forEach((f, idx) => {
                const isInner = idx === Math.floor((frames.length - 1) / 2) || idx === Math.ceil((frames.length - 1) / 2);
                owner.at(isInner ? 0 : 35, () => {
                    groupFlinch(owner, f, f.x < cx ? -6.5 : 6.5);
                    addP({ x: f.x, y: f.y, shape: 'ring', size: 2.2, decay: .055, color: '#e0f2fe', owner });
                    for (let j = 0; j < 8; j++) {
                        const a = j / 8 * 6.283 + rnd(-.2, .2), s = rnd(3.8, 9.2);
                        groupParticle(owner, null, { x: f.x, y: f.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                            rot: a, size: rnd(2.6, 4.8), texture: 'crystal', tail: 12, decay: 16.7 / rnd(280, 440) });
                    }
                });
            });
        });
        return owner.handle;
    }

    // ===== 对外接口 =====
    function isArcaneSkillFx(fxTag) { return ARCANE_TAGS.indexOf(fxTag) !== -1; }

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
    function setIdentitySfx(on) {
        identitySfxOn = !!on;
        if (audioCtx) synthBuses.forEach(({ bus }) => { bus.gain.cancelScheduledValues(audioCtx.currentTime); bus.gain.value = identitySfxOn ? 0.9 : 0; });
        if (!identitySfxOn) identityAudioStoppers.forEach(stop => stop());
        return identitySfxOn;
    }
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
        const handle = { doneAt: __fxDateNow() + totalMs, cancel() { owner.cancelled = true; cleanup(true); }, onFinish: new Set() };
        function finishLater() {
            clearTimeout(finishTimer); S.timers.delete(finishTimer);
            if (owner.held || owner.finished || owner.cancelled) { finishTimer = null; return; }
            finishTimer = __fxTimeout(() => {
                S.timers.delete(finishTimer); finishTimer = null;
                if (token !== combatToken || _pipelineFrozen) { handle.cancel(); return; }
                if (owner.fixedLife || (!owner.timers.size && !owner.flights.size)) cleanup(false);
            }, Math.max(0, handle.doneAt - __fxDateNow()));
            S.timers.add(finishTimer);
        }
        owner.retain = ms => {
            handle.doneAt = Math.max(handle.doneAt, __fxDateNow() + ms);
            if (!owner.finished) finishLater();
        };
        owner.hold = () => { owner.held = true; finishLater(); };
        owner.resume = ms => {
            if (owner.finished || owner.cancelled) return;
            owner.held = false; handle.doneAt = __fxDateNow() + ms; finishLater();
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
    // 持续演出返回 handle：doneAt: __fxDateNow() + 总演出毫秒（含尾韵），不能用 __fxNow()。
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
        const shieldRatio = r.maxHp > 0 ? shieldDmg / r.maxHp : 0;
        const shieldTier = shieldRatio < 0.10 ? 1 : shieldRatio < 0.50 ? 2 : 3;
        const shieldBroken = shieldDmg > 0 && (r.shieldBefore || 0) > 0 && (r.shieldAfter || 0) === 0;
        const landed = kind === 'hp' || kind === 'shield';
        return { kind, tier, blockTier, dodgeTier, incomingDmg, hpDmg, shieldDmg, shieldTier, shieldBroken, guardBroken:!!r.guardBroken, crit: landed && !!r.isCrit, burst: landed && !!r.isBurst };
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
        next.timer = __fxTimeout(() => {
            if (!ghost.isConnected) { H.ghosts.delete(id); return; }
            next.collapsing = true;
            ghost.style.transition = 'width ' + HIT_COLLAPSE_MS + 'ms cubic-bezier(0.3,0,0.2,1)';
            ghost.style.width = pct(next.hpAfter) + '%';
            next.timer = __fxTimeout(() => { if (H.ghosts.get(id) === next) H.ghosts.delete(id); }, HIT_COLLAPSE_MS);
        }, HIT_HOLD_MS);
        H.ghosts.set(id, next);
    }

    function stackSlot(id) {
        const now = __fxDateNow(), s = H.stacks.get(id);
        const k = s && now - s.at < 750 ? s.k + 1 : 0;
        H.stacks.set(id, { k, at: now });
        return { dx: [0, 12, 24, 36, 48][k % 5], dy: [0, -44, 44, -88, 88][k % 5] };
    }
    function hitNumLayer() {
        const d = document.createElement('div');
        d.className = 'arcane-hit-num-layer';
        d.setAttribute('data-arcane-fx', 'hit-num');
        __STAGE.el.appendChild(d);
        S.layers.add(d);
        return d;
    }
    const HIT_NUMBER_THEMES = {
        '钝击': ['钝击', '#fbbf24'], '切割': ['切割', '#fb7185'], '枪击': ['枪击', '#f8fafc'], '霰弹': ['霰弹', '#fed7aa'],
        '火焰': ['火焰', '#fb923c'], '圣光': ['圣光', '#fef08a'], '雷电': ['雷电', '#c4b5fd'], '水流': ['水流', '#67e8f9'],
        '冰霜': ['冰霜', '#bae6fd'], '诅咒': ['诅咒', '#d8b4fe'], '近战': ['近战', '#fda4af'], '远程': ['远程', '#f8fafc'], '法术': ['法术', '#a5b4fc']
    };
    function hitNumberScale(dom) { return host.hitNumberScale ? host.hitNumberScale(dom) : 1; }
    function prepareHitNumbers(layer, result, dom) {
        const theme = HIT_NUMBER_THEMES[result.damageCategory] || HIT_NUMBER_THEMES[result.damageType] || ['伤害', '#f8fafc'];
        const scale = hitNumberScale(dom);
        layer.setAttribute('data-hit-type', theme[0] + (result.isPierce ? '·穿透' : ''));
        layer.style.setProperty('--hit-scale', scale);
        layer.style.setProperty('--hit-color', theme[1]);
        return scale;
    }
    function animateHitNumber(el, frames, options, scale) {
        return el.animate(frames.map(f => ({ ...f, transform: f.transform.replace(/(-?\d+(?:\.\d+)?)px/g, (_, n) => (Number(n) * scale) + 'px') })), options);
    }
    function hitAnchor(dom, slot) {
        const r = entityVisualRect(dom) || ctr(dom), c = ctr(dom), scale = hitNumberScale(dom);
        return { x: r.right + (8 + slot.dx) * scale, y: r.top + (-4 + slot.dy) * scale, c };
    }
    function hitNumEl(layer, cls, text, x, y) {
        const el = document.createElement('div');
        el.className = cls; el.textContent = text;
        el.setAttribute('data-hit-type', layer.getAttribute('data-hit-type') || '');
        el.style.left = x + 'px'; el.style.top = y + 'px';
        layer.appendChild(el);
        return el;
    }
    function hitTagEl(layer, cls, text, x, y) {
        const el = document.createElement('div');
        el.className = cls; el.textContent = text;
        el.setAttribute('data-hit-type', layer.getAttribute('data-hit-type') || '');
        el.style.left = x + 'px'; el.style.top = y + 'px';
        layer.appendChild(el);
        return el;
    }
    const T = 'translate(-50%,-50%) ', TN = 'translate(0,-18%) ', TT = 'translate(0,-50%) ';
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
        g.style.setProperty('--d', r.width + 'px');
        layer.appendChild(g);
        anims.push(g.animate([{ opacity: 0.45, transform: 'none' }, { opacity: 0, transform: 'scale(1.06)' }], { duration: 380, easing: 'ease-out', fill: 'forwards' }));
    }
    function hitVisual(layer, r, h, anims, timers) {
        const dom = domOf(r.targetId); if (!dom) return;
        const scale = prepareHitNumbers(layer, r, dom);
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
            anims.push(animateHitNumber(el, NUM_KF.dodge, { duration: NUM_MS.dodge, easing: 'ease-out', fill: 'forwards' }, scale));
            return;
        }
        if (h.kind === 'block') {
            hitBlockSpark(layer, c.x, cy, anims);
            burst(7, () => { const a = rnd(0, 6.283), s = rnd(3, 6.2); return { x: c.x, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.86, decay: 0.085, size: 1.8, shape: 'streak', color: '#f1f5f9' }; });
            if (!r.suppressRecoil) hitRecoil(dom, isHero, 'block', 0, anims);
            const el = hitNumEl(layer, 'arcane-hit-num word block', '格挡', p.x, p.y);
            anims.push(animateHitNumber(el, NUM_KF.block, { duration: NUM_MS.block, easing: 'ease-out', fill: 'forwards' }, scale));
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
            anims.push(animateHitNumber(el, NUM_KF.shield, { duration: NUM_MS.shield, easing: 'ease-out', fill: 'forwards' }, scale));
            if (h.shieldBroken) {
                const b = hitTagEl(layer, 'arcane-hit-num word break', '破盾', p.x, p.y - 22 * scale);
                anims.push(animateHitNumber(b, NUM_KF.tag, { duration: NUM_MS.tag, easing: 'ease-out', fill: 'forwards' }, scale));
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
        const stopMs = 0;
        const pop = () => {
            if (!r.suppressRecoil) hitRecoil(dom, isHero, 'hp', h.tier, anims);
            const cls = 'arcane-hit-num l' + h.tier + (h.burst ? ' burst' : h.crit ? ' crit' : '');
            const el = hitNumEl(layer, cls + (r.finisher ? ' finisher' : ''), '-' + h.hpDmg, p.x, p.y);
            if (r.finisher) el.style.setProperty('--hit-scale', scale * 1.3);
            let kf = NUM_KF[h.tier];
            if (h.crit && !h.burst) kf = kf.map((f, idx) => idx === 1 ? Object.assign({}, f, { transform: f.transform + ' scale(1.14)' }) : f);
            anims.push(animateHitNumber(el, kf, { duration: h.burst ? 1200 : NUM_MS[h.tier], easing: 'cubic-bezier(0.2,0.8,0.3,1)', fill: 'forwards' }, scale));
            const fs = [0, 24, 27, 32][h.tier] * scale * (r.finisher ? 1.3 : 1);
            if (h.crit || h.burst) {
                const t = hitTagEl(layer, 'arcane-hit-tag ' + (h.burst ? 'burst' : 'crit'), h.burst ? '爆发' : '暴击', p.x, p.y - fs * 0.25 - 12 * scale);
                anims.push(animateHitNumber(t, NUM_KF.tag, { duration: h.burst ? 1200 : NUM_MS.tag, easing: 'ease-out', fill: 'forwards' }, scale));
            }
            if (h.shieldDmg > 0) {
                const sy = p.y + fs * 1.15 + 14 * scale;
                const s = hitNumEl(layer, 'arcane-hit-num shield sub', '盾-' + h.shieldDmg, p.x, sy);
                anims.push(animateHitNumber(s, NUM_KF.shield, { duration: NUM_MS.shield, easing: 'ease-out', fill: 'forwards' }, scale));
                if (h.shieldBroken) {
                    const b = hitTagEl(layer, 'arcane-hit-num word break', '破盾', p.x, sy + 28 * scale);
                    anims.push(animateHitNumber(b, NUM_KF.tag, { duration: NUM_MS.tag, easing: 'ease-out', fill: 'forwards' }, scale));
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

    function publishImpactAudio(result) {
        if (_pipelineFrozen || impactAudioEvents.has(result.eventId)) return;
        const wave = impactWaves.get(result.waveId);
        if (result.waveId && !wave) return;
        impactAudioEvents.add(result.eventId);
        hitAudio(result, result.isHero ? null : wave?.played);
    }

    function beginImpactWave(targetIds, actionId) {
        const id = 'impact-' + (++nextImpactWaveId);
        const wave = { id, actionId:actionId || ('audio-action-' + (++nextAudioActionId)), pending:new Set(targetIds), completed:new Set(), played:new Set(), closed:false };
        impactWaves.set(id, wave);
        return wave;
    }

    function flushImpactWave(wave) {
        if (!wave || impactWaves.get(wave.id) !== wave || !wave.closed || wave.pending.size) return;
        impactWaves.delete(wave.id);
    }

    function replaceImpactWaveTargets(wave, targetIds) {
        if (!wave || wave.closed || impactWaves.get(wave.id) !== wave) return;
        wave.pending = new Set(targetIds.filter(id => !wave.completed.has(id)));
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
            const resultType = classified.kind === 'prevented' ? 'DamagePrevented' : classified.kind === 'dodge' ? 'Dodge' : classified.shieldBroken ? 'ShieldBroken' : classified.guardBroken ? 'GuardBroken'
                : classified.kind === 'block' ? 'Block' : classified.kind === 'shield' ? 'ShieldHit'
                : source === 'counter' ? 'CounterHit' : source === 'dot' ? 'PeriodicDamage' : source === 'reflect' ? 'ReflectDamage' : 'Hit';
            const event = Object.freeze(Object.assign({}, classified, {
                targetId:result.targetId, sourceId:result.sourceId || null, source, resultType, isHero:!!result.isHero, pan:result.pan, finisher:!!result.finisher, finisherSound:result.finisherSound,
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

    function playHitTierAudio(tier, opts) {
        const t = tier >= 3 ? 3 : tier === 2 ? 2 : 1;
        const list = HIT_AUDIO_POOL[t] || HIT_AUDIO_POOL[1];
        let idx = Math.floor(Math.random() * list.length);
        if (list.length > 1 && idx === _lastHitAudioIdx[t]) {
            idx = (idx + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
        }
        _lastHitAudioIdx[t] = idx;
        playSound(list[idx], t === 3 ? 0.94 : t === 2 ? 0.88 : 0.82, 1, { ...opts, category:'F' });
    }
    function hitAudio(h, played) {
        if (!identitySfxOn || h.kind === 'prevented') return;
        const take = key => {
            if (played?.has(key)) return false;
            played?.add(key);
            return true;
        };
        const opts = { track:'result', combat:true, pan:h.pan };
        if (h.kind === 'dodge') {
            const key = 'dodge_' + h.dodgeTier;
            if (take(key)) playSound(key, h.dodgeTier === 3 ? 0.92 : 0.82, 1, { ...opts, category:'H' });
            return;
        }
        const defense = h.shieldBroken || h.guardBroken ? 'parry_3'
            : h.kind === 'block' ? 'parry_' + h.blockTier
            : h.kind === 'shield' ? (h.isHero ? 'parry_' + h.shieldTier : 'parryShield') : null;
        if (defense && take(defense)) playSound(defense, defense === 'parry_3' ? 0.95 : defense === 'parryShield' ? 0.55 : 0.85, 1,
            { ...opts, category:'G' });
        if (h.kind !== 'hp') return;
        if (h.finisher) {
            if (h.finisherSound && h.finisherSound !== defense && take('finisher')) playSound(h.finisherSound, 0.86, 1, { ...opts, category:'F' });
            return;
        }
        if (!take('hit_' + h.tier)) return;
        playHitTierAudio(h.tier, opts);
        if (h.burst || h.crit) {
            resultOutput = true;
            try { CombatAudioMixer.withContext({ category:'F', combat:true }, () => {
                if (h.burst) { chime(0, 1320, 0.6, 0.07); tone(0, { f0:660, f1:990, dur:0.25, vol:0.05, wet:0.6 }); }
                else { tone(0, { type:'square', f0:2400, f1:1500, dur:0.07, vol:0.05 }); click(0, 0.6, 7000, 0.006); crystal(0.012, 3200, 0.07); }
            }); } finally { resultOutput = false; }
        }
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
            doneAt: __fxDateNow() + HIT_LIFE_MS,
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
    // ===== 命中结果反馈 END =====
    // ===== 普通反击 L1：实心明黄笔直锐利居合切割轨 + 末端火星（demo-parry-dodge-counter 最新加粗版移植，总长 ~355ms） =====
    function playCounterAttackL1(caster, target, onImpact) {
        const fromRect = entityVisualRect(caster), toRect = entityVisualRect(target);
        const fromDom = domOf(caster);
        const tokenNow = combatToken;
        let resolveImpact, rejectImpact, settled = false, cancelled = false, fallbackTimer;
        const done = new Promise((resolve, reject) => { resolveImpact = resolve; rejectImpact = reject; });
        const handle = { duration:fromRect && toRect ? 355 : 0, done, cancel() { cancelled = true; finishImpact(); } };
        const finishImpact = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer); S.rawTimers.delete(fallbackTimer); S.handles.delete(handle);
            if (tokenNow !== combatToken) { resolveImpact(false); return; }
            try { if (onImpact) onImpact(); resolveImpact(true); }
            catch (e) { rejectImpact(e); }
        };
        if (!handle.duration || _pipelineFrozen) { finishImpact(); return handle; }
        // 355ms 演出收尾即回落结算；后台 rAF 暂停或视觉取消不丢失已触发的反击。
        fallbackTimer = __fxTimeout(finishImpact, handle.duration);
        S.rawTimers.set(fallbackTimer, finishImpact);
        S.handles.add(handle);
        const dx = toRect.x - fromRect.x, dy = toRect.y - fromRect.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;
        const uid = ++S.uid;

        // 笔直居合切割线锚定敌方中心并斜贯穿透目标框（不弯不软，刚直锐利）
        const flip = (uid % 2 === 0) ? 1 : -1;
        const slashAngle = Math.atan2(dy, dx) + flip * 0.68;
        const sx = Math.cos(slashAngle), sy = Math.sin(slashAngle);
        const nx = -sy, ny = sx;
        const span = Math.max(158, Math.min(215, toRect.w * 2.2));
        const P0 = { x: toRect.x - sx * span * 0.50, y: toRect.y - sy * span * 0.50 };
        const P2 = { x: toRect.x + sx * span * 0.56, y: toRect.y + sy * span * 0.56 };

        // 1. 蓄势起手 (0 ~ 95ms)：后撤收步 + 紧致金黄聚气环 + 内吸微粒
        if (fromDom) {
            fromDom.animate([
                { transform: 'translate3d(0,0,0) scale(1)' },
                { transform: `translate3d(${(-ux * 9).toFixed(1)}px,${(-uy * 9).toFixed(1)}px,0) scale(0.95)`, offset: 0.25 },
                { transform: `translate3d(${(ux * 32).toFixed(1)}px,${(uy * 32).toFixed(1)}px,0) scale(1.06)`, offset: 0.62 },
                { transform: 'translate3d(0,0,0) scale(1)' }
            ], { duration: 330, easing: 'cubic-bezier(0.22,0.85,0.32,1)' });
        }
        CombatAudioMixer.withContext('E', () => tone(0, { type: 'triangle', f0: 540, f1: 1280, dur: 0.09, vol: 0.09 }));
        fsLayer(`
          <div class="arcane-fs-anchor" style="left:${fromRect.x}px;top:${fromRect.y}px;width:90px;height:90px;animation:arcane-counter-charge-ring 115ms ease-in forwards;">
            <svg viewBox="0 0 100 100" class="w-full h-full arcane-identity-glow-amber">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#facc15" stroke-width="2.6" stroke-dasharray="14 8"/>
              <circle cx="50" cy="50" r="22" fill="none" stroke="#fef08a" stroke-width="2"/>
              <circle cx="50" cy="50" r="6" fill="#ffffff"/>
            </svg>
          </div>`, 135);
        burst(6, i => {
            const a = (i / 6) * Math.PI * 2 + rnd(-0.2, 0.2), r = 32;
            return { x: fromRect.x + Math.cos(a) * r, y: fromRect.y + Math.sin(a) * r, vx: -Math.cos(a) * 3.4, vy: -Math.sin(a) * 3.4, drag: 0.92, decay: 0.1, size: 2.0, color: pick(['#fef08a', '#facc15', '#ffffff']) };
        });

        // 2. 高速残影突进 & 直线刺向起斩点 (90 ~ 155ms)
        after(90, () => {
            if (tokenNow !== combatToken || cancelled || _pipelineFrozen) { handle.cancel(); return; }
            playSound('atk2', 0.62, 1.15, { category:'E' });
            [0, 32].forEach((delayMs, idx) => {
                after(delayMs, () => {
                    if (tokenNow !== combatToken || cancelled || _pipelineFrozen || !fromDom) return;
                    const reach = Math.min(dist * (0.34 + idx * 0.24), 108);
                    const gLayer = fsLayer('', 165);
                    const g = document.createElement('div');
                    g.className = 'arcane-identity-ghost';
                    g.style.cssText = `left:${fromRect.left}px;top:${fromRect.top}px;width:${fromRect.w}px;height:${fromRect.h}px;border:1px solid rgba(250,204,21,0.65);box-shadow:0 0 12px rgba(250,204,21,0.5);filter:sepia(0.5) saturate(2.2) brightness(1.15);`;
                    g.innerHTML = fromDom.innerHTML.replace(/ id="[^"]*"/g, '');
                    g.style.setProperty('--d', fromRect.w + 'px'); g.style.borderRadius = '50%';
                    gLayer.appendChild(g);
                    g.animate([
                        { transform: `translate3d(${(ux * reach * 0.25).toFixed(1)}px,${(uy * reach * 0.25).toFixed(1)}px,0) scale(1)`, opacity: 0.55 },
                        { transform: `translate3d(${(ux * reach).toFixed(1)}px,${(uy * reach).toFixed(1)}px,0) scale(0.97)`, opacity: 0 }
                    ], { duration: 140, easing: 'cubic-bezier(0.16,0.9,0.28,1)', fill: 'forwards' });
                });
            });

            const dPath = `M ${fromRect.x.toFixed(1)} ${fromRect.y.toFixed(1)} L ${P0.x.toFixed(1)} ${P0.y.toFixed(1)}`;
            const trLayer = fsLayer(`
              <svg class="arcane-identity-svg-full arcane-identity-glow-amber">
                <path data-cnt-lead d="${dPath}" fill="none" stroke="#facc15" stroke-width="7.2" stroke-linecap="round" pathLength="1" style="stroke-dasharray:0.35 1;stroke-dashoffset:0.35;"/>
                <path data-cnt-lead-core d="${dPath}" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" pathLength="1" style="stroke-dasharray:0.28 1;stroke-dashoffset:0.28;"/>
              </svg>`, 150);
            trLayer.querySelector('[data-cnt-lead]').animate([{ strokeDashoffset: 0.35, opacity: 1 }, { strokeDashoffset: -0.95, opacity: 0 }], { duration: 100, easing: 'cubic-bezier(0.14,0.86,0.28,1)', fill: 'forwards' });
            trLayer.querySelector('[data-cnt-lead-core]').animate([{ strokeDashoffset: 0.28, opacity: 1 }, { strokeDashoffset: -0.98, opacity: 0 }], { duration: 92, easing: 'cubic-bezier(0.14,0.86,0.28,1)', fill: 'forwards' });
        });

        // 3. 敌方身上快速变化的笔直实心黄色切割线 + 末端火星 (145 ~ 300ms)
        after(145, () => {
            if (tokenNow !== combatToken || cancelled || _pipelineFrozen) { handle.cancel(); return; }
            let elapsed = 0;
            const dur = 155;
            let impacted = false;
            let sparked = false;

            const linePt = t => ({
                x: P0.x + (P2.x - P0.x) * t,
                y: P0.y + (P2.y - P0.y) * t
            });

            // 主工程 fxEngine 粒子协议适配：age/life 驱动粒子 + draw 钩子（demo 为 update(dt) 自摘除协议）
            fxEngine.addParticle({
                age: 0, life: 1e9, x: 0, y: 0, vx: 0, vy: 0,
                update(p) {
                    if (tokenNow !== combatToken || cancelled || _pipelineFrozen) { p.age = p.life; handle.cancel(); return; }
                    elapsed += fxEngine.lastDt || 16.7;
                    const u = Math.min(1, elapsed / dur);
                    // 刀尖极速斜穿刺出，刀尾紧追收成细线消失于末端
                    const head = 1 - Math.pow(1 - Math.min(1, u * 1.65), 3);
                    const tail = Math.pow(Math.max(0, (u - 0.16) / 0.84), 1.55);

                    if (!impacted && head >= 0.52) {
                        impacted = true;
                        shake('light');
                        finishImpact();
                    }

                    if (!sparked && head >= 0.96) {
                        sparked = true;
                        const baseAng = slashAngle;
                        // 轨迹终点锐利瞬闪星芒
                        fsLayer(`
                          <div class="arcane-identity-anchor" style="left:${P2.x}px;top:${P2.y}px;width:64px;height:64px;transform:translate(-50%,-50%) rotate(${(baseAng * 180 / Math.PI).toFixed(1)}deg);animation:arcane-identity-slash-spark 0.17s ease-out both;">
                            <svg viewBox="-32 -32 64 64" class="w-full h-full arcane-identity-glow-amber">
                              <polygon points="-28,0 -4,-2.5 0,-20 4,-2.5 28,0 4,2.5 0,20 -4,2.5" fill="#fffbeb"/>
                            </svg>
                          </div>`, 190);
                        // 轨迹末端炸裂高能火星（沿切出方向飞溅）
                        burst(18, () => {
                            const a = baseAng + rnd(-0.88, 0.88);
                            const spd = rnd(4.5, 11.2);
                            return {
                                x: P2.x + rnd(-2, 2),
                                y: P2.y + rnd(-2, 2),
                                vx: Math.cos(a) * spd,
                                vy: Math.sin(a) * spd,
                                grav: 0.14,
                                drag: 0.90,
                                decay: rnd(0.052, 0.088),
                                size: rnd(1.5, 2.5),
                                shape: 'streak',
                                color: pick(['#ffffff', '#fef08a', '#facc15', '#fb923c'])
                            };
                        });
                    }

                    if (u >= 1) p.age = p.life; // 画完即摘除驱动粒子
                },
                draw(g) {
                    const u = Math.min(1, elapsed / dur);
                    const head = 1 - Math.pow(1 - Math.min(1, u * 1.65), 3);
                    const tail = Math.pow(Math.max(0, (u - 0.16) / 0.84), 1.55);
                    if (head <= tail + 0.008) return;
                    const A = linePt(tail), B = linePt(head);
                    // 中段偏前处放置最厚棱肩，形成刚硬尖刺长剑气菱锥（两头针尖、绝对笔直）
                    const peakT = tail + (head - tail) * 0.72;
                    const M = linePt(peakT);
                    const maxHalfW = 7.4 * (1 - u * 0.45);
                    const innerHalfW = maxHalfW * 0.48;

                    g.save();
                    g.globalCompositeOperation = 'source-over';
                    g.globalAlpha = 1;
                    g.shadowColor = '#f59e0b';
                    g.shadowBlur = 14;

                    // 实心亮黄笔直锐利剑气（细长菱形针锥）
                    g.beginPath();
                    g.moveTo(A.x, A.y);
                    g.lineTo(M.x + nx * maxHalfW, M.y + ny * maxHalfW);
                    g.lineTo(B.x, B.y);
                    g.lineTo(M.x - nx * maxHalfW, M.y - ny * maxHalfW);
                    g.closePath();
                    g.fillStyle = '#facc15';
                    g.fill();

                    // 内层实心极亮白金核心光线
                    g.shadowBlur = 0;
                    g.beginPath();
                    g.moveTo(A.x, A.y);
                    g.lineTo(M.x + nx * innerHalfW, M.y + ny * innerHalfW);
                    g.lineTo(B.x, B.y);
                    g.lineTo(M.x - nx * innerHalfW, M.y - ny * innerHalfW);
                    g.closePath();
                    g.fillStyle = '#ffffff';
                    g.fill();

                    g.restore();
                }
            });
        });

        return handle;
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
    // ===== 攻击身份与同拍命中反馈 END =====

    // 变种演出只持有视觉状态；真实回血、阈值与插队仍由战斗管线决定。
    let variantSfxOn = true;
    const V = { locks: new Map(), persists: new Map(), runs: new Set(), rage: new Set() };
    function entityIdOf(entity) {
        if (entity && entity.nodeType === 1) return String(identityTargetKey(entity));
        return entity && typeof entity === 'object' ? String(entity.id || '') : String(entity || '');
    }
    function isEntityVariantLocked(entity) { return (V.locks.get(entityIdOf(entity)) || 0) > 0; }
    function lockVariantEntity(id) {
        if (!id) return;
        V.locks.set(id, (V.locks.get(id) || 0) + 1);
        const dom = domOf(id);
        if (!dom) return;
        dom.classList.remove('shake', 'arcane-hit-recoil', 'arcane-flash-cold', 'arcane-flash-heal', 'arcane-flash-melee', 'arcane-flash-ranged', 'arcane-flash-spell');
        dom._flashGeneration = (dom._flashGeneration || 0) + 1;
        if (dom._flashOrigFilter !== undefined) dom.style.filter = dom._flashOrigFilter;
        if (dom._flinchRestoreTimer) { clearTimeout(dom._flinchRestoreTimer); delete dom._flinchRestoreTimer; dom.style.animation = ''; }
        const ownAnimations = new Set([...V.runs].flatMap(owner => [...owner.animations]));
        dom.getAnimations({ subtree: true }).forEach(anim => {
            if (!anim.animationName && !anim.transitionProperty && !ownAnimations.has(anim) && anim.effect.getKeyframes().some(frame => 'filter' in frame || 'translate' in frame || 'rotate' in frame)) anim.cancel();
        });
    }
    function unlockVariantEntity(id) {
        const count = (V.locks.get(id) || 0) - 1;
        if (count > 0) V.locks.set(id, count); else V.locks.delete(id);
    }
    function setPersistentFx(dom, kind, active) {
        if (!dom || !dom.isConnected) return;
        const isSprite = !(dom.querySelector('.portrait') || dom.classList.contains('hero-card-inner'));
        const spriteCls = kind === 'molt' ? 'arcane-variant-molt-sprite' : 'arcane-variant-rage-sprite';
        let node = dom.querySelector('[data-arcane-variant-persist="' + kind + '"]');
        if (active) {
            if (getComputedStyle(dom).position === 'static') dom.classList.add('arcane-variant-host-rel');
            if (isSprite) dom.classList.add(spriteCls);
            if (!node) {
                node = document.createElement('div');
                node.setAttribute('data-arcane-variant-persist', kind);
                node.className = (kind === 'molt' ? 'arcane-variant-molted-fx' : 'arcane-variant-rage-fx') + (isSprite ? ' is-sprite' : '');
                dom.appendChild(node);
            } else {
                if (node._exitTimer) { clearTimeout(node._exitTimer); S.timers.delete(node._exitTimer); node._exitTimer = null; }
                node.classList.remove('exiting');
            }
            let nodes = V.persists.get(dom);
            if (!nodes) { nodes = new Set(); V.persists.set(dom, nodes); }
            nodes.add(node);
        } else {
            dom.classList.remove(spriteCls);
            if (node && !node.classList.contains('exiting')) {
                node.classList.add('exiting');
                node._exitTimer = after(460, () => {
                    node._exitTimer = null; node.remove();
                    const nodes = V.persists.get(dom);
                    if (nodes) { nodes.delete(node); if (!nodes.size) V.persists.delete(dom); }
                    if (!dom.querySelector('[data-arcane-variant-persist]')) dom.classList.remove('arcane-variant-host-rel');
                });
            }
        }
    }
    function clearVariantState(entityOrId) {
        const id = entityOrId == null ? '' : entityIdOf(entityOrId);
        [...V.runs].filter(owner => !id || owner.entityIds.has(id)).forEach(owner => owner.handle.cancel());
        variantAudioStoppers.forEach(stop => { if (!id || stop.owner && stop.owner.entityIds.has(id)) stop(); });
        const classes = ['arcane-variant-revive-desat', 'arcane-variant-host-rel', 'arcane-variant-molt-sprite', 'arcane-variant-rage-sprite'];
        V.persists.forEach((nodes, dom) => {
            if (id && entityIdOf(dom) !== id) return;
            nodes.forEach(node => { if (node._exitTimer) { clearTimeout(node._exitTimer); S.timers.delete(node._exitTimer); } node.remove(); });
            dom.classList.remove(...classes); V.persists.delete(dom);
        });
        if (id) {
            const dom = domOf(id);
            if (dom) dom.classList.remove(...classes);
            V.locks.delete(id); V.rage.delete(id);
        } else {
            V.locks.clear(); V.rage.clear();
            document.querySelectorAll('.arcane-variant-revive-desat, .arcane-variant-host-rel, .arcane-variant-molt-sprite, .arcane-variant-rage-sprite').forEach(dom => dom.classList.remove(...classes));
        }
    }
    function panOf(x) { return Math.max(-0.78, Math.min(0.78, (x / Math.max(640, __STAGE.w) - 0.5) * 1.4)); }
    function vSample(owner, key, optsOrVol = 0.7, rate = 1) {
        if (!variantSfxOn) return true;
        const opts = typeof optsOrVol === 'object' ? optsOrVol : { vol: optsOrVol, rate };
        return idSample(owner, key === 'rage_roar' ? 'taunt' : key, Object.assign({ sampled: true, variant: true, category:'J' }, opts));
    }
    function setVariantSfx(on) {
        variantSfxOn = !!on;
        if (!variantSfxOn) variantAudioStoppers.forEach(stop => stop());
        return variantSfxOn;
    }
    function svgGlowDef(id, std = 4) {
        return `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${std}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    }
    function cloneVisualOnly(dom) {
        const rect = entityVisualRect(dom), target = rect.visualDom;
        const clone = target.cloneNode(true);
        clone.querySelectorAll('[data-arcane-variant-persist], [data-arcane-status-persist], [data-arcane-selfdestruct-warning], .arcane-rescue-blood-wrap, .arcane-hit-track, .floating-text, [id*="hp-"], [id*="buff"], [class*="badge"], [class*="buff"]').forEach(node => node.remove());
        [clone, ...clone.querySelectorAll('[id]')].forEach(node => node.removeAttribute('id'));
        clone.classList.remove('arcane-variant-revive-desat', 'arcane-variant-molt-sprite', 'arcane-variant-rage-sprite', 'arcane-status-host-rel', 'arcane-selfdestruct-sprite-subdued', 'breathe', 'shake', 'charge-full-danger');
        clone.style.width = '100%'; clone.style.height = '100%'; clone.style.margin = '0'; clone.style.maxWidth = 'none';
        clone.style.transform = 'none'; clone.style.animation = 'none'; clone.style.fontSize = 'inherit';
        return clone.outerHTML;
    }
    function variantRun(totalMs, lockId, entities = []) {
        const owner = identityRun(totalMs, 1);
        owner.entityIds = new Set(entities.map(entityIdOf).filter(Boolean));
        if (lockId) { owner.entityIds.add(lockId); lockVariantEntity(lockId); }
        V.runs.add(owner);
        owner.onRestore = owner.onClean;
        const animate = owner.anim;
        owner.anim = (el, frames, opts) => {
            const r = lockId && entityVisualRect(lockId);
            if (r && (el === r.dom || el === r.visualDom) && (V.locks.get(lockId) || 0) > 1) return null;
            return animate(el, frames, opts);
        };
        owner.flyBezier = (a, ctrl, b, dur, draw, done, ease) => {
            let flight;
            flight = flyBezier(a, ctrl, b, dur, draw, () => {
                owner.flights.delete(flight);
                if (!owner.cancelled && !owner.finished && owner.token === combatToken && !_pipelineFrozen && done) done();
            }, ease);
            owner.flights.add(flight); owner.retain(dur);
            return flight;
        };
        owner.onClean(() => { if (lockId) unlockVariantEntity(lockId); V.runs.delete(owner); });
        return owner;
    }
    function syncVariantState(entity) {
        if (!entity || !entity.isAlive || entity.hp <= 0 || entity.isSubdued) { if (entity) clearVariantState(entity.id); return; }
        const id = entityIdOf(entity), dom = domOf(entity);
        if (entity.molted && ![...V.runs].some(owner => owner.trigger === 'molt' && owner.entityIds.has(id))) setPersistentFx(dom, 'molt', true);
        if (!hasVariantTag(entity, '狂暴')) {
            if (V.rage.has(id)) playVariantTriggerFx({ trigger: 'rageExit', entity });
            return;
        }
        if (!entity.hasRageNarrated) return;
        if (entity.hp / entity.maxHp > 0.3) {
            if (V.rage.has(id)) playVariantTriggerFx({ trigger: 'rageExit', entity });
        } else if (!V.rage.has(id)) playVariantTriggerFx({ trigger: 'rage', entity, meta: { instant: true } });
    }

    // 1. 复活：残躯复聚 (L2 · 1480ms)
    function playVariantRevive(entity, meta = {}, onBeat) {
        const dom = domOf(entity); if (!dom) return null;
        const r = entityVisualRect(dom), id = entityIdOf(entity);
        const owner = variantRun(1480, id), pan = panOf(r.x);
        dom.classList.add('arcane-variant-revive-desat');
        owner.onRestore(() => dom.classList.remove('arcane-variant-revive-desat'));

        const uid = 'arcane-var-revive-' + (++S.uid);
        const W = Math.max(150, r.w * 2.1), H = Math.max(150, r.h * 2.1);
        const cx = W / 2, cy = H / 2, baseR = Math.min(r.w, r.h) * 0.48;
        const shardsHtml = Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 + (i % 2 ? 0.16 : -0.12);
            const sx = (Math.cos(a) * r.w * 0.48).toFixed(1), sy = (Math.sin(a) * r.h * 0.46).toFixed(1);
            const mx = (Math.cos(a + 1.05) * r.w * 0.22).toFixed(1), my = (Math.sin(a + 1.05) * r.h * 0.22).toFixed(1);
            const sz = 7 + (i % 3) * 2.5;
            return `<g class="v-shard" data-sx="${sx}" data-sy="${sy}" data-mx="${mx}" data-my="${my}" data-rot="${((i % 2 ? 1 : -1) * (40 + i * 11))}" style="transform-origin:${cx}px ${cy}px">`
                + `<circle cx="${cx}" cy="${cy}" r="${sz * 1.4}" fill="url(#${uid}-sp)" opacity="0.72"/>`
                + `<path d="M${cx},${cy - sz} Q${cx + sz * 0.65},${cy - sz * 0.1} ${cx + sz * 0.3},${cy + sz * 0.85} Q${cx - sz * 0.55},${cy + sz * 0.3} ${cx - sz * 0.7},${cy - sz * 0.3} Z" fill="url(#${uid}-sg)" opacity="0.92"/></g>`;
        }).join('');

        const layer = owner.layer(
            `<div class="arcane-variant-anchor" style="left:${r.x}px;top:${r.y}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-variant-svg" viewBox="0 0 ${W} ${H}"><defs>`
            + svgGlowDef(uid + '-gl', 4.5)
            + `<linearGradient id="${uid}-sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#bae6fd" stop-opacity="0.9"/><stop offset="1" stop-color="#fde68a" stop-opacity="0.45"/></linearGradient>`
            + `<radialGradient id="${uid}-sp"><stop offset="0" stop-color="#e0f2fe" stop-opacity="0.85"/><stop offset="0.55" stop-color="#38bdf8" stop-opacity="0.3"/><stop offset="1" stop-color="#0ea5e9" stop-opacity="0"/></radialGradient>`
            + `<radialGradient id="${uid}-gr"><stop offset="0" stop-color="#7dd3fc" stop-opacity="0.42"/><stop offset="0.55" stop-color="#38bdf8" stop-opacity="0.16"/><stop offset="1" stop-color="#0284c7" stop-opacity="0"/></radialGradient>`
            + `<radialGradient id="${uid}-cg"><stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/><stop offset="0.28" stop-color="#e0f2fe" stop-opacity="0.62"/><stop offset="0.6" stop-color="#fde68a" stop-opacity="0.34"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>`
            + `<radialGradient id="${uid}-cf"><stop offset="0" stop-color="#ffffff" stop-opacity="0.78"/><stop offset="0.32" stop-color="#e0f2fe" stop-opacity="0.38"/><stop offset="0.72" stop-color="#fef08a" stop-opacity="0.12"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>`
            + `<radialGradient id="${uid}-rg"><stop offset="0.55" stop-color="#bae6fd" stop-opacity="0"/><stop offset="0.78" stop-color="#e0f2fe" stop-opacity="0.72"/><stop offset="0.9" stop-color="#fef08a" stop-opacity="0.45"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>`
            + `</defs>`
            + `<ellipse class="v-ground" cx="${cx}" cy="${cy + r.h * 0.4}" rx="${r.w * 0.56}" ry="${r.h * 0.22}" fill="url(#${uid}-gr)" style="transform-origin:${cx}px ${cy + r.h * 0.4}px"/>`
            + `<g filter="url(#${uid}-gl)">${shardsHtml}</g>`
            + `<g class="v-core" filter="url(#${uid}-gl)" style="transform-origin:${cx}px ${cy}px;opacity:0">`
            + `<circle cx="${cx}" cy="${cy}" r="${baseR * 1.48}" fill="url(#${uid}-cg)"/>`
            + `<ellipse cx="${cx}" cy="${cy}" rx="${baseR * 1.25}" ry="${baseR * 0.14}" fill="url(#${uid}-cf)"/>`
            + `<ellipse cx="${cx}" cy="${cy}" rx="${baseR * 0.14}" ry="${baseR * 1.25}" fill="url(#${uid}-cf)"/></g>`
            + `<circle class="v-outline" cx="${cx}" cy="${cy}" r="${baseR * 1.35}" fill="url(#${uid}-rg)" opacity="0" style="transform-origin:${cx}px ${cy}px"/>`
            + `</svg></div>`
        );

        const gr = layer.querySelector('.v-ground');
        if (gr) owner.anim(gr, [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 0.9, offset: 0.35 }, { transform: 'scale(0.85)', opacity: 0.7, offset: 0.72 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 1180, fill: 'forwards' });
        owner.burst(14, i => {
            const a = (i / 14) * 6.283;
            return { x: r.x, y: r.y, vx: Math.cos(a) * rnd(1.8, 3.4), vy: Math.sin(a) * rnd(1.5, 3.0), drag: 0.88, decay: 0.045, size: rnd(4, 7), shape: 'glowOrb', color: pick(['#bae6fd', '#e0f2fe', '#fef08a']) };
        });

        layer.querySelectorAll('.v-shard').forEach((g, idx) => {
            const sx = g.dataset.sx, sy = g.dataset.sy, mx = g.dataset.mx, my = g.dataset.my, rot = g.dataset.rot;
            owner.anim(g, [
                { transform: 'translate(0px,0px) scale(0.35) rotate(0deg)', opacity: 0 },
                { transform: `translate(${sx}px,${sy}px) scale(1.05) rotate(${rot}deg)`, opacity: 0.95, offset: 0.26 },
                { transform: `translate(${sx}px,${sy}px) scale(0.96) rotate(${rot}deg)`, opacity: 0.92, offset: 0.42 },
                { transform: `translate(${mx}px,${my}px) scale(0.78) rotate(${Number(rot) * 0.45}deg)`, opacity: 0.72, offset: 0.72 },
                { transform: 'translate(0px,0px) scale(0.24) rotate(0deg)', opacity: 0, offset: 0.9 },
                { transform: 'translate(0px,0px) scale(0.18) rotate(0deg)', opacity: 0 }
            ], { duration: 720, easing: 'cubic-bezier(0.32,0,0.22,1)', fill: 'forwards', delay: idx * 8 });
        });
        owner.at(320, () => {
            vSample(owner, 'revive_gather', { vol: 0.46, pan });
            let stepIdx = 0;
            const gatherId = owner.every(38, () => {
                stepIdx++;
                for (let k = 0; k < 2; k++) {
                    const a = rnd(0, 6.283) + stepIdx * 0.18, rad = rnd(r.w * 0.42, r.w * 0.82);
                    owner.addP({ x: r.x + Math.cos(a) * rad, y: r.y + Math.sin(a) * rad, vx: -Math.cos(a - 0.55) * 3.1, vy: -Math.sin(a - 0.55) * 3.1, drag: 0.94, decay: 0.07, size: rnd(3.5, 6), shape: 'glowOrb', color: pick(['#e0f2fe', '#bae6fd', '#fde68a']) });
                }
            });
            owner.at(410, () => stopEvery(gatherId));
        });
        owner.at(750, () => {
            dom.classList.remove('arcane-variant-revive-desat');
            vSample(owner, 'revive_bloom', { vol: 0.72, maxDurSec: 0.95, fadeOutSec: 0.28, pan });
            owner.anim(r.visualDom || dom, [{ transform: 'scale(0.95)' }, { transform: 'scale(1.07)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
            const core = layer.querySelector('.v-core'), ol = layer.querySelector('.v-outline');
            if (core) owner.anim(core, [{ transform: 'scale(0.25)', opacity: 1 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.48)', opacity: 0 }], { duration: 540, easing: 'ease-out', fill: 'forwards' });
            if (ol) owner.anim(ol, [{ opacity: 0.95, transform: 'scale(0.6)' }, { opacity: 0.85, transform: 'scale(1.08)', offset: 0.42 }, { opacity: 0, transform: 'scale(1.36)' }], { duration: 580, easing: 'ease-out', fill: 'forwards' });
            owner.burst(24, i => {
                const a = rnd(0, 6.283), spd = rnd(1.5, 4.4);
                return { x: r.x + rnd(-6, 6), y: r.y + rnd(-6, 6), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 0.85, drag: 0.93, decay: 0.026, size: i % 2 ? rnd(1.6, 2.6) : rnd(4.5, 7.5), shape: i % 2 ? 'spark' : 'glowOrb', color: pick(['#f8fafc', '#bae6fd', '#fef08a']) };
            });
            if (onBeat) onBeat({ phase: 'revive', entity });
        });
        return owner.handle;
    }

    // 2. 蜕皮：裂壳觉醒 (L2 · 1380ms)
    function playVariantMolt(entity, meta = {}, onBeat) {
        const dom = domOf(entity); if (!dom) return null;
        const r = entityVisualRect(dom), id = entityIdOf(entity);
        const owner = variantRun(1380, id), pan = panOf(r.x);
        const uid = 'arcane-var-molt-' + (++S.uid);
        const W = Math.max(160, r.w * 2.3), H = Math.max(160, r.h * 2.3);
        const cx = W / 2, cy = H / 2, rw = r.w * 0.48, rh = r.h * 0.48;
        const others = heroesData.concat(enemiesData).filter(x => x.isAlive && entityIdOf(x) !== id).map(x => domOf(x)).filter(Boolean).map(d => d[__GBCR]());
        let bestAng = r.x < __STAGE.w * 0.5 ? -Math.PI * 0.75 : -Math.PI * 0.25, bestScore = -1e9;
        for (let k = 0; k < 12; k++) {
            const ang = (k / 12) * Math.PI * 2;
            const px = r.x + Math.cos(ang) * 72, py = r.y + Math.sin(ang) * 62;
            if (px < 56 || px > __STAGE.w - 36 || py < 36 || py > __STAGE.h - 64) continue;
            let minDist = 999;
            others.forEach(b => {
                const dx = Math.max(b.left - px, 0, px - b.right), dy = Math.max(b.top - py, 0, py - b.bottom);
                minDist = Math.min(minDist, Math.hypot(dx, dy));
            });
            const score = minDist + (Math.sin(ang) < 0 ? 12 : -18);
            if (score > bestScore) { bestScore = score; bestAng = ang; }
        }
        const sideX = Math.cos(bestAng), sideY = Math.sin(bestAng);
        const fragCount = Math.max(6, Math.min(10, meta.shellFragments || 8));

        const fragsHtml = Array.from({ length: fragCount }, (_, i) => {
            const ang = (i / fragCount) * Math.PI * 2;
            const px = (Math.cos(ang) * rw * 0.44).toFixed(1), py = (Math.sin(ang) * rh * 0.44).toFixed(1);
            const spread = (i / (fragCount - 1) - 0.5) * 0.95, fa = bestAng + spread, dist = rnd(58, 92);
            const fx = (Math.cos(fa) * dist).toFixed(1), fy = (Math.sin(fa) * dist).toFixed(1);
            const x0 = cx + Number(px), y0 = cy + Number(py);
            return `<g class="v-shell-frag" data-fx="${fx}" data-fy="${fy}" data-rot="${((sideX >= 0 ? 1 : -1) * rnd(38, 95)).toFixed(0)}" style="transform-origin:${x0}px ${y0}px;opacity:0">`
                + `<path d="M${x0 - 11},${y0 - 4} Q${x0},${y0 - 14} ${x0 + 12},${y0 - 2} Q${x0 + 6},${y0 + 12} ${x0 - 9},${y0 + 8} Z" fill="url(#${uid}-sh)"/>`
                + `<path d="M${x0 - 9},${y0 - 3} Q${x0 + 1},${y0 - 11} ${x0 + 10},${y0 - 2}" fill="none" stroke="#fde68a" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/></g>`;
        }).join('');
        const veinsD = `M${cx - rw * 0.48},${cy - rh * 0.54} L${cx - 12},${cy - 18} L${cx + 3},${cy - 7} L${cx + rw * 0.52},${cy - rh * 0.26} M${cx + 3},${cy - 7} L${cx - 4},${cy + 14} L${cx + rw * 0.16},${cy + rh * 0.62} M${cx - rw * 0.54},${cy + rh * 0.24} L${cx - 14},${cy + 7} L${cx + rw * 0.46},${cy + rh * 0.38} M${cx - 12},${cy - 18} L${cx - rw * 0.08},${cy - rh * 0.66}`;

        const layer = owner.layer(
            `<div class="arcane-variant-anchor" style="left:${r.x}px;top:${r.y}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-variant-svg" viewBox="0 0 ${W} ${H}"><defs>`
            + svgGlowDef(uid + '-gl', 4.5)
            + `<radialGradient id="${uid}-coco"><stop offset="0" stop-color="#451a03" stop-opacity="0.14"/><stop offset="0.62" stop-color="#b45309" stop-opacity="0.34"/><stop offset="0.86" stop-color="#fbbf24" stop-opacity="0.28"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>`
            + `<radialGradient id="${uid}-sh" cx="0.35" cy="0.35"><stop offset="0" stop-color="#fef08a" stop-opacity="0.9"/><stop offset="0.45" stop-color="#b45309" stop-opacity="0.88"/><stop offset="1" stop-color="#451a03" stop-opacity="0.35"/></radialGradient>`
            + `<linearGradient id="${uid}-au" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f59e0b" stop-opacity="0"/><stop offset="0.45" stop-color="#fde68a" stop-opacity="0.82"/><stop offset="0.72" stop-color="#fef9c3" stop-opacity="0.9"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></linearGradient>`
            + `<radialGradient id="${uid}-bloom"><stop offset="0" stop-color="#fef3c7" stop-opacity="0.78"/><stop offset="0.5" stop-color="#fbbf24" stop-opacity="0.34"/><stop offset="1" stop-color="#d97706" stop-opacity="0"/></radialGradient>`
            + `</defs>`
            + `<g class="v-shell-whole" filter="url(#${uid}-gl)" style="transform-origin:${cx}px ${cy}px">`
            + `<ellipse cx="${cx}" cy="${cy}" rx="${rw * 1.18}" ry="${rh * 1.18}" fill="url(#${uid}-coco)"/>`
            + `<path d="${veinsD}" fill="none" stroke="#f59e0b" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" opacity="0.44"/>`
            + `<path d="${veinsD}" fill="none" stroke="#fef9c3" stroke-width="1.15" stroke-linejoin="round" stroke-linecap="round" opacity="0.82"/></g>`
            + `<g filter="url(#${uid}-gl)">${fragsHtml}</g>`
            + `<circle class="v-molt-flash" cx="${cx}" cy="${cy}" r="${Math.max(rw, rh) * 1.35}" fill="url(#${uid}-bloom)" opacity="0" style="transform-origin:${cx}px ${cy}px"/>`
            + `<ellipse class="v-aura-sweep" cx="${cx}" cy="${cy}" rx="${rw * 1.1}" ry="${rh * 1.05}" fill="url(#${uid}-au)" opacity="0"/>`
            + `</svg></div>`
        );

        const whole = layer.querySelector('.v-shell-whole');
        if (whole) owner.anim(whole, [{ transform: 'scale(0.84)', opacity: 0 }, { transform: 'scale(1.03)', opacity: 1, offset: 0.48 }, { transform: 'scale(1.08)', opacity: 0.98, offset: 0.85 }, { transform: 'scale(1.18)', opacity: 0 }], { duration: 350, easing: 'ease-out', fill: 'forwards' });
        owner.burst(8, () => ({ x: r.x + rnd(-rw * 0.6, rw * 0.6), y: r.y + rnd(-rh * 0.5, rh * 0.5), vx: rnd(-0.4, 0.4), vy: rnd(-0.6, 0.2), drag: 0.94, decay: 0.05, size: rnd(3, 5), shape: 'glowOrb', color: '#fcd34d' }));

        owner.at(320, () => {
            vSample(owner, 'molt_crack', { vol: 0.58, rate: 0.85, pan });
            vSample(owner, 'molt_snap', { vol: 0.42, pan });
            const fl = layer.querySelector('.v-molt-flash');
            if (fl) owner.anim(fl, [{ transform: 'scale(0.45)', opacity: 0.95 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 340, easing: 'ease-out', fill: 'forwards' });
            layer.querySelectorAll('.v-shell-frag').forEach((g, idx) => {
                owner.anim(g, [
                    { transform: 'translate(0px,0px) scale(0.95) rotate(0deg)', opacity: 0.96 },
                    { transform: `translate(${Number(g.dataset.fx) * 0.55}px,${Number(g.dataset.fy) * 0.55}px) scale(1.02) rotate(${Number(g.dataset.rot) * 0.5}deg)`, opacity: 0.92, offset: 0.4 },
                    { transform: `translate(${g.dataset.fx}px,${g.dataset.fy}px) scale(0.45) rotate(${g.dataset.rot}deg)`, opacity: 0 }
                ], { duration: 480, easing: 'cubic-bezier(0.2,0.8,0.3,1)', fill: 'forwards', delay: idx * 14 });
            });
            owner.burst(14, () => ({ x: r.x + rnd(-8, 8), y: r.y + rnd(-8, 8), vx: sideX * rnd(2.4, 5.2) + rnd(-0.9, 0.9), vy: sideY * rnd(1.8, 4.2) + rnd(-0.9, 0.9), drag: 0.93, decay: 0.036, size: rnd(1.5, 2.4), shape: 'spark', color: pick(['#fef08a', '#fbbf24', '#f59e0b']) }));
            const debuffPalette = meta.debuffColors ? Object.values(meta.debuffColors) : (Array.isArray(meta.clearedDebuffs) && meta.clearedDebuffs.length ? ['#a855f7', '#f97316', '#eab308'] : []);
            if (debuffPalette.length) {
                owner.burst(debuffPalette.length * 5, i => ({
                    x: r.x + rnd(-10, 10), y: r.y + rnd(-10, 10),
                    vx: sideX * rnd(2.4, 4.8), vy: sideY * rnd(1.6, 3.6) + rnd(-0.7, 0.7),
                    grav: 0.06, drag: 0.95, decay: 0.03, size: rnd(4, 7.5), shape: 'glowOrb', color: debuffPalette[i % debuffPalette.length]
                }));
            }
            if (onBeat) onBeat({ phase: 'molt', entity });
        });
        owner.at(670, () => {
            vSample(owner, 'molt_empower', { vol: 0.54, maxDurSec: 0.9, fadeOutSec: 0.25, pan });
            const sweep = layer.querySelector('.v-aura-sweep');
            if (sweep) owner.anim(sweep, [{ transform: 'translateY(18px) scale(0.9)', opacity: 0 }, { transform: 'translateY(0px) scale(1.06)', opacity: 0.9, offset: 0.35 }, { transform: 'translateY(-16px) scale(1.12)', opacity: 0 }], { duration: 540, easing: 'ease-out', fill: 'forwards' });
            owner.anim(r.visualDom || dom, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
            if (meta.permanentBuff !== false) setPersistentFx(dom, 'molt', true);
            owner.burst(20, i => ({ x: r.x + rnd(-r.w * 0.44, r.w * 0.44), y: r.y + rnd(-8, 16), vx: rnd(-0.5, 0.5), vy: rnd(-2.6, -0.9), drag: 0.96, decay: 0.024, size: i % 2 ? rnd(1.4, 2.2) : rnd(4, 6.5), shape: i % 2 ? 'spark' : 'glowOrb', color: pick(['#fef9c3', '#fbbf24', '#f59e0b']) }));
        });
        return owner.handle;
    }
    // 3. 狂暴：血性沸腾 (L2 · 1280ms) & 退出狂暴 (520ms)
    function playVariantRage(entity, meta = {}, onBeat) {
        const dom = domOf(entity); if (!dom) return null;
        V.rage.add(entityIdOf(entity));
        if (meta.instant) { setPersistentFx(dom, 'rage', true); return null; }
        const r = entityVisualRect(dom), id = entityIdOf(entity);
        const owner = variantRun(1280, id), pan = panOf(r.x);
        const uid = 'arcane-var-rage-' + (++S.uid);
        const W = Math.max(160, r.w * 2.2), H = Math.max(160, r.h * 2.2);
        const cx = W / 2, cy = H / 2, baseR = Math.min(r.w, r.h) * 0.52;

        const layer = owner.layer(
            `<div class="arcane-variant-anchor" style="left:${r.x}px;top:${r.y}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-variant-svg" viewBox="0 0 ${W} ${H}"><defs>`
            + svgGlowDef(uid + '-gl', 5)
            + `<radialGradient id="${uid}-pw"><stop offset="0.35" stop-color="#dc2626" stop-opacity="0"/><stop offset="0.7" stop-color="#f87171" stop-opacity="0.72"/><stop offset="0.88" stop-color="#b91c1c" stop-opacity="0.38"/><stop offset="1" stop-color="#450a0a" stop-opacity="0"/></radialGradient>`
            + `<radialGradient id="${uid}-bg"><stop offset="0" stop-color="#fecaca" stop-opacity="0.88"/><stop offset="0.28" stop-color="#ef4444" stop-opacity="0.72"/><stop offset="0.62" stop-color="#7f1d1d" stop-opacity="0.48"/><stop offset="1" stop-color="#09090b" stop-opacity="0"/></radialGradient>`
            + `<radialGradient id="${uid}-sw"><stop offset="0.5" stop-color="#ef4444" stop-opacity="0"/><stop offset="0.72" stop-color="#fca5a5" stop-opacity="0.85"/><stop offset="0.86" stop-color="#991b1b" stop-opacity="0.55"/><stop offset="1" stop-color="#09090b" stop-opacity="0"/></radialGradient>`
            + `</defs>`
            + `<g filter="url(#${uid}-gl)">`
            + `<circle class="v-pulse-1" cx="${cx}" cy="${cy}" r="${baseR * 1.15}" fill="url(#${uid}-pw)" opacity="0" style="transform-origin:${cx}px ${cy}px"/>`
            + `<circle class="v-pulse-2" cx="${cx}" cy="${cy}" r="${baseR * 1.3}" fill="url(#${uid}-pw)" opacity="0" style="transform-origin:${cx}px ${cy}px"/>`
            + `<g class="v-blast" style="transform-origin:${cx}px ${cy}px;opacity:0">`
            + `<circle cx="${cx}" cy="${cy}" r="${baseR * 1.48}" fill="url(#${uid}-bg)"/>`
            + `<circle cx="${cx}" cy="${cy}" r="${baseR * 1.65}" fill="url(#${uid}-sw)"/>`
            + `</g></g></svg></div>`
        );
        const p1 = layer.querySelector('.v-pulse-1'), p2 = layer.querySelector('.v-pulse-2'), bl = layer.querySelector('.v-blast');
        if (p1) owner.anim(p1, [{ transform: 'scale(0.35)', opacity: 0.95 }, { transform: 'scale(1.18)', opacity: 0 }], { duration: 165, easing: 'ease-out', fill: 'forwards' });
        if (p2) owner.anim(p2, [{ transform: 'scale(0.4)', opacity: 1 }, { transform: 'scale(1.32)', opacity: 0 }], { duration: 175, delay: 130, easing: 'ease-out', fill: 'forwards' });
        owner.burst(12, () => {
            const a = rnd(0, 6.283), d = rnd(baseR * 0.9, baseR * 1.45);
            return { x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d, vx: -Math.cos(a) * 2.8, vy: -Math.sin(a) * 2.8, drag: 0.9, decay: 0.06, size: rnd(4, 7), shape: 'glowOrb', color: pick(['#f87171', '#dc2626']) };
        });

        owner.at(130, () => {
            vSample(owner, 'rage_roar', { vol: 0.72, rate: 0.96, maxDurSec: 1.12, fadeOutSec: 0.24, pan });
        });
        owner.at(275, () => {
            if (bl) owner.anim(bl, [{ transform: 'scale(0.35)', opacity: 1 }, { transform: 'scale(1.06)', opacity: 0.98, offset: 0.36 }, { transform: 'scale(1.36)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(0.15,0.8,0.25,1)', fill: 'forwards' });
            owner.anim(r.visualDom || dom, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.28 }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
            owner.burst(10, () => ({ x: r.x + rnd(-12, 12), y: r.y + rnd(-8, 12), vx: rnd(-1.6, 1.6), vy: rnd(-2.2, 0.6), drag: 0.92, decay: 0.032, size: rnd(16, 26), shape: 'bloom', blend: 'source-over', color: 'rgba(24,10,12,0.72)', mid: 'rgba(127,29,29,0.28)' }));
            owner.burst(18, i => {
                const a = rnd(0, 6.283), spd = rnd(2.2, 5.4);
                return { x: r.x + rnd(-6, 6), y: r.y + rnd(-6, 6), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 0.6, drag: 0.92, decay: 0.036, size: i % 2 ? rnd(1.8, 2.8) : rnd(7, 13), shape: i % 2 ? 'spark' : 'flame', color: pick(['#ef4444', '#fca5a5', '#dc2626']) };
            });
            if (onBeat) onBeat({ phase: 'rage', entity });
        });
        owner.at(560, () => { if (V.rage.has(id)) setPersistentFx(dom, 'rage', true); });
        return owner.handle;
    }

    function playVariantRageExit(entity, meta = {}, onBeat) {
        const dom = domOf(entity); if (!dom) return null;
        const id = entityIdOf(entity);
        V.rage.delete(id);
        [...V.runs].filter(o => o.trigger === 'rage' && o.entityIds.has(id)).forEach(o => o.handle.cancel());
        const r = entityVisualRect(dom);
        const owner = variantRun(520, id);
        setPersistentFx(dom, 'rage', false);
        vSample(owner, 'rage_exit', { vol: 0.25, rate: 0.92, maxDurSec: 0.48, fadeOutSec: 0.18, pan: panOf(r.x) });
        owner.burst(12, i => ({ x: r.x + rnd(-r.w * 0.4, r.w * 0.4), y: r.y + rnd(-r.h * 0.35, r.h * 0.25), vx: rnd(-0.6, 0.6), vy: rnd(0.5, 1.6), drag: 0.95, decay: 0.036, size: i % 3 === 0 ? rnd(10, 16) : rnd(3.5, 5.5), shape: i % 3 === 0 ? 'bloom' : 'glowOrb', blend: i % 3 === 0 ? 'source-over' : 'lighter', color: i % 3 === 0 ? 'rgba(127,29,29,0.28)' : '#f87171' }));
        if (onBeat) onBeat({ phase: 'rageExit', entity });
        return owner.handle;
    }

    // 4. 连动：绝境抢攻 (L2 · 1020ms) — 纯实体自身紫光残影连闪，零行动轴互动
    function playVariantLink(entity, meta = {}, onBeat) {
        const dom = domOf(entity); if (!dom) return null;
        const r = entityVisualRect(dom), id = entityIdOf(entity);
        const owner = variantRun(1020, id), pan = panOf(r.x);
        const uid = 'arcane-var-link-' + (++S.uid);
        const visHtml = cloneVisualOnly(dom);
        const ghostFont = r.isHero ? getComputedStyle(dom).fontSize : Math.round(Math.min(r.w, r.h) * 0.88) + 'px';

        // 一拍：极短压低收身 + 紫芒汇聚
        owner.anim(r.visualDom || dom, [{ transform: 'translate3d(0,0,0) scale(1)' }, { transform: 'translate3d(0,4px,0) scale(1.06,0.9)', offset: 0.65 }, { transform: 'translate3d(0,0,0) scale(1)' }], { duration: 155, easing: 'ease-out' });
        owner.burst(10, i => {
            const a = (i / 10) * 6.283, d = rnd(r.w * 0.45, r.w * 0.72);
            return { x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d, vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 2.4, drag: 0.9, decay: 0.09, size: rnd(3.5, 5.5), shape: 'glowOrb', color: pick(['#e879f9', '#c084fc']) };
        });

        // 二拍：高频紫光残影闪烁（5帧错位残影 + 模糊速度光晕 + 拖尾粒子）
        const flickers = [
            { delay: 150, ox: -30, oy: -6, rot: -5, sc: 1.05, sfxRate: 1.15, vol: 0.56 },
            { delay: 235, ox: 32, oy: -10, rot: 5, sc: 1.08, sfxRate: 0, vol: 0 },
            { delay: 320, ox: -22, oy: 10, rot: -4, sc: 1.06, sfxRate: 1.38, vol: 0.36 },
            { delay: 405, ox: 24, oy: 6, rot: 4, sc: 1.1, sfxRate: 0, vol: 0 },
            { delay: 490, ox: -8, oy: -14, rot: 0, sc: 1.12, sfxRate: 0, vol: 0 }
        ];
        const auraW = Math.max(150, r.w * 2.1), auraH = Math.max(150, r.h * 2.1);
        const auraLayer = owner.layer(
            `<div class="arcane-variant-anchor" style="left:${r.x}px;top:${r.y}px;width:${auraW}px;height:${auraH}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-variant-svg" viewBox="0 0 ${auraW} ${auraH}"><defs>${svgGlowDef(uid + '-gl', 4.5)}`
            + `<radialGradient id="${uid}-rg"><stop offset="0" stop-color="#fdf4ff" stop-opacity="0.72"/><stop offset="0.34" stop-color="#e879f9" stop-opacity="0.62"/><stop offset="0.68" stop-color="#9333ea" stop-opacity="0.28"/><stop offset="1" stop-color="#581c87" stop-opacity="0"/></radialGradient>`
            + `</defs><ellipse class="v-link-halo" cx="${auraW / 2}" cy="${auraH / 2}" rx="${r.w * 0.72}" ry="${r.h * 0.68}" fill="url(#${uid}-rg)" opacity="0" style="transform-origin:${auraW / 2}px ${auraH / 2}px"/></svg></div>`
        );
        const halo = auraLayer.querySelector('.v-link-halo');

        owner.at(150, () => {
            owner.anim(r.visualDom || dom, [
                { transform: 'translate3d(0,0,0) scale(1)', filter: 'brightness(1)' },
                { transform: 'translate3d(-7px,1px,0) scale(1.06)', filter: 'brightness(1.38) drop-shadow(0 0 12px #e879f9)', offset: 0.2 },
                { transform: 'translate3d(8px,-2px,0) scale(0.96)', filter: 'brightness(1.1)', offset: 0.42 },
                { transform: 'translate3d(-5px,2px,0) scale(1.07)', filter: 'brightness(1.42) drop-shadow(0 0 14px #c084fc)', offset: 0.65 },
                { transform: 'translate3d(4px,-2px,0) scale(1.04)', filter: 'brightness(1.22)', offset: 0.84 },
                { transform: 'translate3d(0,0,0) scale(1)', filter: 'brightness(1)' }
            ], { duration: 420, easing: 'linear' });
        });

        flickers.forEach((f, idx) => {
            owner.at(f.delay, () => {
                if (f.sfxRate) vSample(owner, 'link_dash', { vol: f.vol, rate: f.sfxRate, pan });
                const gl = owner.layer(`<div class="arcane-variant-anchor" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;opacity:0;filter:drop-shadow(0 0 14px #d946ef) drop-shadow(0 0 6px #f5d0fe) brightness(1.55);display:flex;align-items:center;justify-content:center;font-size:${ghostFont};line-height:1">${visHtml}</div>`).firstElementChild;
                if (gl) owner.anim(gl, [
                    { transform: `translate(calc(-50% + ${(f.ox * 0.28).toFixed(1)}px), calc(-50% + ${(f.oy * 0.28).toFixed(1)}px)) scale(${f.sc}) rotate(${f.rot}deg)`, opacity: 0.84 },
                    { transform: `translate(calc(-50% + ${f.ox}px), calc(-50% + ${f.oy}px)) scale(${(f.sc + 0.08).toFixed(2)}) rotate(${(f.rot * 1.3).toFixed(1)}deg)`, opacity: 0 }
                ], { duration: 240, easing: 'cubic-bezier(0.18,0.85,0.32,1)', fill: 'forwards' });
                if (halo) owner.anim(halo, [{ transform: `translate(${f.ox * 0.25}px,${f.oy * 0.25}px) scale(0.75)`, opacity: 0.85 }, { transform: `translate(${f.ox * 0.45}px,${f.oy * 0.45}px) scale(1.22)`, opacity: 0 }], { duration: 210, easing: 'ease-out', fill: 'forwards' });
                owner.burst(8, k => {
                    const ang = Math.atan2(f.oy, f.ox) + rnd(-0.7, 0.7), spd = rnd(1.8, 4.6);
                    return { x: r.x + rnd(-12, 12), y: r.y + rnd(-10, 10), vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, drag: 0.9, decay: 0.065, size: k % 2 ? rnd(1.6, 2.5) : rnd(4.5, 7.5), shape: k % 2 ? 'spark' : 'glowOrb', color: pick(['#f0abfc', '#c084fc', '#fde68a', '#ffffff']) };
                });
                if (idx === flickers.length - 1) {
                    owner.at(90, () => {
                        vSample(owner, 'link_chime', { vol: 0.26, rate: 1.28, pan });
                        if (onBeat) onBeat({ phase: 'link', entity });
                    });
                }
            });
        });
        return owner.handle;
    }
    // 5. 吸血：生命回流 (L1 · 740ms) — 严格由承受者(from)流向吸血者(to)
    function playVariantLeech(fromEntity, toEntity, meta = {}, onBeat) {
        const fromDom = domOf(fromEntity), toDom = domOf(toEntity);
        if (!fromDom || !toDom) return null;
        const aR = entityVisualRect(fromDom), bR = entityVisualRect(toDom);
        const owner = variantRun(740, null, [fromEntity, toEntity]);
        const uid = 'arcane-var-leech-' + (++S.uid);
        const a = { x: aR.x, y: aR.y }, b = { x: bR.x, y: bR.y };
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist, ny = dx / dist;

        owner.burst(8, () => ({ x: a.x + rnd(-10, 10), y: a.y + rnd(-10, 10), vx: rnd(-0.8, 0.8), vy: rnd(-0.8, 0.8), drag: 0.9, decay: 0.06, size: rnd(4, 7), shape: 'glowOrb', color: pick(['#dc2626', '#f87171']) }));
        vSample(owner, 'leech_flow', { vol: 0.24, pan: panOf((a.x + b.x) * 0.5) });

        const offsets = [-36, -14, 15, 38];
        const ctrls = offsets.map(off => ({ x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off - 18 }));
        const pathsHtml = ctrls.map((cPt, i) => {
            const d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cPt.x.toFixed(1)},${cPt.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
            return `<g class="v-leech-g" data-idx="${i}">`
                + `<path class="v-leech-p" d="${d}" fill="none" stroke="url(#${uid}-lg)" stroke-width="6.5" stroke-linecap="round" opacity="0.34" pathLength="1" stroke-dasharray="0.38 1" stroke-dashoffset="0.38"/>`
                + `<path class="v-leech-p" d="${d}" fill="none" stroke="url(#${uid}-lg)" stroke-width="${i % 2 ? 2.4 : 1.8}" stroke-linecap="round" opacity="0.92" pathLength="1" stroke-dasharray="0.38 1" stroke-dashoffset="0.38"/></g>`;
        }).join('');
        const svgLayer = owner.layer(
            `<svg class="arcane-variant-svg" viewBox="0 0 ${__STAGE.w} ${__STAGE.h}"><defs>`
            + svgGlowDef(uid + '-gl', 3.5)
            + `<linearGradient id="${uid}-lg" x1="${a.x.toFixed(0)}" y1="${a.y.toFixed(0)}" x2="${b.x.toFixed(0)}" y2="${b.y.toFixed(0)}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#991b1b" stop-opacity="0.3"/><stop offset="55%" stop-color="#ef4444" stop-opacity="0.95"/><stop offset="100%" stop-color="#fecaca"/></linearGradient>`
            + `</defs><g filter="url(#${uid}-gl)">${pathsHtml}</g></svg>`
        );

        svgLayer.querySelectorAll('.v-leech-g').forEach((grp, i) => {
            const delay = 45 + i * 38;
            grp.querySelectorAll('.v-leech-p').forEach(pEl => {
                owner.anim(pEl, [
                    { strokeDashoffset: 0.38, opacity: 0.25 },
                    { strokeDashoffset: -0.18, opacity: 0.95, offset: 0.35 },
                    { strokeDashoffset: -1.0, opacity: 0 }
                ], { duration: 380, delay, easing: 'linear', fill: 'forwards' });
            });
            owner.at(delay, () => {
                const cPt = ctrls[i];
                owner.flyBezier(a, cPt, b, 340, (x, y) => {
                    owner.addP({ x, y, size: rnd(4.2, 6.8), decay: 0.22, shape: 'glowOrb', core: '#fee2e2', color: pick(['#ef4444', '#f87171', '#b91c1c']) });
                }, i === ctrls.length - 1 ? () => {
                    const sz = Math.max(96, bR.w * 1.35);
                    const glow = owner.layer(`<div class="arcane-variant-anchor" style="left:${b.x}px;top:${b.y}px;width:${sz}px;height:${sz}px;border-radius:50%;background:radial-gradient(circle, rgba(254,202,202,0.58) 0%, rgba(239,68,68,0.34) 42%, rgba(153,27,27,0.12) 66%, transparent 78%);transform:translate(-50%,-50%) scale(0.45)"></div>`).firstElementChild;
                    if (glow) owner.anim(glow, [{ transform: 'translate(-50%,-50%) scale(0.45)', opacity: 0.95 }, { transform: 'translate(-50%,-50%) scale(1.22)', opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
                    owner.burst(8, () => ({ x: b.x + rnd(-10, 10), y: b.y + rnd(-8, 8), vx: rnd(-0.7, 0.7), vy: rnd(-1.4, -0.3), drag: 0.94, decay: 0.045, size: rnd(3.5, 6), shape: 'glowOrb', color: pick(['#fecaca', '#f87171']) }));
                    if (onBeat) onBeat({ phase: 'leech', entity: toEntity });
                } : null);
            });
        });
        return owner.handle;
    }

    // 6. 再生：自我修复 (L1 · 680ms) — 纯自体修复光脉与浮尘爬升，无外来源、无十字环
    function playVariantRegen(entity, meta = {}, onBeat) {
        const dom = domOf(entity); if (!dom) return null;
        const r = entityVisualRect(dom);
        const owner = variantRun(680, null, [entity]);
        const uid = 'arcane-var-regen-' + (++S.uid);
        const W = Math.max(96, r.w * 1.25), H = Math.max(96, r.h * 1.25);
        const rw = r.w * 0.44, rh = r.h * 0.44, cx = W / 2, cy = H / 2;
        const veinD = `M${cx - rw * 0.56},${cy + rh * 0.5} Q${cx - 8},${cy + 4} ${cx + rw * 0.5},${cy - rh * 0.52} M${cx + rw * 0.54},${cy + rh * 0.42} Q${cx + 6},${cy} ${cx - rw * 0.48},${cy - rh * 0.48} M${cx - rw * 0.28},${cy + rh * 0.65} C${cx - rw * 0.45},${cy + 10} ${cx + rw * 0.38},${cy - 8} ${cx + rw * 0.22},${cy - rh * 0.65}`;

        const layer = owner.layer(
            `<div class="arcane-variant-anchor" style="left:${r.x}px;top:${r.y}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-variant-svg" viewBox="0 0 ${W} ${H}"><defs>`
            + svgGlowDef(uid + '-gl', 3.8)
            + `<linearGradient id="${uid}-rg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#10b981" stop-opacity="0"/><stop offset="0.45" stop-color="#6ee7b7" stop-opacity="0.58"/><stop offset="0.72" stop-color="#d1fae5" stop-opacity="0.72"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/></linearGradient>`
            + `</defs>`
            + `<ellipse class="v-regen-scan" cx="${cx}" cy="${cy}" rx="${rw * 1.05}" ry="${rh * 0.96}" fill="url(#${uid}-rg)" opacity="0"/>`
            + `<g class="v-regen-mesh" filter="url(#${uid}-gl)" opacity="0">`
            + `<path class="v-regen-vp" d="${veinD}" fill="none" stroke="#34d399" stroke-width="5" stroke-linecap="round" opacity="0.45" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`
            + `<path class="v-regen-vp" d="${veinD}" fill="none" stroke="#a7f3d0" stroke-width="1.6" stroke-linecap="round" opacity="0.92" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></g>`
            + `</svg></div>`
        );
        vSample(owner, 'regen_hum', { vol: 0.14, maxDurSec: 0.56, fadeOutSec: 0.22, pan: panOf(r.x) });
        const mesh = layer.querySelector('.v-regen-mesh'), scan = layer.querySelector('.v-regen-scan');
        if (mesh) owner.anim(mesh, [{ opacity: 0 }, { opacity: 0.95, offset: 0.28 }, { opacity: 0.85, offset: 0.68 }, { opacity: 0 }], { duration: 620, fill: 'forwards' });
        layer.querySelectorAll('.v-regen-vp').forEach(vp => owner.anim(vp, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' }));
        if (scan) owner.anim(scan, [{ transform: 'translateY(16px) scale(0.92)', opacity: 0 }, { transform: 'translateY(0px) scale(1.04)', opacity: 0.78, offset: 0.45 }, { transform: 'translateY(-16px) scale(1.08)', opacity: 0 }], { duration: 500, delay: 80, easing: 'ease-out', fill: 'forwards' });

        owner.at(240, () => {
            owner.burst(14, () => ({ x: r.x + rnd(-rw * 0.75, rw * 0.75), y: r.y + rnd(-rh * 0.45, rh * 0.65), vx: rnd(-0.18, 0.18), vy: rnd(-1.1, -0.3), drag: 0.95, decay: 0.036, size: rnd(3.5, 6), shape: 'glowOrb', color: pick(['#d1fae5', '#6ee7b7', '#34d399']) }));
            if (onBeat) onBeat({ phase: 'regen', entity });
        });
        return owner.handle;
    }

    // 7. 荆棘：反伤碎芒 (L1 · 600ms) — 仅近战且反弹结算为真时触发
    function playVariantThorn(holderEntity, attackerEntity, meta = {}, onBeat) {
        if (!meta.isMelee || !meta.reflected) return null;
        const fromDom = domOf(holderEntity), toDom = domOf(attackerEntity);
        if (!fromDom || !toDom) return null;
        const aR = entityVisualRect(fromDom), bR = entityVisualRect(toDom);
        const owner = variantRun(600, null, [holderEntity, attackerEntity]), uid = 'arcane-var-thorn-' + (++S.uid);
        const dx = bR.x - aR.x, dy = bR.y - aR.y, dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist, deg = Math.atan2(dy, dx) * 180 / Math.PI;
        const hitPt = { x: aR.x + ux * Math.min(aR.w, aR.h) * 0.34, y: aR.y + uy * Math.min(aR.w, aR.h) * 0.34 };
        const endPt = { x: bR.x, y: bR.y };

        const spikeLayer = owner.layer(
            `<div class="arcane-variant-anchor" style="left:${hitPt.x}px;top:${hitPt.y}px;width:112px;height:112px;transform:translate(-50%,-50%) rotate(${deg}deg)">`
            + `<svg class="arcane-variant-svg" viewBox="0 0 112 112"><defs>`
            + svgGlowDef(uid + '-gl', 4.2)
            + `<radialGradient id="${uid}-cg"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#99f6e4" stop-opacity="0.92"/><stop offset="0.7" stop-color="#06b6d4" stop-opacity="0.38"/><stop offset="1" stop-color="#0891b2" stop-opacity="0"/></radialGradient>`
            + `<linearGradient id="${uid}-sp" x1="0" y1="0.5" x2="1" y2="0.5"><stop offset="0" stop-color="#5eead4" stop-opacity="0.45"/><stop offset="0.55" stop-color="#cffafe"/><stop offset="1" stop-color="#ffffff"/></linearGradient>`
            + `</defs><g filter="url(#${uid}-gl)">`
            + `<circle cx="44" cy="56" r="28" fill="url(#${uid}-cg)"/>`
            + `<path d="M38,56 Q62,46 98,56 Q62,66 38,56 Z M36,48 Q62,26 86,28 Q60,44 38,52 Z M36,64 Q62,86 86,84 Q60,68 38,60 Z" fill="url(#${uid}-sp)" opacity="0.96"/>`
            + `</g></svg></div>`
        ).firstElementChild;
        if (spikeLayer) owner.anim(spikeLayer, [
            { transform: `translate(-50%,-50%) rotate(${deg}deg) scale(0.36)`, opacity: 1 },
            { transform: `translate(-50%,-50%) rotate(${deg}deg) scale(1.16)`, opacity: 1, offset: 0.25 },
            { transform: `translate(-50%,-50%) rotate(${deg}deg) scale(1.06)`, opacity: 0.9, offset: 0.55 },
            { transform: `translate(-50%,-50%) rotate(${deg}deg) scale(0.95)`, opacity: 0 }
        ], { duration: 310, easing: 'ease-out', fill: 'forwards' });

        owner.at(45, () => {
            vSample(owner, 'thorn_parry', { vol: 0.44, maxDurSec: 0.54, fadeOutSec: 0.14, pan: panOf(hitPt.x) });
            const nx = -uy, ny = ux;
            [-14, 0, 14].forEach((spread, idx) => {
                const rad = (deg + spread) * Math.PI / 180;
                const sPt = { x: hitPt.x + Math.cos(rad) * 14, y: hitPt.y + Math.sin(rad) * 14 };
                const ctrl = { x: (sPt.x + endPt.x) * 0.5 + nx * spread * 1.4, y: (sPt.y + endPt.y) * 0.5 + ny * spread * 1.4 };
                owner.flyBezier(sPt, ctrl, endPt, 220 + idx * 18, (x, y) => {
                    owner.addP({ x, y, vx: ux * 2.5, vy: uy * 2.5, shape: 'spark', size: 2.0, decay: 0.26, color: '#67e8f9' });
                    owner.addP({ x, y, shape: 'glowOrb', size: 4.8, decay: 0.28, color: '#99f6e4' });
                }, idx === 1 ? () => {
                    const redFlash = owner.layer(`<div class="arcane-variant-anchor" style="left:${endPt.x}px;top:${endPt.y}px;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle, rgba(254,226,226,0.92) 0%, rgba(239,68,68,0.52) 44%, transparent 74%);transform:translate(-50%,-50%)"></div>`).firstElementChild;
                    if (redFlash) owner.anim(redFlash, [{ transform: 'translate(-50%,-50%) scale(0.4)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.26)', opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' });
                    owner.burst(12, i => { const a = rnd(0, 6.283), s = rnd(1.8, 4.6); return { x: endPt.x, y: endPt.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.92, decay: 0.055, size: i % 2 ? rnd(1.4, 2.2) : rnd(3.5, 5.5), shape: i % 2 ? 'spark' : 'glowOrb', color: pick(['#f87171', '#fca5a5', '#99f6e4']) }; });
                    if (onBeat) onBeat({ phase: 'thorn', entity: attackerEntity });
                } : null);
            });
        });
        return owner.handle;
    }


    function playVariantTriggerFx(opts = {}) {
        return CombatAudioMixer.withContext('J', () => {
        const { trigger, meta = {}, onBeat } = opts;
        if (!trigger || meta.triggered === false) return null;
        const entityOf = (entity, id) => entity || heroesData.concat(enemiesData).find(e => e.id === id) || (id ? { id } : null);
        const entity = entityOf(opts.entity, opts.enemyId);
        const source = entityOf(opts.sourceEntity || meta.sourceEntity, opts.sourceId);
        const target = entityOf(opts.targetEntity || meta.attackerEntity, opts.targetId);
        const primary = entity || target || source;
        const before = new Set(V.runs);
        let handle = null;
        if (trigger === 'revive') handle = playVariantRevive(primary, meta, onBeat);
        else if (trigger === 'molt') handle = playVariantMolt(primary, meta, onBeat);
        else if (trigger === 'rage') handle = playVariantRage(primary, meta, onBeat);
        else if (trigger === 'rageExit') handle = playVariantRageExit(primary, meta, onBeat);
        else if (trigger === 'link') handle = playVariantLink(primary, meta, onBeat);
        else if (trigger === 'leech') handle = playVariantLeech(source, target || primary, meta, onBeat);
        else if (trigger === 'regen') handle = playVariantRegen(primary, meta, onBeat);
        else if (trigger === 'thorn') handle = playVariantThorn(source || primary, target, meta, onBeat);
        V.runs.forEach(owner => { if (!before.has(owner)) owner.trigger = trigger; });
        return handle;
        });
    }

    const SFX_PRESETS = {
        abyss: {
            fs_start: [['mx_sand_swish', { vol: 0.54 }], ['mx_stygian_whoosh', { vol: 0.45, offset: 0.12, dur: 1.1 }]],
            fs_fly: [['mx_stygian_whoosh', { vol: 0.48, dur: 0.7 }]],
            fs_armor: [['mx_sword_metal', { vol: 0.58 }], ['defUp', { vol: 0.58 }]],
            fs_shield: [['mx_gear_lock', { vol: 0.55 }]],
            fs_reac: [['shieldUp', { vol: 0.5 }]],
            xy_charge: [['mx_tunnel', { vol: 0.56, dur: 1.3 }], ['mx_rift_charge', { vol: 0.64, offset: 0.25, dur: 1.1 }]],
            xy_fly: [['mx_stygian_whoosh', { vol: 0.4, rate: 1.25 }]],
            xy_burst: [['mx_deep_impact', { vol: 0.88, dur: 1.7 }]],
            xy_roar: [['mx_giant_roar', { vol: 0.86, dur: 1.7 }], ['mx_dino_roar', { vol: 0.55, dur: 1.4 }]],
            xy_stomp: [['mx_golem_stomp', { vol: 0.84 }]],
            xy_lock: [['mx_gear_lock', { vol: 0.75 }]],
            xy_ward: [['shieldUp', { vol: 0.52 }]]
        }
    };
    function playSandCue(owner, cue) {
        SFX_PRESETS.abyss[cue].forEach(([key, opts]) => idSample(owner, key, {
            sampled: true, vol: opts.vol, rate: opts.rate || 1, offsetSec: opts.offset || 0,
            maxDurSec: opts.dur, fadeInSec: opts.fadeIn === undefined ? 0.012 : opts.fadeIn,
            fadeOutSec: opts.fadeOut === undefined ? 0.14 : opts.fadeOut, pan: opts.pan
        }));
    }
    function fixedSkillRun(totalMs) {
        const owner = identityRun(totalMs, 1), deadline = owner.handle.doneAt;
        owner.fixedLife = true;
        Object.defineProperty(owner.handle, 'doneAt', { get: () => deadline, set() {} });
        return owner;
    }
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
    const VFX_IMG_FILES = { stygian: 'vfx_stygian_armor.jpg', marcher: 'vfx_dream_marcher.jpg' };
    function resolveVfxImg(key) {
        return window.__RPG_VFX_IMAGES__ && window.__RPG_VFX_IMAGES__[key] || ASSET_BASE + '/' + VFX_IMG_FILES[key];
    }

    // ===== ① 飞沙化甲（L2，紧凑单卡哥特盾框 + 柔和冥河铠影 + abyss 原采样） =====
    function playFeiShaHuaJia(caster, targets) {
        const casterEl = domOf(caster);
        const el = domOf(targets && targets[0]) || casterEl;
        if (!el) return null;
        const token = combatToken;
        ensureCanvas(); ensureDriver();
        const CHARGE = 280, LIFE = 1320;
        const c = ctr(el), cc = casterEl ? ctr(casterEl) : c, uid = ++S.uid;
        const owner = fixedSkillRun(LIFE), handle = owner.handle;
        const tokenAlive = () => !owner.cancelled && !owner.finished && token === combatToken;
        const tAfter = owner.at, tEvery = owner.every;
        const stopInt = id => { stopEvery(id); owner.intervals.delete(id); };
        const addLayer = (markup, ms) => skillLayer(owner, markup, ms);
        const addP = owner.addP, burst = owner.burst, fly = owner.fly;
        const playPresetCue = cue => playSandCue(owner, cue);

        // 0ms：玄武岩瓶启封 + 冥河死寂尘沙渐起
        playPresetCue('fs_start');
        burst(10, () => {
            const a = Math.random() * 6.283, r = rnd(10, 32);
            return { x: cc.x + Math.cos(a) * r, y: cc.y - 16 + Math.sin(a) * r * 0.5, vx: Math.cos(a) * 1.5, vy: rnd(-2.2, -0.6), drag: 0.94, decay: 0.036, size: rnd(14, 22), shape: 'gradMist', blend: 'source-over', color: 'rgba(28,36,64,0.68)', fade: 'rgba(13,18,32,0)' };
        });
        if (casterEl && casterEl !== el) {
            flashOwned(owner, casterEl, 'arcane-flash-cold');
            playPresetCue('fs_fly');
            fly({ x: cc.x, y: cc.y - 18 }, { x: c.x, y: c.y }, -42, 250, (x, y) => {
                if (!tokenAlive()) return;
                addP({ x, y, shape: 'gradMist', size: rnd(10, 15), decay: 0.055, blend: 'source-over', color: 'rgba(42,50,82,0.56)', fade: 'rgba(13,18,32,0)' });
                burst(2, () => ({ x: x + rnd(-5, 5), y: y + rnd(-5, 5), vx: rnd(-1.0, 1.0), vy: rnd(-1.2, 0.8), drag: 0.92, decay: 0.072, size: rnd(2.2, 3.8), shape: 'gradOrb', trail: 6, core: '#e0f2fe', color: 'rgba(147,197,253,0.88)', edge: 'rgba(99,102,241,0.4)' }));
            });
        }

        let stepTick = 0;
        const swirl = tEvery(30, () => {
            if (!tokenAlive()) return;
            const ang = (stepTick++) * 0.92;
            burst(3, i => {
                const a = ang + i * 2.09, rad = rnd(24, 54);
                return {
                    x: c.x + Math.cos(a) * rad, y: c.bottom - 14 - stepTick * 10,
                    vx: -Math.sin(a) * 2.0, vy: rnd(-2.4, -1.0), drag: 0.94, decay: 0.042,
                    size: i === 0 ? rnd(12, 18) : rnd(2.1, 3.5),
                    shape: i === 0 ? 'gradMist' : 'gradOrb', trail: i === 0 ? 0 : 5,
                    blend: i === 0 ? 'source-over' : 'lighter',
                    core: i === 0 ? undefined : '#f1f5f9',
                    color: i === 0 ? 'rgba(22,30,54,0.65)' : 'rgba(148,184,232,0.85)',
                    edge: 'rgba(71,85,125,0.38)', fade: 'rgba(13,18,32,0)'
                };
            });
        });

        // 280ms：收束单卡哥特盾牌外框 + 夜影兜帽双眸 + 柔光流转
        tAfter(CHARGE, () => {
            stopInt(swirl);
            if (!tokenAlive()) return;
            playPresetCue('fs_armor');
            tAfter(65, () => { if (tokenAlive()) playPresetCue('fs_shield'); });
            shake('light');
            flashOwned(owner, el, 'arcane-flash-cold');

            const imgSrc = resolveVfxImg('stygian');
            const sw = Math.min(186, Math.max(150, Math.round(c.w * 1.16))), sh = Math.round(sw * 1.15);
            const ay = Math.max(sh * 0.52 + 8, c.y - 10);
            const clipId = 'arcane-sh-clip-' + uid, maskId = 'arcane-sh-mask-' + uid, mgId = 'arcane-sh-mg-' + uid, rimId = 'arcane-sh-rim-' + uid, sheenId = 'arcane-sh-sheen-' + uid;
            const shieldPath = 'M 100,12 C 138,12 172,22 184,32 C 186,118 160,174 100,218 C 40,174 14,118 16,32 C 28,22 62,12 100,12 Z';
            const innerPath  = 'M 100,20 C 134,20 165,28 176,37 C 178,116 154,167 100,208 C 46,167 22,116 24,37 C 35,28 66,20 100,20 Z';

            addLayer(`<div class="arcane-stygian-aura" style="left:${c.x}px; top:${ay}px; width:${Math.round(sw * 1.24)}px; height:${Math.round(sh * 1.14)}px; margin-left:${-Math.round(sw * 0.62)}px; margin-top:${-Math.round(sh * 0.57)}px;"></div>
              <div class="arcane-stygian-shield-wrap" style="left:${c.x}px; top:${ay}px; width:${sw}px; height:${sh}px; margin-left:${-Math.round(sw / 2)}px; margin-top:${-Math.round(sh / 2)}px;">
                <svg viewBox="0 0 200 230" style="width:100%;height:100%;overflow:visible">
                  <defs>
                    <clipPath id="${clipId}"><path d="${shieldPath}"/></clipPath>
                    <radialGradient id="${mgId}" cx="50%" cy="44%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset="0.64" stop-color="#fff"/><stop offset="0.88" stop-color="#777"/><stop offset="1" stop-color="#111"/></radialGradient>
                    <mask id="${maskId}"><rect x="0" y="0" width="200" height="230" fill="url(#${mgId})"/></mask>
                    <linearGradient id="${rimId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0" stop-color="#e0f2fe"/><stop offset="0.45" stop-color="#7dd3fc"/><stop offset="1" stop-color="#64748b"/></linearGradient>
                    <linearGradient id="${sheenId}" x1="0%" y1="0%" x2="100%" y2="25%"><stop offset="0" stop-color="transparent"/><stop offset="0.5" stop-color="rgba(224,242,254,0.34)"/><stop offset="1" stop-color="transparent"/></linearGradient>
                  </defs>
                  <path d="${shieldPath}" fill="#090d1a" fill-opacity="0.9"/>
                  <g clip-path="url(#${clipId})" mask="url(#${maskId})">
                    <image href="${imgSrc}" x="0" y="0" width="200" height="230" preserveAspectRatio="xMidYMid slice" onerror="this.style.display='none'"/>
                    <rect x="-80" y="0" width="120" height="230" fill="url(#${sheenId})" style="animation:arcane-armor-sweep 0.62s 0.08s ease-out both"/>
                  </g>
                  <path d="${shieldPath}" fill="none" stroke="url(#${rimId})" stroke-width="2.6" stroke-opacity="0.92"/>
                  <path d="${innerPath}" fill="none" stroke="#93c5fd" stroke-width="0.95" stroke-opacity="0.48"/>
                  <circle cx="100" cy="12" r="2.8" fill="#e0f2fe" opacity="0.9"/>
                  <g class="arcane-stygian-eye">
                    <circle cx="95.5" cy="43.8" r="4.6" fill="rgba(125,211,252,0.45)"/>
                    <circle cx="104.5" cy="43.8" r="4.6" fill="rgba(125,211,252,0.45)"/>
                    <circle cx="95.5" cy="43.8" r="1.9" fill="#e0f2fe"/>
                    <circle cx="104.5" cy="43.8" r="1.9" fill="#e0f2fe"/>
                  </g>
                </svg>
              </div>`, LIFE - CHARGE);

            addP({ x: c.x, y: c.y, shape: 'gradRing', size: 1.9, decay: 0.044, color: 'rgba(147,197,253,0.46)' });
            burst(20, () => {
                const a = Math.random() * 6.283, spd = rnd(2.0, 5.6);
                return {
                    x: c.x, y: c.y - 8, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 0.5,
                    drag: 0.93, decay: rnd(0.025, 0.044), size: rnd(2.2, 4.0), shape: 'gradOrb', trail: 6,
                    core: '#f8fafc', color: pick(['rgba(186,230,253,0.88)', 'rgba(125,211,252,0.82)', 'rgba(129,140,248,0.75)']),
                    edge: 'rgba(59,75,117,0.35)'
                };
            });
            burst(10, () => {
                const a = Math.random() * 6.283, spd = rnd(1.2, 3.2);
                return {
                    x: c.x + rnd(-18, 18), y: c.y + rnd(-8, 18), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                    drag: 0.94, decay: rnd(0.026, 0.04), size: rnd(14, 22), shape: 'gradMist', blend: 'source-over',
                    color: pick(['rgba(20,26,48,0.72)', 'rgba(52,64,98,0.56)']), fade: 'rgba(13,18,32,0)'
                };
            });
            let aimTick = 0;
            const aimOrbit = tEvery(26, () => {
                if (!tokenAlive() || aimTick++ > 18) return stopInt(aimOrbit);
                for (let k = 0; k < 3; k++) {
                    const ang = aimTick * 0.28 + k * 2.094;
                    addP({
                        x: c.x + Math.cos(ang) * 62, y: c.y + Math.sin(ang) * 42,
                        vx: -Math.sin(ang) * 2.4, vy: Math.cos(ang) * 1.6, drag: 0.92, decay: 0.14,
                        shape: 'gradOrb', trail: 5, size: 2.9, core: '#e0f2fe', color: 'rgba(125,211,252,0.88)', edge: 'rgba(99,102,241,0.38)'
                    });
                }
            });
        });

        // 660ms：[再动] 银靛流光升腾
        tAfter(660, () => {
            if (!tokenAlive()) return;
            playPresetCue('fs_reac');
            addP({ x: c.x, y: c.y - 16, shape: 'gradFlare', size: 16, decay: 0.048, core: '#f0f9ff', color: 'rgba(147,197,253,0.72)' });
            burst(14, () => ({
                x: c.x + rnd(-24, 24), y: c.y + rnd(-10, 20), vx: rnd(-1.3, 1.3), vy: rnd(-5.0, -2.0),
                drag: 0.93, decay: 0.038, size: rnd(2.1, 3.8), shape: 'gradOrb', trail: 7,
                core: '#ffffff', color: 'rgba(186,230,253,0.88)', edge: 'rgba(129,140,248,0.4)'
            }));
        });

        return handle;
    }

    // ===== ② 蝎眼钥匙 · 幻梦行军兽（L4，竖裂探身 + 零直边双轴消融 + abyss 原采样） =====
    function playXieYanKey(caster, targets, isReaction = false, at = null) {
        const casterEl = domOf(caster) || (targets && domOf(targets[0]));
        let wardTargets = (targets || []).filter(Boolean);
        const token = combatToken;
        ensureCanvas(); ensureDriver();
        const CHARGE = 1150, LIFE = 3350;
        const vw = 1280, vh = 720;
        const cX = at ? at.x : __STAGE.w * 0.5, cY = at ? at.y : __STAGE.h * 0.46;
        const owner = fixedSkillRun(LIFE), handle = owner.handle;
        const tokenAlive = () => !owner.cancelled && !owner.finished && token === combatToken;
        const tAfter = owner.at, tEvery = owner.every;
        const stopInt = id => { stopEvery(id); owner.intervals.delete(id); };
        const addLayer = (markup, ms) => skillLayer(owner, markup, ms);
        const addP = owner.addP, burst = owner.burst, fly = owner.fly;
        const playPresetCue = cue => playSandCue(owner, cue);
        let resolveBurst, burstSettled = false, holdingHitStop = false;
        handle.burstReady = new Promise(resolve => { resolveBurst = resolve; });
        handle.setWardTargets = list => { wardTargets = (list || []).filter(Boolean); };
        Object.defineProperty(handle, "cancelled", { get: () => owner.cancelled });
        owner.onClean(() => {
            if (!burstSettled) { burstSettled = true; resolveBurst(false); }
            if (holdingHitStop && token === combatToken) fxEngine.hitStop = 0;
        });

        // Act I (0–1150ms)：钥匙启封蓄压，低饱和暗紫流光与纯无白芯深渊灰雾向裂隙原点收束塌缩
        darken(0.9);
        const ownDark = S.dark;
        owner.onClean(() => { if (S.dark === ownDark) { ownDark.remove(); S.dark = null; } });
        addLayer('<div class="arcane-marcher-veil"></div>', 3300);
        playPresetCue('xy_charge');

        if (casterEl) {
            const csc = ctr(casterEl);
            tAfter(40, () => {
                if (!tokenAlive()) return;
                flashOwned(owner, casterEl, 'arcane-flash-cold');
                playPresetCue('xy_fly');
                fly({ x: csc.x, y: csc.y - 12 }, { x: cX, y: cY }, 45, 220, (x, y) => {
                    if (!tokenAlive()) return;
                    addP({ x, y, shape: 'gradOrb', trail: 6, size: 4, decay: 0.09, core: '#ede9fe', color: 'rgba(139,112,184,0.85)', edge: 'rgba(56,39,82,0.4)' });
                });
            });
        }
        const rumble = tEvery(320, () => { if (tokenAlive()) shake('light'); });
        let orbitTick = 0;
        const orbitInt = tEvery(36, () => {
            if (!tokenAlive()) return stopInt(orbitInt);
            orbitTick++;
            const pr = Math.min(1, orbitTick / 26), baseR = Math.max(vw, vh) * 0.40 * (1 - pr * 0.82);
            burst(6, i => {
                const a = Math.random() * 6.283, r = baseR + rnd(-28, 28), spd = rnd(3.2, 6.4);
                const isMist = i < 2;
                return {
                    x: cX + Math.cos(a) * r, y: cY + Math.sin(a) * r,
                    vx: -Math.cos(a) * spd - Math.sin(a) * 1.8, vy: -Math.sin(a) * spd + Math.cos(a) * 1.8,
                    drag: 0.94, decay: isMist ? 0.028 : 0.044,
                    size: isMist ? rnd(18, 30) : rnd(2.2, 4),
                    shape: isMist ? 'gradMist' : 'gradOrb', trail: isMist ? 0 : 6,
                    blend: isMist ? 'source-over' : 'lighter',
                    core: isMist ? undefined : '#ede9fe',
                    color: isMist ? pick(['rgba(20,13,34,0.72)', 'rgba(46,32,70,0.54)']) : pick(['rgba(167,154,194,0.82)', 'rgba(124,99,166,0.82)', 'rgba(91,63,128,0.75)']),
                    edge: 'rgba(56,39,82,0.38)', fade: 'rgba(8,5,14,0)'
                };
            });
        });
        tAfter(1010, () => { stopInt(orbitInt); stopInt(rumble); });
        tAfter(1035, () => {
            if (!tokenAlive()) return;
            addP({ x: cX, y: cY, shape: 'gradFlare', size: 42, decay: 0.08, core: '#f5f3ff', color: 'rgba(139,112,184,0.75)' });
            fxEngine.hitStop = 110; holdingHitStop = true;
        });

        // Act II (1150–2650ms)：空间裂隙撕开 + 零直边双轴渐隐容器 + 裂隙边缘暗紫微光
        tAfter(CHARGE, () => {
            if (!tokenAlive()) return;
            fxEngine.hitStop = 0; holdingHitStop = false;
            shake('quake');
            playPresetCue('xy_burst');
            tAfter(180, () => { if (tokenAlive()) playPresetCue('xy_roar'); });
            tAfter(410, () => { if (tokenAlive()) playPresetCue('xy_stomp'); });

            const imgSrc = resolveVfxImg('marcher');
            addLayer(`<div class="arcane-marcher-flash"></div>
              <div class="arcane-marcher-rift-stage is-vertical" style="left:${cX}px; top:${cY}px;">
                <div class="arcane-marcher-abyss"></div>
                <div class="arcane-marcher-rift-rim"></div>
                <div class="arcane-marcher-beast-clip">
                  <div class="arcane-marcher-beast-wrap">
                    <div class="arcane-marcher-cream-back"></div>
                    <div class="arcane-marcher-edge-y">
                      <div class="arcane-marcher-edge-x">
                        <img src="${imgSrc}" alt="" onerror="this.style.display='none'"/>
                        <div class="arcane-marcher-tint-glaze"></div>
                        <div class="arcane-marcher-violet-wash"></div>
                      </div>
                    </div>
                    <div class="arcane-marcher-eye-flare">
                      <div class="arcane-marcher-eye-core"></div>
                      <div class="arcane-marcher-eye-beam-h"></div>
                      <div class="arcane-marcher-eye-beam-v"></div>
                    </div>
                  </div>
                </div>
              </div>`, 1680);
            burstSettled = true; resolveBurst(true);

            addP({ x: cX, y: cY, shape: 'gradRing', size: 5.5, decay: 0.026, color: 'rgba(139,112,184,0.44)' });
            addP({ x: cX, y: cY, shape: 'gradFlare', size: 64, decay: 0.052, core: '#f5f3ff', color: 'rgba(124,99,166,0.7)' });

            // 前景暗紫浓雾塑形（外推至裂隙两侧边缘，避开兽首与米白核心区）
            burst(24, i => {
                const dir = i % 2 === 0 ? -1 : 1;
                const vx = dir * rnd(4.5, 10);
                const vy = rnd(-2.4, 2.2);
                const sx = cX + dir * rnd(120, 210);
                const sy = cY + rnd(-120, 115);
                return {
                    x: sx, y: sy,
                    vx, vy, grav: 0.02, drag: 0.92, decay: rnd(0.018, 0.03),
                    size: rnd(22, 40), sx: 1.45, sy: 0.85, shape: 'gradMist', blend: 'source-over',
                    color: pick(['rgba(14,9,24,0.68)', 'rgba(34,22,52,0.56)', 'rgba(58,42,84,0.42)']),
                    fade: 'rgba(6,4,12,0)'
                };
            });

            // 裂隙方向特化渐变尾粒（无 stroke 实线）
            burst(44, () => {
                const side = Math.random() < 0.5 ? -1 : 1, sp = rnd(5, 14);
                const vx = side * sp, vy = rnd(-3.5, 3.5);
                const sx = cX + rnd(-32, 32), sy = cY + rnd(-130, 130);
                return {
                    x: sx, y: sy, vx, vy, grav: 0.04, drag: 0.93, decay: rnd(0.02, 0.036),
                    size: rnd(2.2, 4.4), shape: 'gradOrb', trail: 7,
                    core: '#f5f3ff',
                    color: pick(['rgba(167,154,194,0.85)', 'rgba(139,112,184,0.82)', 'rgba(104,85,134,0.78)']),
                    edge: 'rgba(56,39,82,0.4)'
                };
            });

            const riftStream = tEvery(46, () => {
                if (!tokenAlive()) return stopInt(riftStream);
                burst(4, i => {
                    const side = i % 2 === 0 ? -1 : 1;
                    const vx = side * rnd(6, 12);
                    const vy = rnd(-1.4, 1.4);
                    const isMist = i < 2;
                    return {
                        x: isMist ? (cX + side * rnd(105, 175)) : (cX + rnd(-95, 95)),
                        y: cY + rnd(-100, 100),
                        vx, vy, grav: 0, drag: 0.94, decay: isMist ? 0.024 : 0.036,
                        size: isMist ? rnd(18, 28) : rnd(2, 3.6), shape: isMist ? 'gradMist' : 'gradOrb', trail: isMist ? 0 : 6,
                        blend: isMist ? 'source-over' : 'lighter',
                        core: isMist ? undefined : '#ede9fe',
                        color: isMist ? 'rgba(24,15,38,0.48)' : 'rgba(152,132,188,0.8)', edge: 'rgba(56,39,82,0.35)', fade: 'rgba(6,4,12,0)'
                    };
                });
            });
            tAfter(980, () => stopInt(riftStream));
        });

        // Act III (2500–3350ms)：堡垒鞍齿轮锁合单防回流
        tAfter(2500, () => {
            if (!tokenAlive()) return;
            playPresetCue('xy_lock');
            wardTargets.forEach(wt => {
                const wEl = domOf(wt);
                if (!wEl) return;
                const wc = ctr(wEl);
                fly({ x: cX, y: cY }, { x: wc.x, y: wc.y }, -64, 340, (x, y) => {
                    if (!tokenAlive()) return;
                    addP({ x, y, shape: 'gradOrb', trail: 6, size: 3.8, decay: 0.08, core: '#fef3c7', color: 'rgba(196,181,253,0.82)', edge: 'rgba(104,85,134,0.4)' });
                }, () => {
                    if (!tokenAlive()) return;
                    flashOwned(owner, wEl, 'arcane-flash-cold');
                    playPresetCue('xy_ward');
                    addP({ x: wc.x, y: wc.y, shape: 'gradRing', size: 2.2, decay: 0.04, color: 'rgba(167,139,250,0.48)' });
                    burst(16, () => {
                        const a = Math.random() * 6.283, spd = rnd(2.2, 6);
                        return { x: wc.x, y: wc.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, drag: 0.92, decay: 0.038, size: rnd(2.2, 3.8), shape: 'gradOrb', trail: 5, core: '#f5f3ff', color: 'rgba(167,154,194,0.85)', edge: 'rgba(72,52,102,0.38)' };
                    });
                });
            });
        });
        tAfter(2860, () => { if (tokenAlive()) darken(0); });
        return handle;
    }

    // ===== 奇物与技能定稿 v12.11 BEGIN =====
    function visualCtr(el) {
        return entityVisualRect(el) || { x:__STAGE.w * 0.5, y:__STAGE.h * 0.5, w:96, h:96, top:0, bottom:96, left:0, right:96 };
    }
    function tintOverlay(owner, bgGradient, durMs, peakOpacity = 0.72) {
        const wrap = skillLayer(owner, `<div class="arcane-tint-overlay" style="background:${bgGradient};"></div>`, durMs + 60);
        wrap.style.zIndex = '41';
        owner.anim(wrap.firstElementChild, [{ opacity:0 }, { opacity:peakOpacity, offset:0.16 }, { opacity:peakOpacity, offset:0.76 }, { opacity:0 }], { duration:durMs, fill:'both' });
        return wrap;
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
        const t0 = __fxNow();
        const id = owner.every(33, () => {
            const k = Math.min(1, (__fxNow() - t0) / dur);
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
    function itemFlash(owner, dom, cls) {
        if (cls === 'arcane-flash-heal' && dom) {
            dom.classList.add('arcane-item-heal');
            owner.at(700, () => dom.classList.remove('arcane-item-heal'));
            owner.onClean(() => dom.classList.remove('arcane-item-heal'));
        }
        flashOwned(owner, dom, cls);
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
            v.playbackRate = rate * __fxScale();
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

    function mkTuningForkGroupSvg(uid, mode = 'harmony') {
        const palette = mode === 'harmony'
            ? { a: '#e0f2fe', b: '#38bdf8', c: '#0c4a6e', glow: 'rgba(125,211,252,0.85)', rune: '#bae6fd' }
            : (mode === 'silence'
                ? { a: '#ddd6fe', b: '#7c3aed', c: '#1e1b4b', glow: 'rgba(139,92,246,0.85)', rune: '#c4b5fd' }
                : { a: '#f8fafc', b: '#7dd3fc', c: '#0f172a', glow: 'rgba(224,242,254,0.95)', rune: '#e0f2fe' });
        return `<svg viewBox="0 0 280 260" class="w-full h-full overflow-visible">
            <defs>
                <radialGradient id="fk-aura-${uid}" cx="50%" cy="44%" r="50%">
                    <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.55"/>
                    <stop offset="52%" stop-color="${palette.b}" stop-opacity="0.18"/>
                    <stop offset="100%" stop-color="${palette.c}" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="fk-iron-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#475569"/>
                    <stop offset="32%" stop-color="#1e293b"/>
                    <stop offset="72%" stop-color="#090d16"/>
                    <stop offset="100%" stop-color="#334155"/>
                </linearGradient>
                <linearGradient id="fk-edge-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="${palette.a}" stop-opacity="0.95"/>
                    <stop offset="65%" stop-color="${palette.b}" stop-opacity="0.72"/>
                    <stop offset="100%" stop-color="${palette.c}" stop-opacity="0.15"/>
                </linearGradient>
                <filter id="fk-soft-${uid}" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="3.5"/></filter>
            </defs>
            <circle cx="140" cy="118" r="112" fill="url(#fk-aura-${uid})"/>
            <g opacity="0.72" style="transform-origin:140px 118px;animation:arcane-slow-rot 18s linear infinite;">
                <circle cx="140" cy="118" r="88" fill="none" stroke="url(#fk-edge-${uid})" stroke-width="1.4" stroke-dasharray="14 8 3 8"/>
                <circle cx="140" cy="118" r="68" fill="none" stroke="url(#fk-edge-${uid})" stroke-width="0.9" stroke-dasharray="4 10"/>
            </g>
            <!-- 左副短音叉 -->
            <g transform="translate(82,126) rotate(-14) scale(0.68)">
                <rect x="-14" y="-88" width="6" height="68" rx="3" fill="url(#fk-iron-${uid})"/>
                <rect x="8" y="-88" width="6" height="68" rx="3" fill="url(#fk-iron-${uid})"/>
                <path d="M-11 -22 Q-11 2 0 4 Q11 2 11 -22" fill="none" stroke="url(#fk-iron-${uid})" stroke-width="6.5" stroke-linecap="round"/>
                <rect x="-3.5" y="2" width="7" height="44" rx="3.5" fill="url(#fk-iron-${uid})"/>
                <circle cx="0" cy="48" r="5.5" fill="url(#fk-edge-${uid})"/>
            </g>
            <!-- 右副中音叉 -->
            <g transform="translate(198,124) rotate(13) scale(0.78)">
                <rect x="-15" y="-98" width="6.5" height="76" rx="3" fill="url(#fk-iron-${uid})"/>
                <rect x="8.5" y="-98" width="6.5" height="76" rx="3" fill="url(#fk-iron-${uid})"/>
                <path d="M-11.5 -24 Q-11.5 2 0 4 Q11.5 2 11.5 -24" fill="none" stroke="url(#fk-iron-${uid})" stroke-width="7" stroke-linecap="round"/>
                <rect x="-3.5" y="2" width="7" height="48" rx="3.5" fill="url(#fk-iron-${uid})"/>
                <circle cx="0" cy="52" r="6" fill="url(#fk-edge-${uid})"/>
            </g>
            <!-- 中央主长音叉（密大深海暗铁流物符文） -->
            <g transform="translate(140,122)">
                <rect x="-22" y="-110" width="9" height="90" rx="4.5" fill="url(#fk-iron-${uid})"/>
                <rect x="13" y="-110" width="9" height="90" rx="4.5" fill="url(#fk-iron-${uid})"/>
                <rect x="-22" y="-110" width="9" height="90" rx="4.5" fill="url(#fk-edge-${uid})" opacity="0.58" filter="url(#fk-soft-${uid})"/>
                <rect x="13" y="-110" width="9" height="90" rx="4.5" fill="url(#fk-edge-${uid})" opacity="0.58" filter="url(#fk-soft-${uid})"/>
                <path d="M-17.5 -22 Q-17.5 10 0 12 Q17.5 10 17.5 -22" fill="none" stroke="url(#fk-iron-${uid})" stroke-width="9" stroke-linecap="round"/>
                <path d="M-17.5 -22 Q-17.5 10 0 12 Q17.5 10 17.5 -22" fill="none" stroke="url(#fk-edge-${uid})" stroke-width="2.4" stroke-linecap="round"/>
                <rect x="-4.5" y="10" width="9" height="62" rx="4.5" fill="url(#fk-iron-${uid})"/>
                <circle cx="0" cy="76" r="8" fill="url(#fk-edge-${uid})"/>
                <path d="M-17.5 -86 L-17.5 -46 M17.5 -86 L17.5 -46 M0 22 L0 58" stroke="${palette.rune}" stroke-width="1.3" stroke-dasharray="3 4" opacity="0.9"/>
            </g>
        </svg>`;
    }
    function playHarmonyShelter(caster, targets) {
        const token = combatToken, uid = ++S.uid;
        const owner = itemSkillRun(2300), handle = owner.handle;
        const after = owner.at, every = owner.every, fsLayer = (markup, ms) => skillLayer(owner, markup, ms);
        const addP = p => owner.addP(Object.assign({ itemFx:true }, p)), burst = (n, fn) => { for (let i = 0; i < n; i++) addP(fn(i)); };
        const playSfxSample = (key, delay, opts) => playItemSample(owner, key, delay, opts);
        const playWebMFX = (file, x, y, opts) => playArcaneWebM(file, x, y, opts, owner);
        const darken = opacity => itemDarken(owner, opacity), flash = (dom, cls) => itemFlash(owner, dom, cls);
        const doms = teamSprites(caster);
        const rawDoms = (targets || []).map(domOf).filter(Boolean);
        const allyDoms = doms.length ? doms : rawDoms;
        const box = unionRect(allyDoms) || { x: __STAGE.w * 0.4, y: __STAGE.h * 0.72, w: 520, h: 160 };
        const forkPos = { x: box.x, y: box.y - 260 };

        darken(0.55);
        tintOverlay(owner, 'radial-gradient(ellipse at 50% 60%, rgba(14,116,144,0.34) 0%, rgba(15,23,42,0.58) 72%, rgba(2,6,23,0.82) 100%)', 2300, 0.78);
        playSfxSample('forkHum', 0.08, { volume: 0.85, fadeOut: 0.5 });
        playSfxSample('bowlClear', 0.82, { volume: 0.72, fadeOut: 0.6 });

        const propWrap = fsLayer(`<div class="arcane-fs-anchor" style="left:${forkPos.x}px; top:${forkPos.y}px; width:260px; height:240px;">${mkTuningForkGroupSvg(uid, 'harmony')}</div>`, 2250);
        const propEl = propWrap.firstElementChild;
        owner.anim(propEl, [
            { transform: 'translate(-50%, -50%) scale(0.55)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.14 },
            { transform: 'translate(-50%, -50%) scale(1.06)', opacity: 1, offset: 0.86 },
            { transform: 'translate(-50%, -50%) scale(0.85)', opacity: 0 }
        ], { duration: 2150, fill: 'both' });

        after(120, () => {
            if (token !== combatToken) return;
            propEl.style.animation = 'arcane-fork-hum 0.11s linear infinite';
            burst(16, () => { const a = rnd(0, 6.283), s = rnd(1.5, 4); return { x: forkPos.x + 18, y: forkPos.y - 45, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.93, decay: 0.04, size: rnd(10, 18), shape: 'gradOrb', core: '#ffffff', mid: '#7dd3fc', outer: 'rgba(14,165,233,0.12)' }; });
            addP({ x: forkPos.x + 16, y: forkPos.y - 42, shape: 'gradFlare', rx: 64, ry: 12, decay: 0.06, core: '#fff', mid: '#bae6fd', outer: 'rgba(56,189,248,0.1)' });
        });

        // 蓄势阶段聚拢光尘与双道青银音律涟漪
        const cId = every(90, () => {
            if (token !== combatToken) return;
            allyDoms.forEach(d => {
                const c = visualCtr(d), ang = rnd(0, 6.283), rad = rnd(58, 92);
                addP({ x: c.x + Math.cos(ang) * rad, y: c.y + Math.sin(ang) * rad, vx: -Math.cos(ang) * 2.4, vy: -Math.sin(ang) * 2.2 - 0.5, drag: 0.96, decay: 0.04, size: rnd(6, 12), shape: 'gradOrb', core: '#ffffff', mid: '#38bdf8', outer: 'rgba(186,230,253,0.08)' });
            });
        });
        after(820, () => stopEvery(cId));

        after(900, () => {
            if (token !== combatToken) return;
            shake('light');
            addP({ x: box.x, y: box.y + 12, shape: 'gradRing', sy: 0.36, r0: 45, r1: 380, decay: 0.025, color: 'rgba(186,230,253,0.28)', edge: 'rgba(224,242,254,0.58)' });
            playWebMFX('vfx_harmony_ripple.webm', box.x, box.y + 18, { width: Math.max(540, box.w * 1.15), height: 210, opacity: 0.94, blend: 'screen', durMs: 1450 });
            allyDoms.forEach((d, idx) => {
                const c = visualCtr(d), rw = Math.max(82, c.w * 1.15), rh = Math.max(38, c.h * 0.42);
                const halo = fsLayer(`<div class="arcane-fs-anchor" style="left:${c.x}px; top:${c.bottom - 6}px; width:${rw}px; height:${rh}px; border-radius:50%; background:radial-gradient(ellipse at 50% 50%, transparent 48%, rgba(56,189,248,0.42) 76%, rgba(186,230,253,0.55) 86%, transparent 100%); box-shadow:0 0 18px rgba(125,211,252,0.45);"></div>`, 1350);
                owner.anim(halo.firstElementChild, [{ transform: 'translate(-50%,-50%) scale(0.75)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 0.92, offset: 0.25 }, { transform: 'translate(-50%,-50%) scale(1.18)', opacity: 0 }], { duration: 1250, delay: idx * 45, fill: 'both' });
                flash(d, 'arcane-flash-heal');
                burst(14, () => ({ x: c.x + rnd(-c.w * 0.42, c.w * 0.42), y: c.y + rnd(-c.h * 0.25, c.h * 0.35), vx: rnd(-0.6, 0.6), vy: rnd(-2.4, -0.8), drag: 0.97, decay: rnd(0.018, 0.03), size: rnd(7, 14), shape: 'gradOrb', core: '#ffffff', mid: '#7dd3fc', outer: 'rgba(186,230,253,0.1)' }));
                burst(4, () => ({ x: c.x + rnd(-26, 26), y: c.y + rnd(-20, 20), vx: rnd(-0.3, 0.3), vy: rnd(-0.9, -0.3), drag: 0.99, decay: 0.018, size: rnd(26, 40), shape: 'gradMist', blend: 'screen', inner: 'rgba(125,211,252,0.26)', outer: 'rgba(14,116,144,0.08)' }));
            });
        });

        after(1950, () => darken(0));
        handle.dispel = tDom => {
            if (owner.cancelled || owner.finished || token !== combatToken || !tDom) return;
            const c = visualCtr(tDom);
            playSfxSample('bellPing', 0, { volume:0.72, pan:Math.max(-0.8, Math.min(0.8, (c.x / __STAGE.w - 0.5) * 1.4)) });
            addP({ x:c.x, y:c.y, shape:'gradRing', r0:14, r1:92, decay:0.04, color:'rgba(224,242,254,0.6)', edge:'#fff' });
            addP({ x:c.x, y:c.y, shape:'gradFlare', rx:78, ry:14, decay:0.05, core:'#ffffff', mid:'#bae6fd', outer:'rgba(56,189,248,0.12)' });
            burst(18, () => ({ x:c.x + rnd(-24,24), y:c.y + rnd(-12,24), vx:rnd(-1.2,1.2), vy:rnd(-3.2,-1), drag:0.95, decay:rnd(0.025,0.045), size:rnd(8,16), shape:'gradOrb', core:'#ffffff', mid:'#e0f2fe', outer:'rgba(56,189,248,0.1)' }));
        };
        return handle;
    }

    function playSilenceDomain(caster, targets) {
        const token = combatToken, uid = ++S.uid;
        const owner = itemSkillRun(2400), handle = owner.handle;
        const after = owner.at, every = owner.every, fsLayer = (markup, ms) => skillLayer(owner, markup, ms);
        const addP = p => owner.addP(Object.assign({ itemFx:true }, p)), burst = (n, fn) => { for (let i = 0; i < n; i++) addP(fn(i)); };
        const playSfxSample = (key, delay, opts) => playItemSample(owner, key, delay, opts);
        const playWebMFX = (file, x, y, opts) => playArcaneWebM(file, x, y, opts, owner);
        const darken = opacity => itemDarken(owner, opacity), flash = (dom, cls) => itemFlash(owner, dom, cls);
        const eDoms = (targets || []).map(domOf).filter(Boolean);
        const fallbackDoms = enemiesData.filter(e => e.isAlive).map(domOf).filter(Boolean);
        const activeDoms = eDoms.length ? eDoms : fallbackDoms;
        const box = unionRect(activeDoms) || { x: __STAGE.w * 0.52, y: __STAGE.h * 0.34, w: 540, h: 180 };
        const forkPos = { x: box.x, y: Math.max(96, box.y - 68) };

        darken(0.70);
        tintOverlay(owner, 'radial-gradient(ellipse at 50% 35%, rgba(76,29,149,0.44) 0%, rgba(30,27,75,0.68) 65%, rgba(5,5,18,0.9) 100%)', 2400, 0.85);
        playSfxSample('bowlBronze', 0.04, { volume: 0.82, rate: 0.88, durCap: 0.82, fadeOut: 0.12 });
        playSfxSample('forkMute', 0.84, { volume: 0.85 });
        playSfxSample('sd_ring_blast', 0.95, { volume: 0.82 });

        const propWrap = fsLayer(`<div class="arcane-fs-anchor" style="left:${forkPos.x}px; top:${forkPos.y}px; width:240px; height:220px;">${mkTuningForkGroupSvg(uid, 'silence')}</div>`, 2250);
        const propEl = propWrap.firstElementChild;
        owner.anim(propEl, [
            { transform: 'translate(-50%, -50%) rotate(180deg) scale(0.55)', opacity: 0 },
            { transform: 'translate(-50%, -50%) rotate(180deg) scale(1)', opacity: 0.98, offset: 0.16 },
            { transform: 'translate(-50%, -50%) rotate(180deg) scale(1.04)', opacity: 0.96, offset: 0.84 },
            { transform: 'translate(-50%, -50%) rotate(180deg) scale(0.9)', opacity: 0 }
        ], { duration: 2150, fill: 'both' });

        // 0-840ms 低频压迫向心收缩；840ms 触发 110ms 绝对静默骤停反差
        const sId = every(75, () => {
            if (token !== combatToken) return;
            const ang = rnd(0, 6.283), rx = rnd(140, 290), ry = rnd(60, 120);
            addP({ x: box.x + Math.cos(ang) * rx, y: box.y + Math.sin(ang) * ry, vx: -Math.cos(ang) * 3.8, vy: -Math.sin(ang) * 1.9, drag: 0.96, decay: 0.045, size: rnd(18, 30), shape: 'gradMist', blend: 'source-over', inner: 'rgba(109,40,217,0.38)', outer: 'rgba(30,27,75,0.12)' });
        });
        after(830, () => {
            stopEvery(sId);
            if (token !== combatToken) return;
            propEl.style.animation = 'none';
            fxEngine.hitStop = 105; // 110ms "绝对静默" 定帧
        });

        after(950, () => {
            if (token !== combatToken) return;
            shake('heavy');
            playWebMFX('vfx_silence_ripple.webm', box.x, box.y + 38, { width: Math.max(620, box.w * 1.25), height: 220, opacity: 0.96, blend: 'screen', durMs: 1450 });
            playWebMFX('vfx_silence_crack.webm', box.x, box.y + 28, { width: Math.max(480, box.w * 0.95), height: 210, opacity: 0.58, blend: 'screen', durMs: 1350 });
            addP({ x: box.x, y: box.y + 24, shape: 'gradRing', sy: 0.42, r0: 36, r1: 380, decay: 0.022, color: 'rgba(139,92,246,0.32)', edge: 'rgba(221,214,254,0.52)' });
            activeDoms.forEach(d => {
                const c = visualCtr(d);
                flash(d, 'arcane-flash-silence');
                burst(8, () => ({ x: c.x + rnd(-22, 22), y: c.y + rnd(-16, 20), vx: rnd(-1.4, 1.4), vy: rnd(-0.8, 0.8), drag: 0.95, decay: 0.02, size: rnd(26, 44), shape: 'gradMist', blend: 'source-over', inner: 'rgba(91,33,182,0.42)', outer: 'rgba(17,24,39,0.14)' }));
                burst(6, () => ({ x: c.x + rnd(-18, 18), y: c.y + rnd(-18, 18), vx: rnd(-1.6, 1.6), vy: rnd(-1.6, 1.6), drag: 0.92, decay: 0.032, size: rnd(5, 10), shape: 'gradOrb', core: '#f5f3ff', mid: '#8b5cf6', outer: 'rgba(76,29,149,0.14)' }));
            });
        });

        after(2020, () => darken(0));
        return handle;
    }

    function playShatterResonance(caster, targets) {
        const token = combatToken, uid = ++S.uid;
        const owner = itemSkillRun(2500), handle = owner.handle;
        const after = owner.at, every = owner.every, fsLayer = (markup, ms) => skillLayer(owner, markup, ms);
        const addP = p => owner.addP(Object.assign({ itemFx:true }, p)), burst = (n, fn) => { for (let i = 0; i < n; i++) addP(fn(i)); };
        const playSfxSample = (key, delay, opts) => playItemSample(owner, key, delay, opts);
        const playWebMFX = (file, x, y, opts) => playArcaneWebM(file, x, y, opts, owner);
        const darken = opacity => itemDarken(owner, opacity), flash = (dom, cls) => itemFlash(owner, dom, cls);
        const eDoms = (targets || []).map(domOf).filter(Boolean);
        const activeDoms = eDoms.length ? eDoms : enemiesData.filter(e => e.isAlive).map(domOf).filter(Boolean);
        const box = unionRect(activeDoms) || { x: __STAGE.w * 0.52, y: __STAGE.h * 0.34, w: 540, h: 180 };
        const forkPos = { x: box.x, y: Math.max(120, box.y - 30) };

        darken(0.70);
        tintOverlay(owner, 'radial-gradient(ellipse at 50% 35%, rgba(14,165,233,0.22) 0%, rgba(15,23,42,0.72) 64%, rgba(2,6,23,0.92) 100%)', 2500, 0.84);
        // 三连音叉高频递进起振 + 爆破音
        [0, 270, 540].forEach((ms, idx) => {
            after(ms, () => {
                if (token !== combatToken) return;
                playSfxSample('fork432', 0, { volume: 0.65 + idx * 0.1, rate: 0.95 + idx * 0.19, durCap: 0.85, fadeOut: 0.25 });
                addP({ x: box.x, y: box.y, shape: 'gradOrb', size: 22 + idx * 14, decay: 0.08, core: '#fff', mid: '#bae6fd', outer: 'rgba(56,189,248,0.18)' });
                burst(10 + idx * 6, () => { const a = rnd(0, 6.283), r = rnd(95, 165); return { x: box.x + Math.cos(a) * r, y: box.y + Math.sin(a) * r * 0.65, vx: -Math.cos(a) * (4 + idx), vy: -Math.sin(a) * (2.6 + idx * 0.7), drag: 0.94, decay: 0.08, size: rnd(6, 12), shape: 'gradOrb', core: '#ffffff', mid: '#7dd3fc', outer: 'rgba(14,165,233,0.1)' }; });
            });
        });
        playSfxSample('sd_shatter_blast', 0.95, { volume: 0.9 });

        const propWrap = fsLayer(`<div class="arcane-fs-anchor" style="left:${forkPos.x}px; top:${forkPos.y}px; width:250px; height:230px;">${mkTuningForkGroupSvg(uid, 'shatter')}</div>`, 1900);
        const propEl = propWrap.firstElementChild;
        owner.anim(propEl, [
            { transform: 'translate(-50%, -50%) scale(0.65)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1.06)', opacity: 1, offset: 0.18 },
            { transform: 'translate(-50%, -50%) scale(1.18)', opacity: 1, offset: 0.56 },
            { transform: 'translate(-50%, -50%) scale(1.45)', opacity: 0 }
        ], { duration: 1080, fill: 'both' });
        after(300, () => { if (token === combatToken) propEl.style.animation = 'arcane-fork-viol 0.075s linear infinite'; });
        after(830, () => { if (token === combatToken) fxEngine.hitStop = 105; });

        after(950, () => {
            if (token !== combatToken) return;
            shake('quake');
            // 贯穿全屏的冷银过载音爆撕裂光带
            fsLayer(`<div style="position:absolute; left:50%; top:${box.y}px; width:130vw; height:58px; transform:translate(-50%,-50%); background:linear-gradient(90deg, transparent 0%, rgba(186,230,253,0.75) 22%, #ffffff 50%, rgba(186,230,253,0.75) 78%, transparent 100%); filter:blur(2px); animation:arcane-beam-slash 0.42s ease-out both;"></div>`, 480);
            playWebMFX('vfx_shatter_arc.webm', box.x, box.y, { width: Math.max(660, box.w * 1.32), height: 320, opacity: 0.98, blend: 'screen', durMs: 950 });
            addP({ x: box.x, y: box.y + 10, shape: 'gradRing', sy: 0.44, r0: 25, r1: 420, decay: 0.028, color: 'rgba(186,230,253,0.34)', edge: 'rgba(224,242,254,0.62)' });
            addP({ x: box.x, y: box.y, shape: 'gradFlare', rx: 320, ry: 22, decay: 0.045, core: '#ffffff', mid: '#e0f2fe', outer: 'rgba(56,189,248,0.12)' });
            activeDoms.forEach((d, idx) => {
                const c = visualCtr(d);
                flash(d, 'arcane-flash-shatter');
                if (idx % 2 === 0 || idx === activeDoms.length - 1) {
                    playWebMFX('vfx_shatter_spark.webm', c.x, c.y, { width: 220, height: 220, opacity: 0.95, blend: 'screen', delayMs: idx * 35, durMs: 620 });
                }
                burst(14, () => { const an = rnd(0, 6.283), sp = rnd(3, 10.5); return { x: c.x, y: c.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 1, grav: 0.16, drag: 0.93, decay: rnd(0.025, 0.048), size: rnd(6, 13), shape: 'gradOrb', core: '#ffffff', mid: '#bae6fd', outer: 'rgba(14,165,233,0.12)' }; });
                burst(7, () => { const an = rnd(0, 6.283), sp = rnd(2.2, 7.5); return { x: c.x, y: c.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 1.5, grav: 0.22, drag: 0.95, rot: rnd(0, 6.28), vr: rnd(-0.22, 0.22), decay: 0.032, size: rnd(5, 9), shape: 'shard', fill: 'rgba(148,163,184,0.35)', color: '#e0f2fe' }; });
            });
        });

        after(2050, () => darken(0));
        handle.hit = targetOrType => {
            const tDom = typeof targetOrType === 'string' ? activeDoms[0] : targetOrType;
            if (owner.cancelled || owner.finished || token !== combatToken || !tDom) return;
            const c = visualCtr(tDom);
            addP({ x:c.x, y:c.y, shape:'gradFlare', rx:95, ry:18, decay:0.06, core:'#ffffff', mid:'#bae6fd', outer:'rgba(56,189,248,0.15)' });
            burst(12, () => { const a = rnd(0,6.283), s = rnd(3,8); return { x:c.x, y:c.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, drag:0.93, decay:0.04, size:rnd(5,11), shape:'gradOrb', core:'#fff', mid:'#7dd3fc', outer:'rgba(14,165,233,0.1)' }; });
        };
        return handle;
    }

    // ===== ② 【奇异海螺】L2+ 敌阵全域致盲 (1600ms / 500ms 爆发声波) =====
    function playStrangeConch(caster, targets) {
        const token = combatToken, uid = ++S.uid;
        const rawDoms = (targets || []).map(domOf).filter(Boolean);
        const box = unionRect(rawDoms); if (!box) return null;
        const owner = fixedItemSkillRun(1600);
        const after = owner.at, fsLayer = (markup, ms) => skillLayer(owner, markup, ms);
        const addP = p => owner.addP(Object.assign({ itemFx:true, inner:p.mistCore }, p)), burst = (n, fn) => { for (let i = 0; i < n; i++) addP(fn(i)); };
        const playSfxSample = (key, delay, opts) => playItemSample(owner, key, delay, opts);
        const playWebMFX = (file, x, y, opts) => playArcaneWebM(file, x, y, opts, owner);
        const darken = opacity => itemDarken(owner, opacity), flash = (dom, cls) => flashOwned(owner, dom, cls);
        const orbitCharge = (c, n, dur, mk, rx, ry, shrink) => orbitItemCharge(owner, c, n, dur, mk, rx, ry, shrink);
        const flyBezier = (a, ctrl, b, dur, draw, done, ease) => flyItemBezier(owner, a, ctrl, b, dur, draw, done, ease);
        const conchPt = { x: box.x, y: Math.max(92, box.t + box.h * 0.24) };

        darken(0.56);
        tintOverlay(owner, `radial-gradient(ellipse at ${Math.round(box.x)}px ${Math.round(box.y)}px, rgba(10,18,42,0.72) 0%, rgba(15,23,42,0.84) 64%, rgba(2,6,23,0.92) 100%)`, 1600, 0.86);
        playSfxSample('conchCharge', 0.02, { volume: 0.62, fadeOut: 0.25 });
        playSfxSample('conchMist', 0.85, { volume: 0.62, durCap: 0.85, fadeOut: 0.32 });
        playSfxSample('mx_stygian_whoosh', 0.88, { volume: 0.50, offset: 0.1, durCap: 0.80, fadeOut: 0.32 });

        const conchHtml = `<div class="arcane-fs-anchor" style="left:${conchPt.x}px; top:${conchPt.y}px; width:156px; height:156px;">
          <svg viewBox="0 0 160 160" class="w-full h-full overflow-visible">
            <defs>
              <radialGradient id="cn-halo-${uid}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.58"/><stop offset="48%" stop-color="#7c3aed" stop-opacity="0.26"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0"/></radialGradient>
              <linearGradient id="cn-shell-${uid}" x1="15%" y1="10%" x2="88%" y2="90%"><stop offset="0%" stop-color="#fde68a"/><stop offset="32%" stop-color="#b45309"/><stop offset="68%" stop-color="#6d28d9"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>
              <radialGradient id="cn-pearl-${uid}" cx="42%" cy="42%" r="55%"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="45%" stop-color="#67e8f9"/><stop offset="85%" stop-color="#6d28d9"/><stop offset="100%" stop-color="#1e1b4b"/></radialGradient>
              <filter id="cn-glow-${uid}" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <circle cx="80" cy="80" r="74" fill="url(#cn-halo-${uid})"/>
            <path d="M80,22 C112,24 134,48 128,80 C122,114 94,132 62,126 C36,120 24,96 32,70 C40,46 66,34 90,46 C108,56 112,78 98,94 C86,108 66,104 60,88" fill="url(#cn-shell-${uid})" stroke="#67e8f9" stroke-width="2" opacity="0.94" filter="url(#cn-glow-${uid})"/>
            <ellipse cx="62" cy="86" rx="22" ry="16" fill="url(#cn-pearl-${uid})" opacity="0.9"/>
            <path d="M46,66 Q76,42 110,64 M42,84 Q78,64 116,86" fill="none" stroke="#bae6fd" stroke-width="1.3" opacity="0.65"/>
          </svg></div>`;
        const cLayer = fsLayer(conchHtml, 1080);
        if (cLayer.firstElementChild && cLayer.firstElementChild.animate) owner.anim(cLayer.firstElementChild, [
            { transform: 'translate(-50%,-50%) scale(0.32) rotate(-14deg)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(1.06) rotate(4deg)', opacity: 0.98, offset: 0.38 },
            { transform: 'translate(-50%,-50%) scale(0.9) rotate(0deg)', opacity: 0.96, offset: 0.48 },
            { transform: 'translate(-50%,-50%) scale(1.18) rotate(3deg)', opacity: 0.92, offset: 0.56 },
            { transform: 'translate(-50%,-50%) scale(0.85)', opacity: 0 }
        ], { duration: 1020, fill: 'both' });
        playWebMFX('vfx_conch_vortex.webm', conchPt.x, conchPt.y, { width: 196, height: 184, opacity: 0.88, blend: 'screen', durMs: 650 });
        orbitCharge(conchPt, 28, 420, o => ({ size: rnd(4, 9), shape: 'gradOrb', core: '#e0f2fe', mid: o.k < 0.5 ? '#22d3ee' : '#a855f7', outer: 'rgba(109,40,217,0.16)' }), 78, 60, 0.85);

        
        after(500, () => {
            if (token !== combatToken) return;
            shake('heavy');
            const ringW = Math.max(460, Math.round(box.w * 1.18));
            playWebMFX('vfx_conch_abyss.webm', box.x, box.y, { width: ringW, height: Math.round(ringW * 0.42), opacity: 0.84, blend: 'screen', durMs: 720 });
            [0, 95, 190].forEach((delayMs, idx) => {
                after(delayMs, () => {
                    if (token !== combatToken) return;
                    addP({ x: box.x, y: box.y, shape: 'gradRing', sy: 0.44, r0: 28, r1: Math.round(ringW * (0.48 + idx * 0.08)), decay: 0.028, color: idx % 2 ? 'rgba(168,85,247,0.34)' : 'rgba(34,211,238,0.34)', edge: idx % 2 ? 'rgba(233,213,255,0.72)' : 'rgba(165,243,252,0.72)' });
                    if (idx === 0) playWebMFX('vfx_conch_ripple.webm', box.x, box.y + 12, { width: Math.round(ringW * 0.82), height: Math.round(ringW * 0.42), opacity: 0.9, blend: 'screen', durMs: 560 });
                });
            });
            burst(34, () => { const a = rnd(0, 6.283), sp = rnd(2.2, 8.2); return { x: conchPt.x, y: conchPt.y, vx: Math.cos(a)*sp*1.25, vy: Math.sin(a)*sp*0.65, drag: 0.94, decay: rnd(0.022, 0.042), size: rnd(5, 11), shape: 'gradOrb', core: '#f0f9ff', mid: pick(['#22d3ee', '#a855f7', '#67e8f9']), outer: 'rgba(67,56,202,0.14)' }; });

            rawDoms.forEach((tDom, ti) => {
                after(80 + ti * 35, () => {
                    if (token !== combatToken) return;
                    const r = entityVisualRect(tDom); if (!r) return;
                    const eyeY = r.top + r.h * 0.36;
                    flash(tDom, 'arcane-flash-silence');
                    const fogW = Math.max(76, Math.round(r.w * 0.95));
                    fsLayer(`<div class="arcane-fs-anchor" style="left:${r.x}px; top:${eyeY}px; width:${fogW}px; height:${Math.round(fogW*0.65)}px;">
                      <svg viewBox="0 0 100 66" class="w-full h-full overflow-visible">
                        <defs>
                          <radialGradient id="cn-eye-${uid}-${ti}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(124,58,237,0.52)"/><stop offset="55%" stop-color="rgba(30,27,75,0.34)"/><stop offset="100%" stop-color="rgba(10,18,42,0)"/></radialGradient>
                          <filter id="cn-eg-${uid}-${ti}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
                        </defs>
                        <ellipse cx="50" cy="33" rx="46" ry="26" fill="url(#cn-eye-${uid}-${ti})"/>
                        <g filter="url(#cn-eg-${uid}-${ti})">
                          <ellipse cx="50" cy="33" rx="34" ry="14" fill="none" stroke="#a855f7" stroke-width="1.8" opacity="0.65"/>
                          <ellipse cx="50" cy="33" rx="22" ry="9" fill="none" stroke="#67e8f9" stroke-width="1.3" opacity="0.55"/>
                        </g>
                      </svg></div>`, 620);
                    for (let m = 0; m < 4; m++) addP({ x: r.x + rnd(-16, 16), y: eyeY + rnd(-8, 8), vx: rnd(-0.4, 0.4), vy: rnd(-0.55, 0.15), drag: 0.98, decay: 0.018, size: rnd(18, 28), shape: 'gradMist', blend: 'source-over', mistCore: 'rgba(88,28,135,0.48)', outer: 'rgba(15,23,42,0.14)' });
                    burst(5, () => ({ x: r.x + rnd(-18, 18), y: eyeY + rnd(-6, 10), vx: rnd(-0.4, 0.4), vy: rnd(-1.4, -0.5), drag: 0.97, decay: 0.026, size: rnd(3, 6), shape: 'gradOrb', core: '#e0f2fe', mid: '#38bdf8', outer: 'rgba(109,40,217,0.12)' }));
                });
            });
        });
        after(1320, () => darken(0));
        return owner.handle;
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
// ===== 抗性与免疫演出 BEGIN（v12.10 · demo-variant-resist 定稿移植，并入 arcaneVfxModule 内部） =====
// 依赖模块内既有：S / variantRun / entityVisualRect / cloneVisualOnly / domOf / ctr / panOf /
// vSample / svgGlowDef / stopEvery。音效只走 vSample(owner, 'resist_*')，不合成兜底、不依赖 demo 宿主。
// 生命周期全部挂在 variantRun owner 上（at/every/anim/layer/burst/onClean），不另起永久 rAF。

const RESIST_FX = {
    fluid: { ms: 880, kind: 'fluid', play: playResistFluid },
    phantom: { ms: 820, kind: 'phantom', play: playResistPhantom },
    antiMagic: { ms: 880, kind: 'antiMagic', play: playResistAntiMagic },
    antimagic: { ms: 880, kind: 'antiMagic', play: playResistAntiMagic },
    vital: { ms: 820, kind: 'vital', play: playResistVital },
    fireproof: { ms: 660, kind: 'fireproof', play: playResistFireproof },
    poisonproof: { ms: 680, kind: 'poisonproof', play: playResistPoisonproof },
    ironBody: { ms: 620, kind: 'ironBody', play: playResistIronBody },
    ironbody: { ms: 620, kind: 'ironBody', play: playResistIronBody },
    // 业务层 applyEnemyTypeResist 的 hits 是中文类型名，可直接作为 layers 传入。
    远程: { ms: 880, kind: 'fluid', play: playResistFluid },
    近战: { ms: 820, kind: 'phantom', play: playResistPhantom },
    法术: { ms: 880, kind: 'antiMagic', play: playResistAntiMagic },
    要害: { ms: 820, kind: 'vital', play: playResistVital }
};

// 正式 entityVisualRect 返回 dom/visualDom/isHero/x/y/w/h/left/top；这里只做轻适配。
function resistRect(entity) {
    const r = entityVisualRect(entity);
    if (!r || !r.visualDom || !(r.w > 0) || !(r.h > 0)) return null;
    return {
        dom: r.dom, visualDom: r.visualDom, isHero: r.isHero,
        left: r.left, top: r.top, width: r.w, height: r.h, cx: r.x, cy: r.y
    };
}

// demo 的 svgGlowDef 是径向梯度；正式版 svgGlowDef 是 filter，不可覆盖。
function resistRadGrad(id, stops) {
    return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join('')}</radialGradient>`;
}

function resistLayer(owner, html, z, kind) {
    const el = owner.layer(html);
    el.classList.add('arcane-resist-layer');
    el.dataset.resistFx = '1';
    el.dataset.resistKind = kind;
    el.style.zIndex = String(z);
    el.style.overflow = 'visible';
    return el;
}

// 逐帧 tween 用模块现有 every（token 守卫），结束即 stopEvery，不占永久引擎。
function resistTween(owner, dur, step) {
    const t0 = __fxNow();
    const id = owner.every(16, () => {
        const p = Math.min(1, (__fxNow() - t0) / Math.max(1, dur));
        step(p);
        if (p >= 1) { stopEvery(id); owner.intervals.delete(id); }
    });
    owner.onClean(() => stopEvery(id));
}

function resistDir(from, r) {
    const fDom = from ? domOf(from) : null;
    if (fDom) {
        const c = ctr(fDom);
        const dx = r.cx - c.x, dy = r.cy - c.y, len = Math.hypot(dx, dy) || 1;
        return { dx: dx / len, dy: dy / len };
    }
    return r.cx > (__STAGE.w || 1280) * 0.5 ? { dx: 1, dy: 0.06 } : { dx: -1, dy: 0.06 };
}

// cloneVisualOnly 正式版返回 outerHTML 字符串；只 wrap.innerHTML 后操作 firstElementChild。
function resistClone(wrap, r, css) {
    const html = cloneVisualOnly(r.dom);
    if (!html) return null;
    wrap.innerHTML = html;
    const node = wrap.firstElementChild;
    if (!node) return null;
    // 追加而非覆盖 cloneVisualOnly 已做的 transform/animation/max-width 复位。
    const visualBox = r.visualDom[__GBCR]();
    const scale = visualBox.width / (r.visualDom.offsetWidth || visualBox.width);
    node.style.cssText = node.style.cssText + ';width:100%;height:100%;font-size:' + (parseFloat(getComputedStyle(r.visualDom).fontSize) * scale) + 'px;' + css;
    return node;
}

function resistAudio(owner, key, pan, vol) {
    vSample(owner, key, { vol, pan });
}

function playResistFluid(owner, entity, r, meta, onBeat, kind) {
    const u = ++S.uid, sc = meta.scaleMul || 1;
    const { dx, dy } = resistDir(meta.from || meta.attacker, r);
    const hx = r.cx - dx * Math.min(18, r.width * 0.16), hy = r.cy - dy * Math.min(12, r.height * 0.14);
    const R = Math.max(54, Math.min(82, Math.max(r.width, r.height) * 0.72)) * sc;
    resistAudio(owner, 'resist_fluid', panOf(hx), 0.24);
    const wobHost = resistLayer(owner, '', 441, kind);
    const wob = document.createElement('div');
    wob.className = 'arcane-resist-ghost';
    wob.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:8px;`;
    resistClone(wob, r, 'filter:sepia(0.8) hue-rotate(145deg) saturate(3) brightness(1.35) drop-shadow(0 0 10px rgba(103,232,249,0.75));');
    wobHost.appendChild(wob);
    owner.anim(wob, [
        { transform: 'scale(1,1)', opacity: 0 },
        { transform: 'scale(0.88,1.12)', opacity: 0.56, offset: 0.22 },
        { transform: 'scale(1.10,0.91)', opacity: 0.46, offset: 0.54 },
        { transform: 'scale(1,1)', opacity: 0 }
    ], { duration: 640, easing: 'ease-in-out', fill: 'forwards' });
    const swirlArcs = [0, 90, 180, 270].map(deg => {
        const a0 = deg * Math.PI / 180, a1 = a0 + 1.35, x0 = 60 + Math.cos(a0) * 12, y0 = 60 + Math.sin(a0) * 12;
        const x1 = 60 + Math.cos(a1) * 48, y1 = 60 + Math.sin(a1) * 48, cx = 60 + Math.cos(a0 + 0.58) * 38, cy = 60 + Math.sin(a0 + 0.58) * 38;
        return `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}" fill="none" stroke="url(#fl-sw-${u})" stroke-width="5.6" stroke-linecap="round" opacity="0.96"/>`;
    }).join('');
    const drops = Array.from({ length: 10 }, (_, i) => {
        const ang = (i / 10) * Math.PI * 2 + (i % 2 ? 0.2 : -0.15);
        return { ang, dist: rnd(38, 54) * sc, sz: rnd(4.2, 6.2) * sc, side: i % 2 ? 1 : -1 };
    });
    const host = resistLayer(owner, `<div class="arcane-resist-anchor" style="left:${hx - R}px;top:${hy - R}px;width:${R * 2}px;height:${R * 2}px;"><svg class="arcane-resist-svg" viewBox="0 0 120 120"><defs>${resistRadGrad(`fl-pool-${u}`, [['0%', '#ffffff', 0.45], ['36%', '#67e8f9', 0.52], ['74%', '#06b6d4', 0.2], ['100%', '#0891b2', 0]])}<linearGradient id="fl-sw-${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/><stop offset="45%" stop-color="#67e8f9" stop-opacity="0.92"/><stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/></linearGradient></defs><circle cx="60" cy="60" r="49" fill="url(#fl-pool-${u})"/><circle cx="60" cy="60" r="36" fill="none" stroke="#cffafe" stroke-width="2" opacity="0.55"/><g id="fl-spin-${u}" style="transform-origin:60px 60px">${swirlArcs}</g>${drops.map((_, i) => `<circle id="fl-dr-${u}-${i}" cx="60" cy="60" r="${drops[i].sz}" fill="#ecfeff" opacity="0"/>`).join('')}</svg></div>`, 443, kind);
    const wrap = host.firstElementChild, spin = host.querySelector(`#fl-spin-${u}`);
    owner.anim(wrap, [{ transform: 'scale(0.35)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.24 }, { transform: 'scale(0.96)', opacity: 0.94, offset: 0.68 }, { transform: 'scale(0.18)', opacity: 0 }], { duration: 820, easing: 'cubic-bezier(0.22,0.72,0.28,1)', fill: 'forwards' });
    owner.anim(spin, [{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(-175deg) scale(0.86)', offset: 0.45 }, { transform: 'rotate(-320deg) scale(1.02)' }], { duration: 800, easing: 'ease-in-out', fill: 'forwards' });
    resistTween(owner, 760, p => {
        const outP = p < 0.46 ? Math.sin((p / 0.46) * Math.PI * 0.5) : Math.cos(((p - 0.46) / 0.54) * Math.PI * 0.5);
        const op = p < 0.14 ? p / 0.14 : (p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 0.96);
        drops.forEach((d, i) => {
            const el = host.querySelector(`#fl-dr-${u}-${i}`);
            if (!el) return;
            const sw = d.ang + (p < 0.46 ? p * 1.15 : p * 2.25) * d.side;
            const rad = d.dist * Math.max(0, outP);
            el.setAttribute('cx', (60 + Math.cos(sw) * rad).toFixed(1));
            el.setAttribute('cy', (60 + Math.sin(sw) * rad).toFixed(1));
            el.setAttribute('opacity', op.toFixed(2));
        });
    });
    owner.burst(12, i => { const a = (i / 12) * Math.PI * 2; return { x: hx, y: hy, vx: Math.cos(a) * rnd(2.2, 4.2), vy: Math.sin(a) * rnd(2.2, 4.2), drag: 0.91, decay: 0.035, size: rnd(3.5, 6.2) * sc, shape: 'droplet', color: pick(['#a5f3fc', '#67e8f9', '#22d3ee']), hiColor: '#ffffff' }; });
    owner.at(170, () => {
        owner.burst(1, () => ({ x: hx, y: hy, shape: 'gradRing', size: 1.35 * sc, vr: 2.6, decay: 0.05, color: '#a5f3fc' }));
        if (onBeat) onBeat('resist', { type: 'fluid', at: 170 });
    });
}

function playResistPhantom(owner, entity, r, meta, onBeat, kind) {
    const u = ++S.uid, sc = meta.scaleMul || 1;
    const { dx, dy } = resistDir(meta.from || meta.attacker, r);
    const sx = dx * Math.max(30, Math.min(44, r.width * 0.40)) * sc, sy = dy * Math.max(10, Math.min(18, r.height * 0.18)) * sc;
    resistAudio(owner, 'resist_phantom', panOf(r.cx), 0.26);
    const ghostHost = resistLayer(owner, '', 441, kind);
    const wrap = document.createElement('div');
    wrap.className = 'arcane-resist-ghost';
    wrap.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:8px;`;
    resistClone(wrap, r, 'filter:sepia(1) hue-rotate(175deg) saturate(4.2) brightness(1.08) drop-shadow(0 0 12px rgba(56,189,248,0.88));box-shadow:none;');
    ghostHost.appendChild(wrap);
    const slashLayer = resistLayer(owner, `<div class="arcane-resist-anchor" style="left:${r.cx - 84}px;top:${r.cy - 50}px;width:168px;height:100px;"><svg class="arcane-resist-svg" viewBox="0 0 168 100"><defs><linearGradient id="ph-sl-${u}" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0%" stop-color="#818cf8" stop-opacity="0"/><stop offset="46%" stop-color="#ffffff" stop-opacity="0.98"/><stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs><path d="M12,78 Q84,12 156,28 Q86,36 12,84 Z" fill="url(#ph-sl-${u})"/><path d="M22,88 Q88,26 146,40" fill="none" stroke="url(#ph-sl-${u})" stroke-width="2.4" stroke-linecap="round"/></svg></div>`, 445, kind);
    owner.anim(wrap, [
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 0 },
        { transform: `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) scale(1.06)`, opacity: 0.64, offset: 0.2 },
        { transform: `translate3d(${(sx * 1.12).toFixed(1)}px,${(sy * 1.1).toFixed(1)}px,0) scale(1.06)`, opacity: 0.60, offset: 0.62 },
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 0 }
    ], { duration: 760, easing: 'cubic-bezier(0.2,0.8,0.25,1)', fill: 'forwards' });
    owner.anim(slashLayer.firstElementChild, [
        { transform: `translate3d(${(-dx * 16).toFixed(1)}px,${(-dy * 10).toFixed(1)}px,0) scaleX(0.6)`, opacity: 0 },
        { transform: `translate3d(${(sx * 0.95).toFixed(1)}px,${(sy * 0.95).toFixed(1)}px,0) scaleX(1.12)`, opacity: 1, offset: 0.34 },
        { transform: `translate3d(${(sx * 1.45).toFixed(1)}px,${(sy * 1.45).toFixed(1)}px,0) scaleX(1.22)`, opacity: 0 }
    ], { duration: 420, easing: 'ease-out', fill: 'forwards' });
    owner.burst(14, () => ({ x: r.cx + sx * 0.75 + rnd(-14, 14), y: r.cy + sy * 0.5 + rnd(-16, 16), vx: dx * rnd(0.9, 2.8), vy: rnd(-0.9, 0.9), drag: 0.93, decay: 0.036, size: rnd(7, 13) * sc, shape: 'glowOrb', color: pick(['#c4b5fd', '#67e8f9', '#818cf8']) }));
    owner.at(160, () => { if (onBeat) onBeat('resist', { type: 'phantom', at: 160 }); });
}

function playResistAntiMagic(owner, entity, r, meta, onBeat, kind) {
    const u = ++S.uid, sc = meta.scaleMul || 1;
    const col = meta.spellColor || '#a855f7';
    const R = Math.max(54, Math.min(82, Math.max(r.width, r.height) * 0.74)) * sc;
    resistAudio(owner, 'resist_antimagic', panOf(r.cx), 0.24);
    const peelPaths = Array.from({ length: 6 }, (_, i) => {
        const a0 = (i / 6) * Math.PI * 2 + 0.25, a1 = a0 - 1.05;
        const x0 = 60 + Math.cos(a0) * 14, y0 = 60 + Math.sin(a0) * 14;
        const cx = 60 + Math.cos(a0 - 0.42) * 44, cy = 60 + Math.sin(a0 - 0.42) * 44;
        const x1 = 60 + Math.cos(a1) * 58, y1 = 60 + Math.sin(a1) * 58;
        return `<path class="am-fil-${u}" d="M${x0.toFixed(1)},${y0.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}" fill="none" stroke="url(#am-g-${u})" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="32 52"/>`;
    }).join('');
    const host = resistLayer(owner, `<div class="arcane-resist-anchor" style="left:${r.cx - R}px;top:${r.cy - R}px;width:${R * 2}px;height:${R * 2}px;"><svg class="arcane-resist-svg" viewBox="0 0 120 120"><defs>${resistRadGrad(`am-core-${u}`, [['0%', '#ffffff', 0.96], ['38%', col, 0.78], ['76%', col, 0.18], ['100%', col, 0]])}<linearGradient id="am-g-${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="1"/><stop offset="42%" stop-color="${col}" stop-opacity="0.96"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><g id="am-r1-${u}" style="transform-origin:60px 60px"><circle cx="60" cy="60" r="38" fill="none" stroke="url(#am-g-${u})" stroke-width="4" stroke-dasharray="32 16 18 18" stroke-linecap="round"/></g><g id="am-r2-${u}" style="transform-origin:60px 60px"><circle cx="60" cy="60" r="25" fill="none" stroke="#f8fafc" stroke-width="2.4" stroke-dasharray="22 14" stroke-linecap="round" opacity="0.88"/></g><g id="am-peel-${u}">${peelPaths}</g><circle id="am-sink-${u}" cx="60" cy="60" r="20" fill="url(#am-core-${u})" style="transform-origin:60px 60px"/></svg></div>`, 443, kind);
    const r1 = host.querySelector(`#am-r1-${u}`), r2 = host.querySelector(`#am-r2-${u}`), sink = host.querySelector(`#am-sink-${u}`);
    owner.anim(r1, [{ transform: 'rotate(0deg) scale(0.45)', opacity: 0 }, { transform: 'rotate(-100deg) scale(1.08)', opacity: 0.98, offset: 0.28 }, { transform: 'rotate(-220deg) scale(1.18)', opacity: 0 }], { duration: 820, easing: 'ease-out', fill: 'forwards' });
    owner.anim(r2, [{ transform: 'rotate(0deg) scale(0.45)', opacity: 0 }, { transform: 'rotate(95deg) scale(1.04)', opacity: 0.92, offset: 0.3 }, { transform: 'rotate(205deg) scale(0.9)', opacity: 0 }], { duration: 780, easing: 'ease-out', fill: 'forwards' });
    owner.anim(sink, [{ transform: 'scale(1.18)', opacity: 0.98 }, { transform: 'scale(0.88)', opacity: 0.86, offset: 0.38 }, { transform: 'scale(0.16)', opacity: 0 }], { duration: 540, easing: 'ease-in', fill: 'forwards' });
    resistTween(owner, 760, p => {
        const off = (-p * 84).toFixed(1), op = (p < 0.16 ? p / 0.16 : Math.max(0, 1 - (p - 0.16) / 0.84)).toFixed(2);
        host.querySelectorAll(`.am-fil-${u}`).forEach(el => { el.setAttribute('stroke-dashoffset', off); el.setAttribute('opacity', op); });
    });
    owner.burst(16, i => { const a = (i / 16) * Math.PI * 2; return { x: r.cx, y: r.cy, vx: Math.cos(a) * rnd(2.4, 4.8), vy: Math.sin(a) * rnd(2.4, 4.8), drag: 0.91, decay: 0.035, size: rnd(2.2, 3.6) * sc, shape: 'spark', color: i % 2 === 0 ? '#ffffff' : col }; });
    owner.at(180, () => {
        owner.burst(1, () => ({ x: r.cx, y: r.cy, shape: 'bloom', size: 22 * sc, decay: 0.075, color: col }));
        if (onBeat) onBeat('resist', { type: 'antiMagic', at: 180 });
    });
}

function playResistVital(owner, entity, r, meta, onBeat, kind) {
    const u = ++S.uid, sc = meta.scaleMul || 1;
    const { dx, dy } = resistDir(meta.from || meta.attacker, r);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    resistAudio(owner, 'resist_vital', panOf(r.cx), 0.24);
    const clampHost = resistLayer(owner, '', 441, kind);
    const sil = document.createElement('div');
    sil.className = 'arcane-resist-ghost';
    sil.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:8px;`;
    resistClone(sil, r, 'filter:sepia(0.9) hue-rotate(12deg) saturate(2.5) brightness(1.22) drop-shadow(0 0 10px rgba(250,204,21,0.8));');
    clampHost.appendChild(sil);
    owner.anim(sil, [{ transform: 'scale(1.08)', opacity: 0 }, { transform: 'scale(0.88)', opacity: 0.54, offset: 0.25 }, { transform: 'scale(0.90)', opacity: 0.42, offset: 0.62 }, { transform: 'scale(1)', opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' });
    const R = Math.max(50, Math.min(78, Math.max(r.width, r.height) * 0.72)) * sc;
    const svgHost = resistLayer(owner, `<div class="arcane-resist-anchor" style="left:${r.cx - R}px;top:${r.cy - R}px;width:${R * 2}px;height:${R * 2}px;"><svg class="arcane-resist-svg" viewBox="0 0 120 120"><defs><linearGradient id="vt-arc-${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef08a" stop-opacity="0"/><stop offset="50%" stop-color="#fbbf24" stop-opacity="0.96"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/></linearGradient><linearGradient id="vt-div-${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.96"/><stop offset="52%" stop-color="#fbbf24" stop-opacity="0.88"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/></linearGradient></defs><g id="vt-ring-${u}" style="transform-origin:60px 60px"><path d="M22,36 A42,42 0 0,1 98,36" fill="none" stroke="url(#vt-arc-${u})" stroke-width="4.5" stroke-linecap="round"/><path d="M22,84 A42,42 0 0,0 98,84" fill="none" stroke="url(#vt-arc-${u})" stroke-width="4.5" stroke-linecap="round"/><path d="M18,44 A45,45 0 0,0 18,76" fill="none" stroke="url(#vt-arc-${u})" stroke-width="3.6" stroke-linecap="round"/><path d="M102,44 A45,45 0 0,1 102,76" fill="none" stroke="url(#vt-arc-${u})" stroke-width="3.6" stroke-linecap="round"/></g><g id="vt-flow-${u}" style="transform-origin:60px 60px"><path d="M22,60 C38,44 64,20 98,16" fill="none" stroke="url(#vt-div-${u})" stroke-width="4" stroke-linecap="round"/><path d="M22,60 C38,76 64,100 98,104" fill="none" stroke="url(#vt-div-${u})" stroke-width="4" stroke-linecap="round"/></g></svg></div>`, 444, kind);
    const ringEl = svgHost.querySelector(`#vt-ring-${u}`), flowEl = svgHost.querySelector(`#vt-flow-${u}`);
    owner.anim(ringEl, [{ transform: 'scale(1.26)', opacity: 0 }, { transform: 'scale(0.86)', opacity: 0.98, offset: 0.28 }, { transform: 'scale(0.94)', opacity: 0.78, offset: 0.66 }, { transform: 'scale(1.06)', opacity: 0 }], { duration: 760, easing: 'cubic-bezier(0.22,0.8,0.28,1)', fill: 'forwards' });
    owner.anim(flowEl, [{ transform: `rotate(${ang.toFixed(1)}deg) translateX(-10px) scale(0.75)`, opacity: 0 }, { transform: `rotate(${ang.toFixed(1)}deg) translateX(2px) scale(1.02)`, opacity: 0.96, offset: 0.36 }, { transform: `rotate(${ang.toFixed(1)}deg) translateX(16px) scale(1.1)`, opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' });
    const perpX = -dy, perpY = dx;
    owner.burst(14, i => { const s = i % 2 ? 1 : -1; return { x: r.cx - dx * 16, y: r.cy - dy * 16, vx: dx * rnd(1.5, 2.8) + perpX * s * rnd(2.0, 3.8), vy: dy * rnd(1.5, 2.8) + perpY * s * rnd(2.0, 3.8), drag: 0.92, decay: 0.036, size: rnd(2.2, 3.4) * sc, shape: 'spark', color: pick(['#fef08a', '#38bdf8', '#fbbf24']) }; });
    owner.at(180, () => { if (onBeat) onBeat('resist', { type: 'vital', at: 180 }); });
}

function playResistFireproof(owner, entity, r, meta, onBeat, kind) {
    const u = ++S.uid, sc = meta.scaleMul || 1;
    const { dx, dy } = resistDir(meta.from || meta.attacker, r);
    const sx = r.cx - dx * Math.min(26, r.width * 0.28), sy = r.cy - dy * Math.min(18, r.height * 0.2);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    resistAudio(owner, 'resist_fireproof', panOf(sx), 0.20);
    const R = Math.max(52, Math.min(74, Math.max(r.width, r.height) * 0.68)) * sc;
    const host = resistLayer(owner, `<div class="arcane-resist-anchor" style="left:${sx - R}px;top:${sy - R}px;width:${R * 2}px;height:${R * 2}px;"><svg class="arcane-resist-svg" viewBox="0 0 100 100"><defs><linearGradient id="fp-sh-${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff7ed" stop-opacity="0"/><stop offset="50%" stop-color="#fed7aa" stop-opacity="0.98"/><stop offset="100%" stop-color="#fb923c" stop-opacity="0"/></linearGradient><radialGradient id="fp-fl-${u}" cx="55%" cy="50%" r="50%"><stop offset="0%" stop-color="#fef9c3" stop-opacity="1"/><stop offset="55%" stop-color="#f97316" stop-opacity="0.9"/><stop offset="100%" stop-color="#ea580c" stop-opacity="0"/></radialGradient></defs><g transform="rotate(${ang.toFixed(1)} 50 50)"><path id="fp-flame-${u}" d="M4,50 Q24,20 46,50 Q24,80 4,50 Z" fill="url(#fp-fl-${u})" style="transform-origin:36px 50px"/><path id="fp-arc-${u}" d="M46,10 Q72,50 46,90" fill="none" stroke="url(#fp-sh-${u})" stroke-width="6.5" stroke-linecap="round"/><path id="fp-arc2-${u}" d="M54,18 Q76,50 54,82" fill="none" stroke="url(#fp-sh-${u})" stroke-width="2.6" stroke-linecap="round" opacity="0.82"/></g></svg></div>`, 445, kind);
    const fl = host.querySelector(`#fp-flame-${u}`), arc = host.querySelector(`#fp-arc-${u}`), arc2 = host.querySelector(`#fp-arc2-${u}`);
    owner.anim(fl, [{ transform: 'translateX(-16px) scale(0.45)', opacity: 0 }, { transform: 'translateX(4px) scale(1.12)', opacity: 1, offset: 0.28 }, { transform: 'translateX(-4px) scale(0.18)', opacity: 0 }], { duration: 340, easing: 'ease-out', fill: 'forwards' });
    owner.anim(arc, [{ transform: 'scale(0.68)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 0.98, offset: 0.3 }, { transform: 'scale(1.14)', opacity: 0 }], { duration: 480, easing: 'ease-out', fill: 'forwards' });
    owner.anim(arc2, [{ transform: 'scale(0.72)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 0.86, offset: 0.35 }, { transform: 'scale(1.18)', opacity: 0 }], { duration: 460, easing: 'ease-out', fill: 'forwards' });
    owner.at(140, () => {
        owner.burst(14, () => ({ x: sx + rnd(-10, 10), y: sy + rnd(-14, 14), vx: -dx * rnd(0.5, 1.8) + rnd(-0.9, 0.9), vy: rnd(-1.9, -0.5), drag: 0.94, decay: rnd(0.02, 0.036), size: rnd(5, 9) * sc, shape: 'glowOrb', blend: 'source-over', color: pick(['#e2e8f0', '#94a3b8', '#64748b']) }));
        if (onBeat) onBeat('immune', { type: 'fireproof', at: 140 });
    });
}

function playResistPoisonproof(owner, entity, r, meta, onBeat, kind) {
    const u = ++S.uid, sc = meta.scaleMul || 1;
    resistAudio(owner, 'resist_poisonproof', panOf(r.cx), 0.26);
    const R = Math.max(48, Math.min(72, Math.max(r.width, r.height) * 0.64)) * sc;
    const specs = [[-22, -16, 9], [20, -18, 7.6], [-26, 8, 9.5], [24, 6, 8.2], [0, -28, 8.2]];
    const bubbles = specs.map(([bx, by, rad], i) => `<g id="pp-b-${u}-${i}" style="transform-origin:${60 + bx}px ${60 + by}px"><circle cx="${60 + bx}" cy="${60 + by}" r="${rad}" fill="url(#pp-g-${u})"/><circle cx="${60 + bx - rad * 0.28}" cy="${60 + by - rad * 0.3}" r="${(rad * 0.28).toFixed(1)}" fill="#fdf4ff" opacity="0.95"/></g>`).join('');
    const host = resistLayer(owner, `<div class="arcane-resist-anchor" style="left:${r.cx - R}px;top:${r.cy - R}px;width:${R * 2}px;height:${R * 2}px;"><svg class="arcane-resist-svg" viewBox="0 0 120 120"><defs>${resistRadGrad(`pp-g-${u}`, [['0%', '#f5d0fe', 0.36], ['55%', '#c084fc', 0.84], ['90%', '#9333ea', 0.92], ['100%', '#581c87', 0]])}</defs>${bubbles}</svg></div>`, 445, kind);
    specs.forEach(([bx], i) => {
        const el = host.querySelector(`#pp-b-${u}-${i}`);
        owner.anim(el, [
            { transform: 'scale(0.15)', opacity: 0 },
            { transform: 'scale(1.1)', opacity: 0.98, offset: 0.32 + i * 0.02 },
            { transform: `translate3d(${(bx * 0.32).toFixed(1)}px,22px,0) scale(0.92)`, opacity: 0.88, offset: 0.56 },
            { transform: `translate3d(${(bx * 0.55).toFixed(1)}px,58px,0) scale(0.18)`, opacity: 0 }
        ], { duration: 600, delay: i * 18, easing: 'cubic-bezier(0.28,0.65,0.4,1)', fill: 'forwards' });
    });
    owner.at(210, () => {
        owner.burst(1, () => ({ x: r.cx, y: r.cy, shape: 'gradRing', size: 1.15 * sc, vr: 2.3, decay: 0.07, color: '#d8b4fe' }));
        owner.burst(11, i => ({ x: r.cx + (specs[i % 5][0]) * sc, y: r.cy + (specs[i % 5][1]) * sc, vx: rnd(-1.1, 1.1), vy: rnd(1.1, 2.6), grav: 0.18, drag: 0.96, decay: 0.032, size: rnd(3.4, 5.5) * sc, shape: 'droplet', color: pick(['#e9d5ff', '#c084fc', '#a855f7']), hiColor: '#fdf4ff' }));
        if (onBeat) onBeat('immune', { type: 'poisonproof', at: 210 });
    });
}

function playResistIronBody(owner, entity, r, meta, onBeat, kind) {
    const u = ++S.uid, sc = meta.scaleMul || 1;
    const hx = r.cx, hy = Math.max(20, r.top - 8);
    resistAudio(owner, 'resist_ironbody', panOf(hx), 0.28);
    const stars = [-24, 0, 24].map((ox, i) => {
        const cx = 60 + ox * sc, cy = 44 + (i === 1 ? -5 : 3);
        return `<g id="ib-st-${u}-${i}" style="transform-origin:${cx}px ${cy}px"><polygon class="arcane-resist-shard" id="ib-l-${u}-${i}" points="${cx},${cy - 11} ${cx + 2.5},${cy - 3} ${cx + 1},${cy + 5} ${cx - 6.5},${cy + 8.5} ${cx - 4},${cy + 1.5} ${cx - 9.5},${cy - 3}" fill="#fde047"/><polygon class="arcane-resist-shard" id="ib-r-${u}-${i}" points="${cx},${cy - 11} ${cx + 9.5},${cy - 3} ${cx + 4},${cy + 1.5} ${cx + 6.5},${cy + 8.5} ${cx},${cy + 5}" fill="#fef9c3"/></g>`;
    }).join('');
    const host = resistLayer(owner, `<div class="arcane-resist-anchor" style="left:${hx - 68}px;top:${hy - 44}px;width:136px;height:88px;"><svg class="arcane-resist-svg" viewBox="0 0 120 88" style="filter:drop-shadow(0 0 6px rgba(250,204,21,0.75))"><defs><linearGradient id="ib-gl-${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="50%" stop-color="#f8fafc" stop-opacity="1"/><stop offset="100%" stop-color="#94a3b8" stop-opacity="0"/></linearGradient></defs>${stars}<path id="ib-cut-${u}" d="M12,48 L108,36" fill="none" stroke="url(#ib-gl-${u})" stroke-width="4.4" stroke-linecap="round" opacity="0"/></svg></div>`, 446, kind);
    [-24, 0, 24].forEach((ox, i) => {
        const st = host.querySelector(`#ib-st-${u}-${i}`);
        owner.anim(st, [{ transform: 'scale(0.3) translateY(6px)', opacity: 0 }, { transform: 'scale(1.12) translateY(0)', opacity: 1, offset: 0.35 }, { transform: 'scale(1) translateY(0)', opacity: 1 }], { duration: 195, fill: 'forwards' });
        owner.at(170, () => {
            const sl = host.querySelector(`#ib-l-${u}-${i}`), sr = host.querySelector(`#ib-r-${u}-${i}`);
            owner.anim(sl, [{ transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 }, { transform: `translate(${-16 - i * 3}px,${10 + i * 3}px) rotate(-52deg) scale(0.45)`, opacity: 0 }], { duration: 340, easing: 'ease-out', fill: 'forwards' });
            owner.anim(sr, [{ transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 }, { transform: `translate(${16 + i * 3}px,${-10 + i * 3}px) rotate(56deg) scale(0.45)`, opacity: 0 }], { duration: 340, easing: 'ease-out', fill: 'forwards' });
        });
    });
    const cut = host.querySelector(`#ib-cut-${u}`);
    owner.at(165, () => {
        owner.anim(cut, [{ transform: 'scaleX(0.35)', opacity: 0 }, { transform: 'scaleX(1.1)', opacity: 1, offset: 0.3 }, { transform: 'scaleX(1.26)', opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' });
        owner.burst(1, () => ({ x: hx, y: hy, shape: 'gradRing', size: 1.05 * sc, vr: 2.6, decay: 0.08, color: '#f8fafc' }));
        owner.burst(14, () => { const a = rnd(-2.9, 0.3), sp = rnd(2.0, 4.8); return { x: hx + rnd(-22, 22), y: hy + rnd(-4, 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, grav: 0.14, drag: 0.93, decay: 0.038, size: rnd(1.8, 3.2) * sc, shape: 'spark', color: pick(['#fde047', '#ffffff', '#cbd5e1']) }; });
        if (onBeat) onBeat('immune', { type: 'ironBody', at: 170 });
    });
}

// 对外唯一入口：层选择由调用方给，不按 stateResult 猜测是否播放。
// 最多两层、顺序错峰 120ms；owner 至少 980ms，第二层结束时按尾段补齐。
function playVariantResistFx(opts = {}) {
    if (!opts || opts.outcome === 'dodge') return null;
    const entity = opts.entity || opts.target;
    const rect = resistRect(entity);
    if (!rect) return null;
    const raw = Array.isArray(opts.layers) && opts.layers.length
        ? opts.layers.slice(0, 2)
        : ((opts.kind || opts.trigger) ? [opts.kind || opts.trigger] : []);
    const picks = [];
    for (let i = 0; i < raw.length; i++) {
        const spec = RESIST_FX[raw[i]];
        if (spec) picks.push(spec);
    }
    if (!picks.length) return null;
    const meta = Object.assign({}, opts.meta, {
        incomingType: opts.incomingType,
        isAoE: !!(opts.isAoE || opts.isAoe),
        outcome: opts.outcome || 'hit',
        stateResult: opts.stateResult !== undefined ? opts.stateResult : (opts.meta && opts.meta.stateResult),
        from: opts.from || (opts.meta && opts.meta.from)
    });
    const delay = meta.delayMs || 0;
    const total = delay + Math.max(980, picks.length > 1 ? 120 + picks[1].ms : 0);
    const owner = variantRun(total, null, [entity]);
    const play = () => {
        picks[0].play(owner, entity, rect, meta, opts.onBeat, picks[0].kind);
        if (picks[1]) {
            const second = picks[1];
            owner.at(120, () => second.play(owner, entity, rect, Object.assign({}, meta, { scaleMul: 0.86 }), opts.onBeat, second.kind));
        }
    };
    if (delay) owner.at(delay, play); else play();
    return owner.handle;
}


// ===== 抗性与免疫演出 END =====

/* v12.10 状态四项（毒/燃/麻/到期）＋【燃烧】禁疗提示
   用途：整段合入 index.html 的 arcaneVfxModule 内部（放在变种演出 END 之后、return 之前）。
   约定：
   - 只复用模块既有 variantRun / idSample / entityVisualRect / domOf / ctr / S / after / fsLayer / addP /
     isEntityVariantLocked / getEntitySpriteDom / combatToken，不新建 timer / rAF / 合成音引擎。
   - 不移植 playStatusDispel；驱散仍走 index.html 原 registerTagHandler('驱散')。
   - 主代理在 arcaneVfxModule 的 return 对象中展开 statusFxApi；并在 clearArcaneFx 内调用 clearStatusLayers()。
   - 主代理负责把 ranshao / fog 采样注册进 audioUrls 与 IDENTITY_CLIP_KEYS（若尚未注册），本片段无合成兜底。 */

    // ===== v12.10 状态发作 / 禁疗 / 到期（可移植自 demo-status-ticks.html，去驱散、去宿主音频） =====
    const ST = {
        persists: new Map(),   // dom -> Set(persistNode)
        persistIds: new Map(), // dom -> entityId（DOM 已离线也能按实体清理）
        sfxAt: new Map(),      // 节流键 -> 上次播放时刻
        runs: new Map()        // entityId -> Set(owner)，清实体时取消活动演出
    };
    let statusSfxOn = true;
    const STATUS_COLORS = { poison: '#a855f7', burn: '#f97316', paralyze: '#facc15', stun: '#fde047', 'atk-': '#c084fc', 'def-': '#c084fc', 'spd-': '#c084fc', 'hit-': '#c084fc', 'eva-': '#c084fc', debuff: '#c084fc' };
    const STATUS_SAMPLE_MAP = {
        poison: 'creature_slime_01',
        para: 'thunder_charge',
        paralyze: 'thunder_charge',
        burn: 'ranshao',
        healSuppress: 'ranshao',
        expire: 'fog'
    };
    function statusEntityId(e) { return e && typeof e === 'object' && e.nodeType !== 1 ? String(e.id || '') : (e && e.nodeType === 1 ? String(identityTargetKey(e)) : String(e || '')); }
    function statusDomOf(e) { return e && e.nodeType === 1 ? e : domOf(e); }
    function statusPanOf(x) { return Math.max(-0.75, Math.min(0.75, (x / Math.max(640, __STAGE.w) - 0.5) * 1.35)); }
    function statusGlowDef(id, std = 3) {
        return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${std}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    }
    // 常驻图标宿主：hero-card-inner 的 .bg-gray-900（正式英雄无 .portrait）＞既有 .portrait 父层＞精灵本体
    function resolveStatusIconHost(dom) {
        if (!dom) return null;
        const portrait = dom.querySelector && dom.querySelector('.portrait');
        if (portrait) return portrait.parentElement || portrait;
        if (dom.classList && dom.classList.contains('hero-card-inner')) return dom.querySelector('.bg-gray-900') || dom;
        return dom;
    }
    // 正式版 entityVisualRect 已含 hero/portrait/img 判定；此处仅做薄映射，不复制几何逻辑
    function statusVisualRect(entityOrDom) { return entityVisualRect(entityOrDom); }
    function statusVisualOk(r) { return !!r && r.w > 0 && r.h > 0; }
    // is-hero 只认 DOM 契约：hero-card-inner 或 .portrait；召唤物（hero-card-s_* 但 class=enemy-sprite）不算
    function statusPersistIsHero(dom) {
        return !!(dom && ((dom.querySelector && dom.querySelector('.portrait')) || (dom.classList && dom.classList.contains('hero-card-inner'))));
    }
    function statusSfxGate(key, minGapMs = 65) {
        if (!statusSfxOn) return 0;
        const now = __fxNow(), prev = ST.sfxAt.get(key) || 0, gap = now - prev;
        if (gap < 28) return 0;
        ST.sfxAt.set(key, now);
        return gap < minGapMs ? 0.45 : 1;
    }
    // 只走真实采样；无合成 fallback。采样键与预热由主代理注册。
    function playStatusSample(owner, key, opts = {}) {
        if (!statusSfxOn) return false;
        const mapped = STATUS_SAMPLE_MAP[key] || key;
        return !!idSample(owner, mapped, Object.assign({ sampled: true, category: 'K' }, opts));
    }
    // 复用变种 owner：handle 带 doneAt/cancel/onFinish；实体活动登记到 ST.runs 便于死亡/离线清理
    function statusRun(totalMs, entity) {
        const owner = variantRun(totalMs, null, entity ? [entity] : []);
        owner.onRestore = owner.onClean;
        const id = statusEntityId(entity);
        if (id) {
            let runs = ST.runs.get(id);
            if (!runs) { runs = new Set(); ST.runs.set(id, runs); }
            runs.add(owner);
            owner.onClean(() => {
                const set = ST.runs.get(id);
                if (set) { set.delete(owner); if (!set.size) ST.runs.delete(id); }
            });
        }
        return owner;
    }
    function buildStatusPersistHtml(kind) {
        if (kind === 'burn') {
            const flameSvg = d => `<svg viewBox="0 0 12 18" class="w-full h-full overflow-visible"><path d="${d}" fill="#ea580c" opacity="0.92"/><path d="M4,16 Q6,9 6.3,6.5 Q8.4,11.5 7.5,16 Z" fill="#fef08a" opacity="0.95"/></svg>`;
            return `<span class="arcane-status-flame-chip f1">${flameSvg('M2,17 Q1.2,10 6.2,1.5 Q10.8,9 9.8,17 Z')}</span>`
                + `<span class="arcane-status-flame-chip f2">${flameSvg('M2.2,17 Q2,11 5.8,3 Q9.8,10 9.4,17 Z')}</span>`
                + `<span class="arcane-status-flame-chip f3">${flameSvg('M2,17 Q1.8,9.5 6.4,2 Q10.4,10.5 9.6,17 Z')}</span>`
                + '<span class="arcane-status-ember-dot e1"></span><span class="arcane-status-ember-dot e2"></span>';
        }
        if (kind === 'poison') {
            return '<span class="arcane-status-bubble-dot b1"></span><span class="arcane-status-bubble-dot b2"></span><span class="arcane-status-bubble-dot b3"></span>';
        }
        if (kind === 'paralyze') {
            const starSvg = () => '<svg viewBox="0 0 20 20" class="w-full h-full overflow-visible">'
                + '<path d="M10,1 L12.1,7.9 L19,10 L12.1,12.1 L10,19 L7.9,12.1 L1,10 L7.9,7.9 Z" fill="#facc15" stroke="#713f12" stroke-width="1.35" stroke-linejoin="round"/>'
                + '<circle cx="10" cy="10" r="2.2" fill="#fef9c3"/></svg>';
            return `<span class="arcane-status-spark-star s1">${starSvg()}</span>`
                + `<span class="arcane-status-spark-star s2">${starSvg()}</span>`
                + `<span class="arcane-status-spark-star s3">${starSvg()}</span>`
                + '<span class="arcane-status-spark-dot d1"></span><span class="arcane-status-spark-dot d2"></span>';
        }
        return '';
    }
    function statusClearNodeTimer(node) {
        if (node && node._exitTimer) { clearTimeout(node._exitTimer); S.timers.delete(node._exitTimer); node._exitTimer = null; }
    }
    function setStatusPersist(dom, kind, active, entityId) {
        if (!dom || !dom.isConnected) return;
        const host = resolveStatusIconHost(dom);
        if (!host || !host.isConnected) return;
        const attr = 'data-arcane-status-persist';
        let node = host.querySelector(':scope > [' + attr + '="' + kind + '"]') || dom.querySelector('[' + attr + '="' + kind + '"]');
        if (active) {
            if (getComputedStyle(host).position === 'static') host.classList.add('arcane-status-host-rel');
            if (!node) {
                node = document.createElement('div');
                node.setAttribute(attr, kind);
                node.className = 'arcane-status-persist-layer arcane-status-persist-' + kind + (statusPersistIsHero(dom) ? ' is-hero' : '');
                node.innerHTML = buildStatusPersistHtml(kind);
                host.appendChild(node);
            } else {
                statusClearNodeTimer(node);
                node.classList.remove('exiting');
            }
            let set = ST.persists.get(dom);
            if (!set) { set = new Set(); ST.persists.set(dom, set); }
            set.add(node);
            if (entityId) ST.persistIds.set(dom, entityId);
        } else if (node && !node.classList.contains('exiting')) {
            node.classList.add('exiting');
            const token = combatToken;
            node._exitTimer = after(290, () => {
                node._exitTimer = null;
                if (token !== combatToken) return;
                node.remove();
                const set = ST.persists.get(dom);
                if (set) {
                    set.delete(node);
                    if (!set.size) { ST.persists.delete(dom); ST.persistIds.delete(dom); }
                }
                if (!host.querySelector('[' + attr + ']')) host.classList.remove('arcane-status-host-rel');
            });
        }
    }
    function syncStatusLayers(entity) {
        if (!entity) return;
        if (!entity.isAlive || entity.hp <= 0 || entity.isSubdued) { clearStatusLayers(entity); return; }
        const dom = statusDomOf(entity);
        if (!dom) return;
        const id = statusEntityId(entity);
        ST.persists.forEach((nodes, oldDom) => {
            if (oldDom !== dom && ST.persistIds.get(oldDom) === id) {
                nodes.forEach(node => { statusClearNodeTimer(node); node.remove(); });
                const oldHost = resolveStatusIconHost(oldDom);
                if (oldHost) oldHost.classList.remove('arcane-status-host-rel');
                ST.persists.delete(oldDom); ST.persistIds.delete(oldDom);
            }
        });
        const buffs = entity.buffs || [];
        const has = t => buffs.some(b => b.type === t && (b.duration > 0 || b.permanent));
        setStatusPersist(dom, 'poison', has('poison'), id);
        setStatusPersist(dom, 'burn', has('burn'), id);
        setStatusPersist(dom, 'paralyze', has('paralyze'), id);
    }
    function clearStatusLayers(entityOrId) {
        const dropDom = (d, set) => {
            (set || new Set()).forEach(node => { statusClearNodeTimer(node); node.remove(); });
            ST.persists.delete(d); ST.persistIds.delete(d);
            const host = d ? resolveStatusIconHost(d) : null;
            if (host) host.classList.remove('arcane-status-host-rel');
            if (d && d.classList) d.classList.remove('arcane-status-host-rel');
            if (d && d.querySelectorAll) d.querySelectorAll('[data-arcane-status-persist]').forEach(node => { statusClearNodeTimer(node); node.remove(); });
        };
        if (entityOrId) {
            const id = entityOrId.nodeType === 1 ? '' : statusEntityId(entityOrId);
            const dom = statusDomOf(entityOrId);
            if (id) {
                const runs = ST.runs.get(id);
                if (runs) {
                    [...runs].forEach(owner => { try { owner.handle && owner.handle.cancel(); } catch (e) {} });
                    ST.runs.delete(id);
                }
                ST.persists.forEach((set, d) => {
                    if (ST.persistIds.get(d) !== id && d !== dom) return;
                    dropDom(d, set);
                });
            } else if (dom) {
                dropDom(dom, ST.persists.get(dom));
            }
            return;
        }
        ST.runs.forEach(set => { [...set].forEach(owner => { try { owner.handle && owner.handle.cancel(); } catch (e) {} }); });
        ST.runs.clear();
        ST.persists.forEach((set, d) => { set.forEach(node => { statusClearNodeTimer(node); node.remove(); }); });
        ST.persists.clear(); ST.persistIds.clear(); ST.sfxAt.clear();
        document.querySelectorAll('[data-arcane-status-persist]').forEach(node => { statusClearNodeTimer(node); node.remove(); });
        document.querySelectorAll('.arcane-status-host-rel').forEach(el => el.classList.remove('arcane-status-host-rel'));
    }

    // 1. 中毒发作：局部紫纹微渗 → 依层 2~4 毒泡浮出破裂 → 细毒雾上浮 (L1 · 540ms)
    function playStatusPoisonTick(entity, meta = {}, onBeat) {
        const dom = statusDomOf(entity); if (!dom || !dom.isConnected) return null;
        const r = statusVisualRect(dom); if (!statusVisualOk(r)) return null;
        const layers = Math.max(1, Math.min(5, Number(meta.layers) || 1));
        const bubbleCount = layers >= 3 ? 4 : (layers === 2 ? 3 : 2);
        const owner = statusRun(540, entity), uid = 'arcane-status-poison-' + (++S.uid), pan = statusPanOf(r.x);
        const W = Math.max(96, r.w * 1.18), H = Math.max(96, r.h * 1.18), cx = W / 2, cy = H / 2, rw = r.w * 0.42, rh = r.h * 0.42;
        const wispSet = [
            `M${cx + rw * 0.14},${cy + rh * 0.25} L${cx + rw * 0.34},${cy - rh * 0.08} L${cx + rw * 0.28},${cy - rh * 0.32}`,
            `M${cx - rw * 0.28},${cy + rh * 0.18} L${cx - rw * 0.14},${cy - rh * 0.12} L${cx - rw * 0.22},${cy - rh * 0.34}`,
            `M${cx + rw * 0.04},${cy - rh * 0.06} L${cx + rw * 0.26},${cy - rh * 0.22}`,
            `M${cx - rw * 0.1},${cy + rh * 0.28} L${cx + rw * 0.16},${cy + rh * 0.1}`,
            `M${cx + rw * 0.34},${cy + rh * 0.18} L${cx + rw * 0.46},${cy - rh * 0.18}`
        ].slice(0, layers >= 3 ? 5 : (layers === 2 ? 4 : 3));
        const bSlots = [[0.24, -0.14], [0.42, -0.34], [0.06, -0.42], [0.34, -0.56]].slice(0, bubbleCount);
        const wispStrokeW = layers >= 3 ? 2.1 : 1.5, wispOp = layers >= 3 ? 0.85 : 0.65;
        const bubblesHtml = bSlots.map(([ox, oy], idx) => {
            const bx = (cx + ox * rw).toFixed(1), by = (cy + oy * rh).toFixed(1), br = (4.6 + (idx % 2) * 1.4 + (layers >= 3 ? 0.9 : 0)).toFixed(1);
            return `<g class="s-bubble" data-bx="${(r.x + ox * r.w * 0.42).toFixed(1)}" data-by="${(r.y + oy * r.h * 0.42 - 6).toFixed(1)}" style="transform-origin:${bx}px ${by}px;opacity:0">`
                + `<circle cx="${bx}" cy="${by}" r="${br}" fill="url(#${uid}-bub)"/>`
                + `<circle cx="${(Number(bx) - Number(br) * 0.32).toFixed(1)}" cy="${(Number(by) - Number(br) * 0.32).toFixed(1)}" r="${(Number(br) * 0.28).toFixed(1)}" fill="#f3e8ff" opacity="0.82"/></g>`;
        }).join('');
        const layer = owner.layer(
            `<div class="arcane-status-anchor" style="left:${r.x}px;top:${r.y}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-status-svg" viewBox="0 0 ${W} ${H}"><defs>${statusGlowDef(uid + '-gl', 2.0)}`
            + `<radialGradient id="${uid}-bub" cx="0.35" cy="0.32"><stop offset="0" stop-color="#f3e8ff" stop-opacity="0.45"/><stop offset="0.58" stop-color="#a855f7" stop-opacity="0.76"/><stop offset="0.88" stop-color="#7e22ce" stop-opacity="0.94"/><stop offset="1" stop-color="#581c87" stop-opacity="0"/></radialGradient>`
            + `</defs><g class="s-veins" filter="url(#${uid}-gl)" style="transform-origin:${cx}px ${cy}px;opacity:0">`
            + wispSet.map(d => `<path d="${d}" fill="none" stroke="#c084fc" stroke-width="${wispStrokeW}" stroke-linecap="round" stroke-linejoin="round" opacity="${wispOp}"/>`).join('')
            + `</g><g filter="url(#${uid}-gl)">${bubblesHtml}</g></svg></div>`
        );
        const veins = layer.querySelector('.s-veins');
        if (veins) owner.anim(veins, [{ opacity: 0, transform: 'translateY(3px) scale(0.95)' }, { opacity: 0.92, transform: 'translateY(0px) scale(1)', offset: 0.3 }, { opacity: 0.65, transform: 'translateY(-2px)', offset: 0.65 }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 400, easing: 'ease-out', fill: 'forwards' });
        const gSfx = statusSfxGate('poison', 70);
        if (gSfx > 0) playStatusSample(owner, 'poison', { pan, vol: (layers >= 3 ? 0.48 : 0.40) * gSfx, rate: layers >= 3 ? 0.94 : 1.04 });
        owner.at(60, () => { if (onBeat) onBeat({ event: 'poisonTick', entity, layers }); });
        layer.querySelectorAll('.s-bubble').forEach((bEl, idx) => {
            const d0 = 40 + idx * 62;
            owner.at(d0, () => {
                owner.anim(bEl, [{ opacity: 0, transform: 'translateY(4px) scale(0.32)' }, { opacity: 0.96, transform: 'translateY(-5px) scale(1.08)', offset: 0.58 }, { opacity: 0, transform: 'translateY(-11px) scale(1.36)' }], { duration: 155, easing: 'ease-out', fill: 'forwards' });
            });
            owner.at(d0 + 92, () => {
                const bx = Number(bEl.dataset.bx), by = Number(bEl.dataset.by);
                owner.burst(4 + (layers >= 3 ? 1 : 0), () => {
                    const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1), sp = rnd(0.7, 1.6);
                    return { x: bx + rnd(-3, 3), y: by + rnd(-3, 3), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.35, drag: 0.94, decay: 0.048, size: rnd(2.0, 3.4), shape: 'glowOrb', core: '#e9d5ff', color: '#a855f7' };
                });
                owner.addP({ x: bx, y: by - 2, vx: rnd(-0.3, 0.3), vy: rnd(-1.05, -0.5), drag: 0.96, decay: 0.038, size: rnd(7, 10), shape: 'gradMist', blend: 'source-over', mistCore: '#7e22ce', color: 'rgba(126,34,206,0.3)', fade: 'rgba(59,7,100,0)' });
            });
        });
        return owner.handle;
    }

    // 2. 燃烧发作：底部火焰上涌 → 锐利火星闪爆 → 黑灰余烬上飘；不叠层强度恒定 (L1 · 540ms)
    function playStatusBurnTick(entity, meta = {}, onBeat) {
        const dom = statusDomOf(entity); if (!dom || !dom.isConnected) return null;
        const r = statusVisualRect(dom); if (!statusVisualOk(r)) return null;
        const owner = statusRun(540, entity), uid = 'arcane-status-burn-' + (++S.uid), pan = statusPanOf(r.x);
        const W = Math.max(96, r.w * 1.2), H = Math.max(96, r.h * 1.2), cx = W / 2, cy = H / 2, rw = r.w * 0.42, rh = r.h * 0.42;
        const fx = cx + rw * 0.16, fy = cy + rh * 0.08;
        const tongueAt = (tx, by, w, h) => `<path d="M${(tx - w).toFixed(1)},${by.toFixed(1)} Q${(tx - w * 0.7).toFixed(1)},${(by - h * 0.55).toFixed(1)} ${(tx + w * 0.08).toFixed(1)},${(by - h).toFixed(1)} Q${(tx + w * 0.85).toFixed(1)},${(by - h * 0.45).toFixed(1)} ${(tx + w).toFixed(1)},${by.toFixed(1)} Z" fill="url(#${uid}-fl)"/>`
            + `<path d="M${(tx - w * 0.45).toFixed(1)},${by.toFixed(1)} Q${tx.toFixed(1)},${(by - h * 0.55).toFixed(1)} ${(tx + w * 0.45).toFixed(1)},${by.toFixed(1)} Z" fill="#fef08a" opacity="0.9"/>`;
        const layer = owner.layer(
            `<div class="arcane-status-anchor" style="left:${r.x}px;top:${r.y}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-status-svg" viewBox="0 0 ${W} ${H}"><defs>${statusGlowDef(uid + '-gl', 2.0)}`
            + `<linearGradient id="${uid}-fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#c2410c" stop-opacity="0.92"/><stop offset="0.55" stop-color="#f97316" stop-opacity="0.95"/><stop offset="1" stop-color="#fef08a" stop-opacity="0.2"/></linearGradient>`
            + `</defs><g class="s-tongues" filter="url(#${uid}-gl)" style="transform-origin:${cx}px ${cy + rh * 0.78}px;opacity:0">`
            + tongueAt(cx - rw * 0.44, cy + rh * 0.78, Math.max(5.5, rw * 0.16), Math.max(14, rh * 0.52))
            + tongueAt(cx - rw * 0.1, cy + rh * 0.84, Math.max(6.5, rw * 0.2), Math.max(18, rh * 0.68))
            + tongueAt(cx + rw * 0.26, cy + rh * 0.8, Math.max(6, rw * 0.18), Math.max(16, rh * 0.6))
            + tongueAt(cx + rw * 0.48, cy + rh * 0.72, Math.max(5, rw * 0.14), Math.max(12, rh * 0.44))
            + `</g><polygon class="s-flare" points="${fx},${fy - 11} ${fx + 3},${fy - 3} ${fx + 11},${fy} ${fx + 3},${fy + 3} ${fx},${fy + 11} ${fx - 3},${fy + 3} ${fx - 11},${fy} ${fx - 3},${fy - 3}" fill="#fef08a" stroke="#f97316" stroke-width="1" opacity="0" style="transform-origin:${fx}px ${fy}px"/></svg></div>`
        );
        const tongues = layer.querySelector('.s-tongues'), flare = layer.querySelector('.s-flare');
        if (tongues) owner.anim(tongues, [{ opacity: 0, transform: 'translateY(6px) scaleY(0.55)' }, { opacity: 0.96, transform: 'translateY(-3px) scaleY(1.06)', offset: 0.35 }, { opacity: 0, transform: 'translateY(-11px) scaleY(0.75)' }], { duration: 360, easing: 'ease-out', fill: 'forwards' });
        const gSfx = statusSfxGate('burn', 70);
        if (gSfx > 0) playStatusSample(owner, 'burn', { pan, vol: 0.22 * gSfx, rate: 1.02 });
        owner.at(60, () => { if (onBeat) onBeat({ event: 'burnTick', entity }); });
        owner.at(80, () => {
            if (flare) owner.anim(flare, [{ opacity: 0, transform: 'scale(0.35) rotate(0deg)' }, { opacity: 0.96, transform: 'scale(1.1) rotate(18deg)', offset: 0.32 }, { opacity: 0, transform: 'scale(0.6) rotate(35deg)' }], { duration: 190, easing: 'ease-out', fill: 'forwards' });
            const bx = r.x + r.w * 0.07, by = r.y + r.h * 0.04;
            owner.burst(5, () => { const a = rnd(-Math.PI, 0), sp = rnd(1.0, 2.2); return { x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.45, drag: 0.92, decay: 0.058, size: rnd(1.2, 1.8), shape: 'spark', color: pick(['#fb923c', '#fbbf24']) }; });
            owner.burst(6, i => ({ x: r.x + rnd(-rw * 0.48, rw * 0.48), y: r.y + rnd(-rh * 0.15, rh * 0.45), vx: rnd(-0.3, 0.3), vy: rnd(-1.5, -0.75), drag: 0.97, decay: rnd(0.03, 0.045), size: i % 2 ? rnd(2.0, 3.2) : rnd(6, 9), shape: i % 2 ? 'glowOrb' : 'gradMist', blend: i % 2 ? 'lighter' : 'source-over', core: '#fed7aa', mistCore: 'rgba(67,20,7,0.62)', color: i % 2 ? '#ea580c' : 'rgba(28,25,23,0.42)', fade: 'rgba(12,10,9,0)' }));
        });
        return owner.handle;
    }

    // 2B. 燃烧禁疗轻提示：治疗光落于燃烧目标瞬间被暗橙火苗压灭 ~240ms
    function playStatusHealSuppressed(entity, meta = {}, onBeat) {
        const dom = statusDomOf(entity); if (!dom || !dom.isConnected) return null;
        const r = statusVisualRect(dom); if (!statusVisualOk(r)) return null;
        const owner = statusRun(240, entity), uid = 'arcane-status-hsup-' + (++S.uid), pan = statusPanOf(r.x);
        const W = Math.max(96, r.w * 1.15), H = Math.max(96, r.h * 1.15), cx = W / 2, cy = H / 2, rw = r.w * 0.42, rh = r.h * 0.42;
        const wisp = (wx, w, h) => `<path d="M${(wx - w).toFixed(1)},${(cy + rh * 0.42).toFixed(1)} Q${wx.toFixed(1)},${(cy + rh * 0.42 - h).toFixed(1)} ${(wx + w).toFixed(1)},${(cy + rh * 0.42).toFixed(1)} Z" fill="url(#${uid}-cap)"/>`;
        const layer = owner.layer(
            `<div class="arcane-status-anchor" style="left:${r.x}px;top:${r.y}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-status-svg" viewBox="0 0 ${W} ${H}"><defs>${statusGlowDef(uid + '-gl', 2.0)}`
            + `<linearGradient id="${uid}-hl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#34d399" stop-opacity="0"/><stop offset="0.5" stop-color="#6ee7b7" stop-opacity="0.52"/><stop offset="1" stop-color="#a7f3d0" stop-opacity="0"/></linearGradient>`
            + `<linearGradient id="${uid}-cap" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#9a3412" stop-opacity="0.9"/><stop offset="0.6" stop-color="#ea580c" stop-opacity="0.86"/><stop offset="1" stop-color="#fdba74" stop-opacity="0.15"/></linearGradient>`
            + `</defs><rect class="s-heal" x="${(cx - rw * 0.55).toFixed(1)}" y="${(cy - rh * 0.45).toFixed(1)}" width="${(rw * 1.1).toFixed(1)}" height="${(rh * 0.9).toFixed(1)}" rx="6" fill="url(#${uid}-hl)" style="transform-origin:${cx}px ${cy}px"/>`
            + `<g class="s-cap" filter="url(#${uid}-gl)" opacity="0" style="transform-origin:${cx}px ${cy + rh * 0.4}px">${wisp(cx - rw * 0.3, 6, rh * 0.72)}${wisp(cx, 7.5, rh * 0.88)}${wisp(cx + rw * 0.3, 6, rh * 0.68)}</g></svg></div>`
        );
        const hl = layer.querySelector('.s-heal'), cap = layer.querySelector('.s-cap');
        if (hl) owner.anim(hl, [{ opacity: 0.75, transform: 'scaleY(0.95)' }, { opacity: 0.14, transform: 'scaleY(0.45)', offset: 0.45 }, { opacity: 0, transform: 'scaleY(0.25)' }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
        if (cap) owner.anim(cap, [{ opacity: 0, transform: 'scaleY(0.3)' }, { opacity: 0.94, transform: 'scaleY(1.06)', offset: 0.35 }, { opacity: 0, transform: 'scaleY(0.82)' }], { duration: 210, easing: 'ease-out', delay: 20, fill: 'forwards' });
        const gSfx = statusSfxGate('healSuppress', 80);
        if (gSfx > 0) playStatusSample(owner, 'healSuppress', { pan, vol: 0.15 * gSfx, rate: 0.86 });
        owner.at(45, () => {
            owner.burst(4, () => ({ x: r.x + rnd(-rw * 0.45, rw * 0.45), y: r.y + rnd(-rh * 0.2, rh * 0.2), vx: rnd(-0.8, 0.8), vy: rnd(-1.3, -0.4), drag: 0.93, decay: 0.06, size: rnd(2.0, 3.2), shape: 'glowOrb', core: '#fed7aa', color: '#ea580c' }));
            if (onBeat) onBeat({ event: 'healSuppressed', entity });
        });
        return owner.handle;
    }

    // 3. 麻痹僵直触发：头部黄火星爆发 + 350ms 轻硬直 + 1 枚电星脱落；锁定期只保留粒子
    function playStatusParaProc(entity, meta = {}, onBeat) {
        if (meta && meta.triggered === false) return null;
        const dom = statusDomOf(entity); if (!dom || !dom.isConnected) return null;
        const r = statusVisualRect(dom); if (!statusVisualOk(r)) return null;
        const owner = statusRun(480, entity), uid = 'arcane-status-para-' + (++S.uid), pan = statusPanOf(r.x);
        const hy = r.top + r.h * 0.22;
        const W = Math.max(118, r.w * 1.3), H = Math.max(96, r.h * 1.02), cx = W / 2, cy = H * 0.56, rw = r.w * 0.46, rh = r.h * 0.36;
        const starSpots = [
            [-0.72, -0.06, 1.05], [-0.48, -0.46, 0.95], [-0.22, -0.62, 1.22], [0.08, -0.58, 1.15],
            [0.36, -0.46, 1.02], [0.64, -0.18, 1.1], [-0.56, 0.18, 0.88], [-0.14, -0.18, 1.08],
            [0.24, -0.12, 0.96], [0.52, 0.16, 0.88], [-0.32, 0.08, 0.85], [0.02, -0.4, 0.9]
        ];
        const sparksHtml = starSpots.map(([ox, oy, sc], idx) => {
            const x = cx + ox * rw, y = cy + oy * rh, rad = 6.8 * sc, inn = 1.75 * sc;
            const d = `M${x.toFixed(1)},${(y - rad).toFixed(1)} L${(x + inn).toFixed(1)},${(y - inn).toFixed(1)} L${(x + rad).toFixed(1)},${y.toFixed(1)} L${(x + inn).toFixed(1)},${(y + inn).toFixed(1)} L${x.toFixed(1)},${(y + rad).toFixed(1)} L${(x - inn).toFixed(1)},${(y + inn).toFixed(1)} L${(x - rad).toFixed(1)},${y.toFixed(1)} L${(x - inn).toFixed(1)},${(y - inn).toFixed(1)} Z`;
            return `<g class="s-para-spark" data-del="${(idx % 4) * 26}" style="transform-origin:${x.toFixed(1)}px ${y.toFixed(1)}px;opacity:0">`
                + `<path d="${d}" fill="${idx % 2 ? '#fef08a' : '#facc15'}" stroke="#713f12" stroke-width="1.3" stroke-linejoin="round"/>`
                + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(inn * 1.18).toFixed(1)}" fill="#ffffff"/></g>`;
        }).join('');
        const sx = cx + rw * 0.56, sy = cy - rh * 0.4;
        const flakeD = `M${sx.toFixed(1)},${(sy - 8.5).toFixed(1)} L${(sx + 2.5).toFixed(1)},${(sy - 2.5).toFixed(1)} L${(sx + 8.5).toFixed(1)},${sy.toFixed(1)} L${(sx + 2.5).toFixed(1)},${(sy + 2.5).toFixed(1)} L${sx.toFixed(1)},${(sy + 8.5).toFixed(1)} L${(sx - 2.5).toFixed(1)},${(sy + 2.5).toFixed(1)} L${(sx - 8.5).toFixed(1)},${sy.toFixed(1)} L${(sx - 2.5).toFixed(1)},${(sy - 2.5).toFixed(1)} Z`;
        const layer = owner.layer(
            `<div class="arcane-status-anchor" style="left:${r.x}px;top:${hy.toFixed(1)}px;width:${W}px;height:${H}px;transform:translate(-50%,-50%)">`
            + `<svg class="arcane-status-svg" viewBox="0 0 ${W} ${H}"><defs>${statusGlowDef(uid + '-gl', 2.0)}</defs>`
            + `<g filter="url(#${uid}-gl)">${sparksHtml}</g>`
            + `<g class="s-para-flake" filter="url(#${uid}-gl)" style="transform-origin:${sx.toFixed(1)}px ${sy.toFixed(1)}px;opacity:0">`
            + `<path d="${flakeD}" fill="#fde047" stroke="#713f12" stroke-width="1.6" stroke-linejoin="round"/>`
            + `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="2.4" fill="#ffffff"/>`
            + `</g></svg></div>`
        );
        layer.querySelectorAll('.s-para-spark').forEach(spEl => {
            owner.anim(spEl, [
                { opacity: 0.35, transform: 'scale(0.55) rotate(-14deg)' },
                { opacity: 1, transform: 'translateY(-3px) scale(1.24) rotate(12deg)', offset: 0.24 },
                { opacity: 0.82, transform: 'translateY(-6px) scale(0.96) rotate(24deg)', offset: 0.6 },
                { opacity: 0, transform: 'translateY(-11px) scale(0.42) rotate(38deg)' }
            ], { duration: 290, delay: Number(spEl.dataset.del) || 0, easing: 'ease-out', fill: 'forwards' });
        });
        const flake = layer.querySelector('.s-para-flake');
        // 轻硬直不与变种/复活等实体锁抢动画；锁定期只保留粒子与电星
        if (!isEntityVariantLocked(dom)) {
            owner.anim(dom, [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-3px,0,0)', offset: 0.16 }, { transform: 'translate3d(3px,1px,0)', offset: 0.34 }, { transform: 'translate3d(-2px,0,0)', offset: 0.56 }, { transform: 'translate3d(1.5px,-1px,0)', offset: 0.78 }, { transform: 'translate3d(0,0,0)' }], { duration: 350, easing: 'ease-out' });
        }
        const gSfx = statusSfxGate('para', 70);
        if (gSfx > 0) playStatusSample(owner, 'para', { pan, vol: 0.24 * gSfx, rate: 1.04 });
        const sparkAt = (n, xSpan, yOff) => owner.burst(n, i => {
            const up = rnd(-2.3, -0.45), side = rnd(-2.0, 2.0);
            return { x: r.x + rnd(-xSpan, xSpan), y: hy + rnd(-r.h * 0.16, r.h * 0.12) + yOff, vx: side, vy: up, drag: 0.92, decay: rnd(0.042, 0.062), size: rnd(1.7, 2.8), shape: i % 3 ? 'spark' : 'glowOrb', tail: 3.6, core: '#ffffff', color: pick(['#fef9c3', '#fde047', '#facc15', '#f59e0b']) };
        });
        sparkAt(14, r.w * 0.42, 0);
        owner.at(75, () => {
            sparkAt(9, r.w * 0.45, -4);
            if (onBeat) onBeat({ event: 'paraProc', entity });
        });
        owner.at(105, () => {
            if (flake) owner.anim(flake, [{ opacity: 0.98, transform: 'translate(0px,0px) scale(1) rotate(0deg)' }, { opacity: 0.88, transform: 'translate(13px,-10px) scale(0.85) rotate(24deg)', offset: 0.45 }, { opacity: 0, transform: 'translate(22px,-17px) scale(0.4) rotate(48deg)' }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
        });
        return owner.handle;
    }
    function playStatusParaMiss() { return null; }

    // 4. 到期消散：对应色微粒轻蒸发（徽章由 updateBuffUI 同帧重写，不依赖 fading class）
    function playStatusExpire(entity, meta = {}, onBeat) {
        if (!entity || entity.isAlive === false || entity.isSubdued || (typeof entity.hp === 'number' && entity.hp <= 0)) return null;
        const dom = statusDomOf(entity); if (!dom || !dom.isConnected) return null;
        const r = statusVisualRect(dom); if (!statusVisualOk(r)) return null;
        const types = Array.isArray(meta.expiredTypes) ? meta.expiredTypes : (meta.expiredType ? [meta.expiredType] : ['poison']);
        const colMap = meta.expiredColors || {};
        const colors = types.map(t => colMap[t] || STATUS_COLORS[t] || '#cbd5e1');
        const owner = statusRun(420, entity), pan = statusPanOf(r.x);
        const gSfx = statusSfxGate('expire', 70);
        if (gSfx > 0) playStatusSample(owner, 'expire', { pan, vol: 0.36 * gSfx, rate: 1.0 });
        owner.burst(8, i => {
            const c = colors[i % colors.length];
            return { x: r.x + rnd(-r.w * 0.38, r.w * 0.38), y: r.y + rnd(-r.h * 0.25, r.h * 0.25), vx: rnd(-0.32, 0.32), vy: rnd(-1.35, -0.65), drag: 0.96, decay: rnd(0.036, 0.052), size: rnd(2.2, 3.8), shape: 'glowOrb', core: '#f8fafc', color: c };
        });
        owner.at(160, () => { if (onBeat) onBeat({ event: 'expire', entity, expiredTypes: types }); });
        return owner.handle;
    }

    function playStatusTickFx(opts = {}) {
        const { event, entity, meta = {}, onBeat } = opts;
        if (event === 'poisonTick') return playStatusPoisonTick(entity, meta, onBeat);
        if (event === 'burnTick') return playStatusBurnTick(entity, meta, onBeat);
        if (event === 'healSuppressed') return playStatusHealSuppressed(entity, meta, onBeat);
        if (event === 'paraProc') return playStatusParaProc(entity, meta, onBeat);
        if (event === 'paraMiss') return playStatusParaMiss(entity, meta, onBeat);
        if (event === 'expire') return playStatusExpire(entity, meta, onBeat);
        return null;
    }
    function setStatusSfx(on) {
        statusSfxOn = !!on;
        if (!statusSfxOn) ST.runs.forEach(runs => runs.forEach(owner => owner.audioStoppers.forEach(stop => stop())));
        return statusSfxOn;
    }
    // ===== v12.10 状态 END =====

    // 合入 arcaneVfxModule 的 return 对象时展开本对象（不要把 clearStatusLayers 误删）：
    const statusFxApi = {
        playStatusTickFx, playStatusPoisonTick, playStatusBurnTick, playStatusHealSuppressed,
        playStatusParaProc, playStatusParaMiss, playStatusExpire,
        syncStatusLayers, clearStatusLayers, setStatusSfx
    };

    // 自爆：存活预警与三幕尸体舞台，结算仍由正式战斗管线掌握。
    const SD_WARNINGS = new Map(), SD_RUNS = new Set();
    let sdSfxOn = true;
    const SD_CONF = {
        '群伤': { key:'aoe', main:'#ef4444', soft:'#fca5a5', dark:'#991b1b', glow:'rgba(239,68,68,0.45)' },
        '群穿': { key:'pierce', main:'#f43f5e', soft:'#fda4af', dark:'#9f1239', glow:'rgba(244,63,94,0.45)' },
        '群火': { key:'fire', main:'#f97316', soft:'#fdba74', dark:'#9a3412', glow:'rgba(249,115,22,0.45)' },
        '群毒': { key:'poison', main:'#a855f7', soft:'#d8b4fe', dark:'#581c87', glow:'rgba(168,85,247,0.45)' }
    };
    const SD_SAMPLES = {
        sd_crack:'molt_crack', sd_tear:'mx_rift_tear', sd_gather:'mx_rift_charge', sd_charge_low:'explosion_aoe_charge',
        sd_crit_tick:'mx_gear_lock', sd_snap:'mx_vacuum', sd_kanpo_exit:'rage_exit', sd_kanpo_drop:'defDown',
        sd_subdue_stomp:'mx_golem_stomp', sd_contest_break:'mx_armor_strike', sd_burst_aoe:'sd_ring_blast',
        sd_deep_impact:'mx_deep_impact', sd_burst_pierce:'sd_shatter_blast', sd_pierce_shard:'frost_crystal_impact_fs550267',
        sd_burst_fire_wave:'huoyan01', sd_burn_attach:'ranshao', sd_burst_poison_sac:'creature_slime_01',
        sd_burst_poison_mist:'aoe_poison_spell_fs219566', sd_fog_attach:'fog', sd_dodge:'dodge_2'
    };
    const sdEntityId = entityIdOf;
    const sdConf = (form, meta = {}) => meta.accentColor ? Object.assign({}, SD_CONF[form] || SD_CONF['群伤'], { main:meta.accentColor }) : SD_CONF[form] || SD_CONF['群伤'];
    function playSdSample(owner, key, opts = {}) {
        if (!sdSfxOn) return true;
        return idSample(owner, SD_SAMPLES[key], Object.assign({ sampled:true, category:key === 'sd_dodge' ? 'H' : 'A' }, opts));
    }
    function sdRun(ms, entity) {
        const owner = identityRun(ms, 1);
        owner.entityIds = new Set([sdEntityId(entity)]);
        SD_RUNS.add(owner); owner.onClean(() => SD_RUNS.delete(owner));
        owner.handle.done = new Promise(resolve => owner.handle.onFinish.add(resolve));
        return owner;
    }
    function sdLayer(owner, html, ms, z = 54) {
        const layer = owner.layer(html); layer.style.zIndex = String(z); layer.dataset.selfdestructFx = '1';
        if (ms) owner.at(ms, () => { layer.remove(); S.layers.delete(layer); owner.layers.delete(layer); });
        return layer;
    }
    function sdCrackSvg(conf, intense, uid) {
        const gid = `sd-${conf.key}-rg-${uid}`, fid = `sd-${conf.key}-gl-${uid}`;
        const op = intense ? '0.96' : '0.46', sw = intense ? '2.6' : '1.45', glowStop = intense ? '0.42' : '0.24';
        return `<svg viewBox="0 0 120 120" class="arcane-selfdestruct-warn-cracks">
          <defs>
            <radialGradient id="${gid}" cx="50%" cy="54%" r="50%">
              <stop offset="0%" stop-color="${intense ? '#ffffff' : conf.soft}" stop-opacity="${glowStop}"/>
              <stop offset="48%" stop-color="${conf.main}" stop-opacity="${intense ? '0.32' : '0.14'}"/>
              <stop offset="100%" stop-color="${conf.dark}" stop-opacity="0"/>
            </radialGradient>
            <filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${intense ? 2.4 : 1.3}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <circle cx="60" cy="64" r="${intense ? 50 : 42}" fill="url(#${gid})"/>
          <g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#${fid})" opacity="${op}">
            <path d="M58 26 L53 44 L62 56 L50 74 L56 92" stroke="${conf.main}" stroke-width="${sw}"/>
            <path d="M53 44 L36 38 L27 46 M62 56 L82 48 L93 56 M50 74 L34 80 L25 89 M62 56 L77 73 L85 88" stroke="${conf.soft}" stroke-width="${intense ? 1.8 : 1.05}"/>
            ${intense ? `<path d="M58 32 L54 44 L61 56 L52 72" stroke="#ffffff" stroke-width="1.2" opacity="0.88"/>` : ''}
          </g>
        </svg>`;
    }
    function clearSelfDestructWarning(entityOrId) {
        const id = sdEntityId(entityOrId), rec = SD_WARNINGS.get(id);
        if (!rec) return;
        stopEvery(rec.emberTimer); rec.layer.remove();
        rec.host.style.position = rec.position;
        S.particles = S.particles.filter(p => p.owner !== rec);
        SD_WARNINGS.delete(id); releaseIdleCanvas();
    }
    function clearAllSelfDestructWarnings() { [...SD_WARNINGS.keys()].forEach(clearSelfDestructWarning); }
    function clearSelfDestructState(entityOrId) {
        const id = entityOrId == null ? '' : sdEntityId(entityOrId);
        if (id) clearSelfDestructWarning(id); else clearAllSelfDestructWarnings();
        [...SD_RUNS].filter(owner => !id || owner.entityIds.has(id)).forEach(owner => owner.handle.cancel());
        const dom = id ? domOf(id) : null;
        if (dom) dom.classList.remove('arcane-selfdestruct-sprite-subdued');
        if (!id) document.querySelectorAll('.arcane-selfdestruct-sprite-subdued').forEach(node => node.classList.remove('arcane-selfdestruct-sprite-subdued'));
    }
    function setSelfDestructSfx(on) {
        sdSfxOn = !!on;
        if (!sdSfxOn) SD_RUNS.forEach(owner => owner.audioStoppers.forEach(stop => stop()));
        return sdSfxOn;
    }
    function setSelfDestructWarning(entityOrId, form, opts = {}) {
        const id = sdEntityId(entityOrId), dom = domOf(entityOrId);
        const rec = SD_WARNINGS.get(id);
        if (rec && rec.dom === dom && rec.form === form && rec.layer.isConnected) return rec;
        clearSelfDestructWarning(id);
        const r = entityVisualRect(dom);
        if (!r || !r.w || !r.h || !dom.isConnected || !form) return null;
        const host = r.visualDom.tagName === 'IMG' ? r.visualDom.parentElement : r.visualDom;
        const position = host.style.position;
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        const conf = sdConf(form, opts), uid = ++S.uid;
        const layer = document.createElement('div'); layer.className = 'arcane-selfdestruct-warn';
        layer.dataset.arcaneSelfdestructWarning = id;
        layer.style.cssText = 'left:50%;top:50%;width:116%;height:116%;';
        layer.innerHTML = sdCrackSvg(conf, false, uid); host.appendChild(layer);
        const token = combatToken, warning = { dom, host, position, layer, form, emberTimer:null };
        warning.emberTimer = every(2200, () => {
            if (!layer.isConnected || !dom.isConnected || token !== combatToken) { clearSelfDestructWarning(id); return; }
            const r = entityVisualRect(dom);
            if (!r) return;
            ensureCanvas(); ensureDriver();
            addP({ owner:warning, x:r.x + rnd(-r.w * 0.24, r.w * 0.24), y:r.y + rnd(-r.h * 0.1, r.h * 0.22), vx:rnd(-0.18,0.18), vy:rnd(-0.85,-0.45), drag:0.98, decay:0.022, size:rnd(1.5,2.3), shape:'glowOrb', core:conf.soft, color:conf.main });
        });
        SD_WARNINGS.set(id, warning); return warning;
    }
    function syncSelfDestructWarning(entity) {
        if (!entity) return;
        if (!entity.explode || !entity.isAlive || entity.hp <= 0 || entity.isSubdued) { clearSelfDestructWarning(entity); return; }
        setSelfDestructWarning(entity, entity.explode.type);
    }
    function createCorpseStage(entity, conf, owner) {
        const sprite = entity && entity.selfDestructDom || domOf(entity), r = sprite && entityVisualRect(sprite);
        if (!r || !r.w || !r.h || !sprite.isConnected) return null;
        const box = sprite.closest('[id^="enemy-box-"],[id^="hero-wrap-"]') || sprite.parentElement || sprite;
        const previous = { visibility:sprite.style.visibility, breathe:sprite.classList.contains('breathe'), charge:sprite.classList.contains('charge-full-danger') };
        sprite.classList.remove('breathe','charge-full-danger'); sprite.style.visibility = 'hidden';
        box.classList.add('arcane-selfdestruct-host-corpse');
        const uid = ++S.uid, faceHtml = cloneVisualOnly(sprite);
        const layer = sdLayer(owner, '', 0);
        const stage = document.createElement('div'); stage.className = 'arcane-selfdestruct-stage';
        stage.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;`;
        stage.innerHTML = `<div class="arcane-sd-omen-aura" style="position:absolute;inset:-24px;border-radius:50%;background:radial-gradient(circle,${conf.glow} 0%,${conf.glow} 36%,transparent 72%);opacity:0"></div>`
            + `<div class="arcane-sd-body arcane-selfdestruct-dying-visual" style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">${faceHtml}</div>`
            + `<div class="arcane-sd-cracks" style="position:absolute;inset:-10%;opacity:0.65">${sdCrackSvg(conf,true,uid)}</div>`
            + `<div class="arcane-sd-core" style="position:absolute;left:50%;top:54%;width:48px;height:48px;border-radius:50%;transform:translate(-50%,-50%) scale(0.35);opacity:0;background:radial-gradient(circle,#fff 0%,${conf.soft} 42%,${conf.main} 70%,transparent 75%)"></div>`
            + '<div class="arcane-sd-overlay" style="position:absolute;inset:-16%"></div>';
        layer.appendChild(stage);
        const face = stage.querySelector('.arcane-sd-body').firstElementChild;
        if (face && face.tagName !== 'IMG') face.style.fontSize = (parseFloat(getComputedStyle(r.visualDom).fontSize) * r.w / (r.visualDom.offsetWidth || r.w)) + 'px';
        let restored = false;
        const restore = mode => {
            if (restored) return; restored = true;
            box.classList.remove('arcane-selfdestruct-host-corpse');
            layer.remove(); owner.layers.delete(layer); S.layers.delete(layer);
            sprite.style.visibility = mode === 'dead' ? 'hidden' : previous.visibility;
            if (mode === 'subdued') sprite.classList.add('arcane-selfdestruct-sprite-subdued');
            if (mode === 'cancel') {
                if (previous.breathe) sprite.classList.add('breathe');
                if (previous.charge) sprite.classList.add('charge-full-danger');
            }
        };
        owner.onClean(() => restore('cancel'));
        return { owner, layer, stage, r, box, sprite, bodyEl:stage.querySelector('.arcane-sd-body'), auraEl:stage.querySelector('.arcane-sd-omen-aura'), crackEl:stage.querySelector('.arcane-sd-cracks'), coreEl:stage.querySelector('.arcane-sd-core'), overlayEl:stage.querySelector('.arcane-sd-overlay'), restore };
    }
    function playInterruptOnStage(ctx, mode, entity, conf, onBeat) {
        const owner = ctx.owner, { x,y } = ctx.r;
        owner.animations.forEach(a => a.cancel()); owner.animations.clear();
        owner.intervals.forEach(stopEvery); owner.intervals.clear();
        owner.audioStoppers.forEach(stop => stop()); owner.audioStoppers.clear();
        ctx.stage.classList.remove('arcane-selfdestruct-crit-flash');
        ctx.stage.style.animation = 'none';
        if (mode === 'kanpo') {
            onBeat && onBeat('kanpo_start',{ entity,conf });
            playSdSample(owner,'sd_snap',{ vol:0.78,rate:0.92 });
            owner.at(35,() => playSdSample(owner,'sd_kanpo_exit',{ vol:0.66 }));
            owner.at(95,() => playSdSample(owner,'sd_kanpo_drop',{ vol:0.56,offsetSec:0.17,maxDurSec:0.72,fadeOutSec:0.24 }));
            owner.anim(ctx.coreEl,[{ transform:'translate(-50%,-50%) scale(1.25)',opacity:0.95 },{ transform:'translate(-50%,-50%) scale(0.08)',opacity:0 }],{ duration:180,easing:'ease-in',fill:'forwards' });
            owner.anim(ctx.crackEl,[{ opacity:0.95 },{ opacity:0 }],{ duration:220,fill:'forwards' });
            owner.anim(ctx.auraEl,[{ opacity:0.7 },{ opacity:0 }],{ duration:220,fill:'forwards' });
            owner.burst(16,() => { const a = rnd(0,6.283),d = rnd(44,78); return { x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,vx:-Math.cos(a)*d/8,vy:-Math.sin(a)*d/8,drag:0.85,decay:0.08,size:rnd(1.8,3),shape:'glowOrb',core:'#e2e8f0',color:conf.main }; });
            ctx.overlayEl.innerHTML = '<div style="position:absolute;left:50%;top:54%;width:92px;height:92px;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,transparent 48%,rgba(148,163,184,0.45) 68%,transparent 76%)"></div>';
            owner.anim(ctx.overlayEl,[{ transform:'scale(1.35)',opacity:0.9 },{ transform:'scale(0.18)',opacity:0 }],{ duration:220,easing:'ease-in',fill:'forwards' });
            owner.at(190,() => { ctx.stage.style.animation = 'arcane-sd-kanpo-fall 0.48s cubic-bezier(0.32,0,0.65,1) forwards'; onBeat && onBeat('kanpo_suppressed',{ entity,conf }); });
            owner.at(690,() => { ctx.restore('dead'); onBeat && onBeat('kanpo_done',{ entity,conf }); });
        } else {
            onBeat && onBeat('subdue_start',{ entity,conf });
            playSdSample(owner,'sd_subdue_stomp',{ vol:0.78,offsetSec:0.1 });
            owner.at(80,() => playSdSample(owner,'sd_crit_tick',{ vol:0.62,rate:0.92,maxDurSec:0.24,fadeOutSec:0.08 }));
            const uid = ++S.uid;
            ctx.overlayEl.innerHTML = `<svg viewBox="0 0 120 120" style="width:100%;height:100%;overflow:visible"><defs><linearGradient id="sd-sub-g-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e2e8f0" stop-opacity="0.9"/><stop offset="50%" stop-color="#38bdf8" stop-opacity="0.55"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0"/></linearGradient></defs><g fill="url(#sd-sub-g-${uid})"><rect x="16" y="30" width="88" height="7" rx="3.5"/><rect x="24" y="54" width="72" height="6" rx="3"/><rect x="30" y="76" width="60" height="5" rx="2.5"/></g></svg>`;
            owner.anim(ctx.overlayEl,[{ transform:'translateY(-28px) scale(1.12)',opacity:0.95 },{ transform:'translateY(8px) scale(0.98)',opacity:0.95,offset:0.45 },{ transform:'translateY(12px) scale(0.95)',opacity:0 }],{ duration:480,easing:'cubic-bezier(0.18,0.9,0.28,1)',fill:'forwards' });
            owner.anim(ctx.coreEl,[{ transform:'translate(-50%,-50%) scale(1.1)',opacity:0.85 },{ transform:'translate(-50%,-50%) scale(0.15)',opacity:0 }],{ duration:200,fill:'forwards' });
            owner.anim(ctx.crackEl,[{ opacity:0.9 },{ opacity:0 }],{ duration:260,fill:'forwards' });
            owner.anim(ctx.auraEl,[{ opacity:0.65 },{ opacity:0 }],{ duration:220,fill:'forwards' });
            ctx.stage.style.animation = 'arcane-sd-subdue-press 0.45s cubic-bezier(0.2,0.85,0.3,1) forwards';
            owner.at(460,() => { ctx.restore('subdued'); onBeat && onBeat('subdued_locked',{ entity,conf }); });
        }
        owner.resume(740); return owner.handle;
    }
    function playSelfDestructInterrupt(entity, mode = 'kanpo', meta = {}, onBeat) {
        clearSelfDestructWarning(entity);
        const conf = sdConf(meta.form || entity?.explode?.type,meta), owner = sdRun(740,entity), ctx = createCorpseStage(entity,conf,owner);
        if (!ctx) { owner.handle.cancel(); return null; }
        return playInterruptOnStage(ctx,mode,entity,conf,onBeat);
    }
    function playSelfDestructWindup(entity, meta = {}, onBeat) {
        clearSelfDestructWarning(entity);
        const form = meta.form || entity?.explode?.type || '群伤', conf = sdConf(form,meta);
        const owner = sdRun(1250,entity), ctx = createCorpseStage(entity,conf,owner);
        if (!ctx) { owner.handle.cancel(); return null; }
        const wms = Object.assign({ unstable:400,gather:600,critical:250 },meta.windupMs);
        const handle = owner.handle;
        owner.hold();
        let released = false, interrupted = false, readyResolve;
        const startAt = __fxDateNow();
        handle.ready = new Promise(resolve => { readyResolve = resolve; });
        handle.onFinish.add(() => readyResolve(false));
        handle.stageCtx = ctx;
        onBeat && onBeat('unstable_start',{ entity,form,conf });
        playSdSample(owner,'sd_crack',{ vol:0.7,rate:0.96 });
        playSdSample(owner,'sd_tear',{ vol:0.48,maxDurSec:0.42,fadeOutSec:0.14 });
        ctx.stage.style.animation = `arcane-sd-dying-tremble ${Math.max(180,Math.round(wms.unstable*0.5))}ms ease-in-out 2`;
        owner.anim(ctx.auraEl,[{ opacity:0 },{ opacity:0.78,offset:0.4 },{ opacity:0.45 }],{ duration:wms.unstable,fill:'forwards' });
        owner.anim(ctx.crackEl,[{ opacity:0.55,transform:'scale(0.95)' },{ opacity:1,transform:'scale(1.06)' }],{ duration:wms.unstable,fill:'forwards' });
        owner.at(wms.unstable,() => {
            if (interrupted) return;
            onBeat && onBeat('gather_start',{ entity,form,conf });
            ctx.stage.style.animation = 'arcane-sd-gather-pulse 0.36s ease-in-out infinite';
            playSdSample(owner,'sd_gather',{ vol:0.66,maxDurSec:wms.gather/1000+0.06,fadeOutSec:0.1 });
            playSdSample(owner,'sd_charge_low',{ vol:0.42,rate:0.94 });
            owner.anim(ctx.coreEl,[{ transform:'translate(-50%,-50%) scale(0.35)',opacity:0.2 },{ transform:'translate(-50%,-50%) scale(1.18)',opacity:0.92 }],{ duration:wms.gather,easing:'cubic-bezier(0.3,0,0.6,1)',fill:'forwards' });
            owner.every(40,() => owner.burst(2,() => { const a = rnd(0,6.283),d = rnd(48,86); return { x:ctx.r.x+Math.cos(a)*d,y:ctx.r.y+Math.sin(a)*d,vx:-Math.cos(a)*d/11,vy:-Math.sin(a)*d/11,drag:0.89,decay:0.08,size:rnd(1.8,3.1),shape:'glowOrb',core:conf.soft,color:conf.main }; }));
            if (entity._sdContestFailed) owner.at(Math.round(wms.gather * 0.55),() => {
                playSdSample(owner,'sd_contest_break',{ vol:0.74,rate:0.98 });
                onBeat && onBeat('contest_failed',{ entity,form });
            });
            owner.at(100,() => { onBeat && onBeat('gather_window',{ entity,form,conf,interruptible:true }); readyResolve(true); });
        });
        handle.release = () => {
            if (released || interrupted || owner.finished || owner.cancelled) return;
            released = true;
            const gatherTail = Math.max(0,wms.unstable+wms.gather - (__fxDateNow() - startAt));
            owner.at(gatherTail,() => {
                owner.intervals.forEach(stopEvery); owner.intervals.clear();
                onBeat && onBeat('critical_start',{ entity,form,conf });
                ctx.stage.style.animation = 'none'; ctx.stage.classList.add('arcane-selfdestruct-crit-flash');
                playSdSample(owner,'sd_crit_tick',{ vol:0.62,rate:1.08,maxDurSec:0.15,fadeOutSec:0.04 });
                owner.at(Math.round(wms.critical*0.4),() => playSdSample(owner,'sd_crit_tick',{ vol:0.68,rate:1.24,maxDurSec:0.14,fadeOutSec:0.04 }));
                owner.at(Math.max(45,wms.critical-55),() => { ctx.stage.classList.remove('arcane-selfdestruct-crit-flash'); ctx.stage.style.animation = 'arcane-sd-crit-snap 0.055s ease-in forwards'; playSdSample(owner,'sd_snap',{ vol:0.78,rate:1.05 }); onBeat && onBeat('critical_snap',{ entity,form,conf }); });
                owner.at(wms.critical,() => { onBeat && onBeat('windup_ready',{ entity,form,conf }); handle.burstResolve && handle.burstResolve(ctx); });
            });
        };
        handle.burstReady = new Promise(resolve => { handle.burstResolve = resolve; handle.onFinish.add(() => resolve(null)); });
        handle.interrupt = (mode = 'kanpo') => {
            if (interrupted || owner.finished || owner.cancelled) return false;
            interrupted = true;
            owner.timers.forEach(id => { clearTimeout(id); S.timers.delete(id); }); owner.timers.clear();
            readyResolve(false); handle.burstResolve(null);
            playInterruptOnStage(ctx,mode,entity,conf,onBeat); return true;
        };
        handle.finish = () => { ctx.restore('dead'); owner.resume(0); };
        return handle;
    }
    function resolveTargetPoint(target, origin) {
        const dom = target && target.identityDom || domOf(target), r = dom && entityVisualRect(dom);
        if (!r || !r.w || !r.h) return null;
        const dir = r.x >= origin.x ? 1 : -1;
        return { dom,r,hit:{ x:r.x,y:r.y-6 },miss:{ x:r.x+dir*(r.w*0.48+26),y:r.y-18 } };
    }

    function burstAoeForm(origin, targetEntries, conf, onBeat, sched, entity, owner) {
        const heroBox = unionRect(targetEntries.map(t => t.dom).filter(Boolean)) || { x: __STAGE.w * 0.42, y: __STAGE.h * 0.72, w: 360 };
        playSdSample(owner,'sd_burst_aoe', { vol: 0.82, maxDurSec: 1.05, fadeOutSec: 0.22 });
        playSdSample(owner,'sd_deep_impact', { vol: 0.62, maxDurSec: 0.85, fadeOutSec: 0.24 });
        shake('heavy'); darken(0.24); sched(320, () => darken(0));
        owner.onClean(() => darken(0));
        sdLayer(owner,`<div class="arcane-fs-anchor" style="left:${origin.x}px;top:${origin.y}px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,#fff 0%,${conf.soft} 28%,${conf.main} 58%,transparent 72%);animation:arcane-hit-flash 0.38s ease-out both;"></div>
          <div class="arcane-fs-anchor" style="left:${origin.x}px;top:${origin.y}px;width:${Math.max(260, heroBox.w * 0.55)}px;height:${Math.max(120, heroBox.w * 0.22)}px;border-radius:50%;background:radial-gradient(ellipse,transparent 46%,${conf.soft} 68%,${conf.main} 82%,transparent 94%);animation:arcane-sd-shock-ellipse 0.46s cubic-bezier(0.12,0.82,0.22,1) both;"></div>`, 520);
        owner.burst(2, i => ({ x: origin.x, y: origin.y, shape: 'ring', size: 2.2 + i * 1.4, decay: 0.055 - i * 0.015, color: i ? conf.main : '#ffffff' }));
        owner.burst(38, () => { const an = Math.random() * 6.283, s = rnd(3.5, 11); return { x: origin.x, y: origin.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s * 0.72 - 1.2, grav: 0.16, drag: 0.92, decay: rnd(0.02, 0.042), size: rnd(1.8, 3.4), shape: 'spark', color: pick(['#ffffff', conf.soft, conf.main]) }; });
        owner.burst(14, () => ({ x: origin.x + rnd(-28, 28), y: origin.y + rnd(-20, 20), vx: rnd(-1.4, 1.4), vy: rnd(-1.8, -0.5), drag: 0.97, decay: 0.012, size: rnd(20, 36), shape: 'gradMist', blend: 'source-over', color: 'rgba(30,27,32,0.58)', mistCore: 'rgba(127,29,29,0.18)' }));
        sched(145, () => {
            targetEntries.forEach(entry => {
                if (entry.dodged) {
                    owner.burst(6, () => ({ x: entry.pt.miss.x, y: entry.pt.miss.y, vx: rnd(-2.5, 2.5), vy: rnd(-1.5, 0.5), drag: 0.92, decay: 0.05, size: 2, shape: 'glowOrb', core: '#cbd5e1', color: 'rgba(148,163,184,0.35)' }));
                    onBeat && onBeat('target_dodge', { entity, target: entry.target, form: '群伤', conf });
                } else {
                    const b = entry.pt.hit;
                    sdLayer(owner,`<div class="arcane-fs-anchor" style="left:${b.x}px;top:${b.y}px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,#fff 0%,${conf.soft} 38%,${conf.glow} 66%,transparent 75%);animation:arcane-hit-flash 0.28s ease-out both;"></div>`, 320);
                    owner.burst(14, () => { const an = Math.random() * 6.283, s = rnd(2, 6.2); return { x: b.x, y: b.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.91, decay: 0.045, size: rnd(1.6, 2.6), shape: 'spark', color: pick(['#fff', conf.soft, conf.main]) }; });
                    onBeat && onBeat('target_hit', { entity, target: entry.target, form: '群伤', conf });
                }
            });
        });
        return 760;
    }
    function burstPierceForm(origin, targetEntries, conf, onBeat, sched, entity, owner) {
        playSdSample(owner,'sd_burst_pierce', { vol: 0.72, maxDurSec: 1.35, fadeOutSec: 0.25 });
        sdLayer(owner,`<div class="arcane-fs-anchor" style="left:${origin.x}px;top:${origin.y}px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,#fff 0%,${conf.soft} 35%,${conf.main} 60%,transparent 72%);animation:arcane-hit-flash 0.26s ease-out both;"></div>`, 300);
        owner.burst(20, () => { const an = Math.random() * 6.283, s = rnd(4, 10); return { x: origin.x, y: origin.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.9, decay: 0.055, size: rnd(1.8, 3), shape: 'spark', color: pick(['#fff', conf.soft, conf.main]) }; });
        targetEntries.forEach((entry, idx) => {
            const delay = idx * 65, dest = entry.dodged ? entry.pt.miss : entry.pt.hit;
            const angDeg = Math.atan2(dest.y - origin.y, dest.x - origin.x) * 180 / Math.PI;
            const pan = Math.max(-0.6, Math.min(0.6, (idx - 1.5) * 0.3));
            sched(delay, () => {
                owner.fly(origin, dest, 12, 195, (x, y) => {
                    owner.addP({ x, y, shape: 'shard', size: 6.5, rot: angDeg * Math.PI / 180, color: '#fff', fill: conf.main });
                    owner.addP({ x, y, shape: 'glowOrb', size: 2.8, decay: 0.18, core: conf.soft, color: conf.main });
                }, () => {
                    if (entry.dodged) {
                        owner.burst(7, () => ({ x: dest.x, y: dest.y, vx: (dest.x - origin.x) * 0.02 + rnd(-1, 1), vy: rnd(-1.5, 1.5), drag: 0.91, decay: 0.06, size: 2.2, shape: 'spark', color: '#cbd5e1' }));
                        onBeat && onBeat('target_dodge', { entity, target: entry.target, form: '群穿', conf });
                        return;
                    }
                    playSdSample(owner,'sd_pierce_shard', { vol: 0.44, maxDurSec: 0.42, fadeOutSec: 0.14, rate: 1.04 + idx * 0.06, pan });
                    const uid = ++S.uid;
                    sdLayer(owner,`<div class="arcane-fs-anchor" style="left:${dest.x}px;top:${dest.y}px;width:96px;height:96px;transform:translate(-50%,-50%) rotate(${angDeg}deg);animation:arcane-fade-life 0.36s ease-out both;">
                      <svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible;">
                        <defs><linearGradient id="sd-prc-${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${conf.soft}" stop-opacity="0.1"/><stop offset="65%" stop-color="${conf.main}"/><stop offset="100%" stop-color="#ffffff"/></linearGradient></defs>
                        <polygon points="18,46 86,50 18,54 28,50" fill="url(#sd-prc-${uid})"/>
                        <polygon points="34,34 62,50 38,44" fill="${conf.soft}" opacity="0.88"/>
                        <polygon points="34,66 62,50 38,56" fill="${conf.soft}" opacity="0.88"/>
                      </svg>
                    </div>`, 390);
                    owner.burst(16, () => { const an = Math.random() * 6.283, s = rnd(2.2, 6.8); return { x: dest.x, y: dest.y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, drag: 0.91, decay: 0.048, size: rnd(1.5, 2.5), shape: 'spark', color: pick(['#fff', conf.soft, conf.main]) }; });
                    onBeat && onBeat('target_hit', { entity, target: entry.target, form: '群穿', conf });
                }, k => k);
            });
        });
        return 640 + Math.max(0, targetEntries.length - 1) * 65;
    }
    function burstFireForm(origin, targetEntries, conf, onBeat, sched, entity, owner) {
        const heroBox = unionRect(targetEntries.map(t => t.dom).filter(Boolean)) || { x: __STAGE.w * 0.42, y: __STAGE.h * 0.72, w: 380 };
        // 纯减益·火海漫卷（多层羽化热浪席卷 + 目标拟真多舌火苗附燃，严禁白闪爆轰与重震屏）
        playSdSample(owner,'sd_burst_fire_wave', { vol: 0.72, maxDurSec: 1.05, fadeOutSec: 0.26 });
        const uid = ++S.uid, dx = heroBox.x - origin.x, dy = heroBox.y - origin.y, ang = Math.atan2(dy, dx);
        const waveW = Math.max(520, heroBox.w * 1.44), waveH = 220;
        const midY = Math.round(origin.y * 0.28 + heroBox.y * 0.72) - 24;
        const heatLayer = sdLayer(owner,`<div class="arcane-fs-anchor arcane-sd-additive" style="left:${heroBox.x}px;top:${heroBox.y - 24}px;width:${Math.round(waveW * 1.05)}px;height:132px;pointer-events:none;">
          <div class="sd-fw-heat" style="width:100%;height:100%;border-radius:50%;background:radial-gradient(ellipse at 50% 52%, rgba(253,224,71,0.34) 0%, rgba(249,115,22,0.34) 40%, rgba(194,65,12,0.14) 68%, transparent 82%);"></div>
        </div>`, 960);
        const heatEl = heatLayer.querySelector('.sd-fw-heat');
        if (heatEl && heatEl.animate) owner.anim(heatEl,[{ transform: 'scaleX(0.35) scaleY(0.55)', opacity: 0 }, { transform: 'scaleX(1.04) scaleY(1.02)', opacity: 1, offset: 0.28 }, { transform: 'scaleX(1.1) scaleY(0.95)', opacity: 0.72, offset: 0.62 }, { transform: 'scaleX(1.14) scaleY(0.84)', opacity: 0 }], { duration: 920, easing: 'cubic-bezier(0.2,0.75,0.3,1)', fill: 'forwards' });
        const waveLayer = sdLayer(owner,`<div class="arcane-fs-anchor arcane-sd-additive" style="left:${heroBox.x}px;top:${midY}px;width:${waveW}px;height:${waveH}px;pointer-events:none;">
          <div class="sd-fw-billow" style="width:100%;height:100%;transform-origin:50% 55%;">
            <svg viewBox="0 0 540 220" style="width:100%;height:100%;overflow:visible;">
              <defs>
                <filter id="sd-fw-turb-${uid}" x="-18%" y="-28%" width="136%" height="156%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.022 0.046" numOctaves="2" seed="11" result="noise"/>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="26" xChannelSelector="R" yChannelSelector="G" result="disp"/>
                  <feGaussianBlur in="disp" stdDeviation="2.6" result="glow"/>
                  <feMerge><feMergeNode in="glow"/><feMergeNode in="disp"/></feMerge>
                </filter>
                <radialGradient id="sd-fw-sheet-${uid}" cx="50%" cy="56%" r="50%">
                  <stop offset="0%" stop-color="#fb923c" stop-opacity="0.92"/>
                  <stop offset="48%" stop-color="#f97316" stop-opacity="0.72"/>
                  <stop offset="78%" stop-color="#dc2626" stop-opacity="0.34"/>
                  <stop offset="100%" stop-color="#7c2d12" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="sd-fw-core-${uid}" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stop-color="#f97316" stop-opacity="0"/>
                  <stop offset="20%" stop-color="#fde047" stop-opacity="0.78"/>
                  <stop offset="50%" stop-color="#fffbeb" stop-opacity="0.94"/>
                  <stop offset="80%" stop-color="#fde047" stop-opacity="0.78"/>
                  <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <g filter="url(#sd-fw-turb-${uid})">
                <ellipse cx="270" cy="122" rx="236" ry="52" fill="url(#sd-fw-sheet-${uid})"/>
                <path d="M52,126 Q270,84 488,126 Q270,158 52,126 Z" fill="url(#sd-fw-core-${uid})"/>
              </g>
            </svg>
          </div>
        </div>`, 800);
        const billowEl = waveLayer.querySelector('.sd-fw-billow');
        if (billowEl && billowEl.animate) {
            const ox = Math.max(-200, Math.min(200, -dx * 0.45)), oy = Math.max(-140, Math.min(40, (origin.y - midY) * 0.65));
            owner.anim(billowEl,[
                { transform: `translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) scale(0.36,0.48)`, opacity: 0 },
                { transform: 'translate(0px,0px) scale(1.04,1.02)', opacity: 1, offset: 0.34 },
                { transform: 'translate(8px,20px) scale(1.12,0.92)', opacity: 0.88, offset: 0.64 },
                { transform: 'translate(16px,38px) scale(1.18,0.7)', opacity: 0 }
            ], { duration: 760, easing: 'cubic-bezier(0.16,0.84,0.28,1)', fill: 'forwards' });
        }
        owner.burst(36, () => { const a = ang + rnd(-0.68, 0.68), s = rnd(3.8, 7.8); return { x: origin.x + rnd(-18, 18), y: origin.y + rnd(-12, 12), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.4, drag: 0.95, decay: 0.023, size: rnd(15, 28), shape: 'flame', color: pick(['#f97316', '#fb923c', '#f59e0b']) }; });
        owner.burst(20, () => { const a = ang + rnd(-0.72, 0.72), s = rnd(4.6, 9.6); return { x: origin.x + rnd(-12, 12), y: origin.y + rnd(-8, 8), vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.94, decay: 0.034, size: rnd(1.5, 2.7), shape: 'spark', color: pick(['#fef08a', '#fb923c', '#fffbeb']) }; });
        sched(120, () => {
            owner.burst(24, () => ({ x: heroBox.x + rnd(-heroBox.w * 0.45, heroBox.w * 0.45), y: midY + rnd(-12, 24), vx: rnd(-1.4, 1.4), vy: rnd(-2.2, -0.4), drag: 0.96, decay: 0.025, size: rnd(14, 26), shape: 'flame', color: pick(['#fb923c', '#f97316', '#fde047']) }));
        });
        let burnSoundCount = 0;
        targetEntries.forEach((entry, idx) => {
            const dest = entry.dodged ? entry.pt.miss : entry.pt.hit;
            const pan = Math.max(-0.6, Math.min(0.6, (idx - 1.5) * 0.3));
            owner.fly(origin, dest, 18, 250 + idx * 35, (x, y) => {
                owner.addP({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), shape: 'flame', size: 12, decay: 0.14, color: '#fb923c' });
            }, () => {
                if (entry.dodged) {
                    owner.burst(5, () => ({ x: dest.x, y: dest.y, vx: rnd(-1.2, 1.2), vy: rnd(-2, -0.6), drag: 0.95, decay: 0.05, size: 7, shape: 'flame', color: '#fdba74' }));
                    onBeat && onBeat('target_dodge', { entity, target: entry.target, form: '群火', stateAttach: '燃烧', conf });
                    return;
                }
                if (entry.immune) { onBeat && onBeat('target_attach', { entity, target:entry.target, form:'群火', conf, immune:true }); return; }
                if (burnSoundCount++ < 2) playSdSample(owner,'sd_burn_attach', { vol: 0.42, maxDurSec: 0.58, fadeOutSec: 0.18, rate: 0.98 + idx * 0.05, pan });
                const fUid = ++S.uid, by = dest.y - 20;
                const burnLayer = sdLayer(owner,`<div class="arcane-fs-anchor" style="left:${dest.x}px;top:${by}px;width:96px;height:96px;pointer-events:none;">
                  <svg viewBox="0 0 96 96" style="width:100%;height:100%;overflow:visible;">
                    <defs>
                      <filter id="sd-bt-gl-${fUid}" x="-28%" y="-28%" width="156%" height="156%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                      <radialGradient id="sd-bt-base-${fUid}" cx="50%" cy="68%" r="48%"><stop offset="0%" stop-color="#fde047" stop-opacity="0.48"/><stop offset="46%" stop-color="#ea580c" stop-opacity="0.34"/><stop offset="100%" stop-color="#7c2d12" stop-opacity="0"/></radialGradient>
                      <linearGradient id="sd-bt-fl-${fUid}" x1="0.2" y1="1" x2="0.8" y2="0"><stop offset="0%" stop-color="#c2410c" stop-opacity="0.92"/><stop offset="48%" stop-color="#f97316" stop-opacity="0.94"/><stop offset="88%" stop-color="#fde047" stop-opacity="0.72"/><stop offset="100%" stop-color="#fffbeb" stop-opacity="0.18"/></linearGradient>
                      <linearGradient id="sd-bt-core-${fUid}" x1="0.3" y1="1" x2="0.7" y2="0"><stop offset="0%" stop-color="#fb923c" stop-opacity="0.85"/><stop offset="50%" stop-color="#fef08a" stop-opacity="0.96"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0.35"/></linearGradient>
                    </defs>
                    <ellipse cx="48" cy="68" rx="40" ry="20" fill="url(#sd-bt-base-${fUid})" style="mix-blend-mode:screen;"/>
                    <g class="sd-bt-tongues" filter="url(#sd-bt-gl-${fUid})" style="transform-origin:48px 78px;">
                      <path d="M46,79 C26,77 20,58 29,43 C32,37 32,30 29,24 C38,31 41,42 40,51 C42,36 52,18 48,10 C60,21 61,39 56,51 C61,45 64,37 64,30 C72,41 72,62 59,74 C55,78 50,79 46,79 Z" fill="url(#sd-bt-fl-${fUid})"/>
                      <path d="M23,60 C17,52 18,40 24,33 C23,42 26,48 29,56 C27,59 25,61 23,60 Z" fill="url(#sd-bt-fl-${fUid})" opacity="0.82"/>
                      <path d="M72,56 C77,48 76,37 70,31 C71,39 68,46 66,53 C68,56 70,58 72,56 Z" fill="url(#sd-bt-fl-${fUid})" opacity="0.78"/>
                      <path d="M47,76 C37,74 35,61 42,49 C45,42 48,34 47,26 C53,36 53,48 51,58 C56,54 58,47 58,42 C62,50 61,66 53,74 C51,75 49,76 47,76 Z" fill="url(#sd-bt-core-${fUid})" style="mix-blend-mode:screen;"/>
                    </g>
                    <polygon class="sd-bt-flare" points="54,28 57,37 66,40 57,43 54,52 51,43 42,40 51,37" fill="#fef9c3" stroke="#fb923c" stroke-width="0.9" opacity="0" style="transform-origin:54px 40px;"/>
                  </svg>
                </div>`, 640);
                const tonguesEl = burnLayer.querySelector('.sd-bt-tongues'), flareEl = burnLayer.querySelector('.sd-bt-flare');
                if (tonguesEl && tonguesEl.animate) owner.anim(tonguesEl,[{ opacity: 0, transform: 'translateY(8px) scaleY(0.45)' }, { opacity: 0.98, transform: 'translateY(-3px) scaleY(1.08)', offset: 0.36 }, { opacity: 0, transform: 'translateY(-11px) scaleY(0.72)' }], { duration: 580, easing: 'ease-out', fill: 'forwards' });
                if (flareEl && flareEl.animate) owner.anim(flareEl,[{ opacity: 0, transform: 'scale(0.35) rotate(0deg)' }, { opacity: 0.95, transform: 'scale(1.12) rotate(18deg)', offset: 0.34 }, { opacity: 0, transform: 'scale(0.55) rotate(36deg)' }], { duration: 240, easing: 'ease-out', fill: 'forwards' });
                owner.burst(8, () => ({ x: dest.x + rnd(-20, 20), y: by + rnd(-8, 10), vx: rnd(-0.6, 0.6), vy: rnd(-2.4, -0.9), drag: 0.96, decay: 0.032, size: rnd(6, 12), shape: 'flame', color: pick(['#f97316', '#fbbf24']) }));
                owner.burst(6, () => ({ x: dest.x + rnd(-16, 16), y: by + rnd(-10, 6), vx: rnd(-0.8, 0.8), vy: rnd(-2.8, -1.1), drag: 0.95, decay: 0.04, size: rnd(1.3, 2.2), shape: 'spark', color: pick(['#fef08a', '#fb923c']) }));
                owner.burst(4, () => ({ x: dest.x + rnd(-14, 14), y: by + rnd(-6, 8), vx: rnd(-0.3, 0.3), vy: rnd(-1.4, -0.6), drag: 0.97, decay: 0.026, size: rnd(7, 11), shape: 'gradMist', blend: 'source-over', color: 'rgba(67,20,7,0.45)', mistCore: 'rgba(28,25,23,0.18)' }));
                onBeat && onBeat('target_attach', { entity, target: entry.target, form: '群火', stateAttach: '燃烧', conf });
            }, k => k * (2 - k));
        });
        return 800;
    }
    function burstPoisonForm(origin, targetEntries, conf, onBeat, sched, entity, owner) {
        const heroBox = unionRect(targetEntries.map(t => t.dom).filter(Boolean)) || { x: __STAGE.w * 0.42, y: __STAGE.h * 0.72, w: 380 };
        // 纯减益·毒囊毒雾翻滚（严禁爆轰感与震屏，禁用空心气泡）
        playSdSample(owner,'sd_burst_poison_sac', { vol: 0.72, maxDurSec: 0.52, fadeOutSec: 0.1 });
        sched(70, () => playSdSample(owner,'sd_burst_poison_mist', { vol: 0.64, offsetSec: 0.055, maxDurSec: 1.05, fadeOutSec: 0.28 }));
        const uid = ++S.uid;
        sdLayer(owner,`<div class="arcane-fs-anchor" style="left:${heroBox.x}px;top:${heroBox.y - 6}px;width:${Math.max(360, heroBox.w * 1.25)}px;height:165px;animation:arcane-fade-life 0.82s ease-out both;">
          <svg viewBox="0 0 360 150" style="width:100%;height:100%;overflow:visible;">
            <defs><radialGradient id="sd-pm-${uid}" cx="50%" cy="55%" r="52%"><stop offset="0%" stop-color="#84cc16" stop-opacity="0.34"/><stop offset="48%" stop-color="#9333ea" stop-opacity="0.28"/><stop offset="100%" stop-color="#3b0764" stop-opacity="0"/></radialGradient></defs>
            <ellipse cx="180" cy="82" rx="168" ry="64" fill="url(#sd-pm-${uid})"/>
          </svg>
        </div>`, 840);
        owner.burst(26, () => ({ x: origin.x + rnd(-26, 26), y: origin.y + rnd(-16, 16), vx: (heroBox.x - origin.x) * rnd(0.008, 0.022) + rnd(-1.4, 1.4), vy: (heroBox.y - origin.y) * rnd(0.008, 0.022) + rnd(-0.8, 0.8), drag: 0.96, decay: 0.014, size: rnd(22, 42), shape: 'gradMist', blend: 'source-over', color: pick(['rgba(168,85,247,0.34)', 'rgba(132,204,22,0.28)']), mistCore: 'rgba(88,28,135,0.16)' }));
        let fogSoundCount = 0;
        targetEntries.forEach((entry, idx) => {
            const dest = entry.dodged ? entry.pt.miss : entry.pt.hit;
            const pan = Math.max(-0.6, Math.min(0.6, (idx - 1.5) * 0.3));
            owner.fly(origin, dest, 54, 270 + idx * 40, (x, y) => {
                owner.addP({ x, y, shape: 'glowOrb', size: 4.5, decay: 0.16, core: '#a3e635', color: '#9333ea' });
            }, () => {
                if (entry.dodged) {
                    owner.burst(6, () => ({ x: dest.x, y: dest.y, vx: rnd(-1, 1), vy: rnd(-0.6, 1.2), drag: 0.94, decay: 0.035, size: 12, shape: 'gradMist', blend: 'source-over', color: 'rgba(168,85,247,0.28)' }));
                    onBeat && onBeat('target_dodge', { entity, target: entry.target, form: '群毒', stateAttach: '中毒', conf });
                    return;
                }
                if (entry.immune) { onBeat && onBeat('target_attach', { entity, target:entry.target, form:'群毒', conf, immune:true }); return; }
                if (fogSoundCount++ < 2) playSdSample(owner,'sd_fog_attach', { vol: 0.38, maxDurSec: 0.55, fadeOutSec: 0.18, rate: 1.02 + idx * 0.04, pan });
                const pUid = ++S.uid;
                sdLayer(owner,`<div class="arcane-fs-anchor" style="left:${dest.x}px;top:${dest.y}px;width:82px;height:82px;animation:arcane-sd-venom-pulse 0.44s ease-in-out 2;">
                  <svg viewBox="0 0 90 90" style="width:100%;height:100%;overflow:visible;">
                    <defs><radialGradient id="sd-ps-${pUid}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#a3e635" stop-opacity="0.72"/><stop offset="52%" stop-color="#9333ea" stop-opacity="0.46"/><stop offset="100%" stop-color="#581c87" stop-opacity="0"/></radialGradient></defs>
                    <circle cx="45" cy="46" r="34" fill="url(#sd-ps-${pUid})"/>
                  </svg>
                </div>`, 620);
                owner.burst(10, () => ({ x: dest.x + rnd(-18, 18), y: dest.y + rnd(-12, 16), vx: rnd(-0.8, 0.8), vy: rnd(-1.4, -0.4), drag: 0.96, decay: 0.022, size: rnd(12, 22), shape: 'gradMist', blend: 'source-over', color: pick(['rgba(132,204,22,0.42)', 'rgba(168,85,247,0.36)']) }));
                onBeat && onBeat('target_attach', { entity, target: entry.target, form: '群毒', stateAttach: '中毒', conf });
            }, k => k);
        });
        return 850;
    }

    function playSelfDestructBurst(entity, targets = [], meta = {}, onBeat, stageCtx = null) {
        const form = meta.form || entity?.explode?.type || '群伤', conf = sdConf(form,meta);
        clearSelfDestructWarning(entity);
        const r = stageCtx && stageCtx.r || entityVisualRect(entity && entity.selfDestructDom || entity);
        if (!r || !r.w || !r.h) return null;
        const owner = sdRun(form === '群穿' ? 800 + targets.length * 65 : 1100,entity), origin = { x:r.x,y:r.y };
        const outcome = normalizeOutcomes(meta.outcomes);
        const entries = targets.filter(Boolean).map(target => ({ target, dodged:outcome(target) === 'dodge',
            immune:form === '群火' ? target.immuneBurn || hasVariantTag(target, '防火') : form === '群毒' ? target.immunePoison || hasVariantTag(target, '耐毒') : false,
            pt:resolveTargetPoint(target,origin) })).filter(entry => entry.pt);
        const sched = owner.at;
        onBeat && onBeat('burst_start',{ entity,form,conf });
        if (stageCtx) owner.at(110,() => stageCtx.restore('dead'));
        if (stageCtx) owner.onClean(() => stageCtx.restore('dead'));
        const dur = form === '群穿' ? burstPierceForm(origin,entries,conf,onBeat,sched,entity,owner)
            : form === '群火' ? burstFireForm(origin,entries,conf,onBeat,sched,entity,owner)
            : form === '群毒' ? burstPoisonForm(origin,entries,conf,onBeat,sched,entity,owner)
            : burstAoeForm(origin,entries,conf,onBeat,sched,entity,owner);
        owner.at(dur + 80,() => onBeat && onBeat('burst_end',{ entity,form,conf }));
        return owner.handle;
    }

/* ===== 救援时刻 v12.10 BEGIN =====
   合并位置：arcaneVfxModule IIFE 内、最终 return 之前。
   依赖正式模块内已有：identityRun / idSample / entityVisualRect / cloneVisualOnly /
   domOf / panOf / shake / addP / S / combatToken / _pipelineFrozen。
   不引入 Demo 的 rescueRun timer engine、飞行弹道、来袭音效与攻击模拟。
   合并后请在模块 return 对象中追加：
   playRescueSheshen, playRescueGrit, playRescueAvoidFatal, clearRescueState
   共用正式 owner 的保持/释放与真实采样，不设置反应等待期限。 */

const R_ACTIVE = new Map();
const RESCUE_STYLE_MEMO = new Map();

function heroWrapOf(entityOrId) {
    const id = entityOrId && typeof entityOrId === 'object' ? entityOrId.id : String(entityOrId || '');
    return id ? document.getElementById('hero-wrap-' + id) : null;
}

function rescueStyle(el, props) {
    if (!el) return function () {};
    let memo = RESCUE_STYLE_MEMO.get(el);
    if (!memo) {
        memo = { count: 0, orig: {} };
        props.forEach(p => { memo.orig[p] = el.style[p]; });
        RESCUE_STYLE_MEMO.set(el, memo);
    } else {
        props.forEach(p => { if (!(p in memo.orig)) memo.orig[p] = el.style[p]; });
    }
    memo.count++;
    let released = false;
    return function () {
        if (released) return;
        released = true;
        memo.count--;
        if (memo.count > 0) return;
        Object.keys(memo.orig).forEach(p => { el.style[p] = memo.orig[p]; });
        RESCUE_STYLE_MEMO.delete(el);
    };
}

function rescueLayer(owner, markup, z, tag) {
    const layer = owner.layer(markup);
    layer.style.zIndex = String(z);
    layer.setAttribute('data-rescue', tag);
    return layer;
}

function dropOwnedLayer(owner, layer) {
    if (!layer) return;
    owner.layers.delete(layer);
    S.layers.delete(layer);
    if (layer.isConnected) layer.remove();
}

function rescueSample(owner, key, opts) {
    return idSample(owner, key, Object.assign({ sampled: true, category: 'B', vol: 0.9, rate: 1 }, opts || {}));
}

function rescueVisualHost(dom) {
    if (!dom) return null;
    return dom.querySelector('.t-unit-avatar') || dom.querySelector('.t-unit-medal') || dom.querySelector('.portrait')
        || dom.querySelector('.bg-gray-900')
        || (dom.classList.contains('hero-card-inner') ? dom : (dom.querySelector('img') && dom.querySelector('img').parentElement))
        || dom;
}

function rescueRun(totalMs, lockKeys) {
    const owner = identityRun(totalMs, 1);
    const keys = (lockKeys || []).filter(Boolean).map(String);
    keys.forEach(k => {
        const prev = R_ACTIVE.get(k);
        if (prev && prev.handle) prev.handle.cancel();
    });
    keys.forEach(k => R_ACTIVE.set(k, owner));
    owner.onClean(() => keys.forEach(k => { if (R_ACTIVE.get(k) === owner) R_ACTIVE.delete(k); }));
    owner.cancel = () => owner.handle.cancel();
    owner.onRestore = fn => owner.onClean(fn);
    owner.valid = () => !owner.cancelled && !owner.finished && owner.token === combatToken && !_pipelineFrozen;
    return owner;
}

function clearRescueState(entity) {
    const id = entity == null ? '' : (typeof entity === 'object' ? entity.id : String(entity));
    const seen = new Set();
    [...R_ACTIVE.entries()].forEach(([key, owner]) => {
        if (id && !key.endsWith(':' + id)) return;
        R_ACTIVE.delete(key);
        if (seen.has(owner)) return;
        seen.add(owner);
        if (owner && owner.handle) owner.handle.cancel();
    });
    if (!id) {
        document.querySelectorAll('.arcane-rescue-blood-wrap').forEach(el => el.remove());
        RESCUE_STYLE_MEMO.clear();
    }
}

/* 舍身最终契约：630ms 到达 → 立即一次钢蓝格挡（无数值）→ +480ms resolve ready；
   保持外 wrap 在 dashX；release() 停驻300ms后以500ms归位 + 目标余光，不再格挡/不再播来袭。 */
function playRescueSheshen(guardian, target, meta, onBeat) {
    const gRect = entityVisualRect(guardian), tRect = entityVisualRect(target);
    if (!gRect || !tRect) return null;
    const gDom = gRect.dom, gVisual = gRect.visualDom || gDom;
    const gId = guardian.id || String(guardian), tId = target.id || String(target);
    const rawDx = tRect.x - gRect.x;
    const dir = rawDx >= 0 ? 1 : -1;
    const dashX = rawDx - dir * Math.min(26, tRect.w * 0.22);
    const blockPt = { x: gRect.x + dashX, y: tRect.y - 16 };
    const gWrap = heroWrapOf(guardian);
    const uid = ++S.uid;
    const owner = rescueRun(1560, ['sheshen:' + gId, 'sheshen:' + tId]);
    owner.hold();

    const releaseVisual = rescueStyle(gVisual, ['transform']);
    const releaseGlow = rescueStyle(gDom, ['borderColor', 'boxShadow']);
    const releaseWrap = gWrap ? rescueStyle(gWrap, ['zIndex', 'transition', 'transform']) : null;
    owner.onClean(() => {
        if (releaseWrap) releaseWrap();
        releaseGlow();
        releaseVisual();
    });
    if (gWrap) { gWrap.style.zIndex = '46'; gWrap.style.transition = 'none'; }

    let blockFired = false, released = false, readySettled = false, doneSettled = false;
    let settleReady, settleDone;
    const ready = new Promise(res => { settleReady = value => { if (readySettled) return; readySettled = true; res(value); }; });
    const done = new Promise(res => { settleDone = value => { if (doneSettled) return; doneSettled = true; res(value); }; });
    owner.handle.onFinish.add(ok => {
        if (!readySettled) settleReady({ ok: false, cancelled: true });
        settleDone(!!ok);
    });
    const beat = phase => {
        if (!onBeat) return;
        try { onBeat(Object.assign({ guardian, target }, phase)); } catch (_) {}
    };

    function triggerBlockImpact() {
        if (blockFired || released || !owner.valid()) return;
        blockFired = true;
        const sLayer = rescueLayer(owner, `<div class="arcane-rescue-anchor" style="left:${blockPt.x}px;top:${blockPt.y}px;width:148px;height:148px;transform:translate(-50%,-50%) rotate(${(-dir * 6).toFixed(1)}deg);"><svg viewBox="0 0 120 120" class="w-full h-full" style="overflow:visible;"><defs><linearGradient id="rescue-shd-${uid}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#0284c7" stop-opacity="0.12"/><stop offset="50%" stop-color="#bae6fd" stop-opacity="0.98"/><stop offset="100%" stop-color="#0284c7" stop-opacity="0.12"/></linearGradient><radialGradient id="rescue-shd-core-${uid}" cx="50%" cy="48%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="38%" stop-color="#38bdf8" stop-opacity="0.55"/><stop offset="100%" stop-color="#0369a1" stop-opacity="0"/></radialGradient><filter id="rescue-shd-glow-${uid}" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="60" cy="56" r="48" fill="url(#rescue-shd-core-${uid})" class="r-shd-bloom"/><g filter="url(#rescue-shd-glow-${uid})" class="r-shd-arc"><path d="M14 76 Q60 10 106 76 Q60 30 14 76 Z" fill="url(#rescue-shd-${uid})"/><path d="M20 70 Q60 16 100 70" fill="none" stroke="#e0f2fe" stroke-width="4" stroke-linecap="round"/></g></svg></div>`, 59, 'sheshen-block');
        owner.anim(sLayer.querySelector('.r-shd-arc'), [{ transform: 'scale(0.55)', opacity: 0 }, { transform: 'scale(1.14)', opacity: 1, offset: 0.18 }, { transform: 'scale(1.03)', opacity: 0.94, offset: 0.72 }, { transform: 'scale(1.16)', opacity: 0 }], { duration: 480, easing: 'cubic-bezier(0.16,0.88,0.3,1)', fill: 'forwards' });
        owner.anim(sLayer.querySelector('.r-shd-bloom'), [{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
        owner.at(490, () => dropOwnedLayer(owner, sLayer));
        shake('heavy');
        owner.anim(gVisual, [{ transform: 'translate3d(0,0,0) scale(1.04)' }, { transform: `translate3d(${(-dir * 13).toFixed(1)}px,4px,0) scale(0.96,1.01)`, offset: 0.24 }, { transform: `translate3d(${(-dir * 10).toFixed(1)}px,3px,0) scale(0.98,1.0)`, offset: 0.62 }, { transform: 'translate3d(0,0,0) scale(1.01)' }], { duration: 480, easing: 'cubic-bezier(0.22,0.84,0.36,1)', fill: 'forwards' });
        owner.burst(26, () => {
            const a = rnd(-2.7, -0.45), sp = rnd(3.0, 8.0);
            return { x: blockPt.x + rnd(-10, 10), y: blockPt.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 0.15, drag: 0.91, decay: rnd(0.042, 0.075), size: rnd(2.0, 3.0), shape: 'spark', color: pick(['#ffffff', '#bae6fd', '#38bdf8', '#7dd3fc']) };
        });
        owner.burst(2, i => ({ x: blockPt.x, y: blockPt.y, shape: 'gradRing', size: i ? 1.5 : 2.0, decay: 0.062 - i * 0.018, color: i ? 'rgba(56,189,248,0.72)' : 'rgba(224,242,254,0.9)' }));
        rescueSample(owner, 'parry_perfect', { vol: 0.98, pan: panOf(blockPt.x) });
        beat({ phase: 'blockImpact', blockPt });
    }

    function release() {
        if (released || !owner.valid()) return done;
        released = true;
        if (!readySettled) settleReady({ ok: true, early: true, blockPt });
        owner.resume(830);
        gDom.style.borderColor = ''; gDom.style.boxShadow = '';
        owner.at(300, () => {
            if (gWrap) owner.anim(gWrap, [{ transform: `translate3d(${dashX.toFixed(1)}px,-2px,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: 500, easing: 'cubic-bezier(0.26,0.82,0.36,1)', fill: 'forwards' });
            owner.anim(gVisual, [{ transform: 'scale(1.01)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(0.26,0.82,0.36,1)', fill: 'forwards' });
            const auraLayer = rescueLayer(owner, `<div class="arcane-rescue-anchor" style="left:${tRect.x}px;top:${tRect.y}px;width:${tRect.w + 10}px;height:${tRect.h + 10}px;border-radius:8px;border:1.5px solid rgba(125,211,252,0.68);box-shadow:inset 0 0 16px rgba(56,189,248,0.28),0 0 18px rgba(56,189,248,0.34);"></div>`, 51, 'sheshen-return');
            owner.anim(auraLayer.firstElementChild, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.95)' }, { opacity: 0.9, transform: 'translate(-50%,-50%) scale(1.01)', offset: 0.28 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.04)' }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
            owner.at(430, () => dropOwnedLayer(owner, auraLayer));
            rescueSample(owner, 'sheshen_armor_step', { offsetSec: 0.34, maxDurSec: 0.27, vol: 0.45, pan: panOf(gRect.x) });
            beat({ phase: 'return' });
        });
        return done;
    }

    // 1. 决意蓄势 0~340ms
    gDom.style.borderColor = '#38bdf8';
    gDom.style.boxShadow = '0 0 20px rgba(56,189,248,0.6)';
    owner.anim(gVisual, [{ transform: 'translate3d(0,0,0) scale(1)' }, { transform: `translate3d(${-dir * 3}px,3px,0) scale(0.99,0.97)`, offset: 0.48 }, { transform: `translate3d(${dir * 4}px,2px,0) scale(1.03)` }], { duration: 340, easing: 'cubic-bezier(0.28,0.82,0.34,1)', fill: 'forwards' });
    owner.burst(16, () => {
        const a = rnd(0, 6.283), d = rnd(34, 58);
        return { x: gRect.x + Math.cos(a) * d, y: gRect.y + Math.sin(a) * d, vx: -Math.cos(a) * d / 13, vy: -Math.sin(a) * d / 13, drag: 0.88, decay: 0.048, size: 2.4, shape: 'glowOrb', color: '#38bdf8', core: '#e0f2fe' };
    });
    rescueSample(owner, 'mx_golem_stomp', { vol: 0.56, rate: 0.92, pan: panOf(gRect.x) });
    owner.at(0, () => beat({ phase: 'resolve' }));

    // 2. 重甲突进 335~630ms
    owner.at(335, () => {
        const gLayer = rescueLayer(owner, '', 44, 'sheshen-dash');
        const ghost = document.createElement('div');
        ghost.className = 'arcane-rescue-ghost';
        ghost.style.cssText = `left:${gRect.left}px;top:${gRect.top}px;width:${gRect.w}px;height:${gRect.h}px;border:1px solid rgba(56,189,248,0.65);box-shadow:0 0 14px rgba(56,189,248,0.45);filter:hue-rotate(10deg) saturate(1.4) brightness(1.1);`;
        ghost.innerHTML = cloneVisualOnly(gDom);
        ghost.style.fontSize = (parseFloat(getComputedStyle(gVisual).fontSize) * gRect.w / (gVisual.offsetWidth || gRect.w)) + 'px';
        gLayer.appendChild(ghost);
        owner.anim(ghost, [{ transform: 'scale(1)', opacity: 0.68 }, { transform: 'scale(0.95)', opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
        owner.at(440, () => dropOwnedLayer(owner, gLayer));
        if (gWrap) owner.anim(gWrap, [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${dashX.toFixed(1)}px,-2px,0)` }], { duration: 290, easing: 'cubic-bezier(0.24,0.82,0.34,1)', fill: 'forwards' });
        owner.anim(gVisual, [{ transform: `translate3d(${dir * 4}px,2px,0) scale(1.03)` }, { transform: 'translate3d(0,0,0) scale(1.04)' }], { duration: 290, easing: 'cubic-bezier(0.24,0.82,0.34,1)', fill: 'forwards' });
        rescueSample(owner, 'sheshen_armor_step', { offsetSec: 0.92, maxDurSec: 0.45, vol: 0.9, pan: panOf((gRect.x + blockPt.x) * 0.5) });
        owner.burst(10, i => ({ x: gRect.x + dashX * (i / 10), y: gRect.y + rnd(-10, 10), vx: -dir * rnd(0.7, 2.0), vy: rnd(-0.4, 0.5), drag: 0.9, decay: 0.065, size: rnd(3, 6), shape: 'glowOrb', color: '#38bdf8', core: '#f0f9ff' }));
        beat({ phase: 'dash', dashX, blockPt });
    });

    // 3. 630ms 到达：统一一次性钢蓝格挡，之后外 wrap 保持
    owner.at(630, triggerBlockImpact);
    // 4. 格挡约 480ms 收回后放行 ready（只表示可进入反应/结算，不归位）
    owner.at(1110, () => {
        if (!owner.valid()) return;
        settleReady({ ok: true, blockPt });
        beat({ phase: 'reactionReady', blockPt, dashX, release });
    });

    Object.assign(owner.handle, {
        guardian, target, owner, dashX, blockPt, ready, done, release,
        isReleased() { return released; }
    });
    return owner.handle;
}

/* 毅力留存：卡内血幕/血轨/竖直血滴 + 380ms 三向猩红交叉圆弧。
   只动画 visualDom 与卡内血层，保留本体标准受击反馈；只播 380ms taunt。 */
function playRescueGrit(entity, meta, onBeat) {
    if (meta && meta.hasPassive === false) return null;
    const dom = domOf(entity), rect = entityVisualRect(entity);
    if (!dom || !rect) return null;
    const id = entity.id || String(entity);
    const visual = rect.visualDom || dom;
    const host = rescueVisualHost(dom) || dom;
    const wrap = heroWrapOf(entity);
    const uid = ++S.uid;
    const owner = rescueRun(1360, ['grit:' + id]);
    const releaseWrap = wrap ? rescueStyle(wrap, ['zIndex']) : null;
    const releaseHost = rescueStyle(host, ['position']);
    const releaseVisual = rescueStyle(visual, ['transform']);
    const releaseGlow = rescueStyle(dom, ['borderColor', 'boxShadow']);
    if (wrap) wrap.style.zIndex = String(Math.max(43, Number(wrap.style.zIndex) || 0));
    if (host !== dom && getComputedStyle(host).position === 'static') host.style.position = 'relative';
    owner.onClean(() => {
        releaseGlow();
        releaseVisual();
        releaseHost();
        if (releaseWrap) releaseWrap();
    });
    const beat = phase => {
        if (!onBeat) return;
        try { onBeat(Object.assign({ entity }, phase)); } catch (_) {}
    };

    const bloodWrap = document.createElement('div');
    bloodWrap.className = 'arcane-rescue-blood-wrap';
    const trails = [[16, 4, 72, 0], [32, 3, 86, 45], [50, 5, 92, 20], [68, 3.5, 78, 70], [83, 3, 64, 95]];
    bloodWrap.innerHTML = `<div class="arcane-rescue-blood-wash" style="opacity:0;"></div>`
        + trails.map(([l, w, h, d], idx) => `<div class="arcane-rescue-blood-trail" data-delay="${d}" data-idx="${idx}" style="left:${l}%;width:${w}px;height:${h}%;transform:translate3d(0,-105%,0) scaleY(0.45);opacity:0;"></div>`).join('');
    host.appendChild(bloodWrap);
    owner.onClean(() => bloodWrap.remove());

    // 0~380ms：致命一击重创 → 暗红血流沿视觉容器滴落
    owner.at(0, () => beat({ phase: 'lethalImpact' }));
    dom.style.borderColor = '#dc2626';
    dom.style.boxShadow = '0 0 22px rgba(220,38,38,0.72), inset 0 0 14px rgba(153,27,27,0.55)';
    owner.anim(visual, [
        { transform: 'translate3d(0,0,0)' },
        { transform: 'translate3d(-3px,2px,0)', offset: 0.25 },
        { transform: 'translate3d(2px,-1px,0)', offset: 0.58 },
        { transform: 'translate3d(0,0,0)' }
    ], { duration: 190, easing: 'ease-out' });
    const washEl = bloodWrap.querySelector('.arcane-rescue-blood-wash');
    owner.anim(washEl, [{ opacity: 0 }, { opacity: 0.92, offset: 0.35 }, { opacity: 0.88 }], { duration: 360, easing: 'ease-out', fill: 'forwards' });
    bloodWrap.querySelectorAll('.arcane-rescue-blood-trail').forEach(tr => {
        const d = Number(tr.dataset.delay || 0);
        owner.anim(tr, [
            { transform: 'translate3d(0,-105%,0) scaleY(0.45)', opacity: 0 },
            { transform: 'translate3d(0,-38%,0) scaleY(0.82)', opacity: 0.96, offset: 0.28 },
            { transform: 'translate3d(0,6%,0) scaleY(1.06)', opacity: 0.92 }
        ], { duration: 380, delay: d, easing: 'cubic-bezier(0.22,0.72,0.34,1)', fill: 'forwards' });
    });
    owner.burst(16, () => {
        const ang = rnd(-2.9, -0.25), spd = rnd(1.8, 5.2);
        return { x: rect.x + rnd(-22, 22), y: rect.top + rnd(8, rect.h * 0.45), vx: Math.cos(ang) * spd * 0.75, vy: Math.sin(ang) * spd * 0.4 + rnd(-0.6, 1.4), grav: 0.22, drag: 0.94, decay: rnd(0.028, 0.048), size: rnd(2.2, 4.2), shape: 'rescueBloodDrop', blend: 'source-over', color: pick(['#7f1d1d', '#b91c1c', '#dc2626']), glint: 'rgba(254,202,202,0.75)' };
    });
    shake('light');

    // 380~1020ms：taunt 同款怒吼 → 三向猩红交叉圆弧 + 放射火花
    owner.at(380, () => {
        dom.style.borderColor = '#ef4444';
        dom.style.boxShadow = '0 0 28px rgba(239,68,68,0.88), 0 0 12px rgba(254,202,202,0.45)';
        owner.anim(visual, [
            { transform: 'translate3d(0,0,0) scale(1)' },
            { transform: 'translate3d(-2px,1px,0) scale(1.04)', offset: 0.22 },
            { transform: 'translate3d(2px,-1px,0) scale(1.022)', offset: 0.48 },
            { transform: 'translate3d(0,0,0) scale(1)' }
        ], { duration: 340, easing: 'ease-out' });
        const corePt = { x: rect.x, y: rect.top + rect.h * 0.48 };
        const arcAngles = [-26, 94, 214];
        const gLayer = rescueLayer(owner, `
          <div class="arcane-rescue-anchor" style="left:${corePt.x}px;top:${corePt.y}px;width:236px;height:236px;">
            <svg viewBox="-118 -118 236 236" class="w-full h-full" style="overflow:visible;">
              <defs>
                <linearGradient id="rescue-grit-arc-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#991b1b" stop-opacity="0.1"/>
                  <stop offset="32%" stop-color="#dc2626" stop-opacity="0.96"/>
                  <stop offset="50%" stop-color="#fff1f2" stop-opacity="1"/>
                  <stop offset="68%" stop-color="#ef4444" stop-opacity="0.96"/>
                  <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0.1"/>
                </linearGradient>
                <filter id="rescue-grit-rf-${uid}" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              ${arcAngles.map((ang, i) => `
              <g transform="rotate(${ang})" filter="url(#rescue-grit-rf-${uid})">
                <g class="r-grit-arc-${i}" style="transform-origin:0 0;">
                  <path d="M -82 -44 Q 0 -144 82 -44 Q 0 -102 -82 -44 Z" fill="url(#rescue-grit-arc-${uid})"/>
                  <path d="M -70 -44 Q 0 -122 70 -44" fill="none" stroke="#fff1f2" stroke-width="3.2" stroke-linecap="round"/>
                </g>
              </g>`).join('')}
            </svg>
          </div>`, 57, 'grit-core');
        arcAngles.forEach((_, i) => {
            owner.anim(gLayer.querySelector('.r-grit-arc-' + i), [
                { transform: 'scale(0.32) rotate(-20deg)', opacity: 0 },
                { transform: 'scale(0.92) rotate(4deg)', opacity: 1, offset: 0.22 },
                { transform: 'scale(1.42) rotate(26deg)', opacity: 0 }
            ], { duration: 480 + i * 35, delay: i * 35, easing: 'cubic-bezier(0.14,0.88,0.28,1)', fill: 'forwards' });
        });
        owner.at(640, () => dropOwnedLayer(owner, gLayer));
        shake('heavy');
        owner.burst(38, i => {
            const ang = (i / 38) * 6.283 + rnd(-0.14, 0.14), spd = rnd(4.2, 11.4);
            return { x: corePt.x + Math.cos(ang) * 14, y: corePt.y + Math.sin(ang) * 14, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, grav: 0.08, drag: 0.91, decay: rnd(0.038, 0.068), size: rnd(1.8, 3.0), shape: pick(['streak', 'spark']), color: pick(['#fff1f2', '#fca5a5', '#ef4444', '#dc2626']) };
        });
        owner.burst(18, () => ({ x: corePt.x + rnd(-26, 26), y: corePt.y + rnd(-12, 18), vx: rnd(-1.4, 1.4), vy: -rnd(1.8, 4.6), drag: 0.94, decay: rnd(0.025, 0.045), size: rnd(3.2, 6.0), shape: 'glowOrb', color: pick(['#991b1b', '#dc2626', '#ef4444']), core: '#fff1f2' }));
        owner.burst(3, i => ({ x: corePt.x, y: corePt.y, shape: 'gradRing', size: i === 0 ? 2.0 : (i === 1 ? 2.5 : 3.0), decay: 0.056 - i * 0.01, color: i === 0 ? 'rgba(255,241,242,0.95)' : (i === 1 ? 'rgba(239,68,68,0.88)' : 'rgba(153,27,27,0.78)') }));
        rescueSample(owner, 'taunt', { vol: 0.96, pan: panOf(rect.x) });
        beat({ phase: 'gritCore', pt: corePt });
    });

    // 1020~1340ms：血痕渐消，保持 HP=1 站立
    owner.at(1020, () => {
        dom.style.borderColor = '';
        dom.style.boxShadow = '';
        owner.anim(bloodWrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
        beat({ phase: 'recovered' });
    });
    return owner;
}

/* 规避致命：44px 卡内错位 + 215ms 碎散；只播 0ms avoid_dash_perfect 与 150ms hide。 */
function playRescueAvoidFatal(entity, meta, onBeat) {
    if (meta && meta.hasPassive === false) return null;
    const dom = domOf(entity), rect = entityVisualRect(entity);
    if (!dom || !rect) return null;
    const id = entity.id || String(entity);
    const visual = rect.visualDom || dom;
    const wrap = heroWrapOf(entity);
    const hitLinePt = { x: rect.x, y: rect.y };
    const dodgeDir = rect.x < __STAGE.w * 0.5 ? -1 : 1;
    const dodgePx = dodgeDir * 44;
    const owner = rescueRun(950, ['avoidFatal:' + id]);
    const releaseWrap = wrap ? rescueStyle(wrap, ['zIndex']) : null;
    const releaseVisual = rescueStyle(visual, ['transform']);
    const releaseGlow = rescueStyle(dom, ['borderColor', 'boxShadow']);
    if (wrap) wrap.style.zIndex = String(Math.max(44, Number(wrap.style.zIndex) || 0));
    owner.onClean(() => {
        releaseGlow();
        releaseVisual();
        if (releaseWrap) releaseWrap();
    });
    const beat = phase => {
        if (!onBeat) return;
        try { onBeat(Object.assign({ entity }, phase)); } catch (_) {}
    };

    rescueSample(owner, 'avoid_dash_perfect', { vol: 0.9, pan: panOf(rect.x) });
    owner.at(150, () => rescueSample(owner, 'hide', { vol: 0.9, pan: panOf(rect.x) }));

    // 50ms：生死一瞬大幅侧向错位闪开，原受击线留驻靛银残影
    owner.at(50, () => {
        const gLayer = rescueLayer(owner, '', 51, 'avoid-ghost');
        const ghost = document.createElement('div');
        ghost.className = 'arcane-rescue-ghost';
        ghost.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.w}px;height:${rect.h}px;border:1.5px solid rgba(129,140,248,0.85);box-shadow:0 0 18px rgba(99,102,241,0.52);filter:hue-rotate(195deg) saturate(1.4) brightness(1.18);`;
        ghost.innerHTML = cloneVisualOnly(dom);
        ghost.style.setProperty('--d', rect.w + 'px'); ghost.style.borderRadius = '50%';
        ghost.style.fontSize = (parseFloat(getComputedStyle(visual).fontSize) * rect.w / (visual.offsetWidth || rect.w)) + 'px';
        gLayer.appendChild(ghost);
        dom.style.borderColor = '#818cf8';
        dom.style.boxShadow = '0 0 16px rgba(129,140,248,0.45)';
        owner.anim(visual, [
            { transform: 'translate3d(0,0,0) rotate(0deg)' },
            { transform: `translate3d(${dodgePx}px,4px,0) rotate(${dodgeDir * 6.5}deg)`, offset: 0.24 },
            { transform: `translate3d(${dodgePx * 0.92}px,3px,0) rotate(${dodgeDir * 5}deg)`, offset: 0.62 },
            { transform: 'translate3d(0,0,0) rotate(0deg)' }
        ], { duration: 760, easing: 'cubic-bezier(0.16,0.9,0.28,1)', fill: 'forwards' });
        owner.anim(ghost, [
            { transform: 'scale(1)', opacity: 0.78 },
            { transform: 'scale(1.03)', opacity: 0.64, offset: 0.35 },
            { transform: `translate3d(${-dodgeDir * 12}px,-4px,0) scale(1.1)`, opacity: 0 }
        ], { duration: 520, easing: 'ease-out', fill: 'forwards' });
        owner.at(540, () => dropOwnedLayer(owner, gLayer));
    });

    // 215ms：原受击线碎散（不另播来袭刀光/来袭音）
    owner.at(215, () => {
        const cLayer = rescueLayer(owner, `<div class="arcane-rescue-anchor" style="left:${hitLinePt.x}px;top:${hitLinePt.y}px;width:94px;height:94px;"><svg viewBox="-47 -47 94 94" class="w-full h-full"><polygon points="-42,0 -5,-3 0,-36 5,-3 42,0 5,3 0,36 -5,3" fill="#e0e7ff" opacity="0.92"/></svg></div>`, 58, 'avoid-shatter');
        owner.anim(cLayer.firstElementChild, [{ transform: 'translate(-50%,-50%) scale(0.3) rotate(12deg)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.18) rotate(32deg)', opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
        owner.at(270, () => dropOwnedLayer(owner, cLayer));
        owner.burst(20, () => {
            const a = rnd(0, 6.283), s = rnd(2.2, 6.4);
            return { x: hitLinePt.x + rnd(-10, 10), y: hitLinePt.y + rnd(-12, 12), vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.91, decay: rnd(0.045, 0.075), size: rnd(1.8, 3.2), shape: 'glowOrb', color: pick(['#818cf8', '#a5b4fc', '#38bdf8']), core: '#f8fafc' };
        });
        beat({ phase: 'avoided', pt: hitLinePt });
    });

    owner.at(780, () => {
        dom.style.borderColor = '';
        dom.style.boxShadow = '';
        beat({ phase: 'reset' });
    });
    return owner;
}
/* ===== 救援时刻 v12.10 END ===== */

    // ===== 召唤三瞬默认演出 v12.12 BEGIN =====
    const SUMMON_DEDICATED_TAGS = new Set(['高阶召唤术', '蝎眼钥匙', '圣域帷幕', '塞赫美特之愠', '逆咒归源镜', '谐律之庇', '静默之域', '碎裂之响']);
    const SUMMON_ACTIVE = new Map();
    const SUMMON_STYLE_MEMO = new WeakMap();
    function isSummonDedicatedFx(fxTag) {
        return !!fxTag && (SUMMON_DEDICATED_TAGS.has(fxTag) || !!WEBM_FX_REGISTRY[fxTag] || isArcaneSkillFx(fxTag));
    }
    function summonWrapOf(entity) {
        if (!entity) return null;
        if (entity.nodeType === 1) return entity.closest('[id^="hero-wrap-"],[id^="enemy-box-"]') || entity;
        const id = entity.id || String(entity);
        return document.getElementById('hero-wrap-' + id) || document.getElementById('enemy-box-' + id) || entity.dom || null;
    }
    function summonSaveStyle(el, props) {
        if (!el) return () => {};
        let entry = SUMMON_STYLE_MEMO.get(el);
        if (!entry) { entry = { count: 0, base: {} }; SUMMON_STYLE_MEMO.set(el, entry); }
        props.forEach(p => { if (!(p in entry.base)) entry.base[p] = el.style[p]; });
        entry.count++;
        let released = false;
        return () => {
            if (released) return;
            released = true;
            if (--entry.count) return;
            Object.keys(entry.base).forEach(p => { el.style[p] = entry.base[p]; });
            SUMMON_STYLE_MEMO.delete(el);
        };
    }
    function cloneSummonVisual(dom) { return cloneVisualOnly(dom); }
    function summonGhost(owner, rect, color, tag) {
        const layer = owner.layer('', 44, tag), ghost = document.createElement('div');
        ghost.className = 'arcane-summon-ghost';
        ghost.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.w}px;height:${rect.h}px;filter:drop-shadow(0 0 10px ${color});`;
        ghost.innerHTML = cloneSummonVisual(rect.dom);
        const visual = rect.visualDom || rect.dom;
        ghost.style.fontSize = (parseFloat(getComputedStyle(visual).fontSize) * rect.w / (visual.offsetWidth || rect.w)) + 'px';
        layer.appendChild(ghost);
        return { layer, ghost };
    }
    function summonRun(totalMs, lockKeys) {
        const keys = (lockKeys || []).filter(Boolean).map(String);
        keys.forEach(k => { const old = SUMMON_ACTIVE.get(k); if (old) old.handle.cancel(); });
        const owner = identityRun(totalMs, 1), layer = owner.layer;
        owner.fixedLife = true;
        owner.valid = () => !owner.cancelled && !owner.finished && owner.token === combatToken && !_pipelineFrozen;
        owner.layer = (html, z = 54, tag = 'summon') => {
            const d = layer(html); d.style.zIndex = String(z); d.dataset.summonTag = tag;
            return d;
        };
        owner.dropLayer = d => dropOwnedLayer(owner, d);
        owner.cancel = () => owner.handle.cancel();
        owner.sound = (key, opts = {}) => {
            const clips = {
                armor_step_1: { key: 'sheshen_armor_step', offsetSec: 0.34 },
                armor_step_2: { key: 'sheshen_armor_step', offsetSec: 0.92 },
                parry: { key: 'parry_perfect' }, avoid_dash2: { key: 'avoid_dash_perfect' }
            };
            const clip = clips[key];
            return playSampleClip(owner, clip ? clip.key : key, Object.assign({ category: 'B', rate: 1 }, clip, opts));
        };
        keys.forEach(k => SUMMON_ACTIVE.set(k, owner));
        owner.onClean(() => keys.forEach(k => { if (SUMMON_ACTIVE.get(k) === owner) SUMMON_ACTIVE.delete(k); }));
        owner.handle.done = new Promise(resolve => owner.handle.onFinish.add(resolve));
        return owner;
    }
    function clearSummonState(entity) {
        const id = entity == null ? '' : (typeof entity === 'object' ? entity.id : String(entity));
        const seen = new Set();
        [...SUMMON_ACTIVE.entries()].forEach(([key, owner]) => {
            if (id && !key.endsWith(':' + id)) return;
            if (seen.has(owner)) return;
            seen.add(owner); owner.handle.cancel();
        });
        if (id) summonEnterPending.delete(id); else summonEnterPending.clear();
        document.querySelectorAll('.arcane-summon-pending').forEach(el => {
            if (!id || el.id === 'hero-wrap-' + id || el.id === 'enemy-box-' + id) el.classList.remove('arcane-summon-pending');
        });
    }
    function buildSummonCircleHtml(uid, w, h, cx, cy, isEnemy) {
        const ringA = isEnemy ? '#c026d3' : '#22d3ee', ringB = isEnemy ? '#a78bfa' : '#818cf8';
        const edgeGlow = isEnemy ? 'rgba(217,70,239,0.52)' : 'rgba(34,211,238,0.48)';
        return `<div class="arcane-summon-anchor summon-circle-wrap" style="left:${cx}px;top:${cy}px;width:${w}px;height:${h}px;">
          <svg viewBox="-120 -60 240 120" class="w-full h-full" style="overflow:visible;">
            <defs>
              <radialGradient id="summon-disc-${uid}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.48"/><stop offset="42%" stop-color="${ringB}" stop-opacity="0.28"/><stop offset="78%" stop-color="${ringA}" stop-opacity="0.16"/><stop offset="100%" stop-color="${ringA}" stop-opacity="0"/></radialGradient>
              <linearGradient id="summon-ring-grad-${uid}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${ringA}" stop-opacity="0.2"/><stop offset="50%" stop-color="#e0f2fe" stop-opacity="0.95"/><stop offset="100%" stop-color="${ringB}" stop-opacity="0.25"/></linearGradient>
              <filter id="summon-circle-blur-${uid}" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <ellipse cx="0" cy="0" rx="114" ry="52" fill="url(#summon-disc-${uid})"/>
            <g transform="scale(1,0.46)" filter="url(#summon-circle-blur-${uid})">
              <g class="summon-ring-outer" style="transform-origin:0 0;"><circle cx="0" cy="0" r="102" fill="none" stroke="url(#summon-ring-grad-${uid})" stroke-width="2.6" stroke-dasharray="28 12 8 12" stroke-linecap="round"/><circle cx="0" cy="0" r="90" fill="none" stroke="${ringA}" stroke-width="1.4" stroke-opacity="0.65" stroke-dasharray="16 14" stroke-linecap="round"/></g>
              <g class="summon-ring-inner" style="transform-origin:0 0;"><polygon points="0,-78 68,39 -68,39" fill="none" stroke="${ringB}" stroke-width="1.6" stroke-opacity="0.58" stroke-linejoin="round"/><polygon points="0,78 68,-39 -68,-39" fill="none" stroke="${ringA}" stroke-width="1.4" stroke-opacity="0.52" stroke-linejoin="round"/><circle cx="0" cy="0" r="46" fill="none" stroke="#e0f2fe" stroke-width="1.5" stroke-opacity="0.72" style="filter:drop-shadow(0 0 6px ${edgeGlow});"/></g>
            </g>
          </svg>
        </div>`;
    }
    function playSummonEnter(caster, targets, meta = {}, onBeat) {
        if (isSummonDedicatedFx(meta.fxTag)) {
            if (onBeat) onBeat({ phase: 'skippedByFxTag', fxTag: meta.fxTag });
            return { doneAt: __fxDateNow(), done: Promise.resolve(true), skipped: true, fxTag: meta.fxTag, cancel() {} };
        }
        const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
        const rects = list.map(entity => ({ entity, rect: entityVisualRect(entity) })).filter(x => x.rect && x.rect.dom.isConnected);
        if (!rects.length) return null;
        const isEnemy = meta.side === 'enemy' || list[0].side === 'enemy';
        const colCore = '#e0f2fe', colArc = isEnemy ? '#e879f9' : '#22d3ee', colViolet = '#a78bfa', uid = ++S.uid;
        const createdAt = __fxDateNow();
        const owner = summonRun(1800 + 350 + rects.length * 110, list.flatMap(t => ['summon:' + t.id, 'enter:' + t.id]));
        owner.hold();
        const beat = (phase, extra = {}) => { if (onBeat) onBeat(Object.assign({ phase, side: isEnemy ? 'enemy' : 'hero' }, extra)); };
        rects.forEach(({ entity, rect }) => {
            const box = summonWrapOf(entity) || rect.dom;
            const restore = summonSaveStyle(box, ['opacity', 'transform', 'transition']);
            box.classList.remove('anim-enter-hero', 'anim-enter-enemy');
            box.style.opacity = '0'; box.style.transition = 'none';
            owner.onClean(() => { restore(); summonEnterPending.delete(entity.id); box.classList.remove('arcane-summon-pending'); });
        });
        const cRect = caster && entityVisualRect(caster);
        if (cRect) {
            const size = Math.round(Math.max(54, Math.min(92, cRect.w * 0.72)));
            const pulse = owner.layer(`<div class="arcane-summon-anchor" style="left:${cRect.x}px;top:${cRect.y}px;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,rgba(224,242,254,0.72) 0%,rgba(167,139,250,0.45) 45%,transparent 72%);"></div>`, 53, 'summon-caster-pulse');
            owner.anim(pulse.firstElementChild, [{ transform: 'translate(-50%,-50%) scale(0.45)', opacity: 0.7 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 0 }], { duration: 210, easing: 'ease-out', fill: 'forwards' });
            owner.at(220, () => owner.dropLayer(pulse));
            owner.burst(6, () => {
                const a = rnd(0, 6.283), d = rnd(20, size * 0.45);
                return { x: cRect.x + Math.cos(a) * d, y: cRect.y + Math.sin(a) * d, vx: -Math.cos(a) * d / 10, vy: -Math.sin(a) * d / 10, drag: 0.86, decay: 0.085, size: 2.4, shape: 'glowOrb', color: colViolet, core: colCore };
            });
        }
        const left = Math.min(...rects.map(x => x.rect.left)), right = Math.max(...rects.map(x => x.rect.right));
        const top = Math.min(...rects.map(x => x.rect.top)), bottom = Math.max(...rects.map(x => x.rect.bottom));
        const anchorPt = { x: (left + right) * 0.5, y: bottom - Math.min(18, rects[0].rect.h * 0.16) };
        const fW = Math.round(Math.max(rects[0].rect.w * 1.7, Math.min(right - left + rects[0].rect.w * 0.72, 540)));
        const fH = Math.round(Math.max(66, Math.min(138, (bottom - top) * 0.48 + 44)));
        const circle = owner.layer(buildSummonCircleHtml(uid, fW, fH, anchorPt.x, anchorPt.y, isEnemy), 52, 'summon-circle');
        const circleWrap = circle.querySelector('.summon-circle-wrap');
        owner.anim(circleWrap, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.55)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 340, easing: 'cubic-bezier(0.2,0.86,0.3,1)', fill: 'forwards' });
        owner.anim(circle.querySelector('.summon-ring-outer'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], { duration: 1800, easing: 'linear', iterations: Infinity });
        owner.anim(circle.querySelector('.summon-ring-inner'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-180deg)' }], { duration: 1500, easing: 'linear', iterations: Infinity });
        owner.sound('light_charge', { vol: 0.72, pan: panOf(anchorPt.x) });
        beat('circle', { anchorPt, count: rects.length });
        const gather = owner.every(55, () => {
            const a = rnd(0, 6.283), rx = rnd(fW * 0.34, fW * 0.54), ry = rnd(fH * 0.3, fH * 0.52);
            const x = anchorPt.x + Math.cos(a) * rx, y = anchorPt.y + Math.sin(a) * ry;
            owner.addP({ x, y, vx: (anchorPt.x - x) / 11, vy: (anchorPt.y - y) / 11, drag: 0.88, decay: 0.068, size: rnd(2.2, 3.6), shape: 'glowOrb', color: pick([colArc, colViolet]), core: colCore });
        });
        let revealed = false, minDone = false, dataReady = !(meta.beforeEnter && typeof meta.beforeEnter.then === 'function');
        function reveal() {
            if (revealed || !owner.valid()) return;
            revealed = true;
            stopEvery(gather); owner.intervals.delete(gather);
            owner.sound('light_impact', { vol: 0.88, pan: panOf(anchorPt.x) });
            beat('riftOpen', { count: rects.length });
            const beamW = Math.round(Math.max(46, Math.min(110, rects[0].rect.w * 0.92)));
            const beamH = Math.round(Math.max(130, Math.min(240, rects[0].rect.h * 2.1)));
            const beam = owner.layer(`<div class="arcane-summon-beam" style="left:${anchorPt.x}px;top:${anchorPt.y + 8}px;width:${beamW}px;height:${beamH}px;background:radial-gradient(ellipse at 50% 85%,rgba(224,242,254,0.92) 0%,rgba(34,211,238,0.52) 32%,rgba(167,139,250,0.28) 62%,transparent 85%);border-radius:50% 50% 30% 30%;"></div><div class="arcane-summon-beam" style="left:${anchorPt.x}px;top:${anchorPt.y + 6}px;width:${Math.round(beamW * 0.28)}px;height:${Math.round(beamH * 0.9)}px;background:linear-gradient(180deg,transparent 0%,#ffffff 38%,#e0f2fe 78%,transparent 100%);"></div>`, 55, 'summon-rift');
            beam.querySelectorAll('.arcane-summon-beam').forEach((b, idx) => owner.anim(b, [{ transform: 'translate(-50%,-100%) scaleX(0.28) scaleY(0.18)', opacity: 0 }, { transform: `translate(-50%,-100%) scaleX(${idx ? 1.15 : 1.08}) scaleY(1.04)`, opacity: 1, offset: 0.34 }, { transform: 'translate(-50%,-100%) scaleX(0.32) scaleY(1.12)', opacity: 0 }], { duration: 280, easing: 'cubic-bezier(0.18,0.88,0.3,1)', fill: 'forwards' }));
            owner.at(295, () => owner.dropLayer(beam));
            owner.burst(2, i => ({ x: anchorPt.x, y: anchorPt.y, shape: 'gradRing', r0: 12, r1: fW * (0.42 + i * 0.12), w: 3 - i, decay: 0.055 - i * 0.015, color: i ? colArc : colCore }));
            let endMs = 0;
            rects.forEach(({ entity, rect }, index) => {
                const fast = index >= 4, delay = fast ? 330 + (index - 3) * 75 : index * 110, formMs = fast ? 200 : 350;
                endMs = Math.max(endMs, delay + formMs);
                owner.at(delay, () => {
                    const box = summonWrapOf(entity) || rect.dom, base = box.style.transform;
                    const size = Math.round(Math.max(66, Math.max(rect.w, rect.h) * (fast ? 1.18 : 1.42)));
                    const glow = owner.layer(`<div class="arcane-summon-anchor" style="left:${rect.x}px;top:${rect.y}px;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.92) 0%,${isEnemy ? 'rgba(232,121,249,0.52)' : 'rgba(34,211,238,0.58)'} 42%,rgba(167,139,250,0.22) 68%,transparent 82%);"></div>`, 56, 'summon-manifest');
                    owner.anim(glow.firstElementChild, [{ transform: 'translate(-50%,-50%) scale(0.35)', opacity: 0.95 }, { transform: 'translate(-50%,-50%) scale(1.22)', opacity: 0 }], { duration: formMs, easing: 'ease-out', fill: 'forwards' });
                    owner.at(formMs + 20, () => owner.dropLayer(glow));
                    summonEnterPending.delete(entity.id); box.classList.remove('arcane-summon-pending'); box.style.opacity = '1';
                    owner.anim(box, [{ transform: `translate3d(0,8px,0) scale(0.76) ${base}`, opacity: 0 }, { transform: `translate3d(0,-2px,0) scale(1.04) ${base}`, opacity: 1, offset: 0.62 }, { transform: base || 'none', opacity: 1 }], { duration: formMs, easing: 'cubic-bezier(0.22,0.88,0.34,1)', fill: 'forwards' });
                    owner.burst(fast ? 3 : 10, () => ({ x: rect.x + rnd(-rect.w * 0.34, rect.w * 0.34), y: rect.y + rnd(-rect.h * 0.25, rect.h * 0.3), vx: rnd(-0.6, 0.6), vy: rnd(-2.2, -0.8), grav: -0.02, drag: 0.95, decay: rnd(0.055, 0.085), size: rnd(2.2, 4), shape: 'glowOrb', color: pick([colArc, colViolet]), core: colCore }));
                    if (!index) owner.sound('link_chime', { vol: 0.32, pan: panOf(rect.x) });
                    beat('manifest', { entity, index, fast, rect });
                });
            });
            owner.at(endMs, () => {
                owner.anim(circleWrap, [{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.08)' }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
                beat('settled', { count: rects.length }); owner.resume(230);
            });
        }
        owner.at(400, () => { minDone = true; if (dataReady) reveal(); else beat('waitingData', { elapsed: 400 }); });
        let waitTimer = null;
        if (!dataReady) {
            const ready = () => {
                if (!owner.valid()) return;
                if (waitTimer != null) { clearTimeout(waitTimer); owner.timers.delete(waitTimer); S.timers.delete(waitTimer); waitTimer = null; }
                dataReady = true; if (minDone) reveal();
            };
            Promise.resolve(meta.beforeEnter).then(ready, ready);
            waitTimer = owner.at(1800, ready); // 只放行视觉，不取消资料读取或合法召唤。
        }
        const lastIndex = rects.length - 1, lastDelay = lastIndex < 4 ? lastIndex * 110 : 330 + (lastIndex - 3) * 75;
        owner.handle.doneAt = createdAt + (dataReady ? 400 : 1800) + Math.max(680, lastDelay + (lastIndex >= 4 ? 200 : 350)) + 230;
        return owner.handle;
    }
    function playSummonExit(entity, meta = {}, onBeat) {
        if (!entity) return null;
        if (meta.exitCause === 'reviveIntercept' || meta.exitCause === 'explode' || entity.explode) {
            if (onBeat) onBeat({ phase: 'exitBypassed', reason: meta.exitCause || 'explode', entity });
            return null;
        }
        const id = entity.id || String(entity), active = SUMMON_ACTIVE.get('summon:' + id);
        if (!meta.fromGuard && active && active.handle.exit && !active.handle.isReleased()) { active.handle.exit(meta, onBeat); return active.handle; }
        if (active && active.handle.isSummonExit) return active.handle;
        const preRect = meta.anchorRect || entityVisualRect(entity);
        if (!preRect || !preRect.dom.isConnected) return null;
        if (active && active.handle.exit) meta = Object.assign({}, meta, { anchorRect: preRect, holdTransform: (summonWrapOf(entity) || preRect.dom).style.transform });
        const owner = summonRun(840, ['summon:' + id, 'exit:' + id]);
        const rect = meta.anchorRect || entityVisualRect(entity), dom = rect.dom, box = summonWrapOf(dom) || dom;
        const restoreBox = summonSaveStyle(box, ['opacity', 'transform', 'transition', 'filter']);
        const restoreDom = dom !== box ? summonSaveStyle(dom, ['opacity', 'transform', 'transition', 'filter']) : () => {};
        owner.onClean(() => { restoreDom(); restoreBox(); });
        box.classList.remove('arcane-summon-pending', 'anim-enter-hero', 'anim-enter-enemy');
        dom.classList.remove('breathe'); box.style.transition = 'none';
        if (meta.holdTransform) box.style.transform = meta.holdTransform;
        const base = dom.style.transform;
        const beat = (phase, extra = {}) => { if (onBeat) onBeat(Object.assign({ phase, entity }, extra)); };
        const isEnemy = meta.side === 'enemy' || entity.side === 'enemy';
        const colCore = '#e0f2fe', colArc = isEnemy ? '#e879f9' : '#22d3ee', colViolet = '#a78bfa';
        const uid = ++S.uid, footY = rect.bottom - Math.min(12, rect.h * 0.1);
        const rW = Math.round(Math.max(76, rect.w * 1.45)), rH = Math.round(Math.max(32, rW * 0.44));
        owner.sound('resist_phantom', { vol: 0.38, rate: 0.94, pan: panOf(rect.x) });
        beat('destabilize', { rect });
        const glow = owner.layer(`<div class="arcane-summon-anchor" style="left:${rect.x}px;top:${rect.y}px;width:${Math.round(rect.w * 1.25)}px;height:${Math.round(rect.h * 1.25)}px;border-radius:50%;background:radial-gradient(circle,rgba(224,242,254,0.68) 0%,rgba(167,139,250,0.34) 46%,transparent 76%);"></div>`, 55, 'summon-exit-glow');
        owner.anim(glow.firstElementChild, [{ transform: 'translate(-50%,-50%) scale(0.7)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 0.85, offset: 0.32 }, { transform: 'translate(-50%,-50%) scale(1.18)', opacity: 0 }], { duration: 480, easing: 'ease-out', fill: 'forwards' });
        owner.at(490, () => owner.dropLayer(glow));
        owner.anim(dom, [{ transform: base || 'none', opacity: 1 }, { transform: `translate3d(-3px,-1px,0) scale(1.02,0.98) ${base}`, opacity: 0.88, offset: 0.35 }, { transform: `translate3d(3px,-3px,0) scale(0.98,1.03) ${base}`, opacity: 0.95, offset: 0.72 }, { transform: `translate3d(0,-5px,0) scale(0.96,1.04) ${base}`, opacity: 0.75 }], { duration: 190, easing: 'ease-in-out', fill: 'forwards' });
        const ring = owner.layer(`<div class="arcane-summon-anchor" style="left:${rect.x}px;top:${footY}px;width:${rW}px;height:${rH}px;"><svg viewBox="-60 -26 120 52" class="w-full h-full" style="overflow:visible;"><defs><radialGradient id="summon-rem-${uid}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${colArc}" stop-opacity="0.45"/><stop offset="65%" stop-color="${colViolet}" stop-opacity="0.22"/><stop offset="100%" stop-color="${colViolet}" stop-opacity="0"/></radialGradient></defs><ellipse cx="0" cy="0" rx="54" ry="20" fill="url(#summon-rem-${uid})" stroke="${colArc}" stroke-opacity="0.55" stroke-width="1.2" stroke-dasharray="10 7"/></svg></div>`, 52, 'summon-exit-remnant');
        owner.anim(ring.firstElementChild, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.85)' }, { opacity: 0.72, transform: 'translate(-50%,-50%) scale(1)', offset: 0.25 }, { opacity: 0.45, transform: 'translate(-50%,-50%) scale(0.92)', offset: 0.72 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(0.45)' }], { duration: 740, easing: 'ease-out', fill: 'forwards' });
        owner.at(160, () => {
            owner.sound('rage_exit', { vol: 0.30, rate: 1.08, maxDurSec: 0.48, fadeOutSec: 0.2, pan: panOf(rect.x) });
            beat('unravel', { rect });
            owner.anim(dom, [{ transform: `translate3d(0,-5px,0) scale(0.96,1.04) ${base}`, opacity: 0.75 }, { transform: `translate3d(4px,-14px,0) scale(0.76,1.08) ${base}`, opacity: 0.22, offset: 0.65 }, { transform: `translate3d(8px,-22px,0) scale(0.56,1.12) ${base}`, opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' });
            owner.burst(Math.max(18, Math.min(28, Math.round(rect.w * 0.28))), () => ({ x: rect.x + rnd(-rect.w * 0.38, rect.w * 0.38), y: rect.y + rnd(-rect.h * 0.35, rect.h * 0.32), vx: rnd(0.25, 1.45), vy: rnd(-2.5, -0.9), grav: -0.04, drag: 0.96, decay: rnd(0.032, 0.056), size: rnd(2.2, 4.4), shape: 'glowOrb', color: pick([colArc, colViolet, colCore]), core: colCore }));
        });
        owner.at(560, () => beat('extinguish'));
        owner.at(750, () => { owner.dropLayer(ring); beat('vacated'); });
        owner.handle.isSummonExit = true;
        return owner.handle;
    }
    function playSummonGuard(guardian, ownerEntity, meta = {}, onBeat) {
        if (!guardian || !ownerEntity || meta.incomingLethal === false) return null;
        const gRect = entityVisualRect(guardian), oRect = entityVisualRect(ownerEntity);
        if (!gRect || !oRect) return null;
        const gId = guardian.id || String(guardian), oId = ownerEntity.id || String(ownerEntity);
        const shoulderSide = oRect.x >= gRect.x ? -1 : 1;
        const interceptX = oRect.x + shoulderSide * Math.min(20, oRect.w * 0.16), interceptY = oRect.y - Math.min(30, oRect.h * 0.26);
        const dashX = interceptX - gRect.x, dashY = interceptY - gRect.y, dir = dashX >= 0 ? 1 : -1;
        const blockPt = { x: interceptX, y: interceptY - Math.min(10, gRect.h * 0.12) };
        const gDom = gRect.dom, gWrap = summonWrapOf(guardian) || gDom, base = gWrap.style.transform;
        const dashTransform = `translate3d(${dashX.toFixed(1)}px,${dashY.toFixed(1)}px,0) ${base}`;
        const owner = summonRun(920, ['summon:' + gId, 'guard:' + oId]), uid = ++S.uid;
        owner.hold();
        const restoreWrap = summonSaveStyle(gWrap, ['zIndex', 'transition', 'transform']);
        const restoreDom = summonSaveStyle(gDom, ['transform', 'transition', 'filter']);
        owner.onClean(() => { restoreDom(); restoreWrap(); });
        gWrap.style.zIndex = '46'; gWrap.style.transition = 'none'; gDom.style.filter = 'drop-shadow(0 0 12px rgba(56,189,248,0.8))';
        let settled = false, released = false, impactAt = 0, outcome = meta.guardOutcome || 'survived', chaining = false, exitHandle = null;
        let resolveReady, resolveDone;
        const ready = new Promise(resolve => { resolveReady = resolve; });
        const done = new Promise(resolve => { resolveDone = resolve; });
        const exitBeats = [], exitMeta = {};
        const cancelRun = owner.handle.cancel;
        owner.handle.cancel = () => { cancelRun(); if (exitHandle) exitHandle.cancel(); resolveDone(false); };
        owner.handle.onFinish.add(ok => { resolveReady({ ok: !!ok, blockPt }); if (!chaining) resolveDone(!!ok); });
        const beat = (phase, extra = {}) => { if (onBeat) onBeat(Object.assign({}, extra, { phase, guardian, owner: ownerEntity, guardOutcome: outcome })); };
        const shieldSize = Math.round(Math.max(94, Math.min(118, gRect.w * 1.4)));
        function impact(finalOutcome = 'hit', opts = {}) {
            if (settled || !owner.valid()) return;
            settled = true; impactAt = __fxDateNow();
            if (finalOutcome === 'secondDodge') {
                outcome = 'secondDodge';
                if (!opts.suppressDodgeFx) {
                    const live = entityVisualRect(guardian) || gRect, ghost = summonGhost(owner, live, '#67e8f9', 'summon-dodge-ghost');
                    owner.anim(ghost.ghost, [{ transform: 'scale(1)', opacity: 0.7 }, { transform: 'translate3d(0,4px,0) scale(0.92)', opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
                    owner.at(300, () => owner.dropLayer(ghost.layer));
                    owner.anim(gDom, [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${-dir * 26}px,-7px,0) scale(1.03)`, offset: 0.32 }, { transform: 'translate3d(0,0,0)' }], { duration: 320, easing: 'cubic-bezier(0.2,0.88,0.32,1)' });
                    owner.burst(12, () => ({ x: blockPt.x + rnd(-10, 10), y: blockPt.y, vx: rnd(-2.5, 2.5), vy: rnd(-2.2, 0.8), drag: 0.9, decay: 0.07, size: rnd(2.2, 4), shape: 'glowOrb', color: '#67e8f9', core: '#ffffff' }));
                }
                if (!opts.silentDodge) { owner.sound('avoid_dash2', { vol: 0.72, pan: panOf(blockPt.x) }); owner.at(100, () => owner.sound('hide', { vol: 0.65, maxDurSec: 0.35, pan: panOf(blockPt.x) })); }
                beat('secondDodge', { blockPt });
                return;
            }
            const tilt = -dir * 5;
            const shield = owner.layer(`<div class="arcane-summon-anchor" style="left:${blockPt.x}px;top:${blockPt.y}px;width:${shieldSize}px;height:${shieldSize}px;transform:translate(-50%,-50%) rotate(${tilt}deg);"><svg viewBox="0 0 120 120" class="w-full h-full" style="overflow:visible;"><defs><linearGradient id="summon-shd-${uid}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#0284c7" stop-opacity="0.14"/><stop offset="50%" stop-color="#bae6fd" stop-opacity="0.96"/><stop offset="100%" stop-color="#0284c7" stop-opacity="0.14"/></linearGradient><radialGradient id="summon-shd-core-${uid}" cx="50%" cy="48%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.92"/><stop offset="40%" stop-color="#38bdf8" stop-opacity="0.52"/><stop offset="100%" stop-color="#0369a1" stop-opacity="0"/></radialGradient><filter id="summon-shd-glow-${uid}" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="60" cy="56" r="44" fill="url(#summon-shd-core-${uid})" class="s-shd-bloom"/><g filter="url(#summon-shd-glow-${uid})" class="s-shd-arc"><path d="M16 74 Q60 12 104 74 Q60 32 16 74 Z" fill="url(#summon-shd-${uid})"/><path d="M22 68 Q60 18 98 68" fill="none" stroke="#e0f2fe" stroke-width="3.6" stroke-linecap="round"/></g></svg></div>`, 59, 'summon-guard-shield');
            owner.anim(shield.querySelector('.s-shd-arc'), [{ transform: 'scale(0.55)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.18 }, { transform: 'scale(1.02)', opacity: 0.92, offset: 0.72 }, { transform: 'scale(1.14)', opacity: 0 }], { duration: 360, easing: 'cubic-bezier(0.16,0.88,0.3,1)', fill: 'forwards' });
            owner.anim(shield.querySelector('.s-shd-bloom'), [{ transform: 'scale(0.3)', opacity: 0.95 }, { transform: 'scale(1.32)', opacity: 0 }], { duration: 310, easing: 'ease-out', fill: 'forwards' });
            owner.at(370, () => owner.dropLayer(shield));
            owner.sound('parry', { vol: 0.84, pan: panOf(blockPt.x) });
            owner.burst(16, () => { const a = rnd(-2.7, -0.45), sp = rnd(2.6, 6.8); return { x: blockPt.x + rnd(-8, 8), y: blockPt.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 0.14, drag: 0.91, decay: rnd(0.048, 0.082), size: rnd(1.8, 2.8), shape: 'spark', color: pick(['#ffffff', '#bae6fd', '#38bdf8', '#7dd3fc']) }; });
            owner.burst(2, i => ({ x: blockPt.x, y: blockPt.y, shape: 'gradRing', r0: 8, r1: 52 + i * 20, w: 3.2 - i, decay: 0.068 - i * 0.018, color: i ? 'rgba(56,189,248,0.72)' : 'rgba(224,242,254,0.9)' }));
            beat('blockImpact', { blockPt, finalOutcome }); beat('guardHold', { blockPt });
        }
        function doReturn() {
            gDom.style.filter = '';
            gWrap.style.transform = base;
            owner.anim(gWrap, [{ transform: dashTransform }, { transform: base || 'none' }], { duration: 320, easing: 'cubic-bezier(0.26,0.82,0.36,1)', fill: 'forwards' });
            const aura = owner.layer(`<div class="arcane-summon-aura" style="left:${oRect.x}px;top:${oRect.y}px;width:${oRect.w + 10}px;height:${oRect.h + 10}px;"></div>`, 51, 'summon-owner-aura');
            owner.anim(aura.firstElementChild, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.95)' }, { opacity: 0.88, transform: 'translate(-50%,-50%) scale(1.01)', offset: 0.28 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.04)' }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
            owner.at(430, () => owner.dropLayer(aura));
            owner.sound('armor_step_1', { vol: 0.38, rate: 1.08, maxDurSec: 0.28, pan: panOf(gRect.x) });
            beat('return', { blockPt });
        }
        function release(finalOutcome = outcome) {
            if (released || !owner.valid()) return done;
            released = true; outcome = finalOutcome;
            if (finalOutcome === 'explode') { cancelRun(); return done; }
            impact(finalOutcome === 'secondDodge' ? 'secondDodge' : 'hit');
            if (finalOutcome === 'guardianDown') {
                owner.at(210, () => {
                    const rect = entityVisualRect(guardian);
                    chaining = true; cancelRun();
                    exitHandle = playSummonExit(guardian, Object.assign({}, exitMeta, { exitCause: 'killed', fromGuard: true, anchorRect: rect, holdTransform: dashTransform }), ev => { beat('exitChain:' + ev.phase, ev); exitBeats.forEach(fn => fn(ev)); });
                    if (exitHandle) exitHandle.done.then(resolveDone); else resolveDone(true);
                });
                return done;
            }
            const delay = Math.max(0, impactAt + (finalOutcome === 'secondDodge' ? 330 : 360) - __fxDateNow());
            owner.at(delay, doReturn); owner.resume(delay + 450);
            return done;
        }
        const ghost = summonGhost(owner, gRect, '#38bdf8', 'summon-guard-ghost');
        owner.anim(ghost.ghost, [{ transform: 'scale(1)', opacity: 0.62 }, { transform: 'scale(0.9)', opacity: 0 }], { duration: 290, easing: 'ease-out', fill: 'forwards' });
        owner.at(300, () => owner.dropLayer(ghost.layer));
        owner.anim(gWrap, [{ transform: base || 'none' }, { transform: dashTransform }], { duration: 180, easing: 'cubic-bezier(0.22,0.88,0.32,1)', fill: 'forwards' });
        gWrap.style.transform = dashTransform;
        owner.sound('armor_step_2', { vol: 0.68, rate: 1.08, maxDurSec: 0.34, pan: panOf((gRect.x + blockPt.x) * 0.5) });
        owner.burst(8, i => ({ x: gRect.x + dashX * (i / 8), y: gRect.y + dashY * (i / 8) + rnd(-6, 6), vx: -dashX * 0.015 + rnd(-0.6, 0.6), vy: -dashY * 0.015 + rnd(-0.5, 0.5), drag: 0.9, decay: 0.08, size: rnd(2.2, 4.2), shape: 'glowOrb', color: '#38bdf8', core: '#e0f2fe' }));
        beat('dash', { dashX, dashY, blockPt });
        owner.at(180, () => {
            resolveReady({ ok: true, blockPt }); beat('reactionReady', { blockPt, release });
            if (!meta.deferredRelease) release(outcome);
        });
        Object.assign(owner.handle, { ready, done, impact, release, blockPt, dashX, dashY, guardian, isReleased: () => released,
            exit(meta2, cb) { Object.assign(exitMeta, meta2); if (cb) exitBeats.push(cb); release('guardianDown'); } });
        return owner.handle;
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
        atmoAudio.stop(true);
        CombatAudioMixer.clear(); audioCtx = null; sfxBus = null; sfxVerb = null; sfxNoise = null; sfxIR = null; synthBuses.clear();
    }
    return { playEnemyWindup, playAttackIdentityFx, playArcaneProjectile, playHitFeedback, classifyHit, syncHitBar,
      CombatAudioDirector, clearHitFeedback, warmIdentitySample, playArsenicShot, clearArcaneFx,
      syncStatusLayers, clearStatusLayers, playStatusTickFx, syncVariantState, clearVariantState, playVariantTriggerFx, isEntityVariantLocked,
      playSummonEnter, playSummonExit, playSummonGuard,
      playRescueGrit, playRescueAvoidFatal, clearRescueState,
      playVariantResistFx, playCounterAttackL1,
      playSelfDestructWindup, playSelfDestructBurst, playSelfDestructInterrupt, clearSelfDestructState, syncSelfDestructWarning,
      setIdentitySfx, setVariantSfx, setStatusSfx, setSelfDestructSfx, clearSummonState, playLingFeng,
      playIsis, playFeiShaHuaJia, playXieYanKey, playHarmonyShelter, playSilenceDomain, playShatterResonance,
      playZheYingBu, playStrangeConch,
      playMeleeGroup, playRangedGroup, playSpellGroup };
  })();
CombatEvents.on(EVENTS.DAMAGE_RESOLVED, arcane.CombatAudioDirector.consume);
CombatEvents.on(EVENTS.DODGE_RESOLVED, arcane.CombatAudioDirector.consume);

  return Object.assign({}, arcane, {
    CombatAudioMixer, audioUrls, playSound, playCustomAudio, HERO_VOICE_LINES, pickHeroVoice, AVATAR_MAP, fxEngine, atmoAudio,
    ASSET_BASE, HERO_VOICE_BASE, itemFxAssetUrl,
    playGenericSupportFx, playExecutionAnimation, playEnemyUltimateCutin, clearMoments, playPowerCounterEffect,
    RLYEH_FOG_CLOUD_URL, playEldritchWhisper, buildRlyehSedimentFxHtml, buildTitanGazeFxHtml,
    clearArcaneFx() { clearPowerCounterEffects(); supportHandles.forEach(handle => handle.cancel()); clearMoments(); arcane.clearArcaneFx(); playRandomStandardGunshot.last = null; },
    setToken(t) { if (t !== combatToken) { clearPowerCounterEffects(); supportHandles.forEach(handle => handle.cancel()); clearMoments(); playRandomStandardGunshot.last = null; } combatToken = t; },
    getToken() { return combatToken; },
    setRoster(h, e) { heroesData = h; enemiesData = e; },
  });
}
