interface DevtoolsDetectorOptions {
  checkInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  maxCheckCount?: number;
  disableQueryParam?: string; // URL 参数名，如果存在且为 true 则禁用检测
}

// 缓存 console 方法，避免重复访问和兼容性问题
const cachedConsoleLog = console.log;
const cachedConsoleTable = console.table;
const cachedConsoleClear = console.clear;

class DevtoolsDetector {
  private isOpen: boolean = false;
  private checkInterval: number;
  private timer: number | null = null;
  private idleCallbackId: number | null = null; // 保存 requestIdleCallback 的 ID
  private onOpen?: () => void;
  private onClose?: () => void;
  private maxCheckCount: number;
  private checkCount: number = 0;
  private openDetectionCount: number = 0; // 检测到打开的次数
  private closeDetectionCount: number = 0; // 检测到关闭的次数
  private readonly DETECTION_THRESHOLD = 3; // 需要连续检测3次才确认状态变化
  private disableQueryParam: string;
  private isDisabledByQuery: boolean = false;
  private visibilityChangeHandler: (() => void) | null = null;
  private isRunning: boolean = false; // 标记检测是否正在运行
  private shouldStop: boolean = false; // 标记是否应该停止递归

  constructor(options: DevtoolsDetectorOptions = {}) {
    this.checkInterval = options.checkInterval || 1000; // 默认 1 秒
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.maxCheckCount = options.maxCheckCount || Infinity;
    this.disableQueryParam = options.disableQueryParam || 'mbFE';
    
    // 检查 URL 参数是否禁用检测
    this.isDisabledByQuery = this.checkDisableQuery();
    
    if (this.isDisabledByQuery) {
      console.log(`检测已禁用：URL 参数 ${this.disableQueryParam}=true`);
    }
  }

  start(): void {
    if (this.isDisabledByQuery) {
      console.log('检测已被 URL 参数禁用，不会启动');
      return;
    }
    
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.shouldStop = false;
    this.checkCount = 0;
    this.startTimer();
    this.setupVisibilityListener();
  }

  private startTimer(): void {
    if (this.shouldStop) {
      return;
    }
    
    this.scheduleCheck();
  }

