// Which festival logo should Nexa use right now? (same rule as the app: from 7 days before until the day after)
const DIWALI = ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26'];
export function festIconNow(now = new Date()) {
  const today = Math.round(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 864e5);
  const day = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  let best = null;
  for (const y of [now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
    const c = [['halloween', `${y}-10-31`], ['christmas', `${y}-12-25`], ...DIWALI.filter(d => d.startsWith(y + '-')).map(d => ['diwali', d])];
    for (const [k, ds] of c) { const left = day(ds) - today; if (left > 7 || left < -1) continue; const score = left >= 0 ? left : 10 - left; if (!best || score < best.score) best = { k, score }; }
  }
  return best ? best.k : '';
}
