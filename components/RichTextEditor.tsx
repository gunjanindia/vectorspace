"use client";
import { useEffect, useRef, useState } from "react";
import { escapeHtml } from "@/lib/richText";

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
  { id: "bash", name: "Bash / Shell", snippet: `# Check if Git is already installed\ngit --version\n\n# macOS (using Homebrew)\nbrew install git\n\n# Ubuntu/Debian Linux\nsudo apt update && sudo apt install git` },
  { id: "python", name: "Python", snippet: `def process_data(inputs):\n    # Process data and return result\n    result = [x * 2 for x in inputs]\n    return result` },
  { id: "javascript", name: "JavaScript", snippet: `async function fetchData(url) {\n  const res = await fetch(url);\n  const data = await res.json();\n  return data;\n}` },
  { id: "typescript", name: "TypeScript", snippet: `interface User {\n  id: string;\n  name: string;\n  role: 'ADMIN' | 'STUDENT';\n}` },
  { id: "html", name: "HTML / CSS", snippet: `<div class="card">\n  <h2>Title</h2>\n  <p>Content goes here...</p>\n</div>` },
  { id: "sql", name: "SQL", snippet: `SELECT u.id, u.name, COUNT(e.id) AS enrollments\nFROM "User" u\nLEFT JOIN "Enrollment" e ON e."userId" = u.id\nGROUP BY u.id, u.name;` },
  { id: "json", name: "JSON", snippet: `{\n  "status": "success",\n  "code": 200,\n  "data": {\n    "message": "Hello World"\n  }\n}` },
  { id: "cpp", name: "C / C++", snippet: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, Vector Space!" << std::endl;\n    return 0;\n}` },
  { id: "java", name: "Java", snippet: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}` },
  { id: "rust", name: "Rust", snippet: `fn main() {\n    println!("Hello, World!");\n}` },
  { id: "go", name: "Go", snippet: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}` },
  { id: "plaintext", name: "Plain Text", snippet: `// General code or configuration notes here\n` }
];

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const matchV = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchV) return matchV[1];
  const matchShort = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchShort) return matchShort[1];
  const matchEmbed = trimmed.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (matchEmbed) return matchEmbed[1];
  const matchShorts = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (matchShorts) return matchShorts[1];
  return null;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 160 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLang, setSelectedLang] = useState("bash");
  const [showSnippets, setShowSnippets] = useState(false);

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);

  // YouTube Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [videoError, setVideoError] = useState("");

  // Image Upload & Customization Modal State
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageTab, setImageTab] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageAlign, setImageAlign] = useState<"center" | "left" | "right" | "full">("center");
  const [imageSize, setImageSize] = useState<"25%" | "50%" | "75%" | "100%" | "custom">("75%");
  const [customWidth, setCustomWidth] = useState("600px");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isEditingImage, setIsEditingImage] = useState(false);
  const editingFigureRef = useRef<HTMLElement | null>(null);

  // Stored Selection Range for Modals
  const savedRangeRef = useRef<Range | null>(null);

  // Sync external value when needed
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== (value || "")) {
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

  function saveCurrentSelection(): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !ref.current) return false;
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return false;
    savedRangeRef.current = range.cloneRange();
    return true;
  }

  function restoreSelection(): Range | null {
    if (!savedRangeRef.current || !ref.current) {
      const range = document.createRange();
      range.selectNodeContents(ref.current || document.body);
      range.collapse(false);
      return range;
    }
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    return savedRangeRef.current;
  }

  // ==========================================
  // LINK TOOL HANDLERS
  // ==========================================
  function openLinkModal() {
    ref.current?.focus();
    saveCurrentSelection();

    const sel = window.getSelection();
    let currentHref = "";
    let selectedText = "";
    let insideLink = false;

    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      selectedText = range.toString();

      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== ref.current) {
        if (node.nodeName === "A") {
          currentHref = (node as HTMLAnchorElement).getAttribute("href") || "";
          selectedText = node.textContent || selectedText;
          insideLink = true;
          break;
        }
        node = node.parentNode;
      }
    }

    setLinkUrl(currentHref);
    setLinkText(selectedText);
    setIsEditingLink(insideLink);
    setShowLinkModal(true);
  }

  function applyLink() {
    let cleanUrl = linkUrl.trim();
    if (!cleanUrl) return;
    if (!/^https?:\/\//i.test(cleanUrl) && !/^mailto:/i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const range = restoreSelection();
    if (!range || !ref.current) return;

    const textToDisplay = linkText.trim() || cleanUrl;

    let node: Node | null = range.commonAncestorContainer;
    let existingAnchor: HTMLAnchorElement | null = null;
    while (node && node !== ref.current) {
      if (node.nodeName === "A") {
        existingAnchor = node as HTMLAnchorElement;
        break;
      }
      node = node.parentNode;
    }

    if (existingAnchor) {
      existingAnchor.href = cleanUrl;
      existingAnchor.target = "_blank";
      existingAnchor.rel = "noopener noreferrer";
      existingAnchor.className = "rich-link";
      existingAnchor.textContent = textToDisplay;
    } else {
      const anchor = document.createElement("a");
      anchor.href = cleanUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.className = "rich-link";
      anchor.textContent = textToDisplay;

      range.deleteContents();
      range.insertNode(anchor);

      const newRange = document.createRange();
      newRange.setStartAfter(anchor);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    }

    setShowLinkModal(false);
    emit();
  }

  function removeLink() {
    const range = restoreSelection();
    if (!range || !ref.current) return;

    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== ref.current) {
      if (node.nodeName === "A") {
        const parent = node.parentNode;
        while (node.firstChild) parent?.insertBefore(node.firstChild, node);
        parent?.removeChild(node);
        break;
      }
      node = node.parentNode;
    }

    setShowLinkModal(false);
    emit();
  }

  // ==========================================
  // YOUTUBE VIDEO TOOL HANDLERS
  // ==========================================
  function openVideoModal() {
    ref.current?.focus();
    saveCurrentSelection();
    setVideoUrl("");
    setVideoCaption("");
    setVideoError("");
    setShowVideoModal(true);
  }

  function applyVideo() {
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      setVideoError("Please enter a valid YouTube video URL or 11-character Video ID");
      return;
    }

    const range = restoreSelection();
    if (!ref.current) return;

    const wrapper = document.createElement("div");
    wrapper.className = "video-embed-wrapper";
    wrapper.setAttribute("data-video-id", videoId);

    const container = document.createElement("div");
    container.className = "video-embed-container";

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
    iframe.title = videoCaption.trim() || "YouTube video player";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
    iframe.setAttribute("allowfullscreen", "true");

    container.appendChild(iframe);
    wrapper.appendChild(container);

    if (videoCaption.trim()) {
      const captionP = document.createElement("p");
      captionP.className = "video-caption";
      captionP.textContent = `🎬 ${videoCaption.trim()}`;
      wrapper.appendChild(captionP);
    }

    const trailingP = document.createElement("p");
    trailingP.innerHTML = "<br>";

    if (range && ref.current.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(wrapper);
      wrapper.parentNode?.insertBefore(trailingP, wrapper.nextSibling);
    } else {
      ref.current.appendChild(wrapper);
      ref.current.appendChild(trailingP);
    }

    const newRange = document.createRange();
    newRange.setStart(trailingP, 0);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(newRange);

    setShowVideoModal(false);
    emit();
  }

  // ==========================================
  // IMAGE UPLOAD & EMBED HANDLERS
  // ==========================================
  function openImageModal(existingFigure?: HTMLElement) {
    ref.current?.focus();
    saveCurrentSelection();
    setUploadError("");

    if (existingFigure) {
      editingFigureRef.current = existingFigure;
      setIsEditingImage(true);
      const img = existingFigure.querySelector("img");
      const caption = existingFigure.querySelector("figcaption");

      setImageUrl(img?.getAttribute("src") || "");
      setImageAlt(img?.getAttribute("alt") || "");
      setImageCaption(caption?.textContent || "");

      // Detect alignment
      if (existingFigure.classList.contains("align-left")) setImageAlign("left");
      else if (existingFigure.classList.contains("align-right")) setImageAlign("right");
      else if (existingFigure.classList.contains("align-full")) setImageAlign("full");
      else setImageAlign("center");

      // Detect size
      const maxW = existingFigure.style.maxWidth || "";
      if (maxW === "320px") setImageSize("25%");
      else if (maxW === "520px") setImageSize("50%");
      else if (maxW === "720px") setImageSize("75%");
      else if (maxW === "100%") setImageSize("100%");
      else if (maxW) {
        setImageSize("custom");
        setCustomWidth(maxW);
      } else {
        setImageSize("75%");
      }
      setImageTab("url");
    } else {
      editingFigureRef.current = null;
      setIsEditingImage(false);
      setImageUrl("");
      setImageCaption("");
      setImageAlt("");
      setImageAlign("center");
      setImageSize("75%");
      setCustomWidth("600px");
      setImageTab("upload");
    }

    setShowImageModal(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose a valid image file (PNG, JPG, WebP, GIF, or SVG).");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", "general");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }

      setImageUrl(data.url);
      if (!imageAlt) {
        setImageAlt(file.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  }

  function applyImage() {
    const cleanUrl = imageUrl.trim();
    if (!cleanUrl) {
      setUploadError("Please provide an image by uploading or entering a URL.");
      return;
    }

    // Determine max-width style based on selection
    let maxWidthStyle = "720px";
    if (imageSize === "25%") maxWidthStyle = "320px";
    else if (imageSize === "50%") maxWidthStyle = "520px";
    else if (imageSize === "75%") maxWidthStyle = "720px";
    else if (imageSize === "100%") maxWidthStyle = "100%";
    else if (imageSize === "custom") maxWidthStyle = customWidth.trim() || "600px";

    if (isEditingImage && editingFigureRef.current) {
      const fig = editingFigureRef.current;
      fig.className = `rich-image-figure align-${imageAlign}`;
      fig.style.maxWidth = maxWidthStyle;
      fig.style.width = "100%";

      const img = fig.querySelector("img");
      if (img) {
        img.src = cleanUrl;
        img.alt = imageAlt.trim() || imageCaption.trim() || "Article image";
      }

      let captionEl = fig.querySelector("figcaption");
      if (imageCaption.trim()) {
        if (!captionEl) {
          captionEl = document.createElement("figcaption");
          captionEl.className = "rich-image-caption";
          fig.appendChild(captionEl);
        }
        captionEl.textContent = imageCaption.trim();
      } else if (captionEl) {
        captionEl.remove();
      }

      setShowImageModal(false);
      emit();
      return;
    }

    const range = restoreSelection();
    if (!ref.current) return;

    const figure = document.createElement("figure");
    figure.className = `rich-image-figure align-${imageAlign}`;
    figure.style.maxWidth = maxWidthStyle;
    figure.style.width = "100%";

    const img = document.createElement("img");
    img.src = cleanUrl;
    img.alt = imageAlt.trim() || imageCaption.trim() || "Article image";
    img.className = "rich-image";
    img.setAttribute("loading", "lazy");
    figure.appendChild(img);

    if (imageCaption.trim()) {
      const figcaption = document.createElement("figcaption");
      figcaption.className = "rich-image-caption";
      figcaption.textContent = imageCaption.trim();
      figure.appendChild(figcaption);
    }

    const trailingP = document.createElement("p");
    trailingP.innerHTML = "<br>";

    if (range && ref.current.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(figure);
      figure.parentNode?.insertBefore(trailingP, figure.nextSibling);
    } else {
      ref.current.appendChild(figure);
      ref.current.appendChild(trailingP);
    }

    const newRange = document.createRange();
    newRange.setStart(trailingP, 0);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(newRange);

    setShowImageModal(false);
    emit();
  }

  function deleteImage() {
    if (editingFigureRef.current) {
      editingFigureRef.current.remove();
    }
    setShowImageModal(false);
    emit();
  }

  // ==========================================
  // CODE BLOCK HANDLERS
  // ==========================================
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

    if (!pre.nextElementSibling || pre.nextElementSibling.nodeName === "PRE") {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      pre.parentNode?.insertBefore(p, pre.nextSibling);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(code);
    sel.removeAllRanges();
    sel.addRange(newRange);

    emit();
  }

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

  function addParagraphBelow() {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || !ref.current) return;

    const p = document.createElement("p");
    p.innerHTML = "<br>";

    if (sel.rangeCount > 0 && ref.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      let targetBlock: HTMLElement | null = null;
      while (node && node !== ref.current) {
        if (
          node.nodeName === "PRE" ||
          (node as HTMLElement).classList?.contains("video-embed-wrapper") ||
          (node as HTMLElement).classList?.contains("rich-image-figure")
        ) {
          targetBlock = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }

      if (targetBlock) {
        targetBlock.parentNode?.insertBefore(p, targetBlock.nextSibling);
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

  const detectedYouTubeId = videoUrl ? extractYouTubeId(videoUrl) : null;

  return (
    <div
      className="rich-editor"
      onClick={e => {
        const target = e.target as HTMLElement;
        const figure = target.closest("figure.rich-image-figure") as HTMLElement | null;
        if (figure) {
          openImageModal(figure);
        } else if (e.target === e.currentTarget) {
          ref.current?.focus();
        }
      }}
    >
      <div className="rich-toolbar" role="toolbar" aria-label="Text, Media and Code formatting">
        {/* Text styling */}
        {commands.map(([cmd, label, title]) => (
          <button
            key={cmd}
            type="button"
            tabIndex={-1}
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
          tabIndex={-1}
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
          tabIndex={-1}
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
          tabIndex={-1}
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
          tabIndex={-1}
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
          tabIndex={-1}
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

        {/* MEDIA & LINKS (Image Upload, YouTube & Links) */}
        <button
          type="button"
          tabIndex={-1}
          className="rich-tool rich-tool-image"
          title="Upload or Embed Image with Alignment & Size Controls"
          onClick={() => openImageModal()}
        >
          🖼️ Image
        </button>

        <button
          type="button"
          tabIndex={-1}
          className="rich-tool rich-tool-link"
          title="Insert or Edit Link (Opens in New Tab)"
          onClick={openLinkModal}
        >
          🔗 Link
        </button>

        <button
          type="button"
          tabIndex={-1}
          className="rich-tool rich-tool-video"
          title="Embed YouTube Video Player (16:9 LMS Responsive)"
          onClick={openVideoModal}
        >
          🎬 YouTube Video
        </button>

        <div className="toolbar-divider" />

        {/* CODE BLOCK CONTROLS */}
        <div className="rich-tool-group" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <select
            className="rich-lang-select"
            tabIndex={-1}
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
            tabIndex={-1}
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
            tabIndex={-1}
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
              tabIndex={-1}
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
                    tabIndex={-1}
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
            tabIndex={-1}
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
          tabIndex={-1}
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
        tabIndex={0}
        suppressContentEditableWarning
        data-placeholder={placeholder || "Write formatted lesson content with images, videos, codeblocks, and links..."}
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        onKeyDown={handleKeyDown}
      />

      <div className="rich-hint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          💡 <strong>Pro Tip:</strong> Click <strong>🖼️ Image</strong> to upload diagrams & screenshots, or <strong>🎬 YouTube Video</strong> to embed interactive video walkthroughs.
        </span>
      </div>

      {/* ========================================================= */}
      {/* IMAGE UPLOAD & EMBED MODAL */}
      {/* ========================================================= */}
      {showImageModal && (
        <div className="rich-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="rich-modal-card" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="rich-modal-header">
              <h3 className="rich-modal-title">🖼️ {isEditingImage ? "Edit Image" : "Add Image"}</h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <div className="rich-modal-body">
              {/* Tab Selector */}
              {!isEditingImage && (
                <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 8, gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setImageTab("upload")}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: imageTab === "upload" ? "#ffffff" : "transparent",
                      boxShadow: imageTab === "upload" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      fontWeight: 700,
                      fontSize: 13,
                      color: imageTab === "upload" ? "#a21caf" : "#64748b",
                      cursor: "pointer"
                    }}
                  >
                    📁 Upload from Computer
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab("url")}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: imageTab === "url" ? "#ffffff" : "transparent",
                      boxShadow: imageTab === "url" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      fontWeight: 700,
                      fontSize: 13,
                      color: imageTab === "url" ? "#a21caf" : "#64748b",
                      cursor: "pointer"
                    }}
                  >
                    🌐 Image Web URL
                  </button>
                </div>
              )}

              {/* Upload Tab */}
              {imageTab === "upload" && !isEditingImage && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "2px dashed #d8b4fe",
                      background: "#faf5ff",
                      borderRadius: 10,
                      padding: "24px 16px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {isUploading ? (
                      <p style={{ margin: 0, fontWeight: 700, color: "#9333ea" }}>⏳ Uploading image...</p>
                    ) : imageUrl ? (
                      <div>
                        <img
                          src={imageUrl}
                          alt="Uploaded Preview"
                          style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 6, margin: "0 auto 8px" }}
                        />
                        <p style={{ margin: 0, fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
                          ✓ Image Uploaded! Click to choose another file.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: 28, display: "block", marginBottom: 4 }}>📸</span>
                        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                          Click to select an image
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                          Supports PNG, JPG, WebP, GIF, SVG (up to 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* URL Tab */}
              {(imageTab === "url" || isEditingImage) && (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                    Image Source URL <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/diagram.png or /api/uploads/..."
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 14,
                      outline: "none"
                    }}
                  />
                  {imageUrl && (
                    <div style={{ marginTop: 8, textAlign: "center", background: "#f8fafc", padding: 6, borderRadius: 6 }}>
                      <img src={imageUrl} alt="Preview" style={{ maxHeight: 90, maxWidth: "100%", borderRadius: 4 }} />
                    </div>
                  )}
                </div>
              )}

              {uploadError && (
                <p style={{ color: "#ef4444", fontSize: 12, margin: 0, fontWeight: 600 }}>{uploadError}</p>
              )}

              {/* Alignment Controls */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                  Alignment & Flow
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {(
                    [
                      ["center", "↔️ Center"],
                      ["left", "⬅️ Left Wrap"],
                      ["right", "➡️ Right Wrap"],
                      ["full", "↔️ Full Width"]
                    ] as const
                  ).map(([align, label]) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setImageAlign(align)}
                      style={{
                        padding: "8px 4px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: imageAlign === align ? "2px solid #a21caf" : "1px solid #cbd5e1",
                        background: imageAlign === align ? "#fdf4ff" : "#ffffff",
                        color: imageAlign === align ? "#a21caf" : "#334155",
                        cursor: "pointer"
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Controls */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                  Display Width / Size
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {(
                    [
                      ["25%", "Small (25%)"],
                      ["50%", "Medium (50%)"],
                      ["75%", "Large (75%)"],
                      ["100%", "100% Full"],
                      ["custom", "Custom"]
                    ] as const
                  ).map(([size, label]) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      style={{
                        padding: "8px 2px",
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: imageSize === size ? "2px solid #a21caf" : "1px solid #cbd5e1",
                        background: imageSize === size ? "#fdf4ff" : "#ffffff",
                        color: imageSize === size ? "#a21caf" : "#334155",
                        cursor: "pointer",
                        textAlign: "center"
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {imageSize === "custom" && (
                  <input
                    type="text"
                    placeholder="e.g. 450px or 60%"
                    value={customWidth}
                    onChange={e => setCustomWidth(e.target.value)}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      outline: "none"
                    }}
                  />
                )}
              </div>

              {/* Caption & Alt Text */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                  Image Caption (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Figure 1: System Architecture Diagram"
                  value={imageCaption}
                  onChange={e => setImageCaption(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div className="rich-modal-footer">
              {isEditingImage && (
                <button
                  type="button"
                  onClick={deleteImage}
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    padding: "8px 14px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    marginRight: "auto"
                  }}
                >
                  Delete Image
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowImageModal(false)}
                style={{ padding: "8px 14px", fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyImage}
                disabled={!imageUrl.trim() || isUploading}
                style={{ padding: "8px 16px", fontSize: 13, background: "#a21caf", borderColor: "#a21caf" }}
              >
                {isEditingImage ? "Update Image" : "Insert Image"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LINK INSERTION MODAL */}
      {/* ========================================================= */}
      {showLinkModal && (
        <div className="rich-modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="rich-modal-card" onClick={e => e.stopPropagation()}>
            <div className="rich-modal-header">
              <h3 className="rich-modal-title">🔗 {isEditingLink ? "Edit Hyperlink" : "Insert Hyperlink"}</h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>
            <div className="rich-modal-body">
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                  Destination URL <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="url"
                  autoFocus
                  placeholder="https://example.com/docs or https://github.com/..."
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none"
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                  Link Display Text
                </label>
                <input
                  type="text"
                  placeholder="Text shown to students (optional)"
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none"
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                />
              </div>

              <div style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "8px 12px", borderRadius: 6 }}>
                🛡️ <em>Links will automatically open in a safe <strong>new browser tab</strong> (<code>target="_blank"</code>).</em>
              </div>
            </div>

            <div className="rich-modal-footer">
              {isEditingLink && (
                <button
                  type="button"
                  onClick={removeLink}
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    padding: "8px 14px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    marginRight: "auto"
                  }}
                >
                  Unlink
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLinkModal(false)}
                style={{ padding: "8px 14px", fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyLink}
                disabled={!linkUrl.trim()}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                {isEditingLink ? "Save Link" : "Insert Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* YOUTUBE VIDEO EMBED MODAL */}
      {/* ========================================================= */}
      {showVideoModal && (
        <div className="rich-modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="rich-modal-card" onClick={e => e.stopPropagation()}>
            <div className="rich-modal-header">
              <h3 className="rich-modal-title">🎬 Embed YouTube Video</h3>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>
            <div className="rich-modal-body">
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                  YouTube Video Link or ID <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="url"
                  autoFocus
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={videoUrl}
                  onChange={e => {
                    setVideoUrl(e.target.value);
                    setVideoError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: videoError ? "1px solid #ef4444" : "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none"
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyVideo();
                    }
                  }}
                />
                {videoError && (
                  <p style={{ color: "#ef4444", fontSize: 12, margin: "5px 0 0", fontWeight: 600 }}>{videoError}</p>
                )}
                {detectedYouTubeId && !videoError && (
                  <p style={{ color: "#16a34a", fontSize: 12, margin: "5px 0 0", fontWeight: 600 }}>
                    ✓ Valid YouTube ID: <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 4 }}>{detectedYouTubeId}</code>
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                  Video Title / Caption (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Video Walkthrough: Setting Up Transformer Models"
                  value={videoCaption}
                  onChange={e => setVideoCaption(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none"
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyVideo();
                    }
                  }}
                />
              </div>

              <div style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                📺 <strong>LMS Responsive 16:9:</strong> Embeds with privacy-enhanced mode (<code>youtube-nocookie.com</code>), fullscreen support, and seamless scaling on mobile, tablet, and desktop screens.
              </div>
            </div>

            <div className="rich-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowVideoModal(false)}
                style={{ padding: "8px 14px", fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyVideo}
                disabled={!videoUrl.trim()}
                style={{ padding: "8px 16px", fontSize: 13, background: "#dc2626", borderColor: "#dc2626" }}
              >
                Insert Video Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
