import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';

const quickLinks = [
  { label: 'Browse Packages', href: '/packages' },
  { label: 'Read Our Blog', href: '/blog' },
  { label: 'About TravelMate', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
];

const NotFound = () => {
  return (
    <Layout>
      <PageTransition>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
          {/* Large 404 Number */}
          <h1 className="mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-8xl font-extrabold tracking-tighter text-transparent sm:text-9xl">
            404
          </h1>

          <h2 className="mb-3 text-2xl font-semibold text-foreground sm:text-3xl">
            Page not found
          </h2>
          <p className="mb-8 max-w-md text-muted-foreground">
            Sorry, the page you're looking for doesn't exist or has been moved.
            Let's get you back on track!
          </p>

          {/* Primary CTA */}
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Home
          </Link>

          {/* Quick Links */}
          <div className="w-full max-w-sm">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Popular pages
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
};

export default NotFound;
