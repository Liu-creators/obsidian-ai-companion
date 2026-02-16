/**
 * Canvas Menu Handler
 * 
 * 负责在 Canvas 节点菜单中注册 AI 助手按钮
 * 
 * 验证需求：1.1, 1.2, 1.3
 */

import { Plugin, Menu, Notice, EventRef, WorkspaceLeaf } from 'obsidian';
import type { CanvasUIController } from './canvas-ui-controller';
import type { Canvas, CanvasNode } from '../types/canvas';
import { CanvasInputModal } from './canvas-input-modal';
import type { AIPluginSettings } from '../settings';

/**
 * 扩展的插件接口，包含 settings 属性
 */
interface AIPlugin extends Plugin {
	settings: AIPluginSettings;
}

export class CanvasMenuHandler {
	private plugin: AIPlugin;
	private canvasUIController: CanvasUIController;
	private eventRefs: EventRef[] = [];
	private observers: MutationObserver[] = [];

	constructor(plugin: AIPlugin, uiController: CanvasUIController) {
		this.plugin = plugin;
		this.canvasUIController = uiController;
	}

	/**
	 * 注册节点工具栏按钮
	 * 
	 * 在 Canvas 节点工具栏中添加 "AI 助手" 按钮
	 * 
	 * 验证需求：1.1, 1.2
	 */
	register(): void {
		try {
			const workspace = this.plugin.app.workspace;
			
			// 监听活动叶子变化,当切换到 Canvas 视图时设置观察器
			const activeLeafRef = workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
				if (leaf?.view?.getViewType() === 'canvas') {
					setTimeout(() => {
						this.setupCanvasObserver(leaf);
						this.addToolbarButtonsToAllNodes();
					}, 200);
				}
			});
			
			if (activeLeafRef) {
				this.plugin.registerEvent(activeLeafRef);
				this.eventRefs.push(activeLeafRef);
			}
			
			// 为当前已打开的 Canvas 视图设置观察器
			setTimeout(() => {
				const canvasLeaves = workspace.getLeavesOfType('canvas');
				for (const leaf of canvasLeaves) {
					this.setupCanvasObserver(leaf);
				}
				this.addToolbarButtonsToAllNodes();
			}, 500);
			
			// 同时保留右键菜单功能
			const menuEventRef = (workspace as unknown).on(
				'canvas:node-menu',
				(menu: Menu, node: CanvasNode, canvas: Canvas) => {
					this.handleNodeMenu(menu, node, canvas);
				}
			);
			
			if (menuEventRef) {
				this.plugin.registerEvent(menuEventRef);
				this.eventRefs.push(menuEventRef);
			}
			
			console.log('[Canvas AI] Toolbar button handler registered');
			
