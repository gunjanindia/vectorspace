const allowedTags = new Set(["P","BR","STRONG","B","EM","I","U","H2","H3","H4","UL","OL","LI","BLOCKQUOTE","A","PRE","CODE","SPAN","KBD","SAMP"]);

export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return "";
  const hasMarkup = /<\/?[a-z][^>]*>/i.test(input);
  if (!hasMarkup) return input.split(/\r?\n/).map(line => `<p>${escapeHtml(line)}</p>`).join("");

  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, rawTag, attrs) => {
      const tag = String(rawTag).toUpperCase();
      if (!allowedTags.has(tag)) return "";
      const isClosing = full.startsWith("</");
      if (isClosing) return `</${tag.toLowerCase()}>`;
      if (tag === "BR") return "<br>";
      if (tag === "A") {
        const match = String(attrs).match(/href\s*=\s*["']([^"']+)["']/i);
        const href = match?.[1] || "";
        if (!/^https?:\/\//i.test(href)) return "";
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`;
      }
      if (tag === "PRE" || tag === "CODE" || tag === "SPAN") {
        let attrStr = "";
        const classMatch = String(attrs).match(/class\s*=\s*["']([^"']+)["']/i);
        const langMatch = String(attrs).match(/data-language\s*=\s*["']([^"']+)["']/i) || String(attrs).match(/data-lang\s*=\s*["']([^"']+)["']/i);
        if (classMatch && /^[a-zA-Z0-9_\-\s]+$/.test(classMatch[1])) {
          attrStr += ` class="${escapeHtml(classMatch[1])}"`;
        }
        if (langMatch && /^[a-zA-Z0-9_\-]+$/.test(langMatch[1])) {
          attrStr += ` data-language="${escapeHtml(langMatch[1])}"`;
        }
        return `<${tag.toLowerCase()}${attrStr}>`;
      }
      return `<${tag.toLowerCase()}>`;
    });
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
}
