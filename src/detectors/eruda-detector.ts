export function checkEruda(): boolean {
  // 检测 Eruda 移动端调试工具
  // Eruda 会在 window 对象上添加 eruda 属性
  if (typeof window !== 'undefined' && (window as any).eruda) {
    // 检查 eruda 是否已初始化
    const eruda = (window as any).eruda;
    // eruda._isInit 表示已经初始化
    return !!(eruda._isInit || eruda._devTools);
  }
  
  // 检测 vConsole（另一个流行的移动端调试工具）
  if (typeof window !== 'undefined' && (window as any).vConsole) {
    return true;
  }
  
  return false;
}
