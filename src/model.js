// Illustrative rate model. Normalized units, no real biochemistry.
// Disclosed in the About panel. Based on the brief, plus back-pressure:
// a high gradient slows electron flow, so an uncoupler makes the chain race.
export const DEFAULTS = { nadh: 0.8, fadh: 0.33, o2: 1, cyanide: false, dnp: false };

const KP = 1.0;    // pumping per unit electron flow
const KS = 0.6;    // ATP synthase flow per unit gradient above threshold
const TH = 0.05;   // gradient threshold for ATP synthase
const LEAK = 0.1;  // basal proton leak
const LEAK_DNP = 5.0;
const RATE = 0.5;  // overall time constant
const GLYCO = 0.04; // small constant ATP term from glycolysis (2 ATP per glucose, §7.5)

export function createModel() {
  return { G: 0, J: 0, pump: 0, synth: 0, leak: 0, atp: GLYCO, heat: 0, lactate: 0, lactateRate: 0, drive: 0, shareN: 1 };
}

function stepOnce(m, c, dt, base) {
  const eN = c.nadh, eF = 0.6 * c.fadh, tot = eN + eF;
  m.drive = Math.min(1.2, tot);
  m.shareN = tot > 0 ? eN / tot : 1;
  const perE = m.shareN * 1.0 + (1 - m.shareN) * 0.6; // FADH2 bypasses Complex I
  const bp = 1 - 0.85 * m.G * m.G * m.G;               // back-pressure (beyond §7.4)
  const o2sat = Math.min(1, 1.06 * c.o2 / (c.o2 + 0.06));
  m.J = c.cyanide ? 0 : m.drive * bp * o2sat;
  m.pump = KP * m.J * perE;
  m.synth = m.G > TH ? KS * (m.G - TH) : 0;
  m.leak = (c.dnp ? LEAK_DNP : LEAK) * m.G;
  m.G = Math.max(0, Math.min(1, m.G + RATE * (m.pump - m.synth - m.leak) * dt));
  m.atp = m.synth + GLYCO;
  // Heat: energy released by electron flow minus the share captured as ATP.
  // Scaled so that about 34% is captured at the normal steady state (§7.4).
  const cap = base ? 0.34 * base.J * (m.synth / base.synth) : 0.34 * m.J;
  m.heat = Math.max(0, m.J - cap);
  // Lactate builds in the cytosol when the chain cannot take electrons (§7.5).
  const stall = base ? Math.max(0, 1 - m.J / base.J) : 0;
  m.lactateRate = m.drive > 0.05 ? stall : 0;
  m.lactate = Math.max(0, Math.min(1, m.lactate + (m.lactateRate * 0.11 - (stall < 0.2 ? 0.06 : 0)) * dt));
}

export function step(m, c, dt, base) {
  let left = dt;
  while (left > 1e-6) { const h = Math.min(0.05, left); stepOnce(m, c, h, base); left -= h; }
}

export function steadyState(c) {
  const m = createModel();
  for (let i = 0; i < 4000; i++) stepOnce(m, c, 0.05, null);
  const base = { G: m.G, J: m.J, synth: m.synth, atp: m.atp, heat: m.J * 0.66 };
  return base;
}
