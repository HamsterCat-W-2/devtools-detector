import type { DevtoolsDetectorOptions } from '../types';
import { checkDisableQuery } from '../utils/query-params';
import { detectDevtools } from '../detectors';

/**
 * 开发者工具检测器类
 * 用于检测浏览器开发者工具的打开/关闭状态
 */
export class DevtoolsDetector {
  /** 开发者工具当前是否打开 */
  private isOpen: boolean = false;
  
  /** 检测间隔时间（毫秒） */
  private checkInterval: number;
  
  /** 定时器 ID */
  private timer: number | null = null;
  
  /** 空闲回调 ID */
  private idleCallbackId: number | null = null;
  
  /** 开发者工具打开时的回调函数 */
  private onOpen?: () => void;
  
  /** 开发者工具关闭时的回调函数 */
  private onClose?: () => void;
  
  /** 最大检测次数 */
  private maxCheckCount: number;
  
  /** 当前已检测次数 */
  private checkCount: number = 0;
  
  /** 连续检测到打开的次数 */
  private openDetectionCount: number = 0;
  
  /** 连续检测到关闭的次数 */
  private closeDetectionCount: number = 0;
  
  /** 检测阈值：连续检测到相同状态的次数才确认状态变化 */
  private readonly DETECTION_THRESHOLD = 3;
  
  /** 禁用检测的 URL 查询参数名 */
  private disableQueryParam: string;
  
  /** 是否通过 URL 参数禁用了检测 */
  private isDisabledByQuery: boolean = false;
  
  /** 页面可见性变化的事件处理器 */
  private visibilityChangeHandler: (() => void) | null = null;
  
  /** 检测器是否正在运行 */
  private isRunning: boolean = false;
  
  /** 是否应该停止检测 */
  private shouldStop: boolean = false;

  /**
   * 构造函数
   * @param options - 检测器配置选项
   */
  constructor(options: DevtoolsDetectorOptions = {}) {
    // 设置检测间隔，默认 1000ms
    this.checkInterval = options.checkInterval || 1000;
    
    // 设置回调函数
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    
    // 设置最大检测次数，默认无限次
    this.maxCheckCount = options.maxCheckCount || Infinity;
    
    // 设置禁用检测的查询参数名，默认为 'mbFE'
    this.disableQueryParam = options.disableQueryParam || 'mbFE';
    
    // 检查 URL 参数是否禁用了检测
    this.isDisabledByQuery = checkDisableQuery(this.disableQueryParam);
    
    if (this.isDisabledByQuery) {
      console.log(`检测已禁用：URL 参数 ${this.disableQueryParam}=true`);
    }
  }

  /**
   * 启动检测器
   * 如果已被 URL 参数禁用或已在运行中，则不会重复启动
   */
  start(): void {
    // 如果通过 URL 参数禁用了检测，则不启动
    if (this.isDisabledByQuery) {
      console.log('检测已被 URL 参数禁用，不会启动');
      return;
    }
    
    // 如果已经在运行，避免重复启动
    if (this.isRunning) {
      return;
    }
    
    // 初始化运行状态
    this.isRunning = true;
    this.shouldStop = false;
    this.checkCount = 0;
    
    // 启动定时器和页面可见性监听
    this.startTimer();
    this.setupVisibilityListener();
  }

  /**
   * 启动定时器
   * 如果已标记为应该停止，则不启动
   */
  private startTimer(): void {
    if (this.shouldStop) {
      return;
    }
    
    this.scheduleCheck();
  }

  /**
   * 停止定时器
   * 清除所有定时器和空闲回调
   */
  private stopTimer(): void {
    this.shouldStop = true;
    
    // 清除普通定时器
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // 清除空闲回调
    if (this.idleCallbackId !== null) {
      if ('cancelIdleCallback' in window) {
        cancelIdleCallback(this.idleCallbackId);
      }
      this.idleCallbackId = null;
    }
  }

  /**
   * 调度下一次检测
   * 使用 requestIdleCallback 在浏览器空闲时执行检测，以减少性能影响
   */
  private scheduleCheck(): void {
    /**
     * 执行检测的函数
     * @param deadline - 空闲回调的截止时间信息
     */
    const runDetection = (deadline: IdleDeadline | { timeRemaining: () => number; didTimeout: boolean }): void => {
      this.idleCallbackId = null;
      
      // 如果已标记停止，则不执行
      if (this.shouldStop) {
        return;
      }
      
      // 如果有剩余时间或已超时，则执行检测
      if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
        this.check();
        
        // 检查是否达到最大检测次数
        if (this.maxCheckCount !== Infinity) {
          this.checkCount++;
          if (this.checkCount >= this.maxCheckCount) {
            console.log(`已达到最大检测次数 ${this.maxCheckCount}，停止检测`);
            this.stop();
            return;
          }
        }
        
        // 如果未标记停止，则调度下一次检测
        if (!this.shouldStop) {
          this.timer = window.setTimeout(() => {
            this.scheduleCheck();
          }, this.checkInterval);
        }
      }
    };

    // 优先使用 requestIdleCallback，如果不支持则使用 setTimeout
    if ('requestIdleCallback' in window) {
      this.idleCallbackId = requestIdleCallback(runDetection, { timeout: 2000 });
    } else {
      setTimeout(() => {
        runDetection({ timeRemaining: () => 50, didTimeout: false });
      }, 0);
    }
  }

  /**
   * 停止检测器
   * 清除所有定时器和事件监听器
   */
  stop(): void {
    this.stopTimer();
    this.isRunning = false;
    this.removeVisibilityListener();
  }
  
  /**
   * 设置页面可见性监听器
   * 当页面不可见时暂停检测，可见时恢复检测，以节省资源
   */
  private setupVisibilityListener(): void {
    // 先移除旧的监听器，避免重复添加
    this.removeVisibilityListener();
    
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        // 页面不可见时暂停检测
        console.log('页面不可见，暂停检测');
        this.stopTimer();
      } else {
        // 页面可见时恢复检测
        console.log('页面可见，恢复检测');
        if (this.isRunning && this.shouldStop) {
          this.shouldStop = false;
          this.startTimer();
        }
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }
  
  /**
   * 移除页面可见性监听器
   */
  private removeVisibilityListener(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
  }

  /**
   * 执行一次检测
   * 使用连续检测机制来避免误判：只有连续多次检测到相同状态才确认状态变化
   */
  private check(): void {
    const isCurrentlyOpen = detectDevtools();

    if (isCurrentlyOpen) {
      // 检测到打开
      this.openDetectionCount++;
      this.closeDetectionCount = 0;
      
      // 连续检测到打开达到阈值，且当前状态为关闭，则确认为打开
      if (this.openDetectionCount >= this.DETECTION_THRESHOLD && !this.isOpen) {
        this.isOpen = true;
        console.log(`连续检测到打开 ${this.openDetectionCount} 次，确认开发者工具已打开`);
        this.onOpen?.();
      }
    } else {
      // 检测到关闭
      this.closeDetectionCount++;
      this.openDetectionCount = 0;
      
      // 连续检测到关闭达到阈值，且当前状态为打开，则确认为关闭
      if (this.closeDetectionCount >= this.DETECTION_THRESHOLD && this.isOpen) {
        this.isOpen = false;
        console.log(`连续检测到关闭 ${this.closeDetectionCount} 次，确认开发者工具已关闭`);
        this.onClose?.();
      }
    }
  }

  /**
   * 获取开发者工具当前状态
   * @returns 开发者工具是否打开
   */
  getStatus(): boolean {
    return this.isOpen;
  }
}
