import React, { useState, useEffect, useRef } from 'react';
import { Modal, Toast, ConfirmDialog, Pagination, Footer } from '@/components/shared';
import { LAB_SECTIONS, TAT_OPTIONS } from '@/constants/metaOptions';
import { useAuth } from '@/contexts/AuthContext';
import { canDeleteUser, canResetPassword, canDeactivateUser } from '@/utils/permissions';

const UNMATCHED_PAGE_SIZE = 15;

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'technician' | 'viewer';
  is_active: boolean;
  last_login: string;
}

interface UnmatchedTest {
  id: number;
  test_name: string;
  source: string;
  first_seen: string;
  occurrence_count: number;
}

interface DashboardStats {
  totalTests: number;
  totalUsers: number;
  unmatchedTests: number;
  recentCancellations: number;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role as 'admin' | 'manager' | 'technician' | 'viewer' | undefined;
  const [activeTab, setActiveTab] = useState<'users' | 'unmatched' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [unmatchedTests, setUnmatchedTests] = useState<UnmatchedTest[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'technician' as 'admin' | 'manager' | 'technician' | 'viewer',
  });

  // Settings State
  const [monthlyTarget, setMonthlyTarget] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    target: 1500000000,
  });

  const [testsTarget, setTestsTarget] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    target: 10000,
  });

  const [numbersTarget, setNumbersTarget] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    target: 15000,
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<{ userId: number; username: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [unmatchedEdits, setUnmatchedEdits] = useState<Record<number, { labSection: string; tat: number; price: number }>>({});
  const [unmatchedSaving, setUnmatchedSaving] = useState<number | 'all' | null>(null);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLSpanElement>(null);
  const [showPasswordUserForm, setShowPasswordUserForm] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (!adminMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) setAdminMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [adminMenuOpen]);

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchTargets();
    }
  }, [activeTab]);

  const fetchTargets = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [revRes, testsRes, numbersRes] = await Promise.all([
        fetch(`/api/settings/monthly-target?month=${monthlyTarget.month}&year=${monthlyTarget.year}`, { headers }),
        fetch(`/api/settings/tests-target?month=${testsTarget.month}&year=${testsTarget.year}`, { headers }),
        fetch(`/api/settings/numbers-target?month=${numbersTarget.month}&year=${numbersTarget.year}`, { headers }),
      ]);
      if (revRes.ok) {
        const d = await revRes.json();
        if (d?.target != null) setMonthlyTarget(prev => ({ ...prev, target: d.target }));
      }
      if (testsRes.ok) {
        const d = await testsRes.json();
        if (d?.target != null) setTestsTarget(prev => ({ ...prev, target: d.target }));
      }
      if (numbersRes.ok) {
        const d = await numbersRes.json();
        if (d?.target != null) setNumbersTarget(prev => ({ ...prev, target: d.target }));
      }
    } catch (e) {
      console.error('Error fetching targets:', e);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (activeTab === 'users') {
        const response = await fetch('/api/admin/users', { headers });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error('Failed to fetch users');
          setUsers([]);
        }
      } else if (activeTab === 'unmatched') {
        // Fetch stats and unmatched tests
        const [statsResponse, unmatchedResponse] = await Promise.all([
          fetch('/api/admin/stats', { headers }),
          fetch('/api/admin/unmatched-tests', { headers })
        ]);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        if (unmatchedResponse.ok) {
          const unmatchedData = await unmatchedResponse.json();
          setUnmatchedTests(unmatchedData);
          setUnmatchedPage(1);
        } else {
          setUnmatchedTests([]);
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      // Set empty data on error
      if (activeTab === 'users') setUsers([]);
      if (activeTab === 'unmatched') setUnmatchedTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        username: user.username,
        email: user.email || '',
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        username: '',
        email: '',
        password: '',
        role: 'technician',
      });
    }
    setUserModalOpen(true);
  };

  const handleUserSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (editingUser) {
        const payload = { email: userFormData.email, role: userFormData.role };
        const response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setToast({ message: `Updated user: ${userFormData.username}`, type: 'success' });
          setUserModalOpen(false);
          fetchData();
        } else {
          setToast({ message: data?.error || 'Failed to update user', type: 'error' });
        }
      } else {
        const payload = {
          username: userFormData.username.trim(),
          email: userFormData.email?.trim() || '',
          password: userFormData.password,
          role: userFormData.role
        };
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setToast({ message: `Created user: ${userFormData.username}`, type: 'success' });
          setUserModalOpen(false);
          fetchData();
        } else {
          setToast({ message: data?.error || 'Failed to create user', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setToast({ message: 'Error saving user', type: 'error' });
    }
  };

  const handleDeleteUser = (id: number) => {
    setConfirmDialog({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user?',
      onConfirm: () => {
        setConfirmDialog(null);
        doDeleteUser(id);
      },
    });
  };

  const doDeleteUser = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setToast({ message: 'User deleted successfully', type: 'success' });
        fetchData();
      } else {
        setToast({ message: 'Failed to delete user', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setToast({ message: 'Error deleting user', type: 'error' });
    }
  };

  const handleResetPassword = (user: User) => {
    setResetPasswordModal({ userId: user.id, username: user.username });
    setResetPasswordValue('');
  };

  const doResetPassword = async () => {
    if (!resetPasswordModal || !resetPasswordValue.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${resetPasswordModal.userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: resetPasswordValue })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setToast({ message: 'Password reset successfully', type: 'success' });
        setResetPasswordModal(null);
      } else {
        setToast({ message: data?.error || 'Failed to reset password', type: 'error' });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setToast({ message: 'Error resetting password', type: 'error' });
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${id}/toggle-active`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        setToast({ message: `User ${isActive ? 'deactivated' : 'activated'} successfully`, type: 'success' });
        fetchData();
      } else {
        setToast({ message: 'Failed to toggle user status', type: 'error' });
      }
    } catch (error) {
      console.error('Error toggling user active status:', error);
      setToast({ message: 'Error toggling user status', type: 'error' });
    }
  };

  const getUnmatchedEdit = (test: UnmatchedTest) => {
    return unmatchedEdits[test.id] ?? {
      labSection: 'CHEMISTRY',
      tat: 60,
      price: 0,
    };
  };

  const setUnmatchedEdit = (id: number, field: string, value: string | number) => {
    setUnmatchedEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { labSection: 'CHEMISTRY', tat: 60, price: 0 }),
        [field]: value,
      },
    }));
  };

  const handleAddUnmatchedToMeta = async (id: number) => {
    const edit = unmatchedEdits[id] ?? { labSection: 'CHEMISTRY', tat: 60, price: 0 };
    if (edit.price <= 0) {
      setToast({ message: 'Price must be greater than 0', type: 'error' });
      return;
    }
    setUnmatchedSaving(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/unmatched-tests/${id}/add-to-meta`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(edit),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setToast({ message: `Added ${data.testName} to Meta table`, type: 'success' });
        setUnmatchedEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
        fetchData();
      } else {
        setToast({ message: data?.error || 'Failed to add to Meta', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error adding to Meta', type: 'error' });
    } finally {
      setUnmatchedSaving(null);
    }
  };

  const handleAddAllUnmatchedToMeta = async () => {
    const items = unmatchedTests
      .map(t => ({
        id: t.id,
        ...getUnmatchedEdit(t),
      }))
      .filter(i => i.price > 0);
    if (items.length === 0) {
      setToast({ message: 'Add section, TAT, and price for at least one test. Price must be > 0.', type: 'error' });
      return;
    }
    setUnmatchedSaving('all');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/unmatched-tests/add-multiple-to-meta', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const succeeded = (data.results || []).filter((r: any) => r.success).length;
        setToast({ message: `Added ${succeeded} test(s) to Meta table`, type: 'success' });
        setUnmatchedEdits({});
        fetchData();
      } else {
        setToast({ message: data?.error || 'Failed to add to Meta', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error adding to Meta', type: 'error' });
    } finally {
      setUnmatchedSaving(null);
    }
  };

  const handleResolveUnmatched = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/unmatched-tests/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setToast({ message: 'Unmatched test marked as resolved', type: 'success' });
        fetchData();
      } else {
        setToast({ message: 'Failed to resolve unmatched test', type: 'error' });
      }
    } catch (error) {
      console.error('Error resolving unmatched test:', error);
      setToast({ message: 'Error resolving unmatched test', type: 'error' });
    }
  };

  const handleSaveMonthlyTarget = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/targets/revenue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(monthlyTarget)
      });

      if (response.ok) {
        setToast({ message: `Revenue target saved: UGX ${monthlyTarget.target.toLocaleString()} for ${new Date(2000, monthlyTarget.month - 1).toLocaleString('default', { month: 'long' })} ${monthlyTarget.year}`, type: 'success' });
      } else {
        setToast({ message: 'Failed to save revenue target', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving monthly target:', error);
      setToast({ message: 'Error saving monthly target', type: 'error' });
    }
  };

  const handleSaveTestsTarget = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/targets/tests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testsTarget)
      });

      if (response.ok) {
        setToast({ message: `Tests target saved: ${testsTarget.target} tests for ${new Date(2000, testsTarget.month - 1).toLocaleString('default', { month: 'long' })} ${testsTarget.year}`, type: 'success' });
      } else {
        setToast({ message: 'Failed to save tests target', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving tests target:', error);
      setToast({ message: 'Error saving tests target', type: 'error' });
    }
  };

  const handleSaveNumbersTarget = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/targets/numbers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(numbersTarget)
      });

      if (response.ok) {
        setToast({ message: `Numbers target saved: ${numbersTarget.target} requests for ${new Date(2000, numbersTarget.month - 1).toLocaleString('default', { month: 'long' })} ${numbersTarget.year}`, type: 'success' });
      } else {
        setToast({ message: 'Failed to save numbers target', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving numbers target:', error);
      setToast({ message: 'Error saving numbers target', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-background-color">
      {/* Fixed header - same as other pages */}
      <div className="admin-page-top">
        <header>
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <img src="/images/logo-nakasero.png" alt="logo" />
            </div>
            <div>
              <h1>NHL Laboratory Dashboard</h1>
            </div>
          </div>
          <div className="page">
                <a href="/dashboard" className="logout-button">
                  ← Back to Dashboard
                </a>
            <a href="#" className="logout-button" id="logout-button" onClick={(e) => { e.preventDefault(); localStorage.removeItem('token'); window.location.href = '/'; }}>Logout</a>
            <span className={`three-dots-menu-container${adminMenuOpen ? ' menu-open' : ''}`} ref={adminMenuRef}>
              <button type="button" className="three-dots-button" onClick={() => setAdminMenuOpen((o) => !o)} aria-expanded={adminMenuOpen} aria-haspopup="true" aria-label="Menu"><i className="fas fa-ellipsis-v" aria-hidden /></button>
              <ul className="dropdown-menu">
                <li><a href="/dashboard"><i className="fas fa-home mr-2"></i> Dashboard</a></li>
              </ul>
            </span>
          </div>
        </div>
      </header>
      </div>

      {/* Admin Panel Title */}
      <div className="admin-page-content" style={{
        paddingTop: 'calc(var(--app-header-height) + 16px)',
        paddingLeft: '30px',
        paddingRight: '30px',
        paddingBottom: 0
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            color: 'var(--main-color)',
            margin: '0'
          }}>
            <i className="fas fa-cog mr-2"></i>
            Admin Panel
          </h2>
        </div>
      </div>

      {/* Admin Tabs - EXACT VANILLA DESIGN */}
      <div style={{
        backgroundColor: 'var(--background-color)',
        borderBottom: '1px solid var(--border-bottom)',
        padding: '0 30px'
      }}>
        <div style={{
          display: 'flex',
          gap: '0'
        }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '15px 30px',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: activeTab === 'users' ? 'var(--hover-color)' : 'var(--main-color)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'users' ? '3px solid var(--hover-color)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'users') {
                e.currentTarget.style.color = 'var(--hover-color)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'users') {
                e.currentTarget.style.color = 'var(--main-color)';
              }
            }}
          >
            <i className="fas fa-users mr-2"></i>
            User Management
          </button>
          
          <button
            onClick={() => setActiveTab('unmatched')}
            style={{
              padding: '15px 30px',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: activeTab === 'unmatched' ? 'var(--hover-color)' : 'var(--main-color)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'unmatched' ? '3px solid var(--hover-color)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'unmatched') {
                e.currentTarget.style.color = 'var(--hover-color)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'unmatched') {
                e.currentTarget.style.color = 'var(--main-color)';
              }
            }}
          >
            <i className="fas fa-exclamation-triangle mr-2"></i>
            Unmatched Tests
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '15px 30px',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: activeTab === 'settings' ? 'var(--hover-color)' : 'var(--main-color)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '3px solid var(--hover-color)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'settings') {
                e.currentTarget.style.color = 'var(--hover-color)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'settings') {
                e.currentTarget.style.color = 'var(--main-color)';
              }
            }}
          >
            <i className="fas fa-sliders-h mr-2"></i>
            Settings
          </button>
        </div>
      </div>

      {/* Stats Cards - Only for Unmatched tab */}
      {stats && activeTab === 'unmatched' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          padding: '30px',
          backgroundColor: 'var(--background-color)'
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: 'var(--main-color)',
              marginBottom: '10px'
            }}>
              {stats.totalTests}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--border-color)'
            }}>
              Total Tests
            </div>
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#22c55e',
              marginBottom: '10px'
            }}>
              {stats.totalUsers}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--border-color)'
            }}>
              Active Users
            </div>
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#f59e0b',
              marginBottom: '10px'
            }}>
              {stats.unmatchedTests}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--border-color)'
            }}>
              Unmatched Tests
            </div>
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#ef4444',
              marginBottom: '10px'
            }}>
              {stats.recentCancellations}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--border-color)'
            }}>
              Recent Cancellations
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ padding: '30px' }}>
        {isLoading ? (
          <div className="loader">
            <div className="one"></div>
            <div className="two"></div>
            <div className="three"></div>
            <div className="four"></div>
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="card">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '25px'
                }}>
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    color: 'var(--main-color)',
                    margin: '0'
                  }}>
                    <i className="fas fa-users mr-2"></i>
                    User Management
                  </h3>
                  <button
                    onClick={() => openUserModal()}
                    style={{
                      backgroundColor: 'var(--main-color)',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--main-color)'}
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add New User
                  </button>
                </div>

                <div className="table-container">
                  <table className="neon-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td style={{ fontWeight: '500' }}>{user.username}</td>
                          <td>{user.email || 'N/A'}</td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '5px 12px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              backgroundColor: 
                                user.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' :
                                user.role === 'manager' ? 'rgba(245, 158, 11, 0.1)' :
                                user.role === 'technician' ? 'rgba(34, 197, 94, 0.1)' :
                                'rgba(156, 163, 175, 0.1)',
                              color:
                                user.role === 'admin' ? '#ef4444' :
                                user.role === 'manager' ? '#f59e0b' :
                                user.role === 'technician' ? '#22c55e' :
                                '#9ca3af'
                            }}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </td>
                          <td>
                            {user.is_active ? (
                              <span style={{ color: '#22c55e', fontWeight: '500' }}>
                                <i className="fas fa-circle mr-1" style={{ fontSize: '0.7rem' }}></i>
                                Active
                              </span>
                            ) : (
                              <span style={{ color: '#9ca3af', fontWeight: '500' }}>
                                <i className="fas fa-circle mr-1" style={{ fontSize: '0.7rem' }}></i>
                                Inactive
                              </span>
                            )}
                          </td>
                          <td>
                            {user.last_login
                              ? new Date(user.last_login).toLocaleString()
                              : 'Never'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => openUserModal(user)}
                                style={{
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '500',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <i className="fas fa-edit mr-1"></i>
                                Edit
                              </button>
                              {canResetPassword(role) && (
                                <button
                                  onClick={() => handleResetPassword(user)}
                                  style={{
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <i className="fas fa-key mr-1"></i>
                                  Reset
                                </button>
                              )}
                              {canDeactivateUser(role) && (
                                <button
                                  onClick={() => handleToggleActive(user.id, user.is_active)}
                                  style={{
                                    backgroundColor: user.is_active ? '#9ca3af' : '#22c55e',
                                    color: 'white',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <i className={`fas mr-1 ${user.is_active ? 'fa-ban' : 'fa-check'}`}></i>
                                  {user.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                              {canDeleteUser(role) && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  style={{
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <i className="fas fa-trash mr-1"></i>
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Unmatched Tests Tab */}
            {activeTab === 'unmatched' && (
              <div className="card">
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'var(--main-color)',
                  marginBottom: '25px'
                }}>
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Unmatched Test Names
                </h3>

                {unmatchedTests.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    color: 'var(--border-color)'
                  }}>
                    <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: '#22c55e', marginBottom: '20px' }}></i>
                    <p style={{ fontSize: '1.1rem' }}>No unmatched tests found! All test names are properly configured.</p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#92400e',
                      padding: '15px 20px',
                      borderRadius: '8px',
                      marginBottom: '25px',
                      fontSize: '0.9rem'
                    }}>
                      <i className="fas fa-exclamation-circle mr-2"></i>
                      <strong>Important:</strong> Add section, TAT, and price for each test below, then save to add them to the Meta table. Test names cannot be edited (they must match LabGuru data exactly).
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <button
                        onClick={handleAddAllUnmatchedToMeta}
                        disabled={unmatchedSaving === 'all'}
                        className="meta-actions-button"
                      >
                        <i className="fas fa-save mr-2"></i>
                        Save All to Meta
                      </button>
                    </div>

                    <div className="table-container">
                      <table className="neon-table">
                        <thead>
                          <tr>
                            <th>Test Name</th>
                            <th>Source</th>
                            <th>Occurrences</th>
                            <th>Section</th>
                            <th>TAT (min)</th>
                            <th>Price (UGX)</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatchedTests
                            .slice((unmatchedPage - 1) * UNMATCHED_PAGE_SIZE, unmatchedPage * UNMATCHED_PAGE_SIZE)
                            .map((test) => {
                            const edit = getUnmatchedEdit(test);
                            return (
                              <tr key={test.id}>
                                <td style={{
                                  fontFamily: 'monospace',
                                  fontWeight: '700',
                                  color: 'var(--main-color)',
                                  fontSize: '0.9rem'
                                }}>
                                  {test.test_name}
                                </td>
                                <td>{test.source}</td>
                                <td>
                                  <span style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600'
                                  }}>
                                    {test.occurrence_count} times
                                  </span>
                                </td>
                                <td>
                                  <select
                                    className="form-select"
                                    value={edit.labSection}
                                    onChange={(e) => setUnmatchedEdit(test.id, 'labSection', e.target.value)}
                                    style={{ minWidth: '140px' }}
                                  >
                                    {LAB_SECTIONS.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <select
                                    className="form-select"
                                    value={edit.tat}
                                    onChange={(e) => setUnmatchedEdit(test.id, 'tat', parseInt(e.target.value))}
                                    style={{ minWidth: '100px' }}
                                  >
                                    {TAT_OPTIONS.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-input"
                                    value={edit.price || ''}
                                    onChange={(e) => setUnmatchedEdit(test.id, 'price', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    min="0"
                                    style={{ width: '120px' }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleAddUnmatchedToMeta(test.id)}
                                    disabled={unmatchedSaving !== null || edit.price <= 0}
                                    className="action-button edit-button"
                                    style={{ margin: '0 4px' }}
                                  >
                                    <i className="fas fa-plus mr-1"></i>
                                    {unmatchedSaving === test.id ? 'Saving...' : 'Add to Meta'}
                                  </button>
                                  <button
                                    onClick={() => handleResolveUnmatched(test.id)}
                                    disabled={unmatchedSaving !== null}
                                    className="action-button resolve-button"
                                    style={{ margin: '0 4px' }}
                                    title="Mark as resolved without adding to meta"
                                  >
                                    <i className="fas fa-check mr-1"></i>
                                    Resolve
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      currentPage={unmatchedPage}
                      totalPages={Math.ceil(unmatchedTests.length / UNMATCHED_PAGE_SIZE) || 1}
                      totalRecords={unmatchedTests.length}
                      onPageChange={setUnmatchedPage}
                    />
                  </>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="card">
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'var(--main-color)',
                  marginBottom: '30px'
                }}>
                  <i className="fas fa-sliders-h mr-2"></i>
                  Settings
                </h3>

                <div style={{ maxWidth: '800px' }}>
                  {/* Monthly Revenue Target Section */}
                  <div style={{ marginBottom: '40px' }}>
                    <h4 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: 'var(--main-color)',
                      marginBottom: '20px'
                    }}>
                      <i className="fas fa-dollar-sign mr-2"></i>
                      Monthly Revenue Target
                    </h4>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '20px',
                      marginBottom: '25px'
                    }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Month
                        </label>
                        <select
                          value={monthlyTarget.month}
onChange={(e) =>
                          setMonthlyTarget((prev) => ({
                            ...prev,
                            month: parseInt(e.target.value),
                          }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i).toLocaleString('default', {
                                month: 'long',
                              })}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Year
                        </label>
                        <input
                          type="number"
                          value={monthlyTarget.year}
                          onChange={(e) =>
                            setMonthlyTarget((prev) => ({
                              ...prev,
                              year: parseInt(e.target.value),
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Target (UGX)
                        </label>
                        <input
                          type="number"
                          value={monthlyTarget.target}
                          onChange={(e) =>
                            setMonthlyTarget((prev) => ({
                              ...prev,
                              target: parseInt(e.target.value),
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveMonthlyTarget}
                      style={{
                        backgroundColor: 'var(--main-color)',
                        color: 'white',
                        padding: '10px 25px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--main-color)'}
                    >
                      <i className="fas fa-save mr-2"></i>
                      Save Monthly Revenue Target
                    </button>
                  </div>

                  {/* Monthly Tests Target - NEW SECTION */}
                  <div style={{ marginBottom: '40px' }}>
                    <h4 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: 'var(--main-color)',
                      marginBottom: '20px'
                    }}>
                      <i className="fas fa-vials mr-2"></i>
                      Monthly Tests Target
                    </h4>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '20px',
                      marginBottom: '25px'
                    }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Month
                        </label>
                        <select
                          value={testsTarget.month}
                          onChange={(e) =>
                            setTestsTarget((prev) => ({
                              ...prev,
                              month: parseInt(e.target.value),
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i).toLocaleString('default', {
                                month: 'long',
                              })}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Year
                        </label>
                        <input
                          type="number"
                          value={testsTarget.year}
                          onChange={(e) =>
                            setTestsTarget((prev) => ({
                              ...prev,
                              year: parseInt(e.target.value),
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Target (Tests)
                        </label>
                        <input
                          type="number"
                          value={testsTarget.target}
                          onChange={(e) =>
                            setTestsTarget((prev) => ({
                              ...prev,
                              target: parseInt(e.target.value),
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveTestsTarget}
                      style={{
                        backgroundColor: 'var(--main-color)',
                        color: 'white',
                        padding: '10px 25px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--main-color)'}
                    >
                      <i className="fas fa-save mr-2"></i>
                      Save Tests Target
                    </button>
                  </div>

                  {/* Monthly Numbers Target - NEW SECTION */}
                  <div style={{ marginBottom: '40px' }}>
                    <h4 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: 'var(--main-color)',
                      marginBottom: '20px'
                    }}>
                      <i className="fas fa-chart-bar mr-2"></i>
                      Monthly Numbers Target
                    </h4>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '20px',
                      marginBottom: '25px'
                    }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Month
                        </label>
                        <select
                          value={numbersTarget.month}
                          onChange={(e) =>
                            setNumbersTarget((prev) => ({
                              ...prev,
                              month: parseInt(e.target.value),
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i).toLocaleString('default', {
                                month: 'long',
                              })}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Year
                        </label>
                        <input
                          type="number"
                          value={numbersTarget.year}
                          onChange={(e) =>
                            setNumbersTarget((prev) => ({
                              ...prev,
                              year: parseInt(e.target.value),
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: 'var(--border-color)',
                          marginBottom: '8px'
                        }}>
                          Target (Requests)
                        </label>
                        <input
                          type="number"
                          value={numbersTarget.target}
                          onChange={(e) =>
                            setNumbersTarget((prev) => ({
                              ...prev,
                              target: parseInt(e.target.value),
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--main-color)',
                            backgroundColor: 'white'
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveNumbersTarget}
                      style={{
                        backgroundColor: 'var(--main-color)',
                        color: 'white',
                        padding: '10px 25px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--main-color)'}
                    >
                      <i className="fas fa-save mr-2"></i>
                      Save Numbers Target
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <div className="form-grid">
          <div className="form-field span-2">
            <label className="form-label">Username <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              className="form-input"
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              placeholder="Required"
              disabled={!!editingUser}
            />
          </div>

          <div className="form-field span-2">
            <label className="form-label">Email</label>
            <p className="form-hint" style={{ marginBottom: 6 }}>Optional. Unique per user. Used for login recovery.</p>
            <input
              type="email"
              className="form-input"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              placeholder="user@example.com (optional)"
            />
          </div>

          {!editingUser && (
            <div className="form-field span-2">
              <label className="form-label">Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="password-group">
                <input
                  type={showPasswordUserForm ? 'text' : 'password'}
                  className="form-input"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Required"
                />
                <i
                  className={`fa ${showPasswordUserForm ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`}
                  onClick={() => setShowPasswordUserForm((v) => !v)}
                  aria-label={showPasswordUserForm ? 'Hide password' : 'Show password'}
                />
              </div>
            </div>
          )}

          <div className="form-field span-2">
            <label className="form-label">Role <span style={{ color: '#ef4444' }}>*</span></label>
            <select
              className="form-select"
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="technician">Technician</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn--secondary" onClick={() => setUserModalOpen(false)}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={handleUserSubmit}
            disabled={!userFormData.username || (!editingUser && !userFormData.password)}
          >
            {editingUser ? 'Update User' : 'Create User'}
          </button>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {resetPasswordModal && (
        <Modal
          isOpen={true}
          onClose={() => { setResetPasswordModal(null); setShowPasswordReset(false); }}
          title={`Reset Password: ${resetPasswordModal.username}`}
        >
          <div className="form-field">
            <label className="form-label">New Password</label>
            <div className="password-group">
              <input
                type={showPasswordReset ? 'text' : 'password'}
                className="form-input"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Enter new password"
              />
              <i
                className={`fa ${showPasswordReset ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`}
                onClick={() => setShowPasswordReset((v) => !v)}
                aria-label={showPasswordReset ? 'Hide password' : 'Show password'}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn--secondary" onClick={() => setResetPasswordModal(null)}>Cancel</button>
            <button
              className="btn btn--primary"
              onClick={doResetPassword}
              disabled={!resetPasswordValue.trim()}
            >
              Reset Password
            </button>
          </div>
        </Modal>
      )}

      <Footer />
    </div>
  );
};

export default Admin;