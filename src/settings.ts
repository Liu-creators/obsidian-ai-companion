import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";
import { ContextScope } from "./types/context";
import { ShortcutCaptureModal } from "./ui/shortcut-capture-modal";

/**
 * 上下文快捷键配置接口
 */
export interface ContextShortcut {
	/** 快捷键修饰符（如 'Shift', 'Ctrl', 'Alt', 'Mod'） */
	modifiers: string[];
	/** 快捷键（如 'Enter'） */
	key: string;
	/** 上下文范围类型 */
	contextType: 'none' | 'before-cursor' | 'settings';
	/** 显示名称 */
	displayName: string;
}

/**
 * Canvas 上下文快捷键配置接口
 */
export interface CanvasContextShortcut {
	/** 快捷键修饰符 */
	modifiers: string[];
	/** 快捷键 */
	key: string;
	/** 上下文范围类型 */
	contextType: 'current-node' | 'connected-nodes';
	/** 显示名称 */
	displayName: string;
}

/**
 * AI 服务提供商类型
 */
export type AIProvider = 'deepseek' | 'moonshot' | 'qwen' | 'zhipu' | 'openai' | 'openrouter' | 'ollama' | 'lmstudio' | 'custom';

/**
 * AI 服务提供商配置接口
 */
export interface AIProviderConfig {
	/** API 端点 URL */
	apiEndpoint: string;
	/** API 密钥 */
	apiKey: string;
	/** 模型名称 */
	model: string;
}

/**
 * Canvas 设置接口
 * 
 * 定义 Canvas AI 功能的配置选项。
 * 
 * **验证需求：9.1, 9.2**
 */
export interface CanvasSettings {
	/** 是否启用 Canvas 功能 */
	enabled: boolean;
	
	/** 是否在输入弹框中显示快捷键提示 */
	showShortcutHints: boolean;
	
	/** Canvas 上下文快捷键配置 */
	shortcuts: CanvasContextShortcut[];
	
	/** 新节点位置偏移 */
	newNodeOffset: {
		x: number;
		y: number;
	};
	
	/** 新节点默认大小 */
	newNodeSize: {
		width: number;
		height: number;
	};
}

/**
 * AI 插件设置接口
 * 
 * 定义了插件的所有配置选项，包括 AI 服务配置、上下文配置和 UI 配置。
 * 
 * **验证需求：1.1, 1.2, 1.3**
 */
export interface AIPluginSettings {
	// ========== AI 服务配置 ==========
	
	/** 当前选择的 AI 服务提供商 */
	selectedProvider: AIProvider;

	/** 各个提供商的配置 */
	providers: Record<AIProvider, AIProviderConfig>;

	// 兼容旧版本字段（可选，用于迁移）
	apiEndpoint?: string;
	apiKey?: string;
	model?: string;
	
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
	
	/** 上下文快捷键配置 */
	contextShortcuts: ContextShortcut[];
	
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
	
	// ========== Canvas 配置 ==========
	
	/** Canvas AI 功能设置 */
	canvasSettings: CanvasSettings;
}

/**
 * 默认 Canvas 设置常量
 * 
 * 提供 Canvas 功能的默认配置值。
 * 
 * **验证需求：9.2**
 */
export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
	enabled: true,
	showShortcutHints: true,
	shortcuts: [
		{
			modifiers: [],
			key: 'Enter',
			contextType: 'current-node',
			displayName: '仅当前节点'
		},
		{
			modifiers: ['Shift'],
			key: 'Enter',
			contextType: 'connected-nodes',
			displayName: '包含相连节点'
		}
	],
	newNodeOffset: { x: 0, y: 150 },
	newNodeSize: { width: 400, height: 200 }
};

/**
 * 默认设置常量
 * 
 * 提供所有设置项的默认值，确保插件在首次安装时有合理的初始配置。
 * 默认使用 DeepSeek API 配置。
 * 
 * **验证需求：1.1, 1.2, 1.3**
 */
