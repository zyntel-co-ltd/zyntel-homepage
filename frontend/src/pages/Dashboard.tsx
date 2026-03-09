import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCharts, canAccessAdmin, canAccessLRIDS } from '@/utils/permissions';
import { Footer } from '@/components/shared';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role as 'admin' | 'manager' | 'technician' | 'viewer' | undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="dashboard-page" style={{ backgroundColor: 'var(--main-color)' }}>
      <header style={{ backgroundColor: 'var(--pure-white)', height: '80px' }}>
        <div className="header-container" style={{ padding: '15px 20px 0 20px' }}>
          <div className="header-left">
            <div className="logo">
              <img src="/images/logo-nakasero.png" alt="logo" />
            </div>
            <h1>NHL Laboratory Dashboard</h1>
          </div>
          <div className="page">
            <span>Home</span>
            <a href="#" className="logout-button" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
              Logout
            </a>
            <span className={`three-dots-menu-container${menuOpen ? ' menu-open' : ''}`} ref={menuRef}>
              <button type="button" className="three-dots-button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="true" aria-label="Menu"><i className="fas fa-ellipsis-v" aria-hidden /></button>
              <ul className="dropdown-menu">
                {canAccessAdmin(role) && <li><a href="/admin"><i className="fas fa-cog mr-2"></i> Admin Panel</a></li>}
                <li><a href="/reception"><i className="fas fa-table mr-2"></i> Reception</a></li>
                {canAccessCharts(role) && <li><a href="/revenue"><i className="fas fa-chart-line mr-2"></i> Revenue</a></li>}
                {canAccessCharts(role) && <li><a href="/tests"><i className="fas fa-vials mr-2"></i> Tests</a></li>}
                {canAccessCharts(role) && <li><a href="/labguru-insights"><i className="fas fa-flask mr-2"></i> LabGuru</a></li>}
              </ul>
            </span>
          </div>
        </div>
      </header>

      <div className="main-container" style={{ padding: '5rem 1rem', flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="dice-grid">
          {/* Chart Dice - admin, manager only (technician cannot see) */}
          {canAccessCharts(role) && (
            <>
              <a href="/revenue" className="dice-tile" data-type="chart">
                <span className="dice-label">Revenue</span>
              </a>
              <a href="/tests" className="dice-tile" data-type="chart">
                <span className="dice-label">Tests</span>
              </a>
              <a href="/labguru-insights" className="dice-tile" data-type="chart">
                <span className="dice-label">LabGuru</span>
              </a>
              <a href="/numbers" className="dice-tile" data-type="chart">
                <span className="dice-label">Numbers</span>
              </a>
              <a href="/tat" className="dice-tile" data-type="chart">
                <span className="dice-label">TAT</span>
              </a>
            </>
          )}

          {/* Table Dice - all authenticated (technician sees only these). Order: Reception, Tracker, Performance, Progress, LRIDS, Meta */}
          <a href="/reception" className="dice-tile" data-type="table">
            <span className="dice-label">Reception</span>
          </a>
          <a href="/tracker" className="dice-tile" data-type="table">
            <span className="dice-label">Tracker</span>
          </a>
          <a href="/performance" className="dice-tile" data-type="table">
            <span className="dice-label">Performance</span>
          </a>
          <a href="/progress" className="dice-tile" data-type="table">
            <span className="dice-label">Progress</span>
          </a>
          {canAccessLRIDS(role) && (
            <a href="/lrids" className="dice-tile" data-type="display">
              <span className="dice-label">LRIDS</span>
            </a>
          )}
          <a href="/meta" className="dice-tile" data-type="table">
            <span className="dice-label">Meta</span>
          </a>
        </div>
      </div>

      <Footer variant="dashboard" />
    </div>
  );
};

export default Dashboard;