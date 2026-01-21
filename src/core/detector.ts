import type { DevtoolsDetectorOptions } from '../types';
import { checkDisableQuery } from '../utils/query-params';
import { detectDevtools } from '../detectors';

export class DevtoolsDetector {
  private isOpen: boolean = false;
  private checkInterval: number;
  private timer: number | null = null;
  private idleCallbackId: number | null = null;
  private onOpen?: () => void;
  private onClose?: () => void;
  private maxCheckCount: number;
  private checkCount: number = 0;
  private openDetectionCount: number = 0;
  private closeDetectionCount: number = 0;
  private readonly DETECTION_THRESHOLD = 3;
  private disableQueryParam: string;
  private isDisabledByQuery: boolean = false;
  private visibilityChangeHandler: (() => void) | null = null;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  constructor(options: DevtoolsDetectorOptions = {}) {
    this.checkInterval = options.checkInterval || 1000;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.maxCheckCount = options.maxCheckCount || Infinity;
    this.disableQueryParam = options.disableQueryParam || 'mbFE';
    
    this.isDisabledByQuery = checkDisableQuery(this.disableQueryParam);
    
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
        
        if (this.maxCheckCount !== Infinity) {
          this.checkCount++;
          if (this.checkCount >= this.maxCheckCount) {
            console.log(`已达到最大检测次数 ${this.maxCheckCount}，停止检测`);
            this.stop();
            return;
          }
        }
        
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

  private check(): void {
    const isCurrentlyOpen = detectDevtools();

    if (isCurrentlyOpen) {
      this.openDetectionCount++;
      this.closeDetectionCount = 0;
      
      if (this.openDetectionCount >= this.DETECTION_THRESHOLD && !this.isOpen) {
        this.isOpen = true;
        console.log(`连续检测到打开 ${this.openDetectionCount} 次，确认开发者工具已打开`);
        this.onOpen?.();
      }
    } else {
      this.closeDetectionCount++;
      this.openDetectionCount = 0;
      
      if (this.closeDetectionCount >= this.DETECTION_THRESHOLD && this.isOpen) {
        this.isOpen = false;
        console.log(`连续检测到关闭 ${this.closeDetectionCount} 次，确认开发者工具已关闭`);
        this.onClose?.();
      }
    }
  }

  getStatus(): boolean {
    return this.isOpen;
  }
}
