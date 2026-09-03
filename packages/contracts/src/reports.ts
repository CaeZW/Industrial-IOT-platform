import type { EventEnvelope } from './common.js';

export type ReportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'CANCELLED';

export interface ReportStatusPayload {
  reportId: string;
  status: ReportStatus;
  fileName?: string;
  errorCode?: string;
}

export type ReportStatusChangedEvent = EventEnvelope<
  'report.status.changed',
  ReportStatusPayload
>;
