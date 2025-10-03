import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathProps {
  children: string;
  block?: boolean;
}

const Math = ({ children, block = false }: MathProps) => {
  if (block) {
    return <BlockMath math={children} />;
  }
  return <InlineMath math={children} />;
};

export default Math;
