// A small stand-in for the "firebase-admin" package that works on Cloudflare (Pages Functions / Workers).
// It talks to Firebase with plain web requests (Firestore REST, Identity Toolkit, FCM v1) and the
// browser crypto API, so Nexa's server code runs unchanged with: import admin from './fbadmin.js'.
// Only the parts Nexa uses are here.

const enc = new TextEncoder();
const b64u = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64uJson = o => b64u(enc.encode(JSON.stringify(o)));
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
const env = k => (globalThis.process && globalThis.process.env && globalThis.process.env[k]) || '';

// ---------------------------------------------------------------- app / credentials
const state = { sa: null, keyP: null, token: null, tokenExp: 0, jwks: null, jwksExp: 0 };
function projectId() { return (state.sa && state.sa.project_id) || env('FIREBASE_PROJECT_ID') || env('GCLOUD_PROJECT'); }
async function privateKey() {
  if (!state.keyP) {
    const pem = String(state.sa.private_key || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
    state.keyP = crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  }
  return state.keyP;
}
async function signJwt(payload) {
  const head = b64uJson({ alg: 'RS256', typ: 'JWT' }), body = b64uJson(payload);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await privateKey(), enc.encode(head + '.' + body));
  return head + '.' + body + '.' + b64u(sig);
}
const SCOPES = 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/identitytoolkit';
async function accessToken() {
  if (emu.fs() || emu.auth()) return 'owner';
  if (state.token && Date.now() < state.tokenExp - 120e3) return state.token;
  if (state.tokenP) return state.tokenP;
  state.tokenP = fetchToken().finally(() => { state.tokenP = null; });
  return state.tokenP;
}
async function fetchToken() {
  const iat = Math.floor(Date.now() / 1000);
  const assertion = await signJwt({ iss: state.sa.client_email, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + assertion });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Google sign-in for the server failed: ' + (j.error_description || j.error || r.status));
  state.token = j.access_token; state.tokenExp = Date.now() + (j.expires_in || 3600) * 1000;
  return state.token;
}
// local testing with the Firebase emulators
const emu = { fs: () => env('FIRESTORE_EMULATOR_HOST'), auth: () => env('FIREBASE_AUTH_EMULATOR_HOST') };

class FirebaseError extends Error { constructor(code, message, status) { super(message || code); this.code = code; this.status = status; } }
async function gfetch(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { authorization: 'Bearer ' + await accessToken(), 'content-type': 'application/json', ...(opts.headers || {}) } });
  const text = await r.text(); let j = null; try { j = text ? JSON.parse(text) : {}; } catch { j = { raw: text }; }
  if (!r.ok) { const e = (j && (Array.isArray(j) ? j[0] : j).error) || {}; throw new FirebaseError(String(e.status || r.status).toLowerCase().replace(/_/g, '-'), e.message || ('HTTP ' + r.status), r.status); }
  return j;
}

// ---------------------------------------------------------------- Firestore values
class Timestamp {
  constructor(ms) { this._ms = ms; this.seconds = Math.floor(ms / 1000); this.nanoseconds = (ms % 1000) * 1e6; }
  toMillis() { return this._ms; } toDate() { return new Date(this._ms); } valueOf() { return this._ms; } toJSON() { return new Date(this._ms).toISOString(); }
  static now() { return new Timestamp(Date.now()); } static fromMillis(ms) { return new Timestamp(ms); } static fromDate(d) { return new Timestamp(+d); }
}
class Sentinel { constructor(kind, arg) { this.kind = kind; this.arg = arg; } }
const FieldValue = {
  delete: () => new Sentinel('delete'),
  increment: n => new Sentinel('increment', n),
  arrayUnion: (...v) => new Sentinel('arrayUnion', v),
  arrayRemove: (...v) => new Sentinel('arrayRemove', v),
  serverTimestamp: () => new Sentinel('serverTimestamp')
};
const isPlain = v => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Sentinel) && !(v instanceof Timestamp) && !(v instanceof Date) && !(v instanceof Uint8Array) && !(v instanceof DocumentReference);
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isSafeInteger(v) ? { integerValue: String(v) } : { doubleValue: Number.isFinite(v) ? v : (Number.isNaN(v) ? 'NaN' : v > 0 ? 'Infinity' : '-Infinity') };
  if (typeof v === 'bigint') return { integerValue: String(v) };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Timestamp) return { timestampValue: new Date(v.toMillis()).toISOString() };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (v instanceof Uint8Array) { let s = ''; for (const c of v) s += String.fromCharCode(c); return { bytesValue: btoa(s) }; }
  if (v instanceof DocumentReference) return { referenceValue: docName(v.path) };
  if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(toValue) } : {} };
  if (typeof v === 'object') { const fields = {}; for (const [k, x] of Object.entries(v)) if (x !== undefined && !(x instanceof Sentinel)) fields[k] = toValue(x); return { mapValue: { fields } }; }
  return { stringValue: String(v) };
}
function fromValue(v) {
  if (!v) return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return new Timestamp(Date.parse(v.timestampValue));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields);
  if ('referenceValue' in v) return v.referenceValue.replace(/^projects\/[^/]+\/databases\/[^/]+\/documents\//, '');
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('bytesValue' in v) return Uint8Array.from(atob(v.bytesValue), c => c.charCodeAt(0));
  return null;
}
function fromFields(f) { const o = {}; for (const [k, v] of Object.entries(f || {})) o[k] = fromValue(v); return o; }
const SIMPLE = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
const quoteSeg = s => SIMPLE.test(s) ? s : '`' + String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
const fieldPath = segs => segs.map(quoteSeg).join('.');

