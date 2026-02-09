/**
 * 上下文提取器
 * 
 * 负责从编辑器中提取上下文内容，支持多种提取范围和长度限制。
 * 
 * **验证需求：7.1, 7.3, 7.4**
 */

import { Editor, EditorPosition } from 'obsidian';
import { ContextScope, ContextExtractionConfig, ExtractedContext } from '../types';

/**
 * 上下文提取器类
 * 
 * 根据配置从编辑器中提取不同范围的上下文内容。
 */
export class ContextExtractor {
	private config: ContextExtractionConfig;
	
	constructor(config: ContextExtractionConfig) {
		this.config = config;
	}
	
	/**
	 * 从编辑器中提取上下文
	 * 
	 * 根据配置的范围和选中文本提取上下文内容。
	 * 
	 * **验证需求：7.1, 7.3**
	 * 
	 * @param editor 编辑器实例
	 * @param position 当前光标位置
	 * @returns 提取的上下文
	 */
	extract(editor: Editor, position: EditorPosition): ExtractedContext {
		let content = '';
		let source = '';
		
		// 如果配置要求包含选中文本，优先使用选中文本
		if (this.config.includeSelection) {
			const selection = editor.getSelection();
			if (selection && selection.trim().length > 0) {
				content = selection;
				source = '选中文本';
				return this.limitLength(content, source);
			}
		}
		
		// 根据配置的范围提取上下文
		switch (this.config.scope) {
			case 'paragraph':
				content = this.extractParagraph(editor, position);
				source = '当前段落';
				break;
			
			case 'section':
				content = this.extractSection(editor, position);
				source = '当前章节';
				break;
			
			case 'document':
				content = this.extractDocument(editor);
				source = '整个文档';
				break;
			
			case 'selection':
				// 如果范围是 selection 但没有选中文本，返回空上下文
				content = editor.getSelection() || '';
				source = '选中文本';
				break;
			
			default:
				content = '';
				source = '无';
		}
		
		return this.limitLength(content, source);
	}
	
	/**
	 * 提取当前段落
	 * 
	 * 段落定义：由空行分隔的文本块
	 * 
	 * @param editor 编辑器实例
	 * @param position 当前光标位置
	 * @returns 段落内容
	 */
	private extractParagraph(editor: Editor, position: EditorPosition): string {
		const currentLine = position.line;
		const totalLines = editor.lineCount();
		
		// 向上查找段落开始（遇到空行或文档开始）
		let startLine = currentLine;
		while (startLine > 0) {
			const line = editor.getLine(startLine - 1);
			if (line.trim().length === 0) {
				break;
			}
			startLine--;
		}
		
		// 向下查找段落结束（遇到空行或文档结束）
		let endLine = currentLine;
		while (endLine < totalLines - 1) {
			const line = editor.getLine(endLine + 1);
			if (line.trim().length === 0) {
				break;
			}
			endLine++;
		}
		
		// 提取段落内容
		const lines: string[] = [];
		for (let i = startLine; i <= endLine; i++) {
			lines.push(editor.getLine(i));
		}
		
		return lines.join('\n');
	}
	
	/**
	 * 提取当前章节
	 * 
	 * 章节定义：由 Markdown 标题分隔的内容块
	 * 
	 * @param editor 编辑器实例
	 * @param position 当前光标位置
	 * @returns 章节内容
	 */
	private extractSection(editor: Editor, position: EditorPosition): string {
		const currentLine = position.line;
		const totalLines = editor.lineCount();
		
		// 查找当前章节的标题级别
		let currentHeadingLevel = 0;
		let startLine = 0;
		
		// 向上查找章节开始（遇到同级或更高级标题）
		for (let i = currentLine; i >= 0; i--) {
			const line = editor.getLine(i);
			const headingMatch = line.match(/^(#{1,6})\s/);
			
			if (headingMatch && headingMatch[1]) {
				const level = headingMatch[1].length;
				
				if (i === currentLine || currentHeadingLevel === 0) {
					// 这是当前行或第一个遇到的标题
					currentHeadingLevel = level;
					startLine = i;
				} else if (level <= currentHeadingLevel) {
					// 遇到同级或更高级标题，停止
					break;
				} else {
					// 更低级的标题，继续向上查找
					startLine = i;
				}
			}
		}
		
		// 向下查找章节结束（遇到同级或更高级标题）
		let endLine = totalLines - 1;
		for (let i = currentLine + 1; i < totalLines; i++) {
			const line = editor.getLine(i);
			const headingMatch = line.match(/^(#{1,6})\s/);
			
			if (headingMatch && headingMatch[1]) {
				const level = headingMatch[1].length;
				
				if (currentHeadingLevel > 0 && level <= currentHeadingLevel) {
					// 遇到同级或更高级标题，停止
					endLine = i - 1;
					break;
				}
			}
		}
		
		// 提取章节内容
		const lines: string[] = [];
		for (let i = startLine; i <= endLine; i++) {
			lines.push(editor.getLine(i));
		}
		
		return lines.join('\n');
	}
	
	/**
	 * 提取整个文档
	 * 
	 * @param editor 编辑器实例
	 * @returns 文档内容
	 */
	private extractDocument(editor: Editor): string {
		return editor.getValue();
	}
	
	/**
	 * 限制上下文长度
	 * 
	 * 如果内容超过最大长度，进行截断。
	 * 
	 * **验证需求：7.4**
	 * 
	 * @param content 原始内容
	 * @param source 来源描述
	 * @returns 处理后的上下文
	 */
	private limitLength(content: string, source: string): ExtractedContext {
		const originalLength = content.length;
		let truncated = false;
		
		// 如果内容超过最大长度，进行截断
		if (originalLength > this.config.maxLength) {
			content = content.substring(0, this.config.maxLength);
			truncated = true;
		}
		
		return {
			content,
			source,
			truncated,
			originalLength
		};
	}
	
	/**
	 * 更新配置
	 * 
	 * @param config 新的配置
	 */
	updateConfig(config: Partial<ContextExtractionConfig>): void {
		this.config = { ...this.config, ...config };
	}
	
	/**
	 * 获取当前配置
	 * 
	 * @returns 当前配置
	 */
	getConfig(): ContextExtractionConfig {
		return { ...this.config };
	}
}
