// All on-screen teaching text. Every fact cites OpenStax, Biology 2e, Chapter 7,
// or is marked as going beyond the text. No dashes in UI copy.
export const URLS = {
  '7.1': 'https://openstax.org/books/biology-2e/pages/7-1-energy-in-living-systems',
  '7.3': 'https://openstax.org/books/biology-2e/pages/7-3-oxidation-of-pyruvate-and-the-citric-acid-cycle',
  '7.4': 'https://openstax.org/books/biology-2e/pages/7-4-oxidative-phosphorylation',
  '7.5': 'https://openstax.org/books/biology-2e/pages/7-5-metabolism-without-oxygen',
};
export const cite = (s) => `<a class="cite" href="${URLS[s]}" target="_blank" rel="noopener">OpenStax, Biology 2e, §${s}</a>`;

export const TOUR = [
  { focus: 'overview', kicker: 'Orientation', title: 'The plant is idle',
    body: `<p>You are at molecular scale beside the inner membrane of a mitochondrion in a resting muscle cell. The intermembrane space is above the membrane. The matrix is below it.</p><p>Five machines sit in this membrane. Nothing is running yet because no electrons are arriving.</p>`,
    cta: 'Open the NADH feed', cites: ['7.4'] },
  { focus: 'chain', kicker: 'Orientation 1 of 4', title: 'Electrons step down the chain',
    body: `<p>NADH hands electrons to Complex I. They pass to Q, then Complex III, then cytochrome c, then Complex IV. Watch one spark: it dims at each step because the electrons give up energy as they go.</p><p>FADH<sub>2</sub> delivers its electrons to Complex II. They bypass Complex I, so FADH<sub>2</sub> leads to fewer ATP than NADH.</p>`,
    cta: 'Next', cites: ['7.1', '7.4'] },
  { focus: 'ims', kicker: 'Orientation 2 of 4', title: 'Protons pile up',
    body: `<p>The energy the electrons give up drives pumps. Complex I can move four hydrogen ions from the matrix into the intermembrane space. Complex III pumps too.</p><p>The amber crowd above the membrane is the gradient. It has two parts: a difference in concentration and a difference in charge.</p><p class="mis"><b>Common misconception:</b> the chain makes ATP directly. It does not. It pumps protons.</p>`,
    cta: 'Next', cites: ['7.4'] },
  { focus: 'syn', kicker: 'Orientation 3 of 4', title: 'The turbine',
    body: `<p>Protons can cross back into the matrix only through ATP synthase. Their flow turns the enzyme, and the turning adds a phosphate to ADP to make ATP. This is chemiosmosis. It makes about 90 percent of the ATP from aerobic glucose breakdown.</p><p class="mis"><b>Common misconception:</b> electrons pass through ATP synthase. Protons do. Electrons never leave the chain.</p>`,
    cta: 'Next', cites: ['7.4'] },
  { focus: 'c4', kicker: 'Orientation 4 of 4', title: 'Oxygen waits at the end',
    body: `<p>At Complex IV, oxygen accepts the spent electrons, picks up hydrogen ions and becomes water. Oxygen is the final electron acceptor. This chain is the only part of glucose metabolism that uses atmospheric oxygen.</p><p class="mis"><b>Common misconception:</b> the oxygen you breathe becomes carbon dioxide. It becomes water. CO<sub>2</sub> comes from earlier stages (${cite('7.3')}).</p><p>The plant is running. Three incidents are about to hit it. Before each one, you predict what happens.</p>`,
    cta: 'Start the incidents', cites: ['7.4'] },
];

