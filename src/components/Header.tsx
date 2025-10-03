import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b border-blog-border z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/blog" className="text-sm font-medium tracking-wider hover:opacity-70 transition-opacity">
          THINKING MACHINES
        </Link>
        <nav className="flex items-center gap-8">
          <a href="#" className="text-sm text-blog-text-light hover:text-foreground transition-colors">
            Tinker
          </a>
          <Link to="/blog" className="text-sm text-blog-text-light hover:text-foreground transition-colors">
            Blog
          </Link>
          <a href="#" className="text-sm text-blog-text-light hover:text-foreground transition-colors">
            Join us
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
