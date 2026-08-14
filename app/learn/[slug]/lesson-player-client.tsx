"use client";
import { useState, useEffect } from "react";

type Lesson = { id: string; title: string; description: string | null; type: string; videoUrl: string | null; content: string | null; durationMin: number; sortOrder: number };
type Module = { id: string; title: string; sortOrder: number; lessons: Lesson[] };
type Course = { id: string; slug: string; title: string; shortDescription: string; description: string; level: string; durationHours: number; pricePaise: number; mode: string; published: boolean; featured: boolean; thumbnailUrl: string | null; modules: Module[] };

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

export default function LessonPlayerClient({ course, initialLessonId, enrollmentCompleted = false }: { course: Course; initialLessonId?: string; enrollmentCompleted?: boolean }) {
  const [currentLessonId, setCurrentLessonId] = useState(initialLessonId || "");
  const [isMarking, setIsMarking] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(enrollmentCompleted);

  // Load saved lesson from localStorage on mount
  useEffect(() => {
    const savedLessonId = localStorage.getItem(`course-${course.id}-lesson`);
    if (savedLessonId) {
      setCurrentLessonId(savedLessonId);
    } else if (initialLessonId) {
      setCurrentLessonId(initialLessonId);
    }
  }, [course.id, initialLessonId]);

  // Save current lesson to localStorage whenever it changes
  useEffect(() => {
    if (currentLessonId) {
      localStorage.setItem(`course-${course.id}-lesson`, currentLessonId);
    }
  }, [currentLessonId, course.id]);

  // Find current lesson
  const currentLesson = course.modules.flatMap(m => m.lessons).find(l => l.id === currentLessonId);

  // Find lesson index and next/previous
  const allLessons = course.modules.flatMap(m => m.lessons);
  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Handle lesson click from sidebar
  useEffect(() => {
    function handleLessonClick(e: Event) {
      const el = e.target as HTMLElement;
      if (el.classList.contains("lesson-item")) {
        const lessonId = el.getAttribute("data-lesson-id");
        if (lessonId) setCurrentLessonId(lessonId);
      }
    }

    document.addEventListener("click", handleLessonClick);
    return () => document.removeEventListener("click", handleLessonClick);
  }, []);

  // Highlight active lesson
  useEffect(() => {
    document.querySelectorAll(".lesson-item").forEach(el => {
      if (el.getAttribute("data-lesson-id") === currentLessonId) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  }, [currentLessonId]);

  // Mark lesson complete and continue to next
  async function markCompleteAndContinue() {
    if (!currentLessonId) return;
    
    try {
      setIsMarking(true);
      const res = await fetch(`/api/progress/${currentLessonId}`, { method: "POST" });
      
      if (!res.ok) {
        alert("Failed to mark lesson complete");
        return;
      }

      // Move to next lesson if available
      if (nextLesson) {
        setCurrentLessonId(nextLesson.id);
      } else {
        // No more lessons - mark course as complete
        try {
          await fetch(`/api/enrollment/${course.id}/complete`, { method: "POST" });
        } catch (error) {
          console.error("Error marking course complete:", error);
        }
        setCourseCompleted(true);
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      alert("Error marking lesson complete");
    } finally {
      setIsMarking(false);
    }
  }

  return (
    <section className="lesson-main">
      {/* Certificate Display */}
      {courseCompleted ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div
              className="card"
              style={{
                padding: "60px 40px",
                borderRadius: "16px",
                boxShadow: "0 10px 40px rgba(11,31,58,.15)",
                background: "linear-gradient(135deg, #fafbfc 0%, #f0f4fb 100%)",
                border: "2px solid var(--blue)"
              }}
            >
              {/* Certificate Header */}
              <div style={{ marginBottom: 30 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 2, marginBottom: 10 }}>
                  CERTIFICATE OF COMPLETION
                </div>
                <h1 style={{ margin: "10px 0 20px", color: "var(--navy)", fontSize: 36 }}>Congratulations!</h1>
              </div>

              {/* Message */}
              <p style={{ fontSize: 18, color: "var(--text)", marginBottom: 30, lineHeight: 1.6 }}>
                You have successfully completed the course
              </p>

              {/* Course Name */}
              <div style={{ margin: "40px 0", padding: "30px", background: "#fff", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>COURSE TITLE</div>
                <h2 style={{ margin: 0, fontSize: 28, color: "var(--blue)", fontWeight: 700 }}>{course.title}</h2>
              </div>

              {/* Completion Details */}
              <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ textAlign: "center", padding: "15px" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>COMPLETION DATE</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                    {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                </div>
                <div style={{ textAlign: "center", padding: "15px" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>COURSE DURATION</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                    {course.durationHours} {course.durationHours === 1 ? "hour" : "hours"}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ margin: "40px 0", borderTop: "2px solid var(--border)" }} />

              {/* Action Button */}
              <div style={{ marginTop: 40 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.href = `/courses/${course.slug}`}
                  style={{ width: "100%", padding: "15px 20px", fontSize: 16, fontWeight: 700 }}
                >
                  Back to Course
                </button>
              </div>
            </div>

            {/* Share Section */}
            <div style={{ marginTop: 30, textAlign: "center" }}>
              <p style={{ color: "var(--muted)", marginBottom: 15 }}>Share your achievement with others!</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const text = `I just completed "${course.title}" course! 🎉`;
                    navigator.share?.({ title: "Course Completed", text }) || navigator.clipboard.writeText(text);
                  }}
                >
                  Share Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Normal Lesson Display */}
          <span className="badge">COURSE PLAYER</span>
          <h1>{currentLesson?.title || "Welcome to the course"}</h1>

          {/* Video/Content Display */}
          <div className="card video-container">
        {currentLesson?.videoUrl ? (
          isYouTubeUrl(currentLesson.videoUrl) ? (
            <iframe
              width="100%"
              height="600"
              src={getYouTubeEmbedUrl(currentLesson.videoUrl)}
              title="Lesson Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ borderRadius: "8px" }}
            />
          ) : (
            <video controls style={{ width: "100%", height: "auto", borderRadius: "8px" }} src={currentLesson.videoUrl} />
          )
        ) : currentLesson?.type === "ARTICLE" ? (
          <div style={{ padding: "20px" }}>
            <h3>Lesson Content</h3>
            <div
              dangerouslySetInnerHTML={{ __html: currentLesson.content || "" }}
              style={{ lineHeight: 1.6, color: "var(--text)" }}
            />
          </div>
        ) : (
          <div style={{ padding: "20px", textAlign: "center" }}>
            <h2>Lesson Content</h2>
            <p className="muted">{currentLesson?.description || "No content available for this lesson."}</p>
          </div>
        )}
      </div>

      {/* Lesson Description */}
      {currentLesson?.description && currentLesson.type !== "ARTICLE" && (
        <div style={{ marginTop: 20 }}>
          <strong>About this lesson:</strong>
          <p className="muted">{currentLesson.description}</p>
        </div>
      )}

      {/* Navigation */}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
        <button
          className="btn btn-secondary"
          onClick={() => prevLesson && setCurrentLessonId(prevLesson.id)}
          disabled={!prevLesson}
          style={{ opacity: prevLesson ? 1 : 0.5, cursor: prevLesson ? "pointer" : "not-allowed" }}
        >
          ← Previous
        </button>
        <button className="btn btn-primary" onClick={markCompleteAndContinue} disabled={isMarking} style={{ opacity: isMarking ? 0.6 : 1, cursor: isMarking ? "not-allowed" : "pointer" }}>
          {isMarking ? "Marking..." : "Mark Complete & Continue →"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => nextLesson && setCurrentLessonId(nextLesson.id)}
          disabled={!nextLesson}
          style={{ opacity: nextLesson ? 1 : 0.5, cursor: nextLesson ? "pointer" : "not-allowed" }}
        >
          Next →
        </button>
      </div>
        </>
      )}
    </section>
  );
}
