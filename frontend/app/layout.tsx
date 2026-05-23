import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CU Loan Officer',
  description:
    'Agentic loan analysis assistant for credit union loan officers. Powered by AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-100 font-sans antialiased">
        {/* Top navigation bar */}
        <header className="bg-navy-900 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left: Logo + title */}
              <Link
                href="/"
                className="flex items-center gap-3 hover:opacity-90 transition-opacity"
              >
                <span className="text-2xl" role="img" aria-label="Bank">
                  🏦
                </span>
                <span className="text-white font-bold text-lg tracking-tight">
                  CU Loan Officer
                </span>
              </Link>

              {/* Right: Nav links */}
              <nav className="flex items-center gap-1">
                <Link
                  href="/"
                  className="text-slate-300 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                >
                  Analyze
                </Link>
                <Link
                  href="/history"
                  className="text-slate-300 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                >
                  Member History
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="bg-slate-100 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </body>
    </html>
  );
}
