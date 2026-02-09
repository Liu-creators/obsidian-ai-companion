/**
 * AI 服务相关类型定义
 * 
 * 定义了与 AI 服务交互所需的核心接口，包括配置、请求、响应和错误处理。
 */

/**
 * AI 服务配置接口
 * 包含连接 AI API 所需的所有配置信息
 */
export interface AIServiceConfig {
	/** API 端点 URL */
	apiEndpoint: string;
	
	/** API 密钥（应加密存储） */
	apiKey: string;
	
	/** AI 模型名称 */
	model: string;
	
	/** 请求超时时间（毫秒） */
	timeout: number;
	
	/** 最大重试次数 */
	maxRetries: number;
	
	/** 是否记录 AI 交互日志 */
	logAIInteractions?: boolean;
	
	/** 是否启用流式响应 */
	streamResponse?: boolean;
}

/**
 * 取消令牌接口
 * 用于取消正在进行的 AI 请求
 */
export interface CancelToken {
	/** 是否已取消 */
	cancelled: boolean;
	
	/** 取消请求 */
	cancel(): void;
	
	/** 注册取消回调 */
	onCancel(callback: () => void): void;
}

/**
 * AI 请求接口
 * 表示发送到 AI 服务的请求
 */
export interface AIRequest {
	/** 唯一请求 ID */
	id: string;
	
	/** 用户输入的 prompt */
	prompt: string;
	
	/** 可选的上下文内容 */
	context?: string;
	
	/** 请求时间戳 */
	timestamp: number;
	
	/** 请求来源 */
	source: 'editor' | 'canvas';
	
	/** 取消令牌 */
	cancelToken?: CancelToken;
	
	/** 是否启用流式响应 */
	stream?: boolean;
	
	/** 流式响应回调函数 */
	onStream?: (chunk: string) => void;
}

/**
 * AI 响应接口
 * 表示从 AI 服务接收的响应
 */
export interface AIResponse {
	/** 对应的请求 ID */
	id: string;
	
	/** AI 返回的内容 */
	content: string;
	
	/** 使用的模型 */
	model: string;
	
	/** 响应时间戳 */
	timestamp: number;
	
	/** 使用的 token 数量（可选） */
	tokensUsed?: number;
	
	/** 完成原因（可选） */
	finishReason?: string;
}

/**
 * AI 错误类型
 * 定义了所有可能的错误类型
 */
export type AIErrorType = 
	| 'network'          // 网络错误
	| 'api'              // API 错误
	| 'auth'             // 认证错误
	| 'timeout'          // 超时错误
	| 'rate_limit'       // 速率限制
	| 'invalid_request'  // 无效请求
	| 'unknown';         // 未知错误

/**
 * AI 错误接口
 * 表示 AI 服务调用过程中发生的错误
 */
export interface AIError {
	/** 错误类型 */
	type: AIErrorType;
	
	/** 用户友好的错误消息 */
	message: string;
	
	/** 详细错误信息（可选） */
	details?: string;
	
	/** 是否可重试 */
	retryable: boolean;
	
	/** 原始错误对象（可选） */
	originalError?: Error;
}

/**
 * 请求队列状态接口
 * 表示请求队列的当前状态
 */
export interface QueueStatus {
	/** 活跃请求数 */
	active: number;
	
	/** 等待中的请求数 */
	pending: number;
	
	/** 已完成请求数 */
	completed: number;
	
	/** 失败请求数 */
	failed: number;
}

/**
 * 队列中的请求接口
 * 表示在队列中等待处理的请求
 */
export interface QueuedRequest {
	/** 请求对象 */
	request: AIRequest;
	
	/** 优先级（0-10） */
	priority: number;
	
	/** 加入队列时间 */
	addedAt: number;
	
	/** Promise resolve 函数 */
	resolve: (response: AIResponse) => void;
	
	/** Promise reject 函数 */
	reject: (error: AIError) => void;
}
