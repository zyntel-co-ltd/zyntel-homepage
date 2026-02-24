import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { JWT_SECRET } from '../config/jwt';
import { User, JWTPayload } from '../types';

export const login = async (username: string, password: string) => {
  const result = await query(
    'SELECT * FROM users WHERE username = $1 AND is_active = true',
    [username]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user: User = result.rows[0];
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  // Use any to bypass strict typing
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  } as any);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
};

export const createUser = async (
  username: string,
  email: string,
  password: string,
  role: string,
  createdBy: number
) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (username, email, password_hash, role) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, username, email, role, is_active, created_at`,
    [username, email, hashedPassword, role]
  );

  // Log audit
  await query(
    `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values) 
     VALUES ($1, $2, $3, $4, $5)`,
    [createdBy, 'CREATE_USER', 'users', result.rows[0].id, JSON.stringify(result.rows[0])]
  );

  return result.rows[0];
};

export const getAllUsers = async () => {
  const result = await query(
    'SELECT id, username, email, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
  );
  return result.rows;
};

export const updateUser = async (
  userId: number,
  updates: Partial<User>,
  updatedBy: number
) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updates.email !== undefined) {
    fields.push(`email = $${paramCount++}`);
    values.push(updates.email);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramCount++}`);
    values.push(updates.role);
  }
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${paramCount++}`);
    values.push(updates.is_active);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramCount} 
     RETURNING id, username, email, role, is_active`,
    values
  );

  // Log audit
  await query(
    `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values) 
     VALUES ($1, $2, $3, $4, $5)`,
    [updatedBy, 'UPDATE_USER', 'users', userId, JSON.stringify(updates)]
  );

  return result.rows[0];
};

export const deleteUser = async (userId: number, deletedBy: number) => {
  await query(
    `INSERT INTO audit_log (user_id, action, table_name, record_id) 
     VALUES ($1, $2, $3, $4)`,
    [deletedBy, 'DELETE_USER', 'users', userId]
  );

  await query('DELETE FROM users WHERE id = $1', [userId]);
};

export const resetPassword = async (userId: number, newPassword: string, resetBy: number) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
    hashedPassword,
    userId,
  ]);

  // Log audit
  await query(
    `INSERT INTO audit_log (user_id, action, table_name, record_id) 
     VALUES ($1, $2, $3, $4)`,
    [resetBy, 'RESET_PASSWORD', 'users', userId]
  );
};