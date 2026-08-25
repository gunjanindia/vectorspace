import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, calculateUserRank } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch full user data with progress, quiz attempts, enrollments, and transactions
  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    include: {
      enrollments: {
        include: {
          batch: {
            include: {
              instructor: { select: { name: true, title: true } }
            }
          },
          course: {
            include: {
              modules: {
                include: {
                  lessons: true
                }
              }
            }
          }
        },
        orderBy: { enrolledAt: "desc" }
      },
      progress: {
        where: { completed: true }
      },
      quizAttempts: true,
      starTransactions: {
        orderBy: { createdAt: "desc" },
        take: 8
      }
    }
  });

  if (!fullUser) redirect("/login");

  const totalStars = fullUser.stars || 0;
  const rank = calculateUserRank(totalStars);

  const completedLessonsCount = fullUser.progress.length;
  const passedAttempts = fullUser.quizAttempts.filter(a => a.passed);
  const uniqueSolvedQuizzes = new Set(passedAttempts.map(a => a.lessonId)).size;
  const completedCoursesCount = fullUser.enrollments.filter(e => e.status === "COMPLETED").length;
  const totalHintsUsed = fullUser.quizAttempts.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);

  const badges = [
    {
      id: "first_lesson",
      title: "First Steps",
      description: "Completed your first lesson",
      icon: "🚀",
      unlocked: completedLessonsCount >= 1,
      tier: "Bronze"
    },
    {
      id: "first_quiz",
      title: "Quiz Solver",
      description: "Passed your first knowledge check quiz",
      icon: "🎯",
      unlocked: uniqueSolvedQuizzes >= 1,
      tier: "Bronze"
    },
    {
      id: "curious_mind",
      title: "Curious Mind",
      description: "Used a hint to deepen your learning",
      icon: "💡",
      unlocked: totalHintsUsed >= 1,
      tier: "Silver"
    },
    {
      id: "star_collector_25",
      title: "Rising Star",
      description: "Accumulated 25 total stars",
      icon: "⭐",
      unlocked: totalStars >= 25,
      tier: "Silver"
    },
    {
      id: "star_collector_50",
      title: "Star Collector",
      description: "Accumulated 50 total stars",
      icon: "🌟",
      unlocked: totalStars >= 50,
      tier: "Gold"
    },
    {
      id: "quiz_master",
      title: "Quiz Master",
      description: "Passed 2 or more quizzes with mastery",
      icon: "⚡",
      unlocked: uniqueSolvedQuizzes >= 2,
      tier: "Gold"
    },
    {
      id: "course_finisher",
      title: "Graduate",
      description: "Completed a full course curriculum",
      icon: "🏆",
      unlocked: completedCoursesCount >= 1,
      tier: "Platinum"
    },
    {
      id: "ai_grandmaster",
      title: "Grandmaster",
      description: "Accumulated 200+ stars on the platform",
      icon: "👑",
      unlocked: totalStars >= 200,
      tier: "Diamond"
    }
  ];

  const unlockedBadgesCount = badges.filter(b => b.unlocked).length;

  return (
    <main className="dashboard">
      <div className="container">
        {/* Top Profile & Rank Hero Card */}
        <div className="dashboard-hero-card">
          <div className="dashboard-hero-left">
            <div className="avatar-rank-badge">
              <span className="avatar-icon">{rank.badgeIcon}</span>
              <span className="level-chip">Lvl {rank.level}</span>
            </div>
            <div>
              <div className="hero-greeting">Welcome back,</div>
              <h1 className="hero-user-name">{fullUser.name}</h1>
              <div className="hero-rank-title">
                {rank.title} · <span style={{ color: "var(--muted)" }}>Vector Scholar</span>
              </div>
            </div>
          </div>

          <div className="dashboard-hero-right">
            <div className="hero-star-display">
              <span className="hero-star-icon">⭐</span>
              <div>
                <div className="hero-star-number">{totalStars}</div>
                <div className="hero-star-label">TOTAL STARS</div>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="hero-level-progress">
              <div className="level-progress-text">
                {rank.nextStars ? (
                  <>
                    <span>Next Rank: <strong>{rank.nextStars} ⭐</strong></span>
                    <span>{rank.progressPercent}%</span>
                  </>
                ) : (
                  <span>Maximum Rank Achieved! 👑</span>
                )}
              </div>
              <div className="level-bar-bg">
                <div className="level-bar-fill" style={{ width: `${rank.progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Gamification Stats Overview */}
        <div className="stats" style={{ marginTop: 25 }}>
          <div className="stat stat-gamified">
            <span className="stat-icon">⭐</span>
            <div>
              <span className="stat-label">Stars Earned</span>
              <strong>{totalStars}</strong>
            </div>
          </div>
          <div className="stat stat-gamified">
            <span className="stat-icon">🎯</span>
            <div>
              <span className="stat-label">Quizzes Solved</span>
              <strong>{uniqueSolvedQuizzes}</strong>
            </div>
          </div>
          <div className="stat stat-gamified">
            <span className="stat-icon">📚</span>
            <div>
              <span className="stat-label">Lessons Completed</span>
              <strong>{completedLessonsCount}</strong>
            </div>
          </div>
          <div className="stat stat-gamified">
            <span className="stat-icon">🏅</span>
            <div>
              <span className="stat-label">Badges Unlocked</span>
              <strong>{unlockedBadgesCount} / {badges.length}</strong>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <section id="achievements" style={{ marginTop: 40 }}>
          <div className="section-head-with-badge">
            <div>
              <h2>Achievements & Badges</h2>
              <p className="muted">Unlock special badges by completing lessons, solving quizzes, and earning stars</p>
            </div>
            <span className="badge badge-gold">⭐ {unlockedBadgesCount} Unlocked</span>
          </div>

          <div className="badges-grid">
            {badges.map(badge => (
              <div
                key={badge.id}
                className={`badge-card ${badge.unlocked ? "badge-unlocked" : "badge-locked"}`}
              >
                <div className="badge-icon-wrap">
                  <span className="badge-emoji">{badge.icon}</span>
                  {badge.unlocked && <span className="badge-check-dot">✓</span>}
                </div>
                <div className="badge-info">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4>{badge.title}</h4>
                    <span className={`badge-tier-tag tier-${badge.tier.toLowerCase()}`}>{badge.tier}</span>
                  </div>
                  <p>{badge.description}</p>
                  <div className="badge-status">
                    {badge.unlocked ? (
                      <span className="status-unlocked">✨ Unlocked</span>
                    ) : (
                      <span className="status-locked">🔒 In Progress</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Grid: Enrolled Courses & Star Activity Feed */}
        <div className="dashboard-two-col" style={{ marginTop: 45 }}>
          {/* My Courses */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <h2 style={{ margin: 0 }}>My Enrolled Courses</h2>
              <span className="badge" style={{ fontSize: 12, background: "#e0f2fe", color: "#0369a1", fontWeight: 700 }}>
                {fullUser.enrollments.length} {fullUser.enrollments.length === 1 ? "Course" : "Courses"}
              </span>
            </div>
            <div className="dashboard-courses-grid">
              {fullUser.enrollments.map(e => {
                const totalCourseLessons = e.course.modules.flatMap(m => m.lessons).length;
                const completedInThisCourse = fullUser.progress.filter(p =>
                  e.course.modules.flatMap(m => m.lessons).some(l => l.id === p.lessonId)
                ).length;
                const coursePct = totalCourseLessons > 0 ? Math.round((completedInThisCourse / totalCourseLessons) * 100) : 0;

                return (
                  <div className="card course-dash-card" key={e.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <span className="badge">{e.course.level}</span>
                      <span className={`status-pill ${e.status === "COMPLETED" ? "pill-completed" : "pill-active"}`}>
                        {e.status === "COMPLETED" ? "✓ Completed" : "In Progress"}
                      </span>
                    </div>

                    <h3 style={{ margin: "12px 0 8px", fontSize: 18, color: "var(--navy)" }}>{e.course.title}</h3>

                    {/* Progress Bar */}
                    <div style={{ margin: "14px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                        <span>{completedInThisCourse} of {totalCourseLessons} lessons</span>
                        <strong style={{ color: "var(--navy)" }}>{coursePct}%</strong>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${coursePct}%` }} />
                      </div>
                    </div>

                    {/* Assigned Cohort / Batch Details */}
                    {e.batch && (
                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                          margin: "12px 0"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ color: "var(--navy)", fontWeight: 700 }}>
                            👥 {e.batch.name}
                          </span>
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              background: e.batch.mode === "HYBRID" ? "#e0f2fe" : e.batch.mode === "OFFLINE" ? "#fef3c7" : "#dcfce7",
                              color: e.batch.mode === "HYBRID" ? "#0369a1" : e.batch.mode === "OFFLINE" ? "#92400e" : "#15803d"
                            }}
                          >
                            {e.batch.mode}
                          </span>
                        </div>

                        <div style={{ color: "var(--muted)", fontSize: 11 }}>
                          📅 {e.batch.schedule}
                        </div>

                        {e.batch.classroom && (
                          <div style={{ color: "var(--navy)", fontSize: 11, marginTop: 2 }}>
                            🏛️ Classroom: {e.batch.classroom}
                          </div>
                        )}

                        {e.batch.meetingLink && (
                          <div style={{ marginTop: 4 }}>
                            <a
                              href={e.batch.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "var(--blue)", fontWeight: 700, textDecoration: "underline", fontSize: 11 }}
                            >
                              🔗 Join Live Class (Meet/Zoom) →
                            </a>
                          </div>
                        )}

                        {e.batch.instructor && (
                          <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
                            👨‍🏫 Mentor: {e.batch.instructor.name} {e.batch.instructor.title ? `(${e.batch.instructor.title})` : ""}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: 15, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <Link className="btn btn-primary" href={`/learn/${e.course.slug}`} style={{ padding: "10px 18px", fontSize: 14 }}>
                        {coursePct > 0 ? "Continue Learning →" : "Start Course →"}
                      </Link>
                      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>⏱️ {e.course.durationHours} hrs</span>
                    </div>
                  </div>
                );
              })}

              {!fullUser.enrollments.length && (
                <div className="card" style={{ padding: 30, textAlign: "center" }}>
                  <p className="muted">You have no courses yet.</p>
                  <Link href="/courses" className="btn btn-primary" style={{ marginTop: 10 }}>
                    Browse Available Courses
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Star History / Activity Feed */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <h2 style={{ margin: 0 }}>Star History</h2>
              <span className="badge badge-gold" style={{ fontSize: 12 }}>
                ⭐ {fullUser.stars} Stars Total
              </span>
            </div>
            <div className="card activity-card">
              {fullUser.starTransactions.length > 0 ? (
                <div className="activity-list">
                  {fullUser.starTransactions.map(tx => (
                    <div key={tx.id} className="activity-item">
                      <div className="activity-star-badge">
                        +{tx.amount} ⭐
                      </div>
                      <div className="activity-details">
                        <div className="activity-desc">{tx.description}</div>
                        <div className="activity-time">
                          {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "25px 15px", color: "var(--muted)" }}>
                  <span style={{ fontSize: 32 }}>⭐</span>
                  <p style={{ margin: "10px 0 0", fontSize: 14 }}>Complete lessons and solve quizzes to start earning stars!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
