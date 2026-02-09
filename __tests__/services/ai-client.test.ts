/**
 * AI 客户端测试
 * 
 * 测试 AI 客户端的核心功能
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { AIClient, createCancelToken } from '../../src/services/ai-client';
import { AIServiceConfig, AIRequest } from '../../src/types';

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('AIClient', () => {
	let config: AIServiceConfig;
	let client: AIClient;
	
	beforeEach(() => {
		// 重置 mock
		jest.clearAllMocks();
		
		// 创建测试配置
		config = {
			apiEndpoint: 'https://api.example.com/v1/chat/completions',
			apiKey: 'test-api-key',
			model: 'gpt-3.5-turbo',
			timeout: 5000,
			maxRetries: 2
		};
		
		client = new AIClient(config);
	});
	
	describe('基本功能', () => {
		test('应该能够创建 AIClient 实例', () => {
			expect(client).toBeDefined();
		});
		
		test('应该能够更新配置', () => {
			const newConfig: AIServiceConfig = {
				...config,
				model: 'gpt-4'
			};
			
			client.updateConfig(newConfig);
			// 配置已更新（通过后续请求验证）
		});
	});
	
	describe('sendRequest', () => {
		test('应该能够发送成功的请求', async () => {
			// Mock 成功响应
			(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					choices: [
						{
							message: {
								content: 'Test response'
							},
							finish_reason: 'stop'
						}
					],
					usage: {
						total_tokens: 50
					}
				})
			} as Response);
			
			const request: AIRequest = {
				id: 'test-1',
				prompt: 'Test prompt',
				timestamp: Date.now(),
				source: 'editor'
			};
			
			const response = await client.sendRequest(request);
			
			expect(response).toBeDefined();
			expect(response.id).toBe('test-1');
			expect(response.content).toBe('Test response');
			expect(response.model).toBe('gpt-3.5-turbo');
			expect(response.tokensUsed).toBe(50);
		});
		
		test('应该能够处理带上下文的请求', async () => {
			(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'Response with context' } }]
				})
			} as Response);
			
			const request: AIRequest = {
				id: 'test-2',
				prompt: 'Test prompt',
				context: 'Test context',
				timestamp: Date.now(),
				source: 'editor'
			};
			
			await client.sendRequest(request);
			
			// 验证请求体包含上下文
			const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
			const requestBody = JSON.parse(fetchCall[1]?.body as string);
			
			expect(requestBody.messages).toHaveLength(2);
			expect(requestBody.messages[0].role).toBe('system');
			expect(requestBody.messages[0].content).toContain('Test context');
		});
		
		test('应该能够处理 API 错误', async () => {
			(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: async () => 'Unauthorized'
			} as Response);
			
			const request: AIRequest = {
				id: 'test-3',
				prompt: 'Test prompt',
				timestamp: Date.now(),
				source: 'editor'
			};
			
			await expect(client.sendRequest(request)).rejects.toMatchObject({
				type: 'auth',
				retryable: false
			});
		});
	});
	
	describe('cancelRequest', () => {
		test('应该能够取消请求', () => {
			// 取消不存在的请求不应该抛出错误
			expect(() => {
				client.cancelRequest('non-existent');
			}).not.toThrow();
		});
	});
	
	describe('testConnection', () => {
		test('连接成功应该返回 true', async () => {
			(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
				ok: true
			} as Response);
			
			const result = await client.testConnection();
			expect(result).toBe(true);
		});
		
		test('连接失败应该返回 false', async () => {
			(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
				new Error('Network error')
			);
			
			const result = await client.testConnection();
			expect(result).toBe(false);
		});
	});
});

describe('createCancelToken', () => {
	test('应该能够创建取消令牌', () => {
		const token = createCancelToken();
		
		expect(token).toBeDefined();
		expect(token.cancelled).toBe(false);
	});
	
	test('应该能够取消令牌', () => {
		const token = createCancelToken();
		
		token.cancel();
		
		expect(token.cancelled).toBe(true);
	});
	
	test('应该能够注册取消回调', () => {
		const token = createCancelToken();
		const callback = jest.fn();
		
		token.onCancel(callback);
		token.cancel();
		
		expect(callback).toHaveBeenCalled();
	});
	
	test('如果已取消，回调应该立即执行', () => {
		const token = createCancelToken();
		token.cancel();
		
		const callback = jest.fn();
		token.onCancel(callback);
		
		expect(callback).toHaveBeenCalled();
	});
});
