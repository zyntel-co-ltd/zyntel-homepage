import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!username || !password) {
        setError('Please enter username/email and password');
        setIsLoading(false);
        return;
      }

      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername?.trim()) {
      setResetMessage('Please enter your username');
      return;
    }

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUsername.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setResetMessage(data.message || 'Contact your administrator to reset your password in Admin > Users.');
      } else {
        setResetMessage(data.error || 'Request failed. Please try again.');
      }
    } catch (err) {
      setResetMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="image-column">
        <img src="/images/zyntel_no_background.png" alt="Zyntel Icon" className="full-height-image" />
      </div>

      <div className="login-column">
        <div className="login-box">
          <h1>Zyntel</h1>
          <p>Data Analysis Experts</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-group password-group">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <i
                className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>

            {error && (
              <div className="message-box error">
                {error}
              </div>
            )}

            <div className="info-line">
              <span>Measured</span> | <span>Managed</span>
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="forgot-password">
              <a href="#" onClick={(e) => { e.preventDefault(); setShowResetModal(true); }}>
                Forgot Password?
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowResetModal(false);
                  setResetMessage('');
                  setResetUsername('');
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePasswordReset}>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  required
                />
              </div>

              {resetMessage && (
                <div className={`message-box ${resetMessage.includes('sent') ? 'success' : 'error'}`}>
                  {resetMessage}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetMessage('');
                    setResetUsername('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;