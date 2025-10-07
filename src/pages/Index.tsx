import Header from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-24">
        <div className="max-w-4xl mx-auto px-6 space-y-16">
          <section className="space-y-6">
            <h1 className="text-4xl font-semibold">What am I doing?</h1>
            <ul className="space-y-4 text-blog-text">
              <li>
                <p>
                  <strong>2024 –</strong> Back at {""}
                  <a
                    href="https://www.cemef.mines-paristech.fr/"
                    className="underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    CEMEF
                  </a>{" "}
                  to start a PhD on ML+CFD.
                </p>
              </li>
              <li>
                <p>
                  <strong>2020/21 – 2024</strong> {""}
                  <a
                    href="https://www.flaneer.com/"
                    className="underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    Flaneer
                  </a>
                  : built a startup providing computer in the cloud for the creative industry (as the CTO). We raised
                  $1.4M, grew to team to 8 people and served up to 10k users daily.
                </p>
              </li>
              <li>
                <p>
                  <strong>2019 – 2021</strong> MCs at {""}
                  <a
                    href="https://www.minesparis.psl.eu/"
                    className="underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    MINES Paristech
                  </a>
                  . I spent some time doing internships with Amazon ({""}
                  <a
                    href="https://fr.wikipedia.org/wiki/A9_(site_web)"
                    className="underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    formerly the A9 team
                  </a>
                  ) in 2019 in SF working on the first deep learning models for Learning to Rank, {""}
                  <a
                    href="https://www.artefact.com/"
                    className="underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    Artefact
                  </a>{" "}
                  in China, CNRS and Microsoft. Spent my last year at MINES Paristech mostly working on a startup
                  project: Flaneer.
                </p>
              </li>
              <li>
                <p>
                  <strong>2017 – 2019</strong> BSc at {""}
                  <a
                    href="https://www.minesparis.psl.eu/"
                    className="underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    MINES Paristech
                  </a>
                  , where I started working on Deep Reinforcement Learning. Worked with {""}
                  <a
                    href="https://www.minesparis.psl.eu/Services/Annuaire/elie-hachem"
                    className="underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    Elie Hachem
                  </a>{" "}
                  to apply DRL to Fluid Mechanics.
                </p>
              </li>
              <li>
                <p>
                  <strong>2015 – 2017</strong> Prep. school at Ginette, doing mostly math and physics.
                </p>
              </li>
            </ul>

            <p className="text-blog-text">
              Resume available{" "}
              <a
                href="https://donsetpg.github.io/CV_PG.pdf"
                className="underline-offset-2 hover:opacity-70 transition-opacity"
              >
                here
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-semibold">Other projects</h2>
            <ul className="list-disc space-y-3 pl-6 text-blog-text">
              <li>
                <a
                  href="https://github.com/DonsetPG/graph-physics"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Graph-Physics
                </a>
                , a python library to train large GNN on physics datasets.
              </li>
              <li>
                <a
                  href="https://github.com/DonsetPG/smooth-particles-hydrodynamics"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  SPH in Python
                </a>
                , a fast python implementation of a Smooth Particles Hydrodynamics solver.
              </li>
              <li>
                <a
                  href="https://github.com/DonsetPG/narya"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Narya
                </a>
                , allows you to track soccer player from camera inputs, and evaluate them with an Expected Discounted Goal
                (EDG) Agent trained on a FIFA-like environment.
              </li>
              <li>
                <a
                  href="https://github.com/DonsetPG/fenics-DRL"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Deepfluid
                </a>
                , a library for Deep Reinforcement Learning applied to fluid mechanics.
              </li>
              <li>
                <a
                  href="https://github.com/DonsetPG/MeshGradientPy"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  MeshGradientPy
                </a>{" "}
                lets you compute particular field gradient on a mesh, and makes them compatible with Machine Learning
                tensors.
              </li>
              <li>
                <a
                  href="https://github.com/DonsetPG/twitch-ai"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  TwitchAI
                </a>{" "}
                let's you scrap a twitch chat, and then apply NLP models on it.
              </li>
              <li>
                <a
                  href="https://github.com/DonsetPG/OWDC"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Small project
                </a>{" "}
                wondering how to make parking place prices evolve in Paris.
              </li>
              <li>
                <a
                  href="https://www.codingame.com/profile/1f672933264f3cdaeaec7d320d7cc9870421562"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  I also spent a lot of time
                </a>{" "}
                building bots for computer games {""}
                <a
                  href="https://donsetpg.github.io/blog/2018/09/02/LOCAM/"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  competition
                </a>
                .
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-semibold">Publications</h2>
            <ul className="list-disc space-y-3 pl-6 text-blog-text">
              <li>
                <a
                  href="https://arxiv.org/pdf/2509.13138"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  CURRICULUM LEARNING FOR MESH-BASED SIMULATIONS
                </a>{" "}
                <strong>2025</strong>
              </li>
              <li>
                <a
                  href="https://arxiv.org/pdf/2509.03095"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  TRELLIS-Enhanced Surface Features for Comprehensive Intracranial Aneurysm Analysis
                </a>{" "}
                <strong>2025</strong>
              </li>
              <li>
                <a
                  href="https://arxiv.org/pdf/2508.19052"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Automated discovery of finite volume schemes using Graph Neural Networks
                </a>{" "}
                <strong>2025</strong>
              </li>
              <li>
                <a
                  href="https://arxiv.org/pdf/2508.18051"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Training Transformers for Mesh-Based Simulations
                </a>{" "}
                <strong>2025</strong>
              </li>
              <li>
                <a
                  href="https://arxiv.org/pdf/2505.03778"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Dragonfly: a modular deep reinforcement learning library
                </a>{" "}
                <strong>2020-2025</strong>
              </li>
              <li>
                <a
                  href="https://arxiv.org/pdf/2501.08738"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  MESHMASK: PHYSICS-BASED SIMULATIONS WITH MASKED GRAPH NEURAL NETWORKS
                </a>{" "}
                <strong>2024</strong>
              </li>
              <li>
                <a
                  href="https://arxiv.org/pdf/2409.11899"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Multi-Grid Graph Neural Networks with Self-Attention for Computational Mechanics
                </a>{" "}
                <strong>2024</strong>
              </li>
              <li>
                Semi-Supervised Learning for Bilingual Lexicon Induction <strong>2020</strong>
              </li>
              <li>
                <a
                  href="https://arxiv.org/abs/2101.05388"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Evaluating Soccer Player: from Live Camera to Deep Reinforcement Learning
                </a>{" "}
                <strong>2020</strong>
              </li>
              <li>
                <a
                  href="https://arxiv.org/abs/1908.04127"
                  className="underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  A review on Deep Reinforcement Learning for Fluid Mechanics
                </a>{" "}
                <strong>2019</strong>
              </li>
            </ul>
            <p className="text-blog-text">
              or{" "}
              <a
                href="https://scholar.google.com/citations?user=AjLpkBwAAAAJ&hl=fr"
                className="underline-offset-2 hover:opacity-70 transition-opacity"
              >
                here on Google Scholar
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
