/**
 * 错误显示组件
 * 
 * 显示用户友好的错误消息，并提供重试选项（如果错误可恢复）。
 * 
 * **验证需求：5.1, 5.3, 5.4**
 */

import { BaseAIError } from '../utils/errors';

/**
 * 错误显示配置接口
 */
export interface ErrorDisplayConfig {
	/** 错误对象 */
	error: BaseAIError;
	
	/** 是否显示重试按钮 */
	showRetry?: boolean;
	
	/** 重试回调函数 */
	onRetry?: () => void;
	
	/** 关闭回调函数 */
	onClose?: () => void;
}

/**
 * 错误显示类
 * 
 * 管理错误消息的显示，包括重试按钮和关闭功能
 */
export class ErrorDisplay {
	private element: HTMLElement;
	private messageElement: HTMLElement;
	private detailsElement: HTMLElement;
	private retryButton?: HTMLButtonElement;
	private closeButton: HTMLButtonElement;
	private config: ErrorDisplayConfig;
	
	/**
	 * 创建错误显示组件
	 * 
	 * @param container - 父容器元素
	 * @param config - 错误显示配置
	 */
	constructor(container: HTMLElement, config: ErrorDisplayConfig) {
		this.config = config;
		this.element = this.createErrorElement();
		this.messageElement = this.element.querySelector('.ai-error-message') as HTMLElement;
		this.detailsElement = this.element.querySelector('.ai-error-details') as HTMLElement;
		this.closeButton = this.element.querySelector('.ai-error-close') as HTMLButtonElement;
		
		// 设置错误内容
		this.setError(config.error);
		
		// 如果错误可重试且配置允许，显示重试按钮
		if (config.error.retryable && config.showRetry !== false) {
			this.showRetryButton();
		}
		
		container.appendChild(this.element);
	}
	
	/**
	 * 创建错误显示 DOM 元素
	 * 
	 * @returns 错误显示元素
	 */
	private createErrorElement(): HTMLElement {
		const container = document.createElement('div');
		container.className = 'ai-error-display';
		
		// 错误图标
		const icon = document.createElement('div');
		icon.className = 'ai-error-icon';
		icon.innerHTML = '⚠️';
		
		// 错误内容容器
		const content = document.createElement('div');
		content.className = 'ai-error-content';
		
		// 错误消息
		const message = document.createElement('div');
		message.className = 'ai-error-message';
		
		// 错误详情（可折叠）
		const details = document.createElement('div');
		details.className = 'ai-error-details';
		details.style.display = 'none';
		
		// 按钮容器
		const actions = document.createElement('div');
		actions.className = 'ai-error-actions';
		
		// 关闭按钮
		const closeButton = document.createElement('button');
		closeButton.className = 'ai-error-close';
		closeButton.textContent = '关闭';
		closeButton.addEventListener('click', () => this.handleClose());
		
		actions.appendChild(closeButton);
		
		content.appendChild(message);
		content.appendChild(details);
		content.appendChild(actions);
		
		container.appendChild(icon);
		container.appendChild(content);
		
		return container;
	}
	
	/**
	 * 设置错误内容
	 * 
	 * @param error - 错误对象
	 * 
	 * **验证需求：5.1, 5.3**
	 */
	setError(error: BaseAIError): void {
		// 显示用户友好的错误消息
		this.messageElement.textContent = error.message;
		
		// 如果有详细信息，显示详情
		if (error.details) {
			this.detailsElement.textContent = error.details;
			this.detailsElement.style.display = 'block';
		} else {
			this.detailsElement.style.display = 'none';
		}
		
		// 根据错误类型设置样式
		this.element.className = 'ai-error-display';
		if (error.retryable) {
			this.element.classList.add('ai-error-retryable');
		}
	}
	
	/**
	 * 显示重试按钮
	 * 
	 * **验证需求：5.4**
	 */
	private showRetryButton(): void {
		if (this.retryButton) {
			return; // 已经存在
		}
		
		const actions = this.element.querySelector('.ai-error-actions') as HTMLElement;
		
		this.retryButton = document.createElement('button');
		this.retryButton.className = 'ai-error-retry';
		this.retryButton.textContent = '重试';
		this.retryButton.addEventListener('click', () => this.handleRetry());
		
		// 插入到关闭按钮之前
		actions.insertBefore(this.retryButton, this.closeButton);
	}
	
	/**
	 * 隐藏重试按钮
	 */
	hideRetryButton(): void {
		if (this.retryButton) {
			this.retryButton.remove();
			this.retryButton = undefined;
		}
	}
	
	/**
	 * 处理重试按钮点击
	 */
	private handleRetry(): void {
		if (this.config.onRetry) {
			this.config.onRetry();
		}
	}
	
	/**
	 * 处理关闭按钮点击
	 */
	private handleClose(): void {
		if (this.config.onClose) {
			this.config.onClose();
		}
		this.remove();
	}
	
	/**
	 * 切换详情显示
	 */
	toggleDetails(): void {
		const isHidden = this.detailsElement.style.display === 'none';
		this.detailsElement.style.display = isHidden ? 'block' : 'none';
	}
	
	/**
	 * 移除错误显示
	 * 
	 * 从 DOM 中完全移除元素
	 */
	remove(): void {
		this.element.remove();
	}
	
	/**
	 * 获取 DOM 元素
	 * 
	 * @returns 错误显示的 DOM 元素
	 */
	getElement(): HTMLElement {
		return this.element;
	}
	
	/**
	 * 更新错误消息
	 * 
	 * @param message - 新的错误消息
	 */
	updateMessage(message: string): void {
		this.messageElement.textContent = message;
	}
	
	/**
	 * 更新错误详情
	 * 
	 * @param details - 新的错误详情
	 */
	updateDetails(details: string): void {
		this.detailsElement.textContent = details;
		if (details) {
			this.detailsElement.style.display = 'block';
		}
	}
}
