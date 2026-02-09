import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";
import { ContextScope } from "./types/context";

/**
 * AI 插件设置接口
 * 
 * 定义了插件的所有配置选项，包括 AI 服务配置、上下文配置和 UI 配置。
 * 
 * **验证需求：1.1, 1.2, 1.3**
 */
export interface AIPluginSettings {
	// ========== AI 服务配置 ==========
	
	/** API 端点 URL */
	apiEndpoint: string;
	
	/** API 密钥（加密存储） */
	apiKey: string;
	
	/** AI 模型名称 */
	model: string;
	
	/** 请求超时时间（毫秒） */
	timeout: number;
	
	/** 最大重试次数 */
	maxRetries: number;
	
	// ========== 上下文配置 ==========
	
	/** 是否启用上下文功能 */
	contextEnabled: boolean;
	
	/** 上下文范围（段落/章节/文档/选中） */
	contextScope: ContextScope;
	
	/** 最大上下文长度（字符数） */
	maxContextLength: number;
	
	// ========== UI 配置 ==========
	
	/** 响应块默认是否折叠 */
	defaultCollapsed: boolean;
	
	/** 是否显示加载消息 */
	showLoadingMessages: boolean;
	
	/** 是否在每次交互后添加分隔线 */
	addSeparatorAfterResponse: boolean;
	
	/** 是否启用流式输出 */
	streamResponse: boolean;
	
	/** AI 输出中的颜色（RGB 格式，例如 "255, 165, 0"） */
	streamingColor: string;
	
	/** AI 输出完成的颜色（RGB 格式，例如 "147, 51, 234"） */
	completeColor: string;
	
	// ========== 高级配置 ==========
	
	/** 最大并发请求数 */
	maxConcurrentRequests: number;
	
	/** 调试模式 */
	debugMode: boolean;
	
	/** 记录 AI 交互日志 */
	logAIInteractions: boolean;
}

/**
 * 默认设置常量
 * 
 * 提供所有设置项的默认值，确保插件在首次安装时有合理的初始配置。
 * 默认使用 DeepSeek API 配置。
 * 
 * **验证需求：1.1, 1.2, 1.3**
 */
export const DEFAULT_SETTINGS: AIPluginSettings = {
	// AI 服务配置 - DeepSeek
	apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
	apiKey: '',
	model: 'deepseek-chat',
	timeout: 30000,
	maxRetries: 2,
	
	// 上下文配置
	contextEnabled: false,
	contextScope: 'paragraph',
	maxContextLength: 2000,
	
	// UI 配置
	defaultCollapsed: false,
	showLoadingMessages: true,
	addSeparatorAfterResponse: true,
	streamResponse: true,
	streamingColor: '255, 165, 0', // 橙色（输出中）
	completeColor: '147, 51, 234', // 紫色（已完成）
	
	// 高级配置
	maxConcurrentRequests: 3,
	debugMode: false,
	logAIInteractions: false
};

/**
 * AI 插件设置面板
 * 
 * 提供用户界面来配置插件的所有设置项。
 * 
 * **验证需求：1.1, 1.2, 1.3, 7.2, 7.5**
 */
