/**
 * 加载指示器组件
 * 
 * 在等待 AI 响应时显示加载状态，提供视觉反馈。
 * 
 * **验证需求：4.1, 4.2, 4.3**
 */

/**
 * 加载指示器类
 * 
 * 管理加载状态的显示和隐藏，包含动画效果
 */
export class LoadingIndicator {
	private element: HTMLElement;
	private messageElement: HTMLElement;
	private isVisible: boolean = false;
	
	/**
	 * 创建加载指示器
	 * 
	 * @param container - 父容器元素
	 * @param message - 加载消息（默认："正在思考..."）
	 */
	constructor(container: HTMLElement, message: string = '正在思考...') {
		this.element = this.createIndicatorElement();
		this.messageElement = this.element.querySelector('.ai-loading-message') as HTMLElement;
		this.setMessage(message);
		container.appendChild(this.element);
	}
	
	/**
	 * 创建加载指示器 DOM 元素
	 * 
	 * @returns 加载指示器元素
	 */
	private createIndicatorElement(): HTMLElement {
		const container = document.createElement('div');
		container.className = 'ai-loading-indicator';
		container.style.display = 'none'; // 初始隐藏
		
		// 创建加载动画容器
		const spinner = document.createElement('div');
		spinner.className = 'ai-loading-spinner';
		
		// 创建三个动画点
		for (let i = 0; i < 3; i++) {
			const dot = document.createElement('div');
			dot.className = 'ai-loading-dot';
			spinner.appendChild(dot);
		}
		
		// 创建消息元素
		const message = document.createElement('div');
		message.className = 'ai-loading-message';
		
		container.appendChild(spinner);
		container.appendChild(message);
		
		return container;
	}
	
	/**
	 * 显示加载指示器
	 * 
	 * **验证需求：4.1**
	 */
	show(): void {
		if (!this.isVisible) {
			this.element.style.display = 'flex';
			this.isVisible = true;
		}
	}
	
	/**
	 * 隐藏加载指示器
	 * 
	 * **验证需求：4.3**
	 */
	hide(): void {
		if (this.isVisible) {
			this.element.style.display = 'none';
			this.isVisible = false;
		}
	}
	
	/**
	 * 设置加载消息
	 * 
	 * @param message - 新的加载消息
	 * 
	 * **验证需求：4.2**
	 */
	setMessage(message: string): void {
		this.messageElement.textContent = message;
	}
	
	/**
	 * 更新进度信息
	 * 
	 * @param progress - 进度信息（如 "正在处理第 2/3 步..."）
	 * 
	 * **验证需求：4.2**
	 */
	updateProgress(progress: string): void {
		this.setMessage(progress);
	}
	
	/**
	 * 检查是否可见
	 * 
	 * @returns 是否可见
	 */
	isShown(): boolean {
		return this.isVisible;
	}
	
	/**
	 * 移除加载指示器
	 * 
	 * 从 DOM 中完全移除元素
	 */
	remove(): void {
		this.hide();
		this.element.remove();
	}
	
	/**
	 * 获取 DOM 元素
	 * 
	 * @returns 加载指示器的 DOM 元素
	 */
	getElement(): HTMLElement {
		return this.element;
	}
}
