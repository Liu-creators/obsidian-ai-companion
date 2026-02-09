/**
 * 编辑器 UI 控制器
 * 
 * 管理编辑器中的 AI 交互界面，协调输入、加载状态、响应显示和错误处理。
 * 
 * **验证需求：2.1, 2.2, 3.1, 4.1, 5.3**
 */

import { Editor, EditorPosition, Notice } from 'obsidian';
import { AIClient, createCancelToken } from '../services/ai-client';
import { AIRequest, AIResponse, CancelToken } from '../types';
import { LoadingIndicator } from './loading-indicator';
import { ErrorDisplay } from './error-display';
import { ResponseRenderer } from './response-renderer';
import { ContextExtractor } from '../utils/context-extractor';
import { WikilinkResolver } from '../utils/wikilink-resolver';
import { BaseAIError } from '../utils/errors';
import type MyPlugin from '../main';

/**
 * 活跃的 UI 组件接口
 * 
 * 跟踪当前活跃的 UI 组件，便于清理
 */
interface ActiveUIComponents {
	loadingIndicator?: LoadingIndicator;
	errorDisplay?: ErrorDisplay;
	cancelToken?: CancelToken;
	requestId?: string;
}

/**
 * 编辑器 UI 控制器类
 * 
 * 协调编辑器中的所有 AI 交互 UI 组件
 */
export class EditorUIController {
	private plugin: MyPlugin;
	private aiClient: AIClient;
	private responseRenderer: ResponseRenderer;
	private contextExtractor: ContextExtractor | null = null;
	private wikilinkResolver: WikilinkResolver;
	private activeComponents: Map<string, ActiveUIComponents>;
	
	constructor(plugin: MyPlugin, aiClient: AIClient) {
		this.plugin = plugin;
		this.aiClient = aiClient;
		this.responseRenderer = new ResponseRenderer(plugin);
		this.wikilinkResolver = new WikilinkResolver(plugin.app);
		this.activeComponents = new Map();
		
		// 如果启用了上下文功能，初始化上下文提取器
		if (plugin.settings.contextEnabled) {
			this.initializeContextExtractor();
		}
	}
	
	/**
	 * 初始化上下文提取器
	 */
	private initializeContextExtractor(): void {
		this.contextExtractor = new ContextExtractor({
			scope: this.plugin.settings.contextScope,
			maxLength: this.plugin.settings.maxContextLength,
			includeSelection: true
		});
	}
	