  private stopTimer(): void {
    this.shouldStop = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.idleCallbackId !== null) {
      if ('cancelIdleCallback' in window) {
        cancelIdleCallback(this.idleCallbackId);
      }
      this.idleCallbackId = null;
    }
  }

  private scheduleCheck(): void {
    const runDetection = (deadline: IdleDeadline | { timeRemaining: () => number; didTimeout: boolean }): void => {
      this.idleCallbackId = null;
      
      if (this.shouldStop) {
        return;
      }
      
      if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
        this.check();
        
        // 只有设置了最大检测次数才计数
        if (this.maxCheckCount !== Infinity) {
          this.checkCount++;
          if (this.checkCount >= this.maxCheckCount) {
            console.log(`已达到最大检测次数 ${this.maxCheckCount}，停止检测`);
            this.stop();
            return;
          }
        }
        
        // 递归调用，继续下一次检测
        if (!this.shouldStop) {
          this.timer = window.setTimeout(() => {
            this.scheduleCheck();
          }, this.checkInterval);
        }
      }
    };

    if ('requestIdleCallback' in window) {
      this.idleCallbackId = requestIdleCallback(runDetection, { timeout: 2000 });
    } else {
      setTimeout(() => {
        runDetection({ timeRemaining: () => 50, didTimeout: false });
      }, 0);
    }
  }

  stop(): void {
    this.stopTimer();
    this.isRunning = false;
    this.removeVisibilityListener();
  }
  
  private setupVisibilityListener(): void {
    this.removeVisibilityListener();
    
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        console.log('页面不可见，暂停检测');
        this.stopTimer();
      } else {
        console.log('页面可见，恢复检测');
        if (this.isRunning && this.shouldStop) {
          this.shouldStop = false;
          this.startTimer();
        }
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }
  
  private removeVisibilityListener(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
  }

  private checkDisableQuery(): boolean {
    // 检查 URL 参数是否包含禁用标志
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramValue = urlParams.get(this.disableQueryParam);
      
      // 参数值为 'true' 或 '1' 时禁用检测
      return paramValue === 'true';
    } catch (e) {
      // 如果解析失败，不禁用检测
      return false;
    }
  }

  private check(): void {
    const isCurrentlyOpen = this.detectDevtools();

    if (isCurrentlyOpen) {
      this.openDetectionCount++;
      this.closeDetectionCount = 0; // 重置关闭计数
      
      // 连续检测到打开5次，且当前状态是关闭，则触发打开回调
      if (this.openDetectionCount >= this.DETECTION_THRESHOLD && !this.isOpen) {
        this.isOpen = true;
        console.log(`连续检测到打开 ${this.openDetectionCount} 次，确认开发者工具已打开`);
        this.onOpen?.();
      }
    } else {
      this.closeDetectionCount++;
      this.openDetectionCount = 0; // 重置打开计数
      
      // 连续检测到关闭5次，且当前状态是打开，则触发关闭回调
      if (this.closeDetectionCount >= this.DETECTION_THRESHOLD && this.isOpen) {
        this.isOpen = false;
        console.log(`连续检测到关闭 ${this.closeDetectionCount} 次，确认开发者工具已关闭`);
        this.onClose?.();
      }
    }
  }

  private checkDebugger(): boolean {
    const before = new Date().getTime();
    // eslint-disable-next-line no-debugger
    debugger;
    const after = new Date().getTime();
    return after - before > 100;
  }

  private checkEruda(): boolean {
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

  private checkConsoleTimeDiff(): {
    isOpen: boolean;
    avgLogTime: number;
    avgTableTime: number;
  } {
    // 创建复杂对象数组，让时间差更明显
    const testData = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      timestamp: Date.now(),
      nested: {
        prop1: `value${i}`,
        prop2: i * 2,
        prop3: {
          deep: `deep${i}`,
        },
      },
    }));

    // 检查是否支持 console.table
    if (!cachedConsoleTable || typeof cachedConsoleTable !== 'function') {
      return { isOpen: false, avgLogTime: 0, avgTableTime: 0 };
    }

    // 预热，避免首次调用的初始化开销
    if (cachedConsoleClear) cachedConsoleClear.call(console);
    cachedConsoleLog.call(console, testData);
    cachedConsoleTable.call(console, testData);

    // 多次测量取平均值
    const iterations = 5;
    let totalLogTime = 0;
    let totalCompareTime = 0;

    for (let i = 0; i < iterations; i++) {
      const logStart = performance.now();
      cachedConsoleLog.call(console, testData);
      const logEnd = performance.now();
      totalLogTime += logEnd - logStart;

      const compareStart = performance.now();
      cachedConsoleTable.call(console, testData);
      const compareEnd = performance.now();
      totalCompareTime += compareEnd - compareStart;

      if (cachedConsoleClear) cachedConsoleClear.call(console);
    }

    const avgLogTime = totalLogTime / iterations;
    const avgTableTime = totalCompareTime / iterations;

    // 提高阈值，减少误判：table 时间超过 log 的 4 倍，且时间差大于 0.9ms
    const ratio = avgTableTime / avgLogTime;
    const diff = avgTableTime - avgLogTime;
    const isOpen = ratio > 4 && diff > 0.9;

    return { isOpen, avgLogTime, avgTableTime };
  }
  

  private detectDevtools(): boolean {
    const results = {
      debugger: this.checkDebugger(),
      eruda: this.checkEruda(),
      consoleTimeDiff: false,
    };

    const timeDiffResult = this.checkConsoleTimeDiff();
    results.consoleTimeDiff = timeDiffResult.isOpen;

    // 打印每个检测方法的结果
    // console.log("检测结果:", {
    //   ...results,
    //   timings: {
    //     avgLogTime: timeDiffResult.avgLogTime.toFixed(3) + "ms",
    //     avgTableTime: timeDiffResult.avgTableTime.toFixed(3) + "ms",
    //     ratio:
    //       (timeDiffResult.avgTableTime / timeDiffResult.avgLogTime).toFixed(2) +
    //       "x",
    //     diff:
    //       (timeDiffResult.avgTableTime - timeDiffResult.avgLogTime).toFixed(3) +
    //       "ms",
    //   },
    // });

    // 只要有一个检测方法触发即判定为打开
    return results.debugger || results.eruda || results.consoleTimeDiff;
  }

  getStatus(): boolean {
    return this.isOpen;
  }
}

export default DevtoolsDetector;
