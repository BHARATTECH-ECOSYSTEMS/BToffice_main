import { useContext, useState } from 'react';
import { Menu, X, ChevronDown, MenuIcon,  } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link, useLocation } from 'react-router-dom';
import { IconButton, useMediaQuery } from '@mui/material';
import Sidebar from './Sidebar';
import { UIContext } from '../context/UiContext';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Courses', path: '/courses' },
    { name: 'My-learning', path: '/my-learning' },
    { name: 'Assignments', path: '/assignments' },
    { name: 'Grades', path: '/grades' },
    { name: 'Live classes', path: '/live' },
    { name: 'Instructors', path: '/instructors' }
  ];
   const navItemsDesk = [
    ,
    { name: 'Home', path: '/my-learning' },
    { name: 'About', path: '/h' },
    { name: 'Services', path: '/' },
    { name: 'Startups', path: '/hh' },
    { name: 'Contact', path: '/assignments' },
    
  ];

  const {collapsed,setCollapsed} = useContext(UIContext)
  const isActivePath = (path) => {
    return location.pathname === path;
  };

const isMobile = useMediaQuery('(max-width:768px)')

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
    
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       
        <div className="flex justify-between items-center h-20">
          {!isMobile && <div className="fixed  left-4" ><IconButton onClick={()=>setCollapsed(!collapsed)}><MenuIcon/></IconButton></div>}
          
          {
            console.log(collapsed)
          }
          <Link to="/" className="flex items-center gap-3 group">
  
          {/* Logo */}
          <img
            src="/logo.png"
            className="h-10 w-10 object-contain transition-transform group-hover:scale-105"
          />

          {/* Text */}
          <div className="flex flex-col leading-tight">
            
            <span className="text-xl font-bold text-gradient-primary">
              BharatTech
            </span>

            <span className="text-[11px] text-gray-400">
              Tech Ecosystem
            </span>

          </div>

        </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItemsDesk.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`relative px-3 py-2 text-sm font-medium transition-all duration-300 ${
                  isActivePath(item.path)
                    ? 'text-primary'
                    : 'text-foreground hover:text-primary'
                } hover:scale-105`}
              >
                {item.name}
                {isActivePath(item.path) && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button variant="primary" size="sm" className="hover-glow" asChild>
              <Link to="/login">SSO Login</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden glass-strong border-t border-white/10">
          <div className="px-4 py-6 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 text-base font-medium transition-colors duration-300 ${
                  isActivePath(item.path)
                    ? 'text-primary bg-primary/10 rounded-lg'
                    : 'text-foreground hover:text-primary'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 space-y-2">
              <Button variant="primary" size="sm" className="w-full" asChild>
                <Link to="/login">SSO Login</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
      
    </nav>
  );
};

export default Navigation;