	/**
	 * 提交 prompt 到 AI 服务
	 * 
	 * 这是主要的入口方法，处理完整的 AI 请求流程。
	 * 
	 * **验证需求：2.1, 2.2, 3.1, 4.1, 5.3**
	 * 
	 * @param editor 编辑器实例
	 * @param prompt 用户输入的 prompt
	 * @param position 插入位置
	 */
	async submitPrompt(
		editor: Editor,
		prompt: string,
		position: EditorPosition
	): Promise<void> {
		// 验证 prompt
		if (!prompt || prompt.trim().length === 0) {
			new Notice('请输入有效的问题或指令');
			return;
		}
		
		// 立即插入单个 callout，包含问题和加载指示器
		// 使用 ai-streaming callout 类型（输出中状态）
		// 根据设置决定是否默认折叠（- 表示折叠，+ 表示展开）
		const collapseSymbol = this.plugin.settings.defaultCollapsed ? '-' : '+';
		const initialBlock = `> [!ai-streaming]${collapseSymbol} ${prompt.trim()}\n> \n> ⏳ 正在思考...\n`;
		editor.replaceRange(initialBlock, position);
		
		// 将光标移动到 callout 外部，以便正确渲染样式
		// callout 有 3 行，所以移动到 position.line + 3
		const cursorPosition: EditorPosition = {
			line: position.line + 3,
			ch: 0
		};
		editor.setCursor(cursorPosition);
		
		// 生成唯一的请求 ID
		const requestId = this.generateRequestId();
		
		// 创建取消令牌
		const cancelToken = createCancelToken();
		
		// 提取上下文（如果启用）
		let context: string | undefined;
		if (this.plugin.settings.contextEnabled && this.contextExtractor) {
			const extractedContext = this.contextExtractor.extract(editor, position);
			context = extractedContext.content;
			
			// 如果上下文被截断，通知用户
			if (extractedContext.truncated) {
				if (this.plugin.settings.debugMode) {
					console.log(`[Editor UI] 上下文被截断: ${extractedContext.originalLength} -> ${context.length} 字符`);
				}
			}
		}
		
		// 解析双链并读取文件内容
		const activeFile = this.plugin.app.workspace.getActiveFile();
		const sourcePath = activeFile?.path || '';
		const wikilinkResult = await this.wikilinkResolver.resolveAndBuildContext(
			prompt.trim(),
			sourcePath,
			this.plugin.settings.maxContextLength
		);
		
		// 合并上下文：编辑器上下文 + 双链文件内容
		const contexts: string[] = [];
		if (context) {
			contexts.push(context);
		}
		if (wikilinkResult.context) {
			contexts.push(wikilinkResult.context);
		}
		const finalContext = contexts.length > 0 ? contexts.join('\n\n') : undefined;
		
		// 如果有未解析的链接，在调试模式下记录
		if (wikilinkResult.unresolvedLinks.length > 0 && this.plugin.settings.debugMode) {
			console.warn('[Editor UI] 未解析的链接:', wikilinkResult.unresolvedLinks);
		}
		
		// 显示加载指示器（已经在初始 callout 中插入，这里只创建引用）
		const container = document.createElement('div');
		const loadingIndicator = new LoadingIndicator(container, '');
		loadingIndicator.show();
		
		// 保存活跃组件引用
		this.activeComponents.set(requestId, {
			loadingIndicator,
			cancelToken
		});
		
		// 如果是流式模式，初始化流式内容累积器
		if (this.plugin.settings.streamResponse) {
			this.responseRenderer.initStreamContent(requestId);
		}
		
		try {
			// 构建 AI 请求
			const request: AIRequest = {
				id: requestId,
				prompt: prompt.trim(),
				context: finalContext,
				timestamp: Date.now(),
				source: 'editor',
				cancelToken,
				stream: this.plugin.settings.streamResponse,
				onStream: this.plugin.settings.streamResponse 
					? (chunk: string) => this.responseRenderer.handleStreamChunk(editor, position, chunk, requestId)
					: undefined
			};
			
			// 记录 AI 输入日志
			if (this.plugin.settings.logAIInteractions) {
				console.group('🤖 AI 交互 - 输入');
				console.log('📝 用户输入:', prompt.trim());
				if (wikilinkResult.totalLinks > 0) {
					console.log('🔗 双链解析:', `${wikilinkResult.resolvedLinks}/${wikilinkResult.totalLinks} 个链接已解析`);
				}
				console.groupEnd();
			}
			
			// 发送请求到 AI 服务
			const response = await this.aiClient.sendRequest(request);
			
			// 记录 AI 输出日志
			if (this.plugin.settings.logAIInteractions) {
				console.group('🤖 AI 交互 - 输出');
				console.log('🤖 模型:', response.model);
				console.log('📊 Token 使用:', response.tokensUsed);
				console.log('📝 响应长度:', response.content.length, '字符');
				console.log('💬 AI 响应:', response.content);
				console.groupEnd();
			}
			
			// 移除加载指示器
			loadingIndicator.remove();
			
			// 插入响应到编辑器
			if (this.plugin.settings.streamResponse) {
				// 流式模式：完成流式响应（添加分隔线等）
				this.responseRenderer.finalizeStreamResponse(editor, position, response, requestId);
			} else {
				// 非流式模式：插入完整响应
				this.responseRenderer.insertNonStreamResponse(editor, position, response);
			}
			
		} catch (error) {
			// 移除加载指示器
			loadingIndicator.remove();
			
			// 显示错误
			this.showError(editor, position, error as BaseAIError, () => {
				// 重试回调
				this.submitPrompt(editor, prompt, position);
			});
			
		} finally {
			// 清理活跃组件
			this.activeComponents.delete(requestId);
			
			// 清理流式内容
			if (this.plugin.settings.streamResponse) {
				this.responseRenderer.clearStreamContent(requestId);
			}
		}
	}
	
