import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const workspace = 'C:/Users/GAIOT-PC/Desktop/IotApp/industrial-iot-platform-sprint-0_V2';
const outputDir = `${workspace}/outputs/measurement-definitions-20260907`;
const flowPath = 'C:/Users/GAIOT-PC/Downloads/flows (5).json';
const seedPath = `${workspace}/apps/api/prisma/seed-data.ts`;

const seedText = await fs.readFile(seedPath, 'utf8');
const flowNodes = JSON.parse(await fs.readFile(flowPath, 'utf8'));

function equipment(section) {
  const body = seedText.match(new RegExp(`export const ${section} = \\[([\\s\\S]*?)\\] as const`))?.[1] ?? '';
  const pattern = /\{\s*legacyId:\s*(\d+),\s*name:\s*"([^"]+)",\s*code:\s*(?:"([^"]+)"|null),\s*area:\s*"([^"]+)",\s*description:\s*"([^"]+)"/g;
  return [...body.matchAll(pattern)].map((m) => ({ id: Number(m[1]), name: m[2], code: m[3] ?? '', area: m[4], description: m[5] }));
}

const machines = equipment('machines');
const devices = equipment('devices');
if (machines.length !== 45 || devices.length !== 40) throw new Error(`Inventario inesperado: ${machines.length} máquinas, ${devices.length} devices`);

const variableKeys = {
  1: Array.from({ length: 17 }, (_, i) => `AI${String(i + 1).padStart(2, '0')}`),
  2: ['obs', 'w407', 'w415', 'presion', 'purgaFondo'],
  3: ['obs', 'ruido', 'aceite', 'presion', 'temperatura'],
  4: ['obs', 'ruido', 'aceite', 'presion', 'temperatura'],
  5: ['obs', 'ruido', 'aceite', 'presion', 'temperatura'],
  6: ['obs', 'presion', 'volumen', 'temperatura', 'conductividad'],
  7: ['temp_in', 'temp_out'],
  8: ['TempLoop', 'TempTanque', 'NivelTanque', 'Conductividad'],
  9: ['TempLoop', 'TempTanque', 'NivelTanque', 'Conductividad'],
  10: ['Presion', 'Frecuencia', 'TempSalida', 'TempIngreso', 'TempRetorno'],
  11: ['Etapa', 'Programa', 'TempPromedio', 'PresionCamara', 'PresionCamisa', 'Temperatura1', 'Temperatura2'],
  12: ['TempPromedio', 'PresionCamara', 'PresionCamisa', 'Temperatura1', 'Temperatura2'],
  13: ['PresionCamara', 'PresionCamisa', 'Temperatura1', 'Temperatura2'],
  14: ['Temperatura'], 15: ['Temperatura'], 16: ['Temperatura'], 17: ['Temperatura'],
  18: [], 19: ['Temperatura'], 20: [],
  21: ['PresionIn', 'PresionOut', 'Temperatura', 'DamperSalida', 'DamperIngreso', 'DamperMezclador', 'FrecuenciaExtraccion', 'FrecuenciaSuministro'],
  22: ['PresionOut', 'Temperatura'],
  23: ['Humedad', 'PresionIn', 'PresionOut', 'Temperatura', 'DamperSalida', 'DamperIngreso', 'DamperMezclador', 'FrecuenciaExtraccion', 'FrecuenciaSuministro'],
  24: ['Humedad', 'PresionIn', 'PresionOut', 'Temperatura', 'DamperSalida', 'DamperIngreso', 'DamperMezclador', 'FrecuenciaExtraccion', 'FrecuenciaSuministro'],
  25: ['Humedad', 'PresionIn', 'PresionOut', 'Temperatura', 'DamperSalida', 'DamperIngreso', 'DamperMezclador', 'FrecuenciaExtraccion', 'FrecuenciaSuministro'],
  26: ['PresionIn', 'PresionOut', 'DamperSalida', 'DamperIngreso', 'DamperMezclador', 'FrecuenciaExtraccion', 'FrecuenciaSuministro'],
  27: ['Humedad', 'Frecuencia', 'PresionOut', 'Temperatura'],
  28: ['Frecuencia', 'PresionOut', 'Temperatura'],
  29: ['PresionIn', 'Frecuencia', 'Temperatura'],
  30: ['Temperatura'],
  31: ['Frecuencia', 'PresionOut', 'Temperatura'], 32: ['Frecuencia', 'PresionOut', 'Temperatura'],
  33: ['Frecuencia', 'Temperatura'], 34: ['Frecuencia'],
  35: ['Frecuencia', 'PresionOut', 'Temperatura'], 36: ['Frecuencia', 'PresionOut', 'Temperatura'],
  37: ['Frecuencia'], 38: ['Frecuencia'], 39: ['Frecuencia'], 40: ['Frecuencia'],
  41: ['Temperatura', 'Humedad'], 42: ['Frecuencia', 'Temperatura'], 43: ['Frecuencia'],
  44: ['TempTanque', 'PresionBomba'], 45: ['Dureza', 'Volumen'],
};

const manualIds = new Set([2, 3, 4, 5, 6, 7, 39, 40, 45]);
const booleanKeys = new Set(['en_marcha', 'w407', 'w415', 'purgaFondo', 'ruido', 'aceite']);
const textKeys = new Set(['obs', 'Etapa', 'Programa']);
const labels = {
  en_marcha: 'En marcha', obs: 'Observaciones', w407: 'W407', w415: 'W415', presion: 'Presión', purgaFondo: 'Purga de fondo',
  ruido: 'Ruidos anormales', aceite: 'Nivel de aceite correcto', temperatura: 'Temperatura', volumen: 'Volumen', conductividad: 'Conductividad',
  temp_in: 'Temperatura de entrada', temp_out: 'Temperatura de salida', TempLoop: 'Temperatura del loop', TempTanque: 'Temperatura del tanque',
  NivelTanque: 'Nivel del tanque', Conductividad: 'Conductividad', Presion: 'Presión', Frecuencia: 'Frecuencia', TempSalida: 'Temperatura de salida',
  TempIngreso: 'Temperatura de ingreso', TempRetorno: 'Temperatura de retorno', Etapa: 'Etapa', Programa: 'Programa', TempPromedio: 'Temperatura promedio',
  PresionCamara: 'Presión de cámara', PresionCamisa: 'Presión de camisa', Temperatura1: 'Temperatura 1', Temperatura2: 'Temperatura 2',
  Temperatura: 'Temperatura', Humedad: 'Humedad', PresionIn: 'Presión de entrada', PresionOut: 'Presión de salida', DamperSalida: 'Damper de salida',
  DamperIngreso: 'Damper de ingreso', DamperMezclador: 'Damper mezclador', FrecuenciaExtraccion: 'Frecuencia de extracción',
  FrecuenciaSuministro: 'Frecuencia de suministro', PresionBomba: 'Presión de bomba', Dureza: 'Dureza', Volumen: 'Volumen',
};

function keyType(key) { return booleanKeys.has(key) ? 'BOOLEANO' : textKeys.has(key) ? 'TEXTO' : 'NUMÉRICO'; }
function displayMode(key) { return keyType(key) === 'BOOLEANO' ? 'LED' : keyType(key) === 'TEXTO' ? 'TEXTO' : 'POR DEFINIR'; }

const machineRows = [];
for (const machine of machines) {
  const keys = ['en_marcha', ...(variableKeys[machine.id] ?? [])];
  keys.forEach((key, index) => machineRows.push([
    machine.id, machine.name, machine.code, machine.area, manualIds.has(machine.id) ? 'MANUAL' : 'AUTOMÁTICO', key,
    labels[key] ?? key, keyType(key), '', 'SÍ', displayMode(key), keyType(key) === 'NUMÉRICO' ? 'POR DEFINIR' : 'NO',
    key === 'en_marcha' ? 'NO' : 'POR DEFINIR', index + 1, '', '', keyType(key) === 'NUMÉRICO' ? 1 : '',
    (variableKeys[machine.id]?.length ?? 0) === 0 && key === 'en_marcha' ? 'No se proporcionaron todavía variables de proceso.' : '',
  ]));
}

const deviceRows = [];
for (const device of devices) {
  [['Temperatura', 'Temperatura', '°C'], ['Humedad', 'Humedad', '% HR']].forEach(([key, label, unit], index) => deviceRows.push([
    device.id, device.name, device.code, device.area, key, label, 'NUMÉRICO', unit, 'SÍ', 'POR DEFINIR', 'SÍ', 'SÍ', index + 1, 1, '', '', 1, '',
  ]));
}

const tabs = new Map(flowNodes.filter((n) => n.type === 'tab').map((n) => [n.id, n.label]));
const nodeRedMachine = {
  'BRAMCOR': 'Bramcor', 'Loop PW': 'Loop PW', 'Loop WFI': 'Loop WFI', 'Agua Caliente': 'Intercambiador de calor Agua Caliente',
  'AUTOCLAVE #1': 'Autoclave #1', 'AUTOCLAVE #2': 'Autoclave #2', 'AUTOCLAVE #3': 'Autoclave #3', 'Curadil': 'Tanque Reactor Curadil',
  'Estériles': 'Tanque Reactor Estériles', 'Tanque condensado': 'Tanque Condensado', 'UTA 2': 'UTA #2 (DISPENSACIÓN)',
  'UEA 2': 'UEA #2 (SÓLIDOS III)', 'UTA 3': 'UTA #3 (LÍQUIDOS ORALES)', 'UTA 4': 'UTA #4 (ESTÉRILES)',
  'UTA 5': 'UTA #5 (LAVADO ESTÉRIL)', 'UTA 6': 'UTA #6 (CANULADO)', 'UTA 7': 'UTA #7 (SÓLIDOS II)',
  'UEA 7': 'UEA #7 (SÓLIDOS II)', 'UTA 8': 'UTA #8 (AGUA)', 'UEA 8': 'UEA #8 (AGUA)',
  'UTA 9': 'UTA #9 (ACOND ESTÉRIL)', 'UEA 9': 'UEA #9 (ACOND ESTÉRIL)', 'UTA & UEA 10': 'UTA/UEA #10 (CONTROL DE CALIDAD)',
  'UTA 12': 'UTA #12 (SÓLIDOS I)', 'UEA 12': 'UEA #12 (SÓLIDOS I)', 'Liquidos Orales I': 'Tanques de Líquidos Orales',
  'ALARMAS': 'Varias máquinas', 'HVAC': 'Resumen HVAC', 'MANTENIMIENTO': 'Resumen Mantenimiento', 'Estabilidad': 'Estabilidad',
};
const readMap = new Map();
for (const node of flowNodes.filter((n) => n.type === 's7 in' && n.variable)) {
  const tab = tabs.get(node.z) ?? 'Sin pestaña'; const key = `${tab}\u0000${node.variable}`;
  if (!readMap.has(key)) readMap.set(key, [tab, nodeRedMachine[tab] ?? 'POR ASIGNAR', node.variable, node.mode ?? '', node.diff === true ? 'CAMBIOS' : 'CONTINUO', '', '']);
}
const readRows = [...readMap.values()].sort((a, b) => a[0].localeCompare(b[0], 'es') || a[2].localeCompare(b[2], 'es'));

const writeMap = new Map();
for (const node of flowNodes.filter((n) => n.type === 's7 out' && n.variable)) {
  const tab = tabs.get(node.z) ?? 'Sin pestaña'; const key = `${tab}\u0000${node.variable}\u0000${node.name ?? ''}`;
  if (!writeMap.has(key)) writeMap.set(key, [tab, nodeRedMachine[tab] ?? 'POR ASIGNAR', node.name ?? '', node.variable, 'OPERACIÓN PLC', 'NO IMPLEMENTAR COMO MEDICIÓN', '']);
}
const writeRows = [...writeMap.values()].sort((a, b) => a[0].localeCompare(b[0], 'es') || a[3].localeCompare(b[3], 'es'));

const workbook = Workbook.create();
const orange = '#F59E0B'; const navy = '#1F2937'; const dark = '#374151'; const pale = '#FFF7D6'; const line = '#D1D5DB'; const white = '#FFFFFF';

function setupSheet(sheet, title, subtitle, headers, rows, widths, tableName) {
  sheet.showGridLines = false;
  sheet.getRange('A2').values = [[title]];
  sheet.getRange('A2').format.font = { name: 'Arial', size: 15, bold: true, color: orange };
  sheet.getRange('A3').values = [[subtitle]];
  sheet.getRange('A3').format.font = { name: 'Arial', size: 10, italic: true, color: dark };
  const endCol = columnName(headers.length);
  sheet.getRange(`A5:${endCol}${5 + rows.length}`).values = [headers, ...rows];
  sheet.getRange(`A5:${endCol}5`).format = { fill: navy, font: { name: 'Arial', size: 10, bold: true, color: white }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true };
  sheet.getRange(`A6:${endCol}${5 + rows.length}`).format = { font: { name: 'Arial', size: 10, color: '#111827' }, verticalAlignment: 'center' };
  sheet.getRange(`A5:${endCol}${5 + rows.length}`).format.borders = { insideHorizontal: { style: 'thin', color: line }, bottom: { style: 'thin', color: line } };
  widths.forEach((width, index) => sheet.getRange(`${columnName(index + 1)}:${columnName(index + 1)}`).format.columnWidth = width);
  sheet.getRange('2:2').format.rowHeight = 24; sheet.getRange('5:5').format.rowHeight = 34;
  sheet.freezePanes.freezeRows(5); sheet.freezePanes.freezeColumns(2);
  const table = sheet.tables.add(`A5:${endCol}${5 + rows.length}`, true, tableName); table.style = 'TableStyleMedium2'; table.showFilterButton = true;
  return { endCol, endRow: 5 + rows.length };
}
function columnName(number) { let value = ''; while (number > 0) { number--; value = String.fromCharCode(65 + (number % 26)) + value; number = Math.floor(number / 26); } return value; }
function addListValidation(sheet, range, values) { sheet.getRange(range).dataValidation = { rule: { type: 'list', values } }; }

const machineSheet = workbook.worksheets.add('Variables máquinas'); machineSheet.tabColor = orange;
const machineHeaders = ['N', 'Máquina', 'Código', 'Área', 'Modo', 'Clave JSONB', 'Nombre visible', 'Tipo', 'Unidad', 'Dashboard', 'Presentación', 'Gráfico', 'Reporte PDF', 'Orden', 'Mín. gauge', 'Máx. gauge', 'Decimales', 'Observaciones / corrección'];
const machineLayout = setupSheet(machineSheet, 'Definición de variables de máquinas', 'Complete las celdas amarillas. “Reporte PDF” decide qué variables de sensores aparecerán en los reportes.', machineHeaders, machineRows, [6, 29, 15, 20, 13, 23, 28, 13, 13, 12, 17, 12, 15, 9, 12, 12, 11, 42], 'MachineVariables');
machineSheet.getRange(`G6:R${machineLayout.endRow}`).format.fill = pale;
addListValidation(machineSheet, `H6:H${machineLayout.endRow}`, ['NUMÉRICO', 'BOOLEANO', 'TEXTO']);
addListValidation(machineSheet, `J6:J${machineLayout.endRow}`, ['SÍ', 'NO']);
addListValidation(machineSheet, `K6:K${machineLayout.endRow}`, ['GAUGE', 'VALOR', 'LED', 'TEXTO', 'OCULTO', 'POR DEFINIR']);
addListValidation(machineSheet, `L6:L${machineLayout.endRow}`, ['SÍ', 'NO', 'POR DEFINIR']);
addListValidation(machineSheet, `M6:M${machineLayout.endRow}`, ['SÍ', 'NO', 'POR DEFINIR']);
machineSheet.getRange(`A6:A${machineLayout.endRow}`).format.horizontalAlignment = 'center';

const deviceSheet = workbook.worksheets.add('Dispositivos TH'); deviceSheet.tabColor = '#FBBF24';
const deviceHeaders = ['N', 'Dispositivo', 'Código', 'Área', 'Clave JSONB', 'Nombre visible', 'Tipo', 'Unidad', 'Dashboard', 'Presentación', 'Gráfico', 'Reporte PDF', 'Orden', 'Decimales', 'Mín. gauge', 'Máx. gauge', 'Intervalo visual', 'Observaciones / corrección'];
const deviceLayout = setupSheet(deviceSheet, 'Definición de variables de dispositivos TH', 'Temperatura y humedad están propuestas para dashboard, gráfico y reporte M MNT-07-F2.', deviceHeaders, deviceRows, [6, 31, 17, 20, 20, 25, 13, 12, 12, 17, 11, 15, 9, 11, 12, 12, 16, 40], 'DeviceVariables');
deviceSheet.getRange(`F6:R${deviceLayout.endRow}`).format.fill = pale;
addListValidation(deviceSheet, `I6:I${deviceLayout.endRow}`, ['SÍ', 'NO']);
addListValidation(deviceSheet, `J6:J${deviceLayout.endRow}`, ['GAUGE', 'VALOR', 'LED', 'TEXTO', 'OCULTO', 'POR DEFINIR']);
addListValidation(deviceSheet, `K6:L${deviceLayout.endRow}`, ['SÍ', 'NO', 'POR DEFINIR']);

const readSheet = workbook.worksheets.add('Lecturas Node-RED');
const readHeaders = ['Pestaña Node-RED', 'Máquina sugerida', 'Variable S7 actual', 'Modo S7', 'Publicación actual', 'Clave JSONB correspondiente', 'Observaciones'];
const readLayout = setupSheet(readSheet, 'Inventario de lecturas del flujo actual', 'Referencia técnica extraída del flujo. Complete el vínculo con la clave JSONB cuando corresponda; no define por sí solo el reporte.', readHeaders, readRows, [24, 35, 34, 14, 18, 30, 45], 'NodeRedReads');
readSheet.getRange(`F6:G${readLayout.endRow}`).format.fill = pale;

const writeSheet = workbook.worksheets.add('Operación Node-RED');
const writeHeaders = ['Pestaña Node-RED', 'Máquina sugerida', 'Nombre actual', 'Variable S7 escrita', 'Clasificación', 'Tratamiento en la aplicación', 'Observaciones'];
const writeLayout = setupSheet(writeSheet, 'Inventario de escrituras al PLC', 'Estas salidas son referencia para un futuro módulo de comandos. No deben convertirse en measurement_definitions ni ejecutarse desde Angular.', writeHeaders, writeRows, [24, 35, 25, 27, 19, 32, 45], 'NodeRedWrites');
writeSheet.getRange(`G6:G${writeLayout.endRow}`).format.fill = pale;

const guide = workbook.worksheets.add('Guía'); guide.tabColor = '#9CA3AF'; guide.showGridLines = false;
guide.getRange('A2').values = [['Cómo completar la matriz']]; guide.getRange('A2').format.font = { name: 'Arial', size: 15, bold: true, color: orange };
guide.getRange('A4:B13').values = [
  ['Campo', 'Criterio'],
  ['Nombre visible', 'Texto que verá el usuario en dashboard, gráfico y PDF.'],
  ['Unidad', 'Unidad industrial exacta. Déjela vacía si no corresponde.'],
  ['Dashboard', 'SÍ si debe verse en vivo.'],
  ['Presentación', 'GAUGE, VALOR, LED, TEXTO u OCULTO.'],
  ['Gráfico', 'SÍ solamente para variables numéricas que necesiten tendencia.'],
  ['Reporte PDF', 'SÍ para incluir la variable en M MNT-07-F2. NO para variables solo visuales.'],
  ['Orden', 'Posición dentro del dashboard y reporte.'],
  ['Mín./Máx. gauge', 'Escala visual. No se usa como límite de alarma.'],
  ['Observaciones', 'Correcciones de clave, etiqueta o significado.'],
];
guide.getRange('A4:B4').format = { fill: navy, font: { name: 'Arial', size: 10, bold: true, color: white }, horizontalAlignment: 'center' };
guide.getRange('A5:B13').format = { font: { name: 'Arial', size: 10 }, verticalAlignment: 'center', wrapText: true };
guide.getRange('A15:B21').values = [
  ['Decisión ya confirmada', 'Valor'],
  ['Zona horaria', 'America/La_Paz'],
  ['Control de horas', 'M MNT-07-F1'],
  ['Parámetros y telemetría', 'M MNT-07-F2'],
  ['Formato', 'PDF'],
  ['Variables recibidas', 'Se conserva el JSONB completo. Reporte PDF controla solo su presentación.'],
  ['Migración histórica', 'Fuera de esta etapa. PostgreSQL será la fuente prioritaria cuando se aborde.'],
];
guide.getRange('A15:B15').format = { fill: navy, font: { name: 'Arial', size: 10, bold: true, color: white }, horizontalAlignment: 'center' };
guide.getRange('A16:B21').format = { font: { name: 'Arial', size: 10 }, wrapText: true };
guide.getRange('A23:B25').values = [['Fuente', 'Detalle'], ['Inventario', 'Catálogo vigente del proyecto: 45 máquinas y 40 dispositivos.'], ['Node-RED', 'Flujo entregado el 07/09/2026; se utilizó solo como referencia de lecturas, dashboards y escrituras.']];
guide.getRange('A23:B23').format = { fill: navy, font: { name: 'Arial', size: 10, bold: true, color: white }, horizontalAlignment: 'center' };
guide.getRange('A24:B25').format = { font: { name: 'Arial', size: 10 }, wrapText: true };
guide.getRange('A:A').format.columnWidth = 30; guide.getRange('B:B').format.columnWidth = 92;
guide.getRange('A4:B13').format.borders = { insideHorizontal: { style: 'thin', color: line }, bottom: { style: 'thin', color: line } };
guide.getRange('A15:B21').format.borders = { insideHorizontal: { style: 'thin', color: line }, bottom: { style: 'thin', color: line } };
guide.getRange('A23:B25').format.borders = { insideHorizontal: { style: 'thin', color: line }, bottom: { style: 'thin', color: line } };

workbook.recalculate();
const inspections = [];
inspections.push((await workbook.inspect({ kind: 'table', sheetId: 'Variables máquinas', range: 'A1:R18', include: 'values,formulas', tableMaxRows: 18, tableMaxCols: 18, maxChars: 10000 })).ndjson);
inspections.push((await workbook.inspect({ kind: 'table', sheetId: 'Dispositivos TH', range: 'A1:R12', include: 'values,formulas', tableMaxRows: 12, tableMaxCols: 18, maxChars: 8000 })).ndjson);
inspections.push((await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan', maxChars: 4000 })).ndjson);
await fs.writeFile(path.join(outputDir, 'builder', 'inspection.ndjson'), inspections.join('\n'));
for (const [sheetName, range] of [['Variables máquinas', 'A1:R28'], ['Dispositivos TH', 'A1:R24'], ['Lecturas Node-RED', 'A1:G28'], ['Operación Node-RED', 'A1:G28'], ['Guía', 'A1:B26']]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(path.join(outputDir, 'builder', `${sheetName.replaceAll(' ', '_')}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = path.join(outputDir, 'matriz-measurement-definitions.xlsx');
await output.save(outputPath);
const reopened = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const reopenedCheck = await reopened.inspect({ kind: 'sheet,table', maxChars: 8000, tableMaxRows: 3, tableMaxCols: 8 });
await fs.writeFile(path.join(outputDir, 'builder', 'reopened-inspection.ndjson'), reopenedCheck.ndjson);
console.log(JSON.stringify({ output: path.join(outputDir, 'matriz-measurement-definitions.xlsx'), machineRows: machineRows.length, deviceRows: deviceRows.length, nodeRedReads: readRows.length, nodeRedWrites: writeRows.length }));
