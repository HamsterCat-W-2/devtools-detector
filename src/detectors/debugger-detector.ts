import { now } from '../utils/time';

export function checkDebugger(): boolean {
  const before = now();
  // eslint-disable-next-line no-debugger
  debugger;
  const after = now();
  return after - before > 100;
}
