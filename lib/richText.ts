const allowedTags = new Set(["P","BR","STRONG","B","EM","I","U","H2","H3","H4","UL","OL","LI","BLOCKQUOTE","A"]);

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
      if (tag === "BR") return "<br>";
      if (tag === "A") {
        const match = String(attrs).match(/href\s*=\s*["']([^"']+)["']/i);
        const href = match?.[1] || "";
        if (!/^https?:\/\//i.test(href)) return "";
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`;
      }
      return `<${tag.toLowerCase()}>`;
    });
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
}
