# 4E / 4F — Registro manual y verificación de la etapa

Estado: implementado y verificado localmente.

## Decisión funcional

Angular envía los formularios a NestJS mediante REST y NestJS es el único que
escribe en PostgreSQL. No se agregaron servicios ni conexiones directas desde
Angular o Node-RED a la base de datos.

Las máquinas declaran un modo `AUTOMATIC` o `MANUAL`. Los datos de proceso se
mantienen en `process_data.readings` como JSONB; no se crearon columnas por
sensor. Los ejemplos de las máquinas automáticas son cargas representativas:
NestJS conserva todas las claves recibidas, incluso las desconocidas, sin exigir
una plantilla fija.

Para una máquina manual, el recorrido es:

1. Registrar el control completo: fecha y hora de inicio, fecha y hora de parada.
2. Registrar una única lectura con todos los parámetros definidos para esa máquina.

La parada debe ser posterior al inicio, el intervalo no puede estar en el futuro
ni solaparse con otro control de la misma máquina. La duración se calcula como
parada menos inicio. Los dos pasos son deliberadamente separados para que una
persona pueda completar después los parámetros de un control ya creado.

El guardado manual es inmediato y no usa el intervalo de persistencia MQTT. No
depende de heartbeat y no queda un control abierto que deba recuperarse después
de una caída. MQTT puede continuar refrescando la vista, pero no modifica un
control manual ni atribuye una lectura automática a un usuario.

## Formularios configurados

La definición del formulario es metadata JSONB de la máquina y puede modificarse
después mediante código/migración sin cambiar el esquema de `process_data`.
Inicialmente se configuraron estas nueve máquinas:

| Máquina | Campos obligatorios |
| --- | --- |
| Caldero Cleaver Brooks | obs, w407, w415, presion, purgaFondo |
| Compresor Schulz 3040 | obs, ruido, aceite, presion, temperatura |
| Compresor Schulz 4050 | obs, ruido, aceite, presion, temperatura |
| Compresor Somar | obs, ruido, aceite, presion, temperatura |
| Letzner | obs, presion, volumen, temperatura, conductividad |
| Chiller Aermec | temp_in, temp_out |
| UTA#13 (SEMISOLIDOS) | Frecuencia |
| UEA#13 (SEMISOLIDOS) | Frecuencia |
| Ablandador de agua | Dureza, Volumen |

NestJS exige exactamente esas claves y sus tipos. Los valores numéricos `0` y
booleanos `false` son válidos. El resultado completo se guarda como una sola fila
JSONB vinculada al control de horas.

Los dispositivos de temperatura/humedad permanecen automáticos. Sus lecturas no
tienen controles de horas y siguen la política de persistencia individual.

## Seguridad, responsabilidad e idempotencia

Administrador, Supervisor y Mantenimiento requieren simultáneamente los permisos
`process.manual.write` y `machine.run.manual.manage`, además de visualización y
alcance sobre la máquina. Operador permanece en solo lectura. El backend vuelve
a comprobar usuario, permisos, alcance y origen de la solicitud en cada paso.

El control conserva quién lo registró y la lectura conserva el usuario responsable;
pueden ser personas autorizadas distintas. Cada mutación lleva una clave UUID.
La huella y respuesta quedan en `operations.manual_operations`, por lo que repetir
el mismo intento devuelve el resultado anterior sin duplicar controles, lecturas,
auditorías exitosas ni notificaciones. Reutilizar la clave con otros datos falla.

Control, lectura, recibo de idempotencia y auditoría se confirman de forma atómica
bajo bloqueo de la máquina. Las contraseñas, tokens y contenido JSONB completo no
se copian a los registros de auditoría.

## Uso desde Angular

Las migraciones `20260904210000_manual_processes` y
`20260904220000_manual_machine_forms` están aplicadas en el entorno local. En otra
copia del repositorio se ejecutan `pnpm db:generate` y `pnpm db:deploy`.

Desde la raíz, en dos terminales separadas:

```powershell
pnpm dev:api
```

```powershell
pnpm dev:web
```

1. Abrir http://127.0.0.1:4200 e iniciar sesión con un rol autorizado.
2. Entrar en **Máquinas** y abrir una de las nueve máquinas manuales dentro del alcance.
3. Completar **Fecha inicio**, **Hora inicio**, **Fecha parada** y **Hora parada**.
4. Guardar el control y después completar todos los parámetros mostrados.
5. En la tabla, verificar origen Manual, duración y responsables. **Ver parámetros**
   muestra el JSONB y el usuario que lo registró. Un control sin parámetros ofrece
   la acción **Registrar parámetros** para retomarlo.

Estos formularios registran información; no envían órdenes a equipos físicos.
Los permisos se editan en **Administración → Roles** y el alcance en
**Administración → Usuarios**.

## Fallos y límites explícitos

- Ante una respuesta perdida, la pantalla conserva el mismo intento para reintento.
- Los borradores viven en memoria: recargar o cerrar la pestaña los descarta.
- Una lectura rechazada, un conflicto o un fallo SQL no deja datos parciales.
- Un fallo de WebSocket posterior no revierte un guardado SQL confirmado; recargar
  recupera el estado persistido.
- No se implementaron edición ni eliminación de registros históricos, operación
  offline, reportes PDF ni comandos físicos en esta etapa.
- La metadata actual no incorpora unidades, límites o etiquetas de reporte; eso
  puede evolucionar sin modificar el JSONB histórico.
- Las máquinas automáticas necesitan una clave booleana de funcionamiento
  configurada (por defecto `arranque`) para abrir/cerrar controles automáticos.
  NestJS no infiere marcha a partir de frecuencia, temperatura u otro parámetro.

## Evidencia de 4F

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Las pruebas comprueban respuestas HTTP y filas PostgreSQL: cuatro fechas, duración,
JSONB exacto con `0` y `false`, asociación al control, responsables, roles, alcances,
origen web, idempotencia, concurrencia, solapamientos, conflictos MQTT y rollback.
También reproducen un proceso independiente para Administrador, Supervisor y
Mantenimiento, y el formulario Angular de dos pasos.

Consulta opcional de solo lectura en pgAdmin, base local por el puerto 55432:

```sql
SELECT r.id, m.code, r.origin, r.started_at, r.finished_at,
       EXTRACT(EPOCH FROM (r.finished_at - r.started_at)) AS duration_seconds,
       starter.username AS started_by, closer.username AS closed_by
FROM operations.machine_runs r
JOIN core.machines m ON m.id = r.machine_id
LEFT JOIN iam.users starter ON starter.id = r.started_by_id
LEFT JOIN iam.users closer ON closer.id = r.closed_by_id
WHERE r.origin = 'MANUAL'
ORDER BY r.started_at DESC LIMIT 20;

SELECT p.machine_run_id, p.event_time, p.source_type, u.username, p.readings
FROM operations.process_data p
LEFT JOIN iam.users u ON u.id = p.recorded_by_id
WHERE p.source_type = 'MANUAL'
ORDER BY p.event_time DESC LIMIT 20;
```

La validación fue exclusivamente local. No se conectó ni modificó producción y
no se dejan servidores de previsualización abiertos.
