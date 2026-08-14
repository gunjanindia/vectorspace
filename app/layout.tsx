import "./globals.css";
import Link from "next/link";
import Navigation from "./components/Navigation";

export const metadata = {
  title: "Vector Space Skills Academy",
  description: "Hybrid AI education for students and professionals."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container nav">
            <Link href="/" className="logo">
              Vector Space <span>Skills Academy</span>
            </Link>
            <Navigation />
          </div>
        </header>
        {children}
        <footer className="footer">
          <div className="container">
            <strong>Vector Space Skills Academy</strong>
            <p>Practical AI education — Online, Offline & Hybrid.</p>
            <p style={{ opacity: 0.7 }}>© {new Date().getFullYear()} Vector Space Skills Academy</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
