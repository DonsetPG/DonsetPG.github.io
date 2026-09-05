import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, Pause, Play, RotateCcw, Trophy } from "lucide-react";
import "./CylinderJetSandbox.css";

type ControlMode = "heuristic" | "manual" | "periodic" | "off";
type ChallengeState = "idle" | "running" | "complete" | "saved";

type SolverStats = {
  action: number;
  drag: number;
  lift: number;
  liftProxy: number;
  reward: number;
  meanReward: number;
  referenceDrag: number;
  referenceMeanReward: number;
  steps: number;
  rewardSteps: number;
  stepsPerSecond: number;
  numericalCorrections: number;
};

type LeaderboardEntry = {
  id: string;
  pilot: string;
  mode: ControlMode;
  detail: string;
  meanReward: number;
  steps: number;
  reynoldsProxy: number;
  inlet: number;
  createdAt: number;
  protocol: string;
  startStep: number;
  endStep: number;
  numericalCorrections: number;
};

type RunSnapshot = {
  id: string;
  stats: SolverStats;
  mode: ControlMode;
  detail: string;
  reynoldsProxy: number;
  inlet: number;
};

const NX = 180;
const NY = 76;
const Q = 9;
const CX = 44;
const CY = Math.floor(NY / 2);
const RADIUS = 9;
const TAU = 0.53;
const LATTICE_VISCOSITY = (TAU - 0.5) / 3;
const DEFAULT_REYNOLDS = 135;
const MIN_REYNOLDS = 63;
const MAX_REYNOLDS = 144;
const inletForReynolds = (reynolds: number) => reynolds * LATTICE_VISCOSITY / (2 * RADIUS);
const DEFAULT_INLET = inletForReynolds(DEFAULT_REYNOLDS);
const JET_SPEED = 0.018;
const LIFT_PENALTY = 0.04;
const ACTION_PENALTY = 0.05;
const SCORED_RUN_STEPS = 1500;
const WARMUP_STEPS = 7000;
const SCORED_END_STEP = WARMUP_STEPS + SCORED_RUN_STEPS;
const SCORE_PROTOCOL = "cylinder-only-7000-control-1500-v2";
const LEADERBOARD_DATABASE = "heuristic-learning-sandbox";
const LEADERBOARD_STORE = "cylinder-jet-runs";
const EX = new Int8Array([0, 1, 0, -1, 0, 1, -1, -1, 1]);
const EY = new Int8Array([0, 0, 1, 0, -1, 1, 1, -1, -1]);
const OPP = new Int8Array([0, 3, 4, 1, 2, 7, 8, 5, 6]);
const WEIGHTS = new Float32Array([4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36]);

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const formatSigned = (value: number, digits = 2) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
const EMPTY_STATS: SolverStats = {
  action: 0,
  drag: 0,
  lift: 0,
  liftProxy: 0,
  reward: 0,
  meanReward: 0,
  referenceDrag: 0,
  referenceMeanReward: 0,
  steps: 0,
  rewardSteps: 0,
  stepsPerSecond: 0,
  numericalCorrections: 0,
};

const isCurrentScore = (entry: LeaderboardEntry) => entry.protocol === SCORE_PROTOCOL
  && entry.startStep === WARMUP_STEPS
  && entry.endStep === SCORED_END_STEP
  && entry.steps === SCORED_RUN_STEPS
  && entry.numericalCorrections === 0
  && Number.isFinite(entry.meanReward);

const openLeaderboardDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!("indexedDB" in window)) {
    reject(new Error("IndexedDB is unavailable"));
    return;
  }

  const request = window.indexedDB.open(LEADERBOARD_DATABASE, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(LEADERBOARD_STORE)) {
      database.createObjectStore(LEADERBOARD_STORE, { keyPath: "id" });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Could not open the leaderboard database"));
});

const loadLeaderboard = async () => {
  const database = await openLeaderboardDatabase();
  return new Promise<LeaderboardEntry[]>((resolve, reject) => {
    const transaction = database.transaction(LEADERBOARD_STORE, "readonly");
    const request = transaction.objectStore(LEADERBOARD_STORE).getAll();
    request.onsuccess = () => resolve((request.result as LeaderboardEntry[])
      .filter(isCurrentScore)
      .sort((a, b) => b.meanReward - a.meanReward || b.steps - a.steps));
    request.onerror = () => reject(request.error ?? new Error("Could not read leaderboard runs"));
    transaction.oncomplete = () => database.close();
  });
};

const storeLeaderboardEntry = async (entry: LeaderboardEntry) => {
  const database = await openLeaderboardDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LEADERBOARD_STORE, "readwrite");
    transaction.objectStore(LEADERBOARD_STORE).put(entry);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save this run"));
    };
  });
};

class CylinderLbm {
  readonly count = NX * NY;
  f = new Float32Array(this.count * Q);
  next = new Float32Array(this.count * Q);
  solid = new Uint8Array(this.count);
  cylinder = new Uint8Array(this.count);
  ux = new Float32Array(this.count);
  uy = new Float32Array(this.count);
  inletSpeed = DEFAULT_INLET;
  steps = 0;
  drag = 0;
  lift = 0;
  liftProxy = 0;
  previousLiftProxy = 0;
  numericalCorrections = 0;
  private pixels: ImageData | null = null;

  constructor(inletSpeed = DEFAULT_INLET) {
    this.inletSpeed = inletSpeed;
    this.reset();
  }

  clone() {
    const copy = new CylinderLbm(this.inletSpeed);
    for (const field of ["f", "next", "solid", "cylinder", "ux", "uy"] as const) copy[field].set(this[field]);
    copy.steps = this.steps;
    copy.drag = this.drag;
    copy.lift = this.lift;
    copy.liftProxy = this.liftProxy;
    copy.previousLiftProxy = this.previousLiftProxy;
    copy.numericalCorrections = this.numericalCorrections;
    return copy;
  }

