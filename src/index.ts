export interface DevtoolsDetectorOptions {
  checkInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  disableMenu?: boolean;
}

export class DevtoolsDetector {
  private isOpen: boolean = false;
  private checkInterval: number;
  private timer: number | null = null;
  private onOpen?: () => void;
  private onClose?: () => void;
  private disableMenu: boolean;

  constructor(options: DevtoolsDetectorOptions = {}) {
    this.checkInterval = options.checkInterval || 500;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.disableMenu = options.disableMenu || false;
  }

  start(): void {
    this.check();
    this.timer = window.setInterval(() => this.check(), this.checkInterval);
    
    if (this.disableMenu) {
      this.preventContextMenu();
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private check(): void {
    const isCurrentlyOpen = this.detectDevtools();
    
    if (isCurrentlyOpen && !this.isOpen) {
      this.isOpen = true;
      this.onOpen?.();
    } else if (!isCurrentlyOpen && this.isOpen) {
      this.isOpen = false;
      this.onClose?.();
    }
  }

  private detectDevtools(): boolean {
    // 方法1: 检测窗口尺寸差异
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    // 方法2: 使用 debugger 检测
    const before = new Date().getTime();
    // eslint-disable-next-line no-debugger
    debugger;
    const after = new Date().getTime();
    const isDebuggerOpen = after - before > 100;
    
    // 方法3: 检测 console 对象
    let isConsoleOpen = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        isConsoleOpen = true;
        return 'devtools-detector';
      }
    });
    console.log(element);
    
    return widthThreshold || heightThreshold || isDebuggerOpen || isConsoleOpen;
  }

  private preventContextMenu(): void {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    
    document.addEventListener('keydown', (e) => {
      // 禁用 F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // 禁用 Ctrl+Shift+I / Cmd+Option+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // 禁用 Ctrl+Shift+J / Cmd+Option+J
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // 禁用 Ctrl+U / Cmd+U
      if ((e.ctrlKey || e.metaKey) && e.key === 'U') {
        e.preventDefault();
        return false;
      }
    });
  }

  getStatus(): boolean {
    return this.isOpen;
  }
}

export default DevtoolsDetector;