// ---------------------------------------------------------------- Firestore paths
const DB = () => `projects/${projectId()}/databases/(default)/documents`;
const HOST = () => emu.fs() ? `http://${emu.fs()}/v1/` : 'https://firestore.googleapis.com/v1/';
const docName = path => DB() + '/' + path;
const autoId = () => { const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; const r = crypto.getRandomValues(new Uint8Array(20)); let s = ''; for (const x of r) s += c[x % 62]; return s; };
const encPath = p => p.split('/').map(encodeURIComponent).join('/');

// Build one REST "write" from a JS object.
function buildWrite(path, data, mode) {
  // mode: 'set' | 'merge' | 'update' | 'create'
  const fields = {}, mask = [], transforms = [];
  const put = (segs, val) => { let f = fields; for (let i = 0; i < segs.length - 1; i++) { const k = segs[i]; if (!f[k] || !f[k].mapValue) f[k] = { mapValue: { fields: {} } }; f = f[k].mapValue.fields; } f[segs[segs.length - 1]] = toValue(val); };
  const sentinel = (segs, s) => {
    const fp = fieldPath(segs);
    if (s.kind === 'delete') { if (mode === 'set' || mode === 'create') throw new Error('FieldValue.delete() needs update() or set(…, {merge:true})'); mask.push(fp); return; }
    if (s.kind === 'increment') transforms.push({ fieldPath: fp, increment: toValue(s.arg) });
    if (s.kind === 'arrayUnion') transforms.push({ fieldPath: fp, appendMissingElements: { values: s.arg.map(toValue) } });
    if (s.kind === 'arrayRemove') transforms.push({ fieldPath: fp, removeAllFromArray: { values: s.arg.map(toValue) } });
    if (s.kind === 'serverTimestamp') transforms.push({ fieldPath: fp, setToServerValue: 'REQUEST_TIME' });
  };
  const walk = (segs, val, leafMask) => {
    if (val === undefined) return;
    if (val instanceof Sentinel) return sentinel(segs, val);
    if (isPlain(val) && (mode === 'merge' || mode === 'set' || mode === 'create') && Object.keys(val).length) {
      // keep walking so sentinels inside nested objects work (and merge masks only the leaves)
      let any = false;
      for (const [k, x] of Object.entries(val)) { any = true; walk([...segs, k], x, leafMask); }
      if (!any) { put(segs, val); if (leafMask) mask.push(fieldPath(segs)); }
      return;
    }
    put(segs, val); if (leafMask) mask.push(fieldPath(segs));
  };
  if (mode === 'update') {
    for (const [k, v] of Object.entries(data)) { const segs = k.split('.'); if (v instanceof Sentinel) sentinel(segs, v); else if (v !== undefined) { put(segs, v); mask.push(fieldPath(segs)); } }
  } else for (const [k, v] of Object.entries(data)) walk([k], v, mode === 'merge');
  const w = { update: { name: docName(path), fields } };
  if (mode === 'update' || mode === 'merge') w.updateMask = { fieldPaths: mask };
  if (mode === 'update') w.currentDocument = { exists: true };
  if (mode === 'create') w.currentDocument = { exists: false };
  if (transforms.length) w.updateTransforms = transforms;
  return w;
}
async function commit(writes, transaction) {
  if (!writes.length) return [];
  const body = { writes }; if (transaction) body.transaction = transaction;
  const r = await gfetch(HOST() + DB() + ':commit', { method: 'POST', body: JSON.stringify(body) });
  return r.writeResults || [];
}

