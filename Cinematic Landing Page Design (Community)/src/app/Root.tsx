import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

export default function Root() {
  const location = useLocation();
  const { pathname, state } = location;

  useEffect(() => {
    const scrollTo = state?.scrollTo;
    if (scrollTo) {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, state]);

  return (
    <div className="bg-[#FFFFFF] min-h-screen selection:bg-[#6A35FF] selection:text-white" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
