/**
 * 上下文提取相关类型定义
 * 
 * 定义了上下文提取功能所需的接口，包括配置和提取结果。
 */

/**
 * 上下文范围类型
 * 定义了可以提取的上下文范围
 */
export type ContextScope = 
	| 'paragraph'  // 当前段落
	| 'section'    // 当前章节
	| 'document'   // 整个文档
	| 'selection'; // 选中的文本

/**
 * 上下文提取配置接口
 * 配置如何提取上下文内容
 */
export interface ContextExtractionConfig {
	/** 上下文范围 */
	scope: ContextScope;
	
	/** 最大长度（字符数） */
	maxLength: number;
	
	/** 是否包含选中文本 */
	includeSelection: boolean;
}

/**
 * 提取的上下文接口
 * 表示提取后的上下文内容和相关信息
 */
export interface ExtractedContext {
	/** 提取的内容 */
	content: string;
	
	/** 来源描述 */
	source: string;
	
	/** 是否被截断 */
	truncated: boolean;
	
	/** 原始长度 */
	originalLength: number;
}
