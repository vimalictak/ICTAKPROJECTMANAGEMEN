import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Sidebar, TopNav, MobileSidebar } from './index';
import { selectSidebarCollapsed, selectTheme, closeCommandPalette, selectCommandPaletteOpen } from '../../store/uiSlice';
import { CommandPalette } from '../common/CommandPalette';
import { useSocket } from '../../hooks/useSocket';

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useSelector(selectTheme);
  const cmdOpen = useSelector(selectCommandPaletteOpen);
  const dispatch = useDispatch();

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch(cmdOpen ? closeCommandPalette() : { type: 'ui/openCommandPalette' });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cmdOpen, dispatch]);

  // Socket connection
  useSocket();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav onMobileMenuToggle={() => setMobileOpen(o => !o)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      {cmdOpen && <CommandPalette onClose={() => dispatch(closeCommandPalette())} />}
    </div>
  );
};

export default AppLayout;
