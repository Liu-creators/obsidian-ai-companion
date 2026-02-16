/**
 * AI 编辑器建议
 * 
 * 继承 Obsidian 的 EditorSuggest 类，实现 AI 触发和建议功能。
 * 当用户在编辑器中输入 `/` 时，显示 AI 建议界面并捕获后续输入作为 prompt。
 * 
 * **验证需求：2.1, 2.3, 2.4, 2.5, 2.7**
 */

import { App, Editor, EditorPosition, EditorSuggest, TFile, Scope, Modifier } from 'obsidian';
import { AISuggestion } from '../types';
import { EditorUIController } from '../ui/editor-ui-controller';
import type MyPlugin from '../main';
import type { ContextShortcut } from '../settings';

/**
 * EditorSuggestContext 接口
 * 
 * 从 Obsidian API 导入的上下文接口
 */
interface EditorSuggestContext {
	editor: Editor;
	file: TFile;
	start: EditorPosition;
	end: EditorPosition;
	query: string;
}

/**
 * EditorSuggestTriggerInfo 接口
 * 
 * 触发信息接口
 */
interface EditorSuggestTriggerInfo {
	start: EditorPosition;
	end: EditorPosition;
	query: string;
}

/**
 * AI 编辑器建议类
 * 
 * 实现基于 `/` 触发符的 AI 建议功能。
 */
export class AIEditorSuggest extends EditorSuggest<AISuggestion> {
	private plugin: MyPlugin;
	private editorUIController: EditorUIController;
	
	constructor(app: App, plugin: MyPlugin, editorUIController: EditorUIController) {
		super(app);
		this.plugin = plugin;
		this.editorUIController = editorUIController;
		
		// 自定义建议弹窗的类名，用于样式定制
		// @ts-ignore - 访问受保护的属性
		this.suggestEl.addClass('ai-editor-suggest');
	}
	
	/**
	 * 重写 open 方法以添加自定义键盘处理
	 */
	open(): void {
		super.open();
		
		// 获取建议框的 scope
		const scope = (this as unknown).scope as Scope;
		if (scope) {
			// 为每个配置的快捷键注册处理器
			for (const shortcut of this.plugin.settings.contextShortcuts) {
				// 跳过无修饰符的 Enter（这是默认行为）
				if (shortcut.modifiers.length === 0 && shortcut.key === 'Enter') {
					continue;
				}
				
				// 注册快捷键
				scope.register(shortcut.modifiers as Modifier[], shortcut.key, (evt: KeyboardEvent) => {
					evt.preventDefault();
					evt.stopPropagation();
					
					// 获取当前上下文和建议
					if (this.context) {
						const suggestions = this.getSuggestions(this.context);
						if (suggestions && suggestions.length > 0) {
							const suggestion = suggestions[0];
							if (suggestion) {
								// 手动触发选择，并传递事件和上下文类型
								this.selectSuggestionWithContext(suggestion, evt, shortcut.contextType);
								this.close();
							}
						}
					}
					
					return false;
				});
			}
		}
	}
	
	/**
	 * 带上下文类型的选择建议
	 * 
	 * @param suggestion 建议项
	 * @param evt 键盘事件
	 * @param contextType 上下文类型
	 */
	private selectSuggestionWithContext(
		suggestion: AISuggestion,
		_evt: KeyboardEvent,
		contextType: 'none' | 'before-cursor' | 'settings'
	): void {
		const context = this.context;
		if (!context) {
			return;
		}
		
		const editor = context.editor;
		const prompt = suggestion.prompt;
		
		if (!prompt || prompt.trim().length === 0) {
			return;
		}
		
		// 删除触发文本
		editor.replaceRange('', context.start, context.end);
		
		// 根据上下文类型提交
		const includeBeforeContext = contextType === 'before-cursor';
		const useSettings = contextType === 'settings';
		
		this.editorUIController.submitPrompt(
			editor,
			prompt,
			context.start,
			includeBeforeContext,
			useSettings
		);
		
		if (this.plugin.settings.debugMode) {
			console.log('[AI Editor Suggest] 提交 prompt:', prompt, '上下文类型:', contextType);
		}
	}
	
