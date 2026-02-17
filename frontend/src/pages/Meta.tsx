// frontend/src/pages/Meta.tsx
import React, { useState, useEffect } from 'react';
import { Header, Navbar, Filters, Loader, Modal, Pagination } from '@/components/shared';
import { MetaTable, type MetaRecord } from '@/components/tables';

const Meta: React.FC = () => {
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

  const [formData, setFormData] = useState({
    testName: '',
    section: 'Chemistry',
    price: 0,
    expectedTAT: 60,
  });

  useEffect(() => {
    fetchData();
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
      section: 'Chemistry',
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
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testName: formData.testName,
          price: formData.price,
          tat: formData.expectedTAT,
          labSection: formData.section,
        })
      });

      if (response.ok) {
        alert(`Test ${editingRecord ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchData();
      } else {
        alert(`Failed to ${editingRecord ? 'update' : 'create'} test`);
      }
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Error saving test');
    }
  };

  const handleExportCSV = () => {
    console.log('Exporting CSV...');
    // CSV export logic here
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
        <button type="button" className="table-page-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
          <i className={`fas fa-chevron-${filtersOpen ? 'up' : 'down'}`} aria-hidden />
          {filtersOpen ? 'Hide menu' : 'Menu'}
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
              placeholder="Search test name..."
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
          <h3>Filters</h3>
          <button type="button" className="filters-panel-close" onClick={() => setFiltersPanelOpen(false)} aria-label="Close filters">&times;</button>
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
              onChange={(e) => handleFormChange('testName', e.target.value)}
              placeholder="Enter test name"
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              Section <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-select"
              value={formData.section}
              onChange={(e) => handleFormChange('section', e.target.value)}
            >
              <option value="Chemistry">Chemistry</option>
              <option value="Hematology">Hematology</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Immunology">Immunology</option>
              <option value="Molecular">Molecular</option>
              <option value="Serology">Serology</option>
            </select>
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
            <input
              type="number"
              className="form-input"
              value={formData.expectedTAT}
              onChange={(e) => handleFormChange('expectedTAT', parseInt(e.target.value) || 60)}
              placeholder="60"
              min="1"
              required
            />
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

      <footer>
        <p>&copy;2025 Zyntel</p>
        <div className="zyntel">
          <img src="/images/zyntel_no_background.png" alt="logo" />
        </div>
      </footer>
    </div>
  );
};

export default Meta;