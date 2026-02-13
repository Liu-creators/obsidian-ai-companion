/**
 * 请求队列
 * 
 * 管理 AI 请求的并发执行，限制同时进行的请求数量。
 * 
 * **验证需求：4.5**
 */

import { AIRequest, AIResponse, QueuedRequest, QueueStatus } from '../types';
import { AIClient } from './ai-client';

/**
 * 请求队列类
 * 
 * 实现请求队列管理，控制并发请求数量。
 */
export class RequestQueue {
	private aiClient: AIClient;
	private maxConcurrent: number;
	private activeRequests: Map<string, Promise<AIResponse>>;
	private pendingRequests: QueuedRequest[];
	private completedCount: number;
	private failedCount: number;
	
	constructor(aiClient: AIClient, maxConcurrent: number = 3) {
		this.aiClient = aiClient;
		this.maxConcurrent = maxConcurrent;
		this.activeRequests = new Map();
		this.pendingRequests = [];
		this.completedCount = 0;
		this.failedCount = 0;
	}
	
	/**
	 * 将请求加入队列
	 * 
	 * 如果当前活跃请求数未达到上限，立即执行；否则加入等待队列。
	 * 
	 * **验证需求：4.5**
	 * 
	 * @param request AI 请求对象
	 * @param priority 优先级（0-10，默认 5）
	 * @returns Promise，解析为 AI 响应
	 */
	enqueue(request: AIRequest, priority: number = 5): Promise<AIResponse> {
		return new Promise<AIResponse>((resolve, reject) => {
			const queuedRequest: QueuedRequest = {
				request,
				priority,
				addedAt: Date.now(),
				resolve,
				reject
			};
			
			// 如果当前活跃请求数未达到上限，立即执行
			if (this.activeRequests.size < this.maxConcurrent) {
				this.executeRequest(queuedRequest);
			} else {
				// 否则加入等待队列
				this.pendingRequests.push(queuedRequest);
				// 按优先级排序（高优先级在前）
				this.pendingRequests.sort((a, b) => b.priority - a.priority);
			}
		});
	}
	
	/**
	 * 执行请求
	 * 
	 * @param queuedRequest 队列中的请求
	 */
	private executeRequest(queuedRequest: QueuedRequest): void {
		const { request, resolve, reject } = queuedRequest;
		
		// 创建请求 Promise
		const requestPromise = this.aiClient.sendRequest(request)
			.then(response => {
				// 请求成功
				this.completedCount++;
				resolve(response);
				return response;
			})
			.catch(error => {
				// 请求失败
				this.failedCount++;
				reject(error);
				throw error;
			})
			.finally(() => {
				// 请求完成（无论成功或失败），从活跃列表中移除
				this.activeRequests.delete(request.id);
				
				// 处理下一个等待中的请求
				this.processNext();
			});
		
		// 添加到活跃请求列表
		this.activeRequests.set(request.id, requestPromise);
	}
	
	/**
	 * 处理下一个等待中的请求
	 */
	private processNext(): void {
		// 如果还有等待中的请求，且活跃请求数未达到上限
		if (this.pendingRequests.length > 0 && 
		    this.activeRequests.size < this.maxConcurrent) {
			const nextRequest = this.pendingRequests.shift();
			if (nextRequest) {
				this.executeRequest(nextRequest);
			}
		}
	}
	
	/**
	 * 取消请求
	 * 
	 * 取消指定的请求，无论是活跃的还是等待中的。
	 * 
	 * **验证需求：4.5**
	 * 
	 * @param requestId 请求 ID
	 */
	cancel(requestId: string): void {
		// 如果是活跃请求，通过 AIClient 取消
		if (this.activeRequests.has(requestId)) {
			this.aiClient.cancelRequest(requestId);
			this.activeRequests.delete(requestId);
			
			// 处理下一个等待中的请求
			this.processNext();
		}
		
		// 如果在等待队列中，直接移除
		const index = this.pendingRequests.findIndex(
			qr => qr.request.id === requestId
		);
		if (index !== -1) {
			const queuedRequest = this.pendingRequests.splice(index, 1)[0];
			// 拒绝 Promise
			if (queuedRequest) {
				queuedRequest.reject({
					type: 'unknown',
					message: '请求已取消',
					details: 'Request cancelled by user',
					retryable: false
				});
			}
		}
	}
	
	/**
	 * 获取队列状态
	 * 
	 * 返回当前队列的状态信息。
	 * 
	 * **验证需求：4.5**
	 * 
	 * @returns 队列状态对象
	 */
	getStatus(): QueueStatus {
		return {
			active: this.activeRequests.size,
			pending: this.pendingRequests.length,
			completed: this.completedCount,
			failed: this.failedCount
		};
	}
	
	/**
	 * 清空队列
	 * 
	 * 取消所有活跃和等待中的请求。
	 */
	clear(): void {
		// 取消所有活跃请求
		for (const requestId of this.activeRequests.keys()) {
			this.aiClient.cancelRequest(requestId);
		}
		this.activeRequests.clear();
		
		// 拒绝所有等待中的请求
		for (const queuedRequest of this.pendingRequests) {
			queuedRequest.reject({
				type: 'unknown',
				message: '队列已清空',
				details: 'Queue cleared',
				retryable: false
			});
		}
		this.pendingRequests = [];
	}
	
	/**
	 * 更新最大并发数
	 * 
	 * @param maxConcurrent 新的最大并发数
	 */
	setMaxConcurrent(maxConcurrent: number): void {
		this.maxConcurrent = maxConcurrent;
		
		// 如果新的并发数更大，尝试处理等待中的请求
		while (this.pendingRequests.length > 0 && 
		       this.activeRequests.size < this.maxConcurrent) {
			this.processNext();
		}
	}
}
