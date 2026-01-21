export interface DevtoolsDetectorOptions {
  checkInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  maxCheckCount?: number;
  disableQueryParam?: string;
}

export interface DetectionResults {
  debugger: boolean;
  eruda: boolean;
  consoleTimeDiff: boolean;
}
