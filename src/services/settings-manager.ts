/**
 * 设置管理器
 * 
 * 负责管理插件的所有配置，包括加载、保存、验证等功能。
 * 
 * **验证需求：1.4, 1.5**
 */

import { Plugin } from 'obsidian';
import { AIPluginSettings, DEFAULT_SETTINGS } from '../settings';
import { AIServiceConfig } from '../types/ai-service';

/**
 * 设置管理器类
 * 
 * 提供设置的加载、保存、验证和访问功能。
 */
export class SettingsManager {
	private plugin: Plugin;
	private settings: AIPluginSettings;
	
	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.settings = { ...DEFAULT_SETTINGS };
	}
	
	/**
	 * 加载设置
	 * 
	 * 从插件数据存储中加载设置，如果不存在则使用默认值。
	 * 
	 * **验证需求：1.4**
	 */
	async loadSettings(): Promise<void> {
		const loadedData = await this.plugin.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
	}
	
	/**
	 * 保存设置
	 * 
	 * 在保存前验证 API 连接，如果验证失败则阻止保存。
	 * 
	 * **验证需求：1.4, 1.5**
	 * 
	 * @throws {Error} 如果 API 连接验证失败
	 */
	async saveSettings(): Promise<void> {
		// 如果配置了 API 端点和密钥，则验证连接
		if (this.settings.apiEndpoint && this.settings.apiKey) {
			const isValid = await this.validateConnection();
			if (!isValid) {
				throw new Error('API 连接验证失败，无法保存设置');
			}
		}
		
		await this.plugin.saveData(this.settings);
	}
	
	/**
	 * 获取当前设置
	 * 
	 * @returns 当前的插件设置
	 */
	getSettings(): AIPluginSettings {
		return this.settings;
	}
	
	/**
	 * 更新设置
	 * 
	 * @param updates 要更新的设置项
	 */
	updateSettings(updates: Partial<AIPluginSettings>): void {
		this.settings = Object.assign({}, this.settings, updates);
	}
	
	/**
	 * 获取 AI 服务配置
	 * 
	 * 从插件设置中提取 AI 服务所需的配置信息。
	 * 
	 * **验证需求：1.4**
	 * 
	 * @returns AI 服务配置对象
	 */
	getAIConfig(): AIServiceConfig {
		return {
			apiEndpoint: this.settings.apiEndpoint,
			apiKey: this.settings.apiKey,
			model: this.settings.model,
			timeout: this.settings.timeout,
			maxRetries: this.settings.maxRetries,
			logAIInteractions: this.settings.logAIInteractions,
			streamResponse: this.settings.streamResponse
		};
	}
	
	/**
	 * 验证 API 连接
	 * 
	 * 测试 API 端点和密钥是否有效。
	 * 
	 * **验证需求：1.5**
	 * 
	 * @returns 如果连接有效返回 true，否则返回 false
	 */
	async validateConnection(): Promise<boolean> {
		const config = this.getAIConfig();
		
		// 基本验证：检查必需字段
		if (!config.apiEndpoint || !config.apiKey) {
			return false;
		}
		
		try {
			// 发送测试请求到 API
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), config.timeout);
			
			const response = await fetch(config.apiEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${config.apiKey}`
				},
				body: JSON.stringify({
					model: config.model,
					messages: [
						{ role: 'user', content: 'test' }
					],
					max_tokens: 5
				}),
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			// 检查响应状态
			// 200-299 表示成功
			// 401/403 表示认证失败
			// 其他错误也视为连接失败
			return response.ok;
			
		} catch (error) {
			// 网络错误、超时等
			console.error('[Settings Manager] API 连接验证失败:', error);
			return false;
		}
	}
}
