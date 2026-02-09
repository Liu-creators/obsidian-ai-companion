/**
 * 类型定义统一导出
 * 
 * 此文件统一导出所有类型定义，方便其他模块导入使用。
 */

// AI 服务相关类型
export type {
	AIServiceConfig,
	CancelToken,
	AIRequest,
	AIResponse,
	AIError,
	AIErrorType,
	QueueStatus,
	QueuedRequest
} from './ai-service';

// 编辑器相关类型
export type {
	AISuggestion,
	EditorSuggestTriggerInfo,
	EditorPosition
} from './editor';

// UI 组件相关类型
export type {
	CollapsibleBlockConfig,
	CollapsibleBlockMetadata
} from './ui';

// 上下文提取相关类型
export type {
	ContextScope,
	ContextExtractionConfig,
	ExtractedContext
} from './context';

// Canvas 相关类型
export type {
	Canvas,
	CanvasNode,
	CanvasTextNode,
	CanvasFileNode,
	CanvasEdge,
	CreateNodeOptions,
	Point,
	BoundingBox,
	CanvasNodePosition,
	CanvasAINodeConfig
} from './canvas';

// Canvas 类型守卫函数
export {
	isTextNode,
	isFileNode,
	isCanvasView
} from './canvas';
