/**
 * Physics from the FluidGym v1 and BEACON papers; API/reward details checked
 * against the local research checkout and recorded public API probes, 2026-09-08.
 * This guide documents the inspected contracts, not a replay of historical runs.
 * BEACON upstream: d8f91e7879e2e45625e031ff06fca08bbcee4f5f.
 */
export type BenchmarkCase = {
  id: string;
  label: string;
  title: string;
  environmentId: string;
  family: "FluidGym" | "BEACON";
  modelKind: string;
  parameters: string;
  objective: string;
  equations: string[];
  physicalState: string;
  observation: string;
  action: string;
  rewardEquation: string;
  rewardDescription: string;
  scoreConvention: string;
  notation: string;
  notes: string[];
  sources: { label: string; url: string }[];
};

const fluidgymPaper = { label: "FluidGym paper · Appendix C", url: "https://arxiv.org/html/2601.15015v1#A3" };
const fluidgymCode = { label: "FluidGym upstream code", url: "https://github.com/safe-autonomous-systems/fluidgym" };
const beaconPaper = { label: "BEACON paper · §3", url: "https://arxiv.org/html/2402.17402v1" };
const beaconCode = (name: string) => ({ label: "BEACON implementation", url: `https://github.com/jviquerat/beacon/blob/d8f91e7879e2e45625e031ff06fca08bbcee4f5f/beacon/${name}/${name}.py` });
const meanScore = (steps: number) => `Mean step reward, J = (1/N) Σ rₜ. Default episode: ${steps.toLocaleString("en-US")} control steps. A control step contains multiple solver substeps.`;
const episodeScore = (steps: number) => `Episode return, R = Σ rₜ over ${steps} action steps. Mean step reward is R / ${steps}.`;
const ns2 = [
  String.raw`\partial_t\mathbf u+(\mathbf u\!\cdot\nabla)\mathbf u=-\nabla p+Re^{-1}\nabla^2\mathbf u`,
  String.raw`\nabla\!\cdot\mathbf u=0`,
];
const boussinesq = [
  String.raw`\partial_t\mathbf u+(\mathbf u\!\cdot\nabla)\mathbf u=-\nabla p+\sqrt{Pr/Ra}\,\nabla^2\mathbf u+T\mathbf e_y`,
  String.raw`\partial_tT+\mathbf u\!\cdot\nabla T=(RaPr)^{-1/2}\nabla^2T,\qquad\nabla\!\cdot\mathbf u=0`,
];

const cylinder = (variant: "rotation" | "jets", re: number): BenchmarkCase => ({
  id: variant === "rotation" ? "cylinder-rotation-easy" : re === 100 ? "cylinder-jet-easy" : "cylinder-jet-medium",
  label: `${variant === "rotation" ? "Cylinder rotation" : "Cylinder jets"} · ${re === 100 ? "easy" : "medium"}`,
  title: variant === "rotation" ? "Steer the wake by rotating the cylinder." : "Use paired jets to control the wake.",
  environmentId: `${variant === "rotation" ? "CylinderRot2D" : "CylinderJet2D"}-${re === 100 ? "easy" : "medium"}-v0`,
  family: "FluidGym", modelKind: "2D PDE", parameters: `Re = ${re}`,
  objective: "Reduce drag while keeping lift small. The cylinder sheds alternating vortices; wall actuation changes the wake and the forces on the body.",
  equations: ns2,
  physicalState: "The velocity field u(x,y,t), with pressure p enforcing incompressibility. The actuator filter also retains its previous control value.",
  observation: "302 current velocity values: u and v at 151 probes around the cylinder and in its wake. No pressure channel or full-field mesh in this sensor vector. History is kept by the controller, if needed.",
  action: variant === "rotation"
    ? "1 continuous command a ∈ [−1,1] sets the tangential cylinder-wall speed, scaled by the mean inlet speed. An exponential filter smooths the requested action at solver substeps."
    : "1 continuous command a ∈ [−1,1] drives opposing top/bottom jets. Each jet has a parabolic profile over 10°; blowing on one side accompanies suction on the other. Peak speed is scaled by mean inlet speed and time-filtered.",
  rewardEquation: String.raw`r_t=C_{D,\mathrm{ref}}-\overline{C_D}^{\,t}-\left|\overline{C_L}^{\,t}\right|`,
  rewardDescription: "Drag improvement relative to the uncontrolled reference, minus the magnitude of the mean lift. The reference is an additive offset; reward is not a percentage reduction.",
  scoreConvention: meanScore(80),
  notation: "C_D and C_L are drag and lift coefficients, normalized by ½ρŪ²D. Bars average solver substeps within one control interval. C_D,ref is uncontrolled mean drag. Re = ŪD/ν; time is scaled by D/Ū. Control interval: 0.25.",
  notes: ["The inspected implementation uses |mean(C_L)|. Appendix C.1 writes mean(|C_L|); they differ when lift changes sign during an interval. The formula here labels the inspected code convention.", "Most archived cylinder runs used generated initial domains. This guide does not turn those runs into evaluations on the original FluidGym test set."],
  sources: [fluidgymPaper, fluidgymCode],
});

