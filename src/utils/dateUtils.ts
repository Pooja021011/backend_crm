/**
 * Global UTC Date Utilities
 * All date operations use UTC to ensure consistency across timezones
 * This prevents issues when users are in different timezones (e.g., India, US)
 */

/**
 * Get current date/time in UTC
 * Always returns UTC date, regardless of browser/system timezone
 */
export const getUTCDate = (): Date => {
  return new Date();
};

/**
 * Get UTC date components from a date
 */
export const getUTCDateComponents = (date: Date = new Date()) => {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    date: date.getUTCDate(),
    dayOfWeek: date.getUTCDay(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
    seconds: date.getUTCSeconds(),
    milliseconds: date.getUTCMilliseconds(),
  };
};

/**
 * Get UTC date at start of day (00:00:00.000 UTC)
 */
export const getUTCStartOfDay = (year?: number, month?: number, day?: number): Date => {
  if (year !== undefined && month !== undefined && day !== undefined) {
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  
  const components = getUTCDateComponents();
  return new Date(Date.UTC(
    components.year,
    components.month,
    components.date,
    0,
    0,
    0,
    0
  ));
};

/**
 * Get UTC date at end of day (23:59:59.999 UTC)
 */
export const getUTCEndOfDay = (year?: number, month?: number, day?: number): Date => {
  if (year !== undefined && month !== undefined && day !== undefined) {
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }
  
  const components = getUTCDateComponents();
  return new Date(Date.UTC(
    components.year,
    components.month,
    components.date,
    23,
    59,
    59,
    999
  ));
};

/**
 * Get UTC start of today (00:00:00.000 UTC)
 */
export const getUTCStartOfToday = (): Date => {
  return getUTCStartOfDay();
};

/**
 * Get UTC end of today (23:59:59.999 UTC)
 */
export const getUTCEndOfToday = (): Date => {
  return getUTCEndOfDay();
};

/**
 * Format date for HTML date input (YYYY-MM-DD) using UTC
 */
export const formatDateInputUTC = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date for display (DD/MM/YYYY) using UTC components
 * This ensures dates are displayed correctly regardless of user's timezone
 */
export const formatDateDisplayUTC = (dateValue: Date | string | null | undefined): string => {
  if (!dateValue) return '';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Parse date string to UTC Date
 * Handles YYYY-MM-DD format and converts to UTC
 */
export const parseDateUTC = (dateString: string): Date => {
  // If already in ISO format, parse directly
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  
  // Parse YYYY-MM-DD format and convert to UTC
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

/**
 * Check if a date is within UTC date range (inclusive)
 */
export const isDateInUTCRange = (
  date: Date,
  startDate: Date,
  endDate: Date
): boolean => {
  return date >= startDate && date <= endDate;
};

/**
 * Get UTC date range for "Today"
 * Returns start and end of current UTC day
 */
export const getUTCTodayRange = (): { start: Date; end: Date } => {
  return {
    start: getUTCStartOfToday(),
    end: getUTCEndOfToday(),
  };
};

/**
 * Get UTC date range for "This Week"
 * Returns Sunday 00:00:00 to Saturday 23:59:59 UTC
 */
export const getUTCThisWeekRange = (): { start: Date; end: Date } => {
  // Get current UTC date to ensure we're working with UTC, not local time
  const now = new Date();
  const components = getUTCDateComponents(now);
  
  // Calculate days to go back to Sunday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const daysToSunday = components.dayOfWeek;
  
  // Calculate Sunday date: subtract daysToSunday from current UTC date
  // This ensures we get the most recent Sunday (including today if today is Sunday)
  const sundayDate = new Date(Date.UTC(
    components.year,
    components.month,
    components.date - daysToSunday,
    0, 0, 0, 0
  ));
  
  // Validate the date is valid
  if (isNaN(sundayDate.getTime())) {
    throw new Error(`Invalid Sunday date calculated: year=${components.year}, month=${components.month}, day=${components.date - daysToSunday}`);
  }
  
  // Calculate Saturday date (Sunday + 6 days)
  const saturdayDate = new Date(Date.UTC(
    components.year,
    components.month,
    components.date - daysToSunday + 6,
    23, 59, 59, 999
  ));
  
  // Validate the date is valid
  if (isNaN(saturdayDate.getTime())) {
    throw new Error(`Invalid Saturday date calculated: year=${components.year}, month=${components.month}, day=${components.date - daysToSunday + 6}`);
  }
  
  // Get the correct UTC date components (handles month/year overflow automatically)
  const sundayYear = sundayDate.getUTCFullYear();
  const sundayMonth = sundayDate.getUTCMonth();
  const sundayDayFinal = sundayDate.getUTCDate();
  
  const saturdayYear = saturdayDate.getUTCFullYear();
  const saturdayMonth = saturdayDate.getUTCMonth();
  const saturdayDayFinal = saturdayDate.getUTCDate();
  
  const start = getUTCStartOfDay(sundayYear, sundayMonth, sundayDayFinal);
  const end = getUTCEndOfDay(saturdayYear, saturdayMonth, saturdayDayFinal);
  
  // Final validation
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error(`Invalid date range: start=${start}, end=${end}`);
  }
  
  return { start, end };
};

/**
 * Get UTC date range for "This Month"
 * Returns 1st day 00:00:00 to last day 23:59:59 UTC
 */
export const getUTCThisMonthRange = (): { start: Date; end: Date } => {
  const components = getUTCDateComponents();
  const start = getUTCStartOfDay(components.year, components.month, 1);
  const lastDayOfMonth = new Date(Date.UTC(components.year, components.month + 1, 0));
  const end = getUTCEndOfDay(
    lastDayOfMonth.getUTCFullYear(),
    lastDayOfMonth.getUTCMonth(),
    lastDayOfMonth.getUTCDate()
  );
  
  return { start, end };
};

/**
 * Get UTC date range for "Last Month"
 * Returns 1st day 00:00:00 to last day 23:59:59 UTC of previous month
 */
export const getUTCLastMonthRange = (): { start: Date; end: Date } => {
  const components = getUTCDateComponents();
  const lastMonth = components.month === 0 ? 11 : components.month - 1;
  const lastMonthYear = components.month === 0 ? components.year - 1 : components.year;
  
  const start = getUTCStartOfDay(lastMonthYear, lastMonth, 1);
  const lastDayOfLastMonth = new Date(Date.UTC(lastMonthYear, lastMonth + 1, 0));
  const end = getUTCEndOfDay(
    lastDayOfLastMonth.getUTCFullYear(),
    lastDayOfLastMonth.getUTCMonth(),
    lastDayOfLastMonth.getUTCDate()
  );
  
  return { start, end };
};

/**
 * Get UTC date range for "This Quarter"
 * Returns 1st day of quarter 00:00:00 to last day 23:59:59 UTC
 */
export const getUTCThisQuarterRange = (): { start: Date; end: Date } => {
  const components = getUTCDateComponents();
  const quarterStart = Math.floor(components.month / 3) * 3;
  const quarterEndMonth = quarterStart + 3;
  
  const start = getUTCStartOfDay(components.year, quarterStart, 1);
  const lastDayOfQuarter = new Date(Date.UTC(components.year, quarterEndMonth, 0));
  const end = getUTCEndOfDay(
    lastDayOfQuarter.getUTCFullYear(),
    lastDayOfQuarter.getUTCMonth(),
    lastDayOfQuarter.getUTCDate()
  );
  
  return { start, end };
};

/**
 * Get UTC date range for "This Year"
 * Returns Jan 1 00:00:00 to Dec 31 23:59:59 UTC
 */
export const getUTCThisYearRange = (): { start: Date; end: Date } => {
  const components = getUTCDateComponents();
  return {
    start: getUTCStartOfDay(components.year, 0, 1),
    end: getUTCEndOfDay(components.year, 11, 31),
  };
};

/**
 * Get date range based on period string
 * Returns UTC date range for common period filters
 */
export const getUTCDateRangeFromPeriod = (
  period: string
): { start: Date; end: Date } => {
  switch (period.toLowerCase()) {
    case 'today':
      return getUTCTodayRange();
    case 'this week':
    case 'week':
      return getUTCThisWeekRange();
    case 'this month':
    case 'month':
      return getUTCThisMonthRange();
    case 'last month':
      return getUTCLastMonthRange();
    case 'this quarter':
    case 'quarter':
      return getUTCThisQuarterRange();
    case 'this year':
    case 'year':
      return getUTCThisYearRange();
    default:
      // Default to this month
      return getUTCThisMonthRange();
  }
};