const UDS = [['up', 'Rises'], ['same', 'About the same'], ['down', 'Falls']];
export const INCIDENTS = [
  { id: 'cyanide', name: 'Cyanide', title: 'Cyanide at Complex IV', focus: 'c4run',
    brief: `<p>Cyanide inhibits cytochrome c oxidase, which is Complex IV. Electrons can no longer leave the chain there.</p><p>§7.4 poses this exact case and asks the reader to predict what follows.</p>`,
    qs: [{ id: 'ph', label: 'pH of the intermembrane space', opts: UDS }, { id: 'syn', label: 'ATP from ATP synthase', opts: UDS }, { id: 'o2', label: 'Oxygen use', opts: UDS }],
    captions: [[0.6, 'Complex IV is blocked. Electrons cannot reach oxygen.'], [4.5, 'The chain backs up. Complexes I and III stop pumping.'], [8.5, 'Protons drain through ATP synthase. Nothing replaces them.']],
    explain: `<p>Complex IV could not pass electrons to oxygen, so the chain backed up and stopped. With no electron flow, Complexes I and III stopped pumping. The protons already in the intermembrane space drained back through ATP synthase, so the gradient fell and the pH there rose. ATP synthase stopped when the gradient ran out. Oxygen use fell to near zero because nothing was reducing oxygen to water.</p>`,
    beyond: 'The text asks this question and does not print an answer. This result is reasoned from §7.4 and shown with an illustrative model.',
    mis: (p) => p.ph === 'down' ? 'A blocked chain does not trap extra protons. Pumping stops, protons leave through ATP synthase, and the intermembrane space becomes less acidic. Its pH rises.' : 'Cyanide does not block ATP synthase. It blocks Complex IV. ATP synthase stops because the gradient disappears.',
    cites: ['7.4'] },
  { id: 'dnp', name: 'Uncoupler', title: 'An uncoupler in the membrane', focus: 'overview',
    brief: `<p>DNP (dinitrophenol) is an uncoupler and a poison. It makes the inner membrane leaky to protons, so they can cross without passing through ATP synthase.</p><p>§7.4 poses this case too.</p>`,
    qs: [{ id: 'grad', label: 'Proton gradient', opts: UDS }, { id: 'atp', label: 'ATP rate', opts: UDS }, { id: 'o2', label: 'Oxygen use', opts: UDS }],
    captions: [[0.6, 'Protons pour back through the leaks.'], [4.5, 'The rotor slows. Few protons pass through ATP synthase.'], [8.5, 'The chain speeds up. The energy leaves as heat.']],
    explain: `<p>DNP let protons cross the membrane without passing through ATP synthase. The gradient collapsed, so the rotor slowed and ATP output fell. With little gradient to push against, the chain ran faster and used more oxygen. The energy from the electrons left as heat.</p>`,
    beyond: 'Beyond the text: §7.4 says DNP makes the membrane leaky to protons. Faster oxygen use and extra heat are standard biochemistry that §7.4 does not state.',
    mis: (p) => p.atp === 'up' ? 'An uncoupler does not give the cell more energy. The chain runs faster, but the energy leaves as heat, not ATP.' : p.o2 !== 'up' ? 'DNP does not block the chain. It removes the gradient the pumps push against, so electrons move faster and more oxygen is reduced to water.' : 'An uncoupler does not give the cell more energy. The chain runs faster, but the energy leaves as heat, not ATP.',
    cites: ['7.4'] },
  { id: 'o2', name: 'No oxygen', title: 'The sprint: oxygen runs out', focus: 'c4run',
    brief: `<p>The muscle is now sprinting. It cannot get enough oxygen to sustain aerobic respiration. Oxygen at Complex IV falls toward zero.</p><p>Watch the cytosol readout at the lower left as well as the membrane.</p>`,
    qs: [{ id: 'grad', label: 'Proton gradient', opts: UDS }, { id: 'lac', label: 'Lactate in the cytosol', opts: UDS }, { id: 'tot', label: 'Total ATP production in the cell', opts: [['zero', 'Stops completely'], ['cont', 'Falls but continues'], ['same', 'About the same']] }],
    captions: [[0.6, 'Oxygen is running out. Complex IV has nothing to hand electrons to.'], [4.5, 'The chain stops. Pumping stops. The gradient runs down.'], [8.5, 'In the cytosol, glycolysis keeps going. Lactate builds.']],
    explain: `<p>Oxygen is the final electron acceptor. Without it, Complex IV had nothing to hand electrons to and the chain stopped. Pumping stopped, the gradient ran down and ATP synthase stopped. In the cytosol, glycolysis kept making 2 ATP per glucose. Lactic acid fermentation turned pyruvate into lactate and regenerated NAD<sup>+</sup>, which glycolysis needs in order to continue.</p>`,
    beyond: '',
    mis: (p) => 'No oxygen does not mean no ATP. Glycolysis still makes 2 ATP per glucose, and fermentation regenerates the NAD+ that keeps it running.',
    cites: ['7.4', '7.5'] },
];

