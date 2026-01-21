// 缓存 console 方法，避免重复访问和兼容性问题
export const cachedConsoleLog = console.log;
export const cachedConsoleTable = console.table;
export const cachedConsoleClear = console.clear;
