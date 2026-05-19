import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Briefcase, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;

  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
    },
    {
      label: 'Explore',
      path: '/packages',
      icon: Compass,
    },
    {
      label: 'Bookings',
      path: user ? '/my-bookings' : '/login',
      icon: Briefcase,
    },
    {
      label: 'Profile',
      path: user ? '/profile' : '/login',
      icon: User,
    },
  ];

  // Helper function to check if an item is active
  const isActive = (itemPath: string) => {
    if (itemPath === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(itemPath);
  };

  return (
    <>
      {/* Defining Gradient for SVGs */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="sunset-nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A00" />
            <stop offset="100%" stopColor="#FFC857" />
          </linearGradient>
        </defs>
      </svg>

      <div className="fixed bottom-5 left-4 right-4 z-50 lg:hidden flex justify-center pointer-events-auto">
        <nav
          className="w-full max-w-lg h-[74px] flex items-center justify-around px-3 rounded-[26px] transition-all duration-300 ease-out"
          style={{
            background: 'rgba(25, 25, 25, 0.78)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 10px 35px rgba(0, 0, 0, 0.45)',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.label}
                to={item.path}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-all duration-300"
                aria-label={item.label}
              >
                {/* Animated Icon and Label container */}
                <motion.div
                  animate={{
                    scale: active ? 1.12 : 1,
                    y: active ? -3 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="flex flex-col items-center gap-1.5 z-10 font-poppins"
                >
                  <Icon
                    className="transition-all duration-300"
                    style={{
                      width: active ? '24px' : '22px',
                      height: active ? '24px' : '22px',
                      stroke: active ? 'url(#sunset-nav-grad)' : '#A1A1AA',
                      strokeWidth: active ? '2.4px' : '1.8px',
                      filter: active ? 'drop-shadow(0 0 8px rgba(255, 122, 0, 0.55))' : 'none',
                    }}
                  />
                  <span
                    className="text-[10px] tracking-wide transition-all duration-300"
                    style={{
                      background: active ? 'linear-gradient(135deg, #FF7A00, #FFC857)' : 'unset',
                      WebkitBackgroundClip: active ? 'text' : 'unset',
                      WebkitTextFillColor: active ? 'transparent' : 'unset',
                      color: active ? 'transparent' : '#A1A1AA',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default BottomNavigation;
