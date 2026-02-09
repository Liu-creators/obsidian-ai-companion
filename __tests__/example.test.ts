/**
 * 示例测试文件
 * 用于验证测试框架配置是否正确
 */

import { describe, test, expect } from '@jest/globals';
import {
  createTestPlugin,
  createTestEditor,
  createTestFile,
  createTestApp,
  createPosition,
  randomString,
  TestDataGenerator,
  Assertions,
} from './test-utils';

describe('测试框架配置验证', () => {
  test('Jest 应该正常工作', () => {
    expect(true).toBe(true);
  });

  test('应该能够创建测试用的 Plugin', () => {
    const plugin = createTestPlugin();
    expect(plugin).toBeDefined();
    expect(plugin.manifest.id).toBe('test-plugin');
  });

  test('应该能够创建测试用的 Editor', () => {
    const editor = createTestEditor('# Test\n\nContent');
    expect(editor).toBeDefined();
    expect(editor.getValue()).toBe('# Test\n\nContent');
  });

  test('应该能够创建测试用的 TFile', () => {
    const file = createTestFile('test.md');
    expect(file).toBeDefined();
    expect(file.path).toBe('test.md');
    expect(file.extension).toBe('md');
  });

  test('应该能够创建测试用的 App', () => {
    const app = createTestApp();
    expect(app).toBeDefined();
    expect(app.workspace).toBeDefined();
    expect(app.vault).toBeDefined();
  });

  test('应该能够创建 EditorPosition', () => {
    const pos = createPosition(5, 10);
    expect(pos.line).toBe(5);
    expect(pos.ch).toBe(10);
  });

  test('应该能够生成随机字符串', () => {
    const str = randomString(20);
    expect(str).toHaveLength(20);
  });

  test('应该能够生成测试用的 Markdown', () => {
    const markdown = TestDataGenerator.markdown({
      headings: 2,
      paragraphs: 3,
    });
    expect(markdown).toContain('# Heading 1');
    expect(markdown).toContain('## Heading 2');
  });

  test('断言辅助函数应该正常工作', () => {
    Assertions.stringContains('hello world', 'world');
    Assertions.arrayLength([1, 2, 3], 3);
    Assertions.objectHasProperty({ name: 'test' }, 'name');
  });
});

describe('fast-check 属性测试验证', () => {
  // 导入 fast-check
  const fc = require('fast-check');

  test('属性测试：字符串连接应该保持长度', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (str1: string, str2: string) => {
          const result = str1 + str2;
          expect(result.length).toBe(str1.length + str2.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('属性测试：数组反转两次应该回到原状态', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        (arr: number[]) => {
          const reversed = [...arr].reverse().reverse();
          expect(reversed).toEqual(arr);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('属性测试：加法交换律', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (a: number, b: number) => {
          expect(a + b).toBe(b + a);
        }
      ),
      { numRuns: 100 }
    );
  });
});
