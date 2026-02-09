/**
 * 测试工具函数
 * 提供常用的测试辅助函数和工具
 */

import {
  App,
  Editor,
  EditorPosition,
  TFile,
  Plugin,
  PluginManifest,
  createMockApp,
  createMockEditor,
  createMockTFile,
} from '../__mocks__/obsidian';

/**
 * 创建测试用的 Plugin 实例
 */
export function createTestPlugin(manifest?: Partial<PluginManifest>): Plugin {
  const defaultManifest: PluginManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    minAppVersion: '0.15.0',
    description: 'Test plugin for unit tests',
    author: 'Test Author',
    ...manifest,
  };

  const app = createMockApp();
  return new Plugin(app, defaultManifest);
}

/**
 * 创建测试用的 Editor 实例，带有预设内容
 */
export function createTestEditor(content: string = ''): Editor {
  return createMockEditor(content);
}

/**
 * 创建测试用的 TFile 实例
 */
export function createTestFile(path: string = 'test.md'): TFile {
  return createMockTFile(path);
}

/**
 * 创建测试用的 App 实例
 */
export function createTestApp(): App {
  return createMockApp();
}

/**
 * 创建测试用的 EditorPosition
 */
export function createPosition(line: number, ch: number): EditorPosition {
  return { line, ch };
}

/**
 * 等待指定的毫秒数
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 等待条件满足（最多等待指定时间）
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout: condition not met');
    }
    await wait(interval);
  }
}

/**
 * 模拟键盘事件
 */
export function createKeyboardEvent(
  key: string,
  options: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

/**
 * 模拟鼠标事件
 */
export function createMouseEvent(
  type: string = 'click',
  options: Partial<MouseEventInit> = {}
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

/**
 * 创建 DOM 元素用于测试
 */
export function createTestElement(tag: string = 'div'): HTMLElement {
  return document.createElement(tag);
}

/**
 * 清理 DOM 元素
 */
export function cleanupElement(element: HTMLElement): void {
  element.remove();
}

/**
 * 模拟异步操作失败
 */
export function createRejectedPromise<T = never>(error: Error): Promise<T> {
  return Promise.reject(error);
}

/**
 * 模拟异步操作成功
 */
export function createResolvedPromise<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机数字
 */
export function randomNumber(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机布尔值
 */
export function randomBoolean(): boolean {
  return Math.random() < 0.5;
}

/**
 * 模拟网络延迟
 */
export async function simulateNetworkDelay(ms: number = 100): Promise<void> {
  await wait(ms);
}

/**
 * 捕获 console 输出
 */
export class ConsoleCapture {
  private originalLog: typeof console.log;
  private originalError: typeof console.error;
  private originalWarn: typeof console.warn;
  
  public logs: string[] = [];
  public errors: string[] = [];
  public warnings: string[] = [];

  constructor() {
    this.originalLog = console.log;
    this.originalError = console.error;
    this.originalWarn = console.warn;
  }

  start(): void {
    this.logs = [];
    this.errors = [];
    this.warnings = [];

    console.log = (...args: any[]) => {
      this.logs.push(args.map(String).join(' '));
    };

    console.error = (...args: any[]) => {
      this.errors.push(args.map(String).join(' '));
    };

    console.warn = (...args: any[]) => {
      this.warnings.push(args.map(String).join(' '));
    };
  }

  stop(): void {
    console.log = this.originalLog;
    console.error = this.originalError;
    console.warn = this.originalWarn;
  }

  clear(): void {
    this.logs = [];
    this.errors = [];
    this.warnings = [];
  }
}

/**
 * 创建 mock 函数并跟踪调用
 */
export function createMockFunction<T extends (...args: any[]) => any>(): jest.Mock<
  ReturnType<T>,
  Parameters<T>
> {
  return jest.fn();
}

/**
 * 验证 mock 函数被调用
 */
export function expectCalled(mockFn: jest.Mock, times?: number): void {
  if (times !== undefined) {
    expect(mockFn).toHaveBeenCalledTimes(times);
  } else {
    expect(mockFn).toHaveBeenCalled();
  }
}

/**
 * 验证 mock 函数未被调用
 */
export function expectNotCalled(mockFn: jest.Mock): void {
  expect(mockFn).not.toHaveBeenCalled();
}

/**
 * 验证 mock 函数被调用时的参数
 */
export function expectCalledWith(mockFn: jest.Mock, ...args: any[]): void {
  expect(mockFn).toHaveBeenCalledWith(...args);
}

/**
 * 重置所有 mock
 */
export function resetAllMocks(): void {
  jest.clearAllMocks();
  jest.resetAllMocks();
}

/**
 * 测试数据生成器
 */
export const TestDataGenerator = {
  /**
   * 生成测试用的 Markdown 内容
   */
  markdown: (options: {
    headings?: number;
    paragraphs?: number;
    lists?: number;
    codeBlocks?: number;
  } = {}): string => {
    const {
      headings = 2,
      paragraphs = 3,
      lists = 1,
      codeBlocks = 1,
    } = options;

    let content = '';

    // 添加标题
    for (let i = 0; i < headings; i++) {
      content += `${'#'.repeat(i + 1)} Heading ${i + 1}\n\n`;
    }

    // 添加段落
    for (let i = 0; i < paragraphs; i++) {
      content += `This is paragraph ${i + 1}. ${randomString(50)}\n\n`;
    }

    // 添加列表
    for (let i = 0; i < lists; i++) {
      content += `- List item 1\n- List item 2\n- List item 3\n\n`;
    }

    // 添加代码块
    for (let i = 0; i < codeBlocks; i++) {
      content += '```typescript\n';
      content += `function test${i}() {\n`;
      content += `  return ${i};\n`;
      content += '}\n';
      content += '```\n\n';
    }

    return content.trim();
  },

  /**
   * 生成测试用的 API 响应
   */
  apiResponse: (content: string = 'Test response'): any => {
    return {
      id: randomString(16),
      content,
      model: 'gpt-3.5-turbo',
      timestamp: Date.now(),
      tokensUsed: randomNumber(10, 100),
    };
  },

  /**
   * 生成测试用的错误
   */
  error: (type: string = 'unknown', message: string = 'Test error'): any => {
    return {
      type,
      message,
      details: `Details for ${message}`,
      retryable: type === 'network' || type === 'timeout',
    };
  },
};

/**
 * 断言辅助函数
 */
export const Assertions = {
  /**
   * 断言字符串包含子串
   */
  stringContains: (str: string, substring: string): void => {
    expect(str).toContain(substring);
  },

  /**
   * 断言字符串匹配正则表达式
   */
  stringMatches: (str: string, pattern: RegExp): void => {
    expect(str).toMatch(pattern);
  },

  /**
   * 断言数组包含元素
   */
  arrayContains: <T>(arr: T[], element: T): void => {
    expect(arr).toContain(element);
  },

  /**
   * 断言数组长度
   */
  arrayLength: <T>(arr: T[], length: number): void => {
    expect(arr).toHaveLength(length);
  },

  /**
   * 断言对象有属性
   */
  objectHasProperty: (obj: any, property: string): void => {
    expect(obj).toHaveProperty(property);
  },

  /**
   * 断言函数抛出错误
   */
  throws: (fn: () => void, errorMessage?: string): void => {
    if (errorMessage) {
      expect(fn).toThrow(errorMessage);
    } else {
      expect(fn).toThrow();
    }
  },

  /**
   * 断言异步函数抛出错误
   */
  asyncThrows: async (fn: () => Promise<void>, errorMessage?: string): Promise<void> => {
    if (errorMessage) {
      await expect(fn()).rejects.toThrow(errorMessage);
    } else {
      await expect(fn()).rejects.toThrow();
    }
  },
};
