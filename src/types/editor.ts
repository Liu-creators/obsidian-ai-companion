/**
 * 编辑器相关类型定义
 * 
 * 定义了与 Obsidian 编辑器交互所需的接口，包括建议、触发信息和位置信息。
 */

import { EditorPosition } from 'obsidian';

/**
 * AI 建议接口
 * 表示在 EditorSuggest 中显示的 AI 建议项
 */
export interface AISuggestion {
	/** 建议类型 */
	type: 'ai-prompt';
	
	/** 用户输入的 prompt */
	prompt: string;
	
	/** 显示文本 */
	displayText: string;
}

/**
 * 编辑器建议触发信息接口
 * 表示触发 EditorSuggest 的位置和查询信息
 */
export interface EditorSuggestTriggerInfo {
	/** 触发起始位置 */
	start: EditorPosition;
	
	/** 触发结束位置 */
	end: EditorPosition;
	
	/** 查询字符串（/ 后的文本） */
	query: string;
}

/**
 * 导出 EditorPosition 类型以便统一使用
 */
export type { EditorPosition };
