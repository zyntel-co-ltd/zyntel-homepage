import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessAdmin, canExport } from '@/utils/permissions';

interface HeaderProps {
  title: string;
  pageTitle: string;
  onLogout?: () => void;
  onResetFilters?: () => void;
  showResetFilters?: boolean;
  menuItems?: Array<{
    label: string;
    href: string;
    icon?: string;
    onClick?: () => void;
  }>;
}

const Header: React.FC<HeaderProps> = ({
  title,
  pageTitle,
  onLogout,
  onResetFilters,
  showResetFilters = false,
  menuItems = []
}) => {
  const { user } = useAuth();
  const role = user?.role as 'admin' | 'manager' | 'technician' | 'viewer' | undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const defaultMenuItems: HeaderProps['menuItems'] = [
    ...(canAccessAdmin(role) ? [{ label: 'Admin Panel', href: '/admin', icon: 'fas fa-cog' }] : []),
    { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
  ];

  const filteredPageItems = menuItems.filter((m) => {
    const isExport = m.label.toLowerCase().includes('export');
    return !isExport || canExport(role);
  });
  const allMenuItems = [...defaultMenuItems, ...filteredPageItems];

  return (
    <header>
      <div className="header-container">
        <div className="header-left">
          <div className="logo">
            <img src="/images/logo-nakasero.png" alt="logo" />
          </div>
          <h1>{title}</h1>
        </div>
        <div className="page page-table">
          <span>{pageTitle}</span>
          {onLogout && (
            <a 
              href="#" 
              className="logout-button" 
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }}
            >
              Logout
            </a>
          )}
          {showResetFilters && onResetFilters && (
            <a 
              href="#" 
              className="logout-button"
              onClick={(e) => {
                e.preventDefault();
                onResetFilters();
              }}
            >
              Reset Filters
            </a>
          )}
          <span className={`three-dots-menu-container${menuOpen ? ' menu-open' : ''}`} ref={menuRef}>
            <button
              type="button"
              className="three-dots-button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              &#x22EE;
            </button>
            <ul className="dropdown-menu">
              {allMenuItems.map((item, index) => (
                <li key={index}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      if ('onClick' in item && item.onClick) {
                        e.preventDefault();
                        item.onClick();
                      }
                      setMenuOpen(false);
                    }}
                  >
                    {item.icon && <i className={item.icon}></i>} {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;