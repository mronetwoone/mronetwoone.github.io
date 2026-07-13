(() => {
  "use strict";

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const setText = (selector, value) => {
    const element = qs(selector);
    if (element && typeof value === "string") element.textContent = value;
  };

  const isSafeContentFile = (path) => {
    if (typeof path !== "string" || path.includes("\\") || path.includes("?") || path.includes("#")) return false;
    if (!/^content\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._-]+)*\.md$/.test(path)) return false;
    return path.split("/").every((segment) => segment !== "." && segment !== "..");
  };

  const isSafeCover = (path) => {
    if (!path || typeof path !== "string" || path.includes("\\") || /^(?:[a-z]+:|\/\/|\/)/i.test(path)) return false;
    const segments = path.split("/");
    return segments[0] === "content" && segments.every((segment) => segment && segment !== "." && segment !== "..");
  };

  const createTagList = (tags) => {
    const list = document.createElement("ul");
    list.className = "tag-list";
    (Array.isArray(tags) ? tags : []).forEach((tag) => {
      const item = document.createElement("li");
      item.textContent = String(tag);
      list.append(item);
    });
    return list;
  };

  const createCard = (item, kind) => {
    if (!item || !isSafeContentFile(item.file)) return null;

    const card = document.createElement("a");
    card.className = "content-card reveal";
    card.href = "page.html?file=" + encodeURIComponent(item.file);

    if (isSafeCover(item.cover)) {
      const image = document.createElement("img");
      image.className = "card-cover";
      image.src = item.cover;
      image.alt = "";
      image.loading = "lazy";
      card.append(image);
    }

    const body = document.createElement("div");
    body.className = "card-body";
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const date = document.createElement("time");
    date.dateTime = item.date || "";
    date.textContent = item.date || "示例内容";
    const detail = document.createElement("span");
    detail.textContent = kind === "project" ? (item.status || "项目") : (item.readingTime || "内容");
    meta.append(date, detail);

    const title = document.createElement("h3");
    title.textContent = item.title || "未命名内容";
    const summary = document.createElement("p");
    summary.className = "card-summary";
    summary.textContent = item.summary || "暂无摘要。";
    body.append(meta, title, summary, createTagList(item.tags));
    card.append(body);
    return card;
  };

  const observeReveals = (elements = qsa(".reveal")) => {
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px" });
    elements.forEach((element) => observer.observe(element));
  };

  const loadCards = async (url, containerId, kind) => {
    const container = document.getElementById(containerId);
    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      const cards = (Array.isArray(data.items) ? data.items : []).map((item) => createCard(item, kind)).filter(Boolean);
      container.replaceChildren();
      if (!cards.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "暂时没有可显示的内容。";
        container.append(empty);
        return;
      }
      container.append(...cards);
      observeReveals(cards);
    } catch (error) {
      const message = document.createElement("p");
      message.className = "loading-state load-error";
      message.textContent = "内容索引加载失败，请稍后重试。";
      container.replaceChildren(message);
      console.error("Failed to load " + url + ":", error);
    }
  };

  const applySiteConfig = async () => {
    try {
      const response = await fetch("data/site.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const config = await response.json();
      document.documentElement.lang = config.language || "zh-CN";
      if (config.pageTitle) document.title = config.pageTitle;
      const description = qs('meta[name="description"]');
      if (description && config.description) description.content = config.description;
      qsa("[data-site-name]").forEach((element) => { element.textContent = config.siteName || "Site Framework"; });
      setText("#hero-eyebrow", config.hero?.eyebrow);
      setText("#hero-title", config.hero?.title);
      setText("#hero-description", config.hero?.description);
      setText("#about-title", config.about?.title);
      setText("#about-description", config.about?.description);
      setText("#footer-text", config.footerText);

      const primary = qs("#hero-primary");
      const secondary = qs("#hero-secondary");
      if (primary && config.hero?.primaryAction) {
        primary.textContent = config.hero.primaryAction.label;
        primary.href = config.hero.primaryAction.href;
      }
      if (secondary && config.hero?.secondaryAction) {
        secondary.textContent = config.hero.secondaryAction.label;
        secondary.href = config.hero.secondaryAction.href;
      }
      const aboutLink = qs("#about-link");
      if (aboutLink && isSafeContentFile(config.about?.file)) {
        aboutLink.href = "page.html?file=" + encodeURIComponent(config.about.file);
      }
    } catch (error) {
      console.error("Failed to load site configuration:", error);
    }
  };

  const setupNavigation = () => {
    const header = qs("#site-header");
    const toggle = qs(".nav-toggle");
    const links = qs("#nav-links");
    const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 18);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    toggle?.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      links?.classList.toggle("is-open", !isOpen);
    });
    qsa("a", links).forEach((link) => link.addEventListener("click", () => {
      toggle?.setAttribute("aria-expanded", "false");
      links?.classList.remove("is-open");
    }));
  };

  document.getElementById("current-year").textContent = new Date().getFullYear();
  setupNavigation();
  observeReveals();
  Promise.all([
    applySiteConfig(),
    loadCards("data/projects.json", "projects-grid", "project"),
    loadCards("data/notes.json", "notes-grid", "note")
  ]);
})();