  reset() {
    this.steps = 0;
    this.drag = 0;
    this.lift = 0;
    this.liftProxy = 0;
    this.previousLiftProxy = 0;
    this.numericalCorrections = 0;
    this.solid.fill(0);
    this.cylinder.fill(0);
    for (let y = 0; y < NY; y += 1) {
      for (let x = 0; x < NX; x += 1) {
        const index = y * NX + x;
        const wall = y <= 1 || y >= NY - 2;
        const cylinder = (x - CX) ** 2 + (y - CY) ** 2 <= RADIUS ** 2;
        this.cylinder[index] = cylinder ? 1 : 0;
        this.solid[index] = wall || cylinder ? 1 : 0;
        this.setEquilibrium(this.f, index, 1, this.solid[index] ? 0 : this.inletSpeed, 0);
      }
    }
    this.next.set(this.f);
  }

  private setEquilibrium(target: Float32Array, index: number, rho: number, ux: number, uy: number) {
    const u2 = ux * ux + uy * uy;
    for (let direction = 0; direction < Q; direction += 1) {
      const eu = EX[direction] * ux + EY[direction] * uy;
      target[direction * this.count + index] = WEIGHTS[direction] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * u2);
    }
  }

  private velocityAt(x: number, y: number) {
    const index = y * NX + x;
    if (this.solid[index]) return [0, 0] as const;
    let rho = 0;
    let ux = 0;
    let uy = 0;
    for (let direction = 0; direction < Q; direction += 1) {
      const value = this.f[direction * this.count + index];
      rho += value;
      ux += value * EX[direction];
      uy += value * EY[direction];
    }
    if (!Number.isFinite(rho) || Math.abs(rho) < 1e-6) return [0, 0] as const;
    const safeRho = Math.max(rho, 1e-6);
    return [ux / safeRho, uy / safeRho] as const;
  }

  step(action: number) {
    const omega = 1 / TAU;
    this.next.fill(0);
    let momentumX = 0;
    let momentumY = 0;

    for (let y = 2; y < NY - 2; y += 1) {
      for (let x = 0; x < NX; x += 1) {
        const index = y * NX + x;
        if (this.solid[index]) continue;

        let rho = 0;
        let ux = 0;
        let uy = 0;
        for (let direction = 0; direction < Q; direction += 1) {
          const value = this.f[direction * this.count + index];
          rho += value;
          ux += value * EX[direction];
          uy += value * EY[direction];
        }
        if (!Number.isFinite(rho) || rho < 0.05 || rho > 5) {
          this.numericalCorrections += 1;
          rho = 1;
          ux = this.inletSpeed;
          uy = 0;
          this.setEquilibrium(this.f, index, rho, ux, uy);
        } else {
          if (Math.abs(ux / rho) > 0.25 || Math.abs(uy / rho) > 0.25) this.numericalCorrections += 1;
          ux = clamp(ux / rho, -0.25, 0.25);
          uy = clamp(uy / rho, -0.25, 0.25);
        }

        if (x <= 1) {
          ux = this.inletSpeed;
          uy = 0;
          rho = 1;
        }

        const atJet = Math.abs(x - CX) <= 2
          && (Math.abs(y - (CY - RADIUS - 1)) <= 1 || Math.abs(y - (CY + RADIUS + 1)) <= 1);
        if (atJet) uy = -action * JET_SPEED;

        this.ux[index] = ux;
        this.uy[index] = uy;
        const u2 = ux * ux + uy * uy;

        for (let direction = 0; direction < Q; direction += 1) {
          const offset = direction * this.count + index;
          const eu = EX[direction] * ux + EY[direction] * uy;
          const equilibrium = WEIGHTS[direction] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * u2);
          const postCollision = this.f[offset] - omega * (this.f[offset] - equilibrium);
          const targetX = x + EX[direction];
          const targetY = y + EY[direction];

          if (targetY < 0 || targetY >= NY || (targetX >= 0 && targetX < NX && this.solid[targetY * NX + targetX])) {
            this.next[OPP[direction] * this.count + index] += postCollision;
            // Momentum exchange on the cylinder only. Channel-wall bounce-back
            // advances the flow but must not enter the cylinder force proxy.
            if (targetX >= 0 && targetX < NX && targetY >= 0 && targetY < NY
              && this.cylinder[targetY * NX + targetX]) {
              momentumX += 2 * postCollision * EX[direction];
              momentumY += 2 * postCollision * EY[direction];
            }
          } else if (targetX >= 0 && targetX < NX) {
            this.next[direction * this.count + targetY * NX + targetX] += postCollision;
          }
        }
      }
    }

    for (let y = 2; y < NY - 2; y += 1) {
      const inlet = y * NX;
      const outlet = y * NX + NX - 1;
      const upstream = outlet - 1;
      if (!this.solid[inlet]) this.setEquilibrium(this.next, inlet, 1, this.inletSpeed, 0);
      if (!this.solid[outlet]) {
        for (let direction = 0; direction < Q; direction += 1) {
          this.next[direction * this.count + outlet] = this.next[direction * this.count + upstream];
        }
      }
    }

    const swap = this.f;
    this.f = this.next;
    this.next = swap;
    this.steps += 1;

    const wakeX = CX + RADIUS * 3;
    let upper = 0;
    let lower = 0;
    let samples = 0;
    for (let offset = 3; offset <= 10; offset += 1) {
      upper += this.velocityAt(wakeX, CY - offset)[0];
      lower += this.velocityAt(wakeX, CY + offset)[0];
      samples += 1;
    }
    this.previousLiftProxy = this.liftProxy;
    this.liftProxy = (upper - lower) / Math.max(1, samples);

    const scale = 1 / Math.max(1e-5, this.inletSpeed * this.inletSpeed * (2 * RADIUS));
    const normalizedDrag = momentumX * scale;
    const normalizedLift = momentumY * scale;
    const rawDrag = Number.isFinite(normalizedDrag) ? clamp(normalizedDrag, -8, 12) : 0;
    const rawLift = Number.isFinite(normalizedLift) ? clamp(normalizedLift, -12, 12) : 0;
    this.drag = this.steps < 4 ? rawDrag : 0.94 * this.drag + 0.06 * rawDrag;
    this.lift = this.steps < 4 ? rawLift : 0.94 * this.lift + 0.06 * rawLift;
  }

  render(context: CanvasRenderingContext2D, scratch: CanvasRenderingContext2D, action: number) {
    const pixels = this.pixels ?? (this.pixels = scratch.createImageData(NX, NY));
    for (let y = 0; y < NY; y += 1) {
      for (let x = 0; x < NX; x += 1) {
        const index = y * NX + x;
        const pixel = index * 4;
        if (this.solid[index]) {
          pixels.data[pixel] = 16;
          pixels.data[pixel + 1] = 23;
          pixels.data[pixel + 2] = 28;
          pixels.data[pixel + 3] = 255;
          continue;
        }

        const left = y * NX + Math.max(0, x - 1);
        const right = y * NX + Math.min(NX - 1, x + 1);
        const top = Math.max(0, y - 1) * NX + x;
        const bottom = Math.min(NY - 1, y + 1) * NX + x;
        const vorticity = 0.5 * ((this.uy[right] - this.uy[left]) - (this.ux[bottom] - this.ux[top]));
        const value = clamp(Number.isFinite(vorticity) ? vorticity * 22 : 0, -1, 1);
        const magnitude = Math.abs(value);
        if (value >= 0) {
          pixels.data[pixel] = 232;
          pixels.data[pixel + 1] = Math.round(224 - 144 * magnitude);
          pixels.data[pixel + 2] = Math.round(205 - 152 * magnitude);
        } else {
          pixels.data[pixel] = Math.round(219 - 170 * magnitude);
          pixels.data[pixel + 1] = Math.round(229 - 82 * magnitude);
          pixels.data[pixel + 2] = 238;
        }
        pixels.data[pixel + 3] = 255;
      }
    }

    scratch.putImageData(pixels, 0, 0);
    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.drawImage(scratch.canvas, 0, 0, context.canvas.width, context.canvas.height);

    const scaleX = context.canvas.width / NX;
    const scaleY = context.canvas.height / NY;
    context.strokeStyle = "rgba(233,237,232,.72)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(CX * scaleX, CY * scaleY, RADIUS * scaleY, 0, Math.PI * 2);
    context.stroke();

    const jetLength = action * 70;
    context.strokeStyle = action >= 0 ? "#ff6a3d" : "#58e5ee";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(CX * scaleX, (CY - RADIUS) * scaleY);
    context.lineTo(CX * scaleX, (CY - RADIUS) * scaleY - jetLength);
    context.moveTo(CX * scaleX, (CY + RADIUS) * scaleY);
    context.lineTo(CX * scaleX, (CY + RADIUS) * scaleY - jetLength);
    context.stroke();
  }
}

