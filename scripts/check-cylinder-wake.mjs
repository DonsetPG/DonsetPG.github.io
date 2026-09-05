import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.CYLINDER_PACKAGE ?? new URL('../package.json', import.meta.url));
const ts = require('typescript');

// Execute the actual embedded solver without React or a browser. Test-only
// counters reveal whether its numerical repair branches mask an instability.
const source = readFileSync(process.env.CYLINDER_SOURCE ?? new URL('../src/pages/CylinderJetSandbox.tsx', import.meta.url), 'utf8');
const constantsStart = source.indexOf('const NX =');
const constantsEnd = source.indexOf('const openLeaderboardDatabase');
const solverStart = source.indexOf('class CylinderLbm');
const solverEnd = source.indexOf('const historyPath');
assert(constantsStart >= 0 && constantsEnd > constantsStart && solverEnd > solverStart);
let model = source.slice(constantsStart, constantsEnd) + source.slice(solverStart, solverEnd);
const instrument = (before, after) => {
  assert(model.includes(before), `Instrumentation anchor missing: ${before}`);
  model = model.replace(before, after);
};
instrument('steps = 0;', 'repairs = 0; clips = 0; steps = 0;');
instrument('rho = 1;\n          ux', 'this.repairs += 1; rho = 1;\n          ux');
instrument('ux = clamp(ux / rho, -0.25, 0.25);', `
  if (Math.abs(ux / rho) > 0.25 || Math.abs(uy / rho) > 0.25) this.clips += 1;
  ux = clamp(ux / rho, -0.25, 0.25);`);
const javascript = ts.transpileModule(model, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const { Solver, Experiment, inletForReynolds, defaultRe, maxRe, nx, cy } = new Function(`${javascript}
  return { Solver: CylinderLbm, Experiment: CylinderExperiment, inletForReynolds, defaultRe: DEFAULT_REYNOLDS,
    maxRe: MAX_REYNOLDS, nx: NX, cy: CY };
`)();

assert.equal(defaultRe, 135);
assert.equal(maxRe, 144);
const defaultSolver = new Solver();
assert(Math.abs(defaultSolver.inletSpeed - 0.075) < 1e-12);

const cases = [
  { re: 63, mode: 'off', steps: 3000 },
  { re: 99, mode: 'off', steps: 9000 },
  { re: defaultRe, mode: 'off', steps: 9000, shedding: true },
  { re: maxRe, mode: 'off', steps: 9000, shedding: true },
  { re: maxRe, mode: 'manual+', steps: 3000 },
  { re: maxRe, mode: 'manual-', steps: 3000 },
  { re: maxRe, mode: 'periodic', steps: 3000 },
  { re: defaultRe, mode: 'feedback', steps: 6000 },
  { re: maxRe, mode: 'feedback', steps: 6000 },
];

for (const test of cases) {
  const inlet = inletForReynolds(test.re);
  const solver = new Solver(inlet);
  const experiment = new Experiment(inlet);
  experiment.solver = solver;
  experiment.referenceSolver = new Solver(inlet);
  assert.equal(solver.inletSpeed, inlet, 'Reset must use the selected inlet');
  const probes = [];
  for (let step = 1; step <= test.steps; step += 1) {
    const action = test.mode === 'manual+' ? 1 : test.mode === 'manual-' ? -1
      : test.mode === 'periodic' ? Math.sin(solver.steps * 0.025 * 0.8)
      : 0;
    if (test.mode === 'feedback') experiment.advance('heuristic', 0, 1, 0.8, false);
    else solver.step(action);
    if (step % 100 === 0) {
      assert(Number.isFinite(solver.drag) && Number.isFinite(solver.lift));
      assert(solver.f.every(Number.isFinite), 'Non-finite populations');
      if (step >= 4500) probes.push(solver.uy[cy * nx + 80]);
    }
  }
  assert.equal(solver.steps, test.steps);
  assert.equal(solver.repairs, 0, `Density repairs at Re ${test.re}, ${test.mode}`);
  assert.equal(solver.clips, 0, `Velocity clipping at Re ${test.re}, ${test.mode}`);
  const reversals = probes.slice(1).filter((value, index) => value * probes[index] < 0).length;
  if (test.shedding) {
    assert(Math.min(...probes) < -0.01 && Math.max(...probes) > 0.01, 'Wake must oscillate in both directions');
    assert(reversals >= 4, 'Wake must show repeated cross-stream reversals');
  }
  console.log(JSON.stringify({ ...test, inlet, repairs: solver.repairs, clips: solver.clips,
    wakeVelocityRange: probes.length ? [Math.min(...probes), Math.max(...probes)] : null, reversals }));
}
