import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  FormInput, 
  MousePointer, 
  Split, 
  Workflow,
  Frame,
  Type,
  Settings,
  BookOpen,
  GraduationCap,
  FileCheck,
  Award,
  Calendar,
  MessageSquare,
  MessageCircle,
  Video,
  FolderOpen,
  Users,
  Menu,
  X
} from 'lucide-react';
import { useContext, useState } from 'react';
import { UIContext } from '../context/UiContext';

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'CMS', icon: FileText, href: '/cms' },
  { name: 'Forms', icon: FormInput, href: '/forms' },
  { name: 'Clicks', icon: MousePointer, href: '/clicks' },
  { name: 'Split Testing', icon: Split, href: '/split-testing' },
];


const lmsItems = [
  { name: 'Courses', icon: BookOpen, href: '/courses' },
  { name: 'My Learning', icon: GraduationCap, href: '/my-learning' },
  { name: 'Assignments', icon: FileCheck, href: '/assignments' },
  { name: 'Certificates', icon: Award, href: '/grades' },
 
];

const discussionItems = [
  { name: 'Chat', icon: MessageCircle, href: '/chat' },
  { name: 'Discussions', icon: MessageSquare, href: '/lms/discussions' },
];

const resourceItems = [
  { name: 'Resources', icon: FolderOpen, href: '/lms/resources' },
];

const appItems = [
  { name: 'Webflow', icon: Workflow, href: '/webflow' },
  { name: 'Framer', icon: Frame, href: '/framer' },
  { name: 'Typeform', icon: Type, href: '/typeform' },
];

const Sidebar = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false); // mobile sidebar state

  const {collapsed,setCollapsed} = useContext(UIContext)

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center justify-between md:justify-start">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">Nolio</span>
        </div>

        {/* Mobile close button inside sidebar */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted"
          onClick={() => setOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
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

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-6">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Navigation
          </h3>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "bg-gradient-primary text-muted-foreground" 
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

        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Learning Management
          </h3>
          <nav className="space-y-1">
            {lmsItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "bg-gradient-accent text-white" 
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

        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Chat and Discussions
          </h3>
          <nav className="space-y-1">
            {discussionItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "bg-secondary text-secondary-foreground" 
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

        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Resources
          </h3>
          <nav className="space-y-1">
            {resourceItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "bg-muted text-foreground" 
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

        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            App
          </h3>
          <nav className="space-y-1">
            {appItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border">
        <div className="bg-gradient-primary rounded-lg p-4 text-white text-center mb-4">
          <div className="text-2xl font-bold mb-1">⚡</div>
          <h4 className="font-medium mb-1">View x Event Limit</h4>
          <p className="text-xs opacity-80 mb-3">2250/45000000 • expires 3 days</p>
          <button className="w-full bg-white/20 hover:bg-white/30 text-white text-xs py-2 rounded-md transition-colors">
            Learn more
          </button>
        </div>
        
        <button className="w-full bg-foreground text-background py-2 px-4 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors mb-3">
          Upgrade plan →
        </button>
        
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="w-8 h-8 bg-warning rounded-full"></div>
          <Settings className="w-4 h-4" />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Top bar only on mobile */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">Nolio</span>
        </div>
        <button
          className="p-2 rounded-lg hover:bg-muted"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 bg-background border-r border-border flex-col">
        
        {!collapsed && sidebarContent}
      </div>

      {/* Mobile drawer sidebar */}
    
<div
  className={cn(
    "fixed inset-0 z-40 md:hidden",
    open ? "pointer-events-auto" : "pointer-events-none"
  )}
>
  {/* Backdrop */}
  <div
    className={cn(
      "absolute inset-0 bg-black/40 transition-opacity",
      open ? "opacity-100" : "opacity-0"
    )}
    onClick={() => setOpen(false)}
  />

  {/* Panel */}
  <div
    className={cn(
      "absolute left-0 top-0 bottom-0 w-64 bg-background border-r border-border flex flex-col transform transition-transform duration-200",
      open ? "translate-x-0" : "-translate-x-full"
    )}
  >
    {/* ===== MOBILE DRAWER CONTENT (ONLY LMS) ===== */}
    {/* Logo + close */}
    <div className="p-6 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        <span className="font-semibold text-lg">Nolio</span>
      </div>

      <button
        className="p-2 rounded-lg hover:bg-muted"
        onClick={() => setOpen(false)}
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* LMS only */}
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Learning Management
        </h3>
        <nav className="space-y-1">
          {lmsItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive 
                    ? "bg-gradient-accent text-white" 
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
    </div>
  </div>
</div>

    </>
  );
};

export default Sidebar;