export const OBJECTIVES = [
  ['Trace electrons from NADH and FADH<sub>2</sub> through Complexes I to IV to oxygen, losing energy at each step.', '§7.1, §7.4'],
  ['Explain how the chain builds a proton gradient across the inner membrane, and how ATP synthase uses it to make ATP (chemiosmosis).', '§7.4'],
  ['Predict what happens to the gradient, ATP output and oxygen use when the chain is blocked, uncoupled or starved of oxygen.', '§7.4, §7.5'],
];

export const ABOUT = `
<h2 id="aboutH">About this demo</h2>
<p>A short simulation for an introductory biology course. The player runs the electron transport chain of one mitochondrion, then predicts what happens when it is poisoned, uncoupled and starved of oxygen.</p>
<p>It was built with AI (Claude, Anthropic) from a written brief by José Antonio Bowen, <a href="https://weteachwithai.com" target="_blank" rel="noopener">weteachwithai.com</a>, as an example of what AI can build for students. No data is collected.</p>
<h3>Source</h3>
<p>Clark, M. A., Douglas, M., and Choi, J. <i>Biology 2e</i>. OpenStax, 2018. Chapter 7, Cellular Respiration. Licensed CC BY 4.0. Access for free at <a href="https://openstax.org/books/biology-2e/pages/7-introduction" target="_blank" rel="noopener">openstax.org</a>. Sections used: ${cite('7.1')}, ${cite('7.3')}, ${cite('7.4')}, ${cite('7.5')}. Facts were checked against the live pages on 11 November 2026. This demo is not produced or endorsed by OpenStax.</p>
<h3>What goes beyond the text</h3>
<ul>
<li>§7.4 asks what cyanide does to intermembrane pH and ATP synthesis and prints no answer. The answer shown here is reasoned from the text.</li>
<li>§7.4 says DNP makes the membrane leaky to protons. It does not say that oxygen use and heat rise. Those are standard biochemistry.</li>
<li>The model slows electron flow when the gradient is high (respiratory control). §7.4 does not describe this.</li>
<li>Standard biochemistry has Complex IV pumping protons as well. §7.4 describes it taking up hydrogen ions to form water, so that is what is shown.</li>
</ul>
<h3>Simplifications</h3>
<ul>
<li>The numbers come from a small illustrative rate model, not a biochemical simulation. All gauges are relative to a normal steady state. There are no real units.</li>
<li>Particle counts are not stoichiometric. The only count taken from the text is four protons at Complex I. Complex III is drawn with the same number for visibility.</li>
<li>Protein shapes are original and stylized. They are not molecular structures. Sizes, distances and speeds are not to scale.</li>
<li>One copy of each complex is shown. A real inner membrane holds many.</li>
<li>Q and cytochrome c are shown only on their loaded trip. Their return is not drawn.</li>
<li>Glycolysis and fermentation happen in the cytosol, outside the mitochondrion. They appear only as a readout. The model gives them a small constant ATP term and builds lactate whenever the chain stalls.</li>
<li>Heat is computed as energy released by electron flow minus the share captured as ATP, set so that about 34 percent is captured at the normal state (§7.4).</li>
<li>No total ATP per glucose is given. The text says the yield varies.</li>
<li>Colors are arbitrary.</li>
</ul>
<h3>The model</h3>
<pre>drive  = NADH + 0.6 × FADH2
J_e    = drive × (1 − 0.85 × G³) × O2 saturation     (0 with cyanide)
pump   = J_e × (NADH share × 1.0 + FADH2 share × 0.6)
synth  = 0.6 × (G − 0.05) when G &gt; 0.05
leak   = 0.1 × G           (5 × G with DNP)
dG/dt  = 0.5 × (pump − synth − leak),  G held in 0..1
ATP    = synth + 0.04 (glycolysis)
O2 use = J_e
heat   = J_e − captured share</pre>
<h3>Controls</h3>
<p>Drag to look around. Scroll or pinch to zoom. Arrow keys also turn the view. All buttons and sliders work from the keyboard.</p>`;