export const DEFAULT_SETTINGS: AIPluginSettings = {
	// AI 服务配置
	selectedProvider: 'deepseek',
	providers: {
		deepseek: {
			apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
			apiKey: '',
			model: 'deepseek-chat'
		},
		moonshot: {
			apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions',
			apiKey: '',
			model: 'moonshot-v1-8k'
		},
		qwen: {
			apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
			apiKey: '',
			model: 'qwen-plus'
		},
		zhipu: {
			apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
			apiKey: '',
			model: 'glm-4'
		},
		openai: {
			apiEndpoint: 'https://api.openai.com/v1/chat/completions',
			apiKey: '',
			model: 'gpt-4o'
		},
		openrouter: {
			apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
			apiKey: '',
			model: 'anthropic/claude-3.5-sonnet'
		},
		ollama: {
			apiEndpoint: 'http://localhost:11434/v1/chat/completions',
			apiKey: 'ollama', // Ollama 通常不需要 key，但这可以作为占位符
			model: 'llama3'
		},
		lmstudio: {
			apiEndpoint: 'http://localhost:1234/v1/chat/completions',
			apiKey: 'lm-studio',
			model: 'local-model'
		},
		custom: {
			apiEndpoint: '',
			apiKey: '',
			model: ''
		}
	},
	
	timeout: 30000,
	maxRetries: 2,
	
	// 上下文配置
	contextEnabled: false,
	contextScope: 'paragraph',
	maxContextLength: 2000,
	contextShortcuts: [
		{
			modifiers: [],
			key: 'Enter',
			contextType: 'settings',
			displayName: '遵循设置'
		},
		{
			modifiers: ['Shift'],
			key: 'Enter',
			contextType: 'before-cursor',
			displayName: '光标前全部内容'
		}
	],
	
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
	logAIInteractions: false,
	
	// Canvas 配置
	canvasSettings: DEFAULT_CANVAS_SETTINGS
};

/**
 * AI 插件设置面板
 * 
 * 提供用户界面来配置插件的所有设置项。
 * 
 * **验证需求：1.1, 1.2, 1.3, 7.2, 7.5**
 */
/**
 * 任意类型的快捷键配置
 */
type AnyShortcut = ContextShortcut | CanvasContextShortcut;

export class AIPluginSettingTab extends PluginSettingTab {
	plugin: MyPlugin;
	private activeTab: 'ai-service' | 'interaction' | 'context' | 'canvas' | 'appearance' = 'ai-service';

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// 创建 Tab 导航栏
		this.renderTabBar(containerEl);

		// 根据当前激活的 Tab 渲染对应内容
		const contentContainer = containerEl.createDiv('settings-tab-content');
		
