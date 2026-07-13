(() => {
  "use strict";

  const article = document.getElementById("article-content");
  const progressBar = document.getElementById("reading-progress-bar");

  const CONTENT_SEGMENT = /^[\p{Letter}\p{Number}._-]+$/u;

  const isSafeMarkdownPath = (path) => {
    if (typeof path !== "string" || !path) return false;
    if (path.includes("\\") || path.includes("?") || path.includes("#")) return false;
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(path)) return false;
    if (!path.startsWith("content/") || !path.toLowerCase().endsWith(".md")) return false;

    const segments = path.split("/");
    return segments.length >= 3 && segments.every((segment) => (
      segment
      && segment !== "."
      && segment !== ".."
      && CONTENT_SEGMENT.test(segment)
    ));
  };

  const markdownBaseUrl = (markdownPath) => {
    const siteRoot = new URL("./", window.location.href);
    const markdownUrl = new URL(markdownPath, siteRoot);
    return new URL("./", markdownUrl);
  };

  const isUnsafeScheme = (value) => /^(?:javascript|data|vbscript|file):/i.test(value.trim());

  const normalizeRenderedContent = (root, markdownPath) => {
    const baseUrl = markdownBaseUrl(markdownPath);

    root.querySelectorAll("img[src]").forEach((image) => {
      const source = image.getAttribute("src")?.trim() || "";
      if (!source || isUnsafeScheme(source)) {
        image.replaceWith(document.createTextNode("[图片路径无效]"));
        return;
      }

      try {
        const resolved = new URL(source, baseUrl);
        if (!/^https?:$/.test(resolved.protocol)) throw new Error("Unsupported image protocol");
        image.src = resolved.href;
        image.loading = "lazy";
        image.decoding = "async";
      } catch {
        image.replaceWith(document.createTextNode("[图片路径无效]"));
      }
    });

    root.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href")?.trim() || "";
      if (!href || isUnsafeScheme(href)) {
        link.removeAttribute("href");
        return;
      }

      if (href.startsWith("#")) return;
      if (/^mailto:/i.test(href)) return;

      try {
        const resolved = new URL(href, baseUrl);
        if (!/^https?:$/.test(resolved.protocol)) throw new Error("Unsupported link protocol");
        link.href = resolved.href;

        if (resolved.origin !== window.location.origin) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
      } catch {
        link.removeAttribute("href");
      }
    });

    const usedIds = new Map();
    root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
      const base = heading.textContent
        .trim()
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";

      const count = usedIds.get(base) || 0;
      usedIds.set(base, count + 1);
      heading.id = count ? `${base}-${count + 1}` : base;
    });
  };

  const showError = (title, detail) => {
    document.title = `${title} · 内容加载失败`;

    const panel = document.createElement("div");
    panel.className = "error-panel";

    const heading = document.createElement("h1");
    heading.textContent = title;

    const message = document.createElement("p");
    message.textContent = detail;

    const backLink = document.createElement("a");
    backLink.className = "button button-primary";
    backLink.href = "index.html";
    backLink.textContent = "返回首页";

    panel.append(heading, message, backLink);
    article.replaceChildren(panel);
  };

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const value = scrollable > 0
      ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100))
      : 0;
    progressBar.style.width = `${value}%`;
  };

  const renderMarkdown = (markdown, markdownPath) => {
    if (!window.marked || !window.DOMPurify) {
      throw new Error("Markdown renderer failed to load");
    }

    window.marked.setOptions({
      gfm: true,
      breaks: false,
      pedantic: false
    });

    const normalizedMarkdown = markdown
      .replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")
      .replace(/\r\n?/g, "\n");

    const unsafeHtml = window.marked.parse(normalizedMarkdown);
    const safeHtml = window.DOMPurify.sanitize(unsafeHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target", "rel", "loading", "decoding"]
    });

    const template = document.createElement("template");
    template.innerHTML = safeHtml;
    normalizeRenderedContent(template.content, markdownPath);
    article.replaceChildren(template.content);

    const firstHeading = article.querySelector("h1, h2, h3");
    document.title = firstHeading
      ? `${firstHeading.textContent.trim()} · Site Framework`
      : "Site Framework";
  };

  const loadArticle = async () => {
    const file = new URLSearchParams(window.location.search).get("file");

    if (!isSafeMarkdownPath(file)) {
      showError("无法加载此内容", "只允许读取 content 目录中的 Markdown 文件。");
      return;
    }

    try {
      const response = await fetch(file, {
        cache: "no-cache",
        credentials: "same-origin"
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      renderMarkdown(markdown, file);
      updateProgress();
    } catch (error) {
      console.error("Failed to load Markdown:", error);
      showError(
        "内容加载失败",
        "文件不存在、网络暂不可用，或 Markdown 渲染组件没有成功加载。请稍后重试。"
      );
    }
  };

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  loadArticle();
})();