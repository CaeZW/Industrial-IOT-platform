import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class AccessDto {
  @IsString() @Length(1, 80) role!: string;
  @IsArray() @ArrayMaxSize(200) @ArrayUnique() @IsString({ each: true }) @Length(1, 160, { each: true })
  scopes!: string[];
}
export class CreateUserDto extends AccessDto {
  @IsString() @Matches(/^[a-z0-9._-]{2,64}$/) username!: string;
  @IsString() @Length(2, 160) name!: string;
  @IsOptional() @IsEmail() @Length(1, 254) email?: string | null;
}
export class ActiveDto {
  @IsBoolean() active!: boolean;
}
export class PermissionsDto {
  @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({ each: true }) @Length(1, 100, { each: true })
  permissions!: string[];
}
export class DeviceSettingDto {
  @IsInt() @Min(1) @Max(86400) persistenceIntervalSeconds!: number;
}
export class MachineSettingDto extends DeviceSettingDto {
  @IsString() @Length(1, 120) @Matches(/\S/) runningKey!: string;
}
