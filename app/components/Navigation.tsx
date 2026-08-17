"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface UserState {
  id: string;
  name: string;
  email: string;
  role: string;
  stars?: number;
}

export default function Navigation() {
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [starAnimate, setStarAnimate] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to check auth:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
    setMobileOpen(false); // Close mobile drawer on route change
  }, [pathname]);

  // Listen to custom star update events across tabs / player
  useEffect(() => {
    function onStarsUpdated(e: Event) {
      const customEvent = e as CustomEvent<{ stars?: number; amount?: number }>;
      if (customEvent.detail?.stars !== undefined) {
        setUser(prev => (prev ? { ...prev, stars: customEvent.detail.stars } : prev));
      } else if (customEvent.detail?.amount !== undefined) {
        setUser(prev => (prev ? { ...prev, stars: (prev.stars || 0) + (customEvent.detail.amount || 0) } : prev));
      }
      setStarAnimate(true);
      setTimeout(() => setStarAnimate(false), 1200);
    }

    window.addEventListener("starsUpdated", onStarsUpdated);
    return () => window.removeEventListener("starsUpdated", onStarsUpdated);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  const renderNavLinks = (isMobile = false) => (
    <>
      <Link href="/courses">Courses</Link>
      <Link href="/learning-paths">Learning Paths</Link>
      <Link href="/batches">Batches</Link>
      {user ? (
        <>
          <Link
            href="/dashboard#achievements"
            className={`star-nav-badge ${starAnimate ? "star-pulse" : ""}`}
            title="Your Star Balance - View Achievements"
          >
            <span className="star-icon">⭐</span>
            <span className="star-count">{user.stars ?? 0}</span>
            <span className="star-label">Stars</span>
          </Link>

          {user.role === "ADMIN" && (
            <Link href="/admin" className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }}>
              Admin
            </Link>
          )}

          <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: 14 }}>
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="btn btn-primary"
            style={{ background: "var(--orange)", border: "none", cursor: "pointer", padding: "8px 14px", fontSize: 14 }}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="btn btn-secondary">Login</Link>
          <Link href="/register" className="btn btn-primary">Get Started</Link>
        </>
      )}
    </>
  );

  if (loading) {
    return (
      <nav className="navlinks navlinks-desktop">
        <Link href="/login" className="btn btn-secondary">Login</Link>
        <Link href="/register" className="btn btn-primary">Get Started</Link>
      </nav>
    );
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="navlinks navlinks-desktop" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {renderNavLinks(false)}
      </nav>

      {/* Mobile Toggle Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle Navigation Menu"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer animate-fade-in">
          {renderNavLinks(true)}
        </div>
      )}
    </>
  );
}