const convection = (ra: number): BenchmarkCase => ({
  id: ra === 80000 ? "rbc-easy" : "rbc-medium", label: `Convection · ${ra === 80000 ? "easy" : "medium"}`,
  title: "Reshape thermal plumes with 12 heaters.", environmentId: `RBC2D-${ra === 80000 ? "easy" : "medium"}-v0`,
  family: "FluidGym", modelKind: "2D PDE", parameters: `Ra = ${ra.toLocaleString("en-US")} · Pr = 0.7`,
  objective: "Reduce convective heat transport between a hot lower plate and a cold upper plate. Buoyancy couples the temperature field back into the flow.",
  equations: boussinesq,
  physicalState: "Temperature T(x,y,t), both velocity components and pressure. These are coupled Boussinesq flow and heat-transport equations.",
  observation: "1,152 current values: T, u and v on a 48 × 8 probe grid. The archived heuristic receives the complete sensor vector, without a built-in history stack.",
  action: "12 commands in [−1,1] reshape the lower-wall temperature. The implementation centers the commands, scales and saturates the offsets to ±0.75 around T = 1, then smooths the spatial heater profile.",
  rewardEquation: String.raw`r_t=Nu_{\mathrm{ref}}-Nu_t,\qquad Nu_t=1+\sqrt{RaPr}\,\langle vT\rangle_V`,
  rewardDescription: "Higher reward means less heat transport. Nusselt number is evaluated at the end of the control interval using a volume-weighted spatial average. The inspected 2D reference is the median uncontrolled Nusselt number.",
  scoreConvention: meanScore(200),
  notation: "u is velocity, p pressure and T temperature. Ra = gβΔTH³/(νκ), Pr = ν/κ. These equations use free-fall units. The domain is π × 1, with top T = 0 and baseline bottom T = 1. Control interval: 1.",
  notes: ["The archived API probe gives 1,152 observations; the paper overview table lists 768. The implementation includes the conductive +1 in Nu; using the same convention for Nu and its reference preserves their difference.", "The objective here is heat-transfer reduction, as stated in the paper’s detailed environment definition. Its overview table has an inconsistent enhancement label.", "Coordinatewise saturation after centering can change the mean heater offset. Exact post-clipping mean-temperature preservation is not assumed. Archived runs use generated initial domains."],
  sources: [fluidgymPaper, fluidgymCode],
});

