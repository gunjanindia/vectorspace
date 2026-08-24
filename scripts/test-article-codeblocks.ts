import { sanitizeRichText } from "../lib/richText";
import { formatArticleHtmlWithCodeblocks, highlightCodeBlock } from "../lib/codeHighlight";

function runUnitTests() {
  console.log("=== Running Codeblock Black Theme & Syntax Color Unit Tests ===");

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

  // Test 2: Full Article HTML Transformation with Markdown Codeblocks
  const markdownArticle = `
    <h2>Setting Up Version Control</h2>
    <p>Run these commands in your terminal:</p>
    \`\`\`bash
    git --version
    brew install git
    \`\`\`
    <p>Now verify the installation.</p>
  `;

  const formattedHtml = formatArticleHtmlWithCodeblocks(markdownArticle);
  console.log("✓ Formatted Article HTML:\n", formattedHtml);

  if (!formattedHtml.includes('class="code-wrapper"') || !formattedHtml.includes('class="code-header"')) {
    throw new Error("Failed: code-wrapper or code-header missing in formatted output");
  }
  if (!formattedHtml.includes('class="code-copy-btn"') || !formattedHtml.includes('data-raw-code=')) {
    throw new Error("Failed: code-copy-btn or data-raw-code attribute missing in formatted output");
  }
  if (!formattedHtml.includes('class="code-dot code-dot-red"')) {
    throw new Error("Failed: macOS window dots missing in header");
  }

  // Test 3: HTML <pre> Tag Transformation
  const htmlArticle = `
    <h3>Python Function</h3>
    <pre class="code-block" data-language="python"><code>import openai\ndef ask():\n    return 42</code></pre>
  `;
  const formattedHtmlPre = formatArticleHtmlWithCodeblocks(htmlArticle);
  console.log("✓ Formatted HTML <pre>:\n", formattedHtmlPre);
  if (!formattedHtmlPre.includes('data-language="python"') || !formattedHtmlPre.includes('hljs-keyword')) {
    throw new Error("Failed: Python <pre> tag was not transformed with syntax highlighting");
  }

  // Test 4: Sanitization safety
  const sanitized = sanitizeRichText(formattedHtml);
  console.log("✓ Sanitized HTML Output:\n", sanitized);
  if (!sanitized.includes('class="code-block"') && !sanitized.includes('class="code-wrapper"')) {
    throw new Error("Failed: Sanitizer stripped valid code tags");
  }

  console.log("\n🎉 All 4 Black Codeblock & Syntax Color Tests passed with 100% success!");
}

runUnitTests();
