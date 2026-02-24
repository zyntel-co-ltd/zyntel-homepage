import { useState, useCallback } from 'react';
import { FilterParams } from '../types';
import { getPeriodDates, getTodayDate } from '../utils/dateUtils';

export const useFilters = (initialFilters?: Partial<FilterParams>) => {
  const [filters, setFilters] = useState<FilterParams>({
    startDate: initialFilters?.startDate || getTodayDate(),
    endDate: initialFilters?.endDate || getTodayDate(),
    period: initialFilters?.period || 'thisMonth',
    labSection: initialFilters?.labSection || 'all',
    shift: initialFilters?.shift || 'all',
    laboratory: initialFilters?.laboratory || 'all',
  });

  const updateFilter = useCallback((key: keyof FilterParams, value: string) => {
    setFilters((prev: FilterParams) => {
      const newFilters = { ...prev, [key]: value };

      // Handle period changes
      if (key === 'period' && value !== 'custom') {
        const dates = getPeriodDates(value);
        newFilters.startDate = dates.startDate;
        newFilters.endDate = dates.endDate;
      }

      return newFilters;
    });
  }, []);

  const resetFilters = useCallback(() => {
    const today = getTodayDate();
    setFilters({
      startDate: today,
      endDate: today,
      period: 'thisMonth',
      labSection: 'all',
      shift: 'all',
      laboratory: 'all',
    });
  }, []);

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters,
  };
};