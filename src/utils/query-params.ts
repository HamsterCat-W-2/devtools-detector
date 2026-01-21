export function checkDisableQuery(paramName: string): boolean {
  // 检查 URL 参数是否包含禁用标志
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramValue = urlParams.get(paramName);
    
    // 参数值为 'true' 或 '1' 时禁用检测
    return paramValue === 'true';
  } catch (e) {
    // 如果解析失败，不禁用检测
    return false;
  }
}