export const BENCHMARK_CASES: BenchmarkCase[] = [
  cylinder("rotation", 100), cylinder("jets", 100), cylinder("jets", 250), convection(80000), convection(400000),
  {
    id: "tcf", label: "Turbulent channel", title: "Reduce friction on both channel walls.", environmentId: "TCFSmall3D-both-easy-v0",
    family: "FluidGym", modelKind: "3D PDE", parameters: "Reτ = 180 · both walls",
    objective: "Distributed blowing and suction alter the near-wall turbulence to reduce the mean wall shear stress.",
    equations: [String.raw`\partial_t\mathbf u+(\mathbf u\!\cdot\nabla)\mathbf u=-\nabla p+\nu\nabla^2\mathbf u+\mathbf S`, String.raw`\nabla\!\cdot\mathbf u=0`],
    physicalState: "Three velocity components u, v, w and pressure p throughout a 3D channel, plus the filtered actuator state.",
    observation: "2,048 local controllers each receive 2 velocity fluctuations, u′ and v′, near y⁺ = 15. Fluctuations are relative to the sampled plane’s mean. The public MARL tensor is (2048, 2).",
    action: "2,048 scalar commands in [−1,1]: a 32 × 32 patch grid on each wall. Commands set wall-normal velocity after friction-velocity scaling, saturation, per-wall mean removal and time smoothing. The final mean removal enforces zero net wall flux.",
    rewardEquation: String.raw`r_t=1-\frac{\tau_{\mathrm{wall}}(t)}{\tau_{\mathrm{wall,ref}}}`,
    rewardDescription: "Fractional reduction in wall stress relative to uncontrolled flow. A step reward of 0.20 means 20% lower stress under that reference. The default local-reward weight is zero, so every controller receives the same global reward.",
    scoreConvention: meanScore(1000),
    notation: "S is streamwise driving, ν viscosity, τ_wall the stress averaged over both walls, and τ_wall,ref its uncontrolled mean. Reτ = uτδ/ν with half-height δ and friction velocity uτ. The PDE uses solver units rather than a 1/Reτ viscosity coefficient. Domain: π × 2 × π/2.",
    notes: ["The recorded API has 2,048 total actuators. The paper table lists 1,024, while its figure specifies 32 × 32 on each wall. The global sensor interface differs from the local MARL tensor shown here.", "These observations are centered per sampled plane in the inspected implementation. The paper describes a volume mean. Re-centering physical controls after clipping can move an individual velocity outside the pre-centering bound."],
    sources: [fluidgymPaper, fluidgymCode],
  },
  {
    id: "shkadov", label: "Falling film · 5 jets", title: "Flatten waves before they grow downstream.", environmentId: "shkadov-v0 · 5-jet configuration",
    family: "BEACON", modelKind: "1D PDE", parameters: "δ = 0.1 · 5 jets",
    objective: "Use localized forcing to damp convective instabilities in a falling liquid film.",
    equations: [String.raw`\partial_t h=-\partial_xq`, String.raw`\partial_tq=-\frac65\partial_x\!\left(\frac{q^2}{h}\right)+\frac{h(1+\partial_{xxx}h)-q/h^2}{5\delta}+f_a(x,t)`],
    physicalState: "The full film-thickness field h(x,t) and flow-rate field q(x,t), evolved with the Shkadov model.",
    observation: "50 flow-rate samples: 10 upstream of each of the 5 jets. Thickness determines the reward but is absent from the public observation. No built-in frame stack.",
    action: "5 continuous commands aⱼ ∈ [−1,1], each scaled by 5 and applied as a local parabolic forcing profile of width 4. Commands interpolate over 0.02 time units; nominal action interval: 0.05.",
    rewardEquation: String.raw`r_t=-\frac{\Delta x}{n_jN_r}\sum_{j=1}^{n_j}\sum_{i\in W_j}(h_i-1)^2`,
    rewardDescription: "Penalize squared thickness deviations downstream of each jet. Zero means a flat film in the scoring windows. This is the inspected code’s grid-dependent normalization.",
    scoreConvention: episodeScore(400),
    notation: "h = 1 is the flat film, q is flow rate, f_a is localized jet forcing and δ combines film parameters. Wⱼ is a downstream reward window. Here nⱼ = 5, Δx = 0.2 and Nᵣ = 50 grid cells per window.",
    notes: ["The code converts reward-window length to a grid-cell count before dividing by it; the explicit Δx factor is retained here. The paper’s normalization and discretization differ.", "This is the 5-jet case shown in the policy comparison. The 10-jet adaptation is a separate transfer experiment."],
    sources: [beaconPaper, beaconCode("shkadov")],
  },
  {
    id: "rayleigh", label: "Rayleigh convection", title: "Suppress convection in a heated cavity.", environmentId: "rayleigh-v0",
    family: "BEACON", modelKind: "2D PDE", parameters: "Ra = 10,000 · Pr = 0.71",
    objective: "Change 10 bottom-wall temperatures to weaken heat-carrying convection rolls.",
    equations: boussinesq,
    physicalState: "Velocity and temperature fields in a unit cavity, with pressure enforcing incompressibility. Vertical sides are insulated; walls are no-slip.",
    observation: "192 scalars: temperature and both velocity components on 4 × 4 probes, with the current frame and 3 previous frames. The separate sparse-observation study changes this layout.",
    action: "10 continuous offsets in [−0.75,0.75]. The environment removes their mean, then uses a common max-absolute scale to retain offsets within ±0.75. Baseline bottom temperature is 0.5.",
    rewardEquation: String.raw`r_t=-Nu_t,\qquad Nu_t=-\frac1{N_x}\sum_{i=1}^{N_x}\frac{T_{i,1}-0.5}{\Delta y/2}`,
    rewardDescription: "Negative bottom-wall Nusselt number: less heat transport earns a higher reward. The local formula uses the bottom-adjacent cells and reference mean hot-wall temperature 0.5. Conduction has Nu ≈ 1.",
    scoreConvention: episodeScore(100),
    notation: "T is nondimensional temperature, v is vertical velocity, Ra is Rayleigh number and Pr is Prandtl number. Tᵢ,₁ denotes a bottom-adjacent cell and Δy its height. The action interval is 2 time units.",
    notes: ["BEACON rewards −Nu; FluidGym RBC rewards Nu_ref − Nu. Their raw scores are on different scales.", "The implementation uses a max-absolute normalization for the action vector; the paper’s printed expression omits the absolute value."],
    sources: [beaconPaper, beaconCode("rayleigh")],
  },
  {
    id: "mixing", label: "Scalar mixing", title: "Stir a scalar patch into a uniform mixture.", environmentId: "mixing-v0",
    family: "BEACON", modelKind: "2D PDE", parameters: "Re = 100 · Pe = 10,000",
    objective: "Switch between moving-wall patterns to spread a passive scalar through a square cavity.",
    equations: [ns2[0], String.raw`\partial_tc+\mathbf u\!\cdot\nabla c=Pe^{-1}\nabla^2c,\qquad\nabla\!\cdot\mathbf u=0`],
    physicalState: "Velocity u(x,y,t), pressure p(x,y,t) and concentration c(x,y,t). The scalar is advected and diffused without affecting the flow.",
    observation: "192 scalars: concentration and both velocity components on a 4 × 4 grid, across the current and 3 previous frames.",
    action: "1 discrete choice among 4 wall-motion patterns: opposing horizontal walls moving in either direction, or opposing vertical walls moving in either direction. Speeds have magnitude 1. There is no stationary-wall choice.",
    rewardEquation: String.raw`r_t=-\frac1{N_c}\sum_{i=1}^{N_c}|c_i-0.25|`,
    rewardDescription: "Negative mean absolute concentration error from the uniform target c* = 0.25. Zero means the scored array is uniform.",
    scoreConvention: episodeScore(100),
    notation: "Re controls momentum diffusion and Pe scalar diffusion. N_c counts entries in the concentration array used by the reward, including boundary/ghost entries in the inspected implementation. Walls have zero scalar flux. Action interval: 0.5.",
    notes: ["The reward is a mean absolute error, rather than an unnormalized L1 sum. Action space is Discrete(4), not 4 independent continuous controls."],
    sources: [beaconPaper, beaconCode("mixing")],
  },
  {
    id: "lorenz", label: "Lorenz attractor", title: "Keep a chaotic trajectory on the left lobe.", environmentId: "lorenz-v0",
    family: "BEACON", modelKind: "3-state ODE", parameters: "σ = 10 · ρ = 28 · β = 8/3",
    objective: "Keep x below zero by applying a small discrete forcing to the y equation.",
    equations: [String.raw`\dot x=10(y-x),\qquad\dot y=x(28-z)-y+f_a`, String.raw`\dot z=xy-\tfrac83z,\qquad f_a\in\{-1,0,1\}`],
    physicalState: "The 3 Lorenz variables (x,y,z), a reduced-order dynamical model of convection.",
    observation: "6 scalars: x, y, z and their 3 solver-reported time derivatives. No frame stack.",
    action: "1 discrete choice among 3 forcing levels. API indices 0, 1 and 2 map to fₐ = −1, 0 and +1 in the y equation. A decision lasts 0.05 time units.",
    rewardEquation: String.raw`r_t=\mathbf1[x_t<0]`,
    rewardDescription: "Earn 1 for every returned action step with x < 0, otherwise 0. The score counts how long the trajectory stays on the rewarded side.",
    scoreConvention: "Episode return over 500 action steps, between 0 and 500. R / 500 is the fraction of successful steps.",
    notation: "Dots denote time derivatives. σ, ρ and β are fixed system parameters; fₐ is the controller’s forcing. The browser Lorenz experiment below recomputes this reduced model locally.",
    notes: ["This benchmark integrates ODEs. It does not solve a spatial CFD field."],
    sources: [beaconPaper, beaconCode("lorenz")],
  },
  {
    id: "burgers", label: "Burgers equation", title: "Cancel a travelling inlet disturbance.", environmentId: "burgers-v0",
    family: "BEACON", modelKind: "1D PDE", parameters: "Inviscid · 1 actuator",
    objective: "Apply localized forcing halfway along a 1D domain so the downstream flow returns to its target value.",
    equations: [String.raw`\partial_tu+u\partial_xu=f_a(x,t)`],
    physicalState: "The full velocity-like scalar field u(x,t), transported by the nonlinear inviscid Burgers equation.",
    observation: "5 adjacent velocity samples immediately upstream of the actuator. These are the final 5 upstream grid cells, without a frame stack.",
    action: "1 continuous command a ∈ [−1,1], scaled to forcing 10a in the actuator cell at x = 1. The full domain length is 2.",
    rewardEquation: String.raw`r_t=-\Delta x\sum_{i\ge i_a}|u_i-0.5|`,
    rewardDescription: "Negative downstream absolute error from u* = 0.5. The sum extends from the actuator to the outlet, with Δx = 0.004. Zero means the scored region reaches the target.",
    scoreConvention: episodeScore(200),
    notation: "i_a is the actuator cell, Δx the cell width and f_a the localized source. Nominal action interval: 0.05. The inspected code integrates 62 substeps of 0.0008, giving 0.0496 per action.",
    notes: ["This case uses inviscid Burgers dynamics. A viscosity term would define a different task."],
    sources: [beaconPaper, beaconCode("burgers")],
  },
  {
    id: "sloshing", label: "Tank sloshing", title: "Move the tank to settle its free surface.", environmentId: "sloshing-v0",
    family: "BEACON", modelKind: "1D PDE", parameters: "Shallow water · L = 2.5",
    objective: "Damp the wave while paying a small penalty for tank acceleration.",
    equations: [String.raw`\partial_th=-\partial_xq`, String.raw`\partial_tq=-\partial_x\!\left(\frac{q^2}{h}+\frac12gh^2\right)-\ddot Y`],
    physicalState: "Water height h(x,t) and flow rate q(x,t) across the tank, described by the published BEACON shallow-water model.",
    observation: "100 flow-rate values: the 200-cell q field is downsampled by 2. Water height affects reward but is absent from the inspected public observation.",
    action: "1 continuous tank-acceleration command a ∈ [−1,1], with amplitude scale 5. It is interpolated from the previous command over 0.01 time units. Nominal action interval: 0.05.",
    rewardEquation: String.raw`r_t=-\Delta x\sqrt{\sum_{i=1}^{N_x}(h_i-1)^2}-0.0005\,|5a_t|`,
    rewardDescription: "Penalize the L2 height error from a flat surface plus absolute acceleration effort. The discrete norm is multiplied by Δx = 0.0125, following the implementation.",
    scoreConvention: episodeScore(200),
    notation: "Y is tank position, h = 1 the target height, q flow rate and g = 9.81. The displayed equation follows the paper’s tank-frame convention; no left/right mapping is assigned to a command’s sign.",
    notes: ["The paper describes height observations and a different grid resolution. README and pinned code use flow-rate observations, with 100 values in this configuration.", "This reduced shallow-water model cannot represent wave breaking or detached droplets."],
    sources: [beaconPaper, beaconCode("sloshing")],
  },
  {
    id: "vortex", label: "Vortex oscillator", title: "Tune motion in a flow-coupled oscillator.", environmentId: "vortex-v0",
    family: "BEACON", modelKind: "4-state ODE", parameters: "Re = 50 · gain + phase",
    objective: "Increase useful cylinder motion through gain-and-phase feedback while paying for actuation.",
    equations: [String.raw`\dot A=\lambda(Re_*^{-1}-Re^{-1})A-\mu A|A|^2+\alpha Y+ke^{i\phi}A`, String.raw`\dot Y=[-\omega_*\gamma+i(\omega_s-\omega_*)]Y+\frac{\beta A}{\omega_*m}`],
    physicalState: "Two complex amplitudes: A for the flow disturbance and Y for cylinder displacement. They represent 4 real dynamical variables.",
    observation: "8 scalars: real and imaginary parts of A and Y, followed by their 4 derivatives. No frame stack.",
    action: "2 normalized commands in [−1,1] map to gain k = 0.15(a₁ + 1) ∈ [0,0.3] and phase φ = πa₂ ∈ [−π,π]. A decision lasts 0.5 time units.",
    rewardEquation: String.raw`r_t=2\omega_s\gamma\left(\frac{y_t-y_{t-1}}{\delta t}\right)^2-\frac{w}{2}v_{a,t}^{\,2}`,
    rewardDescription: "Motion benefit minus actuation cost. This is the inspected discrete reward: it divides the displacement difference by solver δt = 0.1, although returned action samples are 0.5 apart.",
    scoreConvention: episodeScore(800),
    notation: "y = 2 Re(Y exp(iω*t)) and v_a = 2 Re(k exp(iφ) A exp(iω*t)). Here w = 50, ω_s = 1.1, ω* = 0.74, γ = 0.023, m = 10 and Re* = 46.6. Model coefficients: λ = 9.153 + 3.239i; μ = 308.9 − 1025i; α = 0.03492 + 0.01472i; β = 1.",
    notes: ["The paper’s physical objective uses a time derivative. The archived finite-difference denominator scales the motion benefit differently from using the actual 0.5 action interval. The formula is documented here without claiming that scaling is physically correct.", "The benchmark solves amplitude ODEs, rather than full Navier–Stokes around a moving cylinder."],
    sources: [beaconPaper, beaconCode("vortex")],
  },
];
