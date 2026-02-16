/**
 * Canvas API 类型声明
 * 
 * ⚠️ 重要提示：Canvas API 不是 Obsidian 官方公开的稳定 API
 * 这些类型定义基于对 Obsidian Canvas 的观察和实验，可能在未来版本中发生变化。
 * 
 * 验证需求：10.1-10.8
 */

import { View, WorkspaceLeaf, TFile } from 'obsidian';

/**
 * 二维坐标点接口
 */
export interface Point {
	/** X 坐标 */
	x: number;
	/** Y 坐标 */
	y: number;
}

/**
 * 边界框接口
 */
export interface BoundingBox {
	/** 左上角 X 坐标 */
	x: number;
	/** 左上角 Y 坐标 */
	y: number;
	/** 宽度 */
	width: number;
	/** 高度 */
	height: number;
}

/**
 * Canvas 节点基础接口
 * 所有类型的 Canvas 节点都包含这些基础属性
 * 
 * 验证需求：10.2
 */
export interface CanvasNode {
	/** 节点唯一 ID */
	id: string;
	
	/** 节点类型 */
	type: 'text' | 'file' | 'link' | 'group';
	
	/** X 坐标 */
	x: number;
	
	/** Y 坐标 */
	y: number;
	
	/** 宽度 */
	width: number;
	
	/** 高度 */
	height: number;
	
	/** 节点颜色（可选） */
	color?: string;
	
	/** 节点标签（可选） */
	label?: string;
}

/**
 * Canvas 文本节点接口
 * 包含文本内容的节点
 * 
 * 验证需求：4.4
 */
export interface CanvasTextNode extends CanvasNode {
	type: 'text';
	/** 文本内容 */
	text: string;
}

/**
 * Canvas 文件节点接口
 * 引用 Vault 中文件的节点
 * 
 * 验证需求：4.4
 */
export interface CanvasFileNode extends CanvasNode {
	type: 'file';
	/** 文件路径 */
	file: string | TFile | { path: string; name?: string };
	/** 子路径（用于定位到文件的特定部分，如标题） */
	subpath?: string;
}

/**
 * Canvas 链接节点接口
 * 包含外部链接的节点
 * 
 * 验证需求：4.4
 */
export interface CanvasLinkNode extends CanvasNode {
	type: 'link';
	/** URL 地址 */
	url: string;
}

/**
 * Canvas 分组节点接口
 * 用于组织其他节点的容器节点
 */
export interface CanvasGroupNode extends CanvasNode {
	type: 'group';
	/** 分组标签 */
	label?: string;
	/** 背景颜色 */
	background?: string;
}

/**
 * Canvas 边（连接线）接口
 * 表示两个节点之间的连接
 * 
 * 验证需求：4.2, 4.3, 10.6
 */
export interface CanvasEdge {
	/** 边的唯一 ID */
	id: string;
	
	/** 源节点 ID */
	fromNode: string;
	
	/** 目标节点 ID */
	toNode: string;
	
	/** 源节点连接侧（可选） */
	fromSide?: 'top' | 'right' | 'bottom' | 'left';
	
	/** 目标节点连接侧（可选） */
	toSide?: 'top' | 'right' | 'bottom' | 'left';
	
	/** 边的颜色（可选） */
	color?: string;
	
	/**
	 * 边的标签（可选）
	 */
	label?: string;
}

/**
 * Canvas 内部边接口
 * getEdgesForNode 返回的边对象结构
 */
export interface CanvasInternalEdge {
	id: string;
	label?: string;
	from: {
		node: CanvasNode;
	};
	to: {
		node: CanvasNode;
	};
}

/**
 * 创建节点的选项接口
 * 
 * 验证需求：10.3, 10.7
 */
export interface CreateNodeOptions {
	/** 节点位置 */
	pos: Point;
	
	/** 节点大小 */
	size: {
		width: number;
		height: number;
	};
	
	/** 节点内容（文本节点） */
	text?: string;
	
	/** 文件路径（文件节点） */
	file?: string;
	
	/** URL（链接节点） */
	url?: string;
	
	/** 是否聚焦到新节点 */
	focus?: boolean;
	
	/** 是否保存 Canvas */
	save?: boolean;
}

/**
 * Canvas 视图接口
 * 表示 Obsidian 中的 Canvas 视图
 * 
 * 验证需求：10.1-10.8
 */
export interface Canvas extends View {
	/** Canvas 文件路径 */
	file: string;
	
	/** 所有节点的 Map（节点 ID -> 节点对象） */
	nodes: Map<string, CanvasNode>;
	
	/** 所有边的数组 */
	edges: CanvasEdge[];
	
	/**
	 * 创建文本节点
	 * 
	 * @param options 创建选项
	 * @returns 创建的节点
	 * 
	 * 验证需求：10.3
	 */
	createTextNode(options: CreateNodeOptions): CanvasTextNode;
	
