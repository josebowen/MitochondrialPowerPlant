# The Mitochondrial Power Plant

A 5 to 10 minute 3D browser simulation for introductory biology. The player shrinks to molecular scale inside a mitochondrion, starts the electron transport chain, then predicts what happens when it is blocked (cyanide), uncoupled (DNP) and starved of oxygen.

Built with AI (Claude, Anthropic) from a brief by José Antonio Bowen, [weteachwithai.com](https://weteachwithai.com), as a workshop demo of what AI can build for students.

## Source

Clark, M. A., Douglas, M., and Choi, J. *Biology 2e*. OpenStax, 2018. Chapter 7, Cellular Respiration (§7.1, §7.3, §7.4, §7.5). CC BY 4.0. Access for free at https://openstax.org/books/biology-2e/pages/7-introduction. Not produced or endorsed by OpenStax.

The numbers come from a small illustrative rate model (`src/model.js`). The in-app About panel lists every simplification and every claim that goes beyond the text.

## Files

- `index.html`: the whole app in one file, Three.js bundled in. The only external request is Google Fonts.
- `src/`: readable source. `main.js` (app shell, UI, state machine), `micro.js` (membrane scene), `macro.js` (title and descent scene), `model.js` (rate model), `content.js` (all teaching text), `fx.js`, `style.css`, `template.html`.
- `build.mjs`: `npm install && node build.mjs` rebuilds `index.html`.
- `test/shots.mjs`: headless Chrome walkthrough. `node test/shots.mjs 1600 900 desk` or `node test/shots.mjs 390 844 phone`.

## Test hooks

- `?dtcap=0.3` raises the frame time cap so headless Chrome runs at realistic speed.
- `window.__demo`: `state()`, `go(name, arg)`, `set(controls)`, `predict(answers)`, `warm(sec)`, `advance(sec)`, `view(name)`, `act(name)`.
