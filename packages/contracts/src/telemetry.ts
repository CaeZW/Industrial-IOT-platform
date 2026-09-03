import type { EventEnvelope, Quality } from './common.js';

export interface TelemetryPayload {
  tagId: string;
  value: number | boolean | string | null;
  unit?: string;
  quality: Quality;
  acquisitionTimestamp: string;
  receivedTimestamp: string;
}

export type TagUpdatedEvent = EventEnvelope<'tag.updated', TelemetryPayload>;
