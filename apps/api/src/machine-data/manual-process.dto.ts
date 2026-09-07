import { IsISO8601, IsObject, IsOptional, IsUUID } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import type { JsonObject } from '@industrial-iot-platform/contracts';
export class ManualProcessDto {
  @IsUUID() idempotencyKey!: string;
  @IsOptional() @IsObject() readings?: JsonObject;
  @IsOptional() @IsISO8601({ strict: true }) startedAt?: string;
  @IsOptional() @IsISO8601({ strict: true }) finishedAt?: string;
}
export function validateManualReadings(value: unknown, required: boolean): asserts value is JsonObject | undefined {
  if (value === undefined && !required) return;
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length) {
    throw new BadRequestException('Añade al menos una variable con su valor.');
  }
  if (Object.keys(value).some((key) => ['__proto__', 'prototype', 'constructor'].includes(key))) {
    throw new BadRequestException('Ese nombre de variable está reservado por seguridad.');
  }
  if (Buffer.byteLength(JSON.stringify(value)) > 65536) throw new BadRequestException('Las lecturas exceden 64 KiB.');
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  while (stack.length) {
    const item = stack.pop()!;
    if (item.depth > 16) throw new BadRequestException('Las lecturas tienen demasiados niveles.');
    if (typeof item.value === 'number' && !Number.isFinite(item.value)) throw new BadRequestException('Número inválido.');
    if (item.value && typeof item.value === 'object') {
      for (const nested of Object.values(item.value)) stack.push({ value: nested, depth: item.depth + 1 });
    }
  }
}
