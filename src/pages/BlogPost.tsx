import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Math from "@/components/Math";
import Sidenote from "@/components/Sidenote";
import loraDiagram from "@/assets/lora-diagram.png";
import { blogPosts } from "@/data/blogPosts";
import { ArrowLeft } from "lucide-react";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeSection, setActiveSection] = useState("introduction");

  const post = blogPosts.find(p => p.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("[data-section]");
      let current = "introduction";

      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= 100) {
          current = section.getAttribute("data-section") || "introduction";
        }
      });

      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar activeSection={activeSection} />
      
      <main className="lg:ml-64 pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 xl:pr-80">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-sm text-blog-text-light hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
        <article className="max-w-4xl mx-auto px-6 pb-12 blog-content xl:pr-80">
          {/* Title Section */}
          <header className="mb-12 text-center">
            <h1 className="mb-4">{post.title}</h1>
            <p className="text-base text-blog-text-light mb-2">
              {post.author}
            </p>
            <p className="text-sm text-blog-text-light">{post.date}</p>
          </header>

          {/* Hero Diagram */}
          <div className="mb-12">
            <img 
              src={loraDiagram} 
              alt="LoRA matrix decomposition diagram showing B and A matrices combining to form ΔW" 
              className="w-full rounded-lg"
            />
          </div>

          {/* Content */}
          <section id="introduction" data-section="introduction">
            <p>
              Today's leading language models contain upwards of a trillion parameters, pretrained on tens of trillions of tokens. Base model performance keeps improving with scale, as these trillions are necessary for learning and representing all the patterns in written-down human knowledge.
            </p>
            <p>
              In contrast, post-training involves smaller datasets and generally focuses on narrower domains of knowledge and ranges of behavior. It seems wasteful to use a terabit of weights to represent updates from a gigabit or megabit of training data. This intuition has motivated parameter efficient fine-tuning (PEFT), which adjusts a large network by updating a much smaller set of parameters.
            </p>
            <p>
              The leading PEFT method is low-rank adaptation, or LoRA. LoRA replaces each weight matrix{" "}
              <Math>W</Math> from the original model with a modified version{" "}
              <Math>{"W' = W + \\gamma BA"}</Math>, where <Math>B</Math> and <Math>A</Math> are matrices 
              that together have far fewer parameters than <Math>W</Math>, and <Math>\gamma</Math> is a 
              constant scaling factor.
              <Sidenote number={1}>
                <a href="https://arxiv.org/abs/2106.09685" className="hover:opacity-70">LoRA: Low-Rank Adaptation of Large Language Models</a> (Hu et al, 2021)
              </Sidenote>
              {" "}In effect, LoRA creates a low-dimensional representation of the updates imparted by fine-tuning.
            </p>
            <p>
              LoRA may offer advantages in the cost and speed of post-training, and there are also a few operational reasons to prefer it to full fine-tuning (henceforth, FullFT):
            </p>
            <ul>
              <li>
                <strong>Multi-tenant serving.</strong> Since LoRA trains an adapter (i.e., the A and B matrices) while keeping the original weights unchanged, a single inference server can keep many adapters (different model versions) in memory and sample from them simultaneously in a batched way.
                <Sidenote number={2}>
                  <a href="https://arxiv.org/abs/2310.18547" className="hover:opacity-70">Punica: Multi-Tenant LoRA Serving</a> (Chen, Ye, et al, 2023)
                </Sidenote>
                {" "}Modern inference engines such as vLLM and SGLang implement this feature.
              </li>
              <li>
                <strong>Layout size for training.</strong> When fine-tuning the whole model, the optimizer state needs to be stored along with the original weights, often at higher precision.
                <Sidenote number={3}>
                  For training, besides storing the weights, we typically need to store gradients and optimizer moments for all of the weights; moreover, these variables are often stored in higher precision (float32) than what's used to store the weights for inference (bfloat16 or lower).
                </Sidenote>
                {" "}Since LoRA trains far fewer weights and uses far less memory, it can be trained on a layout only slightly larger than what is used for sampling. This makes training more accessible, and often more efficient.
              </li>
              <li>
                <strong>Ease of loading and transfer.</strong> With fewer weights to store, LoRA adapters are fast and easy to set up or transfer between machines.
              </li>
            </ul>
            <p>
              These reasons are sufficient to explain the growing popularity of LoRA since the publication of the original LoRA paper in 2021.
              <Sidenote number={4}>
                <a href="https://arxiv.org/abs/2106.09685" className="hover:opacity-70">LoRA: Low-Rank Adaptation of Large Language Models</a> (Hu et al, 2021)
              </Sidenote>
              {" "}However, the literature is unclear on how well LoRA performs relative to FullFT.
            </p>
            <p>
              There is agreement that LoRA underperforms in settings that resemble pre-training,
              <Sidenote number={5}>
                <a href="https://arxiv.org/abs/2405.09673" className="hover:opacity-70">LoRA Learns Less and Forgets Less</a> (Biderman et al, 2024)
              </Sidenote>
              {" "}namely those with very large datasets that exceed the storage limits of LoRA parameters. But for dataset sizes that are typical in post-training, LoRA has sufficient capacity to store the essential information. The question is: <em>can LoRA match the performance of full fine-tuning, and if so, under which conditions?</em>
            </p>
            <p>
              In our experiments, we find that indeed, when we get a few key details right, LoRA learns with the same sample efficiency as FullFT and achieves the same ultimate performance.
            </p>
          </section>

          <section id="what-matters" data-section="what-matters">
            <h2>What matters for LoRA</h2>
            <p>
              This article covers a series of supervised fine-tuning and reinforcement learning experiments we conducted to determine the conditions under which LoRA matches FullFT efficiency. To this end, we did a few things differently from previous experiments on LoRA:
            </p>
            <ul>
              <li>We investigated the general relationship between training set size and number of LoRA parameters, rather than focusing on specific datasets and tasks.</li>
              <li>In supervised learning, we measured log loss rather than employing sampling-based evals, with the same goal of generality in mind. Log loss measurement gives clean results and scaling laws over ranges of training steps and training parameters.</li>
            </ul>
            <p>We find that:</p>
            <ul>
              <li>For supervised fine-tuning on small-to-medium-sized instruction-tuning and reasoning datasets, LoRA performs the same as full fine-tuning.</li>
              <li>For datasets that exceed LoRA capacity, LoRA underperforms FullFT. Rather than the loss reaching a distinct floor that it can't go below, LoRA results in worse training efficiency that depends on the relationship between model capacity to dataset size.</li>
              <li>In some scenarios, LoRA is less tolerant of large batch sizes than full fine-tuning — it pays a larger penalty in loss as batch size increases beyond some point.</li>
              <li>Even in small data settings, LoRA performs better when applied to all weight matrices, especially MLP and MoE layers. Attention-only LoRA underperforms even when we match the number of trainable parameters by using higher rank for attention-only LoRA.</li>
              <li>LoRA performs equivalently to FullFT for reinforcement learning even with small ranks. We find that RL requires very low capacity, a result we anticipated based on information-theoretical arguments.</li>
            </ul>
            <p>
              The outcome of our experiments is the characterization of a "low-regret regime" where LoRA performs similarly to FullFT in terms of dataset size and LoRA parameters. We found this regime covers most post-training scenarios, opening the door to the use of efficient fine-tuning in many applications.
            </p>
          </section>

          <section id="methods" data-section="methods">
            <h2>Methods and results</h2>
            <p>
              We designed our experiments to measure in detail the relative performance of LoRA compared to FullFT across a range of conditions. Here are some details of our experimental setup:
            </p>
            <ul>
              <li>We varied the LoRA rank over three orders of magnitude, with rank between 1 and 512, and compared these to full fine-tuning.</li>
              <li>To eliminate potential confounds from using a suboptimal learning rate, we swept the LR for each experimental condition. We used constant learning rate schedule (no warmup or cooldown).</li>
              <li>Our experiments used Llama 3 series models
                <Sidenote number={6}>
                  <a href="https://arxiv.org/abs/2407.21783" className="hover:opacity-70">The Llama 3 Herd of Models</a> (Dubey et al, 2024)
                </Sidenote>
                {" "}and Qwen3 models
                <Sidenote number={7}>
                  <a href="https://arxiv.org/abs/2505.09388" className="hover:opacity-70">Qwen3 Technical Report</a> (Qwen Team, 2025)
                </Sidenote>
                , including a mixture of experts (MoE) model.
              </li>
              <li>The main supervised learning experiments used the Tulu3
                <Sidenote number={8}>
                  <a href="https://arxiv.org/abs/2411.15124" className="hover:opacity-70">Tulu 3: Pushing Frontiers in Open Language Model Post-Training</a> (Ivison et al, 2024)
                </Sidenote>
                {" "}and OpenThoughts3
                <Sidenote number={9}>
                  <a href="https://arxiv.org/abs/2506.04178" className="hover:opacity-70">OpenThoughts: Data Recipes for Reasoning Models</a> (Guha et al, 2025)
                </Sidenote>
                {" "}datasets, focused on instruction following and reasoning, respectively. The two sets differ significantly in scope, structure, and application, supporting the generality of our results.
              </li>
              <li>Our RL experiments used mathematical reasoning tasks with answer correctness as the reward.</li>
            </ul>

            <div id="lora-rank" data-section="lora-rank" className="mt-8">
              <h3>LoRA rank</h3>
              <p>
                We trained for a single epoch on the Tulu3 dataset and a subset of the OpenThoughts3 datasets. For each dataset and model size, we swept over LoRA rank and learning rate. We see that FullFT and high-rank LoRAs have similar learning curves with loss decreasing linearly with the logarithm of the number of steps. Medium and low-rank LoRAs fall off the minimum-loss learning curves at some threshold of steps that correlates with rank.
              </p>
              <p>
                We find that the optimal learning rate for FullFT is lower by a factor of 10 than for high-rank LoRAs.
                <Sidenote number={10}>
                  See Biderman et al. (2024), Figure S1, for an experiment with sampling evals, which finds a similar 10× ratio.
                </Sidenote>
                {" "}The optimal LR seems to be similar for all the LoRA runs across different ranks; we give a theoretical explanation for this finding below.
              </p>
            </div>

            <div id="batch-size" data-section="batch-size" className="mt-8">
              <h3>Batch size effects</h3>
              <p>
                We found that in some settings, LoRA is less tolerant of large batch sizes than FullFT. The performance gap grows with larger batch sizes, independent of rank. The learning gap at large batches doesn't seem to depend on rank, but rather seems to be a property of LoRA. The likely reason is that the product-of-matrices parametrization (BA) has less favorable optimization dynamics on this dataset than the full matrix (W).
              </p>
            </div>
          </section>

          <section id="layers" data-section="layers">
            <h2>Layers Where LoRA Is Applied</h2>
            <p>
              We investigated the effects of applying LoRA to different layers in the network. The original paper recommended applying LoRA only to the attention matrices, and many subsequent papers followed suit. However, we achieved far better results when applying LoRA to all layers, in particular, the MLP (including MoE) layers. In fact, applying LoRA to the attention matrices shows no additional benefits beyond applying it to the MLPs only.
            </p>
            <p>
              The underperformance of attention-only LoRA is not explained by having fewer parameters. Attention-only LoRA significantly underperforms MLP-only LoRA, and does not further improve performance on top of LoRA-on-MLP. This effect holds for both dense models and sparse MoE architectures.
            </p>

            <div id="reinforcement" data-section="reinforcement" className="mt-8">
              <h3>Reinforcement learning</h3>
              <p>
                A key finding from our experiments is that LoRA fully matches the learning performance of FullFT when running policy gradient algorithms for reinforcement learning, even with ranks as low as 1.
              </p>
            <p>
              This result is anticipated by an information-theoretic argument. Supervised learning arguably provides <Math>{"O(\\text{number of tokens})"}</Math> bits per episode. In contrast, in policy gradient methods, learning is driven by the advantage function which provides only <Math>O(1)</Math> bits per episode. When each episode contains thousands of tokens, RL absorbs ~1000 times less information per token in training than supervised learning does.
            </p>
              <p>
                LoRA shows a wider range of performant learning rates and arrives at the same peak performance as FullFT, at least within the precision limits afforded by the noisiness of RL.
              </p>
            </div>
          </section>

          <section id="hyperparameters" data-section="hyperparameters">
            <h2>Setting LoRA hyperparameters</h2>
            <p>
              We examined the impact of hyperparameters used for LoRA on its learning rate relative to full fine-tuning. We examine some invariances in hyperparameters like init scales and multipliers, and explain why the 1/r prefactor makes the optimal learning rate approximately independent of rank.
            </p>

            <div id="learning-rate" data-section="learning-rate" className="mt-8">
              <h3>Optimal learning rate and rank</h3>
              <p>
                The standard LoRA initialization scheme makes the optimal learning rate approximately independent of rank. This is a desirable property because it means you don't need to retune the learning rate when you change the rank.
              </p>
            </div>

            <div id="parametrization" data-section="parametrization" className="mt-8">
              <h3>Parametrization invariances</h3>
              <p>
                We discuss various ways to parametrize LoRA and show that many of them are equivalent up to a rescaling of the learning rate. Understanding these invariances helps explain why certain hyperparameter choices work well in practice.
              </p>
            </div>

            <div id="optimal-lr-lora" data-section="optimal-lr-lora" className="mt-8">
              <h3>Optimal learning rates for LoRA vs. FullFT</h3>
              <p>
                Our experiments consistently show that the optimal learning rate for LoRA is about 10 times higher than for FullFT. This is an important practical finding that should be kept in mind when switching between the two training methods.
              </p>
            </div>

            <div id="learning-rates-short" data-section="learning-rates-short" className="mt-8">
              <h3>Learning rates in short and long runs</h3>
              <p>
                We find that the optimal learning rate can depend on the length of training. For very short runs, both LoRA and FullFT may benefit from higher learning rates, while longer runs require more conservative choices to avoid instability.
              </p>
            </div>
          </section>

          <section id="discussion" data-section="discussion">
            <h2>Discussion</h2>
            <p>
              Our experiments demonstrate that LoRA can match the performance of full fine-tuning in most practical post-training scenarios, provided that a few key conditions are met: using sufficient rank for the dataset size, applying LoRA to all layers (especially MLPs), and using appropriate learning rates.
            </p>

            <div id="all-layers" data-section="all-layers" className="mt-8">
              <h3>Why LoRA might be needed on all layers</h3>
              <p>
                The strong performance advantage of applying LoRA to MLP layers suggests that these layers play a crucial role in adapting the model to new tasks. This may be because MLP layers are responsible for storing factual knowledge, which often needs updating during fine-tuning.
              </p>
            </div>

            <div id="capacity" data-section="capacity" className="mt-8">
              <h3>How much capacity is needed by supervised and reinforcement learning?</h3>
              <p>
                Our results show a clear distinction between supervised learning and reinforcement learning in terms of capacity requirements. Supervised learning benefits from higher ranks when training on larger datasets, while reinforcement learning achieves excellent results even with rank-1 LoRA. This difference stems from the fundamentally different information content of these two learning paradigms.
              </p>
              <p>
                These findings have important practical implications: for RL applications, even the smallest LoRA configurations are sufficient, making the method extremely efficient. For supervised learning, the required rank scales with dataset size, but most practical post-training scenarios fall well within the "low-regret regime" where LoRA matches full fine-tuning performance.
              </p>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
};

export default BlogPost;
