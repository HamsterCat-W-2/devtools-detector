// 时间测量函数，兼容老浏览器
export const now = (() => {
  if (typeof performance !== 'undefined' && performance.now) {
    return () => performance.now();
  }
  return () => Date.now();
})();
