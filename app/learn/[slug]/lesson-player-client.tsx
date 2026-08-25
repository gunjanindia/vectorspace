"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { formatArticleHtmlWithCodeblocks } from "@/lib/codeHighlight";

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
type Module = { id: string; title: string; sortOrder: number; lessons: Lesson[] };

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

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback to execCommand below
    }
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand("copy");
    textArea.remove();
    return success;
  } catch {
    return false;
  }
}

function ArticleContentRenderer({ html }: { html: string }) {
  const formattedHtml = useMemo(() => formatArticleHtmlWithCodeblocks(html), [html]);

  const handleContainerClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const btn = target.closest(".code-copy-btn") as HTMLButtonElement | null;
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    let codeText = btn.getAttribute("data-raw-code");
    if (!codeText) {
      const wrapper = btn.closest(".code-wrapper");
      const codeEl = wrapper?.querySelector("code") || wrapper?.querySelector("pre");
      codeText = codeEl?.textContent || "";
    }

    const copied = await copyTextToClipboard(codeText);
    if (copied) {
      const copyTextSpan = btn.querySelector(".copy-text") as HTMLElement | null;
      if (copyTextSpan) copyTextSpan.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        if (copyTextSpan) copyTextSpan.textContent = "Copy";
        btn.classList.remove("copied");
      }, 2000);
    }
  };

  return (
    <div
      className="rich-view"
      onClick={handleContainerClick}
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  );
}

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

interface QuizQuestionData {
  id: string;
  question: string;
  options: string[];
  hint?: string | null;
  starsReward?: number;
  sortOrder?: number;
  correctAnswer?: number;
  explanation?: string | null;
}

interface QuizSubmissionResult {
  questionId: string;
  question: string;
  selectedOption: number | null;
  correctAnswer: number;
  isCorrect: boolean;
  explanation?: string | null;
  hint?: string | null;
  starsReward: number;
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

function getYouTubeEmbedUrl(url: string): string {
  let videoId = "";
  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
  } else if (url.includes("youtube.com/watch?v=")) {
    videoId = url.split("v=")[1]?.split("&")[0] || "";
  } else if (url.includes("youtube.com/embed/")) {
    videoId = url.split("embed/")[1]?.split("?")[0] || "";
  }
  return `https://www.youtube.com/embed/${videoId}`;
}

function isVideoMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) return true;
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "ogg", "mov", "m4v", "avi"].includes(ext || "");
}

function isPdfMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ext === "pdf";
}

function getFileServeUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/api/uploads/")) return url;
  if (url.startsWith("/uploads/")) {
    return `/api/uploads/${url.replace(/^\/uploads\//, "")}`;
  }
  if (url.startsWith("uploads/")) {
    return `/api/uploads/${url.replace(/^uploads\//, "")}`;
  }
  return url;
}

