/**
 * 命令注册器
 * 
 * 负责注册所有 Obsidian 命令到命令面板，并配置快捷键。
 * 
 * **验证需求：8.1, 8.2, 8.3**
 */

import { Editor } from 'obsidian';
import { EditorUIController } from '../ui/editor-ui-controller';
import type MyPlugin from '../main';

/**
 * 命令注册器类
 * 
 * 管理插件的所有命令注册
 */
export class CommandRegistry {
	private plugin: MyPlugin;
	
	constructor(plugin: MyPlugin, _editorUIController: EditorUIController) {
		this.plugin = plugin;
	}
	
	/**
	 * 注册所有命令
	 * 
	 * 在插件加载时调用，注册所有可用的命令。
	 * 
	 * **验证需求：8.1, 8.2**
	 */
	registerCommands(): void {
		this.registerTriggerAICommand();
		this.registerAskWithSelectionCommand();
		
		if (this.plugin.settings.debugMode) {
			console.log('[Command Registry] 所有命令已注册');
		}
	}
	
	/**
	 * 注册"触发 AI 输入"命令
	 * 
	 * 该命令允许用户通过命令面板或快捷键触发 AI 输入，
	 * 行为与在编辑器中输入 `/` 相同。
	 * 
	 * **验证需求：8.1, 8.3, 8.4**
	 */
	private registerTriggerAICommand(): void {
		this.plugin.addCommand({
			id: 'trigger-ai-input',
			name: '触发 AI 输入',
			icon: 'bot',
			editorCallback: (editor: Editor) => {
				// 获取当前光标位置
				const cursor = editor.getCursor();
				
				// 显示一个简单的提示，让用户输入 prompt
				// 注意：Obsidian 没有内置的输入对话框，所以我们使用一个简单的方法
				// 在光标位置插入一个占位符，用户可以直接输入
				const placeholder = '/';
				editor.replaceRange(placeholder, cursor);
				
				// 将光标移动到占位符后面
				editor.setCursor({
					line: cursor.line,
					ch: cursor.ch + placeholder.length
				});
				
				if (this.plugin.settings.debugMode) {
					console.log('[Command Registry] 触发 AI 输入命令执行');
				}
			}
		});
	}
	
	/**
	 * 注册"使用选中文本询问 AI"命令
	 * 
	 * 该命令允许用户选中文本后，直接将选中内容作为上下文询问 AI。
	 * 
	 * **验证需求：8.2, 8.3**
	 */
	private registerAskWithSelectionCommand(): void {
		this.plugin.addCommand({
			id: 'ask-ai-with-selection',
			name: '使用选中文本询问 AI',
			icon: 'message-square',
			editorCheckCallback: (checking: boolean, editor: Editor): boolean => {
				// 检查是否有选中的文本
				const selection = editor.getSelection();
				const hasSelection: boolean = !!(selection && selection.trim().length > 0);
				
				// 如果是检查模式，返回是否可用
				if (checking) {
					return hasSelection;
				}
				
				// 执行命令
				if (hasSelection) {
					// 获取光标位置（选中区域的结束位置）
					const cursor = editor.getCursor('to');
					
					// 使用选中的文本作为 prompt
					// 这里我们可以让用户进一步编辑 prompt，或者直接提交
					// 为了更好的用户体验，我们在选中文本后添加一个提示
					const prompt = `关于以下内容：\n\n${selection}\n\n请`;
					
					// 在选中区域后插入 prompt 模板
					editor.replaceSelection('');
					editor.replaceRange(`\n\n${prompt}`, cursor);
					
					// 将光标移动到 "请" 字后面，让用户继续输入问题
					const newCursor = {
						line: cursor.line + 4, // 跳过空行和选中文本
						ch: prompt.split('\n').pop()!.length
					};
					editor.setCursor(newCursor);
					
					if (this.plugin.settings.debugMode) {
						console.log('[Command Registry] 使用选中文本询问 AI 命令执行');
					}
				}
				
				return hasSelection;
			}
		});
	}
}