		switch (this.activeTab) {
			case 'ai-service':
				this.displayAIServiceSettings(contentContainer);
				break;
			case 'interaction':
				this.displayInteractionSettings(contentContainer);
				break;
			case 'context':
				this.displayContextSettings(contentContainer);
				break;
			case 'canvas':
				this.displayCanvasSettings(contentContainer);
				break;
			case 'appearance':
				this.displayAppearanceSettings(contentContainer);
				break;
		}
	}

	private renderTabBar(containerEl: HTMLElement): void {
		const tabBar = containerEl.createDiv('nav-buttons-container');
		tabBar.style.display = 'flex';
		tabBar.style.marginBottom = '20px';
		tabBar.style.gap = '10px';
		tabBar.style.borderBottom = '1px solid var(--background-modifier-border)';
		tabBar.style.paddingBottom = '10px';

		const tabs: { id: 'ai-service' | 'interaction' | 'context' | 'canvas' | 'appearance'; name: string }[] = [
			{ id: 'ai-service', name: 'AI 服务' },
			{ id: 'interaction', name: '交互与行为' },
			{ id: 'context', name: '上下文与快捷键' },
			{ id: 'canvas', name: '白板 (Canvas)' },
			{ id: 'appearance', name: '外观与高级' }
		];

		tabs.forEach(tab => {
			const button = tabBar.createEl('button', { text: tab.name });
			button.style.flex = '1';
			button.style.cursor = 'pointer';
			
			if (this.activeTab === tab.id) {
				button.classList.add('mod-cta');
			} else {
				button.onclick = () => {
					this.activeTab = tab.id;
					this.display();
				};
			}
		});
	}

	private displayAIServiceSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("AI 服务配置").setHeading();
		containerEl.createEl('p', { text: '配置 AI 模型提供商的连接信息。', cls: 'setting-item-description' });

		// 1. AI 服务提供商选择
		new Setting(containerEl)
			.setName('AI 服务提供商')
			.setDesc('选择您要使用的 AI 服务平台')
			.addDropdown(dropdown => dropdown
				.addOption('deepseek', 'DeepSeek (深度求索)')
				.addOption('moonshot', 'Moonshot (Kimi)')
				.addOption('qwen', 'Qwen (通义千问)')
				.addOption('zhipu', 'Zhipu (智谱 AI)')
				.addOption('openai', 'OpenAI')
				.addOption('openrouter', 'OpenRouter')
				.addOption('ollama', 'Ollama (本地)')
				.addOption('lmstudio', 'LM Studio (本地)')
				.addOption('custom', '自定义 (Custom)')
				.setValue(this.plugin.settings.selectedProvider || 'deepseek')
				.onChange(async (value) => {
					this.plugin.settings.selectedProvider = value as AIProvider;
					await this.plugin.saveSettings();
					this.display(); // 刷新界面以显示对应的配置项
				}));

		const provider = this.plugin.settings.selectedProvider || 'deepseek';
		const config = this.plugin.settings.providers[provider];

		// 2. API 端点
		new Setting(containerEl)
			.setName('API 端点')
			.setDesc(`AI 服务的 API 端点 URL${provider === 'ollama' ? ' (例如 http://localhost:11434/v1/chat/completions)' : ''}`)
			.addText(text => text
				.setPlaceholder('https://api.example.com/v1/chat/completions')
				.setValue(config.apiEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.providers[provider].apiEndpoint = value.trim();
					// 如果是 Custom 模式，需要手动保存
					if (provider === 'custom') {
						await this.plugin.saveSettings();
					}
				}));

		// 3. API 密钥 (本地模型可能不需要)
		if (provider !== 'ollama' && provider !== 'lmstudio') {
			new Setting(containerEl)
				.setName('API 密钥')
				.setDesc('您的 AI 服务 API 密钥（将安全存储）')
				.addText(text => {
					text
						.setPlaceholder('sk-...')
						.setValue(config.apiKey)
						.onChange(async (value) => {
							this.plugin.settings.providers[provider].apiKey = value.trim();
							// 如果是 Custom 模式，需要手动保存
							if (provider === 'custom') {
								await this.plugin.saveSettings();
							}
						});
					text.inputEl.type = 'password';
				});
		}

		// 4. AI 模型
		const modelSetting = new Setting(containerEl)
			.setName('AI 模型')
			.setDesc('要使用的 AI 模型名称');
		
		let placeholder = 'gpt-4o';
		if (provider === 'deepseek') placeholder = 'deepseek-chat';
		else if (provider === 'qwen') placeholder = 'qwen-plus';
		else if (provider === 'zhipu') placeholder = 'glm-4';
		else if (provider === 'ollama') placeholder = 'llama3';
		else if (provider === 'moonshot') placeholder = 'moonshot-v1-8k';
		
		modelSetting.addText(text => text
			.setPlaceholder(placeholder)
			.setValue(config.model)
			.onChange(async (value) => {
				this.plugin.settings.providers[provider].model = value.trim();
				await this.plugin.saveSettings();
			}));

		// 连接测试按钮
		new Setting(containerEl)
			.setName('测试 API 连接')
			.setDesc('验证当前配置是否有效')
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
						new Notice(`✓ [${provider}] 连接测试成功！`);
						button.setButtonText('测试成功');
						
						setTimeout(() => {
							button.setButtonText('测试连接');
							button.setDisabled(false);
						}, 2000);
						
					} catch (error) {
						// 显示错误消息
						new Notice('✗ 连接测试失败：' + (error as Error).message);
						button.setButtonText('测试失败');
						
						setTimeout(() => {
							button.setButtonText('测试连接');
							button.setDisabled(false);
						}, 2000);
					}
				}));
	}

	private displayInteractionSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("交互与行为配置").setHeading();
		containerEl.createEl('p', { text: '自定义 AI 的响应方式和网络行为。', cls: 'setting-item-description' });

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

		new Setting(containerEl).setName("网络参数").setHeading();

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
	}

	private displayContextSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("上下文与快捷键配置").setHeading();
		containerEl.createEl('p', { text: '定义 AI 可以读取的上下文范围以及触发方式。', cls: 'setting-item-description' });

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

		// 上下文快捷键配置
		new Setting(containerEl).setName("编辑器快捷键").setHeading();
		containerEl.createEl('p', { 
			text: '配置在文档编辑模式下的 AI 交互方式。使用方法：在编辑器中输入 / 后，按下对应快捷键提交问题。',
			cls: 'setting-item-description'
		});

		// 显示当前快捷键配置
		this.plugin.settings.contextShortcuts.forEach((shortcut, index) => {
			const shortcutSetting = new Setting(containerEl)
				.setName(`快捷键 ${index + 1}`)
				.setDesc(this.getShortcutDescription(shortcut));

			// 显示快捷键组合（可点击编辑）
			const shortcutText = this.formatShortcut(shortcut);
			shortcutSetting.addButton(button => {
				button
					.setButtonText(shortcutText)
					.setTooltip('点击修改快捷键')
					.onClick(async () => {
						// 打开快捷键捕获模态框
						new ShortcutCaptureModal(this.app, async (captured) => {
							if (captured) {
								const shortcuts = this.plugin.settings.contextShortcuts;
								if (shortcuts[index]) {
									shortcuts[index].modifiers = captured.modifiers;
									shortcuts[index].key = captured.key;
									await this.plugin.saveSettings();
									this.display();
								}
							}
						}).open();
					});
			});

			// 上下文类型选择
			shortcutSetting.addDropdown(dropdown => dropdown
				.addOption('none', '无上下文')
				.addOption('before-cursor', '光标前全部内容')
				.addOption('settings', '遵循设置')
				.setValue(shortcut.contextType)
				.onChange(async (value) => {
					const shortcuts = this.plugin.settings.contextShortcuts;
					if (shortcuts[index]) {
						shortcuts[index].contextType = value as 'none' | 'before-cursor' | 'settings';
						await this.plugin.saveSettings();
						this.display();
					}
				}));

			// 删除按钮（至少保留一个快捷键）
			if (this.plugin.settings.contextShortcuts.length > 1) {
				shortcutSetting.addButton(button => button
					.setButtonText('删除')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.contextShortcuts.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
			}
		});

		// 添加新快捷键按钮
		new Setting(containerEl)
			.setName('添加快捷键')
			.setDesc('添加新的上下文快捷键配置')
			.addButton(button => button
				.setButtonText('添加')
				.setCta()
				.onClick(async () => {
					// 添加一个新的快捷键配置
					this.plugin.settings.contextShortcuts.push({
						modifiers: ['Ctrl'],
						key: 'Enter',
						contextType: 'none',
						displayName: '自定义快捷键'
					});
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private displayAppearanceSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("外观与高级配置").setHeading();
		containerEl.createEl('p', { text: '自定义 AI 响应的视觉样式及调试选项。', cls: 'setting-item-description' });

		new Setting(containerEl).setName("颜色设置").setHeading();

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

		new Setting(containerEl).setName("调试选项").setHeading();

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

	private displayCanvasSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Canvas 配置").setHeading();
		
		// 启用 Canvas 功能
		new Setting(containerEl)
			.setName('启用 Canvas 功能')
			.setDesc('在 Obsidian Canvas 中启用 AI 助手')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.canvasSettings.enabled)
				.onChange(async (value) => {
					this.plugin.settings.canvasSettings.enabled = value;
					await this.plugin.saveSettings();
					this.display();
				}));
				
		if (this.plugin.settings.canvasSettings.enabled) {
			// Canvas 快捷键提示
			new Setting(containerEl)
				.setName('显示快捷键提示')
				.setDesc('在 Canvas 输入框中显示快捷键提示')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.canvasSettings.showShortcutHints)
					.onChange(async (value) => {
						this.plugin.settings.canvasSettings.showShortcutHints = value;
						await this.plugin.saveSettings();
					}));

			// Canvas 快捷键配置
			new Setting(containerEl).setName("Canvas AI 快捷键").setHeading();
			containerEl.createEl('p', { 
				text: '配置在 Canvas 白板界面下的 AI 交互方式。使用方法：选中节点后，直接按下对应快捷键触发 AI。',
				cls: 'setting-item-description'
			});

			// 确保 shortcuts 数组存在 (为了兼容旧配置)
			if (!this.plugin.settings.canvasSettings.shortcuts) {
				this.plugin.settings.canvasSettings.shortcuts = DEFAULT_CANVAS_SETTINGS.shortcuts;
			}

			this.plugin.settings.canvasSettings.shortcuts.forEach((shortcut, index) => {
				const shortcutSetting = new Setting(containerEl)
					.setName(`快捷键 ${index + 1}`)
					.setDesc(this.getShortcutDescription(shortcut));

				// 显示快捷键组合（可点击编辑）
				const shortcutText = this.formatShortcut(shortcut);
				shortcutSetting.addButton(button => {
					button
						.setButtonText(shortcutText)
						.setTooltip('点击修改快捷键')
						.onClick(async () => {
							// 打开快捷键捕获模态框
							new ShortcutCaptureModal(this.app, async (captured) => {
								if (captured) {
									const shortcuts = this.plugin.settings.canvasSettings.shortcuts;
									if (shortcuts[index]) {
										shortcuts[index].modifiers = captured.modifiers;
										shortcuts[index].key = captured.key;
										await this.plugin.saveSettings();
										this.display();
									}
								}
							}).open();
						});
				});

				// 上下文类型选择
				shortcutSetting.addDropdown(dropdown => dropdown
					.addOption('current-node', '仅当前节点')
					.addOption('connected-nodes', '包含相连节点')
					.setValue(shortcut.contextType)
					.onChange(async (value) => {
						const shortcuts = this.plugin.settings.canvasSettings.shortcuts;
						if (shortcuts[index]) {
							shortcuts[index].contextType = value as 'current-node' | 'connected-nodes';
							// 更新显示名称
							shortcuts[index].displayName = value === 'current-node' ? '仅当前节点' : '包含相连节点';
							await this.plugin.saveSettings();
							this.display();
						}
					}));

				// 删除按钮（至少保留一个快捷键）
				if (this.plugin.settings.canvasSettings.shortcuts.length > 1) {
					shortcutSetting.addButton(button => button
						.setButtonText('删除')
						.setWarning()
						.onClick(async () => {
							this.plugin.settings.canvasSettings.shortcuts.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						}));
				}
			});

			// 添加新快捷键按钮
			new Setting(containerEl)
				.setName('添加 Canvas 快捷键')
				.setDesc('添加新的 Canvas 上下文快捷键配置')
				.addButton(button => button
					.setButtonText('添加')
					.setCta()
					.onClick(async () => {
						// 添加一个新的快捷键配置
						this.plugin.settings.canvasSettings.shortcuts.push({
							modifiers: ['Ctrl'],
							key: 'Enter',
							contextType: 'current-node',
							displayName: '仅当前节点'
						});
						await this.plugin.saveSettings();
						this.display();
					}));
		
			// 新节点位置偏移 X
			new Setting(containerEl)
				.setName('新节点位置偏移 X')
				.setDesc('AI 响应节点相对于触发节点的水平偏移（像素）')
				.addText(text => text
					.setPlaceholder('0')
					.setValue(String(this.plugin.settings.canvasSettings.newNodeOffset.x))
					.onChange(async (value) => {
						const offset = parseInt(value);
						if (!isNaN(offset)) {
							this.plugin.settings.canvasSettings.newNodeOffset.x = offset;
							await this.plugin.saveSettings();
						}
					}));

			// 新节点位置偏移 Y
			new Setting(containerEl)
				.setName('新节点位置偏移 Y')
				.setDesc('AI 响应节点相对于触发节点的垂直偏移（像素）')
				.addText(text => text
					.setPlaceholder('150')
					.setValue(String(this.plugin.settings.canvasSettings.newNodeOffset.y))
					.onChange(async (value) => {
						const offset = parseInt(value);
						if (!isNaN(offset)) {
							this.plugin.settings.canvasSettings.newNodeOffset.y = offset;
							await this.plugin.saveSettings();
						}
					}));

			// 新节点默认宽度
			new Setting(containerEl)
				.setName('新节点默认宽度')
				.setDesc('AI 响应节点的默认宽度（像素）')
				.addText(text => text
					.setPlaceholder('400')
					.setValue(String(this.plugin.settings.canvasSettings.newNodeSize.width))
					.onChange(async (value) => {
						const width = parseInt(value);
						if (!isNaN(width) && width > 0) {
							this.plugin.settings.canvasSettings.newNodeSize.width = width;
							await this.plugin.saveSettings();
						}
					}));

			// 新节点默认高度
			new Setting(containerEl)
				.setName('新节点默认高度')
				.setDesc('AI 响应节点的默认高度（像素）')
				.addText(text => text
					.setPlaceholder('200')
					.setValue(String(this.plugin.settings.canvasSettings.newNodeSize.height))
					.onChange(async (value) => {
						const height = parseInt(value);
						if (!isNaN(height) && height > 0) {
							this.plugin.settings.canvasSettings.newNodeSize.height = height;
							await this.plugin.saveSettings();
						}
					}));
		}
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
	
	/**
	 * 获取快捷键描述
	 */
	private getShortcutDescription(shortcut: AnyShortcut): string {
		// 根据 contextType 返回描述
		if (shortcut.contextType === 'current-node') return `仅发送当前节点内容`;
		if (shortcut.contextType === 'connected-nodes') return `发送包含相连节点上下文的内容`;
		
		// 兼容普通 shortcuts
		if (shortcut.contextType === 'none') return `仅发送 prompt`;
		if (shortcut.contextType === 'before-cursor') return `包含光标前内容`;
		if (shortcut.contextType === 'settings') return `遵循插件设置`;
		
		return `${shortcut.displayName}`;
	}

	/**
	 * 格式化快捷键显示
	 */
	private formatShortcut(shortcut: AnyShortcut): string {
		const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
		const mods = shortcut.modifiers.map((m: string) => {
			if (m === 'Mod') return isMac ? 'Cmd' : 'Ctrl';
			return m;
		});
		return [...mods, shortcut.key].join(' + ');
	}
}
