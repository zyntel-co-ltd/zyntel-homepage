import React from 'react';

interface FiltersProps {
  filters: {
    startDate?: string;
    endDate?: string;
    period?: string;
    labSection?: string;
    shift?: string;
    hospitalUnit?: string;
    laboratory?: string;
    status?: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onReset?: () => void;
  showPeriodFilter?: boolean;
  showLabSectionFilter?: boolean;
  showShiftFilter?: boolean;
  showLaboratoryFilter?: boolean;
  showStatusFilter?: boolean;
  showDateFilter?: boolean;
}

const Filters: React.FC<FiltersProps> = ({
  filters,
  onFilterChange,
  showPeriodFilter = true,
  showLabSectionFilter = true,
  showShiftFilter = true,
  showLaboratoryFilter = true,
  showStatusFilter = false,
  showDateFilter = true,
}) => {
  return (
    <div className="dashboard-filters">
      {showDateFilter && (
        <>
          <div className="filter-group">
            <label htmlFor="startDateFilter">Start Date:</label>
            <input
              type="date"
              id="startDateFilter"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange('startDate', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="endDateFilter">End Date:</label>
            <input
              type="date"
              id="endDateFilter"
              value={filters.endDate || ''}
              onChange={(e) => {
                const value = e.target.value;
                onFilterChange('endDate', value);
                if (value) onFilterChange('period', 'custom');
              }}
            />
          </div>
        </>
      )}

      {showPeriodFilter && (
        <div className="filter-group">
          <label htmlFor="periodSelect">Period:</label>
          <select
            id="periodSelect"
            value={filters.period || 'thisMonth'}
            onChange={(e) => onFilterChange('period', e.target.value)}
          >
            <option value="custom">Custom</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisWeek">This Week</option>
            <option value="lastWeek">Last Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisQuarter">This Quarter</option>
            <option value="lastQuarter">Last Quarter</option>
            <option value="january">January</option>
            <option value="february">February</option>
            <option value="march">March</option>
            <option value="april">April</option>
            <option value="may">May</option>
            <option value="june">June</option>
            <option value="july">July</option>
            <option value="august">August</option>
            <option value="september">September</option>
            <option value="october">October</option>
            <option value="november">November</option>
            <option value="december">December</option>
          </select>
        </div>
      )}

      {showLabSectionFilter && (
        <div className="filter-group">
          <label htmlFor="labSectionFilter">Lab Section:</label>
          <select
            id="labSectionFilter"
            value={filters.labSection || 'all'}
            onChange={(e) => onFilterChange('labSection', e.target.value)}
          >
            <option value="all">All</option>
            <option value="CHEMISTRY">CHEMISTRY</option>
            <option value="HEAMATOLOGY">HEAMATOLOGY</option>
            <option value="MICROBIOLOGY">MICROBIOLOGY</option>
            <option value="SEROLOGY">SEROLOGY</option>
            <option value="REFERRAL">REFERRAL</option>
            <option value="N/A">N/A</option>
          </select>
        </div>
      )}

      {showShiftFilter && (
        <div className="filter-group">
          <label htmlFor="shiftFilter">Shift:</label>
          <select
            id="shiftFilter"
            value={filters.shift || 'all'}
            onChange={(e) => onFilterChange('shift', e.target.value)}
          >
            <option value="all">All</option>
            <option value="day shift">Day Shift</option>
            <option value="night shift">Night Shift</option>
          </select>
        </div>
      )}

      {showLaboratoryFilter && (
        <div className="filter-group">
          <label htmlFor="hospitalUnitFilter">Laboratory:</label>
          <select
            id="hospitalUnitFilter"
            value={filters.hospitalUnit || filters.laboratory || 'all'}
            onChange={(e) => onFilterChange('hospitalUnit', e.target.value)}
          >
            <option value="all">All</option>
            <option value="Main Laboratory">Main Laboratory</option>
            <option value="Annex">Annex</option>
          </select>
        </div>
      )}

      {showStatusFilter && (
        <div className="filter-group">
          <label htmlFor="statusFilter">Status:</label>
          <select
            id="statusFilter"
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default Filters;