import { useState } from "react";

interface SidenoteProps {
  number: number;
  children: React.ReactNode;
}

const Sidenote = ({ number, children }: SidenoteProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <sup 
        className="cursor-pointer text-accent hover:opacity-70 transition-opacity ml-0.5"
        onClick={() => setIsOpen(!isOpen)}
      >
        {number}
      </sup>
      {/* Desktop sidenote */}
      <span className="hidden xl:inline absolute left-[calc(100%+2rem)] w-56 text-xs text-blog-text-light leading-relaxed">
        <sup className="text-accent mr-1">{number}</sup>
        {children}
      </span>
      {/* Mobile tooltip */}
      {isOpen && (
        <span className="xl:hidden inline-block ml-2 text-xs text-blog-text-light bg-muted px-2 py-1 rounded">
          <sup className="text-accent mr-1">{number}</sup>
          {children}
        </span>
      )}
    </>
  );
};

export default Sidenote;
