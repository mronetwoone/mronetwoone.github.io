(() => {
  "use strict";

  const article = document.getElementById("article-content");
  const progressBar = document.getElementById("reading-progress-bar");

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const slugify = (text) => text
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

  const isSafeMarkdownPath = (path) => {
    if (typeof path !== "string" || path.includes("\\") || path.includes("?") || path.includes("#")) return false;
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(path)) return false;
    if (!/^content\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._-]+)*\.md$/.test(path)) return false;
    return path.split("/").every((segment) => segment !== "." && segment !== "..");
  };

  const resolveContentImage = (source, markdownPath) => {
    if (!source || source.includes("\\") || source.includes("?") || source.includes("#") || /^(?:[a-z]+:|\/\/|\/)/i.test(source)) return null;
    const stack = markdownPath.split("/").slice(0, -1);
    for (const segment of source.split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === "..") stack.pop();
      else stack.push(segment);
    }
    if (stack[0] !== "content" || stack.length < 3) return null;
    if (stack.some((segment) => !/^[A-Za-z0-9._-]+$/.test(segment) || segment === "..")) return null;
    return stack.join("/");
  };

  const safeLink = (href) => {
    const trimmed = href.trim();
    if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
    if (/^(?:javascript:|data:|vbscript:|\/\/)/i.test(trimmed)) return null;
    if (/^[#./A-Za-z0-9_-][^\s]*$/.test(trimmed)) return trimmed;
    return null;
  };

  const renderInline = (text, markdownPath) => {
    const pattern = /(`[^`\n]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;
    let output = "";
    let cursor = 0;

    for (const match of text.matchAll(pattern)) {
      output += escapeHtml(text.slice(cursor, match.index));
      const token = match[0];

      if (token.startsWith("`")) {
        output += "<code>" + escapeHtml(token.slice(1, -1)) + "</code>";
      } else if (token.startsWith("!")) {
        const parts = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        const source = resolveContentImage(parts[2].trim(), markdownPath);
        output += source
          ? '<img src="' + escapeHtml(source) + '" alt="' + escapeHtml(parts[1]) + '" loading="lazy">'
          : '<span class="invalid-image">[图片路径已被阻止]</span>';
      } else {
        const parts = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        const href = safeLink(parts[2]);
        if (!href) {
          output += escapeHtml(parts[1]);
        } else {
          const external = /^https?:/i.test(href);
          output += '<a href="' + escapeHtml(href) + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + escapeHtml(parts[1]) + "</a>";
        }
      }
      cursor = match.index + token.length;
    }
    return output + escapeHtml(text.slice(cursor));
  };

  const splitTableRow = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  const isTableSeparator = (line) => {
    const cells = splitTableRow(line);
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  };

  const renderMarkdown = (markdown, markdownPath) => {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    const headingIds = new Map();
    let index = 0;

    const nextHeadingId = (text) => {
      const base = slugify(text);
      const count = headingIds.get(base) || 0;
      headingIds.set(base, count + 1);
      return count ? base + "-" + (count + 1) : base;
    };

    const startsBlock = (line, nextLine = "") => {
      const trimmed = line.trim();
      return !trimmed || /^```/.test(trimmed) || /^#{1,6}\s+/.test(trimmed) || /^>\s?/.test(trimmed)
        || /^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed) || /^[-+*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)
        || (trimmed.includes("|") && isTableSeparator(nextLine));
    };

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();
      if (!trimmed) { index += 1; continue; }

      const fence = trimmed.match(/^```([A-Za-z0-9_-]*)\s*$/);
      if (fence) {
        const code = [];
        index += 1;
        while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
          code.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        const language = fence[1] ? ' class="language-' + escapeHtml(fence[1]) + '"' : "";
        html.push("<pre><code" + language + ">" + escapeHtml(code.join("\n")) + "</code></pre>");
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        const text = heading[2].replace(/\s+#+\s*$/, "");
        html.push("<h" + level + ' id="' + nextHeadingId(text) + '">' + renderInline(text, markdownPath) + "</h" + level + ">");
        index += 1;
        continue;
      }

      if (/^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed)) {
        html.push("<hr>");
        index += 1;
        continue;
      }

      if (trimmed.startsWith(">")) {
        const quote = [];
        while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
          quote.push(lines[index].trim().replace(/^>\s?/, ""));
          index += 1;
        }
        html.push("<blockquote><p>" + quote.map((part) => renderInline(part, markdownPath)).join("<br>") + "</p></blockquote>");
        continue;
      }

      if (trimmed.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
        const headers = splitTableRow(trimmed);
        index += 2;
        const rows = [];
        while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
          rows.push(splitTableRow(lines[index]));
          index += 1;
        }
        const head = headers.map((cell) => "<th>" + renderInline(cell, markdownPath) + "</th>").join("");
        const body = rows.map((row) => "<tr>" + headers.map((_, cellIndex) => "<td>" + renderInline(row[cellIndex] || "", markdownPath) + "</td>").join("") + "</tr>").join("");
        html.push('<div class="table-wrap"><table><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>");
        continue;
      }

      const unordered = trimmed.match(/^[-+*]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (unordered || ordered) {
        const tag = ordered ? "ol" : "ul";
        const matcher = ordered ? /^\d+[.)]\s+(.+)$/ : /^[-+*]\s+(.+)$/;
        const items = [];
        while (index < lines.length) {
          const item = lines[index].trim().match(matcher);
          if (!item) break;
          items.push("<li>" + renderInline(item[1], markdownPath) + "</li>");
          index += 1;
        }
        html.push("<" + tag + ">" + items.join("") + "</" + tag + ">");
        continue;
      }

      const paragraph = [trimmed];
      index += 1;
      while (index < lines.length && !startsBlock(lines[index], lines[index + 1] || "")) {
        paragraph.push(lines[index].trim());
        index += 1;
      }
      html.push("<p>" + renderInline(paragraph.join(" "), markdownPath) + "</p>");
    }

    return html.join("\n");
  };

  const showError = (title, detail) => {
    document.title = title + " · 内容加载失败";
    article.innerHTML = '<div class="error-panel"><h1>' + escapeHtml(title) + "</h1><p>" + escapeHtml(detail) + '</p><a class="button button-primary" href="index.html">返回首页</a></div>';
  };

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const value = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    progressBar.style.width = value + "%";
  };

  const loadArticle = async () => {
    const file = new URLSearchParams(window.location.search).get("file");
    if (!isSafeMarkdownPath(file)) {
      showError("无法加载此内容", "只允许读取 content 目录中的 Markdown 文件。");
      return;
    }
    try {
      const response = await fetch(file, { cache: "no-cache", credentials: "same-origin" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const markdown = await response.text();
      article.innerHTML = renderMarkdown(markdown, file);
      const firstHeading = article.querySelector("h1");
      document.title = firstHeading ? firstHeading.textContent + " · Site Framework" : "Site Framework";
      updateProgress();
    } catch (error) {
      console.error("Failed to load Markdown:", error);
      showError("内容加载失败", "文件不存在、网络暂不可用，或内容无法读取。请返回首页后重试。");
    }
  };

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  loadArticle();
})();
