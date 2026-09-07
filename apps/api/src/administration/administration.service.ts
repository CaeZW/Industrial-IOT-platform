import { Injectable } from '@nestjs/common';
import type { SessionRecord, RequestContext, AuditInput } from '../auth/auth.types.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { AdministrationRepository } from './administration.repository.js';

@Injectable()
export class AdministrationService {
  constructor(private readonly repository: AdministrationRepository, private readonly audit: AuthRepository) {}
  options() { return this.repository.options(); }
  settings(session: SessionRecord) { return this.repository.settings(session.user); }
  async updateSetting(kind: 'machine' | 'device', id: string, interval: number, runningKey: string | undefined,
    session: SessionRecord, context: RequestContext): Promise<void> {
    const event: AuditInput = { ...context, actor: session.user.username, userId: session.user.id,
      action: 'equipment.configuration.change', resourceType: kind.toUpperCase(), resourceId: id,
      result: 'SUCCESS', reason: 'HTTP_ADMINISTRATION' };
    try { await this.repository.updateSetting(kind, id, interval, runningKey, session.user, event); }
    catch (error) {
      await this.audit.audit({ ...event, result: 'DENIED', reason: 'CONFIGURATION_REJECTED' });
      throw error;
    }
  }
}
