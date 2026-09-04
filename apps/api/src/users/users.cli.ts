import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { userInfo } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { validateEnvironment } from '../config/environment.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from './users.module.js';
import { UsersService } from './users.service.js';
import type { TemporaryCredential } from './users.service.js';
import { defaultScopeCodes, initialRoles } from './initial-policy.js';
import { deliverLocalCredentials } from './credential-delivery.js';

@Module({ imports: [
  ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env', validate: validateEnvironment }),
  DatabaseModule, AuthModule, UsersModule,
] })
class AdministrationModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AdministrationModule, { logger: false });
  try {
    const host = app.get(ConfigService).getOrThrow<string>('POSTGRES_HOST');
    if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
      throw new Error('Los comandos de este slice solo administran PostgreSQL local.');
    }
    const service = app.get(UsersService);
    const actor = 'local-os:' + userInfo().username;
    const [command, username, role, rawScopes] = process.argv.slice(2);
    const deliver = async (credentials: readonly TemporaryCredential[]) => {
      const file = await deliverLocalCredentials(credentials);
      console.log('Credenciales temporales guardadas en archivo privado: ' + file);
    };
    if (command === 'init') {
      console.log('Cuentas creadas: ' + await service.initialize(actor, deliver));
    } else if (command === 'list') {
      console.table((await service.list(actor)).map(({ scopes, ...user }) => ({ ...user, scopes: scopes.length })));
    } else if (command === 'create') {
      if (!stdin.isTTY) throw new Error('La creación requiere una terminal interactiva.');
      const prompt = createInterface({ input: stdin, output: stdout });
      try {
        const name = (await prompt.question('Nombre completo: ')).trim();
        const newUsername = (await prompt.question('Username: ')).trim().toLowerCase();
        const email = (await prompt.question('Correo (opcional): ')).trim() || null;
        console.table(initialRoles.map(({ code, name }) => ({ code, name })));
        const newRole = (await prompt.question('Código de rol: ')).trim().toUpperCase();
        const defaults = defaultScopeCodes(newRole);
        const answer = (await prompt.question('Alcances TIPO:CODIGO separados por coma (Enter = ' + defaults.join(',') + '): ')).trim();
        await service.create({ name, username: newUsername, email, role: newRole },
          answer ? answer.split(',').map((value) => value.trim()) : defaults, actor, deliver);
        console.log('Usuario creado y activo. Debe cambiar su contraseña al ingresar.');
      } finally { prompt.close(); }
    } else if ((command === 'disable' || command === 'enable') && username) {
      await service.setActive(username, command === 'enable', actor);
      console.log('Estado actualizado; sesiones revocadas.');
    } else if (command === 'reset' && username) {
      await service.resetPassword(username, actor, deliver);
      console.log('Contraseña restablecida; sesiones revocadas.');
    } else if (command === 'access' && username && role && rawScopes) {
      await service.setAccess(username, role, rawScopes === 'NONE' ? [] : rawScopes.split(','), actor);
      console.log('Rol y alcances actualizados; sesiones revocadas.');
    } else if (command === 'permissions' && username && role) {
      await service.setPermissions(username, role === 'NONE' ? [] : role.split(','), actor);
      console.log('Permisos actualizados; sesiones del rol revocadas.');
    } else if (command === 'audit') {
      console.table(await service.auditEvents(actor));
    } else {
      throw new Error('Uso: users init | list | create | disable USER | enable USER | reset USER | access USER ROLE SCOPES | permissions ROLE PERMISSIONS | audit');
    }
  } finally { await app.close(); }
}
void main().catch((error: unknown) => {
  // Do not render Prisma errors: they can include input values such as hashes.
  const message = error instanceof Error && !error.constructor.name.startsWith('Prisma')
    ? error.message : 'Operación rechazada por la base de datos. Verifica los datos y la auditoría.';
  console.error(message);
  process.exitCode = 1;
});

