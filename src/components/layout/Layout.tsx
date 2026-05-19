import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNavigation from './BottomNavigation';

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

const Layout = ({ children, hideFooter = false }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 pb-20 lg:pb-0">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <BottomNavigation />
    </div>
  );
};

export default Layout;
