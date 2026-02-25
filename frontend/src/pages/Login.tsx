import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isViewer } from '@/utils/permissions';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

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

      const user = await login(username, password);
      navigate(isViewer(user.role as any) ? '/lrids' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="login-page">
      <div className="image-column">
        <img src="/images/zyntel_no_background.png" alt="Zyntel Icon" className="full-height-image" />
      </div>

      <div className="login-column">
        <div className="login-box">
          <img src="/images/zyntel_full_cyan.png" alt="Zyntel" className="login-logo" />
          <p>Operational Intelligence Platform</p>

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
                  className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: 'pointer' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                />
            </div>

            {error && (
              <div className="message-box error">
                {error}
              </div>
            )}

            <div className="info-line">
              <span className="info-highlight">Measured</span> | <span className="info-highlight">Managed</span>
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

      {/* Forgot Password Modal - simple contact admin message */}
      {showResetModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Forgot Password</h3>
              <button className="modal-close" onClick={() => setShowResetModal(false)}>&times;</button>
            </div>
            <p className="forgot-password-message">
              Please contact your administrator to reset your password. Administrators can reset passwords in Admin Panel &gt; Users.
            </p>
            <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn-primary" onClick={() => setShowResetModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;