class DocumentSnapshot {
  constructor(ref, doc) { this.ref = ref; this.id = ref.id; this.exists = !!doc; this._d = doc ? fromFields(doc.fields) : undefined; this.createTime = doc && doc.createTime; this.updateTime = doc && doc.updateTime; }
  data() { return this._d ? { ...this._d } : undefined; }
  get(f) { let o = this._d; for (const k of String(f).split('.')) { if (o == null) return undefined; o = o[k]; } return o; }
}
class QuerySnapshot { constructor(docs) { this.docs = docs; this.size = docs.length; this.empty = !docs.length; } forEach(fn) { this.docs.forEach(fn); } }

class DocumentReference {
  constructor(db, path) { this._db = db; this.path = path; this.id = path.split('/').pop(); }
  get parent() { return new CollectionReference(this._db, this.path.split('/').slice(0, -1).join('/')); }
  collection(sub) { return new CollectionReference(this._db, this.path + '/' + sub); }
  async get(tx) {
    try { const d = await gfetch(HOST() + DB() + '/' + encPath(this.path) + (tx ? '?transaction=' + encodeURIComponent(tx) : '')); return new DocumentSnapshot(this, d); }
    catch (e) { if (e.status === 404) return new DocumentSnapshot(this, null); throw e; }
  }
  set(data, opts) { return commit([buildWrite(this.path, data, opts && opts.merge ? 'merge' : 'set')]); }
  update(data) { return commit([buildWrite(this.path, data, 'update')]); }
  create(data) { return commit([buildWrite(this.path, data, 'create')]); }
  delete() { return commit([{ delete: docName(this.path) }]); }
}
const OPS = { '==': 'EQUAL', '!=': 'NOT_EQUAL', '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL', '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL', 'array-contains': 'ARRAY_CONTAINS', 'array-contains-any': 'ARRAY_CONTAINS_ANY', in: 'IN', 'not-in': 'NOT_IN' };
class Query {
  constructor(db, path, q = {}) { this._db = db; this._path = path; this._q = { where: [], order: [], ...q }; }
  _with(p) { return new Query(this._db, this._path, { ...this._q, ...p }); }
  where(f, op, v) { return this._with({ where: [...this._q.where, [f, op, v]] }); }
  orderBy(f, dir = 'asc') { return this._with({ order: [...this._q.order, [f, dir]] }); }
  limit(n) { return this._with({ limit: n }); }
  select(...fields) { return this._with({ select: fields }); }
  _structured() {
    const parts = this._path.split('/'), collectionId = parts.pop();
    const sq = { from: [{ collectionId, allDescendants: !!this._q.group }] };
    const fl = this._q.where.map(([f, op, v]) => {
      if (v === null && (op === '==' || op === '!=')) return { unaryFilter: { field: { fieldPath: fieldPath(f.split('.')) }, op: op === '==' ? 'IS_NULL' : 'IS_NOT_NULL' } };
      return { fieldFilter: { field: { fieldPath: fieldPath(f.split('.')) }, op: OPS[op] || 'EQUAL', value: toValue(v) } };
    });
    if (fl.length === 1) sq.where = fl[0]; else if (fl.length) sq.where = { compositeFilter: { op: 'AND', filters: fl } };
    if (this._q.order.length) sq.orderBy = this._q.order.map(([f, d]) => ({ field: { fieldPath: fieldPath(f.split('.')) }, direction: d === 'desc' ? 'DESCENDING' : 'ASCENDING' }));
    if (this._q.limit) sq.limit = this._q.limit;
    if (this._q.select) sq.select = { fields: this._q.select.length ? this._q.select.map(f => ({ fieldPath: fieldPath(f.split('.')) })) : [{ fieldPath: '__name__' }] };
    return { parent: parts.length ? DB() + '/' + encPath(parts.join('/')) : DB(), sq };
  }
  async get() {
    const { parent, sq } = this._structured();
    const r = await gfetch(HOST() + parent + ':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: sq }) });
    const docs = (Array.isArray(r) ? r : []).filter(x => x.document).map(x => { const path = x.document.name.slice(DB().length + 1); return new DocumentSnapshot(new DocumentReference(this._db, path), x.document); });
    return new QuerySnapshot(docs);
  }
  count() {
    return { get: async () => {
      const { parent, sq } = this._structured();
      const r = await gfetch(HOST() + parent + ':runAggregationQuery', { method: 'POST', body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: sq, aggregations: [{ alias: 'n', count: {} }] } }) });
      const f = (Array.isArray(r) ? r : []).find(x => x.result); const n = f ? Number((f.result.aggregateFields.n || {}).integerValue || 0) : 0;
      return { data: () => ({ count: n }) };
    } };
  }
}
class CollectionReference extends Query {
  constructor(db, path) { super(db, path); this.id = path.split('/').pop(); this.path = path; }
  doc(id) { return new DocumentReference(this._db, this.path + '/' + (id || autoId())); }
  async add(data) { const ref = this.doc(); await ref.create(data); return ref; }
}
class WriteBatch {
  constructor() { this._w = []; }
  set(ref, data, opts) { this._w.push(buildWrite(ref.path, data, opts && opts.merge ? 'merge' : 'set')); return this; }
  update(ref, data) { this._w.push(buildWrite(ref.path, data, 'update')); return this; }
  create(ref, data) { this._w.push(buildWrite(ref.path, data, 'create')); return this; }
  delete(ref) { this._w.push({ delete: docName(ref.path) }); return this; }
  async commit() { const w = this._w; this._w = []; for (let i = 0; i < w.length; i += 450) await commit(w.slice(i, i + 450)); }
}
class Firestore {
  doc(path) { return new DocumentReference(this, path); }
  collection(path) { return new CollectionReference(this, path); }
  collectionGroup(id) { const q = new Query(this, id); q._q.group = true; return q; }
  batch() { return new WriteBatch(); }
  async runTransaction(fn) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { transaction } = await gfetch(HOST() + DB() + ':beginTransaction', { method: 'POST', body: '{}' });
      const writes = [];
      const t = {
        get: ref => ref.get(transaction),
        set: (ref, data, opts) => { writes.push(buildWrite(ref.path, data, opts && opts.merge ? 'merge' : 'set')); return t; },
        update: (ref, data) => { writes.push(buildWrite(ref.path, data, 'update')); return t; },
        create: (ref, data) => { writes.push(buildWrite(ref.path, data, 'create')); return t; },
        delete: ref => { writes.push({ delete: docName(ref.path) }); return t; }
      };
      let out;
      try { out = await fn(t); await commit(writes, transaction); return out; }
      catch (e) { if (e.status === 409 || /aborted/.test(e.code || '')) continue; try { await gfetch(HOST() + DB() + ':rollback', { method: 'POST', body: JSON.stringify({ transaction }) }); } catch {} throw e; }
    }
    throw new FirebaseError('aborted', 'Transaction kept clashing — try again');
  }
}

