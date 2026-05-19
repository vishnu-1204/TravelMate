import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserCircle, Receipt, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function Navbar() {
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
    { name: 'Honeymoon', path: '/packages/honeymoon' },
    { name: 'Packages', path: '/packages' },
    { name: 'Blog', path: '/blog' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim();
  const userInitial = fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-8 lg:px-12 transition-all duration-300"
      style={{
        background: 'linear-gradient(to right, rgba(15, 15, 15, 0.82), rgba(2, 2, 2, 0.94))',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.55)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-20 gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 group relative overflow-visible">
          <img 
            src="/project logo.png" 
            alt="TravelMate Logo" 
            className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-xl md:text-2xl font-extrabold tracking-tight font-poppins transition-all duration-300 group-hover:brightness-110">
            <span className="text-white">Travel</span>
            <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFC857] bg-clip-text text-transparent">Mate</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                user ? 'text-white/90 hover:text-[#FF7A00]' : 'text-white/80 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Section */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FFC857] flex items-center justify-center text-sm font-extrabold text-white hover:brightness-110 transition active:scale-95 shadow-md shadow-[rgba(255,122,0,0.3)]"
              >
                {userInitial}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#222222] border border-white/5 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Signed in as</p>
                    <p className="text-xs text-white truncate font-medium mt-0.5">{user.email}</p>
                    {fullName && (
                      <p className="text-[11px] text-[#FFC857] truncate font-bold mt-1">{fullName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#B0B0B0] hover:text-white hover:bg-white/5 transition font-semibold"
                  >
                    <UserCircle className="h-4 w-4 text-[#FF7A00]" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/my-bookings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#B0B0B0] hover:text-white hover:bg-white/5 transition border-t border-white/5 font-semibold"
                  >
                    <Receipt className="h-4 w-4 text-[#FF7A00]" />
                    My Bookings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition border-t border-white/5 font-semibold"
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
                className="bg-gradient-to-r from-[#FF7A00] to-[#FFC857] text-white px-6 py-2 rounded-full font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(255,122,0,0.3)]"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="border border-white/30 text-white px-6 py-2 rounded-full font-bold text-sm hover:border-white/80 hover:bg-white/5 transition-all"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Enquire Button Redesigned */}
        <a 
          href="tel:9342180670"
          className="lg:hidden flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FFC857] text-white hover:brightness-110 active:scale-95 transition-all duration-300 text-xs font-semibold font-poppins shrink-0"
          style={{
            padding: '9px 18px',
            boxShadow: '0 4px 15px rgba(255, 122, 0, 0.35)',
          }}
        >
          <Phone className="h-3.5 w-3.5 stroke-[2.5px]" />
          <span className="tracking-wide">Enquire Now</span>
        </a>
      </div>
    </nav>
  );
}

export default Navbar;
