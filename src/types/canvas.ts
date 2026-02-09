/**
 * Canvas API 类型声明
 * 
 * ⚠️ 重要提示：Canvas API 是 Obsidian 的实验性功能，不是官方公开的稳定 API。
 * 这些类型定义基于当前版本的 Obsidian，可能在未来版本中发生变化。
 * 
 * 此文件提供了 Canvas 相关的类型定义，用于 TypeScript 类型检查。
 */

import { Component, View } from 'obsidian';

/**
 * Canvas 视图接口
 * 表示 Obsidian 中的 Canvas 画布视图
 */
export interface Canvas extends View {
	/** Canvas 的所有节点 */
	nodes: Map<string, CanvasNode>;
	
	/** Canvas 的所有边（连接线） */
	edges: Map<string, CanvasEdge>;
	
	/** 当前选中的节点 */
	selection: Set<CanvasNode>;
	
	/** 创建新的文本节点 */
	createTextNode(options: CreateNodeOptions): CanvasTextNode;
	
	/** 创建新的文件节点 */
	createFileNode(options: CreateNodeOptions & { file: string }): CanvasFileNode;
	
	/** 删除节点 */
	removeNode(node: CanvasNode): void;
	
	/** 请求保存 Canvas */
	requestSave(): void;
	
	/** 获取视口中心位置 */
	getViewportCenter(): Point;
}

/**
 * Canvas 节点基础接口
 */
export interface CanvasNode extends Component {
	/** 节点唯一 ID */
	id: string;
	
	/** 节点位置和尺寸 */
	x: number;
	y: number;
	width: number;
	height: number;
	
	/** 节点颜色 */
	color?: string;
	
	/** 所属的 Canvas */
	canvas: Canvas;
	
	/** 移动节点到指定位置 */
	moveTo(options: { x: number; y: number }): void;
	
	/** 调整节点尺寸 */
	resize(options: { width: number; height: number }): void;
	
	/** 获取节点的边界框 */
	getBBox(): BoundingBox;
}

/**
 * Canvas 文本节点接口
 */
export interface CanvasTextNode extends CanvasNode {
	/** 节点类型 */
	type: 'text';
	
	/** 节点文本内容 */
	text: string;
	
	/** 设置文本内容 */
	setText(text: string): void;
	
	/** 获取文本内容 */
	getText(): string;
}

/**
 * Canvas 文件节点接口
 */
export interface CanvasFileNode extends CanvasNode {
	/** 节点类型 */
	type: 'file';
	
	/** 关联的文件路径 */
	file: string;
	
	/** 子路径（用于链接到文件的特定部分） */
	subpath?: string;
}

/**
 * Canvas 边（连接线）接口
 */
export interface CanvasEdge {
	/** 边的唯一 ID */
	id: string;
	
	/** 起始节点 ID */
	fromNode: string;
	
	/** 目标节点 ID */
	toNode: string;
	
	/** 起始侧 */
	fromSide?: 'top' | 'right' | 'bottom' | 'left';
	
	/** 目标侧 */
	toSide?: 'top' | 'right' | 'bottom' | 'left';
	
	/** 边的标签 */
	label?: string;
}

/**
 * 创建节点的选项
 */
export interface CreateNodeOptions {
	/** 节点位置 X 坐标 */
	x: number;
	
	/** 节点位置 Y 坐标 */
	y: number;
	
	/** 节点宽度 */
	width?: number;
	
	/** 节点高度 */
	height?: number;
	
	/** 节点颜色 */
	color?: string;
	
	/** 文本内容（仅用于文本节点） */
	text?: string;
}

/**
 * 二维坐标点
 */
export interface Point {
	x: number;
	y: number;
}

/**
 * 边界框
 */
export interface BoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

/**
 * Canvas 节点位置配置
 */
export interface CanvasNodePosition {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Canvas AI 响应节点配置
 */
export interface CanvasAINodeConfig {
	/** 节点内容 */
	content: string;
	
	/** 节点位置 */
	position: CanvasNodePosition;
	
	/** 节点颜色 */
	color?: string;
	
	/** 元数据 */
	metadata?: {
		/** 标记为 AI 生成 */
		isAIGenerated: boolean;
		
		/** 关联的请求 ID */
		requestId?: string;
		
		/** 来源节点 ID */
		sourceNodeId?: string;
	};
}

/**
 * 类型守卫：检查节点是否为文本节点
 */
export function isTextNode(node: CanvasNode): node is CanvasTextNode {
	return (node as CanvasTextNode).type === 'text';
}

/**
 * 类型守卫：检查节点是否为文件节点
 */
export function isFileNode(node: CanvasNode): node is CanvasFileNode {
	return (node as CanvasFileNode).type === 'file';
}

/**
 * 类型守卫：检查视图是否为 Canvas 视图
 */
export function isCanvasView(view: View): view is Canvas {
	return view.getViewType() === 'canvas';
}
