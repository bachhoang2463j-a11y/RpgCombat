import { CANVAS, Core, Game, Scale, VERSION } from 'phaser/dist/phaser.esm.js';
import { GRID, OPEN_GRID, START, TARGET, CLEAR, OUTSIDE, isFloor, queryMap } from './rules.mjs';

const WIDTH = 1000;
const HEIGHT = 520;
const TILE = 46;
const LEFT = 270;
const TOP = 76;
const WALL_COLOR = 0x414f66;
const START_COLOR = 0x79eae5;
const TARGET_COLOR = 0xffc17c;
const NORMAL = [0, 0, 1];
const SHIFTED = [94, 10, 1.3];
const locate = (x, y) => [LEFT + (x + 0.5) * TILE, TOP + (y + 0.5) * TILE];
const [targetX, targetY] = locate(...TARGET);
const board = queryMap(GRID);
const open = queryMap(OPEN_GRID);
const output = (name, value) => { document.getElementById(name).textContent = value; };

const evidence = window.p00Probe = {
  version: VERSION,
  transport: '&amp;|&lt;|&quot;|<|>|$&|$1',
  ready: false,
  clicks: [],
  csp: [],
  resources: () => performance.getEntriesByType('resource').map(({ name, initiatorType }) => ({ name, initiatorType })),
  geometry: {
    path: board.path,
    gap: board.path.filter(([x]) => x === 4),
    openSteps: open.path.length - 1,
    blocked: board.visibleInCone(...TARGET),
    revealed: open.visibleInCone(...TARGET),
    clear: board.visibleInCone(...CLEAR),
    outside: board.visibleInCone(...OUTSIDE),
    outsideVisibility: board.visibility(...OUTSIDE),
  },
};

function signal() {
  const requests = evidence.resources().filter(({ name }) => /^https?:/i.test(name));
  output('assets', `探针 HTTP(S) 子资源 ${requests.length} · CSP 阻止 ${evidence.csp.length}`);
  window.dispatchEvent(new Event('p00-evidence'));
}

document.addEventListener('securitypolicyviolation', ({ blockedURI, violatedDirective }) => {
  evidence.csp.push({ blockedURI, violatedDirective });
  signal();
});
new PerformanceObserver(signal).observe({ type: 'resource', buffered: true });

function avatar(graphics, x, y, color) {
  graphics.fillStyle(0x101a29).fillCircle(x, y, 18);
  graphics.lineStyle(2, color).strokeCircle(x, y, 16);
  graphics.fillStyle(color).fillCircle(x, y - 6, 4).fillRoundedRect(x - 8, y + 1, 16, 8, 4);
}

function create() {
  const camera = this.cameras.main;
  const graphics = this.add.graphics();
  for (const [y, row] of GRID.entries()) {
    for (let x = 0; x < row.length; x++) {
      const px = LEFT + x * TILE;
      const py = TOP + y * TILE;
      const floor = isFloor(GRID, x, y);
      const fill = floor ? (board.visibleInCone(x, y) ? 0x245765 : 0x1a293b) : WALL_COLOR;
      graphics.fillStyle(fill).fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
      if (!floor) graphics.fillStyle(0x61718a).fillRect(px + 1, py + 1, TILE - 2, 3);
    }
  }
  graphics.lineStyle(3, 0x7ee1c3).strokePoints(board.path.map(([x, y]) => {
    const [px, py] = locate(x, y);
    return { x: px, y: py };
  }));
  for (const [x, y] of board.path.slice(1, -1)) graphics.fillStyle(0x7ee1c3).fillCircle(...locate(x, y), 3);
  avatar(graphics, ...locate(...START), START_COLOR);
  avatar(graphics, targetX, targetY, TARGET_COLOR);

  const cameraReadout = () => {
    evidence.camera = { x: camera.scrollX, y: camera.scrollY, zoom: camera.zoom };
    output('camera', `相机 (${camera.scrollX}, ${camera.scrollY}) · ${camera.zoom.toFixed(2)}×`);
    signal();
  };
  for (const [id, pose] of [['transform', SHIFTED], ['reset', NORMAL]]) {
    document.getElementById(id).addEventListener('click', () => { this.pendingPose = pose; });
  }

  this.input.on('pointerdown', (pointer) => {
    const world = camera.getWorldPoint(pointer.x, pointer.y);
    const grid = [Math.floor((world.x - LEFT) / TILE), Math.floor((world.y - TOP) / TILE)];
    const id = Math.hypot(world.x - targetX, world.y - targetY) <= 16 ? 'target' : '—';
    const click = {
      screen: [pointer.x, pointer.y], world: [world.x, world.y], grid, id,
      camera: evidence.camera, trusted: pointer.event.isTrusted,
    };
    evidence.clicks.push(click);
    const pair = (values) => values.map(value => value.toFixed(1)).join(', ');
    output('click', `画布 (${pair(click.screen)}) → 世界 (${pair(click.world)}) → 格 (${grid.join(', ')}) · ${id}`);
    signal();
  });

  this.game.events.once(Core.Events.POST_RENDER, (renderer) => {
    const ctx = this.game.canvas.getContext('2d');
    const sample = (x, y, expected) => {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return (pixel[0] << 16 | pixel[1] << 8 | pixel[2]) === expected && pixel[3] === 255;
    };
    const [wallX, wallY] = locate(4, 3);
    const [startX, startY] = locate(...START);
    evidence.renderer = renderer.type;
    evidence.pixels = [sample(wallX, wallY, WALL_COLOR), sample(startX, startY - 6, START_COLOR), sample(targetX, targetY - 6, TARGET_COLOR)];
    evidence.ready = true;
    output('status', `Phaser ${VERSION} · Canvas 首帧已绘制`);
    output('route', `ROT A*：${board.path.length - 1} 步绕墙，经 (${evidence.geometry.gap.map(cell => cell.join(', ')).join(' / ')})；开墙 ${open.path.length - 1} 步`);
    output('fov', `ROT FOV + 90°：墙后${evidence.geometry.blocked ? '可见' : '不可见'}，开墙${evidence.geometry.revealed ? '可见' : '不可见'}`);
    cameraReadout();
  });

  this.events.on('postupdate', () => {
    if (!this.pendingPose) return;
    const [x, y, zoom] = this.pendingPose;
    this.pendingPose = null;
    camera.setScroll(x, y).setZoom(zoom);
    this.game.events.once(Core.Events.POST_RENDER, cameraReadout);
  });
}

new Game({
  type: CANVAS,
  parent: 'stage',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#101a29',
  banner: false,
  autoFocus: false,
  audio: { noAudio: true },
  input: { keyboard: false, gamepad: false },
  scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
  scene: { create },
});
