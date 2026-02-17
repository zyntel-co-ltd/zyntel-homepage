import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/shared';

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

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
        const response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(userFormData)
        });

        if (response.ok) {
          alert(`Updated user: ${userFormData.username}`);
        } else {
          alert('Failed to update user');
        }
      } else {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers,
          body: JSON.stringify(userFormData)
        });

        if (response.ok) {
          alert(`Created user: ${userFormData.username}`);
        } else {
          alert('Failed to create user');
        }
      }
      setUserModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert(`User deleted successfully`);
        fetchData();
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const handleResetPassword = async (id: number) => {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (response.ok) {
        alert('Password reset successfully');
      } else {
        alert('Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password');
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
        alert(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
        fetchData();
      } else {
        alert('Failed to toggle user status');
      }
    } catch (error) {
      console.error('Error toggling user active status:', error);
      alert('Error toggling user status');
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
        alert('Unmatched test marked as resolved');
        fetchData();
      } else {
        alert('Failed to resolve unmatched test');
      }
    } catch (error) {
      console.error('Error resolving unmatched test:', error);
      alert('Error resolving unmatched test');
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
        alert(`Revenue target saved: UGX ${monthlyTarget.target.toLocaleString()} for ${new Date(2000, monthlyTarget.month - 1).toLocaleString('default', { month: 'long' })} ${monthlyTarget.year}`);
      } else {
        alert('Failed to save revenue target');
      }
    } catch (error) {
      console.error('Error saving monthly target:', error);
      alert('Error saving monthly target');
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
        alert(`Tests target saved: ${testsTarget.target} tests for ${new Date(2000, testsTarget.month - 1).toLocaleString('default', { month: 'long' })} ${testsTarget.year}`);
      } else {
        alert('Failed to save tests target');
      }
    } catch (error) {
      console.error('Error saving tests target:', error);
      alert('Error saving tests target');
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
        alert(`Numbers target saved: ${numbersTarget.target} requests for ${new Date(2000, numbersTarget.month - 1).toLocaleString('default', { month: 'long' })} ${numbersTarget.year}`);
      } else {
        alert('Failed to save numbers target');
      }
    } catch (error) {
      console.error('Error saving numbers target:', error);
      alert('Error saving numbers target');
    }
  };

  return (
    <div className="min-h-screen bg-background-color">
      {/* Header */}
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
                <a href="/dashboard"  className="logout-button">
                  ← Back to Dashboard
                </a>
            <a href="#" className="logout-button" id="logout-button">Logout</a>
            <span className="three-dots-menu-container">
              <button className="three-dots-button">&#x22EE;</button>
              <ul className="dropdown-menu">
                <li><a href="/dashboard"><i className="fas fa-home mr-2"></i> Dashboard</a></li>
                <li><a href="/reception"><i className="fas fa-table mr-2"></i> Reception</a></li>
                <li><a href="/admin"><i className="fas fa-cog mr-2"></i> Admin Panel</a></li>
              </ul>
            </span>
          </div>
        </div>
      </header>

      {/* Admin Panel Title */}
      <div style={{
        marginTop: '90px',
        padding: '0 30px'
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
                              <button
                                onClick={() => handleResetPassword(user.id)}
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
                      <strong>Important:</strong> Copy test names exactly as shown below when adding to the Meta Table. This ensures proper matching with LabGuru data.
                    </div>

                    <div className="table-container">
                      <table className="neon-table">
                        <thead>
                          <tr>
                            <th>Test Name</th>
                            <th>Source</th>
                            <th>First Seen</th>
                            <th>Occurrences</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatchedTests.map((test) => (
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
                                {new Date(test.first_seen).toLocaleDateString()}
                              </td>
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
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => handleResolveUnmatched(test.id)}
                                  style={{
                                    backgroundColor: '#22c55e',
                                    color: 'white',
                                    padding: '6px 15px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    margin: '0 auto'
                                  }}
                                >
                                  <i className="fas fa-check mr-1"></i>
                                  Mark as Resolved
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              disabled={!!editingUser}
            />
          </div>

          <div className="form-field span-2">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
            />
          </div>

          {!editingUser && (
            <div className="form-field span-2">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              />
            </div>
          )}

          <div className="form-field span-2">
            <label className="form-label">Role</label>
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

      {/* Footer */}
      <footer>
        <p>&copy;2025 Zyntel</p>
        <div className="zyntel">
          <img src="/images/zyntel_no_background.png" alt="logo" />
        </div>
      </footer>
    </div>
  );
};

export default Admin;