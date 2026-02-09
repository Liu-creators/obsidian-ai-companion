/**
 * 响应解析器测试
 * 
 * 测试响应解析器的格式化和转义功能
 */

import { describe, test, expect } from '@jest/globals';
import { ResponseParser } from '../../src/services/response-parser';

describe('ResponseParser', () => {
	let parser: ResponseParser;
	
	beforeEach(() => {
		parser = new ResponseParser();
	});
	
	describe('parse', () => {
		test('应该能够解析基本内容', () => {
			const content = 'This is a test response';
			const parsed = parser.parse(content);
			
			expect(parsed).toBe('This is a test response');
		});
		
		test('应该移除首尾空白', () => {
			const content = '  \n  Test content  \n  ';
			const parsed = parser.parse(content);
			
			expect(parsed).toBe('Test content');
		});
		
		test('应该保留 Markdown 格式', () => {
			const content = '# Heading\n\n**Bold** and *italic*';
			const parsed = parser.parse(content);
			
			expect(parsed).toContain('# Heading');
			expect(parsed).toContain('**Bold**');
			expect(parsed).toContain('*italic*');
		});
		
		test('应该处理空内容', () => {
			expect(parser.parse('')).toBe('');
			expect(parser.parse(null as any)).toBe('');
			expect(parser.parse(undefined as any)).toBe('');
		});
	});
	
	describe('escapeMarkdown', () => {
		test('应该转义星号', () => {
			const text = 'Text with * asterisk';
			const escaped = ResponseParser.escapeMarkdown(text);
			
			expect(escaped).toBe('Text with \\* asterisk');
		});
		
		test('应该转义下划线', () => {
			const text = 'Text with _ underscore';
			const escaped = ResponseParser.escapeMarkdown(text);
			
			expect(escaped).toBe('Text with \\_ underscore');
		});
		
		test('应该转义反引号', () => {
			const text = 'Text with ` backtick';
			const escaped = ResponseParser.escapeMarkdown(text);
			
			expect(escaped).toBe('Text with \\` backtick');
		});
		
		test('应该转义多个特殊字符', () => {
			const text = '**bold** and `code`';
			const escaped = ResponseParser.escapeMarkdown(text);
			
			expect(escaped).toBe('\\*\\*bold\\*\\* and \\`code\\`');
		});
		
		test('应该处理空文本', () => {
			expect(ResponseParser.escapeMarkdown('')).toBe('');
			expect(ResponseParser.escapeMarkdown(null as any)).toBe('');
		});
	});
	
	describe('hasMarkdownFormatting', () => {
		test('应该检测标题', () => {
			expect(ResponseParser.hasMarkdownFormatting('# Heading')).toBe(true);
			expect(ResponseParser.hasMarkdownFormatting('## Heading 2')).toBe(true);
		});
		
		test('应该检测粗体', () => {
			expect(ResponseParser.hasMarkdownFormatting('**bold**')).toBe(true);
			expect(ResponseParser.hasMarkdownFormatting('__bold__')).toBe(true);
		});
		
		test('应该检测斜体', () => {
			expect(ResponseParser.hasMarkdownFormatting('*italic*')).toBe(true);
			expect(ResponseParser.hasMarkdownFormatting('_italic_')).toBe(true);
		});
		
		test('应该检测代码', () => {
			expect(ResponseParser.hasMarkdownFormatting('`code`')).toBe(true);
			expect(ResponseParser.hasMarkdownFormatting('```\ncode block\n```')).toBe(true);
		});
		
		test('应该检测列表', () => {
			expect(ResponseParser.hasMarkdownFormatting('- item')).toBe(true);
			expect(ResponseParser.hasMarkdownFormatting('* item')).toBe(true);
			expect(ResponseParser.hasMarkdownFormatting('1. item')).toBe(true);
		});
		
		test('应该检测链接', () => {
			expect(ResponseParser.hasMarkdownFormatting('[text](url)')).toBe(true);
		});
		
		test('普通文本应该返回 false', () => {
			expect(ResponseParser.hasMarkdownFormatting('Plain text')).toBe(false);
		});
	});
	
	describe('extractCodeBlocks', () => {
		test('应该提取代码块', () => {
			const content = '```typescript\nconst x = 1;\n```';
			const blocks = ResponseParser.extractCodeBlocks(content);
			
			expect(blocks).toHaveLength(1);
			expect(blocks[0].language).toBe('typescript');
			expect(blocks[0].code).toBe('const x = 1;');
		});
		
		test('应该提取多个代码块', () => {
			const content = '```js\ncode1\n```\n\nText\n\n```python\ncode2\n```';
			const blocks = ResponseParser.extractCodeBlocks(content);
			
			expect(blocks).toHaveLength(2);
			expect(blocks[0].language).toBe('js');
			expect(blocks[1].language).toBe('python');
		});
		
		test('应该处理无语言标记的代码块', () => {
			const content = '```\ncode\n```';
			const blocks = ResponseParser.extractCodeBlocks(content);
			
			expect(blocks).toHaveLength(1);
			expect(blocks[0].language).toBe('text');
		});
	});
	
	describe('extractLinks', () => {
		test('应该提取链接', () => {
			const content = '[Google](https://google.com)';
			const links = ResponseParser.extractLinks(content);
			
			expect(links).toHaveLength(1);
			expect(links[0].text).toBe('Google');
			expect(links[0].url).toBe('https://google.com');
		});
		
		test('应该提取多个链接', () => {
			const content = '[Link1](url1) and [Link2](url2)';
			const links = ResponseParser.extractLinks(content);
			
			expect(links).toHaveLength(2);
		});
	});
	
	describe('cleanContent', () => {
		test('应该移除多余的空行', () => {
			const content = 'Line 1\n\n\n\nLine 2';
			const cleaned = ResponseParser.cleanContent(content);
			
			expect(cleaned).toBe('Line 1\n\nLine 2');
		});
		
		test('应该规范化换行符', () => {
			const content = 'Line 1\r\nLine 2\rLine 3';
			const cleaned = ResponseParser.cleanContent(content);
			
			expect(cleaned).toBe('Line 1\nLine 2\nLine 3');
		});
		
		test('应该移除行尾空白', () => {
			const content = 'Line 1   \nLine 2\t\n';
			const cleaned = ResponseParser.cleanContent(content);
			
			expect(cleaned).toBe('Line 1\nLine 2');
		});
	});
	
	describe('truncate', () => {
		test('应该截断长文本', () => {
			const content = 'This is a very long text that needs to be truncated';
			const truncated = ResponseParser.truncate(content, 20);
			
			expect(truncated.length).toBeLessThanOrEqual(23); // 20 + '...'
			expect(truncated).toContain('...');
		});
		
		test('短文本不应该被截断', () => {
			const content = 'Short text';
			const truncated = ResponseParser.truncate(content, 20);
			
			expect(truncated).toBe('Short text');
		});
		
		test('应该在单词边界处截断', () => {
			const content = 'This is a test';
			const truncated = ResponseParser.truncate(content, 10);
			
			// 应该在 'This is a' 处截断，而不是 'This is a '
			expect(truncated).toMatch(/^This is a\.\.\.$/);
		});
	});
	
	describe('formatAsCollapsible', () => {
		test('应该格式化为可折叠块', () => {
			const content = 'Test content';
			const formatted = ResponseParser.formatAsCollapsible(content);
			
			expect(formatted).toContain('<details');
			expect(formatted).toContain('<summary>');
			expect(formatted).toContain('Test content');
			expect(formatted).toContain('</details>');
		});
		
		test('应该支持自定义标题', () => {
			const content = 'Test content';
			const formatted = ResponseParser.formatAsCollapsible(content, 'Custom Title');
			
			expect(formatted).toContain('<summary>Custom Title</summary>');
		});
		
		test('应该支持默认展开', () => {
			const content = 'Test content';
			const formatted = ResponseParser.formatAsCollapsible(content, 'Title', true);
			
			expect(formatted).toContain('<details open>');
		});
		
		test('应该支持默认折叠', () => {
			const content = 'Test content';
			const formatted = ResponseParser.formatAsCollapsible(content, 'Title', false);
			
			expect(formatted).toContain('<details>');
			expect(formatted).not.toContain('open');
		});
	});
});
