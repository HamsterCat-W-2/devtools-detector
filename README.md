# devtools-detector

一个用于检测浏览器开发者工具是否打开的 JavaScript 库。

## 功能特性

- 🔍 多种检测方法组合，提高准确性
- ⚡ 轻量级，无依赖
- 🎯 支持 TypeScript
- 🔧 可配置的检测间隔和回调函数
- 🚫 可选的右键菜单和快捷键禁用功能

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
  disableMenu?: boolean; // 是否禁用右键菜单和快捷键，默认 false
}
```

### API

- `start()` - 开始检测
- `stop()` - 停止检测
- `getStatus()` - 获取当前开发者工具状态（true/false）

## 检测原理

该库使用多种方法来检测开发者工具：

1. **窗口尺寸检测** - 检测 `outerWidth/outerHeight` 与 `innerWidth/innerHeight` 的差异
2. **Debugger 检测** - 利用 debugger 语句的执行时间差异
3. **Console 检测** - 通过 console.log 对象属性访问检测

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
- `disableMenu` 选项会禁用右键菜单和常用的开发者工具快捷键，请谨慎使用
- 该库主要用于学习和研究目的

## License

MIT