	/**
	 * 创建文件节点
	 * 
	 * @param options 创建选项
	 * @returns 创建的节点
	 * 
	 * 验证需求：10.3
	 */
	createFileNode(options: CreateNodeOptions): CanvasFileNode;
	
	/**
	 * 创建链接节点
	 * 
	 * @param options 创建选项
	 * @returns 创建的节点
	 * 
	 * 验证需求：10.3
	 */
	createLinkNode(options: CreateNodeOptions): CanvasLinkNode;
	
	/**
	 * 添加节点到 Canvas
	 * 
	 * @param node 要添加的节点
	 * 
	 * 验证需求：10.3
	 */
	addNode(node: CanvasNode): void;
	
	/**
	 * 移除节点
	 * 
	 * @param node 要移除的节点
	 */
	removeNode(node: CanvasNode): void;
	
	/**
	 * 创建边（连接线）
	 * 
	 * @param fromNode 源节点
	 * @param toNode 目标节点
	 * @returns 创建的边
	 * 
	 * 验证需求：10.5
	 */
	createEdge(
		fromNode: CanvasNode,
		toNode: CanvasNode,
		options?: {
			fromSide?: 'top' | 'right' | 'bottom' | 'left';
			toSide?: 'top' | 'right' | 'bottom' | 'left';
		}
	): CanvasEdge;
	
	/**
	 * 添加边到 Canvas
	 * 
	 * @param edge 要添加的边
	 * 
	 * 验证需求：10.5
	 */
	addEdge(edge: CanvasEdge): void;
	
	/**
	 * 移除边
	 * 
	 * @param edge 要移除的边
	 */
	removeEdge(edge: CanvasEdge): void;
	
	/**
	 * 创建文本节点
	 * 
	 * @param options 创建选项
	 * @returns 创建的节点
	 */
	createNode(options: CreateNodeOptions): CanvasNode;

	/**
	 * 获取指定节点的边（内部 API）
	 * 
	 * @param node 节点
	 * @returns 边数组
	 */
	getEdgesForNode(node: CanvasNode): CanvasInternalEdge[];
	
	/**
	 * 更新节点
	 * 
	 * @param node 要更新的节点
	 * 
	 * 验证需求：10.4
	 */
	updateNode(node: CanvasNode): void;
	
	/**
	 * 设置节点数据
	 * 
	 * @param node 节点
	 * @param data 要设置的数据
	 * 
	 * 验证需求：10.4, 10.7
	 */
	setNodeData(node: CanvasNode, data: Partial<CanvasNode>): void;
	
	/**
	 * 请求保存 Canvas
	 * 应在修改 Canvas 后调用以持久化更改
	 * 
	 * 验证需求：10.4
	 */
	requestSave(): void;

	/**
	 * 获取 Canvas 数据
	 * 返回当前 Canvas 的 JSON 数据模型
	 */
	getData(): CanvasData;

	/**
	 * 导入 Canvas 数据
	 * 使用新的数据模型完全替换当前 Canvas 内容
	 * 
	 * @param data 新的 Canvas 数据
	 */
	importData(data: CanvasData): void;

	/**
	 * 请求渲染下一帧
	 * 触发 Canvas 引擎的重绘
	 */
	requestFrame(): void;
	
	/**
	 * 当前选中的节点集合
	 */
	selection: Set<CanvasNode>;
	
	/**
	 * 获取选中的节点
	 * 
	 * @returns 当前选中的节点数组
	 * @deprecated 使用 selection 属性代替
	 */
	getSelection(): CanvasNode[];
	
	/**
	 * 缩放到适应所有节点
	 */
	zoomToFit(): void;
	
	/**
	 * 缩放到指定的边界框
	 * 
	 * @param bbox 边界框
	 */
	zoomToBbox(bbox: BoundingBox): void;
}

/**
 * Canvas 节点位置配置接口
 * 用于计算新节点的位置
 * 
 * 验证需求：5.3
 */
export interface CanvasNodePosition {
	/** X 坐标 */
	x: number;
	/** Y 坐标 */
	y: number;
	/** X 偏移量 */
	offsetX?: number;
	/** Y 偏移量 */
	offsetY?: number;
}

/**
 * Canvas 完整数据模型
 */
export interface CanvasData {
	nodes: any[];
	edges: any[];
}

/**
 * Canvas AI 响应节点配置接口
 * 用于创建 AI 响应节点
 * 
 * 验证需求：5.1-5.6
 */
export interface CanvasAINodeConfig {
	/** 节点内容 */
	content: string;
	/** 节点位置 */
	position: Point;
	/** 节点大小 */
	size: {
		width: number;
		height: number;
	};
	/** 源节点 ID（用于创建连接） */
	sourceNodeId: string;
}
