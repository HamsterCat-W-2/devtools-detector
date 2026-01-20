# devtools-detector

一个用于检测浏览器开发者工具是否打开的 JavaScript 库。

## 功能特性

- 🔍 多种检测方法组合，提高准确性
- ⚡ 轻量级，无依赖
- 🎯 支持 TypeScript
- 🔧 可配置的检测间隔和回调函数

## 安装

```bash
npm install devtools-detector
```

## 使用方法

### 基础使用

```javascript
import DevtoolsDetector from "devtools-detector";

const detector = new DevtoolsDetector({
  checkInterval: 500,
  onOpen: () => {
    console.log("开发者工具已打开！");
  },
  onClose: () => {
    console.log("开发者工具已关闭！");
  },
});

detector.start();
```

### 配置选项

```typescript
interface DevtoolsDetectorOptions {
  checkInterval?: number; // 检测间隔（毫秒），默认 500
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

```typescript
interface DevtoolsDetectorOptions {
  checkInterval?: number; // 检测间隔（毫秒），默认 500
  onOpen?: () => void; // 开发者工具打开时的回调
  onClose?: () => void; // 开发者工具关闭时的回调
  disableMenu?: boolean; // 是否禁用右键菜单和快捷键，默认 false
}
```

### API

- `start()` - 开始检测
- `stop()` - 停止检测
- `getStatus()` - 获取当前开发者工具状态（true/false）

## 检测原理

该库使用多种方法来检测开发者工具：

1. **Debugger 检测** - 利用 debugger 语句的执行时间差异（可能被禁用）
2. **Console 时间差检测** - 对比 console.log 和 console.table 的执行时间差异
3. **Eruda/vConsole 检测** - 检测移动端调试工具（Eruda 和 vConsole）

检测机制：需要连续检测到 3 次相同状态才会触发状态变化，避免误判。

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 示例

查看 `example/index.html` 文件获取完整示例。

## 注意事项

- 检测方法可能不是 100% 准确，某些浏览器或扩展可能影响检测结果
- 该库主要用于学习和研究目的

## License

MIT
