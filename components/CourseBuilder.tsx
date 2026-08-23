"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";

type QuizQuestionDraft = {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  hint: string;
  starsReward: number;
};

type LessonResource = {
  id: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  videoUrl: string | null;
  content: string | null;
  durationMin: number;
  sortOrder: number;
  resources?: LessonResource[];
};

type Module = {
  id: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
};

type Course = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  level: string;
  durationHours: number;
  pricePaise: number;
  mode: string;
  published: boolean;
  featured: boolean;
  thumbnailUrl: string | null;
  modules: Module[];
};

const types = ["VIDEO", "ARTICLE", "PDF", "LIVE", "LINK", "QUIZ", "ASSIGNMENT"];

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getResourceBadgeIcon(fileType: string) {
  switch (fileType?.toLowerCase()) {
    case "pdf": return "📕 PDF";
    case "pptx": return "📙 PPTX";
    case "docx": return "📘 DOCX";
    case "image": return "🖼️ IMAGE";
    case "archive": return "📦 ARCHIVE";
    default: return "📄 FILE";
  }
}

export default function CourseBuilder({ course: initial }: { course: Course }) {
  const router = useRouter();
  const [course, setCourse] = useState(initial);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: initial.title,
    slug: initial.slug,
    shortDescription: initial.shortDescription,
    description: initial.description,
    level: initial.level,
    durationHours: String(initial.durationHours),
    price: String(initial.pricePaise / 100),
    mode: initial.mode,
    featured: initial.featured,
    published: initial.published
  });

  const [lessonDraft, setLessonDraft] = useState<
    Record<string, { title: string; type: string; durationMin: string; videoUrl: string; content: string }>
  >({});
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonEditForm, setLessonEditForm] = useState<{
    moduleId: string;
    title: string;
    description: string;
    type: string;
    videoUrl: string;
    content: string;
    durationMin: string;
  } | null>(null);

  // Attached Lesson Resources & Media Upload State
  const [lessonResources, setLessonResources] = useState<LessonResource[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Quiz Questions for editing lesson
  const [quizDraftQuestions, setQuizDraftQuestions] = useState<QuizQuestionDraft[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const call = async (url: string, method: string = "PATCH", body?: unknown) => {
    setBusy(url);
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const d = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  };

  async function saveCourse() {
    try {
      const d = await call(`/api/admin/courses/${course.id}`, "PATCH", courseForm);
      setCourse({ ...course, ...d.course });
      alert("Course details saved successfully");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function addModule() {
    const title = prompt("Module title");
    if (!title) return;
    try {
      const d = await call(`/api/admin/courses/${course.id}/modules`, "POST", { title });
      setCourse(c => ({ ...c, modules: [...c.modules, d.module] }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not add module");
    }
  }

  async function deleteModule(id: string) {
    if (!confirm("Delete this module and all its lessons?")) return;
    try {
      await call(`/api/admin/courses/${course.id}/modules/${id}`, "DELETE");
      setCourse(c => ({ ...c, modules: c.modules.filter(m => m.id !== id) }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete module");
    }
  }

  async function moveModule(id: string, dir: -1 | 1) {
    const i = course.modules.findIndex(m => m.id === id);
    const j = i + dir;
    if (j < 0 || j >= course.modules.length) return;
    const ids = course.modules.map(m => m.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await call(`/api/admin/courses/${course.id}/modules/${id}`, "PATCH", { sortOrder: j + 1, orderedIds: ids });
      setCourse(c => ({
        ...c,
        modules: ids.map((x, k) => ({ ...c.modules.find(m => m.id === x)!, sortOrder: k + 1 }))
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not reorder");
    }
  }

  async function addLesson(m: Module) {
    const d = lessonDraft[m.id] || { title: "", type: "VIDEO", durationMin: "0", videoUrl: "", content: "" };
    if (!d.title.trim()) return alert("Enter a lesson title first");
    try {
      const r = await call(`/api/admin/courses/${course.id}/modules/${m.id}/lessons`, "POST", d);
      setCourse(c => ({
        ...c,
        modules: c.modules.map(x => (x.id === m.id ? { ...x, lessons: [...x.lessons, r.lesson] } : x))
      }));
      setLessonDraft({
        ...lessonDraft,
        [m.id]: { title: "", type: "VIDEO", durationMin: "0", videoUrl: "", content: "" }
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not add lesson");
    }
  }

  async function deleteLesson(m: Module, l: Lesson) {
    if (!confirm(`Delete lesson “${l.title}”?`)) return;
    try {
      await call(`/api/admin/courses/${course.id}/modules/${m.id}/lessons/${l.id}`, "DELETE");
      setCourse(c => ({
        ...c,
        modules: c.modules.map(x => (x.id === m.id ? { ...x, lessons: x.lessons.filter(y => y.id !== l.id) } : x))
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete lesson");
    }
  }

  async function moveLesson(m: Module, l: Lesson, dir: -1 | 1) {
    const i = m.lessons.findIndex(x => x.id === l.id);
    const j = i + dir;
    if (j < 0 || j >= m.lessons.length) return;
    const ids = m.lessons.map(x => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await call(`/api/admin/courses/${course.id}/modules/${m.id}/lessons/${l.id}`, "PATCH", {
        sortOrder: j + 1,
        orderedIds: ids
      });
      setCourse(c => ({
        ...c,
        modules: c.modules.map(x =>
          x.id === m.id ? { ...x, lessons: ids.map((id, k) => ({ ...x.lessons.find(y => y.id === id)!, sortOrder: k + 1 })) } : x
        )
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not reorder lesson");
    }
  }

  async function togglePublish() {
    try {
      const d = await call(`/api/admin/courses/${course.id}`, "PATCH", { published: !course.published });
      setCourse({ ...course, ...d.course });
      setCourseForm({ ...courseForm, published: d.course.published });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not update publish state");
    }
  }

  async function openEditLesson(m: Module, l: Lesson) {
    setEditingLessonId(l.id);
    setLessonEditForm({
      moduleId: m.id,
      title: l.title,
      description: l.description || "",
      type: l.type,
      videoUrl: l.videoUrl || "",
      content: l.content || "",
      durationMin: String(l.durationMin)
    });

    // Fetch attached resources for this lesson
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/modules/${m.id}/lessons/${l.id}/resources`);
      if (res.ok) {
        const data = await res.json();
        setLessonResources(data.resources || []);
      }
    } catch (err) {
      console.error("Error fetching lesson resources:", err);
    }

    if (l.type === "QUIZ") {
      try {
        setLoadingQuiz(true);
        const res = await fetch(`/api/admin/courses/${course.id}/modules/${m.id}/lessons/${l.id}/quiz`);
        if (res.ok) {
          const data = await res.json();
          setQuizDraftQuestions(
            data.questions?.map((q: any) => ({
              id: q.id,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || "",
              hint: q.hint || "",
              starsReward: q.starsReward || 10
            })) || []
          );
        }
      } catch (err) {
        console.error("Error loading quiz questions:", err);
      } finally {
        setLoadingQuiz(false);
      }
    } else {
      setQuizDraftQuestions([]);
    }
  }

  function closeEditLesson() {
    setEditingLessonId(null);
    setLessonEditForm(null);
    setLessonResources([]);
    setQuizDraftQuestions([]);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingLessonId || !lessonEditForm) return;

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", course.id);
      formData.append("lessonId", editingLessonId);
      formData.append("title", file.name);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (data.resource) {
        setLessonResources(prev => [...prev, data.resource]);
      }

      // Auto-fill videoUrl/resourceUrl if currently blank
      if (!lessonEditForm.videoUrl) {
        setLessonEditForm(prev => (prev ? { ...prev, videoUrl: data.url } : null));
      }

      alert(`Uploaded "${data.fileName}" successfully to course/lesson storage!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  }

  async function handleDeleteResource(resourceId: string) {
    if (!confirm("Are you sure you want to delete this resource file?")) return;
    if (!editingLessonId || !lessonEditForm) return;

    try {
      const res = await fetch(
        `/api/admin/courses/${course.id}/modules/${lessonEditForm.moduleId}/lessons/${editingLessonId}/resources?resourceId=${resourceId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Could not delete resource");

      setLessonResources(prev => prev.filter(r => r.id !== resourceId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete resource");
    }
  }

  function addQuizQuestionDraft() {
    setQuizDraftQuestions(prev => [
      ...prev,
      {
        question: `Question ${prev.length + 1}`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
        explanation: "",
        hint: "",
        starsReward: 10
      }
    ]);
  }

  function removeQuizQuestionDraft(index: number) {
    setQuizDraftQuestions(prev => prev.filter((_, i) => i !== index));
  }

  function updateQuestionField(index: number, field: keyof QuizQuestionDraft, val: any) {
    setQuizDraftQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, [field]: val } : q))
    );
  }

  function updateOptionText(qIndex: number, optIndex: number, text: string) {
    setQuizDraftQuestions(prev =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((opt, oi) => (oi === optIndex ? text : opt))
            }
          : q
      )
    );
  }

  function addOptionToQuestion(qIndex: number) {
    setQuizDraftQuestions(prev =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`]
            }
          : q
      )
    );
  }

  function removeOptionFromQuestion(qIndex: number, optIndex: number) {
    setQuizDraftQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.options.length <= 2) {
          alert("A question must have at least 2 options.");
          return q;
        }
        const nextOpts = q.options.filter((_, oi) => oi !== optIndex);
        const nextCorrect = q.correctAnswer >= nextOpts.length ? nextOpts.length - 1 : q.correctAnswer;
        return {
          ...q,
          options: nextOpts,
          correctAnswer: nextCorrect
        };
      })
    );
  }

  async function saveEditedLesson() {
    if (!editingLessonId || !lessonEditForm || !lessonEditForm.title.trim()) {
      return alert("Lesson title is required");
    }

    try {
      const d = await call(
        `/api/admin/courses/${course.id}/modules/${lessonEditForm.moduleId}/lessons/${editingLessonId}`,
        "PATCH",
        {
          title: lessonEditForm.title,
          description: lessonEditForm.description,
          type: lessonEditForm.type,
          videoUrl: lessonEditForm.videoUrl,
          content: lessonEditForm.content,
          durationMin: lessonEditForm.durationMin
        }
      );

      // If lesson type is QUIZ, save quiz questions as well
      if (lessonEditForm.type === "QUIZ") {
        await call(
          `/api/admin/courses/${course.id}/modules/${lessonEditForm.moduleId}/lessons/${editingLessonId}/quiz`,
          "POST",
          { questions: quizDraftQuestions }
        );
      }

      setCourse(c => ({
        ...c,
        modules: c.modules.map(m =>
          m.id === lessonEditForm.moduleId
            ? {
                ...m,
                lessons: m.lessons.map(l => (l.id === editingLessonId ? { ...l, ...d.lesson } : l))
              }
            : m
        )
      }));

      closeEditLesson();
      alert("Lesson & Quiz details updated successfully!");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save lesson");
    }
  }

  return (
    <div>
      <div className="card builder-toolbar">
        <div>
          <strong>{course.published ? "Published" : "Draft"}</strong>
          <span className="muted">
            {" "}· {course.modules.length} modules · {course.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>
            {editing ? "Close Course Details" : "Edit Course Details"}
          </button>
          <button className="btn btn-primary" onClick={togglePublish}>
            {course.published ? "Unpublish" : "Publish Course"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="card" style={{ marginTop: 15 }}>
          <h2>Course Details</h2>
          <div className="grid grid-2">
            <label>
              Title
              <input
                className="input"
                value={courseForm.title}
                onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
              />
            </label>
            <label>
              Slug
              <input
                className="input"
                value={courseForm.slug}
                onChange={e => setCourseForm({ ...courseForm, slug: e.target.value })}
              />
            </label>
            <label>
              Level
              <input
                className="input"
                value={courseForm.level}
                onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}
              />
            </label>
            <label>
              Duration (Hours)
              <input
                className="input"
                type="number"
                value={courseForm.durationHours}
                onChange={e => setCourseForm({ ...courseForm, durationHours: e.target.value })}
              />
            </label>
            <label>
              Price ₹
              <input
                className="input"
                type="number"
                value={courseForm.price}
                onChange={e => setCourseForm({ ...courseForm, price: e.target.value })}
              />
            </label>
            <label>
              Mode
              <select
                className="input"
                value={courseForm.mode}
                onChange={e => setCourseForm({ ...courseForm, mode: e.target.value })}
              >
                {["ONLINE", "OFFLINE", "HYBRID", "SELF_PACED"].map(x => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", marginBottom: 4 }}>Short description</div>
            <RichTextEditor
              value={courseForm.shortDescription}
              onChange={v => setCourseForm({ ...courseForm, shortDescription: v })}
              placeholder="Write a concise formatted course summary..."
              minHeight={110}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", marginBottom: 4 }}>Description</div>
            <RichTextEditor
              value={courseForm.description}
              onChange={v => setCourseForm({ ...courseForm, description: v })}
              placeholder="Write the complete course description..."
              minHeight={220}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
            <input
              type="checkbox"
              checked={courseForm.featured}
              onChange={e => setCourseForm({ ...courseForm, featured: e.target.checked })}
            />{" "}
            Featured on Homepage
          </label>
          <button className="btn btn-primary" onClick={saveCourse}>
            Save Course Details
          </button>
        </div>
      )}

      <div className="builder-head">
        <h2>Curriculum</h2>
        <button className="btn btn-primary" onClick={addModule}>
          + Add Module
        </button>
      </div>

      {course.modules.map((m, mi) => (
        <div className="card builder-module" key={m.id}>
          <div className="module-head">
            <div>
              <span className="badge">MODULE {mi + 1}</span>
              <h3>{m.title}</h3>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-secondary" onClick={() => moveModule(m.id, -1)}>
                ↑
              </button>
              <button className="btn btn-secondary" onClick={() => moveModule(m.id, 1)}>
                ↓
              </button>
              <button className="btn btn-danger" onClick={() => deleteModule(m.id)}>
                Delete
              </button>
            </div>
          </div>

          {m.lessons.map((l, li) => (
            <div className="builder-lesson" key={l.id}>
              <div>
                <strong>
                  {li + 1}. {l.title}
                </strong>
                <span className={`badge ${l.type === "QUIZ" ? "badge-quiz" : ""}`} style={{ marginLeft: 8 }}>
                  {l.type === "QUIZ" ? "⭐ QUIZ" : l.type}
                </span>
                <span className="muted" style={{ marginLeft: 8 }}>
                  {l.durationMin} min
                </span>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <button className="btn btn-secondary" onClick={() => openEditLesson(m, l)}>
                  Edit
                </button>
                <button className="btn btn-secondary" onClick={() => moveLesson(m, l, -1)}>
                  ↑
                </button>
                <button className="btn btn-secondary" onClick={() => moveLesson(m, l, 1)}>
                  ↓
                </button>
                <button className="btn btn-danger" onClick={() => deleteLesson(m, l)}>
                  Delete
                </button>
              </div>
            </div>
          ))}

          {/* Quick Add Lesson */}
          <div className="lesson-add">
            <input
              className="input"
              placeholder="Lesson title"
              value={lessonDraft[m.id]?.title || ""}
              onChange={e =>
                setLessonDraft({
                  ...lessonDraft,
                  [m.id]: {
                    ...(lessonDraft[m.id] || { type: "VIDEO", durationMin: "0", videoUrl: "", content: "" }),
                    title: e.target.value
                  }
                })
              }
            />
            <select
              className="input"
              value={lessonDraft[m.id]?.type || "VIDEO"}
              onChange={e =>
                setLessonDraft({
                  ...lessonDraft,
                  [m.id]: {
                    ...(lessonDraft[m.id] || { title: "", durationMin: "0", videoUrl: "", content: "" }),
                    type: e.target.value
                  }
                })
              }
            >
              {types.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Minutes"
              value={lessonDraft[m.id]?.durationMin || "0"}
              onChange={e =>
                setLessonDraft({
                  ...lessonDraft,
                  [m.id]: {
                    ...(lessonDraft[m.id] || { title: "", type: "VIDEO", videoUrl: "", content: "" }),
                    durationMin: e.target.value
                  }
                })
              }
            />
            <input
              className="input"
              placeholder="Video / PDF / resource URL"
              value={lessonDraft[m.id]?.videoUrl || ""}
              onChange={e =>
                setLessonDraft({
                  ...lessonDraft,
                  [m.id]: {
                    ...(lessonDraft[m.id] || { title: "", type: "VIDEO", durationMin: "0", content: "" }),
                    videoUrl: e.target.value
                  }
                })
              }
            />
            <button className="btn btn-primary" onClick={() => addLesson(m)}>
              Add Lesson
            </button>
          </div>
        </div>
      ))}

      {/* Full Lesson & Quiz Editor Modal / Form */}
      {editingLessonId && lessonEditForm && (
        <div className="card" style={{ marginTop: 20, border: "2px solid var(--blue)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h2>Edit Lesson: {lessonEditForm.title}</h2>
            <button className="btn btn-secondary" onClick={closeEditLesson}>
              ✕ Close
            </button>
          </div>

          <div className="grid grid-2">
            <label>
              Title
              <input
                className="input"
                value={lessonEditForm.title}
                onChange={e => setLessonEditForm({ ...lessonEditForm, title: e.target.value })}
              />
            </label>
            <label>
              Lesson Type
              <select
                className="input"
                value={lessonEditForm.type}
                onChange={e => setLessonEditForm({ ...lessonEditForm, type: e.target.value })}
              >
                {types.map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Duration (minutes)
              <input
                className="input"
                type="number"
                min="0"
                value={lessonEditForm.durationMin}
                onChange={e => setLessonEditForm({ ...lessonEditForm, durationMin: e.target.value })}
              />
            </label>
            {lessonEditForm.type !== "QUIZ" && (
              <label>
                Resource URL
                <input
                  className="input"
                  placeholder="Video URL, PDF link, or resource URL"
                  value={lessonEditForm.videoUrl}
                  onChange={e => setLessonEditForm({ ...lessonEditForm, videoUrl: e.target.value })}
                />
              </label>
            )}
          </div>

          <label>
            Description / Instructions
            <input
              className="input"
              placeholder="Brief description of this lesson"
              value={lessonEditForm.description}
              onChange={e => setLessonEditForm({ ...lessonEditForm, description: e.target.value })}
            />
          </label>

          {["ARTICLE"].includes(lessonEditForm.type) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", marginBottom: 4 }}>Content (Rich Text)</div>
              <RichTextEditor
                value={lessonEditForm.content}
                onChange={v => setLessonEditForm({ ...lessonEditForm, content: v })}
                placeholder="Write lesson content..."
                minHeight={250}
              />
            </div>
          )}

          {/* ATTACHED MEDIA & LEARNING RESOURCES SECTION */}
          <div
            style={{
              marginTop: 20,
              marginBottom: 20,
              padding: "20px",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid var(--border)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: "var(--navy)" }}>📁 Attached Media & Learning Resources</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Upload PDFs, Word docs (.docx), PowerPoint presentations (.pptx), images (PNG/JPG), or ZIP files stored in course/lesson directories.
                </p>
              </div>

              <label
                className="btn btn-primary"
                style={{
                  cursor: uploadingMedia ? "not-allowed" : "pointer",
                  padding: "8px 16px",
                  fontSize: 13,
                  opacity: uploadingMedia ? 0.7 : 1
                }}
              >
                {uploadingMedia ? "Uploading..." : "⬆️ Upload File (PDF, DOCX, PPTX, PNG...)"}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingMedia}
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.webp,.gif,.svg,.zip,.rar,.txt,.csv,.json,.py"
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {/* Uploaded Resources List */}
            {lessonResources.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", background: "#fff", borderRadius: "8px", border: "1px dashed var(--border)" }}>
                <span className="muted" style={{ fontSize: 13 }}>
                  No media files attached yet. Click <strong>⬆️ Upload File</strong> to upload slides, worksheets, documents, or diagrams.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lessonResources.map(res => (
                  <div
                    key={res.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      background: "#fff",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                      <span className="badge" style={{ fontSize: 11, fontWeight: 800 }}>
                        {getResourceBadgeIcon(res.fileType)}
                      </span>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <strong style={{ fontSize: 14, color: "var(--navy)", display: "block" }}>{res.title || res.fileName}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {res.fileName} · {formatBytes(res.fileSize)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => {
                          navigator.clipboard.writeText(res.fileUrl);
                          alert(`Copied file URL: ${res.fileUrl}`);
                        }}
                        title="Copy file URL path"
                      >
                        📋 Copy Link
                      </button>
                      <a
                        href={res.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        👁️ Open
                      </a>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => handleDeleteResource(res.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INTERACTIVE QUIZ QUESTIONS BUILDER */}
          {lessonEditForm.type === "QUIZ" && (
            <div className="admin-quiz-section" style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <div>
                  <h3 style={{ margin: 0, color: "var(--navy)" }}>⭐ Interactive Quiz Questions</h3>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                    Add multiple-choice questions, options, hints, and explanations for this quiz lesson.
                  </p>
                </div>
                <button type="button" className="btn btn-primary" onClick={addQuizQuestionDraft}>
                  + Add Question
                </button>
              </div>

              {loadingQuiz ? (
                <p className="muted">Loading quiz questions...</p>
              ) : quizDraftQuestions.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", background: "#f8fafc", borderRadius: 8, border: "1px dashed var(--border)" }}>
                  <p className="muted">No questions yet. Click <strong>+ Add Question</strong> to create questions for this quiz.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  {quizDraftQuestions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      style={{
                        padding: 16,
                        background: "#fff",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <strong>Question {qIdx + 1}</strong>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5, margin: 0 }}>
                            ⭐ Stars Reward:
                            <input
                              className="input"
                              type="number"
                              min="1"
                              value={q.starsReward}
                              onChange={e => updateQuestionField(qIdx, "starsReward", Number(e.target.value))}
                              style={{ width: 70, margin: 0, padding: "5px 8px" }}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => removeQuizQuestionDraft(qIdx)}
                            style={{ padding: "5px 10px", fontSize: 12 }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <label style={{ fontWeight: 600, fontSize: 13 }}>
                        Question Prompt
                        <input
                          className="input"
                          placeholder="e.g. What is the role of Temperature in LLMs?"
                          value={q.question}
                          onChange={e => updateQuestionField(qIdx, "question", e.target.value)}
                        />
                      </label>

                      {/* Options */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>Options (Select radio for correct answer):</span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => addOptionToQuestion(qIdx)}
                            style={{ padding: "4px 8px", fontSize: 12 }}
                          >
                            + Add Option
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correctAnswer === optIdx}
                                onChange={() => updateQuestionField(qIdx, "correctAnswer", optIdx)}
                                title="Mark as correct answer"
                              />
                              <span style={{ fontWeight: 700, minWidth: 20 }}>{String.fromCharCode(65 + optIdx)}.</span>
                              <input
                                className="input"
                                value={opt}
                                onChange={e => updateOptionText(qIdx, optIdx, e.target.value)}
                                style={{ margin: 0, flex: 1 }}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)} text`}
                              />
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => removeOptionFromQuestion(qIdx, optIdx)}
                                style={{ padding: "6px 10px", fontSize: 12, color: "#b91c1c" }}
                                title="Remove option"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hint & Explanation */}
                      <div className="grid grid-2" style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 13 }}>
                          💡 Hint (Shown when student asks for hint)
                          <input
                            className="input"
                            placeholder="Helpful hint for the learner..."
                            value={q.hint}
                            onChange={e => updateQuestionField(qIdx, "hint", e.target.value)}
                          />
                        </label>
                        <label style={{ fontSize: 13 }}>
                          📖 Explanation (Shown after answering)
                          <input
                            className="input"
                            placeholder="Explanation of the correct answer..."
                            value={q.explanation}
                            onChange={e => updateQuestionField(qIdx, "explanation", e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button className="btn btn-primary" onClick={saveEditedLesson}>
              Save Lesson & Quiz
            </button>
            <button className="btn btn-secondary" onClick={closeEditLesson}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!course.modules.length && (
        <div className="card">
          No modules yet. Click <strong>Add Module</strong> to start building the curriculum.
        </div>
      )}
    </div>
  );
}
