'use strict';

(() => {
  const canvas = document.querySelector('#plaza');
  const wave = document.querySelector('#wave');
  const directions = [...document.querySelectorAll('[data-direction]')];
  let scene;
  try {
    scene = createPlaza(canvas);
  } catch {
    document.querySelector('#error').hidden = false;
    [wave, ...directions].forEach(button => { button.disabled = true; });
    return;
  }

  const keyMap = new Map(Object.entries({
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down'
  }));
  const held = new Map();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let waving = false;
  function toggleWave() {
    waving = !waving;
    wave.setAttribute('aria-pressed', String(waving));
  }

  wave.addEventListener('click', toggleWave);
  addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (keyMap.has(event.code)) {
      event.preventDefault();
      held.set(event.code, keyMap.get(event.code));
    }
    if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      if (!event.repeat) toggleWave();
    }
  });
  addEventListener('keyup', event => held.delete(event.code));
  addEventListener('blur', () => held.clear());
  document.addEventListener('visibilitychange', () => held.clear());

  for (const button of directions) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      button.setPointerCapture(event.pointerId);
      held.set(event.pointerId, button.dataset.direction);
    });
    for (const release of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(release, event => held.delete(event.pointerId));
    }
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('click', event => {
      if (event.detail) return;
      const offsets = { left: [-1,0], right: [1,0], up: [0,-1], down: [0,1] };
      move(...offsets[button.dataset.direction], .3);
    });
  }

  function move(x, z, distance) {
    const p = scene.player;
    const length = Math.hypot(x,z);
    p.heading = Math.atan2(-x,-z);
    const nextX = p.x + distance*x/length;
    const nextZ = p.z + distance*z/length;
    const rim = Math.max(1, Math.hypot(nextX/6.55,nextZ/5.7));
    if (Math.hypot(nextX,nextZ) >= 1.05) {
      p.x = nextX / rim;
      p.z = nextZ / rim;
    }
  }

  let previous;
  function tick(now) {
    const elapsed = Math.min(.05, (now - (previous ?? now)) / 1000);
    previous = now;
    const active = new Set(held.values());
    const x = Number(active.has('right')) - Number(active.has('left'));
    const z = Number(active.has('down')) - Number(active.has('up'));
    const moving = Boolean(x || z);
    if (moving) move(x,z,3.15*elapsed);
    scene.render(motion.matches ? 0 : now / 1000, moving, waving);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
