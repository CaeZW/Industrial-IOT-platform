import { execFileSync } from 'node:child_process';
import { mkdir, open, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TemporaryCredential } from './users.service.js';

export async function deliverLocalCredentials(credentials: readonly TemporaryCredential[]): Promise<string> {
  const directory = resolve('../../.local');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if ((await lstat(directory)).isSymbolicLink()) throw new Error('La carpeta privada no puede ser un enlace.');
  const file = join(directory, 'credentials-' + randomUUID() + '.json');
  // Empty, exclusive file; restrict Windows ACL before any secret is written.
  const handle = await open(file, 'wx', 0o600);
  try {
    if (process.platform === 'win32') {
      const identity = execFileSync('whoami', [], { encoding: 'utf8', windowsHide: true }).trim();
      execFileSync('icacls', [file, '/inheritance:r', '/grant:r', identity + ':(F)', '*S-1-5-18:(F)'],
        { windowsHide: true, stdio: 'pipe' });
    }
    await handle.writeFile(JSON.stringify({
      warning: 'Contraseñas temporales. Entregar por canal privado y eliminar este archivo después.',
      createdAt: new Date().toISOString(), credentials,
    }, null, 2), 'utf8');
  } finally { await handle.close(); }
  return file;
}

