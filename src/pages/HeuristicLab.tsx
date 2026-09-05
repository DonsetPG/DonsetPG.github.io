import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  FlaskConical,
  Github,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

import cylinderVideo from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/cylinder_jet_2d_easy__policy_rows.mp4";
import tcfVideo from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/tcf_small_3d_both_easy__policy_rows.mp4";
import shkadovGif from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/shkadov.gif";
import lorenzGif from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/lorenz.gif";
import cylinderPlot from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/per-env/CylinderJet2D-easy-v0_all_methods.png";
import tcfPlot from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/per-env/TCFSmall3D-both-easy-v0_all_methods.png";
import shkadovPlot from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/per-env/shkadov-v0_all_methods.png";
import lorenzPlot from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/per-env/lorenz-v0_all_methods.png";
import transferPlot from "@/assets/imgs/2026-05-15-heuristic-learning-for-fluid-dynamics-a-case-study/10jets.png";
import gnnCylinderVideo from "@/assets/imgs/hiverge-gnn-gallery/cylinder-predictions-web.mp4";
import gnnBezierVideo from "@/assets/imgs/hiverge-gnn-gallery/bezier-predictions-web.mp4";
import gnnPlateVideo from "@/assets/imgs/hiverge-gnn-gallery/plate-predictions-web.mp4";
import aneurysmFlowWss from "@/assets/imgs/hiverge-gnn-gallery/aneurysm-flow-wss.png";

import CylinderJetSandbox from "./CylinderJetSandbox";
import "./HeuristicLab.css";

type EnvironmentId = "cylinder" | "tcf" | "shkadov" | "lorenz";

type EnvironmentRecord = {
  id: EnvironmentId;
  shortName: string;
  eyebrow: string;
  title: string;
  finding: string;
  metricLabel: string;
  heuristicScore: string;
  drlScore: string;
  drlLabel: string;
  evidence: string;
  mode: "Recorded experiment" | "Browser simulation";
  mediaType: "video" | "image";
  media: string;
  plot: string;
  code: string[];
  explanation: string;
};

type GnnClipId = "cylinder" | "bezier" | "plate" | "aneurysm";

type GnnClip = {
  id: GnnClipId;
  label: string;
  dimension: string;
  title: string;
  description: string;
  kind: "video" | "image";
  media: string;
  truth: string;
};

const GNN_CLIPS: GnnClip[] = [
  {
    id: "cylinder",
    label: "Cylinder",
    dimension: "2D rollout",
    title: "A learned simulator rolls the wake forward on an unstructured mesh.",
    description: "Stored prediction video from the earlier multigrid-GNN work. Use it to explain autoregressive rollout and wake error accumulation.",
    kind: "video",
    media: gnnCylinderVideo,
    truth: "Existing trained-model prediction · recovered from the 2024 GNN article",
  },
  {
    id: "bezier",
    label: "Bezier family",
    dimension: "2D geometry shift",
    title: "One model faces several geometries instead of one canonical obstacle.",
    description: "The multi-geometry replay makes the generalization problem visible: topology and boundary shape change while the model must preserve the flow dynamics.",
    kind: "video",
    media: gnnBezierVideo,
    truth: "Existing trained-model prediction · recovered from the 2024 GNN article",
  },
  {
    id: "plate",
    label: "Plate",
    dimension: "Mesh dynamics",
    title: "A deforming mesh shows that the representation travels beyond fixed CFD domains.",
    description: "This stored learned-rollout clip broadens the story from a fixed Eulerian wake to physical dynamics carried by a moving mesh.",
    kind: "video",
    media: gnnPlateVideo,
    truth: "Existing trained-model prediction · recovered from the 2024 GNN article",
  },
  {
    id: "aneurysm",
    label: "Aneurysm",
    dimension: "3D validation still",
    title: "Aneurysm flow and wall-shear stress, compared against CFD.",
    description: "Three aneurysm examples compare predicted flow, spatial error, and wall-shear-stress curves. A dedicated 2D/3D rollout export still needs to be rendered from the saved model outputs.",
    kind: "image",
    media: aneurysmFlowWss,
    truth: "Static paper figure · dedicated aneurysm rollout video pending",
  },
];

