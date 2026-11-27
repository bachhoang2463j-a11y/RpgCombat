// ==========================================
// 战棋单位视图：圆形头像（正立）/ 敌方 emoji + 阵营外环 + 独立朝向箭头 + 名字/资源条 + 接地阴影
// 分层（自外向内，各层 transform 互不覆盖）：
//   root(left/top = 显示位置，世界美术 px，随相机) → billboard(近景随地图放大，远景反缩放保可读)
//     → sprite(受击后坐力/前摇/闪光，供视听底座 domOf 使用) → medal(外环) → avatar/emoji + direction(只转朝向)
// 规则位置与显示位置分离：placement 是权威落点；motion 期间 lockMotion 后只由插值驱动 left/top，不回写规则。
// 头像链：P01 明确 img → 回合制 AVATAR_MAP（四名正式角色）→ 无则显示"头像缺失"并上报，不用首字/默认人像代替。
// ==========================================

import { unitCenter } from './geometry.mjs';

const EMOJI_RE = /^((?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}))*)\s*/u;

// 名字前缀 emoji 拆分（沿用回合制"emoji+名字"写法）
export function splitEmojiName(raw) {
  const s = String(raw || '').trim();
  const m = s.match(EMOJI_RE);
  return m ? { emoji: m[1], name: s.slice(m[0].length).trim() || s } : { emoji: null, name: s };
}

