/**
 * 可折叠块渲染器
 * 
 * 负责渲染、解析和管理可折叠的内容块。
 * 使用 HTML details/summary 标签实现 Markdown 兼容的可折叠功能。
 */

import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { CollapsibleBlockConfig } from '../types';

/**
 * 可折叠块渲染器类
 * 
 * 提供可折叠块的渲染、解析和状态管理功能。
 */
export class CollapsibleBlockRenderer {
	/**
	 * 渲染可折叠块为 Markdown 字符串
	 * 
	 * @param config - 可折叠块配置
	 * @returns Markdown 格式的可折叠块字符串
	 */
	render(config: CollapsibleBlockConfig): string {
		const { title, content, collapsed, metadata } = config;
		
		// 构建 details 标签，根据 collapsed 决定是否添加 open 属性
		const openAttr = collapsed ? '' : ' open';
		
		// 构建元数据注释（如果有）
		let metadataComment = '';
		if (metadata) {
			const metadataStr = JSON.stringify(metadata);
			metadataComment = `<!-- ai-metadata: ${metadataStr} -->\n`;
		}
		
		// 生成完整的 HTML 结构
		return `${metadataComment}<details${openAttr}>
<summary>${this.escapeHtml(title)}</summary>

${content}

</details>`;
	}
	
	/**
	 * 解析 Markdown 中的可折叠块
	 * 
	 * @param markdown - 包含可折叠块的 Markdown 字符串
	 * @returns 解析出的配置对象，如果不是有效的可折叠块则返回 null
	 */
	parse(markdown: string): CollapsibleBlockConfig | null {
		// 匹配 details/summary 结构
		const detailsRegex = /<details(\s+open)?>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)<\/details>/;
		const match = markdown.match(detailsRegex);
		
		if (!match) {
			return null;
		}
		
		const [, openAttr, title, content] = match;
		
		// 验证必需的捕获组
		if (title === undefined || content === undefined) {
			return null;
		}
		
		const collapsed = !openAttr; // 没有 open 属性表示折叠
		
		// 尝试解析元数据
		let metadata: CollapsibleBlockConfig['metadata'];
		const metadataRegex = /<!--\s*ai-metadata:\s*({.*?})\s*-->/;
		const metadataMatch = markdown.match(metadataRegex);
		
		if (metadataMatch && metadataMatch[1]) {
			try {
				metadata = JSON.parse(metadataMatch[1]);
			} catch (e) {
				// 元数据解析失败，忽略
				console.warn('Failed to parse collapsible block metadata:', e);
			}
		}
		
		return {
			title: this.unescapeHtml(title.trim()),
			content: content.trim(),
			collapsed,
			metadata
		};
	}
	
	/**
	 * 切换可折叠块的折叠状态
	 * 
	 * @param element - details DOM 元素
	 */
	toggle(element: HTMLElement): void {
		if (element.tagName.toLowerCase() !== 'details') {
			console.warn('toggle() called on non-details element');
			return;
		}
		
		const detailsElement = element as HTMLDetailsElement;
		detailsElement.open = !detailsElement.open;
	}
	
	/**
	 * 更新 Markdown 源文件中的折叠状态
	 * 
	 * 这个方法用于将 DOM 中的折叠状态同步回 Markdown 源文件，
	 * 确保状态在文件重新打开时能够恢复。
	 * 
	 * @param markdown - 原始 Markdown 字符串
	 * @param isOpen - 新的展开状态
	 * @returns 更新后的 Markdown 字符串
	 */
	updateMarkdownState(markdown: string, isOpen: boolean): string {
		// 匹配 details 标签
		const detailsRegex = /<details(\s+open)?>/;
		
		if (isOpen) {
			// 添加或保留 open 属性
			return markdown.replace(detailsRegex, '<details open>');
		} else {
			// 移除 open 属性
			return markdown.replace(detailsRegex, '<details>');
		}
	}
	
	/**
	 * 注册 Markdown 后处理器
	 * 
	 * 这个方法注册一个处理器，使得 Obsidian 能够正确渲染和处理可折叠块。
	 * 
	 * @param plugin - Obsidian 插件实例
	 */
	registerProcessor(plugin: Plugin): void {
		// 注册 Markdown 后处理器，处理 details 标签
		plugin.registerMarkdownPostProcessor((element: HTMLElement, context: MarkdownPostProcessorContext) => {
			// 查找所有 details 元素
			const detailsElements = element.querySelectorAll('details');
			
			detailsElements.forEach((details) => {
				// 添加自定义类名以便样式化
				details.addClass('ai-collapsible-block');
				
				// 确保 details 元素可以正确交互
				// Obsidian 的 Markdown 渲染器已经处理了 details/summary 的基本功能
				// 这里我们只需要添加额外的样式和行为
				
				const summary = details.querySelector('summary');
				if (summary) {
					summary.addClass('ai-collapsible-summary');
				}
				
				// 添加内容容器类名
				const content = details.querySelector('summary ~ *');
				if (content) {
					content.addClass('ai-collapsible-content');
				}
			});
		});
	}
	
	/**
	 * 转义 HTML 特殊字符
	 * 
	 * @param text - 要转义的文本
	 * @returns 转义后的文本
	 */
	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
	
	/**
	 * 反转义 HTML 特殊字符
	 * 
	 * @param html - 要反转义的 HTML
	 * @returns 反转义后的文本
	 */
	private unescapeHtml(html: string): string {
		const div = document.createElement('div');
		div.innerHTML = html;
		return div.textContent || '';
	}
}
