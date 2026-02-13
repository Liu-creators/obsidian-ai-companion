/**
 * 错误处理器
 * 
 * 负责处理、分类和显示 AI 服务相关的错误。
 * 
 * **验证需求：5.1, 5.2, 5.3, 5.4, 5.5**
 */

import { Notice, Editor } from 'obsidian';
import { AIError, AIErrorType, AIRequest } from '../types';
import {
	BaseAIError,
	NetworkError,
	APIError,
	AuthenticationError,
	TimeoutError,
	RateLimitError,
	ValidationError,
	CancelledError,
	UnknownError
} from './errors';

/**
 * 错误上下文接口
 * 
 * 包含错误发生时的上下文信息
 */
export interface ErrorContext {
	/** 错误来源 */
	source: 'editor';
	
	/** 编辑器实例 */
	editor?: Editor;
	
	/** 编辑器位置 */
	position?: { line: number; ch: number };
	
	/** 相关的请求 */
	request: AIRequest;
	
	/** 错误显示元素 */
	errorElement?: HTMLElement;
}

/**
 * 错误处理器类
 * 
 * 提供统一的错误处理、分类和显示功能。
 */
export class ErrorHandler {
	/**
	 * 处理 AI 错误
	 * 
	 * 这是错误处理的主入口，负责分类错误、记录日志、显示消息和提供重试选项。
	 * 
	 * **验证需求：5.1, 5.2, 5.3, 5.4, 5.5**
	 * 
	 * @param error 原始错误对象
	 * @param context 错误上下文
	 * @returns 分类后的 AI 错误对象
	 */
	handleAIError(error: Error, context: ErrorContext): AIError {
		// 分类错误
		const aiError = this.classifyError(error);
		
		// 记录到控制台（需求 5.5）
		this.logError(aiError, context);
		
		// 显示用户友好的消息（需求 5.1, 5.3）
		this.displayError(aiError, context);
		
		// 如果可重试，提供重试选项（需求 5.4）
		if (aiError.retryable) {
			this.offerRetry(aiError, context);
		}
		
		return aiError;
	}
	
	/**
	 * 分类错误
	 * 
	 * 将原始错误对象转换为分类的 AIError。
	 * 
	 * **验证需求：5.2**
	 * 
	 * @param error 原始错误对象
	 * @returns 分类后的 AI 错误对象
	 */
	classifyError(error: Error): AIError {
		// 如果已经是 BaseAIError，直接转换
		if (error instanceof BaseAIError) {
			return this.convertBaseAIError(error);
		}
		
		const message = error.message.toLowerCase();
		
		// 网络错误
		if (message.includes('network') || message.includes('fetch') || 
		    message.includes('failed to fetch')) {
			const networkError = new NetworkError(
				'无法连接到 AI 服务，请检查网络连接',
				error.message
			);
			return this.convertBaseAIError(networkError);
		}
		
		// 超时错误
		if (message.includes('timeout') || message.includes('aborted')) {
			const timeoutError = new TimeoutError(
				'AI 服务响应超时，请稍后重试',
				error.message
			);
			return this.convertBaseAIError(timeoutError);
		}
		
		// 认证错误
		if (message.includes('401') || message.includes('403') || 
		    message.includes('unauthorized') || message.includes('forbidden')) {
			const authError = new AuthenticationError(
				'API 密钥无效或已过期，请检查设置',
				error.message
			);
			return this.convertBaseAIError(authError);
		}
		
		// 速率限制错误
		if (message.includes('429') || message.includes('rate limit')) {
			const rateLimitError = new RateLimitError(
				'API 调用频率超限，请稍后重试',
				undefined,
				error.message
			);
			return this.convertBaseAIError(rateLimitError);
		}
		
		// 取消错误
		if (message.includes('cancel')) {
			const cancelledError = new CancelledError(
				'请求已取消',
				error.message
			);
			return this.convertBaseAIError(cancelledError);
		}
		
		// API 错误（尝试从消息中提取状态码）
		const statusCodeMatch = message.match(/\b([45]\d{2})\b/);
		if (statusCodeMatch && statusCodeMatch[1]) {
			const statusCode = parseInt(statusCodeMatch[1]);
			const apiError = new APIError(
				`AI 服务错误 (${statusCode})`,
				statusCode,
				error.message
			);
			return this.convertBaseAIError(apiError);
		}
		
		// 未知错误
		const unknownError = new UnknownError(
			'发生未知错误，请查看控制台了解详情',
			error.message
		);
		return this.convertBaseAIError(unknownError);
	}
	