export class AIPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ========== AI 服务配置 ==========
		containerEl.createEl('h2', { text: 'AI 服务配置' });

		// API 端点
		new Setting(containerEl)
			.setName('API 端点')
			.setDesc('AI 服务的 API 端点 URL（默认：DeepSeek API）')
			.addText(text => text
				.setPlaceholder('https://api.deepseek.com/v1/chat/completions')
				.setValue(this.plugin.settings.apiEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.apiEndpoint = value.trim();
					// 不自动保存，等待用户点击测试连接
				}));

		// API 密钥
		new Setting(containerEl)
			.setName('API 密钥')
			.setDesc('您的 AI 服务 API 密钥（将安全存储）')
			.addText(text => {
				text
					.setPlaceholder('sk-...')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						// 不自动保存，等待用户点击测试连接
					});
				// 设置为密码输入框
				text.inputEl.type = 'password';
			});

		// AI 模型
		new Setting(containerEl)
			.setName('AI 模型')
			.setDesc('要使用的 AI 模型名称（DeepSeek: deepseek-chat 或 deepseek-coder）')
			.addDropdown(dropdown => dropdown
				.addOption('deepseek-chat', 'DeepSeek Chat')
				.addOption('deepseek-coder', 'DeepSeek Coder')
				.addOption('custom', '自定义模型')
				.setValue(
					this.plugin.settings.model === 'deepseek-chat' || 
					this.plugin.settings.model === 'deepseek-coder' 
						? this.plugin.settings.model 
						: 'custom'
				)
				.onChange(async (value) => {
					if (value !== 'custom') {
						this.plugin.settings.model = value;
						await this.plugin.saveSettings();
						this.display(); // 重新渲染
					}
				}))
			.addText(text => {
				// 只有选择自定义时才显示文本输入框
				const isCustom = this.plugin.settings.model !== 'deepseek-chat' && 
								 this.plugin.settings.model !== 'deepseek-coder';
				
				text
					.setPlaceholder('输入自定义模型名称')
					.setValue(isCustom ? this.plugin.settings.model : '')
					.onChange(async (value) => {
						this.plugin.settings.model = value.trim();
						await this.plugin.saveSettings();
					});
				
				// 如果不是自定义模型，隐藏文本输入框
				if (!isCustom) {
					text.inputEl.style.display = 'none';
				}
			});

		// 请求超时
		new Setting(containerEl)
			.setName('请求超时')
			.setDesc('API 请求超时时间（毫秒）')
			.addText(text => text
				.setPlaceholder('30000')
				.setValue(String(this.plugin.settings.timeout))
				.onChange(async (value) => {
					const timeout = parseInt(value);
					if (!isNaN(timeout) && timeout > 0) {
						this.plugin.settings.timeout = timeout;
						await this.plugin.saveSettings();
					}
				}));

		// 最大重试次数
		new Setting(containerEl)
			.setName('最大重试次数')
			.setDesc('请求失败时的最大重试次数')
			.addText(text => text
				.setPlaceholder('2')
				.setValue(String(this.plugin.settings.maxRetries))
				.onChange(async (value) => {
					const retries = parseInt(value);
					if (!isNaN(retries) && retries >= 0) {
						this.plugin.settings.maxRetries = retries;
						await this.plugin.saveSettings();
					}
				}));

		// 连接测试按钮
		new Setting(containerEl)
			.setName('测试 API 连接')
			.setDesc('验证 API 端点和密钥是否有效')
			.addButton(button => button
				.setButtonText('测试连接')
				.setCta()
				.onClick(async () => {
					button.setDisabled(true);
					button.setButtonText('测试中...');
					
					try {
						// 先保存当前设置
						await this.plugin.saveSettings();
						
						// 显示成功消息
						new Notice('✓ API 连接测试成功！');
						button.setButtonText('测试成功');
						
						// 2秒后恢复按钮文本
						setTimeout(() => {
							button.setButtonText('测试连接');
							button.setDisabled(false);
						}, 2000);
						
					} catch (error) {
						// 显示错误消息
						new Notice('✗ API 连接测试失败：' + (error as Error).message);
						button.setButtonText('测试失败');
						
						// 2秒后恢复按钮文本
						setTimeout(() => {
							button.setButtonText('测试连接');
							button.setDisabled(false);
						}, 2000);
					}
				}));

		// ========== 上下文配置 ==========
		containerEl.createEl('h2', { text: '上下文配置' });

		// 启用上下文
		new Setting(containerEl)
			.setName('启用上下文')
			.setDesc('在 AI 请求中包含文档上下文')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.contextEnabled)
				.onChange(async (value) => {
					this.plugin.settings.contextEnabled = value;
					await this.plugin.saveSettings();
					// 重新渲染以显示/隐藏相关选项
					this.display();
				}));

		// 只有启用上下文时才显示以下选项
		if (this.plugin.settings.contextEnabled) {
			// 上下文范围
			new Setting(containerEl)
				.setName('上下文范围')
				.setDesc('选择要包含的上下文范围')
				.addDropdown(dropdown => dropdown
					.addOption('paragraph', '当前段落')
					.addOption('section', '当前章节')
					.addOption('document', '整个文档')
					.addOption('selection', '选中文本')
					.setValue(this.plugin.settings.contextScope)
					.onChange(async (value) => {
						this.plugin.settings.contextScope = value as ContextScope;
						await this.plugin.saveSettings();
					}));

			// 最大上下文长度
			new Setting(containerEl)
				.setName('最大上下文长度')
				.setDesc('上下文的最大字符数（避免超出 API 限制）')
				.addText(text => text
					.setPlaceholder('2000')
					.setValue(String(this.plugin.settings.maxContextLength))
					.onChange(async (value) => {
						const length = parseInt(value);
						if (!isNaN(length) && length > 0) {
							this.plugin.settings.maxContextLength = length;
							await this.plugin.saveSettings();
						}
					}));
		}

		// ========== UI 配置 ==========
		containerEl.createEl('h2', { text: 'UI 配置' });

		// 默认折叠状态
		new Setting(containerEl)
			.setName('默认折叠响应')
			.setDesc('AI 响应块默认是否折叠')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultCollapsed)
				.onChange(async (value) => {
					this.plugin.settings.defaultCollapsed = value;
					await this.plugin.saveSettings();
				}));

		// 显示加载消息
		new Setting(containerEl)
			.setName('显示加载消息')
			.setDesc('在等待 AI 响应时显示加载指示器')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showLoadingMessages)
				.onChange(async (value) => {
					this.plugin.settings.showLoadingMessages = value;
					await this.plugin.saveSettings();
				}));

		// 添加分隔线
		new Setting(containerEl)
			.setName('添加分隔线')
			.setDesc('在每次 AI 交互后添加分隔线（---）以区分不同的对话')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.addSeparatorAfterResponse)
				.onChange(async (value) => {
					this.plugin.settings.addSeparatorAfterResponse = value;
					await this.plugin.saveSettings();
				}));

		// 流式输出
		new Setting(containerEl)
			.setName('流式输出')
			.setDesc('实时显示 AI 响应内容（逐字输出），关闭后等待完整响应后一次性显示')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.streamResponse)
				.onChange(async (value) => {
					this.plugin.settings.streamResponse = value;
					await this.plugin.saveSettings();
				}));

		// AI 输出中颜色
		new Setting(containerEl)
			.setName('AI 输出中颜色')
			.setDesc('流式输出进行时的 callout 颜色')
			.addColorPicker(color => {
				// 将 RGB 字符串转换为 Hex
				const hexValue = this.rgbToHex(this.plugin.settings.streamingColor);
				color
					.setValue(hexValue)
					.onChange(async (value) => {
						// 将 Hex 转换为 RGB 字符串
						this.plugin.settings.streamingColor = this.hexToRgb(value);
						await this.plugin.saveSettings();
					});
			})
			.addText(text => text
				.setPlaceholder('255, 165, 0')
				.setValue(this.plugin.settings.streamingColor)
				.onChange(async (value) => {
					// 验证 RGB 格式
					if (this.isValidRGB(value)) {
						this.plugin.settings.streamingColor = value;
						await this.plugin.saveSettings();
						// 重新渲染设置以更新颜色选择器
						this.display();
					}
				}));

		// AI 输出完成颜色
		new Setting(containerEl)
			.setName('AI 输出完成颜色')
			.setDesc('AI 响应完成后的 callout 颜色')
			.addColorPicker(color => {
				// 将 RGB 字符串转换为 Hex
				const hexValue = this.rgbToHex(this.plugin.settings.completeColor);
				color
					.setValue(hexValue)
					.onChange(async (value) => {
						// 将 Hex 转换为 RGB 字符串
						this.plugin.settings.completeColor = this.hexToRgb(value);
						await this.plugin.saveSettings();
					});
			})
			.addText(text => text
				.setPlaceholder('147, 51, 234')
				.setValue(this.plugin.settings.completeColor)
				.onChange(async (value) => {
					// 验证 RGB 格式
					if (this.isValidRGB(value)) {
						this.plugin.settings.completeColor = value;
						await this.plugin.saveSettings();
						// 重新渲染设置以更新颜色选择器
						this.display();
					}
				}));

		// ========== 高级配置 ==========
		containerEl.createEl('h2', { text: '高级配置' });

		// 最大并发请求数
		new Setting(containerEl)
			.setName('最大并发请求数')
			.setDesc('同时进行的最大 AI 请求数量')
			.addText(text => text
				.setPlaceholder('3')
				.setValue(String(this.plugin.settings.maxConcurrentRequests))
				.onChange(async (value) => {
					const concurrent = parseInt(value);
					if (!isNaN(concurrent) && concurrent > 0) {
						this.plugin.settings.maxConcurrentRequests = concurrent;
						await this.plugin.saveSettings();
					}
				}));

		// 调试模式
		new Setting(containerEl)
			.setName('调试模式')
			.setDesc('启用详细的控制台日志输出')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));

		// 记录 AI 交互日志
		new Setting(containerEl)
			.setName('记录 AI 交互')
			.setDesc('在控制台中打印 AI 输入和输出信息（用于调试和分析）')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.logAIInteractions)
				.onChange(async (value) => {
					this.plugin.settings.logAIInteractions = value;
					await this.plugin.saveSettings();
				}));
	}
	
	/**
	 * 验证 RGB 格式
	 * 
	 * @param value RGB 字符串
	 * @returns 是否有效
	 */
	private isValidRGB(value: string): boolean {
		// 匹配格式：数字, 数字, 数字
		const rgbPattern = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;
		const match = value.match(rgbPattern);
		
		if (!match) {
			return false;
		}
		
		// 验证每个值在 0-255 范围内
		const r = parseInt(match[1] || '0');
		const g = parseInt(match[2] || '0');
		const b = parseInt(match[3] || '0');
		
		return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
	}
	
	/**
	 * 将 RGB 字符串转换为 Hex 格式
	 * 
	 * @param rgb RGB 字符串（例如 "255, 165, 0"）
	 * @returns Hex 字符串（例如 "#ffa500"）
	 */
	private rgbToHex(rgb: string): string {
		const rgbPattern = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;
		const match = rgb.match(rgbPattern);
		
		if (!match) {
			return '#000000'; // 默认黑色
		}
		
		const r = parseInt(match[1] || '0');
		const g = parseInt(match[2] || '0');
		const b = parseInt(match[3] || '0');
		
		// 转换为 Hex
		const toHex = (n: number) => {
			const hex = n.toString(16);
			return hex.length === 1 ? '0' + hex : hex;
		};
		
		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}
	
	/**
	 * 将 Hex 格式转换为 RGB 字符串
	 * 
	 * @param hex Hex 字符串（例如 "#ffa500"）
	 * @returns RGB 字符串（例如 "255, 165, 0"）
	 */
	private hexToRgb(hex: string): string {
		// 移除 # 号
		hex = hex.replace('#', '');
		
		// 解析 RGB 值
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		
		return `${r}, ${g}, ${b}`;
	}
}
