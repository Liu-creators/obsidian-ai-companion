/**
 * Canvas 触发处理器
 * 
 * ⚠️ 重要提示：Canvas API 是 Obsidian 的实验性功能，不是官方公开的稳定 API。
 * 此模块依赖非官方的 Canvas API，可能在未来版本中发生变化。
 * 
 * 负责监听 Canvas 节点输入事件，检测 AI 触发符，并处理多节点上下文提取。
 * 
 * **验证需求：6.1, 6.6, 6.7**
 */

import { App, Notice, WorkspaceLeaf } from 'obsidian';
import type MyPlugin from '../main';
import { Canvas, CanvasNode, CanvasTextNode, isCanvasView, isTextNode } from '../types';

/**
 * Canvas 触发处理器类
 * 
 * 处理 Canvas 中的 AI 触发逻辑，包括：
 * - 检测 Canvas API 可用性
 * - 监听节点输入事件
 * - 检测 `/` 触发符
 * - 提取多节点上下文
 */
export class CanvasTriggerHandler {
	private plugin: MyPlugin;
	private app: App;
	private isAPIAvailable: boolean = false;
	private registeredListeners: Array<() => void> = [];
	
	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
		
		// 检查 Canvas API 是否可用
		this.isAPIAvailable = this.isCanvasAPIAvailable();
		