const ENVIRONMENTS: EnvironmentRecord[] = [
  {
    id: "cylinder",
    shortName: "Cylinder · 2D",
    eyebrow: "Wake control · synthetic jets",
    title: "A readable controller suppresses the wake with one explicit feedback law.",
    finding: "The heuristic beats PPO and approaches SAC while exposing the lift proxy and derivative correction it uses.",
    metricLabel: "Mean reward",
    heuristicScore: "−0.124",
    drlScore: "+0.0005",
    drlLabel: "best DRL · SAC",
    evidence: "Best heuristic at 27,760 of 50,000 allowed environment steps",
    mode: "Recorded experiment",
    mediaType: "video",
    media: cylinderVideo,
    plot: cylinderPlot,
    code: [
      "s = clip(b + w · observation, −1, 1)",
      "Δs = s − previous_lift_proxy",
      "control = s + 1.45 × Δs",
      "action = clip(−0.19925 × control, −1, 1)",
    ],
    explanation: "The program stays small enough to inspect. Its gap to SAC motivates targeted tests of the representation and the search budget.",
  },
  {
    id: "tcf",
    shortName: "Channel · 3D",
    eyebrow: "Turbulent channel · both walls",
    title: "The agent keeps the wall geometry alive instead of crushing it into a scalar.",
    finding: "Local normalized wall feedback reaches roughly 40% drag reduction, versus roughly 30% for the strongest DRL baseline.",
    metricLabel: "Normalized score",
    heuristicScore: "0.307",
    drlScore: "0.224",
    drlLabel: "best DRL · MA-PPO",
    evidence: "Best heuristic at 92,800 of 100,000 allowed environment steps",
    mode: "Recorded experiment",
    mediaType: "video",
    media: tcfVideo,
    plot: tcfPlot,
    code: [
      "û, v̂ = normalize_per_wall(u, v)",
      "signal = −0.263671875 × v̂ + 0.2109375 × û",
      "signal = nearest_neighbor_smooth(signal)",
      "action = clip(signal − mean_per_wall(signal), −0.30, 0.30)",
    ],
    explanation: "Ablations punish removing normalization, the streamwise residual, smoothing, or the mean-free projection. The code doubles as a physical hypothesis.",
  },
  {
    id: "shkadov",
    shortName: "Falling film",
    eyebrow: "Convective instability · 5 jets",
    title: "Eleven steps of memory become a crude advective clock.",
    finding: "The agent combines mean, slope, curvature, and endpoint deviation, then waits for the disturbance to reach the actuator.",
    metricLabel: "Episode score",
    heuristicScore: "−0.367",
    drlScore: "−0.409",
    drlLabel: "best DRL · PPO",
    evidence: "Stable score across stress seeds; higher is better",
    mode: "Recorded experiment",
    mediaType: "image",
    media: shkadovGif,
    plot: shkadovPlot,
    code: [
      "shape = mean − 0.585×slope + 0.922×curvature − 0.228×last",
      "delayed = history[t − 11]",
      "raw = −0.3475 × delayed × 0.95ʲ + 0.0264",
      "action = 0.16 × clip(raw) + 0.84 × previous_action",
    ],
    explanation: "Transfer to 10 jets preserves the feature spine. The agent mainly edits delay, gain, smoothing, and actuator taper, leaving an auditable diff.",
  },
  {
    id: "lorenz",
    shortName: "Lorenz",
    eyebrow: "Chaotic system · discrete forcing",
    title: "A threshold controller keeps the trajectory on the rewarded lobe.",
    finding: "The browser lab below reproduces the benchmark equations, reward, and discovered controller. Its parameters are genuinely recomputed locally.",
    metricLabel: "Rewarded steps",
    heuristicScore: "477 / 500",
    drlScore: "442 / 500",
    drlLabel: "best DRL · PPO",
    evidence: "Recorded search result; browser output varies with the controls below",
    mode: "Recorded experiment",
    mediaType: "image",
    media: lorenzGif,
    plot: lorenzPlot,
    code: [
      "score = x + 0.77297 × dx/dt",
      "if x > −6.0808: action = +1",
      "else if score > −5.8348: action = −1",
      "else: action = +1  # hold each decision for 2 steps",
    ],
    explanation: "The environment rewards every step with x < 0. A 7-line state machine reaches 477 rewarded steps in the recorded run.",
  },
];

const LSRK_A = [0, -0.417890474499852, -1.192151694642677, -1.697784692471528, -1.514183444257156];
const LSRK_B = [0.149659021999229, 0.379210312999627, 0.822955029386982, 0.699450455949122, 0.153057247968152];

type LorenzParams = {
  guardScore: number;
  recoverX: number;
  dxWeight: number;
};

type LorenzPoint = {
  t: number;
  x: number;
  y: number;
  z: number;
  action: number;
};

type LorenzRun = {
  points: LorenzPoint[];
  reward: number;
  switches: number;
};

const DEFAULT_LORENZ: LorenzParams = {
  guardScore: -5.834803246675543,
  recoverX: -6.080784226300718,
  dxWeight: 0.7729655829726069,
};

