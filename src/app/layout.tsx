import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buildview - Product Database",
  description: "Jewelry product search and management system powered by Neon PostgreSQL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="navbar-inner">
            <a href="/" className="navbar-brand">
              <span className="brand-icon">◇</span>
              Buildview
            </a>
            <div className="navbar-links">
              <a href="/" className="nav-link">
                <span className="nav-icon">⌕</span>
                Search
              </a>
              <a href="/upload" className="nav-link">
                <span className="nav-icon">↑</span>
                Upload
              </a>
              <a href="/data" className="nav-link">
                <span className="nav-icon">☷</span>
                Data
              </a>
            </div>
          </div>
        </nav>
        <div className="app-container">
          {children}
        </div>
        <footer className="site-footer">
          <p>Powered by LLTechnology</p>
        </footer>
      </body>
    </html>
  );
}