	/**
	 * 检测触发符
	 * 
	 * 在每次按键时调用，检测是否应该触发 AI 建议。
	 * 性能关键：尽早返回 null 以避免影响编辑器性能。
	 * 
	 * **验证需求：2.1, 2.7**
	 * 
	 * @param cursor 光标位置
	 * @param editor 编辑器实例
	 * @param file 当前文件
	 * @returns 触发信息或 null
	 */
	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile | null
	): EditorSuggestTriggerInfo | null {
		// 性能优化：如果没有文件，尽早返回
		if (!file) {
			return null;
		}
		
		// 获取当前行的文本
		const line = editor.getLine(cursor.line);
		
		// 性能优化：如果光标在行首，不可能有触发符
		if (cursor.ch === 0) {
			return null;
		}
		
		// 获取光标前的文本
		const textBeforeCursor = line.substring(0, cursor.ch);
		
		// 使用正则表达式匹配 `/` 触发符
		// 修改后的匹配模式：行首或空格后的 `/`，后面可以包含任意字符（包括空格）
		// 这样可以支持包含空格的双链，如 [[My Document]]
		const triggerRegex = /(?:^|\s)(\/(.*)?)$/;
		const match = triggerRegex.exec(textBeforeCursor);
		
		// 性能优化：如果没有匹配，尽早返回
		if (!match || !match[1]) {
			return null;
		}
		
		// 提取匹配的文本
		const matchedText = match[1]; // 包含 `/` 的完整匹配
		const query = match[2] || ''; // 去掉 `/` 后的查询文本（可能包含空格）
		
		// 计算触发位置
		const startCh = cursor.ch - matchedText.length;
		const start: EditorPosition = {
			line: cursor.line,
			ch: startCh
		};
		
		const end: EditorPosition = {
			line: cursor.line,
			ch: cursor.ch
		};
		
		return {
			start,
			end,
			query
		};
	}
	
	/**
	 * 获取建议列表
	 * 
	 * 根据上下文生成 AI 建议项。
	 * 
	 * **验证需求：2.3**
	 * 
	 * @param context 编辑器建议上下文
	 * @returns 建议项数组
	 */
	getSuggestions(context: EditorSuggestContext): AISuggestion[] {
		const query = context.query;
		
		// 创建 AI 建议项
		const suggestion: AISuggestion = {
			type: 'ai-prompt',
			prompt: query,
			displayText: query || '输入您的问题...'
		};
		
		return [suggestion];
	}
	
	/**
	 * 渲染建议项
	 * 
	 * 在建议列表中显示建议项。
	 * 
	 * @param suggestion 建议项
	 * @param el HTML 元素
	 */
	renderSuggestion(suggestion: AISuggestion, el: HTMLElement): void {
		// 清空元素
		el.empty();
		el.addClass('ai-suggestion-item');
		
		// 添加图标
		const icon = el.createSpan({ cls: 'ai-suggestion-icon' });
		icon.setText('✨');
		
		// 添加文本容器
		const textContainer = el.createDiv({ cls: 'ai-suggestion-text-container' });
		
		// 添加主文本
		const text = textContainer.createSpan({ 
			cls: suggestion.prompt ? 'ai-suggestion-text' : 'ai-suggestion-text is-empty'
		});
		text.setText(suggestion.displayText);
		
		// 生成快捷键提示
		const shortcutHints = this.generateShortcutHints();
		
		// 显示快捷键提示
		const hint = textContainer.createSpan({ cls: 'ai-suggestion-hint' });
		hint.setText(shortcutHints);
		
		// 添加快捷键提示
		const hotkey = el.createSpan({ cls: 'ai-suggestion-hotkey' });
		hotkey.setText('↵');
	}
	
	/**
	 * 生成快捷键提示文本
	 * 
	 * @returns 快捷键提示字符串
	 */
	private generateShortcutHints(): string {
		const hints: string[] = [];
		
		for (const shortcut of this.plugin.settings.contextShortcuts) {
			const keyCombo = this.formatShortcut(shortcut);
			const contextName = this.getContextTypeName(shortcut.contextType);
			hints.push(`${keyCombo}: ${contextName}`);
		}
		
		return hints.join(' | ');
	}
	
	/**
	 * 格式化快捷键显示
	 * 
	 * @param shortcut 快捷键配置
	 * @returns 格式化的快捷键字符串
	 */
	private formatShortcut(shortcut: ContextShortcut): string {
		const parts = shortcut.modifiers.map((mod: string) => {
			// 在 Mac 上将 Mod 显示为 Cmd，其他平台显示为 Ctrl
			if (mod === 'Mod') {
				return this.isMac() ? 'Cmd' : 'Ctrl';
			}
			return mod;
		});
		
		if (shortcut.modifiers.length === 0) {
			return shortcut.key;
		}
		return [...parts, shortcut.key].join('+');
	}
	
	/**
	 * 检测是否为 Mac 平台
	 */
	private isMac(): boolean {
		return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	}
	
	/**
	 * 获取上下文类型的显示名称
	 * 
	 * @param contextType 上下文类型
	 * @returns 显示名称
	 */
	private getContextTypeName(contextType: string): string {
		const names: Record<string, string> = {
			'none': '无上下文',
			'before-cursor': '包含上文',
			'settings': '遵循设置'
		};
		return names[contextType] || contextType;
	}
	
	/**
	 * 选择建议
	 * 
	 * 当用户选择建议或按下 Enter 键时调用。
	 * 提交 prompt 到 AI 服务。
	 * 
	 * **验证需求：2.4**
	 * 
	 * @param suggestion 选中的建议项
	 * @param evt 鼠标或键盘事件
	 */
	selectSuggestion(suggestion: AISuggestion, _evt: MouseEvent | KeyboardEvent): void {
		// 获取当前上下文
		const context = this.context;
		if (!context) {
			return;
		}
		
		const editor = context.editor;
		const prompt = suggestion.prompt;
		
		// 如果 prompt 为空，不提交
		if (!prompt || prompt.trim().length === 0) {
			return;
		}
		
		// 查找匹配的快捷键配置（默认 Enter）
		const defaultShortcut = this.plugin.settings.contextShortcuts.find(
			s => s.modifiers.length === 0 && s.key === 'Enter'
		);
		
		// 删除触发文本（包括 `/`）
		editor.replaceRange(
			'',
			context.start,
			context.end
		);
		
		// 根据默认快捷键配置提交
		if (defaultShortcut) {
			const includeBeforeContext = defaultShortcut.contextType === 'before-cursor';
			const useSettings = defaultShortcut.contextType === 'settings';
			
			this.editorUIController.submitPrompt(
				editor,
				prompt,
				context.start,
				includeBeforeContext,
				useSettings
			);
			
			if (this.plugin.settings.debugMode) {
				console.log('[AI Editor Suggest] 提交 prompt (Enter):', prompt, '上下文类型:', defaultShortcut.contextType);
			}
		} else {
			// 如果没有配置默认快捷键，使用旧的行为（遵循设置）
			this.editorUIController.submitPrompt(editor, prompt, context.start, false, true);
			
			if (this.plugin.settings.debugMode) {
				console.log('[AI Editor Suggest] 提交 prompt (Enter - 默认):', prompt);
			}
		}
	}
}