const simulateLorenz = (params: LorenzParams, controlled: boolean): LorenzRun => {
  const dt = 0.05;
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  const forcing = [-1, 0, 1];
  let state = [10, 10, 10];
  let previousDerivative = [0, 0, 0];
  let previousAction = 1;
  let hold = 0;
  let reward = 0;
  let switches = 0;
  const points: LorenzPoint[] = [{ t: 0, x: 10, y: 10, z: 10, action: 0 }];

  for (let step = 0; step < 500; step += 1) {
    let actionIndex = 1;

    if (controlled) {
      if (hold > 0) {
        hold -= 1;
        actionIndex = previousAction;
      } else {
        const policyScore = state[0] + params.dxWeight * previousDerivative[0];
        if (state[0] > params.recoverX) {
          actionIndex = 2;
        } else if (policyScore > params.guardScore) {
          actionIndex = 0;
        } else {
          actionIndex = 2;
        }
        hold = 1;
      }
    }

    if (actionIndex !== previousAction) switches += 1;
    previousAction = actionIndex;

    const scratch = [...state];
    const working = [...state];
    let stageDerivative = [...previousDerivative];

    for (let stage = 0; stage < 5; stage += 1) {
      stageDerivative = [
        sigma * (working[1] - working[0]),
        working[0] * (rho - working[2]) - working[1] + forcing[actionIndex],
        working[0] * working[1] - beta * working[2],
      ];

      for (let axis = 0; axis < 3; axis += 1) {
        scratch[axis] = LSRK_A[stage] * scratch[axis] + dt * stageDerivative[axis];
        working[axis] += LSRK_B[stage] * scratch[axis];
      }
    }

    state = working;
    previousDerivative = stageDerivative;
    if (state[0] < 0) reward += 1;
    points.push({
      t: (step + 1) * dt,
      x: state[0],
      y: state[1],
      z: state[2],
      action: forcing[actionIndex],
    });
  }

  return { points, reward, switches };
};

const linePath = (points: LorenzPoint[], key: "x" | "action", width: number, height: number) => {
  const domain = key === "x" ? [-22, 22] : [-1.2, 1.2];
  return points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const value = point[key];
      const y = height - ((value - domain[0]) / (domain[1] - domain[0])) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

const LAB_SECTIONS = [
  ["gnn-rollouts", "GNN rollouts"],
  ["policy-microscope", "Policies"],
  ["method", "Protocol"],
  ["live-benchmark", "Lorenz"],
  ["cylinder-sandbox", "Live cylinder"],
  ["transfer", "Transfer"],
  ["failure-museum", "Failures"],
  ["vision", "Vision"],
] as const;

type EvidenceImage = { src: string; title: string; caption: string };

const ResearchVideo = ({ src, label, playbackEnabled }: { src: string; label: string; playbackEnabled: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && playbackEnabled) {
        void video.play().catch(() => { /* Native controls remain available if autoplay is blocked. */ });
      } else {
        video.pause();
      }
    }, { threshold: 0.2 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [src, playbackEnabled]);

  return (
    <video ref={videoRef} src={src} muted loop playsInline controls preload="metadata" aria-label={label}>
      Your browser cannot play this video. <a href={src}>Open the recorded rollout.</a>
    </video>
  );
};

const moveTab = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number, ids: readonly string[], select: (index: number) => void) => {
  const directions: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
  let nextIndex: number;
  if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = ids.length - 1;
  else if (event.key in directions) nextIndex = (currentIndex + directions[event.key] + ids.length) % ids.length;
  else return;
  event.preventDefault();
  select(nextIndex);
  document.getElementById(ids[nextIndex])?.focus();
};

