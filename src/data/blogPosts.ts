export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  readTime: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    slug: "lora-without-regret",
    title: "LoRA Without Regret",
    author: "John Schulman in collaboration with others at Thinking Machines",
    date: "Sep 29, 2025",
    excerpt: "Today's leading language models contain upwards of a trillion parameters, pretrained on tens of trillions of tokens. We investigate when LoRA matches full fine-tuning performance.",
    readTime: "15 min read"
  },
  {
    id: "2",
    slug: "understanding-transformers",
    title: "Understanding Transformers: A Deep Dive",
    author: "Research Team at Thinking Machines",
    date: "Aug 15, 2025",
    excerpt: "The transformer architecture has revolutionized natural language processing. We explore the mechanisms that make transformers so effective and examine their scaling properties.",
    readTime: "12 min read"
  },
  {
    id: "3",
    slug: "efficient-inference",
    title: "Efficient Inference at Scale",
    author: "Engineering Team at Thinking Machines",
    date: "Jul 3, 2025",
    excerpt: "As language models grow larger, inference efficiency becomes critical. We present techniques for optimizing model serving while maintaining quality.",
    readTime: "10 min read"
  }
];
