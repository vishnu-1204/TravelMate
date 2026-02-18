import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, UserCircle, Receipt } from 'lucide-react';
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

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim();
  const userInitial = fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <nav className="nav-container transition-all duration-300">
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
                className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-sm font-bold text-white hover:bg-sky-400 transition"
              >
                {userInitial}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#2b2836] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm text-white truncate">{user.email}</p>
                    {user.user_metadata?.full_name && (
                      <p className="text-xs text-gray-400 truncate mt-1">{user.user_metadata.full_name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-sky-300 hover:bg-white/5 transition"
                  >
                    <UserCircle className="h-4 w-4" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/my-bookings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-sky-300 hover:bg-white/5 transition border-t border-white/10"
                  >
                    <Receipt className="h-4 w-4" />
                    My Bookings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition border-t border-white/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-sky-500 text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-sky-400 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="border border-white/50 text-white px-6 py-2 rounded-full font-medium text-sm hover:border-white hover:bg-white/10 transition-colors"
              >
                Sign Up
              </Link>
            </>
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
                    navigate('/profile');
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 text-sky-300 text-sm hover:text-sky-200 transition mb-3"
                >
                  <UserCircle className="h-4 w-4" />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    navigate('/my-bookings');
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 text-sky-300 text-sm hover:text-sky-200 transition mb-3"
                >
                  <Receipt className="h-4 w-4" />
                  My Bookings
                </button>
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
              <>
                <Link
                  to="/login"
                  className="bg-sky-500 text-white px-6 py-2 rounded-full font-medium text-sm text-center hover:bg-sky-400 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="border border-white/50 text-white px-6 py-2 rounded-full font-medium text-sm text-center hover:border-white hover:bg-white/10 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
