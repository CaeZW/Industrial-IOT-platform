import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentSession, RequirePermission, contextFor } from '../auth/auth.http.js';
import type { AuthRequest } from '../auth/auth.http.js';
import type { SessionRecord } from '../auth/auth.types.js';
import { UsersService } from '../users/users.service.js';
import type { TemporaryCredential } from '../users/users.service.js';
import { AdministrationService } from './administration.service.js';
import { AdministratorGuard } from './administrator.guard.js';
import { AccessDto, ActiveDto, CreateUserDto, DeviceSettingDto, MachineSettingDto, PermissionsDto } from './administration.dto.js';

function actor(request: AuthRequest) {
  return { ...contextFor(request), actor: request.session!.user.username, userId: request.session!.user.id };
}

@Controller('administration')
@UseGuards(AdministratorGuard)
export class AdministrationController {
  constructor(private readonly users: UsersService, private readonly administration: AdministrationService) {}
  @Get('users') @RequirePermission('user.manage')
  list(@Req() request: AuthRequest) { return this.users.list(actor(request)); }
  @Get('user-options') @RequirePermission('user.manage')
  userOptions() { return this.administration.options(); }
  @Get('role-options') @RequirePermission('role.manage')
  roleOptions() { return this.administration.options(); }
  @Post('users') @RequirePermission('user.manage')
  async create(@Body() input: CreateUserDto, @Req() request: AuthRequest) {
    let credential: TemporaryCredential | undefined;
    await this.users.create({ username: input.username, name: input.name, email: input.email ?? null, role: input.role },
      input.scopes, actor(request), async (values) => { credential = values[0]; });
    return credential;
  }
  @Patch('users/:username/active') @RequirePermission('user.manage')
  active(@Param('username') username: string, @Body() input: ActiveDto, @Req() request: AuthRequest) {
    return this.users.setActive(username, input.active, actor(request));
  }
  @Patch('users/:username/access') @RequirePermission('user.manage')
  access(@Param('username') username: string, @Body() input: AccessDto, @Req() request: AuthRequest) {
    return this.users.setAccess(username, input.role, input.scopes, actor(request));
  }
  @Post('users/:username/reset-password') @RequirePermission('user.manage')
  async reset(@Param('username') username: string, @Req() request: AuthRequest) {
    let credential: TemporaryCredential | undefined;
    await this.users.resetPassword(username, actor(request), async (values) => { credential = values[0]; });
    return credential;
  }
  @Patch('roles/:role/permissions') @RequirePermission('role.manage')
  permissions(@Param('role') role: string, @Body() input: PermissionsDto, @Req() request: AuthRequest) {
    return this.users.setPermissions(role, input.permissions, actor(request));
  }
}

@Controller('administration/equipment')
@RequirePermission('configuration.write')
export class EquipmentSettingsController {
  constructor(private readonly administration: AdministrationService) {}
  @Get()
  list(@CurrentSession() session: SessionRecord) { return this.administration.settings(session); }
  @Patch('machines/:id')
  machine(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: MachineSettingDto,
    @CurrentSession() session: SessionRecord, @Req() request: AuthRequest) {
    return this.administration.updateSetting('machine', id, input.persistenceIntervalSeconds, input.runningKey, session, contextFor(request));
  }
  @Patch('devices/:id')
  device(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: DeviceSettingDto,
    @CurrentSession() session: SessionRecord, @Req() request: AuthRequest) {
    return this.administration.updateSetting('device', id, input.persistenceIntervalSeconds, undefined, session, contextFor(request));
  }
}
