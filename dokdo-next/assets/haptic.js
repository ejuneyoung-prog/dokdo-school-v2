/* 놀이 진동: 손가락으로 누르는 기기 중 navigator.vibrate가 있는 브라우저(안드로이드 크롬 등)에서만 짧게 떤다.
 * 아이폰 사파리와 컴퓨터에는 진동 기능이 없어 아무 일도 하지 않고, 켬/끔 단추도 보이지 않는다.
 * 켬/끔은 이 기기에만 저장한다(dk-haptic-v1). 아무것도 보내지 않는다. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DokdoHaptic = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  const KEY = 'dk-haptic-v1';
  // 세기(ms): 누름은 아주 짧게, 알림(입질·별)은 조금 길게, 큰일(잡음·부딪힘)은 가장 길게.
  const MS = Object.freeze({ tap: 10, cue: 22, big: 40 });
  const nav = root.navigator || {};
  const available = typeof nav.vibrate === 'function' && !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
  let on = true;
  try { on = root.localStorage.getItem(KEY) !== 'off'; } catch (e) {}
  function buzz(kind) {
    const ms = MS[kind];
    if (!available || !on || !ms) return false;
    try { nav.vibrate(ms); return true; } catch (e) { return false; }
  }
  function set(value) {
    on = !!value;
    try { root.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
    if (on) buzz('cue');
    return on;
  }
  // 켬/끔 단추: 진동이 되는 기기에서만 보이고, 누를 때마다 글자와 aria-pressed를 바꾼다.
  function bindToggle(button, label) {
    if (!button) return;
    const paint = () => { button.setAttribute('aria-pressed', String(on)); button.textContent = label(on); };
    button.hidden = !available;
    if (!available) return;
    paint();
    button.addEventListener('click', () => { set(!on); paint(); });
    if (root.document) root.document.addEventListener('dokdo:language', paint);
  }
  return { KEY, MS, available, buzz, set, bindToggle, get on() { return on; } };
});
