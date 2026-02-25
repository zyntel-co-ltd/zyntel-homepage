// frontend/src/pages/Meta.tsx
import React, { useState, useEffect } from 'react';
import { Header, Navbar, Filters, Loader, Modal, Pagination, Toast, Footer } from '@/components/shared';
import { MetaTable, type MetaRecord } from '@/components/tables';
import { downloadCSV } from '@/utils/exportUtils';
import { LAB_SECTIONS, TAT_OPTIONS } from '@/constants/metaOptions';
import { useAuth } from '@/contexts/AuthContext';
import { canEditMeta } from '@/utils/permissions';

const Meta: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role as 'admin' | 'manager' | 'technician' | 'viewer' | undefined;
  const canEdit = canEditMeta(role);

  const [filters, setFilters] = useState({
    labSection: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const rowsPerPage = 50;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<MetaRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MetaRecord | null>(null);
  const [filtersOpen, _setFiltersOpen] = useState(true);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [formData, setFormData] = useState({
    testName: '',
    section: 'CHEMISTRY',
    price: 0,
    expectedTAT: 60,
  });

  useEffect(() => {
    fetchData();
  }, [filters, currentPage]);

  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [filters, currentPage]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.labSection && filters.labSection !== 'all') params.append('labSection', filters.labSection);
      if (filters.search) params.append('search', filters.search);
      params.append('page', String(currentPage));
      params.append('limit', String(rowsPerPage));

      const response = await fetch(`/api/metadata?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch meta data');
      }

      const result = await response.json();
      const raw = Array.isArray(result) ? result : (result?.data ?? []);
      const mapped: MetaRecord[] = raw.map((item: any) => ({
        id: item.id,
        testName: item.test_name,
        section: item.current_lab_section,
        price: item.current_price,
        expectedTAT: item.current_tat,
      }));

      setData(mapped);
      if (result?.totalRecords != null) {
        setTotalRecords(result.totalRecords);
        setTotalPages(result.totalPages ?? 1);
      } else {
        setTotalRecords(mapped.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching meta data:', error);
      // On error, clear data so the UI reflects that no real data is available
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const handleResetFilters = () => {
    setFilters({ labSection: 'all', search: '' });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      setEditingRecord(record);
      setFormData({
        testName: record.testName,
        section: record.section,
        price: record.price,
        expectedTAT: record.expectedTAT,
      });
      setIsModalOpen(true);
    }
  };

  
  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      testName: '',
      section: 'CHEMISTRY',
      price: 0,
      expectedTAT: 60,
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      console.log('Saving record:', editingRecord ? 'Update' : 'Create', formData);
      
      const token = localStorage.getItem('token');
      const url = editingRecord 
        ? `/api/meta/${editingRecord.id}` 
        : '/api/meta';
      const method = editingRecord ? 'PUT' : 'POST';
      
      const payload = editingRecord
        ? { price: formData.price, tat: formData.expectedTAT, labSection: formData.section }
        : { testName: formData.testName, price: formData.price, tat: formData.expectedTAT, labSection: formData.section };
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setToast({ message: `Test ${editingRecord ? 'updated' : 'created'} successfully`, type: 'success' });
        setIsModalOpen(false);
        fetchData();
      } else {
        setToast({ message: `Failed to ${editingRecord ? 'update' : 'create'} test`, type: 'error' });
      }
    } catch (error) {
      console.error('Error saving test:', error);
      setToast({ message: 'Error saving test', type: 'error' });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Test Name', 'Section', 'Price (UGX)', 'Expected TAT'];
    const rows = data.map((r) => [r.testName, r.section, r.price, r.expectedTAT]);
    downloadCSV([headers, ...rows], `Meta-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className={`table-page-top ${!filtersOpen ? 'collapsed' : ''}`}>
        <div className="header-wrapper">
          <Header
            title="Nakasero Hospital Laboratory"
            pageTitle="Meta Table"
            onLogout={handleLogout}
            onResetFilters={handleResetFilters}
            showResetFilters={true}
            hideThreeDotMenu={!canEdit}
            menuItems={[
              { label: 'Export CSV', href: '#', icon: 'fas fa-file-csv', onClick: handleExportCSV },
              { label: 'Admin Panel', href: '/admin', icon: 'fas fa-cog' },
              { label: 'Reception Table', href: '/reception', icon: 'fas fa-table' },
              { label: 'Progress Table', href: '/progress', icon: 'fas fa-chart-bar' },
              { label: 'Performance Table', href: '/performance', icon: 'fas fa-chart-line' },
              { label: 'Tracker Table', href: '/tracker', icon: 'fas fa-list' },
              { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' }
            ]}
          />
          <Navbar type="table" />
        </div>
        <button type="button" className="table-page-toggle" onClick={() => setFiltersPanelOpen((o) => !o)} aria-expanded={filtersPanelOpen}>
          <i className={`fas fa-chevron-${filtersPanelOpen ? 'up' : 'down'}`} aria-hidden />
          {filtersPanelOpen ? 'Close' : 'Menu'}
        </button>
        <div className="filters-row">
          <button type="button" className="filters-panel-trigger" onClick={() => setFiltersPanelOpen(true)} aria-label="Open filters">
            <i className="fas fa-filter" aria-hidden /> Filters
          </button>
          <div className="filters-inline">
            <Filters
              filters={filters}
              onFilterChange={handleFilterChange}
              showPeriodFilter={false}
              showLabSectionFilter={true}
              showShiftFilter={false}
              showLaboratoryFilter={false}
              showDateFilter={false}
            />
          </div>
        </div>
        <div className="table-search-bar">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search test name, section..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <i className="fas fa-search search-icon"></i>
          </div>
        </div>
      </div>

      <div className={`filters-panel-overlay ${filtersPanelOpen ? 'visible' : ''}`} onClick={() => setFiltersPanelOpen(false)} aria-hidden />
      <div className={`filters-panel ${filtersPanelOpen ? 'open' : ''}`}>
        <div className="filters-panel-header">
          <h3>Menu & Filters</h3>
          <button type="button" className="filters-panel-close" onClick={() => setFiltersPanelOpen(false)} aria-label="Close">&times;</button>
        </div>
        <div className="menu-sidebar-nav">
          <Navbar type="table" />
        </div>
        <div className="menu-sidebar-search">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search test name, section..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <i className="fas fa-search search-icon"></i>
          </div>
        </div>
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          showPeriodFilter={false}
          showLabSectionFilter={true}
          showShiftFilter={false}
          showLaboratoryFilter={false}
          showDateFilter={false}
        />
      </div>

      <main className={`table-page-main ${filtersOpen ? 'filters-expanded' : ''}`}>
        {isLoading ? (
          <Loader isLoading={true} />
        ) : (
          <>
            <section className="card">
              <MetaTable
                data={data}
                onEdit={handleEdit}
                onAdd={handleAdd}
                isLoading={isLoading}
                canEdit={canEdit}
              />
            </section>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>

      {/* ✅ FIXED: Modal with connected form state */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? 'Edit Test' : 'Add New Test'}
      >
        <div className="form-grid">
          <div className="form-field span-2">
            <label className="form-label">
              Test Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.testName}
              onChange={(e) => !editingRecord && handleFormChange('testName', e.target.value)}
              placeholder="Enter test name"
              required
              readOnly={!!editingRecord}
              disabled={!!editingRecord}
              style={editingRecord ? { backgroundColor: 'var(--light-grey-background)', cursor: 'not-allowed' } : undefined}
            />
            {editingRecord && (
              <p className="form-hint" style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--border-color)' }}>
                Test name cannot be edited. Changing it affects data matching and may break links to existing records.
              </p>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">
              Section <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-select"
              value={LAB_SECTIONS.includes(formData.section as any) ? formData.section : '_custom'}
              onChange={(e) => {
                const v = e.target.value;
                handleFormChange('section', v === '_custom' ? '' : v);
              }}
            >
              {LAB_SECTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              {!LAB_SECTIONS.includes(formData.section as any) && (
                <option value="_custom">{formData.section}</option>
              )}
              <option value="_custom">+ Add new...</option>
            </select>
            {!LAB_SECTIONS.includes(formData.section as any) && (
              <input
                type="text"
                className="form-input"
                style={{ marginTop: '8px' }}
                value={formData.section}
                onChange={(e) => handleFormChange('section', e.target.value.toUpperCase())}
                placeholder="Enter custom section"
              />
            )}
          </div>

          <div className="form-field">
            <label className="form-label">
              Price (UGX) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              className="form-input"
              value={formData.price}
              onChange={(e) => handleFormChange('price', parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              Expected TAT (minutes) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-select"
              value={TAT_OPTIONS.includes(formData.expectedTAT as any) ? formData.expectedTAT : '_custom'}
              onChange={(e) => {
                const v = e.target.value;
                handleFormChange('expectedTAT', v === '_custom' ? 1 : parseInt(v) || 60);
              }}
            >
              {TAT_OPTIONS.map((t) => (
                <option key={t} value={t}>{t} MIN</option>
              ))}
              <option value="_custom">+ Add new...</option>
            </select>
            {!TAT_OPTIONS.includes(formData.expectedTAT as any) && (
              <input
                type="number"
                className="form-input"
                style={{ marginTop: '8px' }}
                value={formData.expectedTAT}
                onChange={(e) => handleFormChange('expectedTAT', parseInt(e.target.value) || 60)}
                placeholder="Enter minutes"
                min="1"
              />
            )}
          </div>
        </div>

        <div className="form-actions">
          <button onClick={() => setIsModalOpen(false)} className="btn btn--secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.testName || !formData.section || formData.price <= 0 || formData.expectedTAT <= 0}
            className="btn btn--primary"
          >
            {editingRecord ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <Footer />
    </div>
  );
};

export default Meta;