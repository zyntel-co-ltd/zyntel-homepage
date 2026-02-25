import React from 'react';
import { Footer } from '@/components/shared';

interface PlaceholderProps {
  title: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title }) => {
  return (
    <div className="min-h-screen bg-background-color">
      {/* Header */}
      <header>
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <img src="/images/logo-nakasero.png" alt="logo" />
            </div>
            <h1>NHL Laboratory Dashboard</h1>
          </div>
          <div className="page">
            <span>Home</span>
            <a href="#" className="logout-button" id="logout-button">Logout</a>
            <span className="three-dots-menu-container">
              <button className="three-dots-button" aria-label="Menu"><i className="fas fa-ellipsis-v" aria-hidden /></button>
              <ul className="dropdown-menu">
                <li><a href="/dashboard">Dashboard</a></li>
                <li><a href="/revenue">Revenue</a></li>
                <li><a href="/tests">Tests</a></li>
                <li><a href="/numbers">Numbers</a></li>
                <li><a href="/tat">TAT</a></li>
              </ul>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="card text-center py-20 max-w-2xl mx-4">
          <div className="text-6xl mb-6">🚧</div>
          <h2 className="text-3xl font-bold text-main-color mb-4">
            {title} - Coming Soon
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            This feature is under development and will be available in the next update.
          </p>
          <a 
            href="/dashboard" 
            className="inline-block bg-main-color text-white px-6 py-3 rounded-lg hover:bg-hover-color transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Dashboard
          </a>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Placeholder;