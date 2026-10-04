/**
 * 수업 관찰 기록 v2 (Google Apps Script 웹앱)
 * 이 스크립트가 연결된 구글 시트에 학급·학생·관찰·수행평가·성찰을 저장한다.
 *
 * @OnlyCurrentDoc  연결된 시트 하나만 접근하도록 권한을 좁힘
 */

const APP_ID = 'onbit-observation';
const APP_VERSION = 2;

const AREAS = ['수업 태도', '개념 이해', '실습 수행', '문제 해결', '의사소통', '협업', '진로탐색', '과제수행', '기타'];
const TONES = ['good', 'normal', 'care'];
const STATUSES = ['done', 'absent', 'missing'];

// 시트 탭 정의. keys 순서가 열 순서이며, json 열은 JSON 문자열로, num 열은 숫자로 다룬다.
const TABLES = {
  classes: {
    sheet: '학급',
    keys: ['id', 'name', 'subject', 'order', 'createdAt', 'updatedAt'],
    headers: ['ID', '학급', '교과', '순서', '입력 시각', '수정 시각'],
    num: ['order'],
  },
  students: {
    sheet: '학생',
    keys: ['id', 'classId', 'no', 'name', 'active', 'createdAt', 'updatedAt'],
    headers: ['ID', '학급ID', '번호', '이름', '재적(Y/N)', '입력 시각', '수정 시각'],
    num: ['no'],
  },
  obs: {
    sheet: '관찰기록',
    keys: ['id', 'date', 'time', 'classId', 'studentId', 'area', 'tone', 'content', 'feedback', 'createdAt', 'updatedAt'],
    headers: ['ID', '날짜', '시각', '학급ID', '학생ID', '관찰 영역', '구분', '관찰 내용', '피드백·후속 지도', '입력 시각', '수정 시각'],
  },
  assessments: {
    sheet: '수행평가',
    keys: ['id', 'classId', 'title', 'date', 'criteria', 'baseScore', 'createdAt', 'updatedAt'],
    headers: ['ID', '학급ID', '평가명', '평가일', '채점 기준(JSON)', '기본 점수', '입력 시각', '수정 시각'],
    json: ['criteria'],
    num: ['baseScore'],
  },
  scores: {
    sheet: '채점',
    keys: ['id', 'assessmentId', 'studentId', 'status', 'picks', 'total', 'memo', 'createdAt', 'updatedAt'],
    headers: ['ID', '평가ID', '학생ID', '상태', '선택 수준(JSON)', '합계', '평가 내용', '입력 시각', '수정 시각'],
    json: ['picks'],
    num: ['total'],
  },
  reflections: {
    sheet: '수업성찰',
    keys: ['id', 'date', 'classId', 'good', 'difficult', 'improve', 'students', 'createdAt', 'updatedAt'],
    headers: ['ID', '날짜', '학급ID', '잘된 점', '어려워한 내용', '개선할 점', '추가 지도 학생', '입력 시각', '수정 시각'],
  },
  phrases: {
    sheet: '빠른문구',
    keys: ['id', 'kind', 'area', 'list', 'updatedAt'],
    headers: ['ID', '종류', '영역', '문구(JSON)', '수정 시각'],
    json: ['list'],
  },
};
const KINDS = Object.keys(TABLES);

// ---------- 웹앱 ----------
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('수업 관찰 기록')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

// ---------- 클라이언트에서 부르는 함수 ----------
/** 처음 열 때 모든 기록을 한 번에 보냄 */
function bootstrap() {
  const tables = {};
  KINDS.forEach((k) => (tables[k] = readAll_(k)));
  return { app: APP_ID, version: APP_VERSION, tables: tables, sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() };
}

/** 같은 종류의 기록 여러 개를 추가하거나 고침(ID 기준) */
function saveMany(kind, recs) {
  checkKind_(kind);
  if (!Array.isArray(recs)) recs = [recs];
  const clean = recs.map((r) => normalize_(kind, r));
  return withLock_(() => {
    upsertMany_(kind, clean);
    return clean.length;
  });
}

/** { 종류: [ID, ...] } 형태로 받은 기록을 지움. 연결된 기록(학생의 관찰 등)은 클라이언트가 함께 보냄 */
function removeMany(map) {
  if (!map || typeof map !== 'object') throw new Error('잘못된 요청입니다.');
  return withLock_(() => {
    let n = 0;
    Object.keys(map).forEach((kind) => {
      checkKind_(kind);
      const ids = (map[kind] || []).map(String);
      if (ids.length) n += deleteIds_(kind, new Set(ids));
    });
    return n;
  });
}

