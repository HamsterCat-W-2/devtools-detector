interface DevtoolsDetectorOptions {
  checkInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
}

class DevtoolsDetector {
  private isOpen: boolean = false;
  private checkInterval: number;
  private timer: number | null = null;
  private onOpen?: () => void;
  private onClose?: () => void;

  constructor(options: DevtoolsDetectorOptions = {}) {
    this.checkInterval = options.checkInterval || 500;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
  }

  start(): void {
    this.check();
    this.timer = window.setInterval(() => this.check(), this.checkInterval);
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
    // 方法1: 使用 debugger 检测（可能被禁用）
    const before = new Date().getTime();
    // eslint-disable-next-line no-debugger
    debugger;
    const after = new Date().getTime();
    const isDebuggerOpen = after - before > 100;
    
    // 方法2: 检测 console 对象（通过 getter 检测）
    let isConsoleOpen = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        isConsoleOpen = true;
        return 'devtools-detector';
      }
    });
    console.log(element);
    
    // 方法3: 检测 console.log 的 toString 方法
    let toStringTriggered = false;
    const fakeObject = {};
    Object.defineProperty(fakeObject, 'toString', {
      get: function() {
        toStringTriggered = true;
        return function() { return ''; };
      }
    });
    console.log(fakeObject);
    
    // 方法4: 检测 Firebug（某些浏览器）
    const isFirebugOpen = window.console && (window.console as any).firebug;
    
    // 方法5: 检测 devtools 的 toString 行为
    let regToStringTriggered = false;
    const regexp = /./;
    regexp.toString = function() {
      regToStringTriggered = true;
      return 'devtools';
    };
    console.log(regexp);
    
    return isDebuggerOpen || isConsoleOpen || toStringTriggered || isFirebugOpen || regToStringTriggered;
  }

  getStatus(): boolean {
    return this.isOpen;
  }
}

export default DevtoolsDetector;
