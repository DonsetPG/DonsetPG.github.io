import { useState, type KeyboardEvent } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import Formula from "@/components/Math";
import { BENCHMARK_CASES } from "./benchmarkCases";
import "./BenchmarkCaseGuide.css";

const BenchmarkCaseGuide = () => {
  const [selectedId, setSelectedId] = useState("cylinder-jet-easy");
  const selected = BENCHMARK_CASES.find((item) => item.id === selectedId) ?? BENCHMARK_CASES[0];

  const moveCase = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % BENCHMARK_CASES.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + BENCHMARK_CASES.length) % BENCHMARK_CASES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = BENCHMARK_CASES.length - 1;
    else return;
    event.preventDefault();
    setSelectedId(BENCHMARK_CASES[next].id);
    document.getElementById(`case-tab-${BENCHMARK_CASES[next].id}`)?.focus();
  };

  return (
    <section className="hl-case-guide" id="benchmark-cases" aria-labelledby="hl-case-guide-title">
      <div className="hl-section-heading">
        <div><span className="hl-section-index">01</span><p>The 13 control problems</p></div>
        <h2 id="hl-case-guide-title">The physics. The observations. The reward.</h2>
      </div>
      <p className="hl-case-intro">Choose a case for a short technical briefing. The physical state describes the system; the observation is what the controller gets to see.</p>

      <div className="hl-case-explorer">
        <aside className="hl-case-picker">
          <div className="hl-case-picker-head"><span>Case index</span><span>06 + 07</span></div>
          <div className="hl-case-mobile-select">
            <label htmlFor="hl-case-select">Choose a benchmark case</label>
            <select id="hl-case-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {["FluidGym", "BEACON"].map((family) => (
                <optgroup key={family} label={family}>
                  {BENCHMARK_CASES.filter((item) => item.family === family).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="hl-case-tabs" role="tablist" aria-label="Benchmark cases" aria-orientation="vertical">
            {BENCHMARK_CASES.map((item, index) => (
              <button key={item.id} type="button" role="tab" id={`case-tab-${item.id}`} aria-selected={selectedId === item.id}
                aria-controls="hl-case-panel" tabIndex={selectedId === item.id ? 0 : -1}
                className={selectedId === item.id ? "is-active" : ""} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => moveCase(event, index)}>
                <span className="hl-case-number">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{item.label}</strong><small>{item.family} · {item.modelKind}</small></span>
                <span className="hl-case-selection" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </aside>

        <article className="hl-case-panel" id="hl-case-panel" role="tabpanel" aria-labelledby={`case-tab-${selected.id}`} tabIndex={0}>
          <header className="hl-case-title">
            <div className="hl-case-meta"><span>{selected.family}</span><span>{selected.modelKind}</span><span>{selected.parameters}</span></div>
            <h3>{selected.title}</h3>
            <p>{selected.objective}</p>
            <code>{selected.environmentId}</code>
          </header>

          <div className="hl-case-physics">
            <h4>Governing equations <span>PDE / ODE</span></h4>
            <p className="hl-case-scroll-hint">Long equations scroll sideways.</p>
            <div className="hl-case-equations" role="group" aria-label="Governing equations. Scroll horizontally if needed." tabIndex={0}>
              {selected.equations.map((equation) => <Formula key={equation} block>{equation}</Formula>)}
            </div>
            <p className="hl-case-physical-state"><b>Physical state.</b> {selected.physicalState}</p>
          </div>

          <div className="hl-case-control-contract">
            <section><h4><span>01</span> What the agent sees</h4><p>{selected.observation}</p></section>
            <section><h4><span>02</span> What it can change</h4><p>{selected.action}</p></section>
          </div>

          <section className="hl-case-reward">
            <div className="hl-case-reward-heading"><h4><span>03</span> Reward</h4><span>Higher is better</span></div>
            <div className="hl-case-equations" role="group" aria-label="Reward equation. Scroll horizontally if needed." tabIndex={0}>
              <Formula block>{selected.rewardEquation}</Formula>
            </div>
            <p>{selected.rewardDescription}</p>
            <p className="hl-case-score"><b>Reported score</b><span>{selected.scoreConvention}</span></p>
          </section>

          <details className="hl-case-details" key={selected.id}>
            <summary>Notation, implementation notes & sources <ChevronDown size={16} aria-hidden="true" /></summary>
            <div>
              <p>{selected.notation}</p>
              {selected.notes.map((note) => <p className="hl-case-note" key={note}>{note}</p>)}
              <nav aria-label={`Sources for ${selected.label}`}>
                {selected.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<ArrowUpRight size={14} aria-hidden="true" /></a>)}
              </nav>
            </div>
          </details>
        </article>
      </div>
      <p className="hl-case-scope">These are the 13 tasks in the recorded study, including the easy/medium variants. API details and raw rewards follow the research checkout inspected in September 2026; exact source identity for every historical run is unverified. Raw scores should be compared within the same case and protocol. The live cylinder below uses a separate lightweight solver and its own proxy reward.</p>
    </section>
  );
};

export default BenchmarkCaseGuide;
