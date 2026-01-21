import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Group Tours', path: '/packages' },
    { name: 'Packages', path: '/packages' },
    { name: 'India', path: '/packages' },
    { name: 'Honeymoon', path: '/packages' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav className="nav-container">
      <div className="flex items-center justify-between h-14 gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--cyan-accent))]" />
          <span className="text-lg font-bold text-white">
            Travel<span className="text-[hsl(var(--cyan-accent))]">Mate</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="text-white/80 hover:text-[hsl(var(--cyan-accent))] text-sm font-medium transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/70">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-white/80 hover:text-[hsl(var(--cyan-accent))] transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-[hsl(var(--cyan-accent))] text-[hsl(220,25%,12%)] px-6 py-2 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Menu className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden py-4 border-t border-white/10">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-white/80 hover:text-[hsl(var(--cyan-accent))] font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            {user ? (
              <>
                <span className="text-sm text-white/70">
                  {user.email}
                </span>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 text-white/80 hover:text-[hsl(var(--cyan-accent))] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-[hsl(var(--cyan-accent))] text-[hsl(220,25%,12%)] px-6 py-2 rounded-full font-medium text-sm text-center hover:opacity-90 transition-opacity"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
