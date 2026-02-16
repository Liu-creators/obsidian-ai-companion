/**
 * Canvas Input Modal
 * 
 * AI 问题输入弹框 — 输入框铺满弹框，快捷键提示可通过设置控制
 */

import { App, Modal, MarkdownRenderer, Component, Platform } from 'obsidian';
import type { Canvas, CanvasNode } from '../types/canvas';
import { FileSuggestModal } from './file-suggest-modal';
import type { AIPluginSettings, ContextShortcut, CanvasContextShortcut } from '../settings';

export class CanvasInputModal extends Modal {
	private triggerNode: CanvasNode;
	private canvas: Canvas;
	private onSubmit: (prompt: string, includeRelated: boolean) => void;
	private settings: AIPluginSettings;
	private inputEl: HTMLDivElement | null = null;
	private component: Component;
	private isSuggesting: boolean = false;

	constructor(
		app: App,
		triggerNode: CanvasNode,
		canvas: Canvas,
		settings: AIPluginSettings,
		onSubmit: (prompt: string, includeRelated: boolean) => void
	) {
		super(app);
		this.triggerNode = triggerNode;
		this.canvas = canvas;
		this.settings = settings;
		this.onSubmit = onSubmit;
		this.component = new Component();
		this.component.load();
	}

	onOpen(): void {
		const { contentEl, modalEl, containerEl } = this;
		contentEl.empty();
		modalEl.addClass('canvas-ai-modal');
		containerEl.addClass('canvas-ai-modal-container'); // 添加容器类以便自定义定位

		// 创建容器
		const wrapper = contentEl.createDiv({ cls: 'canvas-ai-input-wrapper' });
		
		// 输入框 (contenteditable div)
		this.inputEl = wrapper.createDiv({
			cls: 'canvas-ai-textarea',
			attr: { 
				contenteditable: 'true',
				placeholder: '输入你的问题…' 
			}
		});

		// 注册输入监听，用于触发文件建议和 Chip 转换
		this.registerInputHandler();

		this.registerKeyboardHandlers();
		
		// 调整位置
		this.adjustPosition();

		setTimeout(() => this.inputEl?.focus(), 50);

		// 快捷键提示栏（受设置控制）
		if (this.settings.canvasSettings.showShortcutHints) {
			const bar = contentEl.createDiv({ cls: 'canvas-ai-bar' });
			const keysContainer = bar.createEl('span', { cls: 'canvas-ai-bar-keys' });
			
			// 使用 Canvas 专用快捷键配置，如果未配置则回退到默认
			const shortcuts = this.settings.canvasSettings.shortcuts || [];
			
			// 遍历设置中的快捷键并显示
			shortcuts.forEach((shortcut, index) => {
				if (index > 0) {
					keysContainer.createEl('span', { cls: 'canvas-ai-bar-sep', text: '·' });
				}
				
				// 显示修饰键
				shortcut.modifiers.forEach(mod => {
					let modText = mod;
					if (mod === 'Mod') modText = Platform.isMacOS ? 'Cmd' : 'Ctrl';
					if (mod === 'Shift') modText = '⇧';
					if (mod === 'Alt') modText = Platform.isMacOS ? '⌥' : 'Alt';
					if (mod === 'Ctrl') modText = Platform.isMacOS ? '⌃' : 'Ctrl';
					if (mod === 'Meta' || mod === 'Cmd') modText = Platform.isMacOS ? '⌘' : 'Win';
					
					keysContainer.createEl('kbd', { cls: 'canvas-ai-kbd', text: modText });
				});
				
				// 显示主键
				let keyText = shortcut.key;
				if (keyText === 'Enter') keyText = '⏎';
				keysContainer.createEl('kbd', { cls: 'canvas-ai-kbd', text: keyText });
				
				// 显示标签
				const label = shortcut.displayName || (shortcut.contextType === 'connected-nodes' ? '含关联节点' : '发送');
				keysContainer.createEl('span', { cls: 'canvas-ai-bar-label', text: label });
			});
		}
	}

