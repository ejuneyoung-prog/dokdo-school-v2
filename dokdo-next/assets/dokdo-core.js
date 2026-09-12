/* Dokdo RC1: pure progress rules. No network, timers, or browser globals. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DokdoCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const VERSION = 3, MAX_LIGHT = 4, VISIT_MS = 60000, LEGACY_VISIT_MS = 600000, MAX_VISITORS = 10;
  const clone = x => JSON.parse(JSON.stringify(x));
  const number = x => Number.isFinite(x) && x >= 0 ? x : 0;
  const plain = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const badKeys = new Set(['__proto__', 'prototype', 'constructor']);
  function assertSafeTree(x, depth = 0) {
    if (depth > 30) throw new Error('Backup nesting is too deep.');
    if (!x || typeof x !== 'object') return;
    for (const k of Object.keys(x)) {
      if (badKeys.has(k)) throw new Error('Unsafe backup field.');
      assertSafeTree(x[k], depth + 1);
    }
  }
  function dayKey(value = Date.now()) {
    const t = new Date(value).getTime();
    if (!Number.isFinite(t)) throw new Error('Invalid time.');
    return new Date(t + 9 * 3600000).toISOString().slice(0, 10);
  }
  function addDays(day, n) {
    const d = new Date(day + 'T12:00:00Z');
    if (!Number.isFinite(d.getTime())) throw new Error('Invalid day.');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function weekKey(value = Date.now()) {
    const day = dayKey(value), dow = new Date(day + 'T12:00:00Z').getUTCDay();
    return addDays(day, -((dow + 6) % 7));
  }
  const GRADES = ['K','E1','E2','E3','E4','E5','E6','M1','M2','M3','H1','H2','H3','U1','U2','U3','U4','MA1','MA2','PHD1','PHD2',...Array.from({length:9},(_,i)=>'DK'+(i+1))];
  const GRADE_ALIASES = {CR1:'DK1',CR2:'DK2',CR3:'DK3',CR4:'DK4',CR5:'DK5',PR1:'DK6',PR2:'DK7',PR3:'DK8',HEAD:'DK9'};
  const gradeRank = g => GRADES.indexOf(GRADE_ALIASES[g] || g);
  function validDay(x) {
    if(typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
    const t=new Date(x+'T12:00:00Z'); return Number.isFinite(t.getTime()) && t.toISOString().slice(0,10)===x;
  }
  function validWeek(w) {
    if(!plain(w) || !validDay(w.key) || new Date(w.key+'T12:00:00Z').getUTCDay()!==1) throw new Error('Invalid weekly record.');
    for(const k of ['correct','eligible']) if(!Number.isSafeInteger(w[k]) || w[k]<0) throw new Error('Invalid weekly count.');
    if(w.eligible>w.correct) throw new Error('Invalid weekly ranking count.');
  }
  function validateState(s) {
    if (!plain(s) || !plain(s.m)) throw new Error('Invalid progress object.');
    assertSafeTree(s);
    if(s.schemaVersion != null && (!Number.isSafeInteger(s.schemaVersion) || s.schemaVersion<1 || s.schemaVersion>VERSION)) throw new Error('Unsupported progress schema version.');
    for(const field of ['passed','badgesEver','recent','recentG']) {
      if(s[field]!=null && !Array.isArray(s[field])) throw new Error('Invalid '+field+' list.');
    }
    for(const field of ['passed','badgesEver']) {
      if(s[field] && s[field].some(x=>typeof x!=='string' || x.length>100)) throw new Error('Invalid '+field+' list item.');
    }
    if(s.weekly!=null) {
      validWeek(s.weekly);
      if(s.weekly.credits!=null && (!plain(s.weekly.credits) || Object.values(s.weekly.credits).some(x=>x!==true))) throw new Error('Invalid weekly credits.');
      if(s.weekly.history!=null && !Array.isArray(s.weekly.history)) throw new Error('Invalid weekly history.');
      const keys=new Set();
      for(const w of s.weekly.history||[]) {validWeek(w);if(keys.has(w.key)||w.key>=s.weekly.key)throw new Error('Invalid weekly history order.');keys.add(w.key);}
    }
    if(s.learningProfile!=null) {
      const p=s.learningProfile;
      if(!plain(p)||p.version!==1||!['u7','8-9','10-11','12-13','14-16','17-19','20+'].includes(p.ageBand)||!Number.isInteger(p.stage)||p.stage<1||p.stage>4||typeof p.easy!=='boolean'||!Number.isInteger(p.readingMax)||p.readingMax<1||p.readingMax>4||!plain(p.completed)) throw new Error('Invalid learning profile.');
      if(Object.keys(p.completed).some(k=>!['1','2','3','4'].includes(k)||typeof p.completed[k]!=='string'))throw new Error('Invalid learning completion record.');
      if(p.placement!=null && (!plain(p.placement)||!Array.isArray(p.placement.answers)||p.placement.answers.length>5||p.placement.total!==5||!Number.isInteger(p.placement.correct)||p.placement.correct<0||p.placement.correct>5))throw new Error('Invalid placement record.');
    }
    if(s.seaDensity!=null&&!['calm','rich','full'].includes(s.seaDensity))throw new Error('Invalid sea density.');
    if(s.scene!=null) {
      if(!plain(s.scene)||!Array.isArray(s.scene.order)||s.scene.order.length>20000||s.scene.order.some(x=>!Number.isSafeInteger(x)||x<=0)||new Set(s.scene.order).size!==s.scene.order.length) throw new Error('Invalid scene order.');
      if(!plain(s.scene.beaconSlots)||Object.values(s.scene.beaconSlots).some(x=>!Number.isInteger(x)||x<0||x>=48)) throw new Error('Invalid scene beacon position.');
      if(s.scene.timeSec!=null && (!Number.isFinite(s.scene.timeSec)||s.scene.timeSec<0)) throw new Error('Invalid scene time.');
    }
    if(s.gangchiVisits!=null) {
      if(!Array.isArray(s.gangchiVisits)||s.gangchiVisits.length>MAX_VISITORS) throw new Error('Invalid visitor list.');
      const seats=new Set(),ids=new Set();
      for(const v of s.gangchiVisits) {
        if(!plain(v)||typeof v.id!=='string'||!v.id||!Number.isFinite(v.remainingMs)||v.remainingMs<=0||v.remainingMs>LEGACY_VISIT_MS||!Number.isInteger(v.seat)||v.seat<0||v.seat>=MAX_VISITORS||seats.has(v.seat)||ids.has(v.id)) throw new Error('Invalid visitor record.');
        seats.add(v.seat);ids.add(v.id);
      }
    }
    for (const k of ['xp', 'streak', 'gcHit', 'run', 'best']) {
      if (s[k] != null && (!Number.isFinite(s[k]) || s[k] < 0)) throw new Error('Invalid ' + k);
    }
    if (Object.keys(s.m).length > 20000) throw new Error('Too many question records.');
    for (const [id, r] of Object.entries(s.m)) {
      if (!/^[1-9][0-9]*$/.test(id) || !plain(r)) throw new Error('Invalid question record.');
      if(r.pilotIndependentDays!=null && (!Array.isArray(r.pilotIndependentDays)||r.pilotIndependentDays.some(d=>!validDay(d))||new Set(r.pilotIndependentDays).size!==r.pilotIndependentDays.length)) throw new Error('Invalid independent learning dates.');
      for (const k of ['lv', 'att', 'cor', 'seen', 'earned', 'lightBest']) {
        if (r[k] != null && (!Number.isFinite(r[k]) || r[k] < 0)) throw new Error('Invalid record value.');
      }
    }
    for (const k of ['name', 'nick', 'school', 'grade', 'flag']) {
      if (s[k] != null && (typeof s[k] !== 'string' || s[k].length > 300)) throw new Error('Invalid profile field.');
    }
    return true;
  }
  function ensure(s, now = Date.now()) {
    if (!plain(s.m)) s.m = {};
    s.schemaVersion = VERSION;
    if (!plain(s.scene)) s.scene = {version: 1, order: [], beaconSlots: {}};
    if (!Array.isArray(s.scene.order)) s.scene.order = [];
    if (!plain(s.scene.beaconSlots)) s.scene.beaconSlots = {};
    const seen = new Set();
    s.scene.order = s.scene.order.filter(id => Number.isSafeInteger(id) && id > 0 && !seen.has(id) && seen.add(id));
    for (const id of Object.keys(s.m).sort((a,b) => +a - +b)) {
      const r = s.m[id];
      if (!plain(r)) continue;
      r.lightBest = Math.min(MAX_LIGHT, Math.max(number(r.lightBest), number(r.lv), number(r.cor) > 0 ? 1 : 0));
      if (r.lightBest > 0 && !seen.has(+id)) {s.scene.order.push(+id); seen.add(+id);}
    }
    if (!Array.isArray(s.gangchiVisits)) s.gangchiVisits = [];
    s.gangchiVisits = s.gangchiVisits.filter(v => plain(v) && Number.isFinite(v.remainingMs) && v.remainingMs > 0)
      .slice(0, MAX_VISITORS).map((v,i) => ({id: String(v.id || ('legacy-' + i)), remainingMs: Math.min(LEGACY_VISIT_MS, v.remainingMs), seat: Number.isInteger(v.seat) && v.seat >= 0 && v.seat < MAX_VISITORS ? v.seat : i}));
    const usedSeats = new Set();
    for (const v of s.gangchiVisits) {
      if (usedSeats.has(v.seat)) v.seat = Array.from({length:MAX_VISITORS}, (_,i)=>i).find(i=>!usedSeats.has(i));
      usedSeats.add(v.seat);
    }
    if (!plain(s.weekly)) s.weekly = {key: weekKey(now), correct: 0, eligible: 0, credits: {}, history: [], since: new Date(now).toISOString(), partial: true};
    rollover(s, now);
    return s;
  }
  function rollover(s, now = Date.now()) {
    const w = s.weekly, key = weekKey(now);
    if (!Array.isArray(w.history)) w.history = [];
    if (!plain(w.credits)) w.credits = {};
    if (key > w.key) {
      w.history.push({key:w.key, correct:number(w.correct), eligible:number(w.eligible), partial:!!w.partial});
      w.key = key; w.correct = 0; w.eligible = 0; w.credits = {}; w.partial = false;
    }
    // Clock rollback never erases or rewinds an already-started week.
    return w;
  }
  function visualLevel(r) {
    return Math.min(MAX_LIGHT, Math.max(number(r && r.lightBest), number(r && r.lv), number(r && r.cor) > 0 ? 1 : 0));
  }
  function correctCount(s) {return Object.values(s.m).reduce((a,r)=>a+number(r.cor),0);}
  function registerAnswer(s, id, correct, now = Date.now()) {
    ensure(s, now);
    if (!correct) return;
    const w = rollover(s, now);
    if (weekKey(now) !== w.key) return;
    w.correct = number(w.correct) + 1;
    const credit = dayKey(now) + ':' + id;
    if (!w.credits[credit]) {w.credits[credit] = true; w.eligible = number(w.eligible) + 1;}
  }
  function advanceLearning(s, id, correct, hinted, now = Date.now()) {
    const r = s.m[id];
    if (!r) throw new Error('Question record must exist.');
    const day = dayKey(now), best = visualLevel(r), previous = number(r.lv);
    const eligible = !r.due || r.due <= day;
    if (!correct) {r.lv = 0; r.due = addDays(day,1);}
    else if (previous === 0 || (eligible && !hinted && r.lastAdvancedDay !== day)) {
      r.lv = Math.min(MAX_LIGHT, previous + 1);
      r.lastAdvancedDay = day;
      r.due = addDays(day, [1,1,3,7,30][r.lv]);
    }
    r.lastAnsweredAt = new Date(now).toISOString();
    r.lightBest = Math.max(best, number(r.lv));
    if (correct && r.lightBest === 0) r.lightBest = 1;
    ensure(s, now);
    registerAnswer(s,id,correct,now);
    return r;
  }
  function invite(s, now = Date.now(), requested = MAX_VISITORS) {
    ensure(s, now);
    const count = Number.isInteger(requested) ? Math.max(0, Math.min(MAX_VISITORS, requested)) : 0;
    const n = Math.min(count, MAX_VISITORS - s.gangchiVisits.length, Math.floor(number(s.gcHit)/5));
    const occupied = new Set(s.gangchiVisits.map(v=>v.seat));
    for (let i = 0; i < n; i++) {
      const seat = Array.from({length:MAX_VISITORS},(_,j)=>j).find(j=>!occupied.has(j));
      occupied.add(seat);
      s.gangchiVisits.push({id:String(now) + '-' + seat, remainingMs: VISIT_MS, seat});
    }
    s.gcHit = number(s.gcHit) - n*5;
    return n;
  }
  function tickVisits(s, dtMs, active) {
    if (!active || !Number.isFinite(dtMs) || dtMs <= 0) return;
    for (const v of s.gangchiVisits || []) v.remainingMs = Math.max(0, v.remainingMs - dtMs);
    s.gangchiVisits = (s.gangchiVisits || []).filter(v=>v.remainingMs > 0);
  }
  function envelope(s, language, now = Date.now()) {
    validateState(s);
    return {format:'dokdo-school-backup', version:1, exportedAt:new Date(now).toISOString(), language, state:clone(s)};
  }
  function readBackup(text, current, now = Date.now(), expectedLanguage = null) {
    if (typeof text !== 'string' || text.length > 8000000) throw new Error('Backup exceeds 8 MB.');
    const data = JSON.parse(text);
    assertSafeTree(data);
    if (data.format !== 'dokdo-school-backup' || data.version !== 1) throw new Error('Unknown backup format.');
    if(!['ko','en'].includes(data.language)) throw new Error('Invalid backup language.');
    if(expectedLanguage && data.language!==expectedLanguage) throw new Error('Backup language differs. Open the matching language page first.');
    validateState(data.state);
    const incoming = ensure(clone(data.state), now);
    const protect = current && (current.started || number(current.xp)>0 || number(current.gcHit)>0 || (current.passed||[]).length>0 || (current.gangchiVisits||[]).length>0 || Object.values(current.m||{}).some(r=>['lv','lightBest','cor','att','seen','earned'].some(k=>number(r[k])>0)));
    if (protect && (number(incoming.xp) < number(current.xp) || correctCount(incoming) < correctCount(current))) {
      throw new Error('An older backup cannot replace more advanced progress. Current records were kept.');
    }
    if (protect) {
      for (const field of ['name', 'nick']) {
        if (current[field] && incoming[field] && current[field] !== incoming[field]) {
          throw new Error('This backup belongs to a different profile. Current records were kept.');
        }
      }
      for (const [id, previous] of Object.entries(current.m || {})) {
        const next = incoming.m[id];
        if (!next || ['cor', 'att', 'seen', 'earned'].some(k => number(next[k]) < number(previous[k])) || visualLevel(next) < visualLevel(previous)) {
          throw new Error('This backup would lose a question record or earned light. Current records were kept.');
        }
      }
      for (const field of ['passed', 'badgesEver']) {
        const next = new Set(incoming[field] || []);
        if ((current[field] || []).some(x => !next.has(x))) {
          throw new Error('This backup would remove an earned achievement. Current records were kept.');
        }
      }
    }
    if(protect) {
      for(const k of ['streak','best']) if(number(incoming[k])<number(current[k])) throw new Error('Restore conflict: '+k+' would decrease. Export both records first.');
      if(gradeRank(incoming.grade)<gradeRank(current.grade)) throw new Error('Restore conflict: game grade would decrease.');
      if(number(incoming.gcHit)<number(current.gcHit)) throw new Error('Restore conflict: unspent invite credits would disappear.');
      for(const v of current.gangchiVisits||[]) {
        const next=(incoming.gangchiVisits||[]).find(n=>n.id===v.id);
        if(!next || next.remainingMs<v.remainingMs || next.seat!==v.seat) throw new Error('Restore conflict: active visitor time or position would be lost.');
      }
      if(current.learningProfile) {
        const a=current.learningProfile,b=incoming.learningProfile;
        if(!b||a.ageBand!==b.ageBand||a.easy!==b.easy||b.stage<a.stage||Object.keys(a.completed||{}).some(k=>!b.completed[k]))throw new Error('Restore conflict: learning profile would be lost or changed.');
      }
      for(const [id,r] of Object.entries(current.m||{})){
        if((r.pilotIndependentDays||[]).some(day=>!(incoming.m[id]?.pilotIndependentDays||[]).includes(day)))throw new Error('Restore conflict: independent learning evidence would be lost.');
      }
      if(current.scene) {
        const order=current.scene.order||[];
        if(order.some((id,i)=>incoming.scene.order[i]!==id)) throw new Error('Restore conflict: existing landscape positions would change.');
        for(const [id,slot] of Object.entries(current.scene.beaconSlots||{})) if(incoming.scene.beaconSlots[id]!==slot) throw new Error('Restore conflict: a chosen beacon position would change.');
      }
      if(current.weekly) {
        const n=incoming.weekly, periods=[...(n.history||[]),n];
        for(const old of [...(current.weekly.history||[]),current.weekly]) {
          const next=periods.find(w=>w.key===old.key);
          if(!next || number(next.correct)<number(old.correct) || number(next.eligible)<number(old.eligible)) throw new Error('Restore conflict: weekly history would be lost.');
        }
        if(n.key===current.weekly.key && Object.keys(current.weekly.credits||{}).some(k=>!n.credits[k])) throw new Error('Restore conflict: weekly credit history would be lost.');
      }
    }
    return incoming;
  }
  return {VERSION, VISIT_MS, MAX_VISITORS, dayKey, weekKey, addDays, validateState, ensure, rollover, visualLevel,
    correctCount, registerAnswer, advanceLearning, invite, tickVisits, envelope, readBackup, clone};
});
