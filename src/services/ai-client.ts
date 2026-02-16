/**
 * AI 客户端
 * 
 * 负责与 AI API 进行通信，处理请求发送、响应接收、超时和重试逻辑。
 * 
 * **验证需求：1.4, 4.4, 4.5**
 */

import { AIServiceConfig, AIRequest, AIResponse, AIError, CancelToken } from '../types';

/**
 * 创建取消令牌
 * 
 * @returns 新的取消令牌实例
 */
export function createCancelToken(): CancelToken {
	let cancelled = false;
	const callbacks: Array<() => void> = [];
	
	return {
		get cancelled() {
			return cancelled;
		},
		cancel() {
			if (!cancelled) {
				cancelled = true;
				callbacks.forEach(cb => cb());
			}
		},
		onCancel(callback: () => void) {
			if (cancelled) {
				callback();
			} else {
				callbacks.push(callback);
			}
		}
	};
}

/**
 * AI 客户端类
 * 
 * 封装与 AI API 的所有交互逻辑。
 */
export class AIClient {
	private config: AIServiceConfig;
	private activeRequests: Map<string, AbortController>;
	
	constructor(config: AIServiceConfig) {
		this.config = config;
		this.activeRequests = new Map();
	}
	
	/**
	 * 更新配置
	 * 
	 * @param config 新的 AI 服务配置
	 */
	updateConfig(config: AIServiceConfig): void {
		this.config = config;
	}
	
	/**
	 * 发送 AI 请求
	 * 
	 * 发送请求到 AI API，处理超时和重试逻辑。
	 * 
	 * **验证需求：1.4, 4.4**
	 * 
	 * @param request AI 请求对象
	 * @returns AI 响应
	 * @throws {AIError} 如果请求失败
	 */
	async sendRequest(request: AIRequest): Promise<AIResponse> {
		let lastError: Error | null = null;
		let attempt = 0;
		
		// 重试逻辑：最多重试 maxRetries 次
		while (attempt <= this.config.maxRetries) {
			try {
				const response = await this.executeRequest(request, attempt);
				return response;
			} catch (error) {
				lastError = error as Error;
				
				// 如果是不可重试的错误，直接抛出
				if (error instanceof Error && !this.isRetryableError(error)) {
					throw this.convertToAIError(error);
				}
				
				// 如果请求被取消，直接抛出
				if (request.cancelToken?.cancelled) {
					throw this.convertToAIError(new Error('Request cancelled'));
				}
				
				attempt++;
				
				// 如果还有重试机会，等待后重试（指数退避）
				if (attempt <= this.config.maxRetries) {
					const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
					await this.sleep(delay);
				}
			}
		}
		
		// 所有重试都失败了
		throw this.convertToAIError(lastError || new Error('Request failed'));
	}
	
	/**
	 * 获取请求头
	 * 
	 * 根据配置生成请求头，包括认证信息和特定服务商的头信息。
	 */
	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// 如果有 API Key，添加 Authorization 头
		// 本地模型（如 Ollama）可能不需要 Key
		if (this.config.apiKey) {
			headers['Authorization'] = `Bearer ${this.config.apiKey}`;
		}

		// OpenRouter 特定头信息
		if (this.config.apiEndpoint.includes('openrouter.ai') || this.config.provider === 'openrouter') {
			headers['HTTP-Referer'] = 'https://github.com/obsidian-plugins/obsidian-sample-plugin';
			headers['X-Title'] = 'Obsidian AI Plugin';
		}