// 头像 URL：显式 img 优先，其次宿主提供的权威映射；均无返回 null（由视图显示缺失状态）
export function resolveAvatarUrl(unit, avatarOf) {
  if (unit.img) return unit.img;
  if (typeof avatarOf === 'function') {
    const url = avatarOf(unit.name);
    if (url) return url;
  }
  const mms = (typeof window !== 'undefined') ? window.MMSImages : null;
  if (mms && typeof mms.resolveAvatar === 'function') {
    const url = mms.resolveAvatar(unit.name);
    if (url) return url;
  }
  return null;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function avatarScaleForZoom(scale) { return 1 / Math.min(1, scale); }

// 飞行羽翼（灵风术收尾白翼的常驻版）：同原版三排羽片几何，单侧画好后镜像；尺寸随头像（--d），随头像远景反缩放，不随地图形变
const WINGS_HTML = (() => {
  const feather = (rx, ry, rot, L, wd, op) => '<path d="M0,0 Q' + wd + ',' + (-L * 0.55).toFixed(1) + ' 0,' + (-L).toFixed(1) + ' Q' + (-wd) + ',' + (-L * 0.55).toFixed(1) + ' 0,0 Z" transform="translate(' + rx.toFixed(1) + ',' + ry.toFixed(1) + ') rotate(' + rot.toFixed(1) + ')" fill="rgba(255,255,255,' + op + ')" stroke="rgba(255,255,255,0.85)" stroke-width="1"/>';
  const side = [[0, 11, 135, 13, 0.32], [1, 9, 95, 12, 0.42], [2, 7, 60, 10, 0.56]].map(([row, n, Lmax, wd, op]) =>
    Array.from({ length: n }, (_, i) => { const k = i / (n - 1); return feather(12 + k * (30 - row * 6), -row * 6 - k * 14, 8 + k * 72, Lmax * (1 - k * 0.38), wd, op); }).join('')).join('');
  return '<i class="t-unit-wings" aria-hidden="true"><svg viewBox="-165 -150 330 200">' +
    [-1, 1].map(sg => '<g transform="scale(' + sg + ',1)"><g class="t-wing">' + side + '</g></g>').join('') + '</svg></i>';
})();

export function createUnitView(parent, deps) {
  const { scope, metersPerArtPx, onAvatarStatus } = deps;
  const Q = 1 / metersPerArtPx;
  const nodes = new Map();
  let cameraScale = 1;
  const SIDE_CLASS = { hero: 't-side-hero', enemy: 't-side-enemy' };

  function medalDiameter(fp) { return fp.width > 1 || fp.height > 1 ? 56 : 42; }

  function buildNode(unit, placement) {
    const fp = unit.footprint || { width: 1, height: 1 };
    const c = unitCenter(placement, fp);
    const big = fp.width > 1 || fp.height > 1;
    const d = medalDiameter(fp);

    const root = document.createElement('div');
    root.className = 't-unit ' + (SIDE_CLASS[unit.side] || 't-side-hero') + (big ? ' t-unit-big' : '');
    root.setAttribute('data-unit-id', unit.id);
    root.style.cssText = 'position:absolute; left:' + (c.x * Q) + 'px; top:' + (c.y * Q) + 'px; width:0; height:0;';

    // 真实占地（世界尺寸，不反向缩放）：多格单位一个框；接地阴影按占地尺寸
    const ground = document.createElement('div');
    ground.className = 't-unit-ground';
    ground.style.cssText = 'left:' + (fp.width * Q / -2) + 'px; top:' + (fp.height * Q / -2) + 'px; width:' + (fp.width * Q) + 'px; height:' + (fp.height * Q) + 'px;';
    ground.innerHTML = '<i class="t-unit-shadow"></i>' + (big ? '<i class="t-unit-footprint"></i>' : '') + '<i class="t-unit-ring-floor"></i>';
    root.appendChild(ground);

    const billboard = document.createElement('div');
    billboard.className = 't-unit-billboard';
    billboard.style.transform = 'translate(-50%,-50%) scale(' + avatarScaleForZoom(cameraScale) + ')';
    billboard.style.setProperty('--d', d + 'px');
    const face = unit.emoji
      ? '<div class="t-unit-emoji" aria-hidden="true">' + escapeHtml(unit.emoji) + '</div>'
      : '<div class="t-unit-avatar"><img alt="" draggable="false"><b class="t-avatar-missing-mark">头像缺失</b></div>';
    // 头像图床（imgur.la）对外站 Referer 返回 403：一律不带 Referer 加载（URL 与托管不变）
    billboard.innerHTML =
      '<div class="t-unit-name">' + escapeHtml(unit.name) + '</div>' +
      '<div class="t-unit-sprite" data-arcane-target-id="' + escapeHtml(unit.id) + '" style="--d:' + d + 'px;">' +
        '<div class="t-unit-medal">' + WINGS_HTML + face +
          '<b class="t-unit-auras" aria-hidden="true"></b>' +
          '<i class="t-unit-shield" aria-hidden="true"></i>' +
          (unit.side === 'enemy' ? '<b class="t-unit-alert" title="预警" aria-label="预警">' +
            '<svg class="t-alert-ring" viewBox="-50 -50 100 100" aria-hidden="true"><circle class="t-alert-arc" r="46" pathLength="100"/><circle class="t-alert-tick" r="40" pathLength="100"/></svg>' +
            '<svg class="t-alert-eye" viewBox="-16 -9 32 18" aria-hidden="true"><path d="M-15,0 Q0,-11 15,0 Q0,11 -15,0 Z"/><ellipse rx="2.4" ry="6.2"/></svg>' +
          '</b>' : '') +
          '<svg class="t-unit-direction" viewBox="-30 -30 60 60" aria-hidden="true"><path d="M0,-29 L6.5,-19.5 L0,-22 L-6.5,-19.5 Z"/>' +
            '<path class="t-unit-rear" d="M-8,19.4 L-13.8,33.3 A36,36 0 0,0 13.8,33.3 L8,19.4 A21,21 0 0,1 -8,19.4 Z"/></svg>' +
        '</div>' +
      '</div>' +
      '<div class="t-unit-bars">' +
        '<div class="t-bar t-bar-hp"><i class="t-bar-ghost" id="' + escapeHtml(unit.id) + '-hp-ghost"></i><i class="t-bar-fill" id="' + escapeHtml(unit.id) + '-hp-bar"></i><i class="t-bar-predict"></i></div>' +
        (unit.bars && unit.bars.maxMp ? '<div class="t-bar t-bar-mp"><i class="t-bar-fill"></i></div>' : '') +
      '</div>' +
      (unit.side === 'enemy' ? '<div class="t-unit-charge"></div>' : '') +
      '<div class="t-unit-status"></div><div class="t-unit-predict-tag"></div>';

    const img = billboard.querySelector('img');
    if (img) {
      img.referrerPolicy = 'no-referrer';
      const url = unit.avatarUrl;
      const avatarBox = billboard.querySelector('.t-unit-avatar');
      if (!url) {
        avatarBox.classList.add('t-avatar-missing');
        if (onAvatarStatus) onAvatarStatus(unit, null, 'missing');
      } else {
        img.onload = () => { if (onAvatarStatus) onAvatarStatus(unit, url, 'ok'); };
        img.onerror = () => { avatarBox.classList.add('t-avatar-missing'); if (onAvatarStatus) onAvatarStatus(unit, url, 'error'); };
        img.src = url;
      }
    }

    root.appendChild(billboard);
    parent.appendChild(root);
    scope.addNode(root);

    const rec = {
      root, billboard,
      sprite: billboard.querySelector('.t-unit-sprite'),
      medal: billboard.querySelector('.t-unit-medal'),
      shadow: root.querySelector('.t-unit-shadow'),
      direction: billboard.querySelector('.t-unit-direction'),
      hpBar: billboard.querySelector('.t-bar-hp .t-bar-fill'),
      hpGhost: billboard.querySelector('.t-bar-ghost'),
      mpBar: billboard.querySelector('.t-bar-mp .t-bar-fill'),
      status: billboard.querySelector('.t-unit-status'), statusHtml: '',
      predictBar: billboard.querySelector('.t-bar-predict'), predictTag: billboard.querySelector('.t-unit-predict-tag'),
      shield: billboard.querySelector('.t-unit-shield'), shieldShown: (unit.bars && unit.bars.shield) || 0,
      alert: billboard.querySelector('.t-unit-alert'), charge: billboard.querySelector('.t-unit-charge'),
      auras: billboard.querySelector('.t-unit-auras'), auraKey: '',
      unit, placement, bars: unit.bars || null, motionLock: false, displayFacing: null,
    };
    nodes.set(unit.id, rec);
    applyFacing(rec);
    applyBars(rec, true);
    return rec;
  }

  function applyFacing(rec) {
    const deg = rec.displayFacing != null ? rec.displayFacing : (rec.placement.facing || 0);
    rec.direction.style.transform = 'rotate(' + deg + 'deg)';
  }

  // 资源条只显示宿主给的 bars 快照（显示态）；hit 反馈期间由视听底座按同一 id 驱动 fill/ghost
  function applyBars(rec, syncGhost) {
    const b = rec.bars || {};
    const hp = b.maxHp ? Math.max(0, Math.min(1, (b.hp || 0) / b.maxHp)) : 1;
    rec.hpBar.style.width = (hp * 100).toFixed(1) + '%';
    if (syncGhost && rec.hpGhost) { rec.hpGhost.style.transition = 'none'; rec.hpGhost.style.width = (hp * 100).toFixed(1) + '%'; }
    if (rec.mpBar) {
      const mp = b.maxMp ? Math.max(0, Math.min(1, (b.mp || 0) / b.maxMp)) : 1;
      rec.mpBar.style.width = (mp * 100).toFixed(1) + '%';
    }
    syncShield(rec, b.shield || 0);
  }
  // 护盾罩：有盾即在头像外罩一层半透明防护罩；新获得时展开，受击减少时闪亮，归零时碎裂淡出
  function syncShield(rec, value) {
    const prev = rec.shieldShown || 0;
    rec.shieldShown = value;
    rec.root.classList.toggle('t-unit-shielded', value > 0);
    if (value > 0 && prev <= 0) rec.shield.animate([{ transform: 'scale(1.45)', opacity: 0 }, { transform: 'scale(0.94)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 460, easing: 'ease-out' });
    else if (value <= 0 && prev > 0) rec.shield.animate([{ transform: 'scale(1)', opacity: 1, filter: 'brightness(2.2)' }, { transform: 'scale(1.12)', opacity: 0.8, offset: 0.25 }, { transform: 'scale(1.5)', opacity: 0, filter: 'brightness(1)' }], { duration: 520, easing: 'ease-out' });
    else if (value < prev) rec.shield.animate([{ filter: 'brightness(2)', transform: 'scale(1.06)' }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
  }
  function setShield(id, value) { const rec = nodes.get(id); if (rec) syncShield(rec, Math.max(0, value || 0)); }
  // 增益/减益持续弧光：list=[{kind, exp}]（由内向外错层）；新出现的弧环自外向内收拢显形，种类不变不重建
  function setAuras(id, list) {
    const rec = nodes.get(id);
    if (!rec || !rec.auras) return;
    const key = list.map(a => a.kind + (a.exp ? '!' : '')).join(',');
    if (rec.auraKey === key) return;
    const prev = new Set(rec.auraKey.split(',').filter(Boolean).map(k => k.replace('!', '')));
    rec.auraKey = key;
    rec.auras.innerHTML = list.map((a, i) => '<b class="t-aura t-aura-' + a.kind + (a.exp ? ' t-aura-exp' : '') + '" style="--i:' + i + '"><i></i></b>').join('');
    [...rec.auras.children].forEach((el, i) => {
      if (!prev.has(list[i].kind)) el.animate([{ scale: '1.6', opacity: 0 }, { scale: '.94', opacity: 1, offset: 0.7 }, { scale: '1', opacity: 1 }], { duration: 460, easing: 'ease-out' });
    });
  }
  // 警戒标记弹出（新进入警戒 / 收到警报）：扫描弧环自外向内收紧锁定 + 猎视之眼骤然睁开，收报者临时显示 0.9s
  function pulseAlert(id) {
    const rec = nodes.get(id);
    if (!rec || !rec.alert) return;
    rec.root.classList.add('t-unit-alert-flash');
    rec.alert.animate([{ transform: 'scale(1.9)', opacity: 0, filter: 'brightness(2.6)' }, { transform: 'scale(0.92)', opacity: 1, filter: 'brightness(1.9)', offset: 0.45 },
      { transform: 'scale(1.06)', offset: 0.7 }, { transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }], { duration: 520, easing: 'cubic-bezier(0.2,0.8,0.3,1)' });
    rec.alert.querySelector('.t-alert-eye').animate([{ scale: '1.3 0.08' }, { scale: '1.25 1.35', offset: 0.4 }, { scale: '1 1' }], { duration: 520, easing: 'ease-out' });
    clearTimeout(rec.alertTimer);
    rec.alertTimer = setTimeout(() => rec.root.classList.remove('t-unit-alert-flash'), 900);
  }

  function setUnits(units, placementsById) {
    for (const rec of nodes.values()) scope.removeNode(rec.root);
    nodes.clear();
    for (const unit of units) {
      const placement = placementsById[unit.id];
      if (placement) buildNode(unit, placement);
    }
  }

  function syncUnits(units, placementsById) {
    const ids = new Set(units.map(u => u.id));
    for (const [id, rec] of nodes) {
      if (!ids.has(id)) { scope.removeNode(rec.root); nodes.delete(id); }
    }
    for (const unit of units) {
      const rec = nodes.get(unit.id);
      if (rec && JSON.stringify(rec.unit.footprint) !== JSON.stringify(unit.footprint)) { scope.removeNode(rec.root); nodes.delete(unit.id); }
      if (!nodes.has(unit.id)) buildNode(unit, placementsById[unit.id]);
      else updateUnit(unit.id, { unit, placement: placementsById[unit.id] });
    }
  }

  function placeAt(rec, wx, wy) {
    rec.root.style.left = (wx * Q) + 'px';
    rec.root.style.top = (wy * Q) + 'px';
  }

  function updateUnit(id, patch) {
    const rec = nodes.get(id);
    if (!rec) return;
    if (patch.unit) {
      rec.unit = patch.unit;
      const changed = !rec.bars || rec.bars.hp !== patch.unit.bars.hp || rec.bars.mp !== patch.unit.bars.mp || rec.bars.maxHp !== patch.unit.bars.maxHp || rec.bars.shield !== patch.unit.bars.shield;
      rec.bars = patch.unit.bars;
      if (changed) applyBars(rec, true);
    }
    if (patch.bars) { rec.bars = patch.bars; applyBars(rec, !!patch.syncGhost); }
    if (patch.placement) {
      rec.placement = patch.placement;
      if (!rec.motionLock) {
        const c = unitCenter(rec.placement, rec.unit.footprint || { width: 1, height: 1 });
        placeAt(rec, c.x, c.y);
        rec.displayFacing = null;
      }
      applyFacing(rec);
    }
  }

  // ---- 显示态接口（motion / director 使用；均不改 placement） ----
  function lockMotion(id, on) { const rec = nodes.get(id); if (rec) rec.motionLock = !!on; }
  function setDisplayPos(id, wx, wy) { const rec = nodes.get(id); if (rec) placeAt(rec, wx, wy); }
  function setDisplayFacing(id, deg) {
    const rec = nodes.get(id);
    if (!rec) return;
    rec.displayFacing = deg == null ? null : ((Math.round(Number(deg) || 0) % 360) + 360) % 360;
    applyFacing(rec);
  }
  function setFlag(id, cls, on) { const rec = nodes.get(id); if (rec) rec.root.classList.toggle(cls, !!on); }
  function setCharge(id, charge) {
    const rec = nodes.get(id);
    if (!rec || !rec.charge) return;
    const key = charge ? charge.current + '/' + charge.max + ':' + charge.skillName : '';
    if (rec.chargeKey === key) return;
    rec.chargeKey = key;
    rec.root.classList.toggle('t-unit-has-charge', !!charge);
    rec.charge.title = charge ? charge.skillName : '';
    rec.charge.innerHTML = charge ? '<span class="t-charge-pip-row" aria-hidden="true">' + Array.from({ length: charge.max }, (_, i) =>
      '<i class="charge-pip ' + (i < charge.current ? 'filled' : 'empty') + '"></i>').join('') + '</span><b>' + charge.current + '/' + charge.max + '</b>' : '';
  }
  // 步态起落：只改 medal 层（sprite 层留给受击/前摇，root 层留给位置），互不覆盖
  function setHop(id, px, squash) {
    const rec = nodes.get(id);
    if (!rec) return;
    if (!px && squash === 1) { rec.medal.style.transform = ''; rec.shadow.style.transform = ''; return; }
    rec.medal.style.transform = 'translate(-50%, calc(-50% - ' + px.toFixed(1) + 'px)) scale(' + (2 - squash).toFixed(3) + ',' + squash.toFixed(3) + ')';
    rec.shadow.style.transform = 'scale(' + (1 - px / 40).toFixed(3) + ')';
  }
  function clearFlag(cls) { for (const rec of nodes.values()) rec.root.classList.remove(cls); }
  // 状态徽章行（血条下方，宿主给 HTML；同内容不重写）
  function setStatus(id, html) {
    const rec = nodes.get(id);
    if (!rec || rec.statusHtml === html) return;
    rec.statusHtml = html; rec.status.innerHTML = html;
  }
  // 攻击预览：血条上标出预计扣除段（from→to 为 HP 比例），头顶标签写命中率/击杀
  function setPredict(id, p) {
    const rec = nodes.get(id);
    if (!rec) return;
    if (!p) { rec.predictBar.style.width = '0'; rec.predictTag.textContent = ''; rec.root.classList.remove('t-unit-predicting', 't-unit-lethal', 't-unit-backstab'); return; }
    rec.predictBar.style.left = (p.to * 100).toFixed(1) + '%';
    rec.predictBar.style.width = (Math.max(0, p.from - p.to) * 100).toFixed(1) + '%';
    rec.predictTag.textContent = p.tag || '';
    rec.root.classList.add('t-unit-predicting');
    rec.root.classList.toggle('t-unit-lethal', !!p.kill);
    rec.root.classList.toggle('t-unit-backstab', !!p.backstab);   // 背袭预览：朝向环背后 45° 扇区亮起
  }
  function clearPredict() { for (const id of nodes.keys()) setPredict(id, null); }
  function setFacing(id, deg) { setDisplayFacing(id, deg); }

  function onCameraChange(pose) {
    cameraScale = pose.scale;
    const t = 'translate(-50%,-50%) scale(' + avatarScaleForZoom(cameraScale) + ')';
    for (const rec of nodes.values()) rec.billboard.style.transform = t;
  }

  function getEntitySpriteDom(entityOrId) {
    const id = entityOrId && typeof entityOrId === 'object' ? entityOrId.id : String(entityOrId || '');
    const rec = nodes.get(id);
    return rec ? rec.sprite : null;
  }

  return { setUnits, syncUnits, updateUnit, setFacing, onCameraChange, getEntitySpriteDom, nodes,
    lockMotion, setDisplayPos, setDisplayFacing, setFlag, clearFlag, setHop, setCharge, setStatus, setPredict, clearPredict, setShield, setAuras, pulseAlert };
}
