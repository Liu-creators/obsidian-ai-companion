/**
 * 响应渲染器
 * 
 * 负责在编辑器中渲染 AI 响应，支持流式和非流式两种模式。
 * 
 * **验证需求：3.1**
 */

import { Editor, EditorPosition } from 'obsidian';
import { AIResponse } from '../types';
import type MyPlugin from '../main';

/**
 * 响应渲染器类
 * 
 * 提供流式和非流式两种渲染模式，统一管理响应内容的显示逻辑。
 */
export class ResponseRenderer {
	private plugin: MyPlugin;
	private streamedContentMap: Map<string, string>; // 存储每个请求的流式内容
	private lastLineCountMap: Map<string, number>; // 存储每个请求的上次行数
	private cursorHideStyleEl: HTMLStyleElement | null = null; // 光标隐藏样式元素
	
	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
		this.streamedContentMap = new Map();
		this.lastLineCountMap = new Map();
	}
	
	/**
	 * 隐藏编辑器光标
	 * 
	 * 在流式输出过程中隐藏光标，减少视觉干扰
	 */
	private hideCursor(): void {
		// 如果样式已存在，不重复添加
		if (this.cursorHideStyleEl) {
			return;
		}
		
		// 创建样式元素隐藏光标
		this.cursorHideStyleEl = document.createElement('style');
		this.cursorHideStyleEl.id = 'ai-plugin-hide-cursor';
		this.cursorHideStyleEl.textContent = `
			.cm-cursor, .cm-cursor-primary, .cm-cursor-secondary {
				display: none !important;
			}
		`;
		document.head.appendChild(this.cursorHideStyleEl);
		
		if (this.plugin.settings.debugMode) {
			console.log('[Response Renderer] 光标已隐藏');
		}
	}
	
	/**
	 * 显示编辑器光标
	 * 
	 * 在流式输出完成后恢复光标显示
	 */
	private showCursor(): void {
		if (this.cursorHideStyleEl) {
			this.cursorHideStyleEl.remove();
			this.cursorHideStyleEl = null;
			
			if (this.plugin.settings.debugMode) {
				console.log('[Response Renderer] 光标已恢复');
			}
		}
	}
	
	/**
	 * 初始化流式内容累积器
	 * 
	 * @param requestId 请求 ID
	 */
	initStreamContent(requestId: string): void {
		this.streamedContentMap.set(requestId, '');
		this.lastLineCountMap.set(requestId, 0);
		
		// 隐藏光标
		this.hideCursor();
	}
	
	/**
	 * 清理流式内容累积器
	 * 
	 * @param requestId 请求 ID
	 */
	clearStreamContent(requestId: string): void {
		this.streamedContentMap.delete(requestId);
		this.lastLineCountMap.delete(requestId);
	}
	
	/**
	 * 处理流式数据块（优化版 - 增量更新）
	 * 
	 * 实时更新编辑器中的 AI 响应内容，使用增量更新减少抖动
	 * 
	 * @param editor 编辑器实例
	 * @param position 插入位置（初始 callout 的起始位置）
	 * @param chunk 新的内容块
	 * @param requestId 请求 ID
	 */
	handleStreamChunk(
		editor: Editor,
		position: EditorPosition,
		chunk: string,
		requestId: string
	): void {
		// 累积内容
		const currentContent = this.streamedContentMap.get(requestId) || '';
		const newContent = currentContent + chunk;
		this.streamedContentMap.set(requestId, newContent);
		
		// 获取上次的行数
		const lastLineCount = this.lastLineCountMap.get(requestId) || 0;
		
		// 计算内容起始行
		const contentStartLine = position.line + 2;
		
		// 第一次更新：删除加载指示器
		if (lastLineCount === 0) {
			const loadingLine = contentStartLine;
			const currentLine = editor.getLine(loadingLine);
			
			if (currentLine && currentLine.includes('⏳ 正在思考...')) {
				editor.replaceRange('', { line: loadingLine, ch: 0 }, { line: loadingLine + 1, ch: 0 });
			}
		}
		
		// 计算新内容的行数
		const newLines = newContent.split('\n');
		const newLineCount = newLines.length;
		
		// 只更新变化的部分（增量更新）
		if (newLineCount > lastLineCount) {
			// 有新行需要添加
			const startUpdateLine = contentStartLine + lastLineCount;
			
			// 格式化新增的行
			const linesToAdd = newLines.slice(lastLineCount);
			const formattedLines = linesToAdd.map(line => `> ${line}`).join('\n');
			
			// 如果是追加到最后一行，需要先删除旧的最后一行再插入新内容
			if (lastLineCount > 0) {
				// 删除旧的最后一行
				const lastLine = contentStartLine + lastLineCount - 1;
				editor.replaceRange(
					'',
					{ line: lastLine, ch: 0 },
					{ line: lastLine + 1, ch: 0 }
				);
				
				// 重新格式化最后一行和新行
				const allNewLines = newLines.slice(lastLineCount - 1);
				const allFormatted = allNewLines.map(line => `> ${line}`).join('\n') + '\n';
				
				editor.replaceRange(allFormatted, { line: lastLine, ch: 0 });
			} else {
				// 第一次插入
				editor.replaceRange(formattedLines + '\n', { line: startUpdateLine, ch: 0 });
			}
		} else {
			// 同一行内容更新（最后一行追加内容）
			const lastLineIndex = contentStartLine + newLineCount - 1;
			const lastLineContent = newLines[newLines.length - 1];
			const formattedLastLine = `> ${lastLineContent}`;
			
			// 替换最后一行
			editor.replaceRange(
				formattedLastLine,
				{ line: lastLineIndex, ch: 0 },
				{ line: lastLineIndex, ch: editor.getLine(lastLineIndex).length }
			);
		}
		
		// 更新行数记录
		this.lastLineCountMap.set(requestId, newLineCount);
		
		// 每次更新后都将光标移到 callout 外部，确保样式正确渲染
		// 使用 scrollIntoView: false 避免不必要的视图滚动
		const cursorPosition: EditorPosition = {
			line: contentStartLine + newLineCount,
			ch: 0
		};
		editor.setCursor(cursorPosition);
	}
	
	/**
	 * 插入完整的 AI 响应到编辑器（非流式模式）
	 * 
	 * @param editor 编辑器实例
	 * @param position 插入位置（初始 callout 的起始位置）
	 * @param response AI 响应
	 */
	insertNonStreamResponse(
		editor: Editor,
		position: EditorPosition,
		response: AIResponse
	): void {
		// 非流式模式直接使用完成状态的 callout
		// 先将 callout 类型从 ai-streaming 替换为 ai-complete
		const calloutLine = position.line;
		const currentCalloutLine = editor.getLine(calloutLine);
		
		const collapseSymbol = this.plugin.settings.defaultCollapsed ? '-' : '+';
		const newCalloutLine = currentCalloutLine.replace(
			/\[!ai-streaming\][+-]/,
			`[!ai-complete]${collapseSymbol}`
		);
		
		editor.replaceRange(
			newCalloutLine,
			{ line: calloutLine, ch: 0 },
			{ line: calloutLine, ch: currentCalloutLine.length }
		);
		
		// 删除 "⏳ 正在思考..." 这一行（在 position.line + 2）
		const loadingLine = position.line + 2;
		editor.replaceRange(
			'',
			{ line: loadingLine, ch: 0 },
			{ line: loadingLine + 1, ch: 0 }
		);
		
		// 在同一个 callout 内插入 AI 响应
		// 每行都要加 "> " 前缀以保持在 callout 内
		const responseLines = response.content.split('\n').map(line => `> ${line}`).join('\n');
		const responseText = `${responseLines}\n`;
		
		// 插入到加载指示器原来的位置
		editor.replaceRange(responseText, { line: loadingLine, ch: 0 });
		
		// 计算分隔线位置
		const separatorLine = loadingLine + response.content.split('\n').length;
		
		// 根据设置决定是否在 callout 后添加分隔线
		if (this.plugin.settings.addSeparatorAfterResponse) {
			editor.replaceRange('\n---\n\n', { line: separatorLine, ch: 0 });
			
			// 将光标移动到分隔线后面
			editor.setCursor({ line: separatorLine + 2, ch: 0 });
		} else {
			// 将光标移动到内容后面
			editor.setCursor({ line: separatorLine, ch: 0 });
		}
		
		// 如果启用调试模式，记录日志
		if (this.plugin.settings.debugMode) {
			console.log('[Response Renderer] 非流式响应已插入:', {
				requestId: response.id,
				model: response.model,
				tokensUsed: response.tokensUsed,
				contentLength: response.content.length
			});
		}
	}
	
	/**
	 * 完成流式响应（添加分隔线等收尾工作）
	 * 
	 * @param editor 编辑器实例
	 * @param position 插入位置（初始 callout 的起始位置）
	 * @param response AI 响应
	 * @param requestId 请求 ID
	 */
	/**
		 * 完成流式响应（替换为完成状态的 callout）
		 * 
		 * @param editor 编辑器实例
		 * @param position 插入位置（初始 callout 的起始位置）
		 * @param response AI 响应
		 * @param requestId 请求 ID
		 */
		finalizeStreamResponse(
			editor: Editor,
			position: EditorPosition,
			response: AIResponse,
			requestId: string
		): void {
			// 将 callout 类型从 ai-streaming 替换为 ai-complete
			const calloutLine = position.line;
			const currentCalloutLine = editor.getLine(calloutLine);

			// 替换 callout 类型
			const collapseSymbol = this.plugin.settings.defaultCollapsed ? '-' : '+';
			const newCalloutLine = currentCalloutLine.replace(
				/\[!ai-streaming\][+-]/,
				`[!ai-complete]${collapseSymbol}`
			);

			editor.replaceRange(
				newCalloutLine,
				{ line: calloutLine, ch: 0 },
				{ line: calloutLine, ch: currentCalloutLine.length }
			);

			// 计算当前内容的行数
			const contentLines = response.content.split('\n').length;
			const separatorLine = position.line + 2 + contentLines;

			// 根据设置决定是否添加分隔线
			if (this.plugin.settings.addSeparatorAfterResponse) {
				editor.replaceRange('\n---\n\n', { line: separatorLine, ch: 0 });

				// 将光标移动到分隔线后面
				editor.setCursor({ line: separatorLine + 2, ch: 0 });
			} else {
				// 将光标移动到内容后面
				editor.setCursor({ line: separatorLine, ch: 0 });
			}

			// 清理流式内容
			this.clearStreamContent(requestId);
			
			// 恢复光标显示
			this.showCursor();

			// 如果启用调试模式，记录日志
			if (this.plugin.settings.debugMode) {
				console.log('[Response Renderer] 流式响应完成，已切换为完成状态:', {
					requestId: response.id,
					model: response.model,
					tokensUsed: response.tokensUsed,
					contentLength: response.content.length
				});
			}
		}
	
	/**
	 * 插入错误消息
	 * 
	 * @param editor 编辑器实例
	 * @param position 显示位置（初始 callout 的起始位置）
	 * @param errorMessage 错误消息
	 */
	insertError(
		editor: Editor,
		position: EditorPosition,
		errorMessage: string
	): void {
		// 删除 "⏳ 正在思考..." 这一行（在 position.line + 2）
		const loadingLine = position.line + 2;
		editor.replaceRange(
			'',
			{ line: loadingLine, ch: 0 },
			{ line: loadingLine + 1, ch: 0 }
		);
		
		// 在同一个 callout 内插入错误消息
		const errorText = `> \n> ❌ **错误**: ${errorMessage}\n`;
		editor.replaceRange(errorText, { line: loadingLine, ch: 0 });
		
		// 根据设置决定是否在 callout 后添加分隔线
		if (this.plugin.settings.addSeparatorAfterResponse) {
			const separatorPosition: EditorPosition = {
				line: loadingLine + 2,
				ch: 0
			};
			editor.replaceRange('\n---\n\n', separatorPosition);
		}
	}
	
	/**
	 * 清理所有流式内容
	 */
	cleanup(): void {
		this.streamedContentMap.clear();
		this.lastLineCountMap.clear();
		
		// 确保恢复光标显示
		this.showCursor();
	}
}