// Checkpoints are immutable: every preview, scored run, and reference gets its
// own copy. Keep only a few Reynolds settings to bound session memory use.
class CylinderExperiment {
  static checkpoints = new Map<number, CylinderLbm>();
  solver: CylinderLbm;
  referenceSolver: CylinderLbm | null = null;
  action = 0;
  reward = 0;
  rewardSum = 0;
  referenceRewardSum = 0;
  rewardSteps = 0;
  feedbackScale = 0.2;
  previousForceLift = 0;

  constructor(inlet: number) {
    this.solver = CylinderExperiment.checkpoints.get(inlet)?.clone() ?? new CylinderLbm(inlet);
    if (this.solver.steps === WARMUP_STEPS) this.prepareControl();
  }

  get ready() { return this.referenceSolver !== null; }

  private prepareControl() {
    this.referenceSolver = this.solver.clone();
    this.previousForceLift = this.solver.lift;
    this.feedbackScale = Math.max(0.2, Math.abs(this.solver.lift));
  }

  warmupStep() {
    if (this.ready) return;
    this.solver.step(0);
    if (this.solver.steps === WARMUP_STEPS) {
      const checkpoints = CylinderExperiment.checkpoints;
      checkpoints.set(this.solver.inletSpeed, this.solver.clone());
      if (checkpoints.size > 3) checkpoints.delete(checkpoints.keys().next().value!);
      this.prepareControl();
    }
  }

  advance(mode: ControlMode, manual: number, gain: number, frequency: number, scored: boolean) {
    if (!this.referenceSolver || (scored && this.rewardSteps >= SCORED_RUN_STEPS)) return false;
    const solver = this.solver;
    if (mode === "manual") this.action = manual;
    else if (mode === "periodic") this.action = Math.sin(this.rewardSteps * 0.025 * frequency);
    else if (mode === "off") this.action = 0;
    else {
      const liftRate = solver.lift - this.previousForceLift;
      const feedbackSignal = solver.lift + 7 * liftRate;
      this.feedbackScale = 0.996 * this.feedbackScale + 0.004 * Math.abs(feedbackSignal);
      const normalizedSignal = feedbackSignal / Math.max(5e-5, 2.5 * this.feedbackScale);
      const targetAction = 0.55 * Math.tanh(1.6 * gain * normalizedSignal);
      this.action = 0.9 * this.action + 0.1 * targetAction;
    }
    this.previousForceLift = solver.lift;
    solver.step(this.action);
    this.referenceSolver.step(0);
    this.reward = this.referenceSolver.drag - solver.drag
      - LIFT_PENALTY * Math.abs(solver.lift) - ACTION_PENALTY * this.action * this.action;
    this.rewardSum += this.reward;
    this.referenceRewardSum -= LIFT_PENALTY * Math.abs(this.referenceSolver.lift);
    this.rewardSteps += 1;
    return true;
  }

