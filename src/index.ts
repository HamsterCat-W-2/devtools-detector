interface DevtoolsDetectorOptions {
  checkInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  maxCheckCount?: number;
  disableQueryParam?: string; // URL 参数名，如果存在且为 true 则禁用检测
}

class DevtoolsDetector {
  private isOpen: boolean = false;
  private checkInterval: number;
  private timer: number | null = null;
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
    // 如果被 URL 参数禁用，则不启动检测
    if (this.isDisabledByQuery) {
      console.log('检测已被 URL 参数禁用，不会启动');
      return;
    }
    
    // 如果已经在运行，不重复启动
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.checkCount = 0;
    this.startTimer();
    
    // 监听页面可见性变化
    this.setupVisibilityListener();
  }

  private startTimer(): void {
    if (this.timer !== null) {
      return;
    }
    
    this.scheduleCheck(); // 首次检测
    
    // 使用定时器调度后续检测
    this.timer = window.setInterval(() => {
      this.checkCount++;
      if (
        this.maxCheckCount !== Infinity &&
        this.checkCount >= this.maxCheckCount
      ) {
        console.log(`已达到最大检测次数 ${this.maxCheckCount}，停止检测`);
        this.stop();
        return;
      }
      this.scheduleCheck();
    }, this.checkInterval);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private scheduleCheck(): void {
    console.log('执行开发者工具检测...');
    const runDetection = (deadline: IdleDeadline | { timeRemaining: () => number; didTimeout: boolean }): void => {
      if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
        this.check();
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(runDetection, { timeout: 2000 });
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
        if (this.isRunning) {
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

    // 选择对比方法：优先使用 console.table
    // console.dir 和 console.group 的性能差异可能不够明显，所以只使用 table
    let compareMethod: ((data: any) => void) | null = null;
    
    if (console.table && typeof console.table === 'function') {
      compareMethod = console.table.bind(console);
    } else {
      // 如果不支持 console.table，则不使用此检测方法
      // 因为 console.dir 和 console.group 的性能差异不够明显
      return { isOpen: false, avgLogTime: 0, avgTableTime: 0 };
    }

    // 预热，避免首次调用的初始化开销
    if (console.clear) console.clear();
    console.log(testData);
    compareMethod(testData);

    // 多次测量取平均值
    const iterations = 5;
    let totalLogTime = 0;
    let totalCompareTime = 0;

    for (let i = 0; i < iterations; i++) {
      const logStart = performance.now();
      console.log(testData);
      const logEnd = performance.now();
      totalLogTime += logEnd - logStart;

      const compareStart = performance.now();
      compareMethod(testData);
      const compareEnd = performance.now();
      totalCompareTime += compareEnd - compareStart;

      if (console.clear) console.clear();
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
