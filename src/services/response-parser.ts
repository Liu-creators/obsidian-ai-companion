/**
 * 响应解析器
 * 
 * 负责解析 AI 响应内容，保留 Markdown 格式并正确转义特殊字符。
 * 
 * **验证需求：9.1, 9.4**
 */

/**
 * 响应解析器类
 * 
 * 提供 AI 响应内容的解析和格式化功能。
 */
export class ResponseParser {
	/**
	 * 解析 AI 响应
	 * 
	 * 处理响应内容，保留 Markdown 格式。
	 * 
	 * **验证需求：9.1**
	 * 
	 * @param content AI 返回的原始内容
	 * @returns 解析后的内容
	 */
	parse(content: string): string {
		if (!content) {
			return '';
		}
		
		// 移除首尾空白
		let parsed = content.trim();
		
		// 保留 Markdown 格式，不做额外处理
		// AI 返回的内容通常已经是格式化的 Markdown
		
		return parsed;
	}
	
	/**
	 * 转义 Markdown 特殊字符
	 * 
	 * 在需要将文本作为普通文本显示时使用，避免被解析为 Markdown。
	 * 
	 * **验证需求：9.4**
	 * 
	 * @param text 要转义的文本
	 * @returns 转义后的文本
	 */
	static escapeMarkdown(text: string): string {
		if (!text) {
			return '';
		}
		
		// Markdown 特殊字符列表
		const specialChars = [
			'\\',  // 反斜杠（必须首先转义）
			'`',   // 反引号
			'*',   // 星号
			'_',   // 下划线
			'{',   // 左花括号
			'}',   // 右花括号
			'[',   // 左方括号
			']',   // 右方括号
			'(',   // 左圆括号
			')',   // 右圆括号
			'#',   // 井号
			'+',   // 加号
			'-',   // 减号
			'.',   // 点号（在数字后）
			'!',   // 感叹号
			'|'    // 竖线
		];
		
		let escaped = text;
		
		// 转义每个特殊字符
		for (const char of specialChars) {
			escaped = escaped.replace(
				new RegExp('\\' + char, 'g'),
				'\\' + char
			);
		}
		
		return escaped;
	}
	
	/**
	 * 检测内容是否包含 Markdown 格式
	 * 
	 * @param content 要检测的内容
	 * @returns 如果包含 Markdown 格式返回 true
	 */
	static hasMarkdownFormatting(content: string): boolean {
		if (!content) {
			return false;
		}
		
		// 检测常见的 Markdown 模式
		const markdownPatterns = [
			/^#{1,6}\s/m,           // 标题
			/\*\*[^*]+\*\*/,        // 粗体
			/\*[^*]+\*/,            // 斜体
			/__[^_]+__/,            // 粗体（下划线）
			/_[^_]+_/,              // 斜体（下划线）
			/`[^`]+`/,              // 内联代码
			/```[\s\S]*?```/,       // 代码块
			/^\s*[-*+]\s/m,         // 无序列表
			/^\s*\d+\.\s/m,         // 有序列表
			/\[([^\]]+)\]\(([^)]+)\)/, // 链接
			/!\[([^\]]*)\]\(([^)]+)\)/, // 图片
			/^\s*>\s/m,             // 引用
			/^\s*---\s*$/m,         // 分隔线
			/\|.*\|/                // 表格
		];
		
		return markdownPatterns.some(pattern => pattern.test(content));
	}
	
	/**
	 * 提取代码块
	 * 
	 * 从内容中提取所有代码块。
	 * 
	 * @param content 内容文本
	 * @returns 代码块数组
	 */
	static extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
		const codeBlocks: Array<{ language: string; code: string }> = [];
		
		// 匹配代码块：```language\ncode\n```
		const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
		let match;
		
		while ((match = codeBlockRegex.exec(content)) !== null) {
			if (match[2]) {
				codeBlocks.push({
					language: match[1] || 'text',
					code: match[2].trim()
				});
			}
		}
		
		return codeBlocks;
	}
	
	/**
	 * 提取链接
	 * 
	 * 从内容中提取所有 Markdown 链接。
	 * 
	 * @param content 内容文本
	 * @returns 链接数组
	 */
	static extractLinks(content: string): Array<{ text: string; url: string }> {
		const links: Array<{ text: string; url: string }> = [];
		
		// 匹配链接：[text](url)
		const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
		let match;
		
		while ((match = linkRegex.exec(content)) !== null) {
			if (match[1] && match[2]) {
				links.push({
					text: match[1],
					url: match[2]
				});
			}
		}
		
		return links;
	}
	
	/**
	 * 清理内容
	 * 
	 * 移除多余的空白和格式问题。
	 * 
	 * @param content 内容文本
	 * @returns 清理后的内容
	 */
	static cleanContent(content: string): string {
		if (!content) {
			return '';
		}
		
		let cleaned = content;
		
		// 移除首尾空白
		cleaned = cleaned.trim();
		
		// 规范化换行符（统一为 \n）
		cleaned = cleaned.replace(/\r\n/g, '\n');
		cleaned = cleaned.replace(/\r/g, '\n');
		
		// 移除多余的空行（最多保留两个连续换行）
		cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
		
		// 移除行尾空白
		cleaned = cleaned.replace(/[ \t]+$/gm, '');
		
		return cleaned;
	}
	
	/**
	 * 截断内容
	 * 
	 * 如果内容超过指定长度，进行截断并添加省略号。
	 * 
	 * @param content 内容文本
	 * @param maxLength 最大长度
	 * @param ellipsis 省略号文本（默认 '...'）
	 * @returns 截断后的内容
	 */
	static truncate(content: string, maxLength: number, ellipsis: string = '...'): string {
		if (!content || content.length <= maxLength) {
			return content;
		}
		
		// 在单词边界处截断
		const truncated = content.substring(0, maxLength);
		const lastSpace = truncated.lastIndexOf(' ');
		
		if (lastSpace > 0) {
			return truncated.substring(0, lastSpace) + ellipsis;
		}
		
		return truncated + ellipsis;
	}
	
	/**
	 * 格式化为可折叠块
	 * 
	 * 将内容包装在 HTML details/summary 标签中。
	 * 
	 * @param content 内容文本
	 * @param title 标题（默认 'AI Response'）
	 * @param open 是否默认展开（默认 true）
	 * @returns 格式化后的 HTML
	 */
	static formatAsCollapsible(
		content: string, 
		title: string = 'AI Response', 
		open: boolean = true
	): string {
		const openAttr = open ? ' open' : '';
		
		return `<details${openAttr}>
<summary>${title}</summary>

${content}

</details>`;
	}
}
