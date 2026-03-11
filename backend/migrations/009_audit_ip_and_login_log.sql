-- Add ip_address to audit_log for operational actions
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Login audit table (separate for login-specific events; user_id null on failed login)
CREATE TABLE IF NOT EXISTS login_audit (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_audit_created_at ON login_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_login_audit_username ON login_audit(username);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
