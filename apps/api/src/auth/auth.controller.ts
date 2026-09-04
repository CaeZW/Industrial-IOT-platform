import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches, MaxLength } from 'class-validator';
import { AuthService } from './auth.service.js';
import { BrowserSecurityService } from './browser-security.service.js';
import { AllowPasswordChange, CurrentSession, Public, contextFor } from './auth.http.js';
import type { AuthRequest, AuthResponse } from './auth.http.js';
import type { SessionRecord } from './auth.types.js';
import { sessionView, PASSWORD_MIN, PASSWORD_MAX } from './auth.policy.js';

export class LoginDto {
  @IsString() @Length(2, 64) @Matches(/^[a-z0-9._-]+$/)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  username!: string;
  @IsString() @Length(1, PASSWORD_MAX)
  password!: string;
}
export class ChangePasswordDto {
  @IsString() @MaxLength(PASSWORD_MAX)
  currentPassword!: string;
  @IsString() @Length(PASSWORD_MIN, PASSWORD_MAX)
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly browser: BrowserSecurityService) {}
  @Public() @Post('login') @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() request: AuthRequest, @Res({ passthrough: true }) response: AuthResponse) {
    const result = await this.auth.login(dto.username, dto.password, contextFor(request));
    this.browser.cookie(response, result.token);
    return result.session;
  }
  @AllowPasswordChange() @Get('me')
  me(@CurrentSession() session: SessionRecord) { return sessionView(session); }

  @AllowPasswordChange() @Post('activity') @HttpCode(200)
  activity(@CurrentSession() session: SessionRecord) { return this.auth.activity(session); }

  @AllowPasswordChange() @Post('password') @HttpCode(200)
  async password(@CurrentSession() session: SessionRecord, @Body() dto: ChangePasswordDto,
    @Req() request: AuthRequest, @Res({ passthrough: true }) response: AuthResponse) {
    const result = await this.auth.changePassword(session, dto.currentPassword, dto.newPassword, contextFor(request));
    this.browser.cookie(response, result.token, new Date(result.session.expiresAt).getTime() - Date.now());
    return result.session;
  }
  @AllowPasswordChange() @Post('logout') @HttpCode(204)
  async logout(@CurrentSession() session: SessionRecord, @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: AuthResponse) {
    await this.auth.logout(session, contextFor(request));
    this.browser.cookie(response, '', 0);
  }
}
