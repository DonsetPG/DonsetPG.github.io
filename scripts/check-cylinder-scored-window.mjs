import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.CYLINDER_PACKAGE ?? new URL('../package.json', import.meta.url));
const ts = require('typescript');

// Run the exact production warm-up, controller, score, checkpoint, and eligibility
// logic. No mirrored scoring implementation and no shortened test horizon.
const source = readFileSync(process.env.CYLINDER_SOURCE ?? new URL('../src/pages/CylinderJetSandbox.tsx', import.meta.url), 'utf8');
const constants = source.slice(source.indexOf('const NX ='), source.indexOf('const openLeaderboardDatabase'));
const solver = source.slice(source.indexOf('class CylinderLbm'), source.indexOf('const historyPath'));
const js = ts.transpileModule(constants + solver, {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const { Experiment, inletForReynolds, eligible, protocol, Solver } = new Function(`${js}
  return {Experiment:CylinderExperiment, inletForReynolds, eligible:isCurrentScore, protocol:SCORE_PROTOCOL, Solver:CylinderLbm};
`)();

const compareState = (a,b) => {
  for (const field of ['f','next','solid','cylinder','ux','uy']) assert.deepEqual(a[field], b[field], field);
  for (const field of ['steps','drag','lift','liftProxy','previousLiftProxy','inletSpeed','numericalCorrections']) assert.equal(a[field],b[field],field);
};
const inlet = inletForReynolds(135);
const first = new Experiment(inlet);
assert.equal(first.ready,false);
assert.equal(first.advance('manual',1,1,0.8,true),false,'Cannot control during warm-up');
for (let step=0;step<6999;step++) first.warmupStep();
assert.equal(first.ready,false);
assert.equal(first.solver.steps,6999);
assert.equal(first.rewardSteps,0);
first.warmupStep();
assert.equal(first.ready,true);
assert.equal(first.solver.steps,7000);
assert.equal(first.referenceSolver.steps,7000);
assert.equal(first.rewardSum,0);
assert.equal(first.stats().meanReward,0);
compareState(first.solver,first.referenceSolver);
assert.notEqual(first.solver.f,first.referenceSolver.f,'Reference must have independent populations');
const checkpoint = Experiment.checkpoints.get(inlet);
const original = checkpoint.clone();
assert.notEqual(checkpoint.f,first.solver.f,'Running a policy must not mutate the checkpoint');
first.warmupStep();
assert.equal(first.solver.steps,7000,'Warm-up stops exactly');
console.log('Uncontrolled warm-up ends at 7000 with identical independent solver/reference and 0 reward samples.');

for(const mode of ['off','manual','periodic','heuristic']) {
  const run = new Experiment(inlet);
  assert(run.ready,'Cached runs should be immediately ready');
  compareState(run.solver,original);
  assert.equal(run.previousForceLift,run.solver.lift,'Feedback starts with current lift, avoiding a reset derivative spike');
  let rewardTotal=0;
  for(let step=0;step<1500;step++) {
    assert(run.advance(mode,step<750?1:-1,1,0.8,true));
    assert.equal(run.solver.steps,7001+step);
    assert.equal(run.referenceSolver.steps,7001+step);
    assert(Number.isFinite(run.reward));
    assert(Math.abs(run.action)<=1);
    rewardTotal+=run.reward;
    if(mode==='off') assert.equal(run.solver.drag,run.referenceSolver.drag);
    if(step===749) {
      const paused = run.stats();
      assert.equal(run.stats().steps,paused.steps,'Reading paused state never advances');
    }
  }
  assert.equal(run.stats().steps,8500);
  assert.equal(run.stats().rewardSteps,1500);
  assert.equal(run.stats().meanReward,rewardTotal/1500);
  assert.equal(run.stats().numericalCorrections,0, 'Eligible runs have no numerical correction');
  if (mode==='off') assert.equal(run.stats().referenceMeanReward, run.stats().meanReward, 'No-control reward has zero improvement against itself');
  const stopped=run.solver.clone();
  assert.equal(run.advance(mode,1,1,0.8,true),false);
  compareState(run.solver,stopped);
  compareState(checkpoint,original);
  assert(run.solver.f.every(Number.isFinite));
  assert(run.referenceSolver.f.every(Number.isFinite));
  console.log(JSON.stringify({mode,endStep:run.solver.steps,rewardSamples:run.rewardSteps,meanReward:run.stats().meanReward}));
}

const preview = new Experiment(inlet);
for(let i=0;i<1501;i++) assert(preview.advance('off',0,1,0.8,false));
assert.equal(preview.solver.steps,8501,'Free preview can exceed the scored window');
const reset = new Experiment(inlet);
assert.equal(reset.stats().steps,7000);
assert.equal(reset.stats().rewardSteps,0);
compareState(reset.solver,original);

const other = new Experiment(inletForReynolds(144));
assert.equal(other.ready,false,'A different Reynolds setting requires its own warm-up');
for(let i=0;i<7000;i++) other.warmupStep();
assert(other.ready);
assert.notDeepEqual(other.solver.f,original.f);
compareState(other.solver,other.referenceSolver);
assert.equal(new Experiment(inlet).ready,true,'Original Reynolds checkpoint remains reusable');

const score={protocol,startStep:7000,endStep:8500,steps:1500,meanReward:0.1,numericalCorrections:0};
assert(eligible(score));
assert(!eligible({...score,numericalCorrections:1}), 'Numerically corrected runs cannot enter the board');
assert(!eligible({...score,protocol:'uncontrolled-7000-control-1500-v1'}), 'Previous wall-inclusive scores remain separate');
assert(!eligible({...score,protocol:undefined}),'Exclude legacy scores without deleting them');
assert(!eligible({...score,startStep:0}));
assert(!eligible({...score,endStep:8499}));
assert(!eligible({...score,steps:1499}));
assert(!eligible({...score,meanReward:NaN}));
console.log('Reset, free preview, per-Reynolds checkpoints, exact 7000–8500 score eligibility, and legacy separation passed.');

// Keep exactly the same physical bounce-back geometry while masking which links
// belong to the measured cylinder. Wall links and all other unmarked solids must
// contribute zero to the force sum.
const measured = new Solver(inlet);
const unmeasured = measured.clone();
unmeasured.cylinder.fill(0);
measured.step(0);
unmeasured.step(0);
assert.deepEqual(measured.f, unmeasured.f, 'Measurement mask cannot change the simulated flow');
assert.equal(unmeasured.drag, 0, 'No force from channel walls or unmarked solid links');
assert.equal(unmeasured.lift, 0);
assert(measured.drag > 0, 'Cylinder links contribute a nonzero force');
const broken = new Solver(inlet);
broken.f.fill(NaN);
broken.step(0);
assert(broken.numericalCorrections > 0, 'Numerical repairs must be observable');
console.log('Cylinder-only force measurement, unchanged flow, numerical correction visibility, and v2 score separation passed.');