  stats(stepsPerSecond = 0): SolverStats {
    return {
      action: this.action, drag: this.solver.drag, lift: this.solver.lift,
      liftProxy: this.solver.liftProxy, reward: this.reward,
      meanReward: this.rewardSum / Math.max(1, this.rewardSteps),
      referenceDrag: this.referenceSolver?.drag ?? this.solver.drag,
      referenceMeanReward: this.referenceRewardSum / Math.max(1, this.rewardSteps),
      steps: this.solver.steps, rewardSteps: this.rewardSteps, stepsPerSecond,
      numericalCorrections: this.solver.numericalCorrections + (this.referenceSolver?.numericalCorrections ?? 0),
    };
  }
}

type HistorySample = { step: number; reward: number; meanReward: number; action: number };

const historyPath = (history: HistorySample[], field: "reward" | "meanReward" | "action", domain: [number, number], endStep: number) => history
  .map((sample, index) => {
    const x = 52 + ((sample.step - WARMUP_STEPS) / Math.max(1, endStep - WARMUP_STEPS)) * 510;
    const y = 118 - ((sample[field] - domain[0]) / (domain[1] - domain[0])) * 96;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  })
  .join(" ");

const RewardHistory = ({ history, endStep }: { history: HistorySample[]; endStep: number }) => {
  const values = history.flatMap((sample) => [sample.reward, sample.meanReward]);
  const lower = Math.min(-0.05, ...values);
  const upper = Math.max(0.05, ...values);
  const padding = (upper - lower) * 0.08;
  const domain: [number, number] = [lower - padding, upper + padding];
  const zeroY = 118 - ((0 - domain[0]) / (domain[1] - domain[0])) * 96;
  return (
    <div className="hl-reward-history">
      <div className="hl-reward-history-heading"><strong>Reward through the run</strong><span><i className="is-reward" /> instant <i className="is-mean" /> mean</span></div>
      <svg viewBox="0 0 580 154" role="img" aria-label={`Instant reward and cumulative mean reward from step 7000 to ${endStep}. Both curves use the same vertical scale.`}>
        {[domain[1], 0, domain[0]].map((value, index) => {
          const y = 118 - ((value - domain[0]) / (domain[1] - domain[0])) * 96;
          return <g key={index}><line x1="52" x2="562" y1={y} y2={y} className={value === 0 ? "is-zero" : ""} /><text x="44" y={y + 3} textAnchor="end">{formatSigned(value, 2)}</text></g>;
        })}
        {[WARMUP_STEPS, (WARMUP_STEPS + endStep) / 2, endStep].map((step) => <text key={step} x={52 + ((step - WARMUP_STEPS) / (endStep - WARMUP_STEPS)) * 510} y="141" textAnchor="middle">{Math.round(step).toLocaleString()}</text>)}
        <path className="is-reward" d={historyPath(history, "reward", domain, endStep)} />
        <path className="is-mean" d={historyPath(history, "meanReward", domain, endStep)} />
        {!history.length && <text x="307" y={Math.min(95, zeroY + 23)} textAnchor="middle">Start a run to see the reward trace</text>}
      </svg>
      <div className="hl-command-history-heading"><span>Jet command</span><span>−1 to +1 · same step axis</span></div>
      <svg className="hl-command-history" viewBox="0 0 580 50" role="img" aria-label="Jet command over the same simulation steps, ranging from minus one to plus one">
        <line x1="52" x2="562" y1="25" y2="25" className="is-zero" />
        <text x="44" y="12" textAnchor="end">+1</text><text x="44" y="44" textAnchor="end">−1</text>
        <path className="is-action" transform="translate(0 1.67) scale(1 .3333)" d={historyPath(history, "action", [-1, 1], endStep)} />
      </svg>
      <p>Higher reward is better. The mean includes every control step; the trace samples every 10 steps.</p>
    </div>
  );
};

const MODES: Array<{ id: ControlMode; label: string }> = [
  { id: "heuristic", label: "Feedback" },
  { id: "manual", label: "Manual" },
  { id: "periodic", label: "Periodic" },
  { id: "off", label: "No control" },
];

