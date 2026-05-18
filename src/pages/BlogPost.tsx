import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar, { SidebarSection } from "@/components/Sidebar";
import { blogPosts } from "@/data/blogPosts";
import { ArrowLeft } from "lucide-react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

const htmlModules = import.meta.glob("@/content/posts/*.html", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;
const imageModules = import.meta.glob("@/assets/imgs/**/*", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const assetMap = Object.entries(imageModules).reduce<Record<string, string>>((acc, [key, value]) => {
  const cleanedKey = key.replace("/src/assets/", "");
  acc[cleanedKey] = value as string;
  return acc;
}, {});

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((entry) => entry.slug === slug);
  const articleRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  const htmlContent = useMemo(() => {
    if (!post) return "";
    const key = `/src/content/posts/${post.contentFile}`;
    return htmlModules[key] ?? "";
  }, [post]);

  const { html: processedHtml, sections } = useMemo(() => {
    if (!htmlContent) {
      return { html: "", sections: [] as SidebarSection[] };
    }

    if (typeof window === "undefined") {
      return { html: htmlContent, sections: [] as SidebarSection[] };
    }

    const parser = new window.DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    const updateAssetSrc = (element: Element, attr: string) => {
      const original = element.getAttribute(attr)?.trim();
      if (!original) {
        return;
      }
      const normalized = original.replace(/^\.\//, "").replace(/^\//, "");
      const key = normalized.startsWith("imgs/") ? normalized : `imgs/${normalized}`;
      const asset = assetMap[key];
      if (asset) {
        element.setAttribute(attr, asset);
      }
    };

    const images = doc.querySelectorAll("img");
    images.forEach((img) => {
      updateAssetSrc(img, "src");
      img.setAttribute("loading", "lazy");
    });

    const sources = doc.querySelectorAll("source[src]");
    sources.forEach((source) => {
      updateAssetSrc(source, "src");
    });

    const videos = doc.querySelectorAll("video[poster]");
    videos.forEach((video) => {
      updateAssetSrc(video, "poster");
    });

    const headingElements = Array.from(
      doc.querySelectorAll<HTMLHeadingElement>("h1, h2, h3, h4, h5, h6")
    );
    const sectionList: SidebarSection[] = [];
    const usedIds = new Set<string>();

    headingElements.forEach((heading) => {
      const title = heading.textContent?.trim();
      if (!title) {
        return;
      }

      const level = Number(heading.tagName.replace("H", "")) || 1;
      const existingId = heading.getAttribute("id")?.trim();
      const baseId = existingId && existingId.length > 0 ? existingId : slugify(title) || `section-${sectionList.length + 1}`;

      let uniqueId = baseId;
      let counter = 1;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${baseId}-${counter++}`;
      }
      usedIds.add(uniqueId);

      heading.setAttribute("id", uniqueId);
      heading.setAttribute("data-section-id", uniqueId);

      sectionList.push({ id: uniqueId, title, level });
    });

    return { html: doc.body.innerHTML, sections: sectionList };
  }, [htmlContent]);

  useEffect(() => {
    if (!articleRef.current) {
      return;
    }

    renderMathInElement(articleRef.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  }, [processedHtml]);

  useEffect(() => {
    const container = articleRef.current;
    if (!container) {
      return;
    }

    const cleanupCallbacks: Array<() => void> = [];
    const viewers = Array.from(container.querySelectorAll<HTMLElement>("[data-image-viewer]"));

    viewers.forEach((viewer) => {
      const buttons = Array.from(viewer.querySelectorAll<HTMLButtonElement>(".benchmark-thumb"));
      const previewImage = viewer.querySelector<HTMLImageElement>("[data-viewer-preview] img");

      if (!buttons.length || !previewImage) {
        return;
      }

      previewImage.loading = "eager";

      const selectButton = (selectedButton: HTMLButtonElement) => {
        const thumbnail = selectedButton.querySelector<HTMLImageElement>("img");
        if (!thumbnail) {
          return;
        }

        const nextSrc = thumbnail.currentSrc || thumbnail.getAttribute("src");
        if (nextSrc) {
          previewImage.setAttribute("src", nextSrc);
        }
        previewImage.setAttribute("alt", thumbnail.getAttribute("alt") ?? "");

        buttons.forEach((button) => {
          const isSelected = button === selectedButton;
          button.classList.toggle("is-active", isSelected);
          button.setAttribute("aria-pressed", String(isSelected));
        });
      };

      buttons.forEach((button) => {
        button.setAttribute("aria-pressed", "false");
        const handleClick = () => selectButton(button);
        button.addEventListener("click", handleClick);
        cleanupCallbacks.push(() => button.removeEventListener("click", handleClick));
      });

      selectButton(buttons[0]);
    });

    return () => {
      cleanupCallbacks.forEach((cleanup) => cleanup());
    };
  }, [processedHtml]);

  useEffect(() => {
    if (sections.length) {
      setActiveSection(sections[0].id);
    } else {
      setActiveSection(null);
    }
  }, [sections, slug]);

  useEffect(() => {
    if (!sections.length) {
      return;
    }

    const headingElements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!headingElements.length) {
      return;
    }

    const handleScroll = () => {
      const OFFSET = 140;
      let currentId: string | null = sections[0]?.id ?? null;

      headingElements.forEach((heading) => {
        if (heading.getBoundingClientRect().top <= OFFSET) {
          currentId = heading.id;
        }
      });

      if (currentId) {
        setActiveSection((prev) => (prev === currentId ? prev : currentId));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [sections]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const container = articleRef.current;
    if (!container) {
      return;
    }

    const NOTE_GAP = 12;
    let frame = 0;

    const resetTransforms = (notes: HTMLElement[]) => {
      notes.forEach((note) => {
        note.style.removeProperty("--note-translate");
      });
    };

    const adjustFootnotes = () => {
      if (!container.isConnected) {
        return;
      }

      const notes = Array.from(container.querySelectorAll<HTMLElement>(".sidenote"));
      if (!notes.length) {
        return;
      }

      resetTransforms(notes);

      const isDesktop = window.matchMedia("(min-width: 1280px)").matches;
      if (!isDesktop) {
        return;
      }

      const pairs = notes
        .map((note) => {
          const noteId = note.dataset.note;
          if (!noteId) {
            return null;
          }
          const reference = container.querySelector<HTMLElement>(`.sidenote-ref[data-note="${noteId}"]`);
          if (!reference) {
            return null;
          }
          return { note, reference };
        })
        .filter((pair): pair is { note: HTMLElement; reference: HTMLElement } => Boolean(pair));

      if (!pairs.length) {
        return;
      }

      pairs.sort((a, b) => a.reference.getBoundingClientRect().top - b.reference.getBoundingClientRect().top);

      let previousBottom = -Infinity;

      pairs.forEach(({ note, reference }) => {
        const referenceRect = reference.getBoundingClientRect();
        const baseTop = referenceRect.top + window.scrollY;
        const noteRect = note.getBoundingClientRect();
        const noteHeight = noteRect.height;

        let desiredTop = baseTop;
        if (Number.isFinite(previousBottom)) {
          const minTop = previousBottom + NOTE_GAP;
          if (desiredTop < minTop) {
            desiredTop = minTop;
          }
        }

        const translate = Math.max(0, desiredTop - baseTop);
        note.style.setProperty("--note-translate", `${translate}px`);
        previousBottom = desiredTop + noteHeight;
      });
    };

    const scheduleAdjust = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(adjustFootnotes);
    };

    scheduleAdjust();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => scheduleAdjust()) : null;
    if (resizeObserver) {
      resizeObserver.observe(container);
    }

    window.addEventListener("resize", scheduleAdjust);

    const fontReady = document.fonts?.ready;
    if (fontReady) {
      fontReady.then(() => scheduleAdjust()).catch(() => {
        /* ignore font loading errors */
      });
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleAdjust);
      resizeObserver?.disconnect();
    };
  }, [processedHtml]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const handleSectionSelect = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isSticky={false} />

      <div className="max-w-6xl mx-auto px-6 xl:px-8 py-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <Sidebar
            sections={sections}
            activeSection={activeSection}
            onSelect={handleSectionSelect}
            className="lg:col-start-1 lg:col-end-2 lg:justify-self-end"
          />

          <main className="pt-6 lg:pt-0 lg:col-start-2 lg:col-end-3">
            <div className="w-full max-w-3xl mx-auto">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-sm text-blog-text-light hover:text-foreground transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>

              <article className="blog-content" ref={articleRef}>
                <header className="mb-10 text-center">
                  <h1 className="mb-4">{post.title}</h1>
                  <div className="flex flex-col items-center gap-1 text-sm text-blog-text-light">
                    <span>{post.author}</span>
                    <span>{post.date} · {post.readTime}</span>
                  </div>
                </header>

                <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
              </article>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default BlogPost;
