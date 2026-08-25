import { sanitizeRichText } from "../lib/richText";
import { formatArticleHtmlWithCodeblocks, highlightCodeBlock } from "../lib/codeHighlight";
import { extractYouTubeId } from "../components/RichTextEditor";

function runUnitTests() {
  console.log("=== Running Codeblock, Link, YouTube & Image Embed Unit Tests ===");

  // Test 1: Bash code from User Example with Comments & Commands
  const bashSnippet = `# Check if Git is already installed
git --version

# macOS (using Homebrew)
brew install git

# Ubuntu/Debian Linux
sudo apt update && sudo apt install git`;

  const { highlighted, lang } = highlightCodeBlock(bashSnippet, "bash");
  console.log("✓ Bash Syntax Highlight Result (Language:", lang, "):\n", highlighted);

  if (!highlighted.includes("hljs-comment") || !highlighted.includes("hljs-built_in")) {
    throw new Error("Failed: Bash syntax tokens (comment or built_in) missing in highlight output");
  }

  // Test 2: YouTube URL Extraction
  const ytUrls = [
    { input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { input: "https://youtu.be/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { input: "https://www.youtube.com/embed/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { input: "https://www.youtube.com/shorts/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { input: "dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" }
  ];

  for (const { input, expected } of ytUrls) {
    const extracted = extractYouTubeId(input);
    if (extracted !== expected) {
      throw new Error(`Failed: YouTube ID extraction failed for ${input}. Got ${extracted}, expected ${expected}`);
    }
  }
  console.log("✓ YouTube ID extraction passed for all 5 URL formats");

  // Test 3: Link Sanitization with target="_blank" and rel="noopener noreferrer"
  const rawLinkHtml = `<p>Check out our <a href="https://github.com/vectorspace">GitHub Organization</a> for source files.</p>`;
  const sanitizedLink = sanitizeRichText(rawLinkHtml);
  console.log("✓ Sanitized Link:\n", sanitizedLink);

  if (!sanitizedLink.includes('target="_blank"') || !sanitizedLink.includes('rel="noopener noreferrer"')) {
    throw new Error("Failed: Links must include target='_blank' and rel='noopener noreferrer'");
  }

  // Test 4: YouTube Video Embed Container Sanitization
  const rawVideoHtml = `
    <div class="video-embed-wrapper" data-video-id="dQw4w9WgXcQ">
      <div class="video-embed-container">
        <iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Tutorial Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
      <p class="video-caption">🎬 Tutorial Walkthrough</p>
    </div>
  `;
  const sanitizedVideo = sanitizeRichText(rawVideoHtml);
  console.log("✓ Sanitized Video Embed:\n", sanitizedVideo);

  if (!sanitizedVideo.includes('<div class="video-embed-wrapper"') || !sanitizedVideo.includes('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"')) {
    throw new Error("Failed: YouTube iframe was not preserved in sanitization");
  }

  // Test 5: Image Upload & Embed Sanitization
  const rawImageHtml = `
    <figure class="rich-image-figure align-center" style="max-width: 520px; width: 100%;">
      <img src="/api/uploads/general/1787485036469-neural_net.png" alt="Neural Network Architecture" class="rich-image" loading="lazy" />
      <figcaption class="rich-image-caption">Figure 1: Neural Network Architecture</figcaption>
    </figure>
  `;
  const sanitizedImage = sanitizeRichText(rawImageHtml);
  console.log("✓ Sanitized Image Figure:\n", sanitizedImage);

  if (
    !sanitizedImage.includes('<figure class="rich-image-figure align-center"') ||
    !sanitizedImage.includes('src="/api/uploads/general/1787485036469-neural_net.png"') ||
    !sanitizedImage.includes('<figcaption class="rich-image-caption">')
  ) {
    throw new Error("Failed: Image figure was not preserved in sanitization");
  }

  // Test 6: Security - Malicious Iframe & Script Stripping
  const maliciousHtml = `
    <iframe src="https://malicious-site.com/steal-cookies"></iframe>
    <a href="javascript:alert('xss')">Click me</a>
    <img src="javascript:alert('xss')" />
  `;
  const sanitizedMalicious = sanitizeRichText(maliciousHtml);
  console.log("✓ Sanitized Malicious Input:\n", sanitizedMalicious);
  if (
    sanitizedMalicious.includes("malicious-site.com") ||
    sanitizedMalicious.includes("javascript:alert")
  ) {
    throw new Error("Failed: Malicious content was not stripped");
  }

  console.log("\n🎉 All 6 Codeblock, Link, YouTube & Image Embed Tests passed with 100% success!");
}

runUnitTests();
