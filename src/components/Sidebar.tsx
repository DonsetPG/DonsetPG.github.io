interface SidebarProps {
  activeSection: string;
}

const Sidebar = ({ activeSection }: SidebarProps) => {
  const sections = [
    { id: "introduction", label: "Introduction" },
    { id: "what-matters", label: "What matters for LoRA" },
    { id: "methods", label: "Methods and results" },
    { id: "lora-rank", label: "LoRA rank", indent: true },
    { id: "batch-size", label: "Batch size effects", indent: true },
    { id: "layers", label: "Layers Where LoRA Is Applied" },
    { id: "reinforcement", label: "Reinforcement learning", indent: true },
    { id: "hyperparameters", label: "Setting LoRA hyperparameters" },
    { id: "learning-rate", label: "Optimal learning rate and rank", indent: true },
    { id: "parametrization", label: "Parametrization invariances", indent: true },
    { id: "optimal-lr-lora", label: "Optimal learning rates for LoRA vs. FullFT", indent: true },
    { id: "learning-rates-short", label: "Learning rates in short and long runs", indent: true },
    { id: "discussion", label: "Discussion" },
    { id: "all-layers", label: "Why LoRA might be needed on all layers", indent: true },
    { id: "capacity", label: "How much capacity is needed by supervised and reinforcement learning?", indent: true },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside className="hidden lg:block fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] overflow-y-auto border-r border-blog-border bg-sidebar-bg p-8">
      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`block w-full text-left text-sm py-1.5 transition-colors ${
              section.indent ? "pl-4" : ""
            } ${
              activeSection === section.id
                ? "text-foreground font-medium"
                : "text-blog-text-light hover:text-foreground"
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
