/**
 * Canvas UI Controller
 * 
 * 协调 Canvas 中的 AI 交互流程
 * 
 * 验证需求：6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3
 */

import { Plugin, Notice } from 'obsidian';
import type { AIClient } from '../services/ai-client';
import { createCancelToken } from '../services/ai-client';
import { CanvasContextExtractor } from './canvas-context-extractor';
import { CanvasNodeManager } from './canvas-node-manager';
import type { CancelToken, Canvas, CanvasNode, AIRequest, CanvasTextNode } from '../types';
import type { AIPluginSettings } from '../settings';
import { WikilinkResolver } from '../utils/wikilink-resolver';

/**
 * 扩展的插件接口，包含 settings 属性
 */
interface AIPlugin extends Plugin {
	settings: AIPluginSettings;
}

/**
 * Canvas UI 控制器
 * 
 * 负责协调 Canvas 中的 AI 交互流程，包括：
 * - 提取上下文
 * - 发送 AI 请求
 * - 创建和更新响应节点
 * - 管理并发请求
 * - 处理错误
 * 
 * @example
 * ```ts
 * const controller = new CanvasUIController(plugin, aiClient);
 * await controller.submitPrompt(canvas, triggerNode, '请帮我总结这个内容', false);
 * ```
 */
export class CanvasUIController {
	private plugin: AIPlugin;
	private aiClient: AIClient;
	private contextExtractor: CanvasContextExtractor;
	private nodeManager: CanvasNodeManager;
	private activeRequests: Map<string, CancelToken>;
	private wikilinkResolver: WikilinkResolver;

	/**
	 * 构造函数
	 * 
	 * 初始化 Canvas UI 控制器及其依赖。
	 * 
	 * @param plugin 插件实例
	 * @param aiClient AI 客户端实例
	 * 
	 * 验证需求：6.1
	 * 
	 * @example
	 * ```ts
	 * const aiClient = new AIClient(config);
	 * const controller = new CanvasUIController(plugin, aiClient);
	 * ```
	 */
	constructor(plugin: Plugin, aiClient: AIClient) {
		this.plugin = plugin as AIPlugin;
		this.aiClient = aiClient;
		
		// 初始化上下文提取器
		this.contextExtractor = new CanvasContextExtractor(plugin.app);
		
		// 初始化节点管理器
		this.nodeManager = new CanvasNodeManager(plugin);
		
		// 初始化 Wikilink 解析器
		this.wikilinkResolver = new WikilinkResolver(plugin.app);
		
		// 初始化活跃请求 Map
		// 用于跟踪和管理并发的 AI 请求
		// key: 请求 ID, value: 取消令牌
		this.activeRequests = new Map<string, CancelToken>();
	}

	/**
	 * 提交 prompt 到 AI
	 * 
	 * 协调整个 Canvas AI 交互流程：
	 * 1. 验证输入
	 * 2. 提取上下文（根据 includeRelated 参数）
	 * 3. 创建响应节点（显示加载状态）
	 * 4. 生成唯一的请求 ID
	 * 5. 创建取消令牌
	 * 6. 发送 AI 请求（在后续任务中实现）
	 * 
	 * @param canvas Canvas 实例
	 * @param triggerNode 触发 AI 的节点
	 * @param prompt 用户输入的问题
	 * @param includeRelated 是否包含相关节点的上下文
	 * 
	 * 验证需求：6.2, 3.1, 3.2, 4.1, 4.2, 5.1, 5.4, 7.4, 7.5
	 * 验证属性：属性 7, 属性 8, 属性 11, 属性 14, 属性 19
	 * 
	 * @example
	 * ```ts
	 * // 仅包含当前节点上下文（Enter 键）
	 * await controller.submitPrompt(canvas, node, '请总结这个内容', false);
	 * 
	 * // 包含相关节点上下文（Shift+Enter 键）
	 * await controller.submitPrompt(canvas, node, '请分析这些内容的关系', true);
	 * ```
	 */
	async submitPrompt(
		canvas: Canvas,
		triggerNode: CanvasNode,
		prompt: string,
		includeRelated: boolean
	): Promise<void> {
		// 1. 验证输入
		if (!prompt || prompt.trim().length === 0) {
			new Notice('请输入问题');
			return;
		}

		if (!canvas) {
			new Notice('Canvas 不可用');
			return;
		}

		if (!triggerNode) {
			new Notice('触发节点不可用');
			return;
		}
		
		// 检查是否有多个选中节点
		const selection = canvas.selection;
		const isMultiSelection = selection && selection.size > 1;

		try {
			// 2. 提取上下文
			let context: string;
			
			if (isMultiSelection) {
				// 多选模式：提取所有选中节点作为上下文
				const selectedNodes = Array.from(selection);
				// 按照位置排序（从上到下，从左到右）
				selectedNodes.sort((a, b) => {
					if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
					return a.x - b.x;
				});
				context = await this.contextExtractor.extractSelectedNodesContext(selectedNodes, canvas);
			} else if (includeRelated) {
				// Shift+Enter：包含相关节点
				// 验证需求：3.2, 4.2, 4.3
				// 验证属性：属性 8
				const contextResult = await this.contextExtractor.extractRelatedNodesContext(
					canvas,
					triggerNode
				);
				context = contextResult.fullContext;
			} else {
				// Enter：仅当前节点
				// 验证需求：3.1, 4.1
				// 验证属性：属性 7
				context = await this.contextExtractor.extractCurrentNodeContext(triggerNode, canvas);
			}

			// 2.2 解析 Prompt 中的双链并追加到上下文
			const wikilinkContext = await this.wikilinkResolver.resolveAndBuildContext(prompt);
			if (wikilinkContext.context) {
				context += `\n\n=== 引用文件内容 ===\n${wikilinkContext.context}`;
				console.log('[Canvas AI] 解析到双链引用:', {
					total: wikilinkContext.totalLinks,
					resolved: wikilinkContext.resolvedLinks,
					unresolved: wikilinkContext.unresolvedLinks
				});
			}

			// 3. 创建响应节点（加载状态）
			// 验证需求：5.1, 5.4
			// 验证属性：属性 11, 属性 14
			
			// 如果是多选模式，需要在生成的节点中包含用户问题
			let responseNode: CanvasNode;
			
			if (isMultiSelection) {
				// 计算选中节点的包围盒，确定响应节点位置
				// 这里简单取触发节点的位置，或者计算所有节点的中心/底部
				// 暂时复用 createResponseNode，但修改初始内容
				responseNode = this.createResponseNode(canvas, triggerNode, prompt, true);
				
				// 立即更新内容为：用户问题 + callout
				const collapseSymbol = this.plugin.settings.defaultCollapsed ? '-' : '+';
				const initialContent = `${prompt}\n\n> [!ai-streaming]${collapseSymbol} AI 回答\n> \n> ⏳ 正在思考...\n`;
				
				// 手动更新初始内容
				// 注意：createResponseNode 内部已经创建了节点，我们需要覆盖它的内容
				this.nodeManager.updateNodeContent(canvas, responseNode as CanvasTextNode, initialContent);
			} else {
				// 单选模式保持原样
				// 验证需求：5.1
				responseNode = this.createResponseNode(canvas, triggerNode, prompt, false);
			}

			// 4. 生成请求 ID
			// 使用 canvas_ 前缀区分 Canvas 请求
			// 验证需求：7.4
			// 验证属性：属性 19
			const requestId = `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

			// 5. 创建取消令牌
			// 验证需求：7.5
			// 验证属性：属性 19
			const cancelToken = createCancelToken();
			
			// 将取消令牌存储到活跃请求 Map 中
			// 用于后续的并发管理和取消操作
			this.activeRequests.set(requestId, cancelToken);

			// 6. 构建 AIRequest 对象
			// 验证需求：6.1, 6.2
			
			// 用于累积流式响应的完整内容
			let accumulatedContent = '';
			
			const aiRequest: AIRequest = {
				id: requestId,
				prompt: prompt,
				context: context,
				timestamp: Date.now(),
				source: 'editor', // 使用 'editor' 作为来源（Canvas 请求也使用相同的处理流程）
				cancelToken: cancelToken,
				stream: true, // 启用流式响应
				onStream: (chunk: string) => {
					// 累积内容片段
					// 验证需求：6.2, 6.3
					// 验证属性：属性 15
					accumulatedContent += chunk;
					
					// 流式更新响应节点（使用累积的完整内容）
					// 验证需求：6.2, 6.3
					// 验证属性：属性 15, 属性 16
					
					if (isMultiSelection) {
					// 多选模式：保留用户问题在第一行
					const collapseSymbol = this.plugin.settings.defaultCollapsed ? '-' : '+';
					const streamingContent = `${prompt}\n\n> [!ai-streaming]${collapseSymbol} AI 回答\n> \n${accumulatedContent.split('\n').map(line => `> ${line}`).join('\n')}\n`;
					this.nodeManager.updateNodeContent(canvas, responseNode as CanvasTextNode, streamingContent);
				} else {
					// 单选模式
					// 确保 responseNode 是 CanvasTextNode 类型
					if ((responseNode as unknown).text !== undefined || responseNode.type === 'text') {
						this.updateResponseNode(canvas, responseNode as CanvasTextNode, accumulatedContent);
					}
				}
				}
			};

			console.log('[Canvas AI] 发送请求:', {
				requestId,
				prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
				includeRelated,
				isMultiSelection,
				contextLength: context.length,
				responseNodeId: responseNode.id
			});

			// 7. 调用 AIClient.sendRequest()
			// 验证需求：6.1, 6.2
			try {
				const response = await this.aiClient.sendRequest(aiRequest);
				
				// 8. 处理完成状态
				// 验证需求：6.5, 6.6
				// 验证属性：属性 17
				console.log('[Canvas AI] 请求完成:', {
					requestId,
					responseNodeId: responseNode.id,
					contentLength: response.content.length,
					tokensUsed: response.tokensUsed,
					finishReason: response.finishReason
				});
				
				// 如果是多选模式，完成后更新为完成状态的 callout
				if (isMultiSelection) {
					const collapseSymbol = this.plugin.settings.defaultCollapsed ? '-' : '+';
					// 使用 ai-complete callout 类型（或者自定义完成颜色）
					const finalContent = `${prompt}\n\n> [!ai]${collapseSymbol} AI 回答\n> \n${response.content.split('\n').map(line => `> ${line}`).join('\n')}\n`;
					this.nodeManager.updateNodeContent(canvas, responseNode as CanvasTextNode, finalContent);
				}
				
				// 从活跃请求中移除
				this.activeRequests.delete(requestId);
				
			} catch (error) {
				// 错误处理
				console.error('[Canvas AI] 请求失败:', error);
				
				// 从活跃请求中移除
				this.activeRequests.delete(requestId);
				
				// 创建错误节点（将在任务 6.5 中完善）
				this.createErrorNode(canvas, triggerNode, error as Error);
				
				// 显示通知
				new Notice('AI 请求失败，请查看错误节点了解详情');
			}

		} catch (error) {
			// 错误处理将在任务 6.5 中完善
			console.error('[Canvas AI] submitPrompt 错误:', error);
			new Notice('提交请求失败，请查看控制台了解详情');
		}
	}

	/**
	 * 清理资源
	 * 
	 * 清理所有活跃的请求和相关资源。
	 * 应在插件卸载时调用。
	 * 
	 * 验证需求：10.8, 属性 25
	 * 
	 * @example
	 * ```ts
	 * // 在插件 onunload 中调用
	 * onunload() {
	 *   this.canvasUIController.cleanup();
	 * }
	 * ```
	 */
	cleanup(): void {
		// 取消所有活跃的请求
		for (const [requestId, cancelToken] of this.activeRequests.entries()) {
			console.log(`[Canvas AI] 取消请求: ${requestId}`);
			cancelToken.cancel();
		}
		
		// 清空活跃请求 Map
		this.activeRequests.clear();
	}

	/**
	 * 创建响应节点（加载状态）
	 * 
	 * 在 Canvas 中创建一个新的文本节点来显示 AI 响应。
	 * 初始状态显示加载提示："⏳ 正在思考..."
	 * 节点位置在触发节点下方，偏移量由插件设置决定。
	 * 自动创建从触发节点到响应节点的连接。
	 * 
	 * @param canvas Canvas 实例
	 * @param triggerNode 触发节点（如果是多选，则是选中的第一个节点或虚拟中心节点）
	 * @param prompt 用户输入的问题（用于日志）
	 * @param isMultiSelection 是否为多选模式
	 * @returns 创建的响应节点
	 * 
	 * 验证需求：5.1, 5.2, 5.3, 5.4
	 * 验证属性：属性 11, 属性 12, 属性 13, 属性 14
	 */
	private createResponseNode(
		canvas: Canvas,
		triggerNode: CanvasNode,
		prompt: string,
		isMultiSelection: boolean = false
	): CanvasTextNode {
		// 验证需求：10.3
		const settings = this.plugin.settings;
		const canvasSettings = settings.canvasSettings;

		// 计算新节点位置
		// 验证需求：5.3
		// 验证属性：属性 13
		const position = this.nodeManager.calculateNodePosition(
			triggerNode,
			canvasSettings.newNodeOffset.x,
			canvasSettings.newNodeOffset.y
		);

		// 创建文本节点（加载状态）
		// 验证需求：5.1, 5.4
		// 验证属性：属性 11, 属性 14
		const responseNode = this.nodeManager.createTextNode(
			canvas,
			'⏳ 正在思考...', // 初始加载状态
			position.x,
			position.y,
			canvasSettings.newNodeSize.width,
			canvasSettings.newNodeSize.height
		);

		// 创建连接
		// 验证需求：5.2
		// 验证属性：属性 12
		// 
		// 如果是单选模式 (isMultiSelection = false)，创建从触发节点到响应节点的连接，并带有 prompt 标签
		// 如果是多选模式 (isMultiSelection = true)，不创建连接（因为没有单一的父节点，或者是组）
		// 但如果选中的是一个完整的组 (Group Node)，逻辑上它应该被视为单选（触发节点就是该 Group Node），
		// 这里 isMultiSelection 传入 false 即可。
		// 目前调用方逻辑是：canvas.selection.size > 1 时 isMultiSelection = true。
		// 所以：多选时不连线；单选时（包括选中单个 Group）连线。
		
		if (!isMultiSelection) {
			this.nodeManager.createEdge(canvas, triggerNode, responseNode, prompt);
		}

		console.log('[Canvas AI] 响应节点已创建:', {
			responseNodeId: responseNode.id,
			triggerNodeId: triggerNode.id,
			position,
			prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
			isMultiSelection
		});

		return responseNode;
	}

	/**
	 * 更新响应节点（流式）
	 * 
	 * 在流式响应过程中更新节点内容。
	 * 直接使用 AI 返回的完整 Markdown，不需要额外的格式化或包装。
	 * 支持所有 Obsidian Markdown 语法（标题、列表、代码块、callout、双链等）。
	 * 
	 * @param canvas Canvas 实例
	 * @param responseNode 响应节点
	 * @param content 新的内容（累积的完整内容）
	 * 
	 * 验证需求：6.2, 6.3, 6.5, 6.6
	 * 验证属性：属性 15, 属性 16, 属性 17
	 * 
	 * @example
	 * ```ts
	 * // 流式更新节点内容
	 * this.updateResponseNode(canvas, responseNode, '# 标题\n\n这是内容...');
	 * ```
	 */
	private updateResponseNode(
		canvas: Canvas,
		responseNode: CanvasTextNode,
		content: string
	): void {
		try {
			// 直接使用 AI 返回的 Markdown 内容
			// 不需要 ResponseParser 包装，Canvas 节点会自动渲染 Markdown
			// 验证需求：6.3, 6.6
			// 验证属性：属性 16, 属性 17
			this.nodeManager.updateNodeContent(canvas, responseNode, content);
			
		} catch (error) {
			console.error('[Canvas AI] 更新响应节点失败:', error);
			// 不抛出错误，避免中断流式输出
		}
	}

	/**
	 * 创建错误节点
	 * 
	 * 在 Canvas 中创建一个新的文本节点来显示错误信息。
	 * 错误节点连接到触发节点，显示清晰的错误信息和重试提示。
	 * 
	 * @param canvas Canvas 实例
	 * @param triggerNode 触发节点
	 * @param error 错误对象
	 * 
	 * 验证需求：8.1, 8.2, 8.3, 8.4, 8.5, 8.6
	 * 验证属性：属性 20, 属性 21, 属性 22
	 * 
	 * @example
	 * ```ts
	 * try {
	 *   await this.aiClient.sendRequest(request);
	 * } catch (error) {
	 *   this.createErrorNode(canvas, triggerNode, error as Error);
	 * }
	 * ```
	 */
	private createErrorNode(
		canvas: Canvas,
		triggerNode: CanvasNode,
		error: Error
	): void {
		try {
			// 获取插件设置
			const settings = this.plugin.settings;
			const canvasSettings = settings.canvasSettings;

			// 计算错误节点位置（与响应节点相同的位置逻辑）
			const position = this.nodeManager.calculateNodePosition(
				triggerNode,
				canvasSettings.newNodeOffset.x,
				canvasSettings.newNodeOffset.y
			);

			// 构建错误信息
			// 验证需求：8.3
			// 验证属性：属性 20, 属性 22
			let errorMessage = '❌ AI 错误\n\n';
			
			// 根据错误类型提供友好的错误信息
			const errorMsg = error.message.toLowerCase();
			
			if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
				errorMessage += '无法连接到 AI 服务，请检查网络连接。\n';
			} else if (errorMsg.includes('timeout')) {
				errorMessage += 'AI 服务响应超时，请稍后重试。\n';
			} else if (errorMsg.includes('401') || errorMsg.includes('403') || 
			           errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
				errorMessage += 'API 密钥无效或已过期，请检查设置。\n';
			} else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
				errorMessage += 'API 调用频率超限，请稍后重试。\n';
			} else if (errorMsg.includes('cancel')) {
				errorMessage += '请求已取消。\n';
			} else {
				errorMessage += `${error.message}\n`;
			}
			
			errorMessage += '\n---\n';
			errorMessage += '💡 提示：可以重新点击节点菜单按钮重试';

			// 创建错误节点
			// 验证需求：8.1
			// 验证属性：属性 20
			const errorNode = this.nodeManager.createTextNode(
				canvas,
				errorMessage,
				position.x,
				position.y,
				canvasSettings.newNodeSize.width,
				canvasSettings.newNodeSize.height
			);

			// 创建从触发节点到错误节点的连接
			// 验证需求：8.2
			// 验证属性：属性 20
			this.nodeManager.createEdge(canvas, triggerNode, errorNode);

			// 显示 Notice 通知
			// 验证需求：8.4
			// 验证属性：属性 21
			new Notice('AI 请求失败，请查看错误节点了解详情');

			// 在控制台记录详细错误信息
			// 验证需求：8.5
			// 验证属性：属性 21
			console.error('[Canvas AI] 错误详情:', {
				triggerNodeId: triggerNode.id,
				errorNodeId: errorNode.id,
				error: error,
				stack: error.stack
			});

		} catch (err) {
			// 如果创建错误节点也失败了，至少在控制台记录
			console.error('[Canvas AI] 创建错误节点失败:', err);
			console.error('[Canvas AI] 原始错误:', error);
			new Notice('发生错误，请查看控制台了解详情');
		}
	}
}
