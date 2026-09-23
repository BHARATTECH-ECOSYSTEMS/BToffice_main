import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useContext, useState } from 'react';
import { UIContext } from '../context/UiContext';
import {
  sidebarItems,
  lmsItems,
  discussionItems,
  resourceItems,
  appItems,
} from './sidebar/lmsNavConfig';
import SidebarBottomCard from './sidebar/SidebarBottomCard';
import MobileLmsDrawer from './sidebar/MobileLmsDrawer';

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const Sidebar = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { collapsed } = useContext(UIContext);

  const renderNavGroup = (title, items, activeClass = "bg-muted text-foreground") => (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h3>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? activeClass
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-border flex items-center justify-between md:justify-start">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">Nolio</span>
        </div>
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted"
          onClick={() => setOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-border">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full pl-3 pr-8 py-2 text-sm bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          <span className="absolute right-3 top-2 text-xs text-muted-foreground">/</span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {renderNavGroup("Navigation", sidebarItems, "bg-gradient-primary text-muted-foreground")}
        {renderNavGroup("Learning Management", lmsItems, "bg-gradient-accent text-white")}
        {renderNavGroup("Chat and Discussions", discussionItems, "bg-secondary text-secondary-foreground")}
        {renderNavGroup("Resources", resourceItems)}
        {renderNavGroup("App", appItems)}
      </div>

      <SidebarBottomCard />
    </>
  );

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">Nolio</span>
        </div>
        <button
          className="p-2 rounded-lg hover:bg-muted cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="hidden md:flex w-64 bg-background border-r border-border flex-col">
        {!collapsed && sidebarContent}
      </div>

      <MobileLmsDrawer open={open} setOpen={setOpen} />
    </>
  );
};

export default Sidebar;
