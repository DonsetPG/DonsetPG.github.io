export interface SidebarSection {
  id: string;
  title: string;
  level: number;
}

interface SidebarProps {
  sections: SidebarSection[];
  activeSection?: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

const Sidebar = ({ sections, activeSection, onSelect, className }: SidebarProps) => {
  if (!sections.length) {
    return null;
  }

  const getPaddingClass = (level: number) => {
    if (level <= 1) return "";
    if (level === 2) return "pl-4";
    if (level === 3) return "pl-6";
    return "pl-8";
  };

  return (
    <aside
      className={`hidden lg:block w-64 flex-shrink-0 bg-sidebar-bg p-8 ${className ?? ""}`}
    >
      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`block w-full text-left text-sm py-1.5 transition-colors ${getPaddingClass(section.level)} ${
              activeSection === section.id
                ? "text-foreground font-medium"
                : "text-blog-text-light hover:text-foreground"
            }`}
            aria-current={activeSection === section.id ? "true" : undefined}
          >
            {section.title}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
