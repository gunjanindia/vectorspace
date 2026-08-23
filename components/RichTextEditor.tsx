"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

const commands = [
  ["bold", "B", "Bold (Ctrl+B)"],
  ["italic", "I", "Italic (Ctrl+I)"],
  ["underline", "U", "Underline (Ctrl+U)"]
] as const;

const LANGUAGES = [
  { id: "python", name: "Python", snippet: `def process_data(inputs):\n    # Process data and return result\n    result = [x * 2 for x in inputs]\n    return result` },
  { id: "javascript", name: "JavaScript", snippet: `async function fetchData(url) {\n  const res = await fetch(url);\n  const data = await res.json();\n  return data;\n}` },
  { id: "typescript", name: "TypeScript", snippet: `interface User {\n  id: string;\n  name: string;\n  role: 'ADMIN' | 'STUDENT';\n}` },
  { id: "html", name: "HTML / CSS", snippet: `<div class="card">\n  <h2>Title</h2>\n  <p>Content goes here...</p>\n</div>` },
  { id: "sql", name: "SQL", snippet: `SELECT u.id, u.name, COUNT(e.id) AS enrollments\nFROM "User" u\nLEFT JOIN "Enrollment" e ON e."userId" = u.id\nGROUP BY u.id, u.name;` },
  { id: "json", name: "JSON", snippet: `{\n  "status": "success",\n  "code": 200,\n  "data": {\n    "message": "Hello World"\n  }\n}` },
  { id: "bash", name: "Bash / Shell", snippet: `# Install dependencies and start development server\nnpm install\nnpm run dev` },
  { id: "cpp", name: "C / C++", snippet: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, Vector Space!" << std::endl;\n    return 0;\n}` },
  { id: "java", name: "Java", snippet: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}` },
  { id: "rust", name: "Rust", snippet: `fn main() {\n    println!("Hello, World!");\n}` },
  { id: "go", name: "Go", snippet: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}` },
  { id: "plaintext", name: "Plain Text", snippet: `// General code or configuration notes here\n` }
];

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 160 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedLang, setSelectedLang] = useState("python");
  const [showSnippets, setShowSnippets] = useState(false);

  // Sync external value when needed
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== (value || "")) {
      // Only replace innerHTML if editor is not currently focused by user
      if (document.activeElement !== ref.current && !ref.current.contains(document.activeElement)) {
        ref.current.innerHTML = value || "";
      }
    }
  }, [value]);

  function emit() {
    if (ref.current) {
      onChange(ref.current.innerHTML || "");
    }
  }

  function command(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  }

  // Insert or toggle code block
  function insertCodeBlock(langId = selectedLang, customCode?: string) {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || !ref.current) return;

    let range: Range;
    if (sel.rangeCount > 0 && ref.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
    }

    // Check if cursor is already inside a <pre>
    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== ref.current) {
      if (node.nodeName === "PRE") {
        const preEl = node as HTMLElement;
        preEl.setAttribute("data-language", langId);
        const codeEl = preEl.querySelector("code");
        if (codeEl) {
          codeEl.className = `language-${langId}`;
        }
        emit();
        return;
      }
      node = node.parentNode;
    }

    const selectedText = range.toString();
    const snippetObj = LANGUAGES.find(l => l.id === langId);
    const codeText = customCode || selectedText || snippetObj?.snippet || `// Write ${snippetObj?.name || "code"} here...\n`;

    const pre = document.createElement("pre");
    pre.className = "code-block";
    pre.setAttribute("data-language", langId);

    const code = document.createElement("code");
    code.className = `language-${langId}`;
    code.textContent = codeText;
    pre.appendChild(code);

    range.deleteContents();
    range.insertNode(pre);

    // Add trailing paragraph after pre if none exists
    if (!pre.nextElementSibling || pre.nextElementSibling.nodeName === "PRE") {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      pre.parentNode?.insertBefore(p, pre.nextSibling);
    }

    // Place selection inside the code block
    const newRange = document.createRange();
    newRange.selectNodeContents(code);
    sel.removeAllRanges();
    sel.addRange(newRange);

    emit();
  }

  // Toggle inline code
  function insertInlineCode() {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || !ref.current || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return;

    let node: Node | null = range.commonAncestorContainer;
    let insideCode = false;
    while (node && node !== ref.current) {
      if (node.nodeName === "CODE" && node.parentNode?.nodeName !== "PRE") {
        insideCode = true;
        // Unwrap inline code
        const parent = node.parentNode;
        while (node.firstChild) parent?.insertBefore(node.firstChild, node);
        parent?.removeChild(node);
        emit();
        return;
      }
      node = node.parentNode;
    }

    if (!insideCode) {
      const selectedText = range.toString() || "code";
      const codeEl = document.createElement("code");
      codeEl.className = "inline-code";
      codeEl.textContent = selectedText;

      range.deleteContents();
      range.insertNode(codeEl);

      const newRange = document.createRange();
      newRange.setStartAfter(codeEl);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      emit();
    }
  }

  // Add paragraph after codeblock to easily continue typing
  function addParagraphBelow() {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || !ref.current) return;

    const p = document.createElement("p");
    p.innerHTML = "<br>";

    if (sel.rangeCount > 0 && ref.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      let targetPre: HTMLElement | null = null;
      while (node && node !== ref.current) {
        if (node.nodeName === "PRE") {
          targetPre = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }

      if (targetPre) {
        targetPre.parentNode?.insertBefore(p, targetPre.nextSibling);
      } else {
        ref.current.appendChild(p);
      }
    } else {
      ref.current.appendChild(p);
    }

    const newRange = document.createRange();
    newRange.setStart(p, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    emit();
  }

  // Keyboard navigation & indentation handling inside code blocks
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !ref.current) return;

    const range = sel.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    let insidePre = false;

    while (node && node !== ref.current) {
      if (node.nodeName === "PRE") {
        insidePre = true;
        break;
      }
      node = node.parentNode;
    }

    if (insidePre) {
      if (e.key === "Tab") {
        e.preventDefault();
        // Insert 2 spaces
        const tabText = document.createTextNode("  ");
        range.deleteContents();
        range.insertNode(tabText);
        range.setStartAfter(tabText);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        emit();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // Insert newline inside pre
        const newline = document.createTextNode("\n");
        range.deleteContents();
        range.insertNode(newline);
        range.setStartAfter(newline);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        emit();
      }
    }
  }

  return (
    <div className="rich-editor">
      <div className="rich-toolbar" role="toolbar" aria-label="Text and Code formatting">
        {/* Text styling */}
        {commands.map(([cmd, label, title]) => (
          <button
            key={cmd}
            type="button"
            className="rich-tool"
            title={title}
            onMouseDown={e => {
              e.preventDefault();
              command(cmd);
            }}
          >
            {label}
          </button>
        ))}

        <div className="toolbar-divider" />

        {/* Headings & Lists */}
        <button
          type="button"
          className="rich-tool"
          title="Heading 2"
          onMouseDown={e => {
            e.preventDefault();
            command("formatBlock", "<h2>");
          }}
        >
          H2
        </button>
        <button
          type="button"
          className="rich-tool"
          title="Heading 3"
          onMouseDown={e => {
            e.preventDefault();
            command("formatBlock", "<h3>");
          }}
        >
          H3
        </button>
        <button
          type="button"
          className="rich-tool"
          title="Bulleted list"
          onMouseDown={e => {
            e.preventDefault();
            command("insertUnorderedList");
          }}
        >
          • List
        </button>
        <button
          type="button"
          className="rich-tool"
          title="Numbered list"
          onMouseDown={e => {
            e.preventDefault();
            command("insertOrderedList");
          }}
        >
          1. List
        </button>
        <button
          type="button"
          className="rich-tool"
          title="Quote"
          onMouseDown={e => {
            e.preventDefault();
            command("formatBlock", "<blockquote>");
          }}
        >
          ❝ Quote
        </button>

        <div className="toolbar-divider" />

        {/* CODE BLOCK CONTROLS */}
        <div className="rich-tool-group" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <select
            className="rich-lang-select"
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value)}
            title="Select Code Language"
          >
            {LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="rich-tool rich-tool-code"
            title="Insert or Convert to Code Block"
            onMouseDown={e => {
              e.preventDefault();
              insertCodeBlock(selectedLang);
            }}
          >
            💻 &lt;/&gt; Code Block
          </button>

          <button
            type="button"
            className="rich-tool"
            title="Inline Code Tag"
            onMouseDown={e => {
              e.preventDefault();
              insertInlineCode();
            }}
          >
            `Code`
          </button>

          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              className="rich-tool"
              title="Insert Preset Snippet"
              onClick={() => setShowSnippets(!showSnippets)}
            >
              ⚡ Snippets ▾
            </button>

            {showSnippets && (
              <div
                className="snippets-dropdown"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 20,
                  marginTop: 4,
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  minWidth: 190,
                  padding: "4px 0"
                }}
              >
                {LANGUAGES.slice(0, 7).map(lang => (
                  <button
                    key={lang.id}
                    type="button"
                    style={{
                      display: "flex",
                      width: "100%",
                      padding: "8px 14px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1e293b"
                    }}
                    onMouseDown={e => {
                      e.preventDefault();
                      insertCodeBlock(lang.id, lang.snippet);
                      setShowSnippets(false);
                    }}
                  >
                    + {lang.name} Snippet
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rich-tool"
            title="Insert regular paragraph below current block"
            onMouseDown={e => {
              e.preventDefault();
              addParagraphBelow();
            }}
          >
            ↵ Add Text Below
          </button>
        </div>

        <div className="toolbar-divider" />

        <button
          type="button"
          className="rich-tool"
          title="Clear formatting"
          onMouseDown={e => {
            e.preventDefault();
            command("removeFormat");
          }}
        >
          Clear
        </button>
      </div>

      <div
        ref={ref}
        className="rich-content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || "Write formatted lesson content with codeblocks..."}
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        onKeyDown={handleKeyDown}
      />

      <div className="rich-hint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          💡 <strong>Pro Tip:</strong> Click <strong>&lt;/&gt; Code Block</strong> to insert formatted code. Press{" "}
          <kbd style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>Tab</kbd> inside code for indentation, and click <strong>↵ Add Text Below</strong> to continue writing.
        </span>
      </div>
    </div>
  );
}
