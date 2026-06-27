#!/usr/bin/env node
/**
 * Compare mobile-audit JSON sidecars between baseline and current runs.
 * Prints per-page deltas (smallTargets / tinyFonts / clipped) and totals.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'test-results');
const baseDir = path.join(root, 'mobile-audit-baseline');
const curDir = path.join(root, 'mobile-audit');

if (!fs.existsSync(baseDir) || !fs.existsSync(curDir)) {
  console.error('Missing baseline or current dir.');
  process.exit(1);
}

const devices = ['samsung-s23-ultra', 'samsung-f55'];
let grandBase = { st: 0, tf: 0, cl: 0 };
let grandCur = { st: 0, tf: 0, cl: 0 };

for (const dev of devices) {
  const baseFiles = fs.existsSync(path.join(baseDir, dev))
    ? fs.readdirSync(path.join(baseDir, dev)).filter(f => f.endsWith('.json')).sort()
    : [];
  console.log(`\n=== ${dev} ===`);
  console.log('page'.padEnd(28) + ' | smallTargets | tinyFonts | clipped');
  console.log('-'.repeat(72));
  for (const f of baseFiles) {
    const slug = f.replace(/\.json$/, '');
    const base = JSON.parse(fs.readFileSync(path.join(baseDir, dev, f), 'utf8'));
    const curPath = path.join(curDir, dev, f);
    const cur = fs.existsSync(curPath) ? JSON.parse(fs.readFileSync(curPath, 'utf8')) : null;
    const b = {
      st: base.smallTargets?.length ?? 0,
      tf: base.tiny?.length ?? 0,
      cl: base.clipped?.length ?? 0,
    };
    const c = cur
      ? {
          st: cur.smallTargets?.length ?? 0,
          tf: cur.tiny?.length ?? 0,
          cl: cur.clipped?.length ?? 0,
        }
      : { st: '-', tf: '-', cl: '-' };
    grandBase.st += b.st; grandBase.tf += b.tf; grandBase.cl += b.cl;
    if (cur) { grandCur.st += c.st; grandCur.tf += c.tf; grandCur.cl += c.cl; }
    const fmt = (bv, cv) => {
      if (cv === '-') return `${bv} → -`;
      const d = cv - bv;
      const arrow = d === 0 ? '=' : d < 0 ? '▼' : '▲';
      return `${bv} → ${cv} ${arrow}${Math.abs(d)}`;
    };
    console.log(
      slug.padEnd(28) +
      ' | ' + fmt(b.st, c.st).padEnd(14) +
      ' | ' + fmt(b.tf, c.tf).padEnd(11) +
      ' | ' + fmt(b.cl, c.cl)
    );
  }
}

console.log('\n=== TOTAL ===');
const d = (bv, cv) => {
  const diff = cv - bv;
  const arrow = diff === 0 ? '=' : diff < 0 ? '▼' : '▲';
  const pct = bv === 0 ? 0 : ((diff / bv) * 100).toFixed(1);
  return `${bv} → ${cv}  ${arrow}${Math.abs(diff)} (${pct}%)`;
};
console.log('smallTargets: ' + d(grandBase.st, grandCur.st));
console.log('tinyFonts   : ' + d(grandBase.tf, grandCur.tf));
console.log('clipped     : ' + d(grandBase.cl, grandCur.cl));
