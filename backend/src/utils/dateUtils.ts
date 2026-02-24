import moment from 'moment';

export const extractTimeFromLabNo = (labNo: string): Date | null => {
  try {
    // Format: DDMMYYHHMM + sequence
    // Example: 2708251322 -> 27/08/25 13:22
    if (labNo.length < 10) return null;

    const day = labNo.substring(0, 2);
    const month = labNo.substring(2, 4);
    const year = '20' + labNo.substring(4, 6);
    const hour = labNo.substring(6, 8);
    const minute = labNo.substring(8, 10);

    const dateStr = `${year}-${month}-${day} ${hour}:${minute}`;
    const date = moment(dateStr, 'YYYY-MM-DD HH:mm');

    return date.isValid() ? date.toDate() : null;
  } catch (error) {
    console.error('Error extracting time from lab number:', error);
    return null;
  }
};

export const determineShift = (timeIn: Date | null): string => {
  if (!timeIn) return 'day shift';
  const hour = timeIn.getHours();
  // Day shift: 8 AM - 5 PM, Night shift: 5 PM - 8 AM
  return hour >= 8 && hour < 17 ? 'day shift' : 'night shift';
};

export const determineLaboratory = (source: string): string => {
  // Simple logic - can be enhanced based on actual source values
  const annexSources = ['ANNEX', 'DOCTORS PLAZA ANNEX'];
  return annexSources.some(s => source.toUpperCase().includes(s)) 
    ? 'annex' 
    : 'mainLab';
};

export const getPeriodDates = (period: string): { startDate: Date; endDate: Date } => {
  const now = moment();
  let startDate: moment.Moment;
  let endDate: moment.Moment;

  switch (period) {
    case 'thisMonth':
      startDate = now.clone().startOf('month');
      endDate = now.clone().endOf('month');
      break;
    case 'lastMonth':
      startDate = now.clone().subtract(1, 'month').startOf('month');
      endDate = now.clone().subtract(1, 'month').endOf('month');
      break;
    case 'thisQuarter':
      startDate = now.clone().startOf('quarter');
      endDate = now.clone().endOf('quarter');
      break;
    case 'lastQuarter':
      startDate = now.clone().subtract(1, 'quarter').startOf('quarter');
      endDate = now.clone().subtract(1, 'quarter').endOf('quarter');
      break;
    default:
      startDate = now.clone().startOf('month');
      endDate = now.clone().endOf('month');
  }

  return {
    startDate: startDate.toDate(),
    endDate: endDate.toDate(),
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const calculateTAT = (timeIn: Date, timeOut: Date): number => {
  // Returns TAT in minutes
  return Math.floor((timeOut.getTime() - timeIn.getTime()) / (1000 * 60));
};