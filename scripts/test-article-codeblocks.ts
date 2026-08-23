import { sanitizeRichText } from "../lib/richText";

function runUnitTests() {
  console.log("=== Running Codeblock Sanitization Unit Tests ===");

  // Test 1: Python codeblock
  const pythonHtml = `
    <h2>Python LLM Function</h2>
    <pre class="code-block" data-language="python"><code class="language-python">import openai

def ask_llm(prompt: str) -> str:
    # Query GPT-4
    return "response"
</code></pre>
  `;
  const sanitizedPython = sanitizeRichText(pythonHtml);
  console.log("✓ Sanitized Python:\n", sanitizedPython);
  if (!sanitizedPython.includes('<pre class="code-block" data-language="python"><code class="language-python">')) {
    throw new Error("Failed: Python codeblock attributes not preserved");
  }

  // Test 2: JavaScript & TypeScript codeblock
  const jsHtml = `
    <h3>JavaScript Fetch Handler</h3>
    <pre class="code-block" data-language="javascript"><code class="language-javascript">async function getCourses() {
  const res = await fetch("/api/courses");
  return await res.json();
}</code></pre>
  `;
  const sanitizedJs = sanitizeRichText(jsHtml);
  console.log("✓ Sanitized JavaScript:\n", sanitizedJs);
  if (!sanitizedJs.includes('data-language="javascript"') || !sanitizedJs.includes('language-javascript')) {
    throw new Error("Failed: JavaScript codeblock attributes not preserved");
  }

  // Test 3: SQL codeblock with inline code
  const sqlHtml = `
    <p>Run the query below on the <code>Course</code> table:</p>
    <pre class="code-block" data-language="sql"><code class="language-sql">SELECT id, title, price FROM "Course" WHERE published = true;</code></pre>
  `;
  const sanitizedSql = sanitizeRichText(sqlHtml);
  console.log("✓ Sanitized SQL:\n", sanitizedSql);
  if (!sanitizedSql.includes('<code>Course</code>') || !sanitizedSql.includes('data-language="sql"')) {
    throw new Error("Failed: SQL codeblock or inline code not preserved");
  }

  // Test 4: Security XSS stripping while preserving codeblock
  const maliciousHtml = `
    <script>alert("xss")</script>
    <p>Safe paragraph</p>
    <pre class="code-block" data-language="bash"><code class="language-bash">npm install --save react</code></pre>
    <img src="x" onerror="alert(1)" />
  `;
  const sanitizedMalicious = sanitizeRichText(maliciousHtml);
  console.log("✓ Sanitized Malicious Input:\n", sanitizedMalicious);
  if (sanitizedMalicious.includes("<script>") || sanitizedMalicious.includes("onerror")) {
    throw new Error("Failed: Malicious script/tags were not stripped");
  }
  if (!sanitizedMalicious.includes('<pre class="code-block" data-language="bash"><code class="language-bash">npm install --save react</code></pre>')) {
    throw new Error("Failed: Codeblock inside malicious string was not preserved cleanly");
  }

  console.log("\n🎉 All 4 Codeblock Sanitization Unit Tests passed with 100% success!");
}

runUnitTests();
