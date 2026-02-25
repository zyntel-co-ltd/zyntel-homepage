import moment from 'moment';

export const formatDate = (date: string | Date): string => {
  return moment(date).format('YYYY-MM-DD');
};

export const formatDateTime = (date: string | Date): string => {
  return moment(date).format('YYYY-MM-DD HH:mm');
};

export const formatTime = (date: string | Date): string => {
  return moment(date).format('hh:mm A');
};

export const getPeriodDates = (period: string): { startDate: string; endDate: string } => {
  const now = moment();
  let startDate: moment.Moment;
  let endDate: moment.Moment;

  switch (period) {
    case 'yesterday':
      startDate = now.clone().subtract(1, 'day').startOf('day');
      endDate = now.clone().subtract(1, 'day').endOf('day');
      break;
    case 'thisWeek':
      startDate = now.clone().startOf('week');
      endDate = now.clone().endOf('week');
      break;
    case 'lastWeek':
      startDate = now.clone().subtract(1, 'week').startOf('week');
      endDate = now.clone().subtract(1, 'week').endOf('week');
      break;
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
    case 'Q1':
      startDate = moment(`${now.year()}-01-01`);
      endDate = moment(`${now.year()}-03-31`);
      break;
    case 'Q2':
      startDate = moment(`${now.year()}-04-01`);
      endDate = moment(`${now.year()}-06-30`);
      break;
    case 'Q3':
      startDate = moment(`${now.year()}-07-01`);
      endDate = moment(`${now.year()}-09-30`);
      break;
    case 'Q4':
      startDate = moment(`${now.year()}-10-01`);
      endDate = moment(`${now.year()}-12-31`);
      break;
    case 'january':
    case 'february':
    case 'march':
    case 'april':
    case 'may':
    case 'june':
    case 'july':
    case 'august':
    case 'september':
    case 'october':
    case 'november':
    case 'december': {
      const monthMap: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      const m = monthMap[period] ?? 0;
      startDate = now.clone().month(m).startOf('month');
      endDate = now.clone().month(m).endOf('month');
      // If month hasn't occurred yet this year, use last year
      if (endDate.isAfter(now)) {
        startDate = startDate.subtract(1, 'year');
        endDate = endDate.subtract(1, 'year');
      }
      break;
    }
    default:
      startDate = now.clone().startOf('month');
      endDate = now.clone().endOf('month');
  }

  return {
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
  };
};

export const getTodayDate = (): string => {
  return moment().format('YYYY-MM-DD');
};

export const getCurrentTime = (): string => {
  return moment().format('hh:mm:ss A');
};