import { Plugin } from 'obsidian';
import { AIPluginSettings, AIPluginSettingTab } from "./settings";
import { SettingsManager } from './services/settings-manager';
import { AIClient } from './services/ai-client';
import { EditorUIController } from './ui/editor-ui-controller';
import { CalloutStyleManager } from './ui/callout-style-manager';
import { AIEditorSuggest } from './suggest';
import { CommandRegistry } from './commands';
import { CanvasTriggerHandler } from './canvas/canvas-trigger-handler';
import { CanvasUIController } from './canvas/canvas-ui-controller';

/**
 * Obsidian AI 扩展插件
 * 
 * 主插件类，负责插件的生命周期管理和模块初始化。
 * 
 * **验证需求：所有需求**
 */
export default class MyPlugin extends Plugin {
	settings: AIPluginSettings;
	settingsManager: SettingsManager;
	aiClient: AIClient;
	editorUIController: EditorUIController;
	calloutStyleManager: CalloutStyleManager;
	aiEditorSuggest: AIEditorSuggest;
	commandRegistry: CommandRegistry;
	canvasTriggerHandler?: CanvasTriggerHandler;
	canvasUIController?: CanvasUIController;

	async onload() {
		// 初始化设置管理器
		this.settingsManager = new SettingsManager(this);
		await this.settingsManager.loadSettings();
		this.settings = this.settingsManager.getSettings();

		// 初始化 AI 客户端
		const aiConfig = this.settingsManager.getAIConfig();
		this.aiClient = new AIClient(aiConfig);

		// 初始化 Callout 样式管理器
		this.calloutStyleManager = new CalloutStyleManager(this);
		this.calloutStyleManager.initialize();

		// 初始化编辑器 UI 控制器
		this.editorUIController = new EditorUIController(this, this.aiClient);

		// 初始化并注册 AI 编辑器建议
		this.aiEditorSuggest = new AIEditorSuggest(this.app, this, this.editorUIController);
		this.registerEditorSuggest(this.aiEditorSuggest);

		// 条件初始化 Canvas 功能（检查 API 可用性）
		this.initializeCanvasFeatures();

		// 初始化并注册命令
		this.commandRegistry = new CommandRegistry(this, this.editorUIController);
		this.commandRegistry.registerCommands();

		// 添加设置面板
		this.addSettingTab(new AIPluginSettingTab(this.app, this));
		
		if (this.settings.debugMode) {
			console.log('[AI Plugin] 插件已加载');
		}
	}

	/**
	 * 条件初始化 Canvas 功能
	 * 
	 * ⚠️ Canvas API 是实验性功能，仅在 API 可用时初始化。
	 * 
	 * **验证需求：6.7**
	 */
	private initializeCanvasFeatures(): void {
		try {
			// 初始化 Canvas UI 控制器
			this.canvasUIController = new CanvasUIController(this, this.aiClient);
			
			// 检查 Canvas API 是否可用
			if (this.canvasUIController.getAPIAvailability()) {
				// 初始化 Canvas 触发处理器
				this.canvasTriggerHandler = new CanvasTriggerHandler(this);
				
				// 注册 Canvas 事件监听
				this.canvasTriggerHandler.register();
				
				if (this.settings.debugMode) {
					console.log('[AI Plugin] Canvas 功能已启用');
				}
			} else {
				if (this.settings.debugMode) {
					console.log('[AI Plugin] Canvas API 不可用，Canvas 功能已禁用');
				}
			}
		} catch (error) {
			console.error('[AI Plugin] Canvas 功能初始化失败:', error);
			// 优雅降级：即使 Canvas 初始化失败，插件的其他功能仍然可用
		}
	}

	onunload() {
		// 清理编辑器 UI 资源
		if (this.editorUIController) {
			this.editorUIController.cleanup();
		}
		
		// 清理 Callout 样式
		if (this.calloutStyleManager) {
			this.calloutStyleManager.cleanup();
		}
		
		// 清理 Canvas 资源
		if (this.canvasTriggerHandler) {
			this.canvasTriggerHandler.unregister();
		}
		
		if (this.canvasUIController) {
			this.canvasUIController.cleanup();
		}
		
		if (this.settings.debugMode) {
			console.log('[AI Plugin] 插件已卸载');
		}
	}

	/**
	 * 保存设置
	 * 
	 * 通过 SettingsManager 保存设置，会自动进行 API 连接验证。
	 */
	async saveSettings(): Promise<void> {
		this.settingsManager.updateSettings(this.settings);
		await this.settingsManager.saveSettings();
		
		// 更新 AI 客户端配置
		const aiConfig = this.settingsManager.getAIConfig();
		this.aiClient.updateConfig(aiConfig);
		
		// 更新上下文提取器配置
		if (this.editorUIController) {
			this.editorUIController.updateContextExtractor();
		}
		
		// 更新 Callout 样式
		if (this.calloutStyleManager) {
			this.calloutStyleManager.updateStyles();
		}
	}
}