		return headers;
	}

	/**
	 * 执行单次请求
	 * 
	 * @param request AI 请求对象
	 * @param attempt 当前尝试次数
	 * @returns AI 响应
	 */
	private async executeRequest(request: AIRequest, _attempt: number): Promise<AIResponse> {
		// 创建 AbortController 用于超时和取消
		const controller = new AbortController();
		this.activeRequests.set(request.id, controller);
		
		// 设置超时
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, this.config.timeout);
		
		// 如果有取消令牌，注册取消回调
		if (request.cancelToken) {
			request.cancelToken.onCancel(() => {
				controller.abort();
			});
		}
		
		try {
			// 构建请求体
			const requestBody = this.buildRequestBody(request);
			
			// 记录最终发送的完整请求
			if (this.config.logAIInteractions) {
				console.log('📤 最终请求:', JSON.stringify(requestBody));
			}
			
			// 发送请求
			const response = await fetch(this.config.apiEndpoint, {
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(requestBody),
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			// 检查响应状态
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`API error: ${response.status} - ${errorText}`);
			}
			
			// 如果启用流式响应且提供了回调
			if (request.stream && request.onStream) {
				return await this.handleStreamResponse(response, request);
			}
			
			// 解析响应
			const data = await response.json();
			
			// 构建 AI 响应对象
			const aiResponse: AIResponse = {
				id: request.id,
				content: this.extractContent(data),
				model: this.config.model,
				timestamp: Date.now(),
				tokensUsed: data.usage?.total_tokens,
				finishReason: data.choices?.[0]?.finish_reason
			};
			
			return aiResponse;
			
		} catch (error) {
			clearTimeout(timeoutId);
			
			// 检查是否是超时错误
			if (error instanceof Error && error.name === 'AbortError') {
				if (request.cancelToken?.cancelled) {
					throw new Error('Request cancelled');
				} else {
					throw new Error('Request timeout');
				}
			}
			
			throw error;
			
		} finally {
			this.activeRequests.delete(request.id);
		}
	}
	
	/**
	 * 构建请求体
	 * 
	 * @param request AI 请求对象
	 * @returns 请求体对象
	 */
	private buildRequestBody(request: AIRequest): Record<string, unknown> {
		const messages: Array<{ role: string; content: string }> = [];
		
		// 如果有上下文，添加为系统消息
		if (request.context) {
			messages.push({
				role: 'system',
				content: `Context: ${request.context}`
			});
		}
		
		// 添加用户消息
		messages.push({
			role: 'user',
			content: request.prompt
		});
		
		const body: Record<string, unknown> = {
			model: this.config.model,
			messages: messages,
			temperature: 0.7,
			max_tokens: 2000
		};
		
		// 如果启用流式响应，添加 stream 参数
		if (request.stream) {
			body.stream = true;
		}
		
		return body;
	}
	
	/**
	 * 处理流式响应
	 * 
	 * @param response Fetch 响应对象
	 * @param request AI 请求对象
	 * @returns AI 响应
	 */
	private async handleStreamResponse(response: Response, request: AIRequest): Promise<AIResponse> {
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('无法读取响应流');
		}
		
		const decoder = new TextDecoder();
		let fullContent = '';
		let tokensUsed: number | undefined;
		let finishReason: string | undefined;
		
		try {
			while (true) {
				const { done, value } = await reader.read();
				
				if (done) {
					break;
				}
				
				// 解码数据块
				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n').filter(line => line.trim() !== '');
				
				for (const line of lines) {
					// SSE 格式：data: {...}
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						
						// 检查是否是结束标记
						if (data === '[DONE]') {
							continue;
						}
						
						try {
							const parsed = JSON.parse(data);
							
							// 提取内容增量
							const delta = parsed.choices?.[0]?.delta?.content;
							if (delta) {
								fullContent += delta;
								
								// 调用流式回调
								if (request.onStream) {
									request.onStream(delta);
								}
							}
							
							// 提取 token 使用量和完成原因
							if (parsed.usage) {
								tokensUsed = parsed.usage.total_tokens;
							}
							if (parsed.choices?.[0]?.finish_reason) {
								finishReason = parsed.choices[0].finish_reason;
							}
						} catch (e) {
							// 忽略解析错误，继续处理下一行
							console.warn('[AI Client] 流式响应解析错误:', e);
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
		
		// 构建最终响应
		const aiResponse: AIResponse = {
			id: request.id,
			content: fullContent,
			model: this.config.model,
			timestamp: Date.now(),
			tokensUsed,
			finishReason
		};
		
		return aiResponse;
	}
	
	/**
	 * 从响应数据中提取内容
	 * 
	 * @param data API 响应数据
	 * @returns 提取的内容文本
	 */
	private extractContent(data: unknown): string {
		const responseData = data;
		
		// 支持 OpenAI 格式
		if (responseData.choices && responseData.choices.length > 0) {
			return responseData.choices[0].message?.content || responseData.choices[0].text || '';
		}
		
		// 支持其他格式
		if (responseData.content) {
			return responseData.content;
		}
		
		return '';
	}
	
	/**
	 * 判断错误是否可重试
	 * 
	 * @param error 错误对象
	 * @returns 如果可重试返回 true
	 */
	private isRetryableError(error: Error): boolean {
		const message = error.message.toLowerCase();
		
		// 网络错误可重试
		if (message.includes('network') || message.includes('fetch')) {
			return true;
		}
		
		// 超时错误可重试
		if (message.includes('timeout')) {
			return true;
		}
		
		// 5xx 服务器错误可重试
		if (message.includes('500') || message.includes('502') || 
		    message.includes('503') || message.includes('504')) {
			return true;
		}
		
		// 速率限制可重试
		if (message.includes('429') || message.includes('rate limit')) {
			return true;
		}
		
		// 其他错误不重试
		return false;
	}
	
	/**
	 * 将错误转换为 AIError
	 * 
	 * @param error 原始错误对象
	 * @returns AI 错误对象
	 */
	private convertToAIError(error: Error): AIError {
		const message = error.message.toLowerCase();
		
		// 网络错误
		if (message.includes('network') || message.includes('fetch')) {
			return {
				type: 'network',
				message: '无法连接到 AI 服务，请检查网络连接',
				details: error.message,
				retryable: true,
				originalError: error
			};
		}
		
		// 超时错误
		if (message.includes('timeout')) {
			return {
				type: 'timeout',
				message: 'AI 服务响应超时，请稍后重试',
				details: error.message,
				retryable: true,
				originalError: error
			};
		}
		
		// 认证错误
		if (message.includes('401') || message.includes('403') || 
		    message.includes('unauthorized') || message.includes('forbidden')) {
			return {
				type: 'auth',
				message: 'API 密钥无效或已过期，请检查设置',
				details: error.message,
				retryable: false,
				originalError: error
			};
		}
		
		// 速率限制
		if (message.includes('429') || message.includes('rate limit')) {
			return {
				type: 'rate_limit',
				message: 'API 调用频率超限，请稍后重试',
				details: error.message,
				retryable: true,
				originalError: error
			};
		}
		
		// 取消错误
		if (message.includes('cancel')) {
			return {
				type: 'unknown',
				message: '请求已取消',
				details: error.message,
				retryable: false,
				originalError: error
			};
		}
		
		// API 错误
		if (message.includes('api error')) {
			return {
				type: 'api',
				message: 'AI 服务错误',
				details: error.message,
				retryable: message.includes('5'),
				originalError: error
			};
		}
		
		// 未知错误
		return {
			type: 'unknown',
			message: '发生未知错误，请查看控制台了解详情',
			details: error.message,
			retryable: false,
			originalError: error
		};
	}
	
	/**
	 * 取消请求
	 * 
	 * 取消正在进行的 AI 请求。
	 * 
	 * **验证需求：4.5**
	 * 
	 * @param requestId 请求 ID
	 */
	cancelRequest(requestId: string): void {
		const controller = this.activeRequests.get(requestId);
		if (controller) {
			controller.abort();
			this.activeRequests.delete(requestId);
		}
	}
	
	/**
	 * 测试连接
	 * 
	 * 测试 API 端点和密钥是否有效。
	 * 
	 * @returns 如果连接有效返回 true
	 */
	async testConnection(): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
			
			const response = await fetch(this.config.apiEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.config.apiKey}`
				},
				body: JSON.stringify({
					model: this.config.model,
					messages: [
						{ role: 'user', content: 'test' }
					],
					max_tokens: 5
				}),
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			return response.ok;
			
		} catch (error) {
			console.error('[AI Client] 连接测试失败:', error);
			return false;
		}
	}
	
	/**
	 * 睡眠指定时间
	 * 
	 * @param ms 毫秒数
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