			if (this.plugin.settings?.debugMode) {
				console.log('[Canvas AI] Menu handler registered (debug mode)');
			}
		} catch (error) {
			console.error('[Canvas AI] Failed to register canvas events:', error);
			console.error('[Canvas AI] Error stack:', (error as Error).stack);
		}
	}

	/**
	 * 为 Canvas 视图设置 DOM 观察器
	 * 
	 * 监听工具栏的出现,自动添加 AI 按钮
	 */
	private setupCanvasObserver(leaf: WorkspaceLeaf): void {
		try {
			const canvasView = leaf.view as unknown;
			if (!canvasView || !canvasView.canvas) {
				return;
			}
			
			const canvas = canvasView.canvas as Canvas;
			
			// 查找 Canvas 的容器元素
			const canvasWrapper = document.querySelector('.canvas-wrapper');
			if (!canvasWrapper) {
				return;
			}
			
			// 创建 MutationObserver 监听工具栏的出现
			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					if (mutation.type === 'childList') {
						mutation.addedNodes.forEach((node) => {
							if (node instanceof HTMLElement) {
								if (node.classList.contains('canvas-menu-container') || 
								    node.querySelector('.canvas-menu')) {
									this.addToolbarButton(canvas);
								}
							}
						});
					}
					
					if (mutation.type === 'attributes') {
						const target = mutation.target as HTMLElement;
						if (target.classList.contains('canvas-menu-container') || 
						    target.classList.contains('canvas-menu')) {
							this.addToolbarButton(canvas);
						}
					}
				}
			});
			
			observer.observe(canvasWrapper, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ['class', 'style']
			});
			
			this.observers.push(observer);
			
		} catch (error) {
			console.error('[Canvas AI] Failed to setup canvas observer:', error);
		}
	}

	/**
	 * 为所有 Canvas 添加工具栏按钮
	 */
	private addToolbarButtonsToAllNodes(): void {
		try {
			const workspace = this.plugin.app.workspace;
			const canvasLeaves = workspace.getLeavesOfType('canvas');
			
			for (const leaf of canvasLeaves) {
				const canvasView = leaf.view as unknown;
				if (canvasView && canvasView.canvas) {
					const canvas = canvasView.canvas as Canvas;
					this.addToolbarButton(canvas);
				}
			}
		} catch (error) {
			console.error('[Canvas AI] Failed to add toolbar buttons:', error);
		}
	}

	/**
	 * 为 Canvas 工具栏添加 AI 按钮
	 */
	private addToolbarButton(canvas: Canvas): void {
		try {
			// 清理所有节点内可能存在的旧浮动按钮
			const allNodes = document.querySelectorAll('.canvas-node');
			allNodes.forEach(nodeEl => {
				const oldButtons = nodeEl.querySelectorAll('.canvas-ai-button');
				oldButtons.forEach(btn => btn.remove());
			});
			
			const canvasView = document.querySelector('.canvas-wrapper');
			if (!canvasView) return;
			
			const toolbar = canvasView.querySelector('.canvas-menu') as HTMLElement;
			if (!toolbar) return;
			
			// 已有 AI 按钮则跳过
			if (toolbar.querySelector('.canvas-ai-button')) return;
			
			// 在工具栏中创建 AI 助手按钮
			const aiButton = toolbar.createEl('button', {
				cls: 'clickable-icon canvas-ai-button',
				text: 'AI',
				attr: {
					'aria-label': 'Ask AI'
				}
			});
			
			// 添加点击事件
			const self = this;
			aiButton.addEventListener('click', function(e) {
				e.stopPropagation();
				e.preventDefault();
				
				try {
					const workspace = self.plugin.app.workspace;
					const canvasLeaves = workspace.getLeavesOfType('canvas');
					
					if (canvasLeaves.length === 0 || !canvasLeaves[0]) {
						new Notice('请在 Canvas 视图中使用此功能');
						return;
					}
					
					const leaf = canvasLeaves[0];
					const canvasView = leaf.view as unknown;
					const currentCanvas = canvasView.canvas;
					
					if (!currentCanvas) {
						new Notice('无法获取 Canvas 对象');
						return;
					}
					
					const selection = currentCanvas.selection;
					
					if (!selection || selection.size === 0) {
						new Notice('请先选择一个节点');
						return;
					}
					
					const selectedNode = Array.from(selection)[0] as CanvasNode;
					
					if (selectedNode) {
						self.handleMenuClick(selectedNode, currentCanvas);
					}
				} catch (error) {
					console.error('[Canvas AI] Error handling button click:', error);
					new Notice('处理点击事件时出错: ' + (error as Error).message);
				}
			});
			
		} catch (error) {
			console.error('[Canvas AI] Failed to add toolbar button:', error);
		}
	}

	/**
	 * 处理节点菜单事件
	 * 
	 * 在菜单中添加 "AI 助手" 选项
	 * 
	 * @param menu 菜单对象
	 * @param node Canvas 节点
	 * @param canvas Canvas 实例
	 * 
	 * 验证需求：1.1, 1.2, 1.3
	 */
	private handleNodeMenu(menu: Menu, node: CanvasNode, canvas: Canvas): void {
		// 添加分隔符（如果菜单中已有其他项）
		menu.addSeparator();
		
		// 添加 "AI 助手" 菜单项
		menu.addItem((item) => {
			item
				.setTitle('AI 助手')
				.setIcon('bot') // 使用 bot 图标
				.onClick(() => {
					this.handleMenuClick(node, canvas);
				});
		});
	}

	/**
	 * 处理菜单点击事件
	 * 
	 * 打开输入模态框，让用户输入问题
	 * 
	 * @param node 触发的节点
	 * @param canvas Canvas 实例
	 * 
	 * 验证需求：1.3
	 */
	private handleMenuClick(node: CanvasNode, canvas: Canvas): void {
		// 检查 Canvas 是否可用
		if (!canvas) {
			new Notice('Canvas 不可用，请确保在 Canvas 视图中操作');
			return;
		}

		// 检查节点是否有效
		if (!node) {
			new Notice('无法获取节点信息');
			return;
		}

		// 打开输入模态框
		const modal = new CanvasInputModal(
			this.plugin.app,
			node,
			canvas,
			this.plugin.settings,
			(prompt: string, includeRelated: boolean) => {
				// 提交到 UI 控制器处理
				this.canvasUIController.submitPrompt(
					canvas,
					node,
					prompt,
					includeRelated
				);
			}
		);
		
		modal.open();
		
		if (this.plugin.settings?.debugMode) {
			console.log('[Canvas AI] Menu clicked for node:', node.id);
		}
	}

	/**
	 * 清理资源
	 * 
	 * 取消注册所有事件监听器
	 * 
	 * 验证需求：10.8
	 */
	unregister(): void {
		// 断开所有观察器
		for (const observer of this.observers) {
			observer.disconnect();
		}
		this.observers = [];
		
		// 事件引用已通过 plugin.registerEvent 注册
		// Obsidian 会在插件卸载时自动清理
		this.eventRefs = [];
		
		if (this.plugin.settings?.debugMode) {
			console.log('[Canvas AI] Menu handler unregistered');
		}
	}
}
