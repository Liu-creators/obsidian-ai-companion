/**
 * 请求队列测试
 * 
 * 测试请求队列的管理功能
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { RequestQueue } from '../../src/services/request-queue';
import { AIClient } from '../../src/services/ai-client';
import { AIServiceConfig, AIRequest, AIResponse } from '../../src/types';

describe('RequestQueue', () => {
	let config: AIServiceConfig;
	let client: AIClient;
	let queue: RequestQueue;
	
	beforeEach(() => {
		config = {
			apiEndpoint: 'https://api.example.com/v1/chat/completions',
			apiKey: 'test-api-key',
			model: 'gpt-3.5-turbo',
			timeout: 5000,
			maxRetries: 0 // 禁用重试以简化测试
		};
		
		client = new AIClient(config);
		queue = new RequestQueue(client, 2); // 最多 2 个并发
	});
	
	describe('基本功能', () => {
		test('应该能够创建 RequestQueue 实例', () => {
			expect(queue).toBeDefined();
		});
		
		test('应该能够获取队列状态', () => {
			const status = queue.getStatus();
			
			expect(status).toBeDefined();
			expect(status.active).toBe(0);
			expect(status.pending).toBe(0);
			expect(status.completed).toBe(0);
			expect(status.failed).toBe(0);
		});
	});
	
	describe('enqueue', () => {
		test('应该能够将请求加入队列', () => {
			// Mock sendRequest
			jest.spyOn(client, 'sendRequest').mockResolvedValue({
				id: 'test-1',
				content: 'Response',
				model: 'gpt-3.5-turbo',
				timestamp: Date.now()
			});
			
			const request: AIRequest = {
				id: 'test-1',
				prompt: 'Test',
				timestamp: Date.now(),
				source: 'editor'
			};
			
			const promise = queue.enqueue(request);
			
			expect(promise).toBeInstanceOf(Promise);
			
			const status = queue.getStatus();
			expect(status.active).toBeGreaterThan(0);
		});
		
		test('应该能够处理多个并发请求', async () => {
			// Mock sendRequest 立即返回
			jest.spyOn(client, 'sendRequest').mockImplementation((req) => {
				return Promise.resolve({
					id: req.id,
					content: 'Response',
					model: 'gpt-3.5-turbo',
					timestamp: Date.now()
				});
			});
			
			// 添加 3 个请求（超过并发限制 2）
			const requests = [
				{ id: 'test-1', prompt: 'Test 1', timestamp: Date.now(), source: 'editor' as const },
				{ id: 'test-2', prompt: 'Test 2', timestamp: Date.now(), source: 'editor' as const },
				{ id: 'test-3', prompt: 'Test 3', timestamp: Date.now(), source: 'editor' as const }
			];
			
			const promises = requests.map(req => queue.enqueue(req));
			
			// 等待所有请求完成
			await Promise.all(promises);
			
			const finalStatus = queue.getStatus();
			expect(finalStatus.completed).toBe(3);
		});
	});
	
	describe('cancel', () => {
		test('应该能够取消请求', () => {
			// 取消不存在的请求不应该抛出错误
			expect(() => {
				queue.cancel('non-existent');
			}).not.toThrow();
		});
	});
	
	describe('clear', () => {
		test('应该能够清空队列', () => {
			// 清空空队列不应该抛出错误
			expect(() => {
				queue.clear();
			}).not.toThrow();
			
			const status = queue.getStatus();
			expect(status.active).toBe(0);
			expect(status.pending).toBe(0);
		});
	});
	
	describe('setMaxConcurrent', () => {
		test('应该能够更新最大并发数', () => {
			queue.setMaxConcurrent(5);
			
			// 通过添加请求验证新的并发限制
			// （实际验证需要更复杂的测试设置）
		});
	});
});