	/**
	 * 显示加载指示器
	 * 
	 * **验证需求：4.1**
	 * 
	 * @param editor 编辑器实例
	 * @param position 显示位置
	 * @returns 加载指示器实例
	 */
	showLoading(editor: Editor, position: EditorPosition): LoadingIndicator {
		// 在编辑器中插入一个占位符元素
		const placeholder = '\n\n⏳ 正在思考...\n\n';
		editor.replaceRange(placeholder, position);
		
		// 创建加载指示器（在文档中显示）
		const message = this.plugin.settings.showLoadingMessages 
			? '正在思考...' 
			: '';
		
		// 注意：这里我们使用文本占位符而不是 DOM 元素
		// 因为 Obsidian 编辑器是基于 CodeMirror 的，直接插入 DOM 元素比较复杂
		// 实际的加载指示器通过文本形式显示
		
		// 创建一个虚拟的加载指示器来管理状态
		const container = document.createElement('div');
		const loadingIndicator = new LoadingIndicator(container, message);
		loadingIndicator.show();
		
		return loadingIndicator;
	}
	
	/**
	 * 显示错误消息
	 * 
	 * **验证需求：5.3**
	 * 
	 * @param editor 编辑器实例
	 * @param position 显示位置（初始 callout 的起始位置）
	 * @param error 错误对象
	 * @param onRetry 重试回调函数
	 */
	showError(
		editor: Editor,
		position: EditorPosition,
		error: BaseAIError,
		onRetry?: () => void
	): void {
		// 使用 ResponseRenderer 插入错误消息
		this.responseRenderer.insertError(editor, position, error.message);
		
		// 同时显示通知
		new Notice(`AI 错误: ${error.message}`, 5000);
		
		// 如果错误可重试且提供了重试回调，显示重试提示
		if (error.retryable && onRetry) {
			new Notice('您可以重新尝试发送请求', 3000);
		}
		
		// 记录详细错误到控制台
		console.error('[Editor UI] AI 错误:', {
			name: error.name,
			message: error.message,
			details: error.details,
			retryable: error.retryable
		});
	}
	
	/**
	 * 取消正在进行的请求
	 * 
	 * @param requestId 请求 ID
	 */
	cancelRequest(requestId: string): void {
		const components = this.activeComponents.get(requestId);
		if (components) {
			// 取消请求
			if (components.cancelToken) {
				components.cancelToken.cancel();
			}
			
			// 移除加载指示器
			if (components.loadingIndicator) {
				components.loadingIndicator.remove();
			}
			
			// 清理组件
			this.activeComponents.delete(requestId);
		}
	}
	
	/**
	 * 清理所有活跃的 UI 组件
	 * 
	 * 在插件卸载时调用
	 */
	cleanup(): void {
		// 取消所有活跃的请求
		for (const [requestId, components] of this.activeComponents.entries()) {
			if (components.cancelToken) {
				components.cancelToken.cancel();
			}
			
			if (components.loadingIndicator) {
				components.loadingIndicator.remove();
			}
		}
		
		// 清空活跃组件映射
		this.activeComponents.clear();
		
		// 清理响应渲染器
		this.responseRenderer.cleanup();
	}
	
	/**
	 * 更新上下文提取器配置
	 * 
	 * 当插件设置改变时调用
	 */
	updateContextExtractor(): void {
		if (this.plugin.settings.contextEnabled) {
			if (!this.contextExtractor) {
				this.initializeContextExtractor();
			} else {
				this.contextExtractor.updateConfig({
					scope: this.plugin.settings.contextScope,
					maxLength: this.plugin.settings.maxContextLength,
					includeSelection: true
				});
			}
		} else {
			this.contextExtractor = null;
		}
	}
	
	/**
	 * 生成唯一的请求 ID
	 * 
	 * @returns 请求 ID
	 */
	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}
}
