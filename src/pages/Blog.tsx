import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { blogPosts } from "@/data/blogPosts";

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <header className="mb-16">
            <h1 className="text-4xl font-semibold mb-4">Blog</h1>
            <p className="text-lg text-blog-text-light">
              Research and insights from Thinking Machines
            </p>
          </header>

          <div className="space-y-12">
            {blogPosts.map((post) => (
              <article key={post.id} className="border-b border-blog-border pb-12 last:border-0">
                <Link 
                  to={`/blog/${post.slug}`}
                  className="group"
                >
                  <h2 className="text-2xl font-semibold mb-3 group-hover:opacity-70 transition-opacity">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-blog-text-light mb-4">
                    <span>{post.author}</span>
                    <span>•</span>
                    <time>{post.date}</time>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <p className="text-blog-text leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Blog;
