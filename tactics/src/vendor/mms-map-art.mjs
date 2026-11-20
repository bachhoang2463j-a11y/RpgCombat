// ==========================================
// R13 MiniMapStatus 地图美术渲染函数族 · 战棋侧移植（来源 D:/Project/MiniMapStatus/MiniMapStatus.html）
// 只移植 mmsRenderMapArt 的 mini 近景管线与本图所需图元（wall/door/window/counter/pillar/
// lantern/hearth/crate/table/shelf/stairs/tree/boulder/crystal/campfire）。
// 不移植：MMS 宿主/LLM 提示词、sanitize 数量限额、TacticalMapEngine、大地图专属段
// （districts/river/roads/bridges/ridge/bays/towers/gates/houses/trees/罗盘/比例尺）。
// 坐标系：SVG viewBox 0 0 1000 1000（美术像素）；战棋固定图 20 格 → 1 米 = 50 美术像素。
// 配色由调用方（map-art.mjs）注入战棋调色板，本文件只提供结构与画法。
// ==========================================

// 近景材质 pattern 与光晕 defs（flat 风格；战棋配色：深灰石砖 + 暗红毯，画法同源 MMS_MINI_PATTERN_DEFS）
export const MINI_PATTERN_DEFS =
  '<pattern id="mms-mini-wood" width="100" height="64" patternUnits="userSpaceOnUse">' +
    '<rect width="100" height="64" fill="#dfc49a"/><rect width="98" height="62" fill="#e6cda6"/>' +
    '<path d="M 0 32 H 100 M 50 1 V 31 M 25 33 V 63" fill="none" stroke="#c3a377" stroke-width="2"/></pattern>' +
  '<pattern id="mms-mini-brick" width="60" height="32" patternUnits="userSpaceOnUse">' +
    '<rect width="60" height="32" fill="%%BRICK_BASE%%"/>' +
    '<path d="M 0 16 H 60 M 30 0 V 16 M 0 16 V 32 M 60 16 V 32" fill="none" stroke="%%BRICK_LINE%%" stroke-width="2.5"/></pattern>' +
  '<pattern id="mms-mini-tile" width="80" height="80" patternUnits="userSpaceOnUse">' +
    '<rect width="80" height="80" fill="#e8cfa6"/><rect width="40" height="40" fill="#d1b38a"/><rect x="40" y="40" width="40" height="40" fill="#d1b38a"/>' +
    '<path d="M 80 0 L 0 0 0 80" fill="none" stroke="#a37855" stroke-width="4"/></pattern>' +
  '<pattern id="mms-mini-street" width="60" height="60" patternUnits="userSpaceOnUse">' +
    '<rect width="60" height="60" fill="#4b5563"/><rect width="30" height="30" fill="#414b59"/><rect x="30" y="30" width="30" height="30" fill="#414b59"/></pattern>' +
  '<pattern id="mms-mini-marble" width="240" height="240" patternUnits="userSpaceOnUse">' +
    '<rect width="240" height="240" fill="#fcf9f2"/>' +
    '<path d="M 0 40 Q 120 80 240 16" fill="none" stroke="#e3d6bd" stroke-width="1.5" opacity="0.7"/>' +
    '<path d="M -40 160 Q 80 120 200 224" fill="none" stroke="#e3d6bd" stroke-width="1" opacity="0.5"/>' +
    '<path d="M 80 -40 Q 120 120 40 280" fill="none" stroke="#ebdcc4" stroke-width="2" opacity="0.4"/></pattern>' +
  '<pattern id="mms-mini-rubber" width="50" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<rect width="50" height="50" fill="#253248"/><rect x="2" y="2" width="46" height="46" fill="#2c3a52"/></pattern>' +
  '<pattern id="mms-mini-grass" width="60" height="60" patternUnits="userSpaceOnUse">' +
    '<rect width="60" height="60" fill="#4f7a52"/><circle cx="15" cy="15" r="4" fill="#3d6340"/><circle cx="45" cy="40" r="3" fill="#628c60"/><circle cx="30" cy="55" r="2.5" fill="#3d6340"/></pattern>' +
  '<pattern id="mms-mini-snow" width="80" height="80" patternUnits="userSpaceOnUse">' +
    '<rect width="80" height="80" fill="#eef6fb"/><circle cx="20" cy="20" r="3" fill="#ffffff" opacity="0.9"/><circle cx="60" cy="45" r="2" fill="#dbeef8" opacity="0.8"/><circle cx="35" cy="70" r="2.5" fill="#ffffff" opacity="0.7"/></pattern>' +
  '<pattern id="mms-mini-sand" width="160" height="120" patternUnits="userSpaceOnUse">' +
    '<rect width="160" height="120" fill="#f5e3b0"/>' +
    '<path d="M 0 40 Q 40 20 80 40 T 160 40" fill="none" stroke="#ecd598" stroke-width="6" opacity="0.8"/>' +
    '<path d="M 0 90 Q 40 70 80 90 T 160 90" fill="none" stroke="#e8cf8e" stroke-width="5" opacity="0.6"/></pattern>' +
  '<pattern id="mms-mini-rock" width="100" height="100" patternUnits="userSpaceOnUse">' +
    '<rect width="100" height="100" fill="#2a2733"/>' +
    '<path d="M 0 30 Q 30 50 60 20 T 100 40" fill="none" stroke="#1b1922" stroke-width="3"/>' +
    '<path d="M 0 80 Q 40 70 70 90 T 100 80" fill="none" stroke="#3a3644" stroke-width="2"/></pattern>' +
  '<pattern id="mms-mini-carpet" width="40" height="40" patternUnits="userSpaceOnUse">' +
    '<rect width="40" height="40" fill="%%CARPET_BASE%%"/><rect width="20" height="20" fill="%%CARPET_ALT%%"/><rect x="20" y="20" width="20" height="20" fill="%%CARPET_ALT%%"/>' +
    '<path d="M 40 0 L 0 0 0 40" fill="none" stroke="%%CARPET_LINE%%" stroke-width="2"/></pattern>' +
  '<pattern id="mms-mini-dirt" width="30" height="30" patternUnits="userSpaceOnUse">' +
    '<rect width="30" height="30" fill="#9c6b39"/><circle cx="10" cy="10" r="2" fill="#7a4f27"/><circle cx="22" cy="21" r="1.6" fill="#7a4f27"/></pattern>' +
  '<radialGradient id="mms-mini-vig" cx="50%" cy="50%" r="75%"><stop offset="62%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="%%VIG_EDGE%%"/></radialGradient>' +
  '<radialGradient id="mms-mini-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffb300" stop-opacity="0.45"/><stop offset="40%" stop-color="#fb8c00" stop-opacity="0.18"/><stop offset="100%" stop-color="#e65100" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="mms-mini-cold" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#22d3ee" stop-opacity="0.4"/><stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="mms-mini-fire" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/><stop offset="35%" stop-color="#ea580c" stop-opacity="0.7"/><stop offset="100%" stop-color="#b91c1c" stop-opacity="0"/></radialGradient>';