/** mode: 'merge'(합치기, 같은 ID는 더 최근에 고친 쪽) | 'replace'(바꾸기) */
function importAll(tables, mode) {
  if (!tables || typeof tables !== 'object') throw new Error('불러올 데이터가 없습니다.');
  const incoming = {};
  KINDS.forEach((k) => {
    incoming[k] = (Array.isArray(tables[k]) ? tables[k] : []).map((r) => {
      try { return normalize_(k, r, true); } catch (e) { return null; }
    }).filter(Boolean);
  });
  return withLock_(() => {
    const added = {};
    KINDS.forEach((k) => {
      let list = incoming[k];
      if (mode === 'merge') {
        const map = new Map(readAll_(k).map((x) => [x.id, x]));
        let n = 0;
        list.forEach((x) => {
          const cur = map.get(x.id);
          if (!cur) { map.set(x.id, x); n++; } else if (String(x.updatedAt) > String(cur.updatedAt)) map.set(x.id, x);
        });
        list = Array.from(map.values());
        added[k] = n;
      } else {
        added[k] = list.length;
      }
      writeAll_(k, list);
    });
    return { added: added };
  });
}

function deleteAll() {
  return withLock_(() => {
    KINDS.forEach((k) => writeAll_(k, []));
    return true;
  });
}

// ---------- 입력값 검사 ----------
function checkKind_(kind) {
  if (!TABLES[kind]) throw new Error('알 수 없는 종류입니다: ' + kind);
}
function str_(v) { return v == null ? '' : String(v); }
function isDate_(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v); }
function num_(v, d) { const n = Number(v); return isFinite(n) ? n : d; }

/** 종류별 필수값을 확인하고 정리함. importing 이면 시각을 그대로 둠 */
function normalize_(kind, r, importing) {
  if (!r || typeof r !== 'object') throw new Error('기록 형식이 맞지 않습니다.');
  const o = {};
  TABLES[kind].keys.forEach((k) => (o[k] = r[k]));
  o.id = str_(o.id).trim();
  if (!o.id) throw new Error('ID가 없는 기록입니다.');
  const now = new Date().toISOString();
  o.createdAt = str_(o.createdAt) || now;
  o.updatedAt = importing ? (str_(o.updatedAt) || o.createdAt) : now;

  switch (kind) {
    case 'classes':
      o.name = str_(o.name).trim();
      if (!o.name) throw new Error('학급 이름이 없습니다.');
      o.subject = str_(o.subject).trim();
      o.order = num_(o.order, 0);
      break;
    case 'students':
      o.classId = str_(o.classId);
      o.name = str_(o.name).trim();
      if (!o.classId || !o.name) throw new Error('학생의 학급 또는 이름이 없습니다.');
      o.no = num_(o.no, 0);
      o.active = o.active === 'N' ? 'N' : 'Y';
      break;
    case 'obs':
      if (!isDate_(str_(o.date))) throw new Error('관찰 날짜 형식이 맞지 않습니다.');
      if (!o.studentId || !o.classId) throw new Error('관찰 기록의 학생 정보가 없습니다.');
      o.area = AREAS.indexOf(o.area) >= 0 ? o.area : '기타';
      o.tone = TONES.indexOf(o.tone) >= 0 ? o.tone : 'normal';
      ['time', 'classId', 'studentId', 'content', 'feedback'].forEach((k) => (o[k] = str_(o[k])));
      break;
    case 'assessments':
      o.classId = str_(o.classId);
      o.title = str_(o.title).trim();
      if (!o.classId || !o.title) throw new Error('평가의 학급 또는 이름이 없습니다.');
      if (!isDate_(str_(o.date))) throw new Error('평가일 형식이 맞지 않습니다.');
      if (!Array.isArray(o.criteria) || !o.criteria.length) throw new Error('채점 기준이 없습니다.');
      o.criteria = o.criteria.map((c) => ({
        name: str_(c && c.name).trim() || '기준',
        levels: (Array.isArray(c && c.levels) ? c.levels : []).slice(0, 5).map((l) => ({ pt: num_(l && l.pt, 0), d: str_(l && l.d) })),
      }));
      o.baseScore = num_(o.baseScore, 0);
      break;
    case 'scores':
      o.assessmentId = str_(o.assessmentId);
      o.studentId = str_(o.studentId);
      if (!o.assessmentId || !o.studentId) throw new Error('채점 기록의 평가 또는 학생 정보가 없습니다.');
      o.status = STATUSES.indexOf(o.status) >= 0 ? o.status : 'done';
      o.picks = Array.isArray(o.picks) ? o.picks.map((p) => (p == null ? null : num_(p, null))) : [];
      o.total = num_(o.total, 0);
      o.memo = str_(o.memo);
      break;
    case 'reflections':
      if (!isDate_(str_(o.date))) throw new Error('성찰 날짜 형식이 맞지 않습니다.');
      ['classId', 'good', 'difficult', 'improve', 'students'].forEach((k) => (o[k] = str_(o[k])));
      break;
    case 'phrases':
      o.kind = o.kind === 'score' ? 'score' : 'obs';
      o.area = str_(o.area);
      o.list = (Array.isArray(o.list) ? o.list : []).map(str_).map((s) => s.trim()).filter(Boolean).slice(0, 30);
      delete o.createdAt;
      break;
  }
  return o;
}

