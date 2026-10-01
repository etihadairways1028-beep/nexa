// Nexa data layer.
// One small document-store interface with two implementations:
//   • FirebaseBackend — real accounts (Firebase Auth) + realtime Firestore. Used when config.js has Firebase keys.
//   • LocalBackend    — runs entirely in this browser (localStorage). Accounts you create here are real
//                       to this browser only; open two tabs, sign in as two accounts and they sync live.
//
// Interface
//   auth.user() -> {uid,email}|null      auth.onChange(cb)      auth.signUp(email,pw)   auth.signIn(email,pw)
//   auth.signOut()                        auth.deleteMe()
//   db.get(path) db.set(path,data) db.update(path,patch) db.add(colPath,data)->id db.del(path)
//   db.query(colPath, filters) db.listen(colPath, filters, cb)->unsub db.listenDoc(path, cb)->unsub
//   filters: [[field, op, value]] with op in '==' | 'array-contains' | 'prefix'
//   patch values may use ops.union(...), ops.remove(...), ops.del()

export const ops = {
  union: (...v) => ({ __op: 'union', v }),
  remove: (...v) => ({ __op: 'remove', v }),
  del: () => ({ __op: 'del' }),
  inc: n => ({ __op: 'inc', v: n })
};

/* ---------------------------------------------------------------- helpers */
const safe = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  sset(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} }
};
function setDeep(obj, dotted, val) {
  const parts = dotted.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {}; o = o[parts[i]]; }
  const last = parts[parts.length - 1];
  if (val && val.__op === 'del') delete o[last];
  else if (val && val.__op === 'union') { const a = Array.isArray(o[last]) ? o[last] : []; val.v.forEach(x => { if (!a.includes(x)) a.push(x); }); o[last] = a; }
  else if (val && val.__op === 'remove') { o[last] = (Array.isArray(o[last]) ? o[last] : []).filter(x => !val.v.includes(x)); }
  else if (val && val.__op === 'inc') { o[last] = (typeof o[last] === 'number' ? o[last] : 0) + val.v; }
  else o[last] = val;
}
function getDeep(obj, dotted) { return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function matches(doc, filters) {
  return (filters || []).every(([f, op, v]) => {
    const x = getDeep(doc, f);
    if (op === '==') return x === v;
    if (op === 'array-contains') return Array.isArray(x) && x.includes(v);
    if (op === 'prefix') return typeof x === 'string' && x.startsWith(v);
    return false;
  });
}
async function sha(s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'h' + h; }
}
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------------------------------------------------------------- local */
function LocalBackend() {
  const KEY = 'nexa.db.v1', ACC = 'nexa.accounts.v1', SES = 'nexa.session';
  let mem = safe.get(KEY, {});
  let accounts = safe.get(ACC, {});
  const listeners = new Set();
  const authCbs = new Set();
  let current = null;
  const sesUid = safe.sget(SES);
  if (sesUid) { const acc = Object.entries(accounts).find(([, a]) => a.uid === sesUid); if (acc) current = { uid: sesUid, email: acc[0] }; }

  const persist = () => { safe.set(KEY, mem); fire(); };
  const clone = o => JSON.parse(JSON.stringify(o));
  const parentOf = p => p.split('/').slice(0, -1).join('/');
  function fire() { listeners.forEach(l => l.run()); }
  window.addEventListener('storage', e => { if (e.key === KEY) { mem = safe.get(KEY, {}); fire(); } if (e.key === ACC) accounts = safe.get(ACC, {}); });

  const db = {
    async get(p) { return mem[p] ? { id: p.split('/').pop(), ...clone(mem[p]) } : null; },
    async set(p, data) { mem[p] = clone(data); persist(); },
    async update(p, patch) { const d = mem[p] ? clone(mem[p]) : {}; Object.entries(patch).forEach(([k, v]) => setDeep(d, k, v)); mem[p] = d; persist(); },
    async add(col, data) { const id = rid(); mem[col + '/' + id] = clone(data); persist(); return id; },
    addFast(col, data) { const id = rid(); mem[col + '/' + id] = clone(data); persist(); return id; },
    async del(p) { Object.keys(mem).forEach(k => { if (k === p || k.startsWith(p + '/')) delete mem[k]; }); persist(); },
    async query(col, filters, opts) {
      let r = Object.keys(mem).filter(k => parentOf(k) === col && matches(mem[k], filters)).map(k => ({ id: k.split('/').pop(), ...clone(mem[k]) }));
      if (opts && opts.order) { const [f, dir] = opts.order; r.sort((a, b) => ((getDeep(a, f) ?? 0) > (getDeep(b, f) ?? 0) ? 1 : -1) * (dir === 'desc' ? -1 : 1)); }
      if (opts && opts.limit) r = r.slice(0, opts.limit);
      return r;
    },
    listen(col, filters, cb, opts) {
      let last = '';
      const l = { run: async () => { const r = await db.query(col, filters, opts); const s = JSON.stringify(r); if (s !== last) { last = s; cb(r); } } };
      listeners.add(l); l.run(); return () => listeners.delete(l);
    },
    listenDoc(p, cb) {
      let last = '';
      const l = { run: async () => { const r = await db.get(p); const s = JSON.stringify(r); if (s !== last) { last = s; cb(r); } } };
      listeners.add(l); l.run(); return () => listeners.delete(l);
    }
  };
  const auth = {
    user: () => current,
    onChange(cb) { authCbs.add(cb); setTimeout(() => cb(current), 0); return () => authCbs.delete(cb); },
    async signUp(email, pw) {
      email = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
      if (pw.length < 6) throw new Error('Password needs at least 6 characters.');
      accounts = safe.get(ACC, {});
      if (accounts[email]) throw new Error('An account with that email already exists.');
      const uid = 'u_' + rid();
      accounts[email] = { uid, hash: await sha(email + ':' + pw) };
      safe.set(ACC, accounts);
      current = { uid, email }; safe.sset(SES, uid); authCbs.forEach(cb => cb(current)); return current;
    },
    async signIn(id, pw) {
      accounts = safe.get(ACC, {});
      let email = id.trim().toLowerCase();
      if (!email.includes('@')) { // allow @handle login
        const h = email.replace(/^@/, '');
        const u = Object.entries(mem).find(([k, v]) => k.startsWith('users/') && k.split('/').length === 2 && v.handleLower === h);
        const acc = u && Object.entries(accounts).find(([, a]) => a.uid === u[0].split('/')[1]);
        if (acc) email = acc[0];
      }
      const a = accounts[email];
      if (!a || a.hash !== await sha(email + ':' + pw)) throw new Error('That email/username and password don\'t match.');
      current = { uid: a.uid, email }; safe.sset(SES, a.uid); authCbs.forEach(cb => cb(current)); return current;
    },
    async signOut() { current = null; safe.sset(SES, null); authCbs.forEach(cb => cb(null)); },
    async resetPassword() { throw new Error('Password reset emails work on the live version of Nexa.'); },
    verified: () => true,
    async idToken() { return null; },
    async sendVerify() {},
    async refresh() { return true; },
    async deleteMe() {
      if (!current) return;
      accounts = safe.get(ACC, {}); delete accounts[current.email]; safe.set(ACC, accounts);
      await auth.signOut();
    }
  };
  return { kind: 'local', db, auth, ai: null };
}

