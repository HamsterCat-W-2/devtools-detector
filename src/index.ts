export { DevtoolsDetector } from './core/detector';
export type { DevtoolsDetectorOptions, DetectionResults } from './types';
export { detectDevtools, checkDebugger, checkEruda, checkConsoleTimeDiff } from './detectors';
export { disableContextMenu, disableKeyboardShortcuts, disableAllDevtoolsAccess } from './utils/disable-devtools';

import { DevtoolsDetector } from './core/detector';
export default DevtoolsDetector;