// parchment 小地图材质 tint（画法同源 MMS_MINI_PARCH_TINT）
export const MINI_PARCH_TINT = {
  wood: '#e6d3a8', brick: '#d9cbaa', tile: '#e8dcb8', street: '#cfc4a8', marble: '#f0e8cd',
  rubber: '#c9c2ac', grass: '#d6d8ab', snow: '#f2eede', sand: '#ecdfb5', rock: '#c9c2b0',
};

// 近景地物配色：材质系（wood=古典木石 / mod=现代金属塑料）× 风格（画法同源 mmsMiniPal）
export function miniPal(style, fam) {
  if (style === 'parchment') {
    return { fill: '#e2cda0', fill2: '#d8c294', edge: '#3f3020' };
  }
  return fam === 'mod'
    ? { fill: '#78909c', fill2: '#b0bec5', edge: '#37474f' }
    : { fill: '#8a6a48', fill2: '#c9a97a', edge: '#5f4630' };
}

// 近景图元（画法同源 mmsMapArtFeature 的 mini 近景分支；f= {type, at:[x,y], size?:[w,h], small?}）
// 锚点语义同源：wall/counter/table 左上角，door 以 (x,y) 为门枢起点，pillar/lantern 为中心。
export function mapArtFeature(f, S, style, fam) {
  const x = f.at[0], y = f.at[1];
  const w = f.size ? f.size[0] : 0, h = f.size ? f.size[1] : 0;
  switch (f.type) {
    case 'wall': {
      const ww = w || 120, wh = h || 16;
      const fill = style === 'parchment' ? 'url(#mms-map-hatch)' : (fam === 'mod' ? '#9aa8b8' : 'url(#mms-mini-brick)');
      const edge = style === 'parchment' ? '#3f3020' : (fam === 'mod' ? '#4a5c70' : S.wallEdge);
      return '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + wh + '" fill="' + fill + '" stroke="' + edge + '" stroke-width="2"/>';
    }
    case 'door': {
      const r = w || 36;
      const ink = style === 'parchment' ? '#3f3020' : S.doorInk;
      return '<path d="M ' + x + ' ' + y + ' V ' + (y - r) + '" stroke="' + ink + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M ' + x + ' ' + (y - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + '" fill="none" stroke="' + ink + '" stroke-width="2" stroke-dasharray="6 5"/>' +
        '<circle cx="' + (x + 4) + '" cy="' + (y - r + 6) + '" r="2" fill="' + ink + '"/>';
    }
    // 战棋侧补充图元：关闭门叶（MMS door 图元只表示开门，不表达关闭态）
    case 'doorLeaf': {
      const dw = w || 20, dh = h || 88;
      return '<rect x="' + x + '" y="' + y + '" width="' + dw + '" height="' + dh + '" rx="2" fill="#6b5844" stroke="#3f3428" stroke-width="2"/>' +
        '<circle cx="' + (x + dw - 5) + '" cy="' + (y + dh / 2) + '" r="2.5" fill="#c9a227"/>';
    }
    case 'window': {
      const wn = w || 50;
      const frame = style === 'parchment' ? '#3f3020' : '#3a4a5e';
      return '<rect x="' + x + '" y="' + (y - 5) + '" width="' + wn + '" height="10" fill="#fef08a" opacity="0.85" stroke="' + frame + '" stroke-width="2"/>' +
        '<path d="M ' + x + ' ' + (y + 5) + ' L ' + (x - 22) + ' ' + (y + 150) + ' L ' + (x + wn + 22) + ' ' + (y + 150) + ' L ' + (x + wn) + ' ' + (y + 5) + ' Z" fill="#fef08a" opacity="0.18"/>';
    }
    case 'counter': {
      const cw = w || 90, ch = h || 26;
      const F = miniPal(style, fam);
      return '<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch + '" rx="3" fill="' + F.fill + '" stroke="' + F.edge + '" stroke-width="2.5"/>' +
        '<rect x="' + (x + 4) + '" y="' + (y + 3) + '" width="' + (cw - 8) + '" height="' + (ch * 0.32) + '" rx="2" fill="' + F.fill2 + '"/>' +
        '<path d="M ' + (x + cw * 0.33) + ' ' + (y + 3) + ' V ' + (y + ch - 3) + ' M ' + (x + cw * 0.66) + ' ' + (y + 3) + ' V ' + (y + ch - 3) + '" stroke="' + F.edge + '" stroke-width="1.2" opacity="0.5"/>';
    }
    case 'table': {
      const tw = w || 64, th = h || 64;
      const F = miniPal(style, fam);
      let g = '';
      g += '<rect x="' + (x - tw / 2 - 8) + '" y="' + (y - th / 2 - 26) + '" width="' + (tw + 16) + '" height="10" rx="2" fill="' + F.fill + '" stroke="' + F.edge + '" stroke-width="1.5"/>';
      g += '<rect x="' + (x - tw / 2 - 8) + '" y="' + (y + th / 2 + 16) + '" width="' + (tw + 16) + '" height="10" rx="2" fill="' + F.fill + '" stroke="' + F.edge + '" stroke-width="1.5"/>';
      g += '<rect x="' + (x - tw / 2 - 26) + '" y="' + (y - th / 2 - 8) + '" width="10" height="' + (th + 16) + '" rx="2" fill="' + F.fill + '" stroke="' + F.edge + '" stroke-width="1.5"/>';
      g += '<rect x="' + (x + tw / 2 + 16) + '" y="' + (y - th / 2 - 8) + '" width="10" height="' + (th + 16) + '" rx="2" fill="' + F.fill + '" stroke="' + F.edge + '" stroke-width="1.5"/>';
      g += '<rect x="' + (x - tw / 2) + '" y="' + (y - th / 2) + '" width="' + tw + '" height="' + th + '" rx="4" fill="' + F.fill + '" stroke="' + F.edge + '" stroke-width="2.5"/>';
      if (fam !== 'mod' && style !== 'parchment') {
        g += '<rect x="' + (x - tw / 2 + 7) + '" y="' + (y - th / 2 + 7) + '" width="' + (tw - 14) + '" height="' + (th - 14) + '" rx="2" fill="#8c2323" opacity="0.75"/>';
      }
      return g;
    }
    case 'shelf': {
      const sw = w || 80, sh = h || 22;
      const F = miniPal(style, fam);
      const bookC = style === 'parchment' ? '#5f4a30' : (fam === 'mod' ? '#64748b' : '#78350f');
      let g = '<rect x="' + x + '" y="' + y + '" width="' + sw + '" height="' + sh + '" rx="2" fill="' + F.fill + '" stroke="' + F.edge + '" stroke-width="2"/>';
      g += '<path d="M ' + (x + 3) + ' ' + (y + sh * 0.5) + ' H ' + (x + sw - 3) + '" stroke="' + F.edge + '" stroke-width="1.2"/>';
      g += '<path d="M ' + (x + 6) + ' ' + (y + 4) + ' H ' + (x + sw - 6) + '" stroke="' + bookC + '" stroke-width="6" stroke-dasharray="4 3 7 2 5 4" opacity="0.85"/>';
      g += '<path d="M ' + (x + 6) + ' ' + (y + sh - 4) + ' H ' + (x + sw - 6) + '" stroke="' + bookC + '" stroke-width="6" stroke-dasharray="7 3 4 5 2 6" opacity="0.85"/>';
      return g;
    }
    case 'stairs': {
      const sw = w || 70, sh = h || 40;
      const F = miniPal(style, fam);
      const n = 5;
      let g = '<rect x="' + x + '" y="' + y + '" width="' + sw + '" height="' + sh + '" rx="2" fill="' + F.fill2 + '" stroke="' + F.edge + '" stroke-width="2"/>';
      for (let i = 1; i < n; i++) {
        g += '<path d="M ' + x + ' ' + (y + (sh * i / n)) + ' H ' + (x + sw) + '" stroke="' + F.edge + '" stroke-width="1.4" opacity="0.7"/>';
      }
      g += '<path d="M ' + (x + sw * 0.5) + ' ' + (y + 6) + ' V ' + (y + sh - 6) + ' M ' + (x + sw * 0.5 - 6) + ' ' + (y + sh - 14) + ' L ' + (x + sw * 0.5) + ' ' + (y + sh - 6) + ' L ' + (x + sw * 0.5 + 6) + ' ' + (y + sh - 14) + '" stroke="' + F.edge + '" stroke-width="2.2" fill="none"/>';
      return g;
    }
    case 'pillar': {
      const F = miniPal(style, fam);
      return '<circle cx="' + x + '" cy="' + y + '" r="13" fill="' + F.fill + '" stroke="' + F.edge + '" stroke-width="2.5"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="7" fill="none" stroke="' + F.edge + '" stroke-width="1.2" opacity="0.6"/>';
    }
    case 'hearth': {
      const F = miniPal(style, fam);
      let g = '<rect x="' + (x - 26) + '" y="' + (y - 22) + '" width="52" height="44" rx="4" fill="' + (style === 'parchment' ? '#d8c294' : (fam === 'mod' ? '#64748b' : '#8a7a68')) + '" stroke="' + F.edge + '" stroke-width="2.5"/>';
      if (style !== 'parchment') g += '<circle cx="' + x + '" cy="' + y + '" r="42" fill="url(#mms-mini-fire)"/>';
      g += '<ellipse cx="' + x + '" cy="' + y + '" rx="14" ry="9" fill="' + (style === 'parchment' ? '#8a3a2a' : '#ea580c') + '" stroke="' + F.edge + '" stroke-width="1.5"/>';
      g += '<path d="M ' + x + ' ' + (y - 8) + ' q 5 -8 0 -14 q 8 8 3 16" fill="' + (style === 'parchment' ? '#8a3a2a' : '#fbbf24') + '"/>';
      return g;
    }
    case 'lantern': {
      let g = '';
      if (style !== 'parchment') g += '<circle cx="' + x + '" cy="' + y + '" r="70" fill="url(#mms-mini-glow)"/>';
      g += '<circle cx="' + x + '" cy="' + y + '" r="9" fill="' + (style === 'parchment' ? '#e2cda0' : '#ffca28') + '" stroke="' + (style === 'parchment' ? '#3f3020' : '#c77800') + '" stroke-width="2"/>';
      g += '<path d="M ' + (x - 4) + ' ' + (y + 8) + ' q 4 10 8 0" fill="none" stroke="#c62828" stroke-width="2.5"/>';
      return g;
    }
    case 'crate': {
      if (fam === 'mod' && style !== 'parchment') {
        return '<rect x="' + x + '" y="' + (y + 10) + '" width="44" height="26" rx="2" fill="#c19a6b" stroke="#8b5a2b" stroke-width="2"/>' +
          '<rect x="' + (x + 6) + '" y="' + y + '" width="32" height="18" rx="2" fill="#deb887" stroke="#8b5a2b" stroke-width="2"/>' +
          '<path d="M ' + (x + 6) + ' ' + (y + 9) + ' h 32" stroke="#a67b5b" stroke-width="1.5"/>';
      }
      const jarF = style === 'parchment' ? '#e2cda0' : '#4e342e';
      const jarE = style === 'parchment' ? '#3f3020' : '#21120c';
      return '<circle cx="' + (x + 12) + '" cy="' + (y + 16) + '" r="13" fill="' + jarF + '" stroke="' + jarE + '" stroke-width="2"/>' +
        '<circle cx="' + (x + 12) + '" cy="' + (y + 16) + '" r="5.5" fill="#c62828"/>' +
        '<circle cx="' + (x + 30) + '" cy="' + (y + 22) + '" r="11" fill="' + jarF + '" stroke="' + jarE + '" stroke-width="2"/>' +
        '<circle cx="' + (x + 30) + '" cy="' + (y + 22) + '" r="4.5" fill="#c62828"/>';
    }
    case 'tree': {
      const trunk = style === 'parchment' ? '#4a3826' : '#7a5a38';
      const crown = style === 'parchment' ? '#9db07a' : '#6f9a5e';
      const crownE = style === 'parchment' ? '#3f3020' : '#557a48';
      return '<rect x="' + (x - 3.5) + '" y="' + (y - 2) + '" width="7" height="16" fill="' + trunk + '"/>' +
        '<circle cx="' + x + '" cy="' + (y - 14) + '" r="20" fill="' + crown + '" stroke="' + crownE + '" stroke-width="2"/>' +
        '<circle cx="' + (x - 10) + '" cy="' + (y - 6) + '" r="10" fill="' + crown + '" stroke="' + crownE + '" stroke-width="1.5"/>' +
        '<circle cx="' + (x + 11) + '" cy="' + (y - 8) + '" r="9" fill="' + crown + '" stroke="' + crownE + '" stroke-width="1.5"/>';
    }
    case 'boulder': {
      const fill = style === 'parchment' ? '#d8c294' : '#8d9aab';
      const edge = style === 'parchment' ? '#3f3020' : '#5a6b7d';
      return '<path d="M ' + (x - 22) + ' ' + (y + 12) + ' Q ' + (x - 24) + ' ' + (y - 8) + ' ' + (x - 6) + ' ' + (y - 14) + ' Q ' + (x + 14) + ' ' + (y - 18) + ' ' + (x + 22) + ' ' + (y - 2) + ' Q ' + (x + 26) + ' ' + (y + 12) + ' ' + (x + 6) + ' ' + (y + 15) + ' Z" fill="' + fill + '" stroke="' + edge + '" stroke-width="2.5"/>' +
        '<path d="M ' + (x - 8) + ' ' + (y - 6) + ' q 8 4 14 12" fill="none" stroke="' + edge + '" stroke-width="1.5" opacity="0.6"/>';
    }
    case 'crystal': {
      const c1 = style === 'parchment' ? '#c4b5fd' : '#22d3ee';
      const c2 = style === 'parchment' ? '#8a3a2a' : '#0891b2';
      let g = '';
      if (style !== 'parchment') g += '<circle cx="' + x + '" cy="' + y + '" r="52" fill="url(#mms-mini-cold)"/>';
      g += '<polygon points="' + x + ',' + (y - 26) + ' ' + (x + 12) + ',' + (y - 6) + ' ' + x + ',' + (y + 16) + ' ' + (x - 12) + ',' + (y - 6) + '" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="2"/>';
      g += '<polygon points="' + (x + 8) + ',' + (y - 12) + ' ' + (x + 18) + ',' + (y + 2) + ' ' + (x + 8) + ',' + (y + 12) + '" fill="' + c2 + '" opacity="0.8"/>';
      return g;
    }
    case 'campfire': {
      let g = '';
      if (style !== 'parchment') g += '<circle cx="' + x + '" cy="' + y + '" r="46" fill="url(#mms-mini-fire)"/>';
      g += '<path d="M ' + (x - 18) + ' ' + (y + 8) + ' L ' + (x + 14) + ' ' + (y - 10) + ' M ' + (x + 18) + ' ' + (y + 8) + ' L ' + (x - 14) + ' ' + (y - 10) + '" stroke="#6b4f30" stroke-width="5" stroke-linecap="round"/>';
      g += '<path d="M ' + x + ' ' + (y - 18) + ' q 10 -10 2 -20 q 14 12 6 26 q 6 -8 4 -16 q 8 14 -2 24 q -6 6 -10 -14" fill="' + (style === 'parchment' ? '#8a3a2a' : '#f97316') + '"/>';
      g += '<path d="M ' + x + ' ' + (y - 6) + ' q -8 -6 -2 -14 q -10 10 -2 20" fill="' + (style === 'parchment' ? '#8a3a2a' : '#fbbf24') + '"/>';
      return g;
    }
    default:
      return '';
  }
}

