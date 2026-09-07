ALTER TABLE operations.machine_runs
  ADD COLUMN origin varchar(20) NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN started_by_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
  ADD COLUMN closed_by_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT machine_runs_origin CHECK (origin IN ('AUTOMATIC', 'MANUAL')),
  ADD CONSTRAINT machine_runs_manual_actor CHECK (origin <> 'MANUAL' OR
    (started_by_id IS NOT NULL AND (finished_at IS NULL OR closed_by_id IS NOT NULL)));
ALTER TABLE operations.process_data
  ADD COLUMN recorded_by_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT process_data_manual_actor CHECK (source_type <> 'MANUAL' OR recorded_by_id IS NOT NULL);
CREATE TABLE operations.manual_operations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
  machine_id uuid NOT NULL REFERENCES core.machines(id) ON DELETE RESTRICT,
  key uuid NOT NULL,
  fingerprint varchar(64) NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, machine_id, key)
);
INSERT INTO iam.permissions(code) VALUES ('process.manual.write'), ('machine.run.manual.manage') ON CONFLICT DO NOTHING;
INSERT INTO iam.role_permissions(role_code, permission_code)
SELECT r.code, p.code FROM iam.roles r CROSS JOIN iam.permissions p
WHERE r.code IN ('ADMINISTRATOR', 'SUPERVISOR', 'MAINTENANCE')
AND p.code IN ('process.manual.write', 'machine.run.manual.manage') ON CONFLICT DO NOTHING;
