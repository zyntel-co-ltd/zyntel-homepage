import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

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
            <span className="three-dots-menu-container">
              <button className="three-dots-button">&#x22EE;</button>
              <ul className="dropdown-menu">
                <li><a href="/admin">Admin Panel</a></li>
                <li><a href="/reception">Reception</a></li>
                <li><a href="/revenue">Revenue</a></li>
                <li><a href="/tests">Tests</a></li>
              </ul>
            </span>
          </div>
        </div>
      </header>

      <div className="main-container" style={{ padding: '5rem 1rem', flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="dice-grid">
          {/* Dashboard Chart Dice */}
          <a href="/revenue" className="dice-tile" data-type="chart">
            <span className="dice-label">Revenue</span>
          </a>
          <a href="/tests" className="dice-tile" data-type="chart">
            <span className="dice-label">Tests</span>
          </a>
          <a href="/numbers" className="dice-tile" data-type="chart">
            <span className="dice-label">Numbers</span>
          </a>
          <a href="/tat" className="dice-tile" data-type="chart">
            <span className="dice-label">TAT</span>
          </a>

          {/* Tables Dice */}
          <a href="/reception" className="dice-tile" data-type="table">
            <span className="dice-label">Reception</span>
          </a>
          <a href="/progress" className="dice-tile" data-type="table">
            <span className="dice-label">Progress</span>
          </a>
          <a href="/lrids" className="dice-tile" data-type="display">
            <span className="dice-label">LRIDS</span>
          </a>
          <a href="/performance" className="dice-tile" data-type="table">
            <span className="dice-label">Performance</span>
          </a>
          <a href="/tracker" className="dice-tile" data-type="table">
            <span className="dice-label">Tracker</span>
          </a>
          <a href="/meta" className="dice-tile" data-type="table">
            <span className="dice-label">Meta</span>
          </a>
        </div>
      </div>

      <footer style={{ position: 'fixed', right: '1rem', bottom: '1rem', background: 'transparent', padding: '1rem', zIndex: 99, marginTop: 'auto' }}>
        <img src="/images/zyntel_no_background.png" alt="Zyntel Icon" className="footer-logo" style={{ height: '200px' }} />
      </footer>
    </div>
  );
};

export default Dashboard;