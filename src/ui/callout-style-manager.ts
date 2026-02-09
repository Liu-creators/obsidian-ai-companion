/**
 * Callout 样式管理器
 * 
 * 负责动态注入和更新自定义 callout 类型的 CSS 样式。
 */

import type MyPlugin from '../main';

/**
 * Callout 样式管理器类
 * 
 * 管理 AI callout 的自定义样式，支持动态更新颜色。
 */
export class CalloutStyleManager {
	private plugin: MyPlugin;
	private styleEl: HTMLStyleElement | null = null;
	
	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
	}
	
	/**
	 * 初始化样式
	 * 
	 * 在插件加载时调用，注入自定义 callout 样式。
	 */
	initialize(): void {
		this.injectStyles();
	}
	
	/**
	 * 更新样式
	 * 
	 * 当用户修改颜色设置时调用。
	 */
	updateStyles(): void {
		this.injectStyles();
	}
	
	/**
	 * 注入 CSS 样式
	 * 
	 * 创建或更新 style 元素，定义自定义 callout 类型。
	 */
	private injectStyles(): void {
		// 如果已存在 style 元素，先移除
		if (this.styleEl) {
			this.styleEl.remove();
		}
		
		// 创建新的 style 元素
		this.styleEl = document.createElement('style');
		this.styleEl.id = 'ai-plugin-callout-styles';
		
		// 获取用户设置的颜色
		const streamingColor = this.plugin.settings.streamingColor;
		const completeColor = this.plugin.settings.completeColor;
		
		// 生成 CSS
		this.styleEl.textContent = `
			/* AI 输出中 callout 样式 */
			.callout[data-callout="ai-streaming"] {
				--callout-color: ${streamingColor};
				--callout-icon: lucide-loader;
			}
			
			/* AI 输出完成 callout 样式 */
			.callout[data-callout="ai-complete"] {
				--callout-color: ${completeColor};
				--callout-icon: lucide-sparkles;
			}
		`;
		
		// 添加到 document head
		document.head.appendChild(this.styleEl);
		
		if (this.plugin.settings.debugMode) {
			console.log('[Callout Style Manager] 样式已注入:', {
				streamingColor,
				completeColor
			});
		}
	}
	
	/**
	 * 清理样式
	 * 
	 * 在插件卸载时调用，移除注入的样式。
	 */
	cleanup(): void {
		if (this.styleEl) {
			this.styleEl.remove();
			this.styleEl = null;
		}
	}
}