	private registerInputHandler(): void {
		if (!this.inputEl) return;

		this.inputEl.addEventListener('input', (e) => {
			const selection = window.getSelection();
			if (!selection || !selection.rangeCount) return;
			const range = selection.getRangeAt(0);
			
			// 确保我们在文本节点中
			if (range.startContainer.nodeType !== Node.TEXT_NODE) return;
			
			const textNode = range.startContainer;
			const cursor = range.startOffset;
			const text = textNode.textContent || '';
			
			// 1. 检查是否触发 Chip 转换：]] + 空格
			// 匹配光标前的 [[...]] 模式
			// 注意：text 是整个节点的文本，我们需要检查光标前的内容
			const textBeforeCursor = text.substring(0, cursor) || '';
			
			// 检查是否刚刚输入了空格
			if (textBeforeCursor && textBeforeCursor.endsWith(' ')) {
				// 查找最近的 [[
				const lastOpenBracket = textBeforeCursor.lastIndexOf('[[');
				if (lastOpenBracket !== -1) {
					const potentialLink = textBeforeCursor.substring(lastOpenBracket);
					// 检查是否匹配完整模式 [[...]] (注意结尾的空格已经由 endsWith 检查)
					// 正则：\[\[([^\]]+)\]\] $
					const match = potentialLink.match(/^\[\[([^\]]+)\]\]\s$/);
					
					if (match) {
						const linkText = match[1];
						const fullMatch = match[0]; // "[[link]] "
						
						// 执行替换：将 [[link]] 替换为 Chip
						// 1. 分割文本节点
						// textNodeSplit -> textNode (before) + textNode (after)
						// 我们需要切分出 link 部分
						
						// 计算替换范围
						const startOffset = lastOpenBracket;
						const endOffset = cursor; // 包含空格
						
						// 创建 Chip 元素
						const chip = document.createElement('span');
						chip.className = 'canvas-ai-link';
						chip.textContent = linkText || ''; // 显示文本
						chip.dataset.markdown = `[[${linkText}]]`; // 原始 markdown
						chip.contentEditable = 'false'; // Chip 作为一个整体，不可编辑内部
						
						// 替换逻辑
						// 将 textNode 分割为：prefix + link + suffix
						const afterText = text.substring(endOffset);
						const beforeText = text.substring(0, startOffset);
						
						textNode.textContent = beforeText;
						
						// 插入 Chip
						if (textNode.nextSibling) {
							textNode.parentNode?.insertBefore(chip, textNode.nextSibling);
						} else {
							textNode.parentNode?.appendChild(chip);
						}
						
						// 插入空格（Chip 后需要一个空格以便继续输入）
						const spaceNode = document.createTextNode(' ');
						if (chip.nextSibling) {
							chip.parentNode?.insertBefore(spaceNode, chip.nextSibling);
						} else {
							chip.parentNode?.appendChild(spaceNode);
						}
						
						// 恢复后缀文本
						if (afterText) {
							const afterNode = document.createTextNode(afterText);
							if (spaceNode.nextSibling) {
								spaceNode.parentNode?.insertBefore(afterNode, spaceNode.nextSibling);
							} else {
								spaceNode.parentNode?.appendChild(afterNode);
							}
						}
						
						// 移动光标到空格后
						const newRange = document.createRange();
						newRange.setStart(spaceNode, 1); // 空格后
						newRange.setEnd(spaceNode, 1);
						selection.removeAllRanges();
						selection.addRange(newRange);
						
						return; // 处理完成，不再继续检查建议
					}
				}
			}

			// 2. 检查是否触发文件建议：[[
			// 检查光标前两个字符是否是 [[
			if (cursor >= 2 && text.substring(cursor - 2, cursor) === '[[') {
				// 获取光标相对于视口的坐标
				const rect = range.getBoundingClientRect();
				const modalTop = rect.bottom + 10;
				const modalLeft = rect.left;
				
				// 打开文件建议模态框
				const suggestModal = new FileSuggestModal(this.app, (file) => {
					// 生成链接
					// const link = this.app.fileManager.generateMarkdownLink(file, '');
					// 简化处理：直接使用 [[文件名]] 格式，后续由 Chip 逻辑处理
					// 或者直接插入 Chip？
					// 用户要求：选择文档后立即展示。我们可以直接插入 Chip。
					
					const linkText = file.basename; // 或者使用完整路径/别名
					
					// 创建 Chip
					const chip = document.createElement('span');
					chip.className = 'canvas-ai-link';
					chip.textContent = linkText;
					chip.dataset.markdown = `[[${linkText}]]`;
					chip.contentEditable = 'false';
					
					// 替换 [[ 
					// 当前 textNode 内容是 ...[[...
					// 我们需要替换掉 [[ 以及可能已输入的搜索词
					// 注意：此时 input 可能已经变化（用户继续输入），重新获取 range
					// 简单起见，我们假设用户还在原来的位置
					// 为了稳健性，我们重新获取 selection
					const currentSel = window.getSelection();
					if (!currentSel || !currentSel.rangeCount) return;
					const currentRange = currentSel.getRangeAt(0);
					if (currentRange.startContainer !== textNode) {
						// 焦点变了，简单追加？或者放弃
						return;
					}
					
					const currentCursor = currentRange.startOffset;
					const currentText = textNode.textContent || '';
					
					// 找到 [[ 的位置
					// 从当前光标往前找
					const openBracketIndex = currentText.lastIndexOf('[[', currentCursor);
					if (openBracketIndex === -1) return;
					
					const beforeText = currentText.substring(0, openBracketIndex);
					const afterText = currentText.substring(currentCursor);
					
					textNode.textContent = beforeText;
					
					// 插入 Chip
					if (textNode.nextSibling) {
						textNode.parentNode?.insertBefore(chip, textNode.nextSibling);
					} else {
						textNode.parentNode?.appendChild(chip);
					}
					
					// 插入空格
					const spaceNode = document.createTextNode(' ');
					if (chip.nextSibling) {
						chip.parentNode?.insertBefore(spaceNode, chip.nextSibling);
					} else {
						chip.parentNode?.appendChild(spaceNode);
					}
					
					// 恢复后缀
					if (afterText) {
						const afterNode = document.createTextNode(afterText);
						if (spaceNode.nextSibling) {
							spaceNode.parentNode?.insertBefore(afterNode, spaceNode.nextSibling);
						} else {
							spaceNode.parentNode?.appendChild(afterNode);
						}
					}
					
					// 移动光标
					const newRange = document.createRange();
					newRange.setStart(spaceNode, 1);
					newRange.setEnd(spaceNode, 1);
					currentSel.removeAllRanges();
					currentSel.addRange(newRange);
					
					// 重新聚焦
					this.inputEl?.focus();
				});
				
				// 标记为正在建议模式
				this.isSuggesting = true;
				
				// 设置弹窗样式和位置
				const modalEl = suggestModal.modalEl;
				modalEl.style.position = 'fixed';
				modalEl.style.top = `${modalTop}px`;
				modalEl.style.left = `${modalLeft}px`;
				modalEl.style.margin = '0';
				modalEl.style.width = '500px';
				modalEl.style.maxHeight = '300px';
				
				suggestModal.open();

				// 强制保持焦点在主输入框
				const keepFocus = () => {
					if (document.body.contains(modalEl) && document.activeElement !== this.inputEl) {
						this.inputEl?.focus();
					}
				};
				
				const focusInterval = setInterval(keepFocus, 50);

				// 监听建议框关闭
				const cleanup = () => {
					this.isSuggesting = false;
					clearInterval(focusInterval);
					this.inputEl?.removeEventListener('input', syncInput);
					this.inputEl?.removeEventListener('keydown', handleKeydown);
				};

				const originalClose = suggestModal.close.bind(suggestModal);
				suggestModal.close = () => {
					cleanup();
					originalClose();
				};

				// 同步输入
				const syncInput = (e: Event) => {
					if (!document.body.contains(modalEl)) {
						cleanup();
						return;
					}
					
					// 获取当前搜索词
					const sel = window.getSelection();
					if (!sel?.rangeCount) return;
					const r = sel.getRangeAt(0);
					if (r.startContainer !== textNode) {
						suggestModal.close();
						return;
					}
					
					const currText = textNode.textContent || '';
					const currCursor = r.startOffset;
					
					// 检查 [[ 是否还在
					// 我们记录了初始 cursor 对应的 [[ 位置，但现在内容变了
					// 简单检查：光标前是否有 [[
					const lastOpen = currText.lastIndexOf('[[', currCursor);
					if (lastOpen === -1) {
						suggestModal.close();
						return;
					}
					
					const query = currText.substring(lastOpen + 2, currCursor);
					
					// @ts-ignore
					const suggestInput = suggestModal.inputEl;
					if (suggestInput) {
						suggestInput.value = query;
						suggestInput.dispatchEvent(new Event('input', { bubbles: true }));
					}
				};

				// 键盘处理
				const handleKeydown = (e: KeyboardEvent) => {
					if (!document.body.contains(modalEl)) return;

					if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
						e.preventDefault();
						e.stopPropagation();
						
						// @ts-ignore
						const suggestInput = suggestModal.inputEl;
						if (suggestInput) {
							suggestInput.dispatchEvent(new KeyboardEvent('keydown', {
								key: e.key,
								code: e.code,
								bubbles: true
							}));
						}
					} else if (e.key === 'Escape') {
						suggestModal.close();
					} else {
						this.inputEl?.focus();
					}
				};

				this.inputEl?.addEventListener('input', syncInput);
				this.inputEl?.addEventListener('keydown', handleKeydown);
			}
		});
	}

	private getInputValue(): string {
		if (!this.inputEl) return '';
		
		let value = '';
		// 遍历子节点构建 markdown
		this.inputEl.childNodes.forEach(node => {
			if (node.nodeType === Node.TEXT_NODE) {
				value += node.textContent;
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.classList.contains('canvas-ai-link')) {
					value += el.dataset.markdown || el.textContent;
				} else if (el.tagName === 'DIV') {
					// Chrome contenteditable 换行会产生 div
					value += '\n' + (el.textContent || '');
				} else if (el.tagName === 'BR') {
					value += '\n';
				} else {
					value += el.textContent;
				}
			}
		});
		return value;
	}

	private registerKeyboardHandlers(): void {
		if (!this.inputEl) return;
		this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
			const shortcuts = this.settings.canvasSettings.shortcuts || [];
			
			// 检查是否匹配任何配置的快捷键
			for (const shortcut of shortcuts) {
				if (this.isShortcutMatch(e, shortcut)) {
					e.preventDefault();
					e.stopPropagation();
					
					// contextType: 'connected-nodes' 对应 "含关联节点" (includeRelated = true)
					const includeRelated = shortcut.contextType === 'connected-nodes';
					this.handleSubmit(includeRelated);
					return;
				}
			}
		});
	}

	private isShortcutMatch(e: KeyboardEvent, shortcut: CanvasContextShortcut | ContextShortcut): boolean {
		// 检查按键是否匹配 (忽略大小写)
		if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
		
		// 检查修饰键状态
		const isShift = e.shiftKey;
		const isCtrl = e.ctrlKey;
		const isAlt = e.altKey;
		const isMeta = e.metaKey;
		
		// 解析配置的修饰键
		let reqShift = false;
		let reqCtrl = false;
		let reqAlt = false;
		let reqMeta = false;
		
		for (const mod of shortcut.modifiers) {
			if (mod === 'Shift') reqShift = true;
			else if (mod === 'Ctrl') reqCtrl = true;
			else if (mod === 'Alt') reqAlt = true;
			else if (mod === 'Meta' || mod === 'Cmd') reqMeta = true;
			else if (mod === 'Mod') {
				if (Platform.isMacOS) reqMeta = true;
				else reqCtrl = true;
			}
		}
		
		// 必须精确匹配：请求的修饰键必须按下，未请求的必须未按下
		return isShift === reqShift && 
			   isCtrl === reqCtrl && 
			   isAlt === reqAlt && 
			   isMeta === reqMeta;
	}

	private handleSubmit(includeRelated: boolean): void {
		if (!this.inputEl) return;
		const prompt = this.getInputValue().trim();
		if (!prompt) {
			this.inputEl.addClass('canvas-ai-textarea--error');
			const originalText = this.inputEl.innerText;
			
			// 简单的占位符模拟
			this.inputEl.innerText = '请输入问题后再提交';
			this.inputEl.style.color = 'var(--text-faint)';
			
			setTimeout(() => {
				if (this.inputEl) {
					this.inputEl.removeClass('canvas-ai-textarea--error');
					this.inputEl.innerText = originalText;
					this.inputEl.style.color = '';
				}
			}, 1500);
			return;
		}
		this.onSubmit(prompt, includeRelated);
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
		this.component.unload();
	}

	private adjustPosition(): void {
		// 1. 确定目标矩形（单个节点或多选包围盒）
		let targetRect: { left: number; top: number; width: number; height: number; right: number; bottom: number } | null = null;
		
		const selection = this.canvas.selection;
		// 检查是否有多选，并且 triggerNode 在选中集合中
		// 如果 selection 包含 triggerNode，则使用 selection 的包围盒
		// 否则只使用 triggerNode
		
		const isMultiSelection = selection && selection.size > 1 && selection.has(this.triggerNode);

		if (isMultiSelection) {
			let minLeft = Infinity;
			let minTop = Infinity;
			let maxRight = -Infinity;
			let maxBottom = -Infinity;
			let count = 0;

			selection.forEach((node) => {
				const nodeEl = node.nodeEl;
				if (nodeEl) {
					const rect = nodeEl.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) {
						minLeft = Math.min(minLeft, rect.left);
						minTop = Math.min(minTop, rect.top);
						maxRight = Math.max(maxRight, rect.right);
						maxBottom = Math.max(maxBottom, rect.bottom);
						count++;
					}
				}
			});

			if (count > 0) {
				targetRect = {
					left: minLeft,
					top: minTop,
					width: maxRight - minLeft,
					height: maxBottom - minTop,
					right: maxRight,
					bottom: maxBottom
				};
			}
		}

		// 回退到单节点
		if (!targetRect) {
			const node = this.triggerNode;
			const nodeEl = node.nodeEl;
			if (!nodeEl) return;
			const rect = nodeEl.getBoundingClientRect();
			targetRect = {
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height,
				right: rect.right,
				bottom: rect.bottom
			};
		}

		const containerRect = this.containerEl.getBoundingClientRect();
		const modalWidth = 520;
		
		// 计算 Left: 目标区域中心对齐
		let left = targetRect.left + (targetRect.width / 2) - (modalWidth / 2);
		
		// 边界检查 X
		if (left < 20) left = 20;
		if (left + modalWidth > containerRect.width - 20) {
			left = containerRect.width - modalWidth - 20;
		}

		// 计算 Top: 目标区域下方
		let top = targetRect.bottom + 12;

		// 简单边界检查 Y
		if (top + 200 > containerRect.height) {
			// 如果上方有空间，且下方空间不足，则放上方
			if (targetRect.top > 220) {
				top = Math.max(20, containerRect.height - 220);
			}
		}

		this.modalEl.style.position = 'absolute';
		this.modalEl.style.left = `${left}px`;
		this.modalEl.style.top = `${top}px`;
		this.modalEl.style.margin = '0';
	}
}