// ---------------------------------------------------------------- Auth
const IT = () => emu.auth() ? `http://${emu.auth()}/identitytoolkit.googleapis.com/v1/projects/${projectId()}` : `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}`;
const userRecord = u => ({ uid: u.localId, email: u.email || '', emailVerified: !!u.emailVerified, displayName: u.displayName || '', disabled: !!u.disabled, metadata: { creationTime: u.createdAt ? new Date(+u.createdAt).toUTCString() : null, lastSignInTime: u.lastLoginAt ? new Date(+u.lastLoginAt).toUTCString() : null } });
async function googleKeys() {
  if (state.jwks && Date.now() < state.jwksExp) return state.jwks;
  const r = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  const j = await r.json(); const keys = {};
  for (const k of j.keys || []) keys[k.kid] = crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const age = +(String(r.headers.get('cache-control') || '').match(/max-age=(\d+)/) || [0, 3600])[1];
  state.jwks = keys; state.jwksExp = Date.now() + Math.min(age, 6 * 3600) * 1000;
  return keys;
}
const auth = {
  async verifyIdToken(token) {
    const [h, p, s] = String(token || '').split('.'); if (!h || !p) throw new FirebaseError('auth/argument-error', 'Bad token');
    const head = JSON.parse(new TextDecoder().decode(unb64u(h))), pay = JSON.parse(new TextDecoder().decode(unb64u(p)));
    const now = Math.floor(Date.now() / 1000), pid = projectId();
    if (!emu.auth()) {
      if (head.alg !== 'RS256') throw new FirebaseError('auth/argument-error', 'Bad token');
      const keys = await googleKeys(); let key = keys[head.kid];
      if (!key) { state.jwksExp = 0; key = (await googleKeys())[head.kid]; }
      if (!key) throw new FirebaseError('auth/argument-error', 'Unknown key');
      const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', await key, unb64u(s), enc.encode(h + '.' + p));
      if (!ok) throw new FirebaseError('auth/argument-error', 'Bad signature');
    }
    if (pay.aud !== pid || pay.iss !== 'https://securetoken.google.com/' + pid) throw new FirebaseError('auth/argument-error', 'Token is for another project');
    if (!pay.sub || (pay.exp || 0) < now - 5 || (pay.iat || 0) > now + 300) throw new FirebaseError('auth/id-token-expired', 'Token expired');
    return { ...pay, uid: pay.sub };
  },
  async getUserByEmail(email) {
    const r = await gfetch(IT() + '/accounts:lookup', { method: 'POST', body: JSON.stringify({ email: [email] }) });
    const u = (r.users || [])[0]; if (!u) throw new FirebaseError('auth/user-not-found', 'No user with that email');
    return userRecord(u);
  },
  async getUser(uid) {
    const r = await gfetch(IT() + '/accounts:lookup', { method: 'POST', body: JSON.stringify({ localId: [uid] }) });
    const u = (r.users || [])[0]; if (!u) throw new FirebaseError('auth/user-not-found', 'No such user');
    return userRecord(u);
  },
  async createUser(p) {
    const r = await gfetch(IT() + '/accounts', { method: 'POST', body: JSON.stringify({ email: p.email, password: p.password, emailVerified: !!p.emailVerified, displayName: p.displayName, disabled: !!p.disabled, localId: p.uid }) });
    return userRecord({ ...p, localId: r.localId, emailVerified: !!p.emailVerified });
  },
  async listUsers(max = 1000, pageToken) {
    const q = new URLSearchParams({ maxResults: String(Math.min(max, 1000)) }); if (pageToken) q.set('nextPageToken', pageToken);
    const r = await gfetch(IT() + '/accounts:batchGet?' + q);
    return { users: (r.users || []).map(userRecord), pageToken: r.nextPageToken || undefined };
  },
  async createCustomToken(uid, claims) {
    const iat = Math.floor(Date.now() / 1000);
    return signJwt({ iss: state.sa.client_email, sub: state.sa.client_email, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat, exp: iat + 3600, uid, ...(claims ? { claims } : {}) });
  }
};