	/**
	 * 将 BaseAIError 转换为 AIError 接口
	 * 
	 * @param error BaseAIError 实例
	 * @returns AIError 对象
	 */
	private convertBaseAIError(error: BaseAIError): AIError {
		// 确定错误类型
		let type: AIErrorType;
		
		if (error instanceof NetworkError) {
			type = 'network';
		} else if (error instanceof APIError) {
			type = 'api';
		} else if (error instanceof AuthenticationError) {
			type = 'auth';
		} else if (error instanceof TimeoutError) {
			type = 'timeout';
		} else if (error instanceof RateLimitError) {
			type = 'rate_limit';
		} else if (error instanceof ValidationError) {
			type = 'invalid_request';
		} else {
			type = 'unknown';
		}
		
		return {
			type,
			message: error.message,
			details: error.details,
			retryable: error.retryable,
			originalError: error
		};
	}
	
	/**
	 * 记录错误到控制台
	 * 
	 * **验证需求：5.5**
	 * 
	 * @param error AI 错误对象
	 * @param context 错误上下文
	 */
	private logError(error: AIError, context: ErrorContext): void {
		console.error('[AI Plugin Error]', {
			type: error.type,
			message: error.message,
			details: error.details,
			retryable: error.retryable,
			context: {
				source: context.source,
				requestId: context.request.id,
				prompt: context.request.prompt.substring(0, 100), // 只记录前 100 个字符
				timestamp: new Date().toISOString()
			},
			stack: error.originalError?.stack
		});
	}
	
	/**
	 * 显示错误消息
	 * 
	 * 在编辑器中显示用户友好的错误消息。
	 * 
	 * **验证需求：5.1, 5.3**
	 * 
	 * @param error AI 错误对象
	 * @param context 错误上下文
	 */
	displayError(error: AIError, context: ErrorContext): void {
		// 显示 Obsidian 通知
		new Notice(error.message, 5000);
		
		// 在编辑器中显示错误
		if (context.source === 'editor' && context.editor && context.position) {
			this.displayEditorError(error, context.editor, context.position);
		}
	}
	
	/**
	 * 在编辑器中显示错误
	 * 
	 * @param error AI 错误对象
	 * @param editor 编辑器实例
	 * @param position 错误位置
	 */
	private displayEditorError(
		error: AIError,
		editor: Editor,
		position: { line: number; ch: number }
	): void {
		// 在光标位置插入错误消息
		const errorText = `\n\n❌ **错误**: ${error.message}\n\n`;
		editor.replaceRange(errorText, position);
	}
	
	/**
	 * 提供重试选项
	 * 
	 * 当错误可重试时，提供重试按钮或选项。
	 * 
	 * **验证需求：5.4**
	 * 
	 * @param error AI 错误对象
	 * @param context 错误上下文
	 */
	offerRetry(error: AIError, context: ErrorContext): void {
		// 创建重试通知
		const retryMessage = `${error.message}\n\n点击重试`;
		
		// 显示带有重试选项的通知
		// 注意：Obsidian 的 Notice 不支持按钮，这里只是显示提示
		// 实际的重试逻辑需要在 UI 控制器中实现
		new Notice(retryMessage, 8000);
		
		// 如果有错误元素，添加重试按钮
		if (context.errorElement) {
			this.addRetryButton(context.errorElement, context);
		}
	}
	
	/**
	 * 添加重试按钮到错误元素
	 * 
	 * @param errorElement 错误显示元素
	 * @param context 错误上下文
	 */
	private addRetryButton(errorElement: HTMLElement, context: ErrorContext): void {
		// 创建重试按钮
		const retryButton = errorElement.createEl('button', {
			text: '重试',
			cls: 'ai-plugin-retry-button'
		});
		
		// 添加点击事件
		retryButton.addEventListener('click', () => {
			// 触发重试
			// 注意：实际的重试逻辑需要由调用者提供
			console.log('[Error Handler] 用户请求重试:', context.request.id);
			
			// 移除错误显示
			errorElement.remove();
		});
	}
	
	/**
	 * 创建验证错误
	 * 
	 * 用于创建输入验证相关的错误。
	 * 
	 * @param message 错误消息
	 * @param field 验证失败的字段
	 * @returns AI 错误对象
	 */
	static createValidationError(message: string, field?: string): AIError {
		const error = new ValidationError(message, field);
		return {
			type: 'invalid_request',
			message: error.message,
			details: error.details,
			retryable: error.retryable,
			originalError: error
		};
	}
	
	/**
	 * 检查错误是否可重试
	 * 
	 * @param error 错误对象
	 * @returns 如果可重试返回 true
	 */
	static isRetryable(error: AIError): boolean {
		return error.retryable;
	}
	
	/**
	 * 获取错误的用户友好消息
	 * 
	 * @param error 错误对象
	 * @returns 用户友好的错误消息
	 */
	static getUserFriendlyMessage(error: AIError): string {
		return error.message;
	}
}
