import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { PASSWORD_MAX, PASSWORD_MIN } from './auth.policy.js';

const N = 131072;
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}

@Injectable()
export class PasswordService {
  // Keep expensive hashing bounded on the single-process local application.
  private tail: Promise<void> = Promise.resolve();

  private async bounded<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await work(); } finally { release(); }
  }

  validate(password: string): void {
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      throw new Error(`La contraseña debe contener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`);
    }
  }

  async hash(password: string): Promise<string> {
    this.validate(password);
    const salt = randomBytes(16);
    const key = await this.bounded(() => derive(password, salt));
    return ['scrypt', N, 8, 1, salt.toString('hex'), key.toString('hex')].join('$');
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    if (password.length > PASSWORD_MAX) return false;
    const parts = encoded.split('$');
    const valid = parts.length === 6 && parts[0] === 'scrypt' &&
      parts[1] === String(N) && parts[2] === '8' && parts[3] === '1' &&
      /^[a-f0-9]{32}$/.test(parts[4] ?? '') &&
      /^[a-f0-9]{128}$/.test(parts[5] ?? '');
    // An unknown account still incurs the same KDF cost.
    const salt = valid ? Buffer.from(parts[4]!, 'hex') : Buffer.alloc(16);
    const expected = valid ? Buffer.from(parts[5]!, 'hex') : Buffer.alloc(64);
    const key = await this.bounded(() => derive(password, salt));
    return timingSafeEqual(key, expected) && valid;
  }
}
