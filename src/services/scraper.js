import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Fetch a web page and extract its readable text, so it can be added to the
 * RAG knowledge base. Strips scripts, styles, nav/header/footer and other
 * non-content noise, then collapses whitespace.
 *
 * Only scrape pages you own or have permission to use.
 *
 * @param {string} url
 * @returns {Promise<{ title: string, text: string, url: string }>}
 */
export async function scrapeUrl(url) {
  const { data: html } = await axios.get(url, {
    timeout: 15000,
    maxContentLength: 5 * 1024 * 1024,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WhatsAppAIBot/1.0)" },
  });
  return extractFromHtml(html, url);
}

/** Extract { title, text } from raw HTML. */
function extractFromHtml(html, url) {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, svg, iframe, form, aside").remove();

  const title = ($("title").first().text() || $("h1").first().text() || url).trim();

  // Prefer the main content region when the page marks one.
  const root = $("main").length ? $("main") : $("article").length ? $("article") : $("body");

  // Insert line breaks between block elements so paragraphs/headings/list
  // items don't run together (cheerio's .text() ignores block boundaries).
  root.find("p, h1, h2, h3, h4, h5, h6, li, br, tr, div, section").each((_, el) => {
    $(el).append("\n");
  });

  const text = root
    .text()
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return { title, text, url };
}

/** Extract same-domain, scrapeable links from a loaded page. */
function sameDomainLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const u = new URL(href, baseUrl);
      u.hash = "";
      // Same host, http(s), and not a binary asset.
      if (u.host !== base.host) return;
      if (!/^https?:$/.test(u.protocol)) return;
      if (/\.(pdf|jpe?g|png|gif|svg|zip|mp4|mp3|webp|ico|css|js)$/i.test(u.pathname)) return;
      links.add(u.toString());
    } catch {
      /* ignore bad URLs */
    }
  });

  return [...links];
}

/**
 * Crawl a site starting from a URL, scraping up to `maxPages` same-domain pages
 * (breadth-first). Returns one entry per page. Best-effort: pages that fail are
 * skipped. Only crawl sites you own or have permission to use.
 *
 * @param {string} startUrl
 * @param {{ maxPages?: number }} [opts]
 * @returns {Promise<Array<{ title: string, text: string, url: string }>>}
 */
export async function crawlSite(startUrl, { maxPages = 10 } = {}) {
  const visited = new Set();
  const queue = [startUrl];
  const pages = [];

  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const { data: html } = await axios.get(url, {
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WhatsAppAIBot/1.0)" },
      });
      const page = await extractFromHtml(html, url);
      if (page.text && page.text.length >= 30) pages.push(page);

      // Enqueue new links to reach the rest of the site.
      for (const link of sameDomainLinks(html, url)) {
        if (!visited.has(link)) queue.push(link);
      }
    } catch {
      // Skip pages that error out.
    }
  }

  return pages;
}

/**
 * Build a safe knowledge filename from a URL (hostname + path → slug).
 * @param {string} url
 * @returns {string}
 */
export function slugFromUrl(url) {
  try {
    const u = new URL(url);
    const base = (u.hostname + u.pathname)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return `${(base || "import").slice(0, 60)}.md`;
  } catch {
    return "import.md";
  }
}
