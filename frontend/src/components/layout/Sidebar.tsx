import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasRole } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  UserCircle,
  BarChart3,
  Users,
  Building2,
  Globe,
  Settings2,
  FileText,
  BookOpen,
  ShieldCheck,
  ScrollText,
  Target,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  requiredRole?: 'IC' | 'TM' | 'HOD' | 'CXO';
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, group: 'My Workspace' },
  { label: 'Pending Surveys', path: '/surveys', icon: <ClipboardList className="h-5 w-5" />, group: 'My Workspace' },
  { label: 'Self-Feedback', path: '/self-feedback', icon: <UserCircle className="h-5 w-5" />, group: 'My Workspace' },
  { label: 'My Results', path: '/my-results', icon: <BarChart3 className="h-5 w-5" />, group: 'My Workspace' },
  { label: 'Team Results', path: '/team/results', icon: <Users className="h-5 w-5" />, requiredRole: 'TM', group: 'Analysis' },
  { label: 'Department Results', path: '/department/results', icon: <Building2 className="h-5 w-5" />, requiredRole: 'HOD', group: 'Analysis' },
  { label: 'Organization Results', path: '/org/results', icon: <Globe className="h-5 w-5" />, requiredRole: 'CXO', group: 'Analysis' },
  { label: 'Cycle Management', path: '/admin/cycles', icon: <Target className="h-5 w-5" />, requiredRole: 'CXO', group: 'Administration' },
  { label: 'Employees', path: '/admin/employees', icon: <Users className="h-5 w-5" />, requiredRole: 'CXO', group: 'Administration' },
  { label: 'Assignments', path: '/admin/assignments', icon: <ClipboardList className="h-5 w-5" />, requiredRole: 'CXO', group: 'Administration' },
  { label: 'Competencies', path: '/admin/competencies', icon: <BookOpen className="h-5 w-5" />, requiredRole: 'CXO', group: 'Administration' },
  { label: 'Question Bank', path: '/admin/questions', icon: <HelpCircle className="h-5 w-5" />, requiredRole: 'CXO', group: 'Administration' },
  { label: 'Reports', path: '/admin/reports', icon: <FileText className="h-5 w-5" />, requiredRole: 'CXO', group: 'Administration' },
  { label: 'Settings', path: '/admin/settings', icon: <Settings2 className="h-5 w-5" />, requiredRole: 'CXO', group: 'Administration' },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: <ScrollText className="h-5 w-5" />, requiredRole: 'CXO', group: 'Administration' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.requiredRole || hasRole(user.group_name, item.requiredRole)
  );

  const groups = filteredItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        'sidebar-gradient flex flex-col border-r border-sidebar-border transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-accent-foreground">Motadata</span>
            <span className="text-xs text-sidebar-muted">360 Feedback</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-4">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                {group}
              </p>
            )}
            {items.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-0.5',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