// mini 近景渲染主入口（画法同源 mmsRenderMapArt(json, style, 'mini') 的 mini 分支精简）
// json = { name?, ground, terrain?:[{type,at,size|shape}], features?:[{type,at,size?,rot?}], labels?:[{at,text}] }
export function renderMiniMapArt(json, palette) {
  const S = palette;
  const style = 'flat';
  const fam = S.fam || 'wood';
  const parts = [];
  const P = (s) => parts.push(s);

  P('<defs>' + S.patternDefs + '</defs>');

  // 基底材质铺满 + 轻晕影（画法同源）
  const gType = S.groundTypes.indexOf(json.ground) !== -1 ? json.ground : 'wood';
  P('<rect width="1000" height="1000" fill="url(#mms-mini-' + gType + ')"/>');
  P('<rect width="1000" height="1000" fill="url(#mms-mini-vig)"/>');

  // 地面分区材质（carpet/dirt/其余 ground 材质；非法回退 S.grass；画法同源）
  for (const t of json.terrain || []) {
    let fill;
    if (t.type === 'carpet') fill = 'url(#mms-mini-carpet)';
    else if (t.type === 'dirt') fill = 'url(#mms-mini-dirt)';
    else if (S.groundTypes.indexOf(t.type) !== -1) fill = 'url(#mms-mini-' + t.type + ')';
    else fill = S[t.type] || S.grass;
    const edge = (t.type === 'lake' || t.type === 'water') ? S.waterEdge : S.terrainEdge;
    if (t.shape === 'ellipse' && t.at && t.r) {
      P('<ellipse cx="' + t.at[0] + '" cy="' + t.at[1] + '" rx="' + t.r[0] + '" ry="' + t.r[1] + '" fill="' + fill + '"' + (edge ? ' stroke="' + edge + '" stroke-width="2"' : '') + '/>');
    } else if (t.shape === 'path' && t.d) {
      P('<path d="' + t.d + '" fill="' + fill + '"' + (edge ? ' stroke="' + edge + '" stroke-width="2"' : '') + '/>');
    } else if (t.at && t.size) {
      P('<rect x="' + t.at[0] + '" y="' + t.at[1] + '" width="' + t.size[0] + '" height="' + t.size[1] + '" fill="' + fill + '"' + (edge ? ' stroke="' + edge + '" stroke-width="2"' : '') + '/>');
    }
  }

  // 近景图元（rot 朝向：绕 at 顺时针旋转度数；画法同源）
  for (const f of json.features || []) {
    if (!f || !f.at) continue;
    let g = mapArtFeature(f, S, style, fam);
    if (!g) continue;
    const rot = ((Math.round(Number(f.rot) || 0) % 360) + 360) % 360;
    if (rot) g = '<g transform="rotate(' + rot + ' ' + f.at[0] + ' ' + f.at[1] + ')">' + g + '</g>';
    P(g);
  }

  // 文字标签（画法同源）
  if ((json.labels || []).length) {
    P('<g fill="' + S.label + '" font-size="17" opacity="0.85" text-anchor="middle" font-family="' + S.font + '">' +
      json.labels.map((l) => '<text x="' + l.at[0] + '" y="' + l.at[1] + '">' + l.text + '</text>').join('') + '</g>');
  }

  // viewBox 1000×1000 + slice（与 MMS 同源）；战棋侧保持容器正方形，避免 slice 裁切与百分比层错位
  return '<svg viewBox="0 0 1000 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="display:block" font-family="' + S.font + '">' + parts.join('\n') + '\n</svg>';
}
