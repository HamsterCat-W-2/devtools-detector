interface DevtoolsDetectorOptions {
  checkInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  maxCheckCount?: number;
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
  private readonly DETECTION_THRESHOLD = 5; // 需要连续检测5次才确认状态变化

  constructor(options: DevtoolsDetectorOptions = {}) {
    this.checkInterval = options.checkInterval || 500;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.maxCheckCount = options.maxCheckCount || Infinity;
  }

  start(): void {
    this.checkCount = 0;
    this.check();
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
      this.check();
    }, this.checkInterval);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
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

  private checkConsoleGetter(): boolean {
    let isTriggered = false;
    const element = new Image();
    Object.defineProperty(element, "id", {
      get: function () {
        isTriggered = true;
        return "devtools-detector";
      },
    });
    console.log(element);
    return isTriggered;
  }

  private checkToString(): boolean {
    let isTriggered = false;
    const fakeObject = {};
    Object.defineProperty(fakeObject, "toString", {
      get: function () {
        isTriggered = true;
        return function () {
          return "";
        };
      },
    });
    console.log(fakeObject);
    return isTriggered;
  }

  private checkFirebug(): boolean {
    return !!(window.console && (window.console as any).firebug);
  }

  private checkConsoleTimeDiff(): {
    isOpen: boolean;
    avgLogTime: number;
    avgTableTime: number;
  } {
    // 创建复杂对象数组，让时间差更明显
    const testData = Array.from({ length: 50 }, (_, i) => ({
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

    // 预热，避免首次调用的初始化开销
    console.clear();
    console.log(testData);
    console.table(testData);

    // 多次测量取平均值
    const iterations = 5; // 增加测量次数
    let totalLogTime = 0;
    let totalTableTime = 0;

    for (let i = 0; i < iterations; i++) {
      const logStart = performance.now();
      console.log(testData);
      const logEnd = performance.now();
      totalLogTime += logEnd - logStart;

      const tableStart = performance.now();
      console.table(testData);
      const tableEnd = performance.now();
      totalTableTime += tableEnd - tableStart;

      console.clear()
    }

    const avgLogTime = totalLogTime / iterations;
    const avgTableTime = totalTableTime / iterations;

    // 提高阈值，减少误判：table 时间超过 log 的 3 倍，且时间差大于 1ms
    const ratio = avgTableTime / avgLogTime;
    const diff = avgTableTime - avgLogTime;
    const isOpen = ratio > 4 && diff > 0.9;

    return { isOpen, avgLogTime, avgTableTime };
  }

  private detectDevtools(): boolean {
    const results = {
      debugger: this.checkDebugger(),
      consoleGetter: this.checkConsoleGetter(),
      toString: this.checkToString(),
      firebug: this.checkFirebug(),
      consoleTimeDiff: false,
    };

    const timeDiffResult = this.checkConsoleTimeDiff();
    results.consoleTimeDiff = timeDiffResult.isOpen;

    // 打印每个检测方法的结果
    console.log("检测结果:", {
      ...results,
      timings: {
        avgLogTime: timeDiffResult.avgLogTime.toFixed(3) + "ms",
        avgTableTime: timeDiffResult.avgTableTime.toFixed(3) + "ms",
        ratio:
          (timeDiffResult.avgTableTime / timeDiffResult.avgLogTime).toFixed(2) +
          "x",
        diff:
          (timeDiffResult.avgTableTime - timeDiffResult.avgLogTime).toFixed(3) +
          "ms",
      },
    });

    // 强检测：debugger, firebug - 单独触发即可判定
    const reliableDetection =
      results.debugger || results.consoleTimeDiff || results.firebug;

    // 弱检测：consoleGetter, toString, consoleTimeDiff
    // 需要至少两个弱检测同时触发才判定为打开
    const weakDetectionCount = [results.consoleGetter, results.toString].filter(
      Boolean,
    ).length;

    return reliableDetection || weakDetectionCount >= 2;
  }

  getStatus(): boolean {
    return this.isOpen;
  }
}

export default DevtoolsDetector;
