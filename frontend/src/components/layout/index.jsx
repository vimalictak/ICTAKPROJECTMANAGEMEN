import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Zap, BookOpen,
  Users, Bell, BarChart3, MessageSquare, Settings, Search,
  ChevronLeft, ChevronRight, LogOut, Moon, Sun, Plus, Building2,
  Menu, X, ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar, Badge, Button, Tooltip, DropdownMenu } from '../ui/index';
import { toggleSidebar, toggleTheme, selectSidebarCollapsed, selectTheme, openCommandPalette } from '../../store/uiSlice';
import { selectUser, logoutUser } from '../../features/auth/authSlice';
import { selectUnreadCount } from '../../features/notifications/notificationsSlice';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Projects', icon: FolderKanban, to: '/projects' },
  { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
  { label: 'Sprints', icon: Zap, to: '/sprints' },
  { label: 'Stories', icon: BookOpen, to: '/stories' },
  { label: 'Calendar', icon: BarChart3, to: '/calendar' },
  { label: 'Reports', icon: BarChart3, to: '/reports' },
  { label: 'Feedback', icon: MessageSquare, to: '/feedback' },
  { separator: true },
  { label: 'Team', icon: Users, to: '/users', adminOnly: true },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export const Sidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const collapsed = useSelector(selectSidebarCollapsed);
  const user = useSelector(selectUser);

  const isActive = (to) => location.pathname.startsWith(to);
  const canAdmin = user?.roles?.some(r => ['super-admin', 'admin', 'manager'].includes(r));

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col border-r bg-card h-full overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className={cn('flex items-center h-14 px-4 border-b shrink-0', collapsed ? 'justify-center' : 'gap-2')}>
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="font-bold text-sm text-foreground whitespace-nowrap">
              ProjectFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item, i) => {
          if (item.separator) return <div key={i} className="my-2 h-px bg-border mx-2" />;
          if (item.adminOnly && !canAdmin) return null;
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Tooltip key={item.to} content={collapsed ? item.label : null} side="right">
              <Link
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center' : '',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="whitespace-nowrap">{item.label}</motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Avatar src={user?.avatar} name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.roles?.[0]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full border bg-background flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </motion.aside>
  );
};

export const TopNav = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const theme = useSelector(selectTheme);
  const unreadCount = useSelector(selectUnreadCount);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => { dispatch(logoutUser()); navigate('/login'); };

  const userMenuItems = [
    { label: 'Profile', icon: Users, onClick: () => navigate('/profile') },
    { label: 'Settings', icon: Settings, onClick: () => navigate('/settings') },
    { separator: true },
    { label: 'Logout', icon: LogOut, onClick: handleLogout, destructive: true },
  ];

  return (
    <header className="h-14 border-b bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center px-4 gap-3">
      {/* Mobile menu */}
      <button className="lg:hidden" onClick={() => setMobileMenuOpen(o => !o)}>
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Search */}
      <button
        onClick={() => dispatch(openCommandPalette())}
        className="flex items-center gap-2 rounded-md border px-3 h-8 text-sm text-muted-foreground hover:bg-accent transition-colors flex-1 max-w-sm"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span>Search...</span>
        <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-1 rounded border px-1.5 text-xs font-medium">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme */}
        <Tooltip content="Toggle theme">
          <Button variant="ghost" size="icon" onClick={() => dispatch(toggleTheme())}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </Tooltip>

        {/* Notifications */}
        <Tooltip content="Notifications">
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </Tooltip>

        {/* Create */}
        <Button size="sm" className="hidden sm:flex gap-1.5" onClick={() => navigate('/tasks/new')}>
          <Plus className="h-4 w-4" />
          <span>Create</span>
        </Button>

        {/* User menu */}
        <DropdownMenu
          trigger={
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors">
              <Avatar src={user?.avatar} name={user?.name} size="sm" />
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
            </button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
};

// Mobile sidebar overlay
export const MobileSidebar = ({ open, onClose }) => {
  const location = useLocation();

  React.useEffect(() => { onClose(); }, [location.pathname]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-card border-r lg:hidden">
            <Sidebar />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
