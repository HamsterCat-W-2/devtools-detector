# devtools-detector

一个用于检测浏览器开发者工具是否打开的 JavaScript 库。

## 功能特性

- 🔍 多种检测方法组合，提高准确性
- ⚡ 轻量级，无依赖
- 🎯 支持 TypeScript
- 🔧 可配置的检测间隔和回调函数
- 📦 模块化设计，代码结构清晰
- 🌐 支持 ES Module、CommonJS 和 UMD 格式

## 安装

```bash
npm install devtools-detector
```

## 使用方法

### ES Module

```javascript
import DevtoolsDetector from "devtools-detector";

const detector = new DevtoolsDetector({
  checkInterval: 1000,
  onOpen: () => {
    console.log("开发者工具已打开！");
  },
  onClose: () => {
    console.log("开发者工具已关闭！");
  },
});

detector.start();
```

### CommonJS

```javascript
const DevtoolsDetector = require("devtools-detector");

const detector = new DevtoolsDetector({
  checkInterval: 1000,
  onOpen: () => {
    console.log("开发者工具已打开！");
  },
});

detector.start();
```

### UMD (浏览器)

```html
<script src="path/to/devtools-detector/dist/index.umd.js"></script>
<script>
  const detector = new DevtoolsDetector.default({
    checkInterval: 1000,
    onOpen: () => {
      console.log("开发者工具已打开！");
    },
  });

  detector.start();
</script>
```

### 配置选项

```typescript
interface DevtoolsDetectorOptions {
  checkInterval?: number; // 检测间隔（毫秒），默认 1000
  onOpen?: () => void; // 开发者工具打开时的回调
  onClose?: () => void; // 开发者工具关闭时的回调
  maxCheckCount?: number; // 最大检测次数，默认无限制（Infinity）
  disableQueryParam?: string; // URL 参数名，如果存在且为 true 则禁用检测，默认 'mbFE'
}
```

### 禁用检测

如果需要在开发或调试时禁用检测，可以在 URL 中添加参数：

```
https://your-site.com?mbFE=true
```

或者自定义参数名：

```javascript
const detector = new DevtoolsDetector({
  disableQueryParam: "debug", // 使用 ?debug=true 来禁用
});
```

### API

- `start()` - 开始检测
- `stop()` - 停止检测
- `getStatus()` - 获取当前开发者工具状态（true/false）

## 项目结构

```
src/
├── types.ts                      # TypeScript 类型定义
├── index.ts                      # 入口文件，统一导出
├── core/
│   └── detector.ts              # 核心检测器类（状态管理、调度）
├── detectors/
│   ├── index.ts                 # 检测器统一导出
│   ├── debugger-detector.ts     # debugger 语句检测
│   ├── eruda-detector.ts        # Eruda/vConsole 检测
│   └── console-detector.ts      # console 时间差检测
└── utils/
    ├── time.ts                  # 时间测量工具
    ├── console-cache.ts         # console 方法缓存
    └── query-params.ts          # URL 参数处理
```

## 检测原理

该库使用多种方法来检测开发者工具：

1. **Debugger 检测** (`debugger-detector.ts`) - 利用 debugger 语句的执行时间差异
2. **Console 时间差检测** (`console-detector.ts`) - 对比 console.log 和 console.table 的执行时间差异
3. **Eruda/vConsole 检测** (`eruda-detector.ts`) - 检测移动端调试工具

检测机制：需要连续检测到 3 次相同状态才会触发状态变化，避免误判。

## 高级用法

### 按需导入检测器

```javascript
import {
  detectDevtools,
  checkDebugger,
  checkEruda,
  checkConsoleTimeDiff,
} from "devtools-detector";

// 使用单个检测方法
const isOpen = checkDebugger();

// 使用组合检测
const isDevtoolsOpen = detectDevtools();
```

### 自定义检测逻辑

```javascript
import { DevtoolsDetector } from "devtools-detector";
import { checkDebugger, checkConsoleTimeDiff } from "devtools-detector";

// 可以基于导出的检测方法实现自定义逻辑
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建生产版本
npm run build
```

构建产物：

- `dist/index.js` - CommonJS 格式
- `dist/index.esm.js` - ES Module 格式
- `dist/index.umd.js` - UMD 格式（浏览器直接使用）
- `dist/index.d.ts` - TypeScript 类型声明

## 示例

### 本地调试

1. 克隆项目并安装依赖：

```bash
git clone <repository-url>
cd devtools-detector
npm install
```

2. 构建项目：

```bash
npm run build
```

3. 运行示例：

```bash
# 使用 Python 启动本地服务器
python -m http.server 8000

# 或使用 Node.js (需要先安装 http-server)
npx http-server -p 8000
```

4. 在浏览器中打开：

```
http://localhost:8000/example/
```

5. 打开/关闭浏览器开发者工具（F12）来测试检测功能

### 开发模式

如果需要修改代码并实时查看效果：

```bash
# 终端 1: 监听文件变化并自动构建
npm run dev

# 终端 2: 启动本地服务器
npx http-server -p 8000
```

修改 `src/` 目录下的代码后，刷新浏览器即可看到效果。

查看 `example/index.html` 文件获取完整示例代码。

## 注意事项

- 检测方法可能不是 100% 准确，某些浏览器或扩展可能影响检测结果
- 该库主要用于学习和研究目的

## License

MIT