const Metric = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
  <div className={`hl-metric ${accent ? "is-accent" : ""}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const HeuristicLab = () => {
  const [selectedId, setSelectedId] = useState<EnvironmentId>("cylinder");
  const [selectedGnnId, setSelectedGnnId] = useState<GnnClipId>("cylinder");
  const [activeSection, setActiveSection] = useState<string>("");
  const [evidenceImage, setEvidenceImage] = useState<EvidenceImage | null>(null);
  const [mediaPaused, setMediaPaused] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const evidenceDialogRef = useRef<HTMLDialogElement>(null);
  const evidenceTriggerRef = useRef<HTMLElement | null>(null);
  const sectionNavRef = useRef<HTMLElement>(null);
  const [lorenzParams, setLorenzParams] = useState<LorenzParams>(DEFAULT_LORENZ);

  const selected = ENVIRONMENTS.find((environment) => environment.id === selectedId) ?? ENVIRONMENTS[0];
  const selectedGnn = GNN_CLIPS.find((clip) => clip.id === selectedGnnId) ?? GNN_CLIPS[0];
  const lorenzRun = useMemo(() => simulateLorenz(lorenzParams, true), [lorenzParams]);
  const lorenzBaseline = useMemo(() => simulateLorenz(DEFAULT_LORENZ, false), []);
  const xPath = useMemo(() => linePath(lorenzRun.points, "x", 780, 210), [lorenzRun]);
  const baselinePath = useMemo(() => linePath(lorenzBaseline.points, "x", 780, 210), [lorenzBaseline]);
  const actionPath = useMemo(() => linePath(lorenzRun.points, "action", 780, 58), [lorenzRun]);

  useEffect(() => {
    let frame = 0;
    const updateSection = () => {
      frame = 0;
      let current = "";
      for (const [id] of LAB_SECTIONS) {
        if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 160) current = id;
      }
      setActiveSection(current);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(updateSection); };
    updateSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const nav = sectionNavRef.current;
    const activeLink = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !activeLink) return;
    const inset = 18;
    if (activeLink.offsetLeft < nav.scrollLeft + inset) nav.scrollLeft = activeLink.offsetLeft - inset;
    else if (activeLink.offsetLeft + activeLink.offsetWidth > nav.scrollLeft + nav.clientWidth - inset) {
      nav.scrollLeft = activeLink.offsetLeft + activeLink.offsetWidth - nav.clientWidth + inset;
    }
  }, [activeSection]);

  useEffect(() => {
    const dialog = evidenceDialogRef.current;
    if (!evidenceImage || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      evidenceTriggerRef.current?.focus({ preventScroll: true });
    };
  }, [evidenceImage]);

  const openEvidence = (image: EvidenceImage) => {
    evidenceTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEvidenceImage(image);
  };

  const updateLorenz = (key: keyof LorenzParams, value: number) => {
    setLorenzParams((current) => ({ ...current, [key]: value }));
  };

  const scrollToSection = (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="heuristic-lab-page" data-motion={mediaPaused ? "paused" : "playing"}>
      <a className="hl-skip-link" href="#/labs/heuristic-learning" onClick={scrollToSection("hl-main")}>Skip to research</a>
      <div className="hl-noise" aria-hidden="true" />

      <header className="hl-header">
        <a href="/#/" className="hl-wordmark">
          PG<span>/</span>LAB
        </a>
        <span className="hl-header-context">Science you can inspect. Experiments you can run.</span>
        <a className="hl-paper-link" href="https://arxiv.org/abs/2607.11565" target="_blank" rel="noreferrer">
          arXiv 2607.11565 <ArrowDownRight size={15} />
        </a>
      </header>

      <nav className="hl-section-nav" aria-label="Explore the research companion" ref={sectionNavRef}>
        {LAB_SECTIONS.map(([id, label], index) => (
          <a key={id} href="#/labs/heuristic-learning" onClick={scrollToSection(id)} aria-current={activeSection === id ? "location" : undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span>{label}
          </a>
        ))}
      </nav>

      <main id="hl-main">
        <section className="hl-hero">
          <div className="hl-hero-copy">
            <div className="hl-kicker"><span>Research companion</span><span>July 2026</span></div>
            <h1>When agents write the <em>control law.</em></h1>
            <p>
              Coding agents search over explicit feedback programs, test them in fluid simulators, learn from failure,
              and return controllers a scientist can inspect.
            </p>
            <div className="hl-hero-actions">
              <a href="#/labs/heuristic-learning" onClick={scrollToSection("cylinder-sandbox")} className="hl-primary-action">Run the cylinder solver <ChevronRight size={18} /></a>
              <a href="#/labs/heuristic-learning" onClick={scrollToSection("gnn-rollouts")} className="hl-secondary-action">Watch the GNNs</a>
              <a href="#/labs/heuristic-learning" onClick={scrollToSection("method")} className="hl-secondary-action">See the protocol</a>
            </div>
          </div>

          <div className="hl-hero-evidence" aria-label="Benchmark scope and reported results">
            <div className="hl-result-stamp">
              <span>Benchmark environments</span>
              <strong>13<span> tasks</span></strong>
              <small>1D to 3D · explicit controllers</small>
            </div>
            <div className="hl-evidence-note">
              <BookOpen size={21} />
              <p>The paper reports matches or wins on 10 of 13. Archived scores and plotting substitutions need reconciliation for RBC medium and BEACON Rayleigh.</p>
            </div>
          </div>
        </section>

        <section className="hl-marquee" aria-label="Research properties">
          <div>
            <span>EXPLICIT PYTHON</span><i />
            <span>FIXED SIMULATOR BUDGET</span><i />
            <span>FAILURE MEMORY</span><i />
            <span>PHYSICAL ABLATIONS</span><i />
            <span>HELD-OUT VALIDATION</span>
          </div>
        </section>

        <aside className="hl-quick-route" aria-label="A short route through the research">
          <div><span>3-minute route</span><p>Watch a model. Inspect a policy. Take control.</p></div>
          <a href="#/labs/heuristic-learning" onClick={scrollToSection("gnn-rollouts")}><span>01</span> Watch a GNN <ChevronRight size={15} /></a>
          <a href="#/labs/heuristic-learning" onClick={scrollToSection("policy-microscope")}><span>02</span> Read the policy <ChevronRight size={15} /></a>
          <a href="#/labs/heuristic-learning" onClick={scrollToSection("cylinder-sandbox")}><span>03</span> Control the wake <ChevronRight size={15} /></a>
        </aside>

        <section className="hl-gnn-gallery" id="gnn-rollouts">
          <div className="hl-section-heading">
            <div>
              <span className="hl-section-index">01</span>
              <p>Learned physics rollouts</p>
            </div>
            <h2>Before the control law, the models had to learn how physical state moves across a mesh.</h2>
          </div>

          <div className="hl-media-preferences">
            <p>Recorded model predictions and validation figures</p>
            <button type="button" aria-pressed={mediaPaused} onClick={() => setMediaPaused((paused) => !paused)}>
              {mediaPaused ? <Play size={14} /> : <Pause size={14} />}
              {mediaPaused ? "Enable motion" : "Pause motion"}
            </button>
          </div>

          <div className="hl-gnn-selector" role="tablist" aria-label="Select a trained-model artifact">
            {GNN_CLIPS.map((clip, index) => (
              <button
                key={clip.id}
                type="button"
                role="tab"
                id={`hl-gnn-tab-${clip.id}`}
                aria-controls="hl-gnn-panel"
                tabIndex={selectedGnn.id === clip.id ? 0 : -1}
                aria-selected={selectedGnn.id === clip.id}
                onKeyDown={(event) => moveTab(event, index, GNN_CLIPS.map((item) => `hl-gnn-tab-${item.id}`), (next) => setSelectedGnnId(GNN_CLIPS[next].id))}
                className={selectedGnn.id === clip.id ? "is-active" : ""}
                onClick={() => setSelectedGnnId(clip.id)}
              >
                <span>{clip.label}</span>
                <small>{clip.dimension}</small>
              </button>
            ))}
          </div>

          <article className="hl-gnn-viewer" id="hl-gnn-panel" role="tabpanel" aria-labelledby={`hl-gnn-tab-${selectedGnn.id}`} tabIndex={0} key={selectedGnn.id}>
            <div className="hl-gnn-media">
              {selectedGnn.kind === "video" ? (
                <ResearchVideo src={selectedGnn.media} label={`${selectedGnn.label}: ${selectedGnn.description}`} playbackEnabled={!mediaPaused} />
              ) : (
                <button className="hl-image-expand" type="button" onClick={() => openEvidence({ src: selectedGnn.media, title: "Aneurysm GNN validation", caption: "Static paper figure comparing predicted flow, spatial error, and wall-shear stress. A dedicated rollout video is still pending." })}>
                  <img src={selectedGnn.media} alt="Aneurysm GNN flow, error, and wall-shear-stress validation" loading="lazy" />
                  <span><Maximize2 size={15} /> Enlarge validation figure</span>
                </button>
              )}
              <p className="hl-media-provenance">{selectedGnn.truth}</p>
            </div>
            <div className="hl-gnn-copy">
              <span>{selectedGnn.dimension}</span>
              <h3>{selectedGnn.title}</h3>
              <p>{selectedGnn.description}</p>
              <div>
                <b>What to inspect</b>
                <p>{selectedGnn.id === "aneurysm" ? "Field structure, boundary error, and whether WSS follows the CFD curve." : "Wake phase, geometry response, and the point where autoregressive error begins to compound."}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="hl-microscope" id="policy-microscope">
          <div className="hl-section-heading">
            <div>
              <span className="hl-section-index">02</span>
              <p>Policy microscope</p>
            </div>
            <h2>The result stays connected to the code that produced it.</h2>
          </div>

          <details className="hl-score-context">
            <summary>What these scores compare</summary>
            <p>Search uses public interfaces and explicit simulator-step caps. Results shown combine selected heuristic runs with reported DRL references; total compute cost and held-out evaluation are separate checks. The aggregate paper headline still needs reconciliation for RBC medium and BEACON Rayleigh.</p>
          </details>

          <div className="hl-environment-tabs" role="tablist" aria-label="Select an environment">
            {ENVIRONMENTS.map((environment, index) => (
              <button
                key={environment.id}
                type="button"
                role="tab"
                id={`hl-policy-tab-${environment.id}`}
                aria-controls="hl-policy-panel"
                tabIndex={selectedId === environment.id ? 0 : -1}
                aria-selected={selectedId === environment.id}
                onKeyDown={(event) => moveTab(event, index, ENVIRONMENTS.map((item) => `hl-policy-tab-${item.id}`), (next) => setSelectedId(ENVIRONMENTS[next].id))}
                className={selectedId === environment.id ? "is-active" : ""}
                onClick={() => {
                  setSelectedId(environment.id);
                }}
              >
                <span>{environment.shortName}</span>
                <small>{environment.mode}</small>
              </button>
            ))}
          </div>

          <article className="hl-instrument" id="hl-policy-panel" role="tabpanel" aria-labelledby={`hl-policy-tab-${selected.id}`} tabIndex={0} key={selected.id}>
            <div className="hl-media-console">
              <div className="hl-console-bar">
                <span><i /> RECORDED EXPERIMENT</span>
                <button type="button" onClick={() => openEvidence({ src: selected.plot, title: `${selected.shortName}: method comparison`, caption: `${selected.metricLabel}. Higher is better. ${selected.evidence}. Source: recorded paper artifact.` })}>
                  Compare methods <Maximize2 size={13} />
                </button>
              </div>
              <div className={`hl-media-stage ${mediaPaused && selected.mediaType === "image" ? "shows-plot" : ""}`}>
                {selected.mediaType === "video" ? (
                  <ResearchVideo key={selected.media} src={selected.media} label={`${selected.shortName} recorded policy comparison`} playbackEnabled={!mediaPaused} />
                ) : (
                  <img src={mediaPaused ? selected.plot : selected.media} alt={mediaPaused ? `${selected.shortName} method comparison shown while motion is paused` : `${selected.shortName} controlled-system replay`} loading="lazy" />
                )}
              </div>
              <div className="hl-console-caption">
                <span>{selected.eyebrow}</span>
                <span>{mediaPaused && selected.mediaType === "image" ? "Motion paused · evidence still" : "Source: stored paper artifact"}</span>
              </div>
            </div>

            <div className="hl-policy-console">
              <div className="hl-policy-header">
                <span>Policy pseudocode</span>
                <span className="hl-mode-badge">{selected.mode}</span>
              </div>
              <div className="hl-code" aria-label={`${selected.shortName} policy pseudocode`}>
                <div className="hl-code-line"><span>01</span><code>def act(observation, memory):</code></div>
                {selected.code.map((line, index) => (
                  <div className={`hl-code-line ${index === 1 ? "is-highlighted" : ""}`} key={line}>
                    <span>{String(index + 2).padStart(2, "0")}</span><code>{`    ${line}`}</code>
                  </div>
                ))}
                <div className="hl-code-line"><span>{String(selected.code.length + 2).padStart(2, "0")}</span><code>    return action, memory</code></div>
              </div>

              <div className="hl-policy-summary">
                <span>{selected.eyebrow}</span>
                <h3>{selected.title}</h3>
                <p>{selected.finding}</p>
              </div>

              <div className="hl-score-heading"><span>{selected.metricLabel}</span><span>Higher is better</span></div>
              <div className="hl-score-grid">
                <Metric label="Heuristic" value={selected.heuristicScore} accent />
                <Metric label={selected.drlLabel} value={selected.drlScore} />
              </div>
              <div className="hl-evidence-strip"><Check size={15} /> {selected.evidence}</div>
              <p className="hl-interpretation">{selected.explanation}</p>
              {selected.id === "lorenz" && <a className="hl-policy-run-link" href="#/labs/heuristic-learning" onClick={scrollToSection("live-benchmark")}>Edit this controller live <ChevronRight size={15} /></a>}
            </div>
          </article>
        </section>

        <section className="hl-method" id="method">
          <div className="hl-section-heading is-light">
            <div>
              <span className="hl-section-index">03</span>
              <p>Search protocol</p>
            </div>
            <h2>Each candidate has to survive the simulator and leave evidence behind.</h2>
          </div>
          <div className="hl-method-track">
            {[
              ["01", "Inspect", "Public interface, constraints, reward, horizon"],
              ["02", "Propose", "Executable controller with bounded authority"],
              ["03", "Evaluate", "Deterministic rollouts charged to one budget"],
              ["04", "Remember", "Scores, traces, failures, plots, rejected ideas"],
              ["05", "Simplify", "Ablate, transfer, stress-test, keep the readable core"],
            ].map(([index, title, description]) => (
              <div className="hl-method-step" key={index}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="hl-live" id="live-benchmark">
          <div className="hl-section-heading">
            <div>
              <span className="hl-section-index">04</span>
              <p>Live benchmark</p>
            </div>
            <h2>Edit the discovered Lorenz controller. The equations rerun in your browser.</h2>
          </div>

          <div className="hl-live-grid">
            <div className="hl-control-panel">
              <div className="hl-live-status"><i /> BEACON equations · local 5-stage RK4 · 500 steps</div>
              <p>
                Reward equals 1 whenever <code>x &lt; 0</code>. The agent found a threshold state machine using only the public state and derivative.
              </p>

              {([
                ["guardScore", "Guard score", -10, 1, 0.1],
                ["recoverX", "Recovery threshold x", -12, 1, 0.1],
                ["dxWeight", "Derivative weight", 0, 2, 0.01],
              ] as const).map(([key, label, min, max, step]) => (
                <label className="hl-slider" key={key}>
                  <span><b>{label}</b><output>{lorenzParams[key].toFixed(2)}</output></span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    aria-label={label}
                    aria-valuetext={lorenzParams[key].toFixed(2)}
                    value={lorenzParams[key]}
                    onChange={(event) => updateLorenz(key, Number(event.target.value))}
                  />
                </label>
              ))}

              <button className="hl-reset" type="button" onClick={() => setLorenzParams(DEFAULT_LORENZ)}>
                <RotateCcw size={15} /> Restore discovered policy
              </button>

              <div className="hl-live-code">
                <code>q = x + {lorenzParams.dxWeight.toFixed(2)} × dx</code>
                <code>if x &gt; {lorenzParams.recoverX.toFixed(2)}: force = +1</code>
                <code>elif q &gt; {lorenzParams.guardScore.toFixed(2)}: force = −1</code>
              </div>
            </div>

            <div className="hl-chart-panel">
              <div className="hl-chart-header">
                <div>
                  <span>Rewarded steps · {(lorenzRun.reward / 5).toFixed(1)}%</span>
                  <strong>{lorenzRun.reward}<small>/500</small></strong>
                </div>
                <div>
                  <span>No-control reference</span>
                  <strong>{lorenzBaseline.reward}<small>/500</small></strong>
                </div>
                <div>
                  <span>Action switches</span>
                  <strong>{lorenzRun.switches}</strong>
                </div>
              </div>
              <div className="hl-svg-wrap">
                <svg viewBox="0 0 780 300" role="img" aria-label={`Lorenz trajectory over 25 seconds. Edited heuristic earns ${lorenzRun.reward} rewarded steps out of 500; no control earns ${lorenzBaseline.reward}. The lower trace shows the applied force.`}>
                  <defs>
                    <linearGradient id="rewardZone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#58e5ee" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#58e5ee" stopOpacity="0.18" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="105" width="780" height="105" fill="url(#rewardZone)" />
                  {[0, 5, 10, 15, 20, 25].map((tick) => <line key={tick} x1={(tick / 25) * 780} x2={(tick / 25) * 780} y1="0" y2="210" className="hl-grid-line" />)}
                  <line x1="0" x2="780" y1="105" y2="105" className="hl-zero-line" />
                  <path d={baselinePath} className="hl-baseline-path" />
                  <path d={xPath} className="hl-control-path" />
                  <text x="12" y="128" className="hl-zone-label">REWARDED REGION · x &lt; 0</text>
                  <text x="2" y="229" className="hl-axis-label">force</text>
                  <g transform="translate(0 237)"><path d={actionPath} className="hl-action-path" /></g>
                  <text x="748" y="296" className="hl-axis-label">25 s</text>
                </svg>
              </div>
              <div className="hl-chart-legend"><span><i className="controlled" /> edited heuristic</span><span><i className="baseline" /> no control</span></div>
            </div>
          </div>
        </section>

        <CylinderJetSandbox />

        <section className="hl-transfer" id="transfer">
          <div className="hl-transfer-copy">
            <span className="hl-section-index">06</span>
            <p>Transfer as a code diff</p>
            <h2>Five jets become ten. Four constants move.</h2>
            <p className="hl-transfer-lead">
              The 10-actuator controller keeps the same mean, slope, curvature, and endpoint features. Adaptation edits the operating constants instead of retraining a hidden representation.
            </p>
            <div className="hl-diff">
              <div><span>delay</span><del>11</del><ChevronRight size={14} /><ins>8</ins></div>
              <div><span>gain</span><del>0.3475</del><ChevronRight size={14} /><ins>0.28</ins></div>
              <div><span>smoothing</span><del>0.84</del><ChevronRight size={14} /><ins>0.90</ins></div>
              <div><span>taper</span><del>0.95ʲ</del><ChevronRight size={14} /><ins>1.03ʲ</ins></div>
            </div>
          </div>
          <figure>
            <button className="hl-image-expand is-light" type="button" onClick={() => openEvidence({ src: transferPlot, title: "Transfer from 5 to 10 Shkadov jets", caption: "Recorded experiment. Roughly 500 adaptation episodes: first viable candidate at 210, selected best at 370. Each configuration is evaluated on 5 stress seeds." })}>
              <img src={transferPlot} alt="Recorded transfer from five to ten Shkadov jets" loading="lazy" />
              <span><Maximize2 size={15} /> Enlarge transfer evidence</span>
            </button>
            <figcaption>Recorded experiment · roughly 500 adaptation episodes; first viable at 210, selected best at 370. 5 stress seeds per configuration.</figcaption>
          </figure>
        </section>

        <section className="hl-failures" id="failure-museum">
          <div className="hl-section-heading is-light">
            <div>
              <span className="hl-section-index">07</span>
              <p>Failure museum</p>
            </div>
            <h2>The rejected candidates define the real scientific boundary.</h2>
          </div>

          <div className="hl-failure-grid">
            <article>
              <div className="hl-failure-mark"><X size={18} /><span>Baseline gap</span></div>
              <h3>Strong DRL baselines expose the gaps.</h3>
              <p>Cylinder and convection cases reveal gaps that still need targeted tests of representation, search, and evaluation.</p>
              <small>Decision: preserve DRL as the hard baseline.</small>
            </article>
            <article>
              <div className="hl-failure-mark"><X size={18} /><span>More data, wider search</span></div>
              <h3>Full-field diagnostics did not improve cylinder control.</h3>
              <p>The richer observation route reached −0.333, while the compact public-sensor heuristic reached −0.124. Extra information enlarged the search surface.</p>
              <small>Decision: widen inputs only with evaluator evidence.</small>
            </article>
            <article>
              <div className="hl-failure-mark"><X size={18} /><span>Reward hacking</span></div>
              <h3>The coding agent also searched for shortcuts.</h3>
              <p>It tried to inspect the simulation environment itself and hardcode environment-specific behavior. A higher reward alone could hide a broken experiment.</p>
              <small>Decision: inspect the code and tighten the harness.</small>
            </article>
          </div>

          <article className="hl-reward-audit" aria-labelledby="hl-reward-audit-title">
            <div className="hl-reward-audit-intro">
              <span className="hl-reward-audit-label">Inside the research workflow</span>
              <h3 id="hl-reward-audit-title">Reward hacking changed how we evaluated the agent.</h3>
              <p>We had to check how a candidate earned its reward. Simulator inspection and hardcoded shortcuts prompted manual review and changes to the evaluation harness.</p>
              <span className="hl-reward-audit-source">Researcher's account · Paul Garnier-Muller</span>
            </div>
            <div className="hl-reward-audit-checks">
              <ol>
                <li><span>01</span><div><h4>Manual code review</h4><p>We checked generated code for access to simulator internals and hardcoded behavior.</p></div></li>
                <li><span>02</span><div><h4>Harness updates</h4><p>We revised the evaluation harness in response to the shortcuts we found.</p></div></li>
                <li><span>03</span><div><h4>Cross-seed action-variance alarm</h4><p>We used a threshold on action variance across different seeds to flag suspiciously similar behavior for review.</p></div></li>
                <li><span>04</span><div><h4>A separate reviewer agent</h4><p>Another agent checked the candidate code, adding a second review alongside our manual checks.</p></div></li>
              </ol>
              <p className="hl-reward-audit-caveat"><strong>How to read the alarm:</strong> a valid open-loop controller can also produce similar actions across seeds. Tuned policy constants are legitimate when they respect the experiment's rules. Low variance triggers investigation; code inspection and experiment context determine whether a shortcut broke those rules. The checks reduce risk and still need human judgment.</p>
            </div>
          </article>
        </section>

        <section className="hl-vision" id="vision">
          <div className="hl-vision-title">
            <span className="hl-section-index">08</span>
            <p>Where CFD goes next</p>
            <h2>Scientific agents become experimentalists. Physics becomes an executable test suite.</h2>
          </div>
          <div className="hl-vision-list">
            {[
              ["01", "Control laws", "Feedback, schedules, actuator placement, transfer"],
              ["02", "Solver components", "Fluxes, limiters, preconditioners, kernels, mesh adaptation"],
              ["03", "Hybrid models", "Learned closures and surrogates gated by conservation and stability"],
              ["04", "Discovery systems", "Agents choose experiments, allocate fidelity, preserve failures, and return auditable artifacts"],
            ].map(([index, title, description]) => (
              <div key={index}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <ArrowDownRight size={20} />
              </div>
            ))}
          </div>
        </section>

        <section className="hl-closing">
          <div>
            <FlaskConical size={28} />
            <span>A concrete next benchmark</span>
          </div>
          <h2>One PDE family. One constrained editable surface. Property tests, held-out geometries, and a readable algorithm at the end.</h2>
          <p>
            Search should expand from controller laws into numerical kernels only as conservation, convergence, stability, runtime, and out-of-distribution gates become difficult to game.
          </p>
          <div className="hl-closing-links">
            <a href="https://arxiv.org/abs/2607.11565" target="_blank" rel="noreferrer"><BookOpen size={17} /> Read the paper</a>
            <a href="https://github.com/DonsetPG/fluid-heuristic-learning" target="_blank" rel="noreferrer"><Github size={17} /> Inspect the code</a>
            <a href="/#/blog/heuristic-learning-for-fluid-dynamics-a-case-study"><Sparkles size={17} /> Read the visual story</a>
          </div>
        </section>
      </main>

      <dialog className="hl-evidence-dialog" ref={evidenceDialogRef} aria-labelledby="hl-evidence-title" aria-describedby="hl-evidence-caption" onCancel={() => setEvidenceImage(null)} onClick={(event) => { if (event.target === event.currentTarget) setEvidenceImage(null); }}>
        {evidenceImage && <div className="hl-evidence-frame">
          <div className="hl-evidence-dialog-header">
            <div><span>Source evidence</span><h2 id="hl-evidence-title">{evidenceImage.title}</h2></div>
            <button type="button" autoFocus onClick={() => setEvidenceImage(null)} aria-label="Close evidence figure"><X size={20} /><span>Close</span></button>
          </div>
          <div className="hl-evidence-dialog-image"><img src={evidenceImage.src} alt={evidenceImage.title} /></div>
          <p id="hl-evidence-caption">{evidenceImage.caption} <a href={evidenceImage.src} target="_blank" rel="noreferrer">Open full-resolution image <Maximize2 size={13} /></a></p>
        </div>}
      </dialog>

      <footer className="hl-footer">
        <a href="/#/" className="hl-footer-name"><ArrowLeft size={15} /> Paul Garnier-Muller</a>
        <p>Research companion for “Heuristic Learning for Active Flow Control Using Coding Agents” · Garnier, Viquerat, Hachem · 2026</p>
        <span>Recorded results remain labeled. Browser results are recomputed locally.</span>
      </footer>
    </div>
  );
};

export default HeuristicLab;
