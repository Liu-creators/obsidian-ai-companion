/**
 * UI 组件相关类型定义
 * 
 * 定义了 UI 组件所需的配置接口，包括可折叠块、加载指示器等。
 */

/**
 * 可折叠块配置接口
 * 用于配置和渲染可折叠的内容块
 */
export interface CollapsibleBlockConfig {
	/** 块标题 */
	title: string;
	
	/** 块内容（Markdown 格式） */
	content: string;
	
	/** 是否折叠 */
	collapsed: boolean;
	
	/** 元数据（可选） */
	metadata?: CollapsibleBlockMetadata;
}

/**
 * 可折叠块元数据接口
 * 存储与可折叠块相关的额外信息
 */
export interface CollapsibleBlockMetadata {
	/** 关联的请求 ID */
	requestId?: string;
	
	/** 使用的 AI 模型 */
	model?: string;
	
	/** 创建时间戳 */
	timestamp?: number;
	
	/** 使用的 token 数量 */
	tokensUsed?: number;
	
	/** 其他自定义属性 */
	[key: string]: unknown;
}
