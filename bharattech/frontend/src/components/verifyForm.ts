import { indiaToday } from '../portal/attendance';

/** This month on India's clock, yyyy-mm: the backend refuses later months by the same clock. */
export const thisMonth = (now = Date.now()) => indiaToday(now).slice(0, 7);
