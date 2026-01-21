import { checkDebugger } from './debugger-detector';
import { checkEruda } from './eruda-detector';
import { checkConsoleTimeDiff } from './console-detector';
import type { DetectionResults } from '../types';

export function detectDevtools(): boolean {
  const results: DetectionResults = {
    debugger: checkDebugger(),
    eruda: checkEruda(),
    consoleTimeDiff: checkConsoleTimeDiff(),
  };

  // 只要有一个检测方法触发即判定为打开
  return results.debugger || results.eruda || results.consoleTimeDiff;
}

export { checkDebugger, checkEruda, checkConsoleTimeDiff };
