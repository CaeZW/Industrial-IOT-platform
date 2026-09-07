ALTER TABLE core.machines
  ADD COLUMN registration_mode varchar(20) NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN manual_form_definition jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT machines_registration_mode CHECK (registration_mode IN ('AUTOMATIC', 'MANUAL')),
  ADD CONSTRAINT machines_manual_form_array CHECK (jsonb_typeof(manual_form_definition) = 'array');

UPDATE core.machines SET registration_mode='MANUAL', manual_form_definition='[{"key":"obs","label":"Observaciones","type":"text"},{"key":"w407","label":"W407","type":"boolean"},{"key":"w415","label":"W415","type":"boolean"},{"key":"presion","label":"Presión","type":"number"},{"key":"purgaFondo","label":"Purga de fondo","type":"boolean"}]'::jsonb WHERE legacy_machine_id=2;
UPDATE core.machines SET registration_mode='MANUAL', manual_form_definition='[{"key":"obs","label":"Observaciones","type":"text"},{"key":"ruido","label":"Ruido","type":"boolean"},{"key":"aceite","label":"Aceite","type":"boolean"},{"key":"presion","label":"Presión","type":"number"},{"key":"temperatura","label":"Temperatura","type":"number"}]'::jsonb WHERE legacy_machine_id IN (3,4,5);
UPDATE core.machines SET registration_mode='MANUAL', manual_form_definition='[{"key":"obs","label":"Observaciones","type":"text"},{"key":"presion","label":"Presión","type":"number"},{"key":"volumen","label":"Volumen","type":"number"},{"key":"temperatura","label":"Temperatura","type":"number"},{"key":"conductividad","label":"Conductividad","type":"number"}]'::jsonb WHERE legacy_machine_id=6;
UPDATE core.machines SET registration_mode='MANUAL', manual_form_definition='[{"key":"temp_in","label":"Temperatura de entrada","type":"number"},{"key":"temp_out","label":"Temperatura de salida","type":"number"}]'::jsonb WHERE legacy_machine_id=7;
UPDATE core.machines SET registration_mode='MANUAL', manual_form_definition='[{"key":"Frecuencia","label":"Frecuencia","type":"number"}]'::jsonb WHERE legacy_machine_id IN (39,40);
UPDATE core.machines SET registration_mode='MANUAL', manual_form_definition='[{"key":"Dureza","label":"Dureza","type":"number"},{"key":"Volumen","label":"Volumen","type":"number"}]'::jsonb WHERE legacy_machine_id=45;