export default function LessonPlayerClient({
  course,
  initialLessonId,
  enrollmentCompleted = false,
  initialCompletedLessonIds = [],
  userStars = 0,
  userName = "Student"
}: {
  course: Course;
  initialLessonId?: string;
  enrollmentCompleted?: boolean;
  initialCompletedLessonIds?: string[];
  userStars?: number;
  userName?: string;
}) {
  const [currentLessonId, setCurrentLessonId] = useState(initialLessonId || "");
  const [isMarking, setIsMarking] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(enrollmentCompleted);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(initialCompletedLessonIds);
  const [stars, setStars] = useState(userStars);
  const [starToast, setStarToast] = useState<{ show: boolean; amount: number; message: string }>({
    show: false,
    amount: 0,
    message: ""
  });

  // Quiz state
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionData[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [activeHintId, setActiveHintId] = useState<string | null>(null);
  const [questionEvaluated, setQuestionEvaluated] = useState<Record<string, boolean>>({});
  const [questionResults, setQuestionResults] = useState<Record<string, { isCorrect: boolean; explanation?: string; correctAnswer?: number }>>({});
  const [quizCompletedSummary, setQuizCompletedSummary] = useState<{
    passed: boolean;
    score: number;
    total: number;
    starsAwarded: number;
  } | null>(null);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);

  // Flatten all lessons
  const allLessons = course.modules.flatMap(m => m.lessons);

  // Load saved lesson from localStorage
  useEffect(() => {
    const savedLessonId = localStorage.getItem(`course-${course.id}-lesson`);
    if (savedLessonId && allLessons.some(l => l.id === savedLessonId)) {
      setCurrentLessonId(savedLessonId);
    } else if (initialLessonId) {
      setCurrentLessonId(initialLessonId);
    }
  }, [course.id, initialLessonId]);

  // Save current lesson
  useEffect(() => {
    if (currentLessonId) {
      localStorage.setItem(`course-${course.id}-lesson`, currentLessonId);
    }
  }, [currentLessonId, course.id]);

  const currentLesson = allLessons.find(l => l.id === currentLessonId);
  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Check if current lesson is a QUIZ
  const isQuizLesson = currentLesson?.type === "QUIZ";
  const isCurrentLessonCompleted = completedLessonIds.includes(currentLessonId);

  // Fetch quiz questions when switching to a QUIZ lesson
  useEffect(() => {
    if (!currentLessonId || !isQuizLesson) {
      setQuizQuestions([]);
      setQuizCompletedSummary(null);
      return;
    }

    async function loadQuiz() {
      try {
        setQuizLoading(true);
        setQuizAnswers({});
        setCurrentQIndex(0);
        setActiveHintId(null);
        setQuestionEvaluated({});
        setQuestionResults({});
        setQuizCompletedSummary(null);

        const res = await fetch(`/api/quiz/${currentLessonId}`);
        if (res.ok) {
          const data = await res.json();
          setQuizQuestions(data.questions || []);
          if (data.userStars !== undefined) {
            setStars(data.userStars);
          }
          if (data.previousAttempt && data.previousAttempt.passed) {
            // Already passed previously
            setQuizCompletedSummary({
              passed: true,
              score: data.previousAttempt.score,
              total: data.previousAttempt.totalQuestions,
              starsAwarded: data.previousAttempt.starsAwarded
            });
          }
        }
      } catch (err) {
        console.error("Failed to load quiz:", err);
      } finally {
        setQuizLoading(false);
      }
    }

    loadQuiz();
  }, [currentLessonId, isQuizLesson]);

  // Trigger floating star reward toast
  function triggerStarReward(amount: number, message: string) {
    if (amount <= 0) return;
    setStarToast({ show: true, amount, message });
    window.dispatchEvent(new CustomEvent("starsUpdated", { detail: { amount } }));
    setTimeout(() => {
      setStarToast({ show: false, amount: 0, message: "" });
    }, 3500);
  }

  // Mark normal lesson complete
  async function markCompleteAndContinue() {
    if (!currentLessonId) return;

    try {
      setIsMarking(true);
      const res = await fetch(`/api/progress/${currentLessonId}`, { method: "POST" });
      if (!res.ok) {
        alert("Failed to mark lesson complete");
        return;
      }
      const data = await res.json();

      const newCompletedIds = Array.from(new Set([...completedLessonIds, currentLessonId]));
      if (!completedLessonIds.includes(currentLessonId)) {
        setCompletedLessonIds(newCompletedIds);
      }

      if (data.starsAwarded > 0) {
        setStars(data.totalStars);
        triggerStarReward(data.starsAwarded, "Lesson Completed!");
      }

      // Check if all lessons are completed
      if (newCompletedIds.length >= allLessons.length) {
        // Mark course complete
        try {
          await fetch(`/api/enrollment/${course.id}/complete`, { method: "POST" });
        } catch (error) {
          console.error("Error marking course complete:", error);
        }
        setCourseCompleted(true);
      } else if (nextLesson) {
        setCurrentLessonId(nextLesson.id);
      } else {
        // If on the last lesson but course is not complete, go to first uncompleted
        const firstUncompleted = allLessons.find(l => !newCompletedIds.includes(l.id));
        if (firstUncompleted) {
          setCurrentLessonId(firstUncompleted.id);
        }
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      alert("Error marking lesson complete");
    } finally {
      setIsMarking(false);
    }
  }

  // Handle Quiz Option Selection
  function handleSelectOption(questionId: string, optionIndex: number) {
    if (questionEvaluated[questionId] && questionResults[questionId]?.isCorrect) {
      return; // Already answered correctly
    }
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    // Clear previous evaluation state on retry selection
    if (questionEvaluated[questionId]) {
      setQuestionEvaluated(prev => ({ ...prev, [questionId]: false }));
    }
  }

  // Handle "Ask for Hint"
  function handleToggleHint(questionId: string) {
    if (activeHintId === questionId) {
      setActiveHintId(null);
    } else {
      setActiveHintId(questionId);
      setHintsUsedCount(prev => prev + 1);
    }
  }

  // Handle "Retry Question"
  function handleRetryQuestion(questionId: string) {
    setQuizAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setQuestionEvaluated(prev => ({ ...prev, [questionId]: false }));
    setQuestionResults(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  // Submit full quiz or current question
  async function handleSubmitQuiz() {
    if (quizQuestions.length === 0) return;

    // Check if current question has an answer
    const currentQ = quizQuestions[currentQIndex];
    if (quizAnswers[currentQ.id] === undefined) {
      alert("Please choose an answer before checking!");
      return;
    }

    try {
      setIsMarking(true);
      const res = await fetch(`/api/quiz/${currentLessonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: quizAnswers,
          hintsUsed: hintsUsedCount
        })
      });

      if (!res.ok) {
        alert("Failed to submit quiz. Please try again.");
        return;
      }

      const data = await res.json();

      // Process results
      const evalMap: Record<string, boolean> = {};
      const resMap: Record<string, { isCorrect: boolean; explanation?: string; correctAnswer?: number }> = {};

      data.results.forEach((r: QuizSubmissionResult) => {
        evalMap[r.questionId] = true;
        resMap[r.questionId] = {
          isCorrect: r.isCorrect,
          explanation: r.explanation || undefined,
          correctAnswer: r.correctAnswer
        };
      });

      setQuestionEvaluated(prev => ({ ...prev, ...evalMap }));
      setQuestionResults(prev => ({ ...prev, ...resMap }));

      if (data.passed) {
        if (!completedLessonIds.includes(currentLessonId)) {
          setCompletedLessonIds(prev => [...prev, currentLessonId]);
        }
        if (data.starsAwarded > 0) {
          setStars(data.totalStars);
          triggerStarReward(data.starsAwarded, "Quiz Mastered! 🌟");
        }
        setQuizCompletedSummary({
          passed: true,
          score: data.score,
          total: data.totalQuestions,
          starsAwarded: data.starsAwarded
        });
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Error submitting quiz response");
    } finally {
      setIsMarking(false);
    }
  }

  const progressPercent = Math.round((completedLessonIds.length / Math.max(1, allLessons.length)) * 100);
  const currentQ = quizQuestions[currentQIndex];
  const isCurrentQEvaluated = currentQ && questionEvaluated[currentQ.id];
  const currentQResult = currentQ && questionResults[currentQ.id];

  return (
    <>
      {/* Floating Gamification Star Reward Toast */}
      {starToast.show && (
        <div className="star-reward-toast animate-bounce-in">
          <div className="star-burst">⭐</div>
          <div className="star-toast-content">
            <strong>+{starToast.amount} Stars!</strong>
            <span>{starToast.message}</span>
          </div>
        </div>
      )}

      {/* Curriculum Sidebar */}
      <aside className="sidebar">
        <div style={{ marginBottom: 16 }}>
          <Link
            href={`/courses/${course.slug}`}
            style={{ fontSize: 13, color: "var(--blue)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}
          >
            ← Course Details
          </Link>
          <h3 style={{ margin: "4px 0 10px", fontSize: 18, color: "var(--navy)" }}>{course.title}</h3>

          {/* Progress Bar */}
          <div className="course-progress-wrap">
            <div className="course-progress-header">
              <span>{completedLessonIds.length} / {allLessons.length} Completed</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Modules and Lessons */}
        {course.modules.map((m, mIdx) => (
          <div key={m.id} style={{ marginTop: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" }}>
              Module {mIdx + 1}: {m.title}
            </div>
            <div style={{ marginTop: 8 }}>
              {m.lessons.map((l, lIdx) => {
                const isCompleted = completedLessonIds.includes(l.id);
                const isActive = l.id === currentLessonId;
                const isQuiz = l.type === "QUIZ";

                return (
                  <div
                    key={l.id}
                    className={`lesson-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                    onClick={() => setCurrentLessonId(l.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      marginBottom: 6,
                      cursor: "pointer",
                      fontSize: 14
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      <span className="lesson-status-icon">
                        {isCompleted ? "✓" : isQuiz ? "⭐" : lIdx + 1}
                      </span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {l.title}
                      </span>
                    </div>
                    {isQuiz && <span className="quiz-mini-tag">QUIZ</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      {/* Main Learning Content Area */}
      <section className="lesson-main">
        {/* Certificate View if course completed */}
        {courseCompleted ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              <div
                className="card"
                style={{
                  padding: "60px 40px",
                  borderRadius: "16px",
                  boxShadow: "0 15px 45px rgba(11,31,58,.15)",
                  background: "linear-gradient(135deg, #fafbfc 0%, #f0f4fb 100%)",
                  border: "2px solid var(--blue)",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 10 }}>🏆</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 2, marginBottom: 10 }}>
                  CERTIFICATE OF COMPLETION
                </div>
                <h1 style={{ margin: "10px 0 15px", color: "var(--navy)", fontSize: 34 }}>
                  Outstanding Achievement!
                </h1>
                <p style={{ fontSize: 16, color: "var(--text)", marginBottom: 25, lineHeight: 1.6 }}>
                  Congratulations <strong>{userName}</strong>! You have mastered all modules and quizzes.
                </p>

                <div style={{ margin: "30px 0", padding: "24px", background: "#fff", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>COURSE MASTERED</div>
                  <h2 style={{ margin: 0, fontSize: 24, color: "var(--blue)", fontWeight: 700 }}>{course.title}</h2>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 15, marginTop: 25 }}>
                  <Link href="/dashboard" className="btn btn-primary" style={{ padding: "12px 24px" }}>
                    View Stars & Dashboard
                  </Link>
                  <Link href={`/courses/${course.slug}`} className="btn btn-secondary" style={{ padding: "12px 24px" }}>
                    Back to Course
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header with Type badge and Gamification Bounty */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`badge ${isQuizLesson ? "badge-quiz" : ""}`}>
                  {isQuizLesson ? "INTERACTIVE QUIZ" : currentLesson?.type || "LESSON"}
                </span>
                {isCurrentLessonCompleted && (
                  <span className="badge badge-completed">
                    ✓ Completed
                  </span>
                )}
              </div>

              {/* Star balance badge */}
              <div className="player-star-pill">
                <span>⭐ Your Stars:</span>
                <strong>{stars}</strong>
              </div>
            </div>

            <h1 style={{ margin: "0 0 20px", fontSize: 28, color: "var(--navy)" }}>
              {currentLesson?.title || "Lesson Player"}
            </h1>

            {/* QUIZ LESSON VIEW */}
            {isQuizLesson ? (
              <div className="quiz-player-container">
                {quizLoading ? (
                  <div className="card" style={{ padding: 40, textAlign: "center" }}>
                    <div className="spinner" />
                    <p style={{ marginTop: 15, color: "var(--muted)" }}>Loading interactive quiz questions...</p>
                  </div>
                ) : quizQuestions.length === 0 ? (
                  <div className="card" style={{ padding: 40, textAlign: "center" }}>
                    <p className="muted">No questions available for this quiz yet.</p>
                    <button className="btn btn-primary" onClick={markCompleteAndContinue} style={{ marginTop: 15 }}>
                      Skip & Continue →
                    </button>
                  </div>
                ) : quizCompletedSummary?.passed && currentQIndex >= quizQuestions.length ? (
                  /* Quiz Passed Summary Card */
                  <div className="card quiz-success-card">
                    <div className="quiz-success-icon">🎉</div>
                    <h2>Quiz Completed Successfully!</h2>
                    <p style={{ color: "var(--muted)", fontSize: 16 }}>
                      You scored <strong>{quizCompletedSummary.score} / {quizCompletedSummary.total}</strong> on this quiz.
                    </p>

                    {quizCompletedSummary.starsAwarded > 0 ? (
                      <div className="stars-awarded-badge">
                        <span>⭐ +{quizCompletedSummary.starsAwarded} Stars Added to Your Profile!</span>
                      </div>
                    ) : (
                      <div className="stars-awarded-badge stars-recap">
                        <span>⭐ You have already claimed stars for this quiz!</span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setCurrentQIndex(0);
                        }}
                      >
                        Review Questions
                      </button>
                      {nextLesson ? (
                        <button
                          className="btn btn-primary"
                          onClick={() => setCurrentLessonId(nextLesson.id)}
                          style={{ background: "var(--blue)" }}
                        >
                          Proceed to Next Lesson →
                        </button>
                      ) : completedLessonIds.length >= allLessons.length ? (
                        <button className="btn btn-primary" onClick={async () => {
                          try {
                            await fetch(`/api/enrollment/${course.id}/complete`, { method: "POST" });
                          } catch (error) {
                            console.error("Error marking course complete:", error);
                          }
                          setCourseCompleted(true);
                        }}>
                          Complete Course 🎓
                        </button>
                      ) : (
                        <button className="btn btn-primary" onClick={() => {
                          const firstUncompleted = allLessons.find(l => !completedLessonIds.includes(l.id));
                          if (firstUncompleted) setCurrentLessonId(firstUncompleted.id);
                        }}>
                          Complete Missing Lessons 🎓
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Active Question Card */
                  currentQ && (
                    <div className="card quiz-card">
                      {/* Top Question Progress Bar */}
                      <div className="quiz-meta-bar">
                        <div className="quiz-step-label">
                          Question <strong>{currentQIndex + 1}</strong> of <strong>{quizQuestions.length}</strong>
                        </div>
                        <div className="quiz-star-bounty">
                          ⭐ Reward: <strong>+{currentQ.starsReward || 10} Stars</strong>
                        </div>
                      </div>

                      {/* Question Text */}
                      <h3 className="quiz-question-title">{currentQ.question}</h3>

                      {/* Options List */}
                      <div className="quiz-options-list">
                        {currentQ.options.map((opt, optIdx) => {
                          const isSelected = quizAnswers[currentQ.id] === optIdx;
                          const isEvaluated = isCurrentQEvaluated;
                          const isCorrectOpt = isEvaluated && currentQResult?.correctAnswer === optIdx;
                          const isWrongOpt = isEvaluated && isSelected && !currentQResult?.isCorrect;

                          let optionClass = "quiz-option-card";
                          if (isSelected) optionClass += " selected";
                          if (isCorrectOpt) optionClass += " option-correct";
                          if (isWrongOpt) optionClass += " option-wrong";

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              className={optionClass}
                              onClick={() => handleSelectOption(currentQ.id, optIdx)}
                              disabled={isEvaluated && currentQResult?.isCorrect}
                            >
                              <div className="option-radio">
                                {isCorrectOpt ? "✓" : isWrongOpt ? "✕" : String.fromCharCode(65 + optIdx)}
                              </div>
                              <span className="option-text">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Evaluation Feedback & Explanation */}
                      {isCurrentQEvaluated && (
                        <div className={`quiz-feedback-box ${currentQResult?.isCorrect ? "feedback-success" : "feedback-error"}`}>
                          {currentQResult?.isCorrect ? (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#065f46" }}>
                                <span>🎉 Correct Answer!</span>
                              </div>
                              {currentQResult.explanation && (
                                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#047857", lineHeight: 1.5 }}>
                                  {currentQResult.explanation}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#991b1b" }}>
                                <span>✕ That wasn't quite right.</span>
                              </div>
                              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#b91c1c" }}>
                                Don't worry! You can ask for a hint 💡 and retry this question.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hint Reveal Box */}
                      {activeHintId === currentQ.id && currentQ.hint && (
                        <div className="quiz-hint-box animate-fade-in">
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ fontSize: 20 }}>💡</span>
                            <div>
                              <strong style={{ color: "#92400e", fontSize: 13 }}>Helpful Hint:</strong>
                              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#78350f", lineHeight: 1.5 }}>
                                {currentQ.hint}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="quiz-action-bar">
                        <div style={{ display: "flex", gap: 10 }}>
                          {currentQ.hint && (
                            <button
                              type="button"
                              className="btn btn-hint"
                              onClick={() => handleToggleHint(currentQ.id)}
                            >
                              💡 {activeHintId === currentQ.id ? "Hide Hint" : "Ask for Hint"}
                            </button>
                          )}

                          {/* Retry button if answered wrong */}
                          {isCurrentQEvaluated && !currentQResult?.isCorrect && (
                            <button
                              type="button"
                              className="btn btn-retry"
                              onClick={() => handleRetryQuestion(currentQ.id)}
                            >
                              🔄 Try Again
                            </button>
                          )}
                        </div>

                        <div>
                          {/* Check answer or proceed to next question */}
                          {!isCurrentQEvaluated ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleSubmitQuiz}
                              disabled={quizAnswers[currentQ.id] === undefined || isMarking}
                              style={{
                                opacity: quizAnswers[currentQ.id] === undefined || isMarking ? 0.6 : 1,
                                cursor: quizAnswers[currentQ.id] === undefined ? "not-allowed" : "pointer"
                              }}
                            >
                              {isMarking ? "Checking..." : "Check Answer ✓"}
                            </button>
                          ) : currentQResult?.isCorrect ? (
                            currentQIndex < quizQuestions.length - 1 ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                  setCurrentQIndex(prev => prev + 1);
                                  setActiveHintId(null);
                                }}
                              >
                                Next Question →
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                  setCurrentQIndex(quizQuestions.length);
                                }}
                                style={{ background: "var(--orange)" }}
                              >
                                Complete Quiz & Claim Stars 🌟
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              /* REGULAR VIDEO OR ARTICLE LESSON */
              <>
                {/* PDF LESSON OR PDF URL */}
                {currentLesson?.type === "PDF" || isPdfMediaUrl(currentLesson?.videoUrl) ? (() => {
                  const pdfResource = currentLesson?.resources?.find(r => r.fileType?.toLowerCase() === "pdf" || r.fileName?.toLowerCase().endsWith(".pdf"));
                  const rawPdf = (currentLesson?.videoUrl && isPdfMediaUrl(currentLesson.videoUrl))
                    ? currentLesson.videoUrl
                    : (pdfResource?.fileUrl || currentLesson?.videoUrl || "");
                  const servePdf = getFileServeUrl(rawPdf);

                  return (
                    <div className="card article-container" style={{ padding: "24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 24 }}>📕</span>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 18, color: "var(--navy)" }}>Interactive PDF Viewer</h3>
                            <span className="muted" style={{ fontSize: 13 }}>{currentLesson?.title || "PDF Document"}</span>
                          </div>
                        </div>

                        {servePdf && (
                          <div style={{ display: "flex", gap: 10 }}>
                            <a
                              href={servePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: "8px 16px", fontSize: 13 }}
                            >
                              👁️ Open Full Page
                            </a>
                            <a
                              href={`${servePdf}?download=true`}
                              download
                              className="btn btn-primary"
                              style={{ padding: "8px 18px", fontSize: 13, background: "var(--blue)" }}
                            >
                              ⬇️ Download PDF
                            </a>
                          </div>
                        )}
                      </div>

                      {servePdf ? (
                        <iframe
                          src={servePdf}
                          title={currentLesson?.title || "PDF Document"}
                          width="100%"
                          height="650"
                          style={{ border: "1px solid var(--border)", borderRadius: "10px", background: "#f8fafc" }}
                        />
                      ) : (
                        <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "10px" }}>
                          <p className="muted">No PDF document attached to this lesson yet.</p>
                        </div>
                      )}
                    </div>
                  );
                })() : currentLesson?.videoUrl && isVideoMediaUrl(currentLesson.videoUrl) ? (
                  /* VIDEO LESSON */
                  <div className="card video-container">
                    {isYouTubeUrl(currentLesson.videoUrl) ? (
                      <iframe
                        width="100%"
                        height="550"
                        src={getYouTubeEmbedUrl(currentLesson.videoUrl)}
                        title="Lesson Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        style={{ borderRadius: "10px", width: "100%" }}
                      />
                    ) : (
                      <video controls style={{ width: "100%", height: "auto", borderRadius: "10px" }} src={getFileServeUrl(currentLesson.videoUrl)} />
                    )}
                  </div>
                ) : currentLesson?.type === "ARTICLE" ? (
                  /* ARTICLE LESSON */
                  <div className="card article-container">
                    <ArticleContentRenderer html={currentLesson.content || ""} />
                  </div>
                ) : (
                  /* DEFAULT TEXT LESSON */
                  <div className="card article-container" style={{ textAlign: "center", padding: "40px" }}>
                    <h2 style={{ color: "var(--navy)", margin: "0 0 10px" }}>Lesson Content</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      {currentLesson?.description || "No text content available for this lesson."}
                    </p>
                  </div>
                )}

                {/* Lesson Description */}
                {currentLesson?.description && currentLesson.type !== "ARTICLE" && currentLesson.type !== "PDF" && (
                  <div className="card" style={{ marginTop: 20, background: "#f8fafc" }}>
                    <strong style={{ display: "block", marginBottom: 6 }}>About this lesson:</strong>
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{currentLesson.description}</p>
                  </div>
                )}

                {/* ATTACHED DOWNLOADABLE MEDIA & RESOURCES */}
                {currentLesson?.resources && currentLesson.resources.length > 0 && (
                  <div className="card" style={{ marginTop: 20, padding: "20px", border: "1px solid var(--border)", borderRadius: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 24 }}>📁</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 18, color: "var(--navy)" }}>Downloads & Learning Resources</h3>
                        <span className="muted" style={{ fontSize: 13 }}>
                          {currentLesson.resources.length} attached {currentLesson.resources.length === 1 ? "file" : "files"} (PDFs, presentations, documents, worksheets, images)
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {currentLesson.resources.map(res => {
                        const serveUrl = getFileServeUrl(res.fileUrl);
                        return (
                          <div
                            key={res.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              background: "#f8fafc",
                              padding: "14px 18px",
                              borderRadius: "10px",
                              border: "1px solid var(--border)",
                              flexWrap: "wrap"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200 }}>
                              <span className="badge" style={{ fontSize: 12, fontWeight: 800, padding: "6px 12px" }}>
                                {getResourceBadgeIcon(res.fileType)}
                              </span>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                <strong style={{ fontSize: 15, color: "var(--navy)", display: "block" }}>{res.title || res.fileName}</strong>
                                <span className="muted" style={{ fontSize: 12 }}>
                                  {res.fileName} · {formatBytes(res.fileSize)}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                              {["pdf", "image"].includes(res.fileType?.toLowerCase()) && (
                                <a
                                  href={serveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary"
                                  style={{ padding: "8px 16px", fontSize: 13 }}
                                >
                                  👁️ View / Preview
                                </a>
                              )}
                              <a
                                href={`${serveUrl}?download=true`}
                                download={res.fileName}
                                className="btn btn-primary"
                                style={{ padding: "8px 18px", fontSize: 13, background: "var(--blue)" }}
                              >
                                ⬇️ Download File
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Navigation Toolbar */}
                <div style={{ marginTop: 25, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => prevLesson && setCurrentLessonId(prevLesson.id)}
                    disabled={!prevLesson}
                    style={{ opacity: prevLesson ? 1 : 0.5, cursor: prevLesson ? "pointer" : "not-allowed" }}
                  >
                    ← Previous Lesson
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={markCompleteAndContinue}
                    disabled={isMarking}
                    style={{ opacity: isMarking ? 0.7 : 1, padding: "13px 24px", fontSize: 15 }}
                  >
                    {isMarking ? "Completing..." : isCurrentLessonCompleted ? "Continue to Next Lesson →" : "Mark Complete & Earn +5 ⭐ →"}
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => nextLesson && setCurrentLessonId(nextLesson.id)}
                    disabled={!nextLesson}
                    style={{ opacity: nextLesson ? 1 : 0.5, cursor: nextLesson ? "pointer" : "not-allowed" }}
                  >
                    Next Lesson →
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
