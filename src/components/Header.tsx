import { Link } from "react-router-dom";

interface HeaderProps {
  isSticky?: boolean;
}

const Header = ({ isSticky = true }: HeaderProps) => {
  const positionClasses = isSticky ? "fixed top-0 left-0 right-0 z-50" : "relative";

  return (
    <header className={`${positionClasses} bg-background`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-sm font-medium tracking-wider hover:opacity-70 transition-opacity">
          Paul Garnier-Muller
        </Link>
        <nav className="flex items-center gap-8">
          <Link to="/" className="text-sm transition-colors hover:text-foreground">
            Home
          </Link>
          <Link to="/blog" className="text-sm transition-colors hover:text-foreground">
            Blog
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
