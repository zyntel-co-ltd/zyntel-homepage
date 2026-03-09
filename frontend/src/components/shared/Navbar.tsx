import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCharts, canAccessLRIDS } from '@/utils/permissions';

interface NavbarProps {
  type?: 'table' | 'chart';
}

const Navbar: React.FC<NavbarProps> = ({ type = 'table' }) => {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role as 'admin' | 'manager' | 'technician' | 'viewer' | undefined;

  const tableLinks = [
    { path: '/dashboard', label: 'Home', show: true },
    { path: '/reception', label: 'Reception', show: true },
    { path: '/tracker', label: 'Tracker', show: true },
    { path: '/performance', label: 'Performance', show: true },
    { path: '/progress', label: 'Progress', show: true },
    { path: '/lrids', label: 'LRIDS', show: canAccessLRIDS(role) },
    { path: '/meta', label: 'Meta', show: true },
  ];

  const chartLinks = [
    { path: '/dashboard', label: 'Home', show: true },
    { path: '/revenue', label: 'Revenue', show: canAccessCharts(role) },
    { path: '/tests', label: 'Tests', show: canAccessCharts(role) },
    { path: '/labguru-insights', label: 'LabGuru', show: canAccessCharts(role) },
    { path: '/numbers', label: 'Numbers', show: canAccessCharts(role) },
    { path: '/tat', label: 'TAT', show: canAccessCharts(role) },
  ];

  const rawLinks = type === 'chart' ? chartLinks : tableLinks;
  const links = rawLinks.filter((l) => l.show);
  const navbarClass = type === 'chart' ? 'navbar chart-navbar' : 'navbar';

  return (
    <nav className={navbarClass}>
      {links.map((link) => (
        <a
          key={link.path}
          href={link.path}
          className={location.pathname === link.path ? 'active' : ''}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
};

export default Navbar;