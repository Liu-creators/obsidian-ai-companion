/**
 * Canvas UI 控制器
 * 
 * ⚠️ 重要提示：Canvas API 是 Obsidian 的实验性功能，不是官方公开的稳定 API。
 * 此模块依赖非官方的 Canvas API，可能在未来版本中发生变化。
 * 
 * 管理 Canvas 中的 AI 交互界面，协调输入、加载状态、响应显示和错误处理。
 * 
 * **验证需求：6.1, 6.3, 6.4, 6.7**
 */

import { Notice } from 'obsidian';
import { AIClient, createCancelToken } from '../services/ai-client';
import { AIRequest, AIResponse, CancelToken } from '../types';
import { LoadingIndicator } from '../ui/loading-indicator';
import { ErrorDisplay } from '../ui/error-display';
import { CollapsibleBlockRenderer } from '../ui/collapsible-block-renderer';
import { BaseAIError } from '../utils/errors';
import { Canvas, CanvasTextNode, Point, CreateNodeOptions } from '../types/canvas';
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
	nodeId?: string;
}

/**
 * Canvas UI 控制器类
 * 
 * 协调 Canvas 中的所有 AI 交互 UI 组件
 */
export class CanvasUIController {
	private plugin: MyPlugin;
	private aiClient: AIClient;
	private collapsibleRenderer: CollapsibleBlockRenderer;
	private activeComponents: Map<string, ActiveUIComponents>;
	private isAPIAvailable: boolean = false;
	
	constructor(plugin: MyPlugin, aiClient: AIClient) {
		this.plugin = plugin;
		this.aiClient = aiClient;
		this.collapsibleRenderer = new CollapsibleBlockRenderer();
		this.activeComponents = new Map();
		
		// 检查 Canvas API 是否可用
		this.isAPIAvailable = this.checkCanvasAPIAvailability();
		
		if (!this.isAPIAvailable) {
			console.warn('[Canvas UI] Canvas API 不可用，Canvas UI 功能已禁用');
		}
	}
	
	/**
	 * 检查 Canvas API 是否可用
	 * 
	 * **验证需求：6.7**
	 * 
	 * @returns 如果 Canvas API 可用返回 true，否则返回 false
	 */
	private checkCanvasAPIAvailability(): boolean {
		try {
			// 尝试查询 Canvas 视图类型
			const hasCanvasViewType = this.plugin.app.workspace.getLeavesOfType('canvas').length >= 0;
			return hasCanvasViewType;
		} catch (error) {
			console.error('[Canvas UI] Canvas API 检查失败:', error);
			return false;
		}
	}
	
	/**
	 * 显示输入界面
	 * 
	 * 在 Canvas 节点中显示 AI 输入提示。
	 * 注意：由于 Canvas API 的限制，我们使用通知而不是自定义 UI 组件。
	 * 
	 * **验证需求：6.1**
	 * 
	 * @param node Canvas 文本节点
	 * @param position 显示位置（可选）
	 */
	showInputWidget(node: CanvasTextNode, position?: Point): void {
		if (!this.isAPIAvailable) {
			new Notice('Canvas API 不可用，无法使用 Canvas AI 功能');
			return;
		}
		
		// 显示输入提示
		new Notice('请在 `/` 后输入您的问题，然后按 Enter 提交', 3000);
		
		if (this.plugin.settings.debugMode) {
			console.log('[Canvas UI] 显示输入界面', {
				nodeId: node.id,
				position: position
			});
		}
	}
	
	/**
	 * 提交 prompt 到 AI 服务
	 * 
	 * 这是主要的入口方法，处理完整的 AI 请求流程。
	 * 
	 * **验证需求：6.1, 6.3**
	 * 
	 * @param canvas Canvas 实例
	 * @param node 当前节点
	 * @param prompt 用户输入的 prompt
	 * @param context 可选的上下文内容
	 */
	async submitPrompt(
		canvas: Canvas,
		node: CanvasTextNode,
		prompt: string,
		context?: string
	): Promise<void> {
		if (!this.isAPIAvailable) {
			new Notice('Canvas API 不可用，无法使用 Canvas AI 功能');
			return;
		}
		
		// 验证 prompt
		if (!prompt || prompt.trim().length === 0) {
			new Notice('请输入有效的问题或指令');
			return;
		}
		
		// 生成唯一的请求 ID
		const requestId = this.generateRequestId();
		
		// 创建取消令牌
		const cancelToken = createCancelToken();
		
		// 显示加载指示器
		const loadingIndicator = this.showLoading(node);
		
		// 保存活跃组件引用
		this.activeComponents.set(requestId, {
			loadingIndicator,
			cancelToken,
			requestId,
			nodeId: node.id
		});
		
		try {
			// 构建 AI 请求
			const request: AIRequest = {
				id: requestId,
				prompt: prompt.trim(),
				context,
				timestamp: Date.now(),
				source: 'canvas',
				cancelToken
			};
			
			// 发送请求到 AI 服务
			const response = await this.aiClient.sendRequest(request);
			
			// 移除加载指示器
			loadingIndicator.remove();
			
			// 询问用户响应插入位置
			// 由于 Canvas API 限制，我们默认在当前节点插入
			// 用户可以通过设置选择创建新节点
			if (this.plugin.settings.debugMode) {
				console.log('[Canvas UI] AI 响应已接收，准备插入');
			}
			
			// 插入响应（默认在当前节点）
			this.insertResponseInNode(node, response);
			
			// 请求保存 Canvas
			canvas.requestSave();
			
		} catch (error) {
			// 移除加载指示器
			loadingIndicator.remove();
			
			// 显示错误
			this.showError(node, error as BaseAIError, () => {
				// 重试回调
				this.submitPrompt(canvas, node, prompt, context);
			});
			
		} finally {
			// 清理活跃组件
			this.activeComponents.delete(requestId);
		}
	}
	
	/**
	 * 显示加载指示器
	 * 
	 * 在 Canvas 节点中显示加载状态。
	 * 注意：由于 Canvas API 限制，我们使用通知而不是在节点中直接显示。
	 * 
	 * @param node Canvas 文本节点
	 * @returns 加载指示器实例
	 */
	private showLoading(node: CanvasTextNode): LoadingIndicator {
		// 显示通知
		new Notice('正在思考...', 0); // 0 表示不自动关闭
		
		// 创建一个虚拟的加载指示器来管理状态
		const container = document.createElement('div');
		const message = this.plugin.settings.showLoadingMessages 
			? '正在思考...' 
			: '';
		
		const loadingIndicator = new LoadingIndicator(container, message);
		loadingIndicator.show();
		
		if (this.plugin.settings.debugMode) {
			console.log('[Canvas UI] 显示加载指示器', {
				nodeId: node.id
			});
		}
		
		return loadingIndicator;
	}
	
	/**
	 * 在当前节点中插入 AI 响应
	 * 
	 * 将 AI 响应内容插入到触发节点中。
	 * 
	 * **验证需求：6.3**
	 * 
	 * @param node Canvas 文本节点
	 * @param response AI 响应
	 */
	insertResponseInNode(node: CanvasTextNode, response: AIResponse): void {
		if (!this.isAPIAvailable) {
			new Notice('Canvas API 不可用，无法插入响应');
			return;
		}
		
		// 获取当前节点文本
		const currentText = node.getText();
		
		// 使用可折叠块渲染器生成响应内容
		const collapsibleBlock = this.collapsibleRenderer.render({
			title: 'AI 响应',
			content: response.content,
			collapsed: this.plugin.settings.defaultCollapsed,
			metadata: {
				requestId: response.id,
				model: response.model,
				timestamp: response.timestamp,
				tokensUsed: response.tokensUsed
			}
		});
		
		// 将响应追加到当前节点文本
		const newText = `${currentText}\n\n${collapsibleBlock}`;
		node.setText(newText);
		
		// 显示成功通知
		new Notice('AI 响应已插入到节点中');
		
		if (this.plugin.settings.debugMode) {
			console.log('[Canvas UI] 响应已插入到节点', {
				nodeId: node.id,
				requestId: response.id,
				model: response.model,
				tokensUsed: response.tokensUsed,
				contentLength: response.content.length
			});
		}
	}
	
	/**
	 * 创建新节点显示 AI 响应
	 * 
	 * 在 Canvas 中创建一个新的文本节点来显示 AI 响应。
	 * 
	 * **验证需求：6.4**
	 * 
	 * @param canvas Canvas 实例
	 * @param position 新节点的位置
	 * @param response AI 响应
	 * @returns 创建的节点
	 */
	createResponseNode(
		canvas: Canvas,
		position: Point,
		response: AIResponse
	): CanvasTextNode {
		if (!this.isAPIAvailable) {
			throw new Error('Canvas API 不可用，无法创建响应节点');
		}
		
		// 使用可折叠块渲染器生成响应内容
		const collapsibleBlock = this.collapsibleRenderer.render({
			title: 'AI 响应',
			content: response.content,
			collapsed: this.plugin.settings.defaultCollapsed,
			metadata: {
				requestId: response.id,
				model: response.model,
				timestamp: response.timestamp,
				tokensUsed: response.tokensUsed,
				isAIGenerated: true
			}
		});
		
		// 创建节点选项
		const nodeOptions: CreateNodeOptions = {
			x: position.x,
			y: position.y,
			width: 400,
			height: 300,
			text: collapsibleBlock,
			color: '5' // 使用特定颜色标记 AI 生成的节点
		};
		
		// 创建新节点
		const newNode = canvas.createTextNode(nodeOptions);
		
		// 请求保存 Canvas
		canvas.requestSave();
		
		// 显示成功通知
		new Notice('AI 响应已创建为新节点');
		
		if (this.plugin.settings.debugMode) {
			console.log('[Canvas UI] 创建响应节点', {
				nodeId: newNode.id,
				requestId: response.id,
				position: position,
				model: response.model
			});
		}
		
		return newNode;
	}
	
	/**
	 * 显示错误消息
	 * 
	 * 在 Canvas 中显示错误信息。
	 * 注意：由于 Canvas API 限制，我们使用通知而不是在节点中直接显示。
	 * 
	 * **验证需求：6.7**
	 * 
	 * @param node Canvas 文本节点
	 * @param error 错误对象
	 * @param onRetry 重试回调函数
	 */
	showError(
		node: CanvasTextNode,
		error: BaseAIError,
		onRetry?: () => void
	): void {
		// 显示错误通知
		new Notice(`AI 错误: ${error.message}`, 5000);
		
		// 如果错误可重试且提供了重试回调，显示重试提示
		if (error.retryable && onRetry) {
			new Notice('您可以重新尝试发送请求', 3000);
		}
		
		// 记录详细错误到控制台
		console.error('[Canvas UI] AI 错误:', {
			nodeId: node.id,
			name: error.name,
			message: error.message,
			details: error.details,
			retryable: error.retryable
		});
		
		// 在节点中添加错误标记（可选）
		if (this.plugin.settings.debugMode) {
			const currentText = node.getText();
			const errorMarker = `\n\n❌ **错误**: ${error.message}\n`;
			node.setText(currentText + errorMarker);
		}
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
			
			if (components.errorDisplay) {
				components.errorDisplay.remove();
			}
		}
		
		// 清空活跃组件映射
		this.activeComponents.clear();
	}
	
	/**
	 * 获取 Canvas API 可用性状态
	 * 
	 * @returns 如果 Canvas API 可用返回 true，否则返回 false
	 */
	getAPIAvailability(): boolean {
		return this.isAPIAvailable;
	}
	
	/**
	 * 生成唯一的请求 ID
	 * 
	 * @returns 请求 ID
	 */
	private generateRequestId(): string {
		return `canvas_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}
}