// ---------- 시트 다루기 ----------
function sheet_(kind) {
  const t = TABLES[kind];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(t.sheet);
  if (!sh) {
    sh = ss.insertSheet(t.sheet);
    const n = t.keys.length;
    sh.getRange(1, 1, sh.getMaxRows(), n).setNumberFormat('@'); // 날짜·번호가 자동 변환되지 않게 일반 텍스트로
    sh.getRange(1, 1, 1, n).setValues([t.headers]).setFontWeight('bold').setBackground('#8B6BE0').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    if (sh.getMaxColumns() > n) sh.deleteColumns(n + 1, sh.getMaxColumns() - n);
  }
  return sh;
}

function readAll_(kind) {
  const t = TABLES[kind];
  const sh = sheet_(kind);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const tz = Session.getScriptTimeZone();
  return sh.getRange(2, 1, last - 1, t.keys.length).getValues()
    .filter((r) => String(r[0]).trim())
    .map((r) => {
      const o = {};
      t.keys.forEach((k, i) => {
        let v = r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, tz, k === 'date' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss");
        else v = String(v);
        if (t.json && t.json.indexOf(k) >= 0) { try { v = v ? JSON.parse(v) : []; } catch (e) { v = []; } }
        else if (t.num && t.num.indexOf(k) >= 0) v = num_(v, 0);
        o[k] = v;
      });
      return o;
    });
}

function toRow_(kind, x) {
  const t = TABLES[kind];
  return t.keys.map((k) => {
    let v = x[k];
    if (t.json && t.json.indexOf(k) >= 0) v = JSON.stringify(v == null ? [] : v);
    v = v == null ? '' : String(v);
    // 시트에서 수식으로 실행되지 않도록 = + - @ 로 시작하는 값 앞에 ' 를 붙임
    return /^[=+\-@]/.test(v) ? "'" + v : v;
  });
}

function upsertMany_(kind, list) {
  if (!list.length) return;
  list = Array.from(new Map(list.map((x) => [x.id, x])).values()); // 같은 ID가 두 번 오면 마지막 것만
  const t = TABLES[kind];
  const sh = sheet_(kind);
  const last = sh.getLastRow();
  const rowOf = new Map();
  if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach((r, i) => rowOf.set(String(r[0]), i + 2));
  const appends = [];
  list.forEach((x) => {
    const row = rowOf.get(x.id);
    if (row) sh.getRange(row, 1, 1, t.keys.length).setValues([toRow_(kind, x)]);
    else { appends.push(toRow_(kind, x)); rowOf.set(x.id, -1); }
  });
  if (appends.length) {
    ensureRows_(sh, last + appends.length);
    sh.getRange(last + 1, 1, appends.length, t.keys.length).setValues(appends);
  }
}

function deleteIds_(kind, idSet) {
  const sh = sheet_(kind);
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const rows = [];
  sh.getRange(2, 1, last - 1, 1).getValues().forEach((r, i) => { if (idSet.has(String(r[0]))) rows.push(i + 2); });
  if (!rows.length) return 0;
  if (rows.length <= 30) {
    rows.sort((a, b) => b - a).forEach((r) => sh.deleteRow(r));
  } else {
    writeAll_(kind, readAll_(kind).filter((x) => !idSet.has(x.id)));
  }
  return rows.length;
}

function writeAll_(kind, list) {
  const t = TABLES[kind];
  const sh = sheet_(kind);
  const last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, t.keys.length).clearContent();
  if (!list.length) return;
  ensureRows_(sh, list.length + 1);
  sh.getRange(2, 1, list.length, t.keys.length).setValues(list.map((x) => toRow_(kind, x)));
}

function ensureRows_(sh, needed) {
  const max = sh.getMaxRows();
  if (needed > max) {
    const add = needed - max + 200;
    sh.insertRowsAfter(max, add);
    sh.getRange(max + 1, 1, add, sh.getMaxColumns()).setNumberFormat('@');
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
