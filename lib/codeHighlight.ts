import hljs from "highlight.js";
import { escapeHtml } from "./richText";

export function highlightCodeBlock(code: string, language?: string): { highlighted: string; lang: string } {
  const rawLang = (language || "").trim().toLowerCase();
  const validLang = rawLang && hljs.getLanguage(rawLang) ? rawLang : "";

  try {
    if (validLang) {
      const result = hljs.highlight(code, { language: validLang, ignoreIllegals: true });
      return { highlighted: result.value, lang: validLang };
    }
    const auto = hljs.highlightAuto(code);
    return { highlighted: auto.value, lang: auto.language || "code" };
  } catch {
    return { highlighted: escapeHtml(code), lang: validLang || "code" };
  }
}

export function formatArticleHtmlWithCodeblocks(html: string): string {
  if (!html) return "";

  // 1. Normalize markdown codeblocks into standard <pre class="code-block" data-language="lang"><code>...</code></pre>
  const normalized = html.replace(/(?:<p>)?```([a-zA-Z0-9_\-#+]+)?\s*(?:<br\s*\/?>)?([\s\S]*?)```(?:<\/p>)?/gi, (_, lang, code) => {
    const cleanLang = (lang || "bash").trim().toLowerCase();
    const cleanCode = code
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<p>/gi, "")
      .replace(/<\/p>/gi, "\n");
    return `<pre class="code-block" data-language="${cleanLang}"><code>${cleanCode}</code></pre>`;
  });

  // 2. Process all <pre> blocks in one clean pass and wrap them with syntax highlighting & hover copy button
  return normalized.replace(/<pre([^>]*)>(?:<code([^>]*)>)?([\s\S]*?)(?:<\/code>)?<\/pre>/gi, (full, preAttrs, codeAttrs, innerCode) => {
    const langMatch =
      String(preAttrs).match(/data-language=["']([^"']+)["']/i) ||
      String(codeAttrs).match(/class=["'][^"']*language-([a-zA-Z0-9_\-#+]+)[^"']*["']/i) ||
      String(preAttrs).match(/class=["'][^"']*language-([a-zA-Z0-9_\-#+]+)[^"']*["']/i);

    const lang = langMatch ? langMatch[1] : "";
    const cleanCode = innerCode
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return renderCodeWrapper(cleanCode.trim(), lang);
  });
}

function renderCodeWrapper(rawCode: string, langName: string): string {
  const { highlighted, lang } = highlightCodeBlock(rawCode, langName);
  const displayLang = (lang || langName || "code").toLowerCase();
  const encodedRawCode = escapeHtml(rawCode);

  return `<div class="code-wrapper">
  <div class="code-header">
    <div class="code-header-left">
      <span class="code-dot code-dot-red"></span>
      <span class="code-dot code-dot-yellow"></span>
      <span class="code-dot code-dot-green"></span>
      <span class="code-lang-tag">${displayLang}</span>
    </div>
    <button type="button" class="code-copy-btn" title="Copy code" data-raw-code="${encodedRawCode}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <pre class="code-block" data-language="${displayLang}"><code class="hljs language-${displayLang}" data-raw-code="${encodedRawCode}">${highlighted}</code></pre>
</div>`;
}
