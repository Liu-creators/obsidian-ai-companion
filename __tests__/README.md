# 测试框架使用指南

本项目使用 **Jest** 作为单元测试框架，**fast-check** 作为属性测试库。

## 目录结构

```
__tests__/
  ├── setup.ts           # Jest 测试设置文件
  ├── test-utils.ts      # 测试工具函数
  ├── example.test.ts    # 示例测试文件
  └── README.md          # 本文件

__mocks__/
  └── obsidian.ts        # Obsidian API mock 对象
```

## 运行测试

### 运行所有测试
```bash
npm test
```

### 监听模式（开发时使用）
```bash
npm run test:watch
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

### 详细输出模式
```bash
npm run test:verbose
```

## 编写测试

### 单元测试示例

```typescript
import { describe, test, expect } from '@jest/globals';
import { createTestEditor, createPosition } from '../test-utils';

describe('MyComponent', () => {
  test('应该正确处理输入', () => {
    const editor = createTestEditor('test content');
    const pos = createPosition(0, 0);
    
    // 你的测试逻辑
    expect(editor.getValue()).toBe('test content');
  });
});
```

### 属性测试示例

```typescript
import fc from 'fast-check';

describe('正确性属性', () => {
  test('属性 1：任何字符串都应该被正确处理', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (input) => {
          const result = processString(input);
          expect(result).toBeDefined();
        }
      ),
      { numRuns: 100 } // 至少运行 100 次
    );
  });
});
```

## 测试工具函数

### 创建测试对象

- `createTestPlugin(manifest?)` - 创建测试用的 Plugin 实例
- `createTestEditor(content?)` - 创建测试用的 Editor 实例
- `createTestFile(path?)` - 创建测试用的 TFile 实例
- `createTestApp()` - 创建测试用的 App 实例
- `createPosition(line, ch)` - 创建 EditorPosition 对象

### 异步工具

- `wait(ms)` - 等待指定毫秒数
- `waitFor(condition, timeout?, interval?)` - 等待条件满足
- `simulateNetworkDelay(ms?)` - 模拟网络延迟

### 事件模拟

- `createKeyboardEvent(key, options?)` - 创建键盘事件
- `createMouseEvent(type?, options?)` - 创建鼠标事件

### 随机数据生成

- `randomString(length?)` - 生成随机字符串
- `randomNumber(min?, max?)` - 生成随机数字
- `randomBoolean()` - 生成随机布尔值

### 测试数据生成器

```typescript
import { TestDataGenerator } from '../test-utils';

// 生成 Markdown 内容
const markdown = TestDataGenerator.markdown({
  headings: 2,
  paragraphs: 3,
  lists: 1,
  codeBlocks: 1,
});

// 生成 API 响应
const response = TestDataGenerator.apiResponse('AI response content');

// 生成错误对象
const error = TestDataGenerator.error('network', 'Connection failed');
```

### Console 捕获

```typescript
import { ConsoleCapture } from '../test-utils';

test('应该记录错误到控制台', () => {
  const capture = new ConsoleCapture();
  capture.start();
  
  // 执行会输出到 console 的代码
  console.error('Test error');
  
  capture.stop();
  
  expect(capture.errors).toContain('Test error');
});
```

### 断言辅助函数

```typescript
import { Assertions } from '../test-utils';

Assertions.stringContains(str, substring);
Assertions.stringMatches(str, pattern);
Assertions.arrayContains(arr, element);
Assertions.arrayLength(arr, length);
Assertions.objectHasProperty(obj, property);
Assertions.throws(fn, errorMessage?);
await Assertions.asyncThrows(asyncFn, errorMessage?);
```

## Mock 对象

### Obsidian API Mock

所有 Obsidian API 都已在 `__mocks__/obsidian.ts` 中 mock：

```typescript
import {
  Plugin,
  Editor,
  Notice,
  Setting,
  createMockApp,
  createMockEditor,
  createMockTFile,
} from '../__mocks__/obsidian';

// 使用 mock 对象
const app = createMockApp();
const editor = createMockEditor('content');
const file = createMockTFile('test.md');
```

### 创建自定义 Mock

```typescript
import { createMockFunction } from '../test-utils';

const mockFn = createMockFunction<(x: number) => number>();
mockFn.mockReturnValue(42);

expect(mockFn(10)).toBe(42);
```

## 测试覆盖率

项目目标覆盖率：**80%**

覆盖率报告会在运行 `npm run test:coverage` 后生成在 `coverage/` 目录中。

## 最佳实践

1. **测试文件命名**：使用 `.test.ts` 或 `.spec.ts` 后缀
2. **测试描述**：使用中文描述测试意图
3. **属性测试**：每个属性至少运行 100 次迭代
4. **Mock 清理**：在 `afterEach` 中清理 mock
5. **异步测试**：使用 `async/await` 而非回调
6. **测试隔离**：每个测试应该独立，不依赖其他测试

## 示例测试结构

```typescript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestPlugin, resetAllMocks } from '../test-utils';

describe('功能模块名称', () => {
  let plugin: Plugin;

  beforeEach(() => {
    // 每个测试前的设置
    plugin = createTestPlugin();
  });

  afterEach(() => {
    // 每个测试后的清理
    resetAllMocks();
  });

  describe('子功能 1', () => {
    test('应该正确处理正常情况', () => {
      // 测试逻辑
    });

    test('应该正确处理边缘情况', () => {
      // 测试逻辑
    });

    test('应该正确处理错误情况', () => {
      // 测试逻辑
    });
  });

  describe('子功能 2', () => {
    // 更多测试...
  });
});
```

## 调试测试

### 在 VS Code 中调试

1. 在测试文件中设置断点
2. 使用 VS Code 的 Jest 扩展运行测试
3. 或者在 `launch.json` 中配置 Jest 调试配置

### 使用 console.log

```typescript
test('调试测试', () => {
  const value = someFunction();
  console.log('Debug value:', value);
  expect(value).toBe(expected);
});
```

### 只运行特定测试

```typescript
// 只运行这个测试
test.only('这个测试会运行', () => {
  // ...
});

// 跳过这个测试
test.skip('这个测试会被跳过', () => {
  // ...
});
```

## 常见问题

### Q: 如何 mock Obsidian 的特定 API？

A: 在 `__mocks__/obsidian.ts` 中找到对应的接口或类，修改其实现。

### Q: 属性测试失败时如何调试？

A: fast-check 会提供失败的反例。使用该反例创建一个单独的单元测试来调试。

### Q: 如何测试异步代码？

A: 使用 `async/await`：

```typescript
test('异步测试', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Q: 如何测试定时器？

A: 使用 Jest 的定时器 mock：

```typescript
jest.useFakeTimers();
// 执行代码
jest.advanceTimersByTime(1000);
jest.useRealTimers();
```

## 参考资源

- [Jest 文档](https://jestjs.io/docs/getting-started)
- [fast-check 文档](https://fast-check.dev/)
- [Obsidian API 文档](https://docs.obsidian.md/Reference/TypeScript+API)