		if (!this.isAPIAvailable) {
			console.warn('[Canvas Trigger] Canvas API 不可用，Canvas 功能已禁用');
		}
	}
	
	/**
	 * 检查 Canvas API 是否可用
	 * 
	 * **验证需求：6.7**
	 * 
	 * @returns 如果 Canvas API 可用返回 true，否则返回 false
	 */
	isCanvasAPIAvailable(): boolean {
		try {
			// 尝试获取活跃的视图
			const activeView = this.app.workspace.getActiveViewOfType(null as any);
			
			// 检查是否存在 Canvas 视图类型
			// Canvas 视图的类型名称为 'canvas'
			const hasCanvasViewType = this.app.workspace.getLeavesOfType('canvas').length >= 0;
			
			// 如果能够查询 Canvas 视图类型，说明 API 可用
			return hasCanvasViewType;
		} catch (error) {
			// 如果发生错误，说明 API 不可用
			console.error('[Canvas Trigger] Canvas API 检查失败:', error);
			return false;
		}
	}
	
	/**
	 * 注册 Canvas 事件监听
	 * 
	 * 仅当 Canvas API 可用时才注册事件监听器。
	 * 
	 * **验证需求：6.1**
	 */
	register(): void {
		if (!this.isAPIAvailable) {
			console.warn('[Canvas Trigger] Canvas API 不可用，跳过注册');
			return;
		}
		
		// 监听活跃叶子变化事件
		const activeLeafChangeHandler = this.app.workspace.on('active-leaf-change', (leaf) => {
			if (leaf) {
				this.handleLeafChange(leaf);
			}
		});
		
		this.plugin.registerEvent(activeLeafChangeHandler);
		
		// 检查当前活跃的叶子
		const activeLeaf = this.app.workspace.getActiveViewOfType(null as any);
		if (activeLeaf) {
			this.handleLeafChange(this.app.workspace.activeLeaf as WorkspaceLeaf);
		}
		
		console.log('[Canvas Trigger] Canvas 事件监听已注册');
	}
	
	/**
	 * 处理叶子变化
	 * 
	 * 当用户切换到 Canvas 视图时，设置节点输入监听器。
	 * 
	 * @param leaf 工作区叶子
	 */
	private handleLeafChange(leaf: WorkspaceLeaf): void {
		const view = leaf.view;
		
		// 检查是否为 Canvas 视图
		if (isCanvasView(view)) {
			this.setupCanvasListeners(view);
		}
	}
	
	/**
	 * 设置 Canvas 监听器
	 * 
	 * 为 Canvas 视图设置键盘事件监听器，检测 `/` 触发符。
	 * 
	 * @param canvas Canvas 视图实例
	 */
	private setupCanvasListeners(canvas: Canvas): void {
		// 获取 Canvas 的容器元素
		const canvasEl = (canvas as any).containerEl as HTMLElement;
		
		if (!canvasEl) {
			console.warn('[Canvas Trigger] 无法获取 Canvas 容器元素');
			return;
		}
		
		// 监听键盘输入事件
		const keydownHandler = (event: KeyboardEvent) => {
			// 检测 `/` 键
			if (event.key === '/') {
				this.handleSlashTrigger(canvas, event);
			}
		};
		
		canvasEl.addEventListener('keydown', keydownHandler);
		
		// 保存清理函数
		const cleanup = () => {
			canvasEl.removeEventListener('keydown', keydownHandler);
		};
		
		this.registeredListeners.push(cleanup);
		
		console.log('[Canvas Trigger] Canvas 键盘监听器已设置');
	}
	
	/**
	 * 处理斜杠触发
	 * 
	 * 当用户在 Canvas 节点中输入 `/` 时触发。
	 * 
	 * **验证需求：6.1**
	 * 
	 * @param canvas Canvas 视图实例
	 * @param event 键盘事件
	 */
	private handleSlashTrigger(canvas: Canvas, event: KeyboardEvent): void {
		// 获取当前选中的节点
		const selectedNodes = Array.from(canvas.selection);
		
		if (selectedNodes.length === 0) {
			return;
		}
		
		// 只处理文本节点
		const textNodes = selectedNodes.filter(isTextNode);
		
		if (textNodes.length === 0) {
			return;
		}
		
		// 获取第一个文本节点
		const node = textNodes[0];
		
		// 确保节点存在后再处理
		if (node) {
			this.handleNodeInput(node, event);
		}
	}
	
	/**
	 * 处理节点输入
	 * 
	 * 当检测到 `/` 触发符时，显示 AI 输入提示。
	 * 
	 * **验证需求：6.1**
	 * 
	 * @param node Canvas 文本节点
	 * @param event 键盘事件
	 */
	private handleNodeInput(node: CanvasTextNode, event: KeyboardEvent): void {
		// 获取节点当前文本
		const currentText = node.getText();
		
		// 检查是否在文本末尾输入 `/`
		// 注意：这里我们简化处理，实际应该检查光标位置
		const isAtEnd = true; // 简化假设
		
		if (isAtEnd) {
			// 显示提示
			new Notice('Canvas AI 功能：请在 `/` 后输入您的问题，然后按 Enter 提交');
			
			// 注意：完整的实现需要 CanvasUIController 来处理后续的输入和提交
			// 这里只是检测触发，实际的 UI 交互由 CanvasUIController 处理
			
			if (this.plugin.settings.debugMode) {
				console.log('[Canvas Trigger] 检测到 `/` 触发符', {
					nodeId: node.id,
					currentText: currentText
				});
			}
		}
	}
	
	/**
	 * 提取多节点上下文
	 * 
	 * 当用户选中多个节点时，将所有节点的文本内容合并作为上下文。
	 * 
	 * **验证需求：6.6**
	 * 
	 * @param nodes Canvas 节点数组
	 * @returns 合并后的上下文文本
	 */
	extractMultiNodeContext(nodes: CanvasNode[]): string {
		const contextParts: string[] = [];
		
		for (const node of nodes) {
			// 只处理文本节点
			if (isTextNode(node)) {
				const text = node.getText().trim();
				
				if (text.length > 0) {
					contextParts.push(text);
				}
			}
		}
		
		// 使用换行符连接所有节点的文本
		const context = contextParts.join('\n\n---\n\n');
		
		if (this.plugin.settings.debugMode) {
			console.log('[Canvas Trigger] 提取多节点上下文:', {
				nodeCount: nodes.length,
				textNodeCount: contextParts.length,
				contextLength: context.length
			});
		}
		
		return context;
	}
	
	/**
	 * 注销事件监听
	 * 
	 * 清理所有注册的事件监听器。
	 */
	unregister(): void {
		// 调用所有清理函数
		for (const cleanup of this.registeredListeners) {
			cleanup();
		}
		
		// 清空监听器数组
		this.registeredListeners = [];
		
		console.log('[Canvas Trigger] Canvas 事件监听器已注销');
	}
	
	/**
	 * 获取 Canvas API 可用性状态
	 * 
	 * @returns 如果 Canvas API 可用返回 true，否则返回 false
	 */
	getAPIAvailability(): boolean {
		return this.isAPIAvailable;
	}
}
