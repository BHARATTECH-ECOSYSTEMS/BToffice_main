import { 
  LayoutDashboard, 
  FileText, 
  FormInput, 
  MousePointer, 
  Split, 
  Workflow,
  Frame,
  Type,
  BookOpen,
  GraduationCap,
  FileCheck,
  Award,
  MessageSquare,
  MessageCircle,
  FolderOpen,
} from 'lucide-react';

export const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'CMS', icon: FileText, href: '/cms' },
  { name: 'Forms', icon: FormInput, href: '/forms' },
  { name: 'Clicks', icon: MousePointer, href: '/clicks' },
  { name: 'Split Testing', icon: Split, href: '/split-testing' },
];

export const lmsItems = [
  { name: 'Courses', icon: BookOpen, href: '/lms/courses' },
  { name: 'My Learning', icon: GraduationCap, href: '/lms/my-learning' },
  { name: 'Assignments', icon: FileCheck, href: '/lms/assignments' },
  { name: 'Certificates', icon: Award, href: '/lms/grades' },
];

export const discussionItems = [
  { name: 'Chat', icon: MessageCircle, href: '/chat' },
  { name: 'Discussions', icon: MessageSquare, href: '/lms/discussions' },
];

export const resourceItems = [
  { name: 'Resources', icon: FolderOpen, href: '/lms/resources' },
];

export const appItems = [
  { name: 'Webflow', icon: Workflow, href: '/webflow' },
  { name: 'Framer', icon: Frame, href: '/framer' },
  { name: 'Typeform', icon: Type, href: '/typeform' },
];
