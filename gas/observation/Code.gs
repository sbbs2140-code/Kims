/**
 * 수업 관찰 기록 (Google Apps Script 웹앱)
 * 이 스크립트가 연결된 구글 시트에 기록을 저장한다.
 *
 * @OnlyCurrentDoc  연결된 시트 하나만 접근하도록 권한을 좁힘
 */

const AREAS = ['수업 태도', '개념 이해', '실습 수행', '문제 해결', '의사소통', '협업', '진로탐색', '과제수행', '기타'];

const TABLES = {
  obs: {
    name: '관찰기록',
    keys: ['id', 'date', 'subject', 'student', 'area', 'content', 'feedback', 'createdAt', 'updatedAt'],
    headers: ['ID', '날짜', '교과 영역', '학생 이름', '관찰 영역', '관찰 내용', '피드백·후속 지도', '입력 시각', '수정 시각'],
    widths: [90, 100, 140, 100, 100, 360, 300, 170, 170],
  },
  refl: {
    name: '수업성찰',
    keys: ['id', 'date', 'subject', 'good', 'difficult', 'improve', 'students', 'createdAt', 'updatedAt'],
    headers: ['ID', '날짜', '수업', '잘된 점', '어려워한 내용', '개선할 점', '추가 지도 학생', '입력 시각', '수정 시각'],
    widths: [90, 100, 140, 280, 280, 280, 200, 170, 170],
  },
};

// ---------- 웹앱 ----------
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('수업 관찰 기록')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- 클라이언트에서 부르는 함수 ----------
function getAll() {
  return {
    observations: readAll_('obs'),
    reflections: readAll_('refl'),
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  };
}

function saveObservation(rec) {
  return withLock_(() => upsert_('obs', normalizeObs_(rec)));
}

function saveReflection(rec) {
  return withLock_(() => upsert_('refl', normalizeRefl_(rec)));
}

function deleteRecord(kind, id) {
  if (!TABLES[kind]) throw new Error('잘못된 요청입니다.');
  return withLock_(() => {
    const sh = sheet_(kind);
    const row = findRow_(sh, String(id));
    if (row) sh.deleteRow(row);
    return !!row;
  });
}

/** mode: 'merge'(합치기) | 'replace'(바꾸기) */
function importData(data, mode) {
  if (!data || !Array.isArray(data.observations)) throw new Error('관찰 기록(observations)이 없습니다.');
  const incoming = {
    obs: data.observations.map(normalizeObs_).filter(Boolean),
    refl: (Array.isArray(data.reflections) ? data.reflections : []).map(normalizeRefl_).filter(Boolean),
  };
  return withLock_(() => {
    const added = {};
    Object.keys(incoming).forEach((kind) => {
      let list = incoming[kind];
      if (mode === 'merge') {
        const map = new Map(readAll_(kind).map((x) => [x.id, x]));
        let n = 0;
        list.forEach((x) => {
          const cur = map.get(x.id);
          if (!cur) { map.set(x.id, x); n++; } else if (x.updatedAt > cur.updatedAt) map.set(x.id, x);
        });
        list = Array.from(map.values());
        added[kind] = n;
      } else {
        added[kind] = list.length;
      }
      writeAll_(kind, list);
    });
    return { observations: readAll_('obs'), reflections: readAll_('refl'), addedObs: added.obs, addedRefl: added.refl };
  });
}

function deleteAll() {
  return withLock_(() => {
    writeAll_('obs', []);
    writeAll_('refl', []);
    return true;
  });
}

// ---------- 시트 다루기 ----------
function sheet_(kind) {
  const t = TABLES[kind];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(t.name);
  if (!sh) {
    sh = ss.insertSheet(t.name);
    sh.getRange(1, 1, sh.getMaxRows(), t.keys.length).setNumberFormat('@'); // 날짜가 자동 변환되지 않게 일반 텍스트로
    sh.getRange(1, 1, 1, t.keys.length).setValues([t.headers]).setFontWeight('bold').setBackground('#1B2A4A').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    t.widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
    sh.getRange(2, 1, sh.getMaxRows() - 1, t.keys.length).setWrap(true).setVerticalAlignment('top');
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
        const v = r[i];
        if (v instanceof Date) o[k] = Utilities.formatDate(v, tz, k === 'date' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss");
        else o[k] = String(v);
      });
      return o;
    });
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

function upsert_(kind, rec) {
  if (!rec) throw new Error('날짜와 이름(또는 내용)을 확인해 주세요.');
  const t = TABLES[kind];
  const sh = sheet_(kind);
  const now = new Date().toISOString();
  rec.updatedAt = now;
  if (!rec.createdAt) rec.createdAt = now;
  let row = findRow_(sh, rec.id);
  if (!row) {
    row = sh.getLastRow() + 1;
    ensureRows_(sh, row);
  }
  sh.getRange(row, 1, 1, t.keys.length).setValues([toRow_(kind, rec)]);
  return rec;
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2 || !id) return 0;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}

function ensureRows_(sh, needed) {
  const max = sh.getMaxRows();
  if (needed > max) {
    sh.insertRowsAfter(max, needed - max + 100);
    sh.getRange(max + 1, 1, needed - max + 100, sh.getMaxColumns()).setNumberFormat('@');
  }
}

// 시트에서 수식으로 실행되지 않도록 = + - @ 로 시작하는 값 앞에 ' 를 붙임
function toRow_(kind, x) {
  return TABLES[kind].keys.map((k) => {
    const v = x[k] == null ? '' : String(x[k]);
    return /^[=+\-@]/.test(v) ? "'" + v : v;
  });
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------- 입력값 정리 ----------
function str_(v) { return v == null ? '' : String(v); }
function isDate_(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v); }
function newId_() { return Utilities.getUuid(); }

function normalizeObs_(o) {
  if (!o || !isDate_(str_(o.date)) || !str_(o.student).trim()) return null;
  return {
    id: str_(o.id) || newId_(),
    date: str_(o.date),
    subject: str_(o.subject).trim(),
    student: str_(o.student).trim(),
    area: AREAS.indexOf(o.area) >= 0 ? o.area : '기타',
    content: str_(o.content),
    feedback: str_(o.feedback),
    createdAt: str_(o.createdAt),
    updatedAt: str_(o.updatedAt) || str_(o.createdAt),
  };
}

function normalizeRefl_(r) {
  if (!r || !isDate_(str_(r.date))) return null;
  return {
    id: str_(r.id) || newId_(),
    date: str_(r.date),
    subject: str_(r.subject).trim(),
    good: str_(r.good),
    difficult: str_(r.difficult),
    improve: str_(r.improve),
    students: str_(r.students),
    createdAt: str_(r.createdAt),
    updatedAt: str_(r.updatedAt) || str_(r.createdAt),
  };
}
