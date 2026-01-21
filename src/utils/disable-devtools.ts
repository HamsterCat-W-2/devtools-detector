/**
 * 禁用鼠标右键菜单
 * 阻止用户通过右键菜单打开开发者工具
 */
export function disableContextMenu(): void {
  document.addEventListener(
    'contextmenu',
    (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true }
  );
}

/**
 * 禁用开发者工具相关的键盘快捷键
 * 阻止的快捷键包括：
 * - F12
 * - Ctrl+Shift+I / Cmd+Option+I (打开开发者工具)
 * - Ctrl+Shift+J / Cmd+Option+J (打开控制台)
 * - Ctrl+Shift+C / Cmd+Option+C (元素选择器)
 * - Ctrl+U / Cmd+Option+U (查看源代码)
 */
export function disableKeyboardShortcuts(): void {
  const handler = (e: KeyboardEvent): boolean | void => {
    const code = e.code;
    const devToolsKeys = ['KeyI', 'KeyJ', 'KeyC'];
    const isDevToolsKey =
      code === 'F12' ||
      (((e.ctrlKey && e.shiftKey) || (e.metaKey && e.altKey)) &&
        devToolsKeys.indexOf(code) !== -1) ||
      ((e.ctrlKey || (e.metaKey && e.altKey)) && code === 'KeyU');

    if (isDevToolsKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  document.addEventListener('keydown', handler, { capture: true });
}

/**
 * 同时禁用右键菜单和键盘快捷键
 * 这是 disableContextMenu 和 disableKeyboardShortcuts 的组合
 */
export function disableAllDevtoolsAccess(): void {
  disableContextMenu();
  disableKeyboardShortcuts();
}