const CylinderJetSandbox = () => {
  const sandboxRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const referenceCanvasRef = useRef<HTMLCanvasElement>(null);
  const wakeAnimationRef = useRef<() => void>(() => {});
  const compareRef = useRef(true);
  const saveInFlightRef = useRef(false);
  const runGenerationRef = useRef(0);
  const modeRef = useRef<ControlMode>("heuristic");
  const manualRef = useRef(0);
  const gainRef = useRef(1);
  const frequencyRef = useRef(0.8);
  const runningRef = useRef(false);
  const scoredRunRef = useRef(false);
  const [mode, setMode] = useState<ControlMode>("heuristic");
  const [manual, setManual] = useState(0);
  const [gain, setGain] = useState(1);
  const [frequency, setFrequency] = useState(0.8);
  const [inlet, setInlet] = useState(DEFAULT_INLET);
  const [running, setRunning] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [stats, setStats] = useState<SolverStats>(EMPTY_STATS);
  const [history, setHistory] = useState<HistorySample[]>([]);
  const [showReference, setShowReference] = useState(true);
  const [pilotName, setPilotName] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [storageStatus, setStorageStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");
  const [challengeState, setChallengeState] = useState<ChallengeState>("idle");
  const [completedRun, setCompletedRun] = useState<RunSnapshot | null>(null);

  const setManualCommand = useCallback((value: number) => {
    manualRef.current = value;
    setManual(value);
  }, []);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { manualRef.current = manual; }, [manual]);
  useEffect(() => { gainRef.current = gain; }, [gain]);
  useEffect(() => { frequencyRef.current = frequency; }, [frequency]);
  useEffect(() => { runningRef.current = running; wakeAnimationRef.current(); }, [running]);
  useEffect(() => { compareRef.current = showReference; wakeAnimationRef.current(); }, [showReference]);

  useEffect(() => {
    let active = true;
    loadLeaderboard()
      .then((entries) => {
        if (!active) return;
        setLeaderboard(entries);
        setStorageStatus("ready");
      })
      .catch(() => {
        if (active) setStorageStatus("error");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setStorageStatus((current) => current === "error" ? current : "ready");
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const referenceContext = referenceCanvasRef.current?.getContext("2d");
    const scratchCanvas = document.createElement("canvas");
    scratchCanvas.width = NX;
    scratchCanvas.height = NY;
    const scratch = scratchCanvas.getContext("2d");
    if (!context || !scratch) return;

    const experiment = new CylinderExperiment(inlet);
    const solver = experiment.solver;
    const samples: HistorySample[] = [];
    let request = 0;
    let lastMeasure = performance.now();
    let lastSteps = solver.steps;
    let lastSampleStep = 0;
    let visible = true;
    let disposed = false;
    setPrepared(experiment.ready);
    setStats(experiment.stats());
    setHistory([]);

    const schedule = () => {
      if (!disposed && !request && visible && !document.hidden) request = requestAnimationFrame(animate);
    };

    const animate = (now: number) => {
      request = 0;
      if (!visible || document.hidden) return;
      let becameReady = false;
      if (!experiment.ready) {
        // Time-sliced preparation keeps the page responsive and visibly reports
        // progress. Control never runs in the same frame that finishes warm-up.
        const deadline = performance.now() + 12;
        do { experiment.warmupStep(); } while (!experiment.ready && performance.now() < deadline);
        if (experiment.ready) {
          becameReady = true;
          setPrepared(true);
        }
      } else if (runningRef.current) {
        for (let substep = 0; substep < 3; substep += 1) {
          experiment.advance(modeRef.current, manualRef.current, gainRef.current, frequencyRef.current, scoredRunRef.current);
          if (experiment.rewardSteps > 0 && experiment.rewardSteps % 10 === 0 && solver.steps !== lastSampleStep) {
            samples.push({ step: solver.steps, reward: experiment.reward, meanReward: experiment.rewardSum / experiment.rewardSteps, action: experiment.action });
            if (samples.length > 1000) samples.shift();
            lastSampleStep = solver.steps;
          }
          if (scoredRunRef.current && experiment.rewardSteps >= SCORED_RUN_STEPS) {
            runningRef.current = false;
            break;
          }
        }
      }

      solver.render(context, scratch, experiment.action);
      if (compareRef.current && referenceContext) {
        (experiment.referenceSolver ?? solver).render(referenceContext, scratch, 0);
      }
      if (now - lastMeasure >= 100 || becameReady || !runningRef.current && experiment.ready) {
        const elapsed = Math.max(1, now - lastMeasure);
        const stepsPerSecond = ((solver.steps - lastSteps) * 1000) / elapsed;
        lastMeasure = now;
        lastSteps = solver.steps;
        setStats(experiment.stats(stepsPerSecond));
        setHistory([...samples]);
      }
      if (!experiment.ready || runningRef.current) schedule();
    };

    const onVisibility = () => {
      lastMeasure = performance.now();
      lastSteps = solver.steps;
      schedule();
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      onVisibility();
    }, { rootMargin: "160px" });
    if (sandboxRef.current) observer?.observe(sandboxRef.current);
    document.addEventListener("visibilitychange", onVisibility);
    wakeAnimationRef.current = schedule;
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(request);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      wakeAnimationRef.current = () => {};
    };
  }, [resetKey, inlet]);

  const reynoldsProxy = useMemo(() => Math.round((inlet * (2 * RADIUS)) / LATTICE_VISCOSITY), [inlet]);
  const historyEndStep = Math.max(SCORED_END_STEP, WARMUP_STEPS + Math.ceil(stats.rewardSteps / 500) * 500);
  const modeCode = mode === "heuristic"
    ? ["signal = lift_proxy + 7.0 × Δlift_proxy", "scale = EMA(|signal|)", "command = smooth(0.55 tanh(1.6 × gain × signal / 2.5 scale))"]
    : mode === "manual"
      ? ["command = keyboard, hold buttons, or slider", `jet_velocity = ${JET_SPEED.toFixed(3)} × command`]
      : mode === "periodic"
        ? ["command = sin(control_step × 0.025 × frequency)", `jet_velocity = ${JET_SPEED.toFixed(3)} × command`]
        : ["command = 0", "paired jets disabled"];
  const leaderboardEntries = useMemo(
    () => [...leaderboard]
      .filter((entry) => entry.reynoldsProxy === reynoldsProxy)
      .sort((a, b) => b.meanReward - a.meanReward || b.steps - a.steps)
      .slice(0, 6),
    [leaderboard, reynoldsProxy],
  );
  const runDetail = mode === "heuristic"
    ? `gain ${gain.toFixed(2)}`
    : mode === "periodic"
      ? `frequency ${frequency.toFixed(2)}`
      : mode === "manual"
        ? "keyboard control"
        : "zero actuation";
  const controlsLocked = challengeState === "running" || challengeState === "complete";
  const scoredSteps = completedRun?.stats.rewardSteps ?? (challengeState === "running" ? stats.rewardSteps : 0);
  const displayedScore = completedRun?.stats.meanReward ?? stats.meanReward;
  const challengeProgress = clamp(scoredSteps / SCORED_RUN_STEPS, 0, 1);
  const progressSteps = prepared ? scoredSteps : stats.steps;
  const progressTotal = prepared ? SCORED_RUN_STEPS : WARMUP_STEPS;
  const progress = prepared ? challengeProgress : clamp(stats.steps / WARMUP_STEPS, 0, 1);
  const canRecordRun = challengeState === "complete"
    && completedRun !== null
    && completedRun.stats.numericalCorrections === 0
    && storageStatus !== "loading"
    && storageStatus !== "saving";

  useEffect(() => {
    if (challengeState !== "running" || stats.steps !== SCORED_END_STEP || stats.rewardSteps !== SCORED_RUN_STEPS) return;
    scoredRunRef.current = false;
    setCompletedRun({ id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${resetKey}`, stats, mode, detail: runDetail, reynoldsProxy, inlet });
    setRunning(false);
    setChallengeState("complete");
  }, [challengeState, inlet, mode, resetKey, reynoldsProxy, runDetail, stats]);

  useEffect(() => {
    if (!prepared || mode !== "manual" || challengeState === "complete") return;
    const sandbox = sandboxRef.current;
    if (!sandbox) return;
    const held = new Set<string>();

    const isEditableTarget = (target: EventTarget | null) => target instanceof HTMLElement
      && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        held.add(event.key);
        setManualCommand(Number(held.has("ArrowUp")) - Number(held.has("ArrowDown")));
      } else if (event.code === "Space" && event.target === sandbox) {
        event.preventDefault();
        held.clear();
        setManualCommand(0);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!held.has(event.key)) return;
      event.preventDefault();
      held.delete(event.key);
      setManualCommand(Number(held.has("ArrowUp")) - Number(held.has("ArrowDown")));
    };
    const centerJets = () => { held.clear(); setManualCommand(0); };
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !sandbox.contains(event.relatedTarget)) centerJets();
    };

    sandbox.addEventListener("keydown", onKeyDown);
    sandbox.addEventListener("focusout", onFocusOut);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", centerJets);
    document.addEventListener("visibilitychange", centerJets);
    return () => {
      sandbox.removeEventListener("keydown", onKeyDown);
      sandbox.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", centerJets);
      document.removeEventListener("visibilitychange", centerJets);
      setManualCommand(0);
    };
  }, [challengeState, mode, prepared, setManualCommand]);

  const startScoredRun = () => {
    if (!prepared) return;
    runGenerationRef.current += 1;
    scoredRunRef.current = true;
    runningRef.current = true;
    setStats(EMPTY_STATS);
    if (mode === "manual") setManualCommand(0);
    setCompletedRun(null);
    setStorageStatus((current) => current === "error" ? current : "ready");
    setChallengeState("running");
    setRunning(true);
    setResetKey((current) => current + 1);
    if (mode === "manual") sandboxRef.current?.focus({ preventScroll: true });
  };

  const resetSandbox = () => {
    runGenerationRef.current += 1;
    scoredRunRef.current = false;
    runningRef.current = false;
    setStats(EMPTY_STATS);
    setCompletedRun(null);
    setChallengeState("idle");
    setRunning(false);
    setManualCommand(0);
    setResetKey((current) => current + 1);
  };

  const recordRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canRecordRun || saveInFlightRef.current) return;

    if (!completedRun) return;
    saveInFlightRef.current = true;
    setStorageStatus("saving");
    const generation = runGenerationRef.current;
    const entry: LeaderboardEntry = {
      id: completedRun.id,
      pilot: pilotName.trim().slice(0, 18) || "Guest",
      mode: completedRun.mode,
      detail: completedRun.detail,
      meanReward: completedRun.stats.meanReward,
      steps: completedRun.stats.rewardSteps,
      protocol: SCORE_PROTOCOL,
      startStep: WARMUP_STEPS,
      endStep: completedRun.stats.steps,
      reynoldsProxy: completedRun.reynoldsProxy,
      inlet: completedRun.inlet,
      createdAt: Date.now(),
      numericalCorrections: completedRun.stats.numericalCorrections,
    };

    try {
      await storeLeaderboardEntry(entry);
      setLeaderboard((current) => [...current.filter((item) => item.id !== entry.id), entry]);
      if (generation === runGenerationRef.current) {
        setStorageStatus("saved");
        setChallengeState("saved");
      }
    } catch {
      if (generation === runGenerationRef.current) setStorageStatus("error");
    } finally {
      saveInFlightRef.current = false;
    }
  };

  return (
    <section ref={sandboxRef} className="hl-cylinder-lab" id="cylinder-sandbox" tabIndex={-1} aria-label="Interactive cylinder flow sandbox">
      <div className="hl-section-heading">
        <div>
          <span className="hl-section-index">05</span>
          <p>Browser CFD sandbox</p>
        </div>
        <h2>Take over the wake at step 7,000. Control it to 8,500.</h2>
      </div>

      <div className="hl-solver-truth">
        <span>LIVE · BROWSER COMPUTED</span>
        <p>D2Q9 cylinder wake with paired synthetic jets and a synchronized no-control reference. Reward uses cylinder force proxies and actuation cost. This browser demonstration uses its own grid, forcing, and reward; FluidGym results are reported separately above.</p>
      </div>

      <div className="hl-cylinder-grid">
        <div className="hl-cylinder-toolbar">
            <div className="hl-mode-switch" role="group" aria-label="Cylinder control mode">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={mode === item.id ? "is-active" : ""}
                  aria-pressed={mode === item.id}
                  disabled={controlsLocked}
                  onClick={() => setMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="hl-run-controls">
              <button type="button" disabled={!prepared || challengeState === "complete"} onClick={() => {
                if (challengeState === "saved") resetSandbox();
                setRunning((current) => !current);
                if (mode === "manual") sandboxRef.current?.focus({ preventScroll: true });
              }}>
                {running ? <Pause size={14} /> : <Play size={14} />} {running ? "Pause" : challengeState === "running" ? "Resume" : "Preview"}
              </button>
              <button type="button" onClick={resetSandbox}><RotateCcw size={14} /> Reset</button>
            </div>
        </div>
        <div className="hl-cylinder-stage">
          <div className="hl-comparison-toolbar">
            <span>{prepared ? `Step ${stats.steps.toLocaleString()} · ${running ? "live" : "paused"}` : `Preparing flow · ${Math.round(stats.steps / WARMUP_STEPS * 100)}%`}</span>
            <button type="button" aria-pressed={showReference} onClick={() => setShowReference((current) => !current)}>{showReference ? "Hide reference" : "Compare with jets off"}</button>
          </div>
          <div className={`hl-flow-comparison ${showReference ? "is-comparing" : ""}`}>
            <figure>
              <figcaption><strong>{prepared ? MODES.find((item) => item.id === mode)?.label : "Uncontrolled warm-up"}</strong><span>{prepared ? `command ${formatSigned(stats.action, 2)}` : "jets off"}</span></figcaption>
              <div className="hl-cylinder-canvas-wrap">
                <canvas ref={canvasRef} width={1080} height={456} aria-label="Live vorticity field around the controlled cylinder" />
              </div>
            </figure>
            <figure hidden={!showReference}>
              <figcaption><strong>No-control reference</strong><span>same starting flow · same step</span></figcaption>
              <div className="hl-cylinder-canvas-wrap">
                <canvas ref={referenceCanvasRef} width={1080} height={456} aria-label="Synchronized vorticity field with jets disabled" />
              </div>
            </figure>
          </div>
          <div className="hl-vorticity-key"><span>−0.045</span><i /><span>+0.045</span><small>vorticity · shared lattice scale</small></div>
          <div className="hl-sandbox-quick-guide">
            <span><b>01</b> Choose a controller</span><span><b>02</b> Start at 7,000</span><span><b>03</b> Compare the wake and reward</span>
          </div>
          <div className="hl-cylinder-metrics">
            <div><span>Jet command</span><strong>{stats.action.toFixed(2)}</strong></div>
            <div className="is-reward">
              <span>Instant reward</span>
              <strong>{stats.rewardSteps ? formatSigned(stats.reward, 4) : "···"}</strong>
            </div>
            <div className="is-mean-reward">
              <span>Control mean / step</span>
              <strong>{stats.rewardSteps ? formatSigned(stats.meanReward, 4) : "···"}</strong>
              <small>{stats.rewardSteps.toLocaleString()} control samples · ref drag {stats.referenceDrag.toFixed(2)}</small>
            </div>
            <div><span>Drag proxy</span><strong>{stats.drag.toFixed(2)}</strong></div>
            <div><span>Lift proxy</span><strong>{stats.lift.toFixed(2)}</strong></div>
            <div><span>Mean improvement vs no control</span><strong>{stats.rewardSteps ? formatSigned(stats.meanReward - stats.referenceMeanReward, 4) : "···"}</strong><small>reference mean {stats.rewardSteps ? formatSigned(stats.referenceMeanReward, 4) : "···"}</small></div>
          </div>
          <RewardHistory history={history} endStep={historyEndStep} />
        </div>

        <aside className="hl-cylinder-controls">
          <div className="hl-solver-status"><i /> STEP {String(stats.steps).padStart(6, "0")} · NOMINAL RE {reynoldsProxy}</div>
          <h3>{mode === "heuristic" ? "Lift-proxy feedback" : mode === "manual" ? "Manual jet control" : mode === "periodic" ? "Open-loop forcing" : "Uncontrolled wake"}</h3>

          <div className={`hl-challenge-card is-${challengeState}`}>
            <div className="hl-challenge-header">
              <span>{!prepared ? "Preparing uncontrolled wake" : challengeState === "running" ? running ? "Scored run live" : "Scored run paused" : challengeState === "complete" ? "Run complete" : challengeState === "saved" ? "Run saved" : stats.rewardSteps > 0 ? "Unscored preview" : "Ready at step 7,000"}</span>
              <b>7,000–8,500</b>
            </div>
            <div className="hl-challenge-score">
              <strong>{prepared ? formatSigned(displayedScore, 4) : "···"}</strong>
              <span>{!prepared ? "warm-up excluded from reward" : challengeState === "idle" && stats.rewardSteps > 0 ? "preview mean reward" : "control-window mean reward"}</span>
            </div>
            <div className="hl-challenge-progress-copy">
              <span>{progressSteps.toLocaleString()} / {progressTotal.toLocaleString()} {prepared ? "controlled" : "warm-up"}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div
              className="hl-challenge-progress"
              role="progressbar"
              aria-label={prepared ? "Scored run progress" : "Uncontrolled warm-up progress"}
              aria-valuemin={0}
              aria-valuemax={progressTotal}
              aria-valuenow={progressSteps}
            >
              <i style={{ width: `${progress * 100}%` }} />
            </div>

            {(challengeState === "idle" || challengeState === "saved") && (
              <button type="button" className="hl-start-run" disabled={!prepared} onClick={startScoredRun}>
                <Play size={14} /> {!prepared ? "Preparing wake…" : challengeState === "saved" ? "Run again from 7,000" : "Start scored run"}
              </button>
            )}
            <p className="hl-challenge-note">
              {!prepared
                ? "Building the starting flow with jets off. Control will wait for you at step 7,000."
                : "Scored runs restore the same uncontrolled checkpoint and stop at 8,500. Only the next 1,500 steps count."}
            </p>
            {challengeState === "running" && (
              <p className="hl-challenge-note">
                {mode === "manual"
                  ? "Human control is live. Hold ↑ or ↓ to actuate; release to return to zero."
                  : "Settings are locked for this run. Pause and resume without losing progress."}
              </p>
            )}
            {challengeState === "complete" && (
              <form className="hl-challenge-submit" onSubmit={recordRun}>
                <label>
                  <span>Run by</span>
                  <input
                    type="text"
                    maxLength={18}
                    value={pilotName}
                    placeholder="Guest"
                    onChange={(event) => setPilotName(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={!canRecordRun}>
                  <Trophy size={14} /> {storageStatus === "saving" ? "Saving…" : storageStatus === "error" ? "Retry save" : "Save score"}
                </button>
              </form>
            )}
            {challengeState === "saved" && (
              <p className="hl-challenge-note is-saved"><Trophy size={13} /> Saved to this device.</p>
            )}
            {storageStatus === "error" && <p className="hl-challenge-note is-error">Local storage could not be reached. Your completed score stays here so you can retry.</p>}
            {stats.numericalCorrections > 0 && <p className="hl-challenge-note is-error" role="alert">Numerical corrections were needed in this flow. This run is excluded from the leaderboard; reset or lower Reynolds to retry.</p>}
          </div>

          <p className="hl-controller-help">
            {mode === "manual"
              ? "Hold ↑ or ↓ while focused in this sandbox, or use the touch controls below. Keyboard control remains live during a scored run."
              : "Set the controller first, then start a scored run. Positive and negative commands reverse the paired jets."}
          </p>

          {mode === "manual" && (
            <>
              <div className="hl-keyboard-jet" aria-label="Manual keyboard controls">
                <button
                  type="button"
                  className={manual === 1 ? "is-active" : ""}
                  aria-pressed={manual === 1}
                  disabled={!prepared || challengeState === "complete"}
                  onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); sandboxRef.current?.focus({ preventScroll: true }); setManualCommand(1); }}
                  onPointerUp={() => setManualCommand(0)}
                  onPointerCancel={() => setManualCommand(0)}
                  onLostPointerCapture={() => setManualCommand(0)}
                >
                  <kbd>↑</kbd><span>hold · + jet</span>
                </button>
                <button
                  type="button"
                  className={manual === -1 ? "is-active" : ""}
                  aria-pressed={manual === -1}
                  disabled={!prepared || challengeState === "complete"}
                  onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); sandboxRef.current?.focus({ preventScroll: true }); setManualCommand(-1); }}
                  onPointerUp={() => setManualCommand(0)}
                  onPointerCancel={() => setManualCommand(0)}
                  onLostPointerCapture={() => setManualCommand(0)}
                >
                  <kbd>↓</kbd><span>hold · − jet</span>
                </button>
                <small>Both arrows together cancel. Release all arrows to center. Space zeros the jets when the sandbox has focus.</small>
              </div>
              <label className="hl-slider">
                <span><b>Jet command</b><output>{manual.toFixed(2)}</output></span>
                <input type="range" min={-1} max={1} step={0.01} value={manual} disabled={!prepared || challengeState === "complete"} onChange={(event) => setManualCommand(Number(event.target.value))} />
              </label>
              <div className="hl-manual-presets" aria-label="Manual jet presets">
                {[-1, 0, 1].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={manual === value ? "is-active" : ""}
                    disabled={!prepared || challengeState === "complete"}
                    onClick={() => setManualCommand(value)}
                  >
                    {value === 0 ? "Jets off" : `Jet ${value > 0 ? "+" : "−"}1`}
                  </button>
                ))}
              </div>
            </>
          )}
          {mode === "heuristic" && (
            <label className="hl-slider">
              <span><b>Feedback gain</b><output>{gain.toFixed(2)}</output></span>
              <input type="range" min={0} max={3} step={0.05} value={gain} disabled={controlsLocked} onChange={(event) => setGain(Number(event.target.value))} />
            </label>
          )}
          {mode === "periodic" && (
            <label className="hl-slider">
              <span><b>Forcing frequency</b><output>{frequency.toFixed(2)}</output></span>
              <input type="range" min={0.1} max={2.5} step={0.05} value={frequency} disabled={controlsLocked} onChange={(event) => setFrequency(Number(event.target.value))} />
            </label>
          )}
          <label className="hl-slider">
            <span><b>Nominal Reynolds number</b><output>{reynoldsProxy}</output></span>
            <input type="range" min={MIN_REYNOLDS} max={MAX_REYNOLDS} step={1} value={reynoldsProxy} disabled={controlsLocked} onChange={(event) => {
              setInlet(inletForReynolds(Number(event.target.value)));
              setPrepared(false);
              resetSandbox();
            }} />
          </label>
          <p className="hl-controller-help">
            Re {DEFAULT_REYNOLDS} by default · inlet {inlet.toFixed(3)} · viscosity {LATTICE_VISCOSITY.toFixed(3)}.
            {" "}Each Reynolds setting gets its own 7,000-step uncontrolled warm-up. Reset reuses its cached starting flow.
            {" "}Preview allows free exploration beyond the scored window.
            {" "}Computation rests while the sandbox is off screen or the tab is hidden.
          </p>

          <details className="hl-score-details">
            <summary>Controller and reward equations</summary>
            <div className="hl-live-code">
              {modeCode.map((line) => <code key={line}>{line}</code>)}
              <code>reward = drag_ref − drag − 0.04|lift| − 0.05 command²</code>
              <code>control_step = step − 7000; scored mean uses steps 7001…8500</code>
            </div>
            <p className="hl-controller-help">Drag and lift are smoothed momentum-exchange proxies measured on the cylinder. The zero-control reward can be negative because lift is still penalized. These values have no validated Cd or Cl interpretation.</p>
          </details>
        </aside>
      </div>

      <section className="hl-sandbox-leaderboard" aria-labelledby="sandbox-leaderboard-title">
        <div className="hl-leaderboard-intro">
          <div className="hl-leaderboard-kicker"><Database size={14} /> IndexedDB · this device</div>
          <h3 id="sandbox-leaderboard-title">Sandbox leaderboard</h3>
          <p>
            Showing Re {reynoldsProxy}: {SCORED_RUN_STEPS.toLocaleString()} controlled steps from the same step-7,000 checkpoint. Scores persist on this device. This board uses the corrected cylinder-only force measurement; earlier scores remain in storage.
          </p>
          <small>LOCAL DEMO SCORE · NON-COMPARABLE WITH FLUIDGYM</small>
        </div>

        <div className="hl-leaderboard-table-wrap">
          {leaderboardEntries.length > 0 ? (
            <table className="hl-leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Run by</th>
                  <th>Controller</th>
                  <th>Mean reward</th>
                  <th>Window</th>
                  <th>Re</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{String(index + 1).padStart(2, "0")}</td>
                    <td>{entry.pilot}</td>
                    <td><strong>{MODES.find((item) => item.id === entry.mode)?.label ?? entry.mode}</strong><small>{entry.detail}</small></td>
                    <td>{formatSigned(entry.meanReward, 4)}</td>
                    <td>{entry.startStep.toLocaleString()}–{entry.endStep.toLocaleString()}</td>
                    <td>{entry.reynoldsProxy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="hl-leaderboard-empty">
              <Trophy size={24} />
              <strong>No recorded runs yet.</strong>
              <span>Complete a 7,000–8,500 run at Re {reynoldsProxy} to enter this board.</span>
            </div>
          )}
        </div>
      </section>
    </section>
  );
};

export default CylinderJetSandbox;