// ---------------------------------------------------------------- Cloud Messaging (push)
const FCM_CODES = { UNREGISTERED: 'messaging/registration-token-not-registered', INVALID_ARGUMENT: 'messaging/invalid-argument', SENDER_ID_MISMATCH: 'messaging/invalid-registration-token', NOT_FOUND: 'messaging/registration-token-not-registered' };
const messaging = {
  async send(message) {
    if (emu.fs()) return 'emulated';
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId()}/messages:send`, { method: 'POST', headers: { authorization: 'Bearer ' + await accessToken(), 'content-type': 'application/json' }, body: JSON.stringify({ message }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = j.error || {}; const det = (e.details || []).find(d => d.errorCode) || {}; throw new FirebaseError(FCM_CODES[det.errorCode] || FCM_CODES[e.status] || 'messaging/unknown-error', e.message || 'Push failed', r.status); }
    return j.name;
  },
  async sendEachForMulticast({ tokens, ...rest }) {
    const responses = await Promise.all((tokens || []).map(token => this.send({ ...rest, token }).then(messageId => ({ success: true, messageId }), error => ({ success: false, error }))));
    const successCount = responses.filter(r => r.success).length;
    return { responses, successCount, failureCount: responses.length - successCount };
  }
};

// ---------------------------------------------------------------- the "admin" object
const firestoreFn = () => (state.db || (state.db = new Firestore()));
firestoreFn.FieldValue = FieldValue; firestoreFn.Timestamp = Timestamp;
const admin = {
  apps: [],
  credential: { cert: sa => ({ sa }) },
  initializeApp(opts) { if (opts && opts.credential && opts.credential.sa) state.sa = opts.credential.sa; const app = { name: '[DEFAULT]', options: opts || {} }; if (!admin.apps.length) admin.apps.push(app); return app; },
  app() { return admin.apps[0]; },
  firestore: firestoreFn,
  auth: () => auth,
  messaging: () => messaging
};
export default admin;
export { FieldValue, Timestamp };
