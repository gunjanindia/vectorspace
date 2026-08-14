"use client";
import { useEffect, useRef } from "react";

type Props = { value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number };

const commands = [
  ["bold", "B", "Bold"], ["italic", "I", "Italic"], ["underline", "U", "Underline"],
] as const;

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 150 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!ref.current || initialized.current) return;
    ref.current.innerHTML = value || "";
    initialized.current = true;
  }, [value]);

  function command(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML || "");
  }

  function emit() { onChange(ref.current?.innerHTML || ""); }

  return (
    <div className="rich-editor">
      <div className="rich-toolbar" role="toolbar" aria-label="Text formatting">
        {commands.map(([cmd, label, title]) => (
          <button key={cmd} type="button" className="rich-tool" title={title} onMouseDown={e => { e.preventDefault(); command(cmd); }}>{label}</button>
        ))}
        <button type="button" className="rich-tool" title="Heading" onMouseDown={e => { e.preventDefault(); command("formatBlock", "<h3>"); }}>H</button>
        <button type="button" className="rich-tool" title="Bulleted list" onMouseDown={e => { e.preventDefault(); command("insertUnorderedList"); }}>• List</button>
        <button type="button" className="rich-tool" title="Numbered list" onMouseDown={e => { e.preventDefault(); command("insertOrderedList"); }}>1. List</button>
        <button type="button" className="rich-tool" title="Quote" onMouseDown={e => { e.preventDefault(); command("formatBlock", "<blockquote>"); }}>❝</button>
        <button type="button" className="rich-tool" title="Clear formatting" onMouseDown={e => { e.preventDefault(); command("removeFormat"); }}>Clear</button>
      </div>
      <div
        ref={ref}
        className="rich-content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || "Write formatted text..."}
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
      />
      <div className="rich-hint">Use the toolbar for headings, bold, lists and emphasis. Formatting is shown to students exactly as saved.</div>
    </div>
  );
}
