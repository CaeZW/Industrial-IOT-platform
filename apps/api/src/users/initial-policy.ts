export const catalogPermissions = ['page.dashboard.view', 'page.machines.view', 'page.devices.view'] as const;
const reporting = [...catalogPermissions, 'alarm.acknowledge', 'report.create'];
const manual = ['process.manual.write', 'machine.run.manual.manage'];
export const initialRoles = [
  { code: 'ADMINISTRATOR', name: 'Administrador', permissions: [...reporting, ...manual, 'machine.control', 'configuration.write', 'user.manage', 'role.manage', 'audit.read'] },
  { code: 'SUPERVISOR', name: 'Supervisor', permissions: [...reporting, ...manual, 'machine.control', 'audit.read'] },
  { code: 'MAINTENANCE', name: 'Mantenimiento', permissions: [...catalogPermissions, ...manual, 'machine.control', 'alarm.acknowledge'] },
  { code: 'OPERATOR', name: 'Operador', permissions: [...catalogPermissions] },
  { code: 'QUALITY_CONTROL', name: 'Control de Calidad', permissions: reporting },
  { code: 'PRODUCTION', name: 'Producción', permissions: reporting },
  { code: 'RESEARCH_DEVELOPMENT', name: 'Investigación y desarrollo (I&D)', permissions: reporting },
  { code: 'VALIDATION', name: 'Validaciones', permissions: reporting },
] as const;
export const initialUsers = [
  { name: 'Carlos Zuleta', username: 'czuleta', email: 'czuleta@grupoalcos.com', role: 'ADMINISTRATOR' },
  { name: 'Victor Chambi', username: 'vchambi', email: 'vchambi@grupoalcos.com', role: 'SUPERVISOR' },
  { name: 'Franklin Ergueta', username: 'fergueta', email: 'fergueta@grupoalcos.com', role: 'SUPERVISOR' },
  { name: 'Angelica Paz', username: 'apaz', email: 'apaz@grupoalcos.com', role: 'RESEARCH_DEVELOPMENT' },
  { name: 'Ruddy Yujra', username: 'ryujra', email: null, role: 'OPERATOR' },
  { name: 'Antonio Paton', username: 'apaton', email: null, role: 'OPERATOR' },
  { name: 'Carlos Lopez', username: 'clopez', email: null, role: 'OPERATOR' },
  { name: 'Samuel Chambilla', username: 'schambilla', email: null, role: 'OPERATOR' },
  { name: 'Eduardo Aruquipa', username: 'earuquipa', email: null, role: 'OPERATOR' },
  { name: 'Fabiola Huanca', username: 'fhuanca', email: 'fhuanca@grupoalcos.com', role: 'QUALITY_CONTROL' },
  { name: 'Danitza Choque', username: 'dchoque', email: 'mchoque@grupoalcos.com', role: 'QUALITY_CONTROL' },
  { name: 'Jimmy Paucar', username: 'jpaucar', email: 'jpaucar@grupoalcos.com', role: 'SUPERVISOR' },
  { name: 'Lorena Carvajal', username: 'lcarvajal', email: 'lcarvajal@grupoalcos.com', role: 'SUPERVISOR' },
] as const;
export function defaultScopeCodes(role: string): string[] {
  if (['ADMINISTRATOR', 'SUPERVISOR', 'MAINTENANCE', 'OPERATOR'].includes(role)) {
    return ['PLANT:ALCOS-EL-ALTO'];
  }
  return ['ESTERILES', 'LIQUIDOS-ORALES', 'MATERIA-PRIMA', 'DISPENSACION',
    'SOLIDOS-III', 'ACOND-NO-ESTERIL', 'SOLIDOS-II', 'SOLIDOS-I',
    'SEMISOLIDOS', 'CONTROL-CALIDAD', 'ESTABILIDAD'].map((code) => 'AREA:' + code);
}
