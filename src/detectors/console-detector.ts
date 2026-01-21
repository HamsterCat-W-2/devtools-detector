import { cachedConsoleLog, cachedConsoleTable, cachedConsoleClear } from '../utils/console-cache';
import { now } from '../utils/time';

// 记录历史最大 log 时间作为基线，避免首次检测误判
let maxLogTime = 0;

export function checkConsoleTimeDiff(): boolean {
  // 检查是否支持 console.table
  if (!cachedConsoleTable || typeof cachedConsoleTable !== 'function') {
    return false;
  }

  // 创建复杂对象数组
  const testData = Array.from({ length: 500 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.random() * 1000,
    timestamp: Date.now(),
    nested: {
      prop1: `value${i}`,
      prop2: i * 2,
      prop3: { deep: `deep${i}` },
    },
  }));

  // 预热
  if (cachedConsoleClear) cachedConsoleClear.call(console);
  cachedConsoleLog.call(console, testData);
  cachedConsoleTable.call(console, testData);
  if (cachedConsoleClear) cachedConsoleClear.call(console);

  // 测量 log 时间（两次取最大值，减少波动）
  const logStart1 = now();
  cachedConsoleLog.call(console, testData);
  const logTime1 = now() - logStart1;

  const logStart2 = now();
  cachedConsoleLog.call(console, testData);
  const logTime2 = now() - logStart2;

  const currentLogTime = Math.max(logTime1, logTime2);

  // 测量 table 时间
  const tableStart = now();
  cachedConsoleTable.call(console, testData);
  const tableTime = now() - tableStart;

  if (cachedConsoleClear) cachedConsoleClear.call(console);

  // 更新历史最大值作为基线
  maxLogTime = Math.max(maxLogTime, currentLogTime);

  // 边界情况：table 时间为 0 或基线未建立
  if (tableTime === 0 || maxLogTime === 0) {
    return false;
  }

  // 核心算法：table 时间 > log 基线的 10 倍
  return tableTime > maxLogTime * 10;
}