/* ---------------------------------------------------------------- firebase */
async function FirebaseBackend(cfg) {
  const V = '11.10.0';
  const base = cfg.sdkBase || `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')
  ]);
  const app = initializeApp(cfg);
  const fa = A.getAuth(app);
  let fs;
  try { fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch (e) { fs = F.getFirestore(app); }
  const ref = p => F.doc(fs, p);
  const col = p => F.collection(fs, p);
  const conv = patch => {
    const out = {};
    Object.entries(patch).forEach(([k, v]) => {
      if (v && v.__op === 'union') out[k] = F.arrayUnion(...v.v);
      else if (v && v.__op === 'remove') out[k] = F.arrayRemove(...v.v);
      else if (v && v.__op === 'del') out[k] = F.deleteField();
      else if (v && v.__op === 'inc') out[k] = F.increment(v.v);
      else out[k] = v;
    });
    return out;
  };
  const q = (c, filters, opts) => F.query(col(c), ...(filters || []).map(([f, op, v]) =>
    op === 'prefix' ? null : F.where(f, op, v)).filter(Boolean),
    ...(filters || []).filter(x => x[1] === 'prefix').flatMap(([f, , v]) => [F.where(f, '>=', v), F.where(f, '<=', v + '')]),
    ...(opts && opts.order ? [F.orderBy(opts.order[0], opts.order[1] || 'asc')] : []), ...(opts && opts.limit ? [F.limit(opts.limit)] : []));
  const snapList = s => s.docs.map(d => ({ id: d.id, ...d.data(), ...(d.metadata && d.metadata.hasPendingWrites ? { _pending: true } : {}) }));
  const db = {
    async get(p) { const s = await F.getDoc(ref(p)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    async set(p, data) { await F.setDoc(ref(p), data); },
    async update(p, patch) {
      try { await F.updateDoc(ref(p), conv(patch)); }
      catch (e) { if (e.code === 'not-found') { const o = {}; Object.entries(patch).forEach(([k, v]) => setDeep(o, k, v)); await F.setDoc(ref(p), o, { merge: true }); } else throw e; }
    },
    async add(c, data) { const r = await F.addDoc(col(c), data); return r.id; },
    // Writes without waiting for the server (used offline); Firestore's local cache shows it immediately and syncs later.
    addFast(c, data, onErr) { const id = F.doc(col(c)).id; F.setDoc(ref(c + '/' + id), data).catch(e => onErr && onErr(e)); return id; },
    async del(p) { await F.deleteDoc(ref(p)); },
    async query(c, filters, opts) { return snapList(await F.getDocs(q(c, filters, opts))); },
    listen(c, filters, cb, opts) { return F.onSnapshot(q(c, filters, opts), { includeMetadataChanges: !!(opts && opts.pending) }, s => cb(snapList(s)), e => console.warn('listen', c, e)); },
    listenDoc(p, cb) { return F.onSnapshot(ref(p), s => cb(s.exists() ? { id: s.id, ...s.data() } : null), e => console.warn('listenDoc', p, e)); }
  };
  const nice = e => {
    const m = { 'auth/email-already-in-use': 'An account with that email already exists.', 'auth/invalid-email': 'Enter a valid email address.', 'auth/weak-password': 'Password needs at least 6 characters.', 'auth/invalid-credential': 'That email and password don\'t match.', 'auth/wrong-password': 'That email and password don\'t match.', 'auth/user-not-found': 'No account with that email.', 'auth/requires-recent-login': 'Please log in again, then retry.' };
    return new Error(m[e.code] || e.message);
  };
  const auth = {
    user: () => fa.currentUser ? { uid: fa.currentUser.uid, email: fa.currentUser.email } : null,
    onChange(cb) { return A.onAuthStateChanged(fa, u => cb(u ? { uid: u.uid, email: u.email } : null)); },
    async signUp(email, pw) { try { const c = await A.createUserWithEmailAndPassword(fa, email.trim(), pw); return { uid: c.user.uid, email: c.user.email }; } catch (e) { throw nice(e); } },
    async signIn(id, pw) {
      let email = id.trim();
      if (!email.includes('@')) throw new Error('Log in with the email address you signed up with.');
      try { const c = await A.signInWithEmailAndPassword(fa, email, pw); return { uid: c.user.uid, email: c.user.email }; } catch (e) { throw nice(e); }
    },
    async signInWithToken(t) { try { const c = await A.signInWithCustomToken(fa, t); return { uid: c.user.uid, email: c.user.email }; } catch (e) { throw nice(e); } },
    async signOut() { await A.signOut(fa); },
    async deleteMe() { try { await A.deleteUser(fa.currentUser); } catch (e) { throw nice(e); } },
    async resetPassword(email) { try { await A.sendPasswordResetEmail(fa, email.trim()); } catch (e) { throw nice(e); } },
    verified: () => !!(fa.currentUser && fa.currentUser.emailVerified),
    async idToken() { return fa.currentUser ? fa.currentUser.getIdToken() : null; },
    async sendVerify() { if (fa.currentUser) await A.sendEmailVerification(fa.currentUser); },
    async refresh() { if (fa.currentUser) await fa.currentUser.reload(); return !!(fa.currentUser && fa.currentUser.emailVerified); }
  };
  // Nexa AI via Firebase AI Logic (Gemini Developer API). Loaded lazily on first use.
  let model = null;
  const ai = {
    async generate(prompt, system) {
      if (!model) {
        const X = await import(base + 'firebase-ai.js');
        const inst = X.getAI(app, { backend: new X.GoogleAIBackend() });
        model = X.getGenerativeModel(inst, { model: cfg.aiModel || 'gemini-2.5-flash', systemInstruction: system });
      }
      const r = await model.generateContent(prompt);
      return r.response.text();
    }
  };
  // Optional: Firebase Storage for photos (needs the Blaze plan on new projects). Off unless cfg.useStorage.
  let st = null;
  const storage = cfg.useStorage ? {
    async upload(path, dataUrl) {
      if (!st) { const X = await import(base + 'firebase-storage.js'); st = { X, s: X.getStorage(app) }; }
      const r = st.X.ref(st.s, path);
      await st.X.uploadString(r, dataUrl, 'data_url');
      return await st.X.getDownloadURL(r);
    }
  } : null;
  // Optional: web push via Firebase Cloud Messaging (needs cfg.vapidKey + the Cloud Function in /functions).
  let msgX = null;
  const push = cfg.vapidKey && !/^PASTE|^YOUR/.test(cfg.vapidKey) ? {
    async supported() { msgX = msgX || await import(base + 'firebase-messaging.js'); return msgX.isSupported ? await msgX.isSupported() : true; },
    async token(swReg) {
      msgX = msgX || await import(base + 'firebase-messaging.js');
      if (msgX.isSupported && !(await msgX.isSupported())) return null;
      return await msgX.getToken(msgX.getMessaging(app), { vapidKey: cfg.vapidKey, serviceWorkerRegistration: swReg });
    },
    async remove() { try { msgX = msgX || await import(base + 'firebase-messaging.js'); await msgX.deleteToken(msgX.getMessaging(app)); } catch {} }
  } : null;
  return { kind: 'firebase', db, auth, ai, storage, push };
}

export async function createBackend(config) {
  if (config && config.firebase && config.firebase.apiKey && !String(config.firebase.apiKey).startsWith('YOUR')) {
    return await FirebaseBackend(config.firebase);
  }
  return LocalBackend();
}
