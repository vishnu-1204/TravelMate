import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
    navigate('/login');
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

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <nav
      className={`nav-container transition-all duration-300 ${
        user
          ? 'bg-gradient-to-r from-[#0f2027] via-[#203a43] to-[#2c5364] shadow-lg'
          : ''
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--cyan-accent))]" />
          <span className="text-lg font-bold text-white">
            Travel
            <span className="text-[hsl(var(--cyan-accent))]">Mate</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                user
                  ? 'text-white/90 hover:text-[hsl(var(--cyan-accent))]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Auth Section */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
              >
                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white">
                  {userInitial}
                </div>
                <span className="text-sm max-w-[120px] truncate hidden xl:inline">
                  {user.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#2b2836] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm text-white truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
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
          <div className="flex flex-col gap-4 px-4">
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
              <div className="border-t border-white/10 pt-4 mt-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-sm font-bold text-white">
                    {userInitial}
                  </div>
                  <span className="text-sm text-white truncate">{user.email}</span>
                </div>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 transition"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
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
}

export default Navbar;
