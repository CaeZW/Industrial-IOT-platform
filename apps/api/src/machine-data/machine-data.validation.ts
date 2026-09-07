import { isMachineDataEvent } from '@industrial-iot-platform/contracts';
import type { MachineDataEvent } from '@industrial-iot-platform/contracts';
export function parseMachineMessage(topic: string, payload: Buffer, retained: boolean, now = Date.now()): { code: string; event: MachineDataEvent } | null {
  const match = /^iot\/v1\/machines\/([^/+#]+)\/data$/.exec(topic);
  if (!match || retained || payload.length > 262144 || match[1]!.length > 120) return null;
  try {
    const value: unknown = JSON.parse(payload.toString('utf8'));
    const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
    while (stack.length) {
      const item = stack.pop()!;
      if (item.depth > 32) return null;
      if (item.value && typeof item.value === 'object') for (const nested of Object.values(item.value)) stack.push({ value: nested, depth: item.depth + 1 });
    }
    if (!isMachineDataEvent(value) || value.schemaVersion !== '1.0' || value.source.machineId !== match[1] ||
      value.source.deviceId !== undefined || Date.parse(value.eventTime) > now + 30000) return null;
    return { code: match[1]!, event: value };
  } catch { return null; }
}
