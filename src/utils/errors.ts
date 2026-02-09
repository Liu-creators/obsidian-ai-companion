/**
 * 错误类型定义
 * 
 * 定义了插件中使用的各种错误类，每个错误类都包含 retryable 属性。
 * 
 * **验证需求：5.2**
 */

/**
 * 基础 AI 错误类
 * 
 * 所有 AI 相关错误的基类
 */
export abstract class BaseAIError extends Error {
	/** 是否可重试 */
	abstract readonly retryable: boolean;
	
	/** 错误详情 */
	details?: string;
	
	constructor(message: string, details?: string) {
		super(message);
		this.name = this.constructor.name;
		this.details = details;
		
		// 维护正确的原型链
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * 网络错误
 * 
 * 当无法连接到 API 端点时抛出
 * 可重试：是
 */
export class NetworkError extends BaseAIError {
	readonly retryable = true;
	
	constructor(message: string = '无法连接到 AI 服务，请检查网络连接', details?: string) {
		super(message, details);
	}
}

/**
 * API 错误
 * 
 * 当 API 返回错误状态码时抛出
 * 可重试：取决于状态码（5xx 可重试，4xx 不可重试）
 */
export class APIError extends BaseAIError {
	/** HTTP 状态码 */
	readonly statusCode: number;
	
	/** 是否可重试（5xx 可重试） */
	readonly retryable: boolean;
	
	constructor(message: string, statusCode: number, details?: string) {
		super(message, details);
		this.statusCode = statusCode;
		this.retryable = statusCode >= 500 && statusCode < 600;
	}
}

/**
 * 认证错误
 * 
 * 当 API 密钥无效或过期时抛出
 * 可重试：否
 */
export class AuthenticationError extends BaseAIError {
	readonly retryable = false;
	
	constructor(message: string = 'API 密钥无效或已过期，请检查设置', details?: string) {
		super(message, details);
	}
}

/**
 * 超时错误
 * 
 * 当请求超过配置的超时时间时抛出
 * 可重试：是
 */
export class TimeoutError extends BaseAIError {
	readonly retryable = true;
	
	constructor(message: string = 'AI 服务响应超时，请稍后重试', details?: string) {
		super(message, details);
	}
}

/**
 * 速率限制错误
 * 
 * 当超过 API 调用频率限制时抛出
 * 可重试：是（延迟后）
 */
export class RateLimitError extends BaseAIError {
	readonly retryable = true;
	
	/** 重试延迟时间（秒） */
	readonly retryAfter?: number;
	
	constructor(message: string = 'API 调用频率超限，请稍后重试', retryAfter?: number, details?: string) {
		super(message, details);
		this.retryAfter = retryAfter;
	}
}

/**
 * 无效请求错误
 * 
 * 当请求参数无效时抛出
 * 可重试：否
 */
export class ValidationError extends BaseAIError {
	readonly retryable = false;
	
	/** 验证失败的字段 */
	readonly field?: string;
	
	constructor(message: string, field?: string, details?: string) {
		super(message, details);
		this.field = field;
	}
}

/**
 * 请求取消错误
 * 
 * 当用户取消请求时抛出
 * 可重试：否
 */
export class CancelledError extends BaseAIError {
	readonly retryable = false;
	
	constructor(message: string = '请求已取消', details?: string) {
		super(message, details);
	}
}

/**
 * 未知错误
 * 
 * 当发生未分类的错误时抛出
 * 可重试：否
 */
export class UnknownError extends BaseAIError {
	readonly retryable = false;
	
	constructor(message: string = '发生未知错误，请查看控制台了解详情', details?: string) {
		super(message, details);
	}
}
