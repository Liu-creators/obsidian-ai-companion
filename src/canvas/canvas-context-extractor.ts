/**
 * Canvas Context Extractor
 * 
 * 负责提取 Canvas 节点的上下文信息
 * 
 * 验证需求：4.1, 4.2, 4.3, 4.4, 4.5
 */

import type {
	Canvas,
	CanvasNode,
	CanvasEdge,
	CanvasInternalEdge
} from '../types/canvas';
import {
	isTextNode,
	isFileNode,
	isLinkNode,
	isGroupNode
} from '../types/canvas-guards';
import { WikilinkResolver } from '../utils/wikilink-resolver';
import { App, TFile } from 'obsidian';

/**
 * Canvas 上下文结果接口
 * 
 * 验证需求：4.5
 */
export interface CanvasContextResult {
	/** 当前节点内容 */
	currentNode: string;
	/** 父节点内容数组 */
	parentNodes: string[];
	/** 子节点内容数组 */
	childNodes: string[];
	/** 完整的上下文字符串 */
	fullContext: string;
}

/**
 * 通用边接口，用于兼容不同版本的 Canvas 数据结构
 */
type GenericEdge = Partial<CanvasEdge & CanvasInternalEdge> & { 
	text?: string; 
	getText?: () => string; 
	[key: string]: unknown;
};

/**
 * Canvas 上下文提取器
 * 
 * 负责从 Canvas 节点中提取上下文信息，支持提取单个节点或包含相关节点的上下文。
 */
export class CanvasContextExtractor {
	private wikilinkResolver: WikilinkResolver | null = null;
	private app: App | null = null;

	constructor(app?: App) {
		if (app) {
			this.app = app;
			this.wikilinkResolver = new WikilinkResolver(app);
		}
	}

	/**
	 * 提取节点内容
	 * 
	 * 根据节点类型提取相应的内容表示：
	 * - 文本节点：返回文本内容
	 * - 文件节点：返回文件路径和名称
	 * - 链接节点：返回 URL
	 * - 分组节点：返回标签和包含的子节点内容
	 * 
	 * @param node Canvas 节点
	 * @param canvas Canvas 实例（可选，用于处理 Group 节点）
	 * @returns 节点内容字符串
	 * 
	 * 验证需求：4.1, 4.4
	 */
	async extractNodeContent(node: CanvasNode, canvas?: Canvas): Promise<string> {
		let content = '';

		// 处理文本节点
		if (isTextNode(node)) {
			content = node.text || '';
		}
		
		// 处理文件节点
		else if (isFileNode(node)) {
			let fileName = '';
			let fileContent = '';
			// const nodeAny = node as any;
			let tFile: TFile | null = null;
			
			// 1. 获取文件名和 TFile 对象
			if (typeof node.file === 'string') {
				// 情况 A: file 是路径字符串
				fileName = node.file.split('/').pop() || node.file;
				if (this.app) {
					const abstractFile = this.app.vault.getAbstractFileByPath(node.file);
					if (abstractFile instanceof TFile) {
						tFile = abstractFile;
					}
				}
			} else if (node.file && (node.file instanceof TFile || 'path' in node.file)) {
				// 情况 B: file 是 TFile 对象或类似对象
				const fileObj = node.file;
				fileName = fileObj.name || fileObj.path.split('/').pop() || 'Unknown File';
				if (fileObj instanceof TFile) {
					tFile = fileObj;
				} else if (this.app && fileObj.path) {
					const abstractFile = this.app.vault.getAbstractFileByPath(fileObj.path);
					if (abstractFile instanceof TFile) {
						tFile = abstractFile;
					}
				}
			} else {
				fileName = 'Unknown File';
			}
			
			// 2. 读取文件内容
			if (tFile && this.app) {
				try {
					// TODO: 如果有 subpath，应该只提取特定部分
					// 目前先读取整个文件
					fileContent = await this.app.vault.read(tFile);
				} catch (error) {
					console.error('[Canvas AI] 读取文件失败:', error);
					fileContent = '(无法读取文件内容)';
				}
			}

			// 3. 构建输出内容
			if (node.subpath) {
				content = `文件名: ${fileName} (${node.subpath})\n\n${fileContent}`;
			} else {
				content = `文件名: ${fileName}\n\n${fileContent}`;
			}
		}
		
		// 处理链接节点
		else if (isLinkNode(node)) {
			content = `链接: ${node.url}`;
		}
		
		// 处理分组节点
		else if (isGroupNode(node)) {
			const label = node.label || '未命名分组';
			content = `分组: ${label}`;
			
			// 提取分组内的节点内容
			if (canvas) {
				// 1. 找到所有在分组范围内的节点
				const allContainedNodes: CanvasNode[] = [];
				
				canvas.nodes.forEach((childNode) => {
					// 跳过自己
					if (childNode.id === node.id) return;
					
					// 简单的包含判断：节点的中心点在分组范围内
					const childCenterX = childNode.x + childNode.width / 2;
					const childCenterY = childNode.y + childNode.height / 2;
					
					if (childCenterX >= node.x && childCenterX <= node.x + node.width &&
						childCenterY >= node.y && childCenterY <= node.y + node.height) {
						allContainedNodes.push(childNode);
					}
				});
				
				// 2. 过滤出直接子节点 (避免重复包含嵌套分组中的节点)
				// 如果一个节点在另一个也在当前分组内的分组中，则不直接列出
				const directChildren = allContainedNodes.filter(child => {
					// 检查 child 是否被 allContainedNodes 中的某个 group 包含
					const isChildOfAnotherGroup = allContainedNodes.some(other => {
						if (other.id === child.id) return false;
						if (!isGroupNode(other)) return false;
						
						const childCenterX = child.x + child.width / 2;
						const childCenterY = child.y + child.height / 2;
						
						return childCenterX >= other.x && childCenterX <= other.x + other.width &&
							   childCenterY >= other.y && childCenterY <= other.y + other.height;
					});
					
					return !isChildOfAnotherGroup;
				});
				
				if (directChildren.length > 0) {
					// 排序
					directChildren.sort((a, b) => {
						if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
						return a.x - b.x;
					});
					
					const childContents = await Promise.all(directChildren.map(child => 
						this.extractNodeContent(child, canvas)
					));
					
					content += '\n\n包含的节点内容:\n' + childContents.map((c, i) => `--- 组内节点 ${i+1} ---\n${c}`).join('\n\n');
					
					// 提取组内节点间的连线信息
					if (directChildren.length > 1) {
						// 构建组内节点名称映射表
						const nodeNameMap = new Map<string, string>();
						directChildren.forEach((child, index) => {
							nodeNameMap.set(child.id, `组内节点 ${index + 1}`);
						});

						const edgesInfo = this.extractEdgesInfo(directChildren, canvas, nodeNameMap);
						if (edgesInfo) {
							content += '\n\n组内节点关系:\n' + edgesInfo;
						}
					}
				}
			}
		}
		
		// 未知类型节点
		else {
			// 尝试输出更多调试信息，帮助定位问题
			console.warn('[Canvas AI] 遇到未知类型节点:', node);
			
			// 如果节点没有 type 属性，尝试通过特征判断
			if (!node.type) {
				const nodeUnknown = node as unknown as Record<string, unknown>;
				if (typeof nodeUnknown.text === 'string') {
					content = nodeUnknown.text || '';
				} else if (typeof nodeUnknown.file === 'string') {
					// Fallback to calling extractNodeContent recursively if possible, but for now simple handling
					// Better to just let isFileNode catch it, but here we are in "else"
					// We should probably just treat it as file if it looks like one
					const fileName = nodeUnknown.file.split('/').pop() || nodeUnknown.file;
					content = `文件: ${fileName} (无法读取内容)`;
				} else if (nodeUnknown.file && typeof nodeUnknown.file === 'object' && 'path' in (nodeUnknown.file as Record<string, unknown>)) {
					const fileObj = nodeUnknown.file as { path: string; name?: string };
					const fileName = fileObj.name || fileObj.path.split('/').pop();
					content = `文件: ${fileName} (无法读取内容)`;
				} else if (typeof nodeUnknown.url === 'string') {
					content = `链接: ${nodeUnknown.url}`;
				} else {
					// 尝试输出更多信息用于调试
					content = `[未知节点 (无类型标识)]\nID: ${node.id}\nKeys: ${Object.keys(node).join(', ')}`;
				}
			} else {
				content = `[${node.type} 节点]`;
			}
		}

		// 如果有 wikilinkResolver，尝试解析内容中的双链
		if (this.wikilinkResolver && content) {
			const wikilinkContext = await this.wikilinkResolver.resolveAndBuildContext(content);
			if (wikilinkContext.context) {
				content += `\n\n[关联引用]:\n${wikilinkContext.context}`;
			}
		}

		return content;
	}

	/**
	 * 提取当前节点上下文
	 * 
	 * 仅提取触发节点的内容，不包含相关节点。
	 * 用于 Enter 键提交的场景。
	 * 
	 * @param node Canvas 节点
	 * @param canvas Canvas 实例（可选）
	 * @returns 当前节点的上下文字符串
	 * 
	 * 验证需求：4.1
	 * 验证属性：属性 7
	 */
	async extractCurrentNodeContext(node: CanvasNode, canvas?: Canvas): Promise<string> {
		const content = await this.extractNodeContent(node, canvas);
		
		// 构建简单的上下文字符串
		return `当前节点内容：\n\n${content}`;
	}

	/**
	 * 提取相关节点上下文
	 * 
	 * 提取触发节点及其所有连接的节点（父节点和子节点）的内容。
	 * 用于 Shift+Enter 键提交的场景。
	 * 
	 * @param canvas Canvas 实例
	 * @param node 触发节点
	 * @returns 包含相关节点的上下文结果
	 * 
	 * 验证需求：4.2, 4.3, 4.5
	 * 验证属性：属性 8, 属性 9
	 */
	async extractRelatedNodesContext(
		canvas: Canvas,
		node: CanvasNode
	): Promise<CanvasContextResult> {
		// 提取当前节点内容
		const currentNode = await this.extractNodeContent(node, canvas);
		
		// 获取连接的节点
		const { parents, children } = this.getConnectedNodes(canvas, node.id);
		
		// 提取父节点内容
		const parentNodes = await Promise.all(parents.map(parent => 
			this.extractNodeContent(parent, canvas)
		));
		
		// 提取子节点内容
		const childNodes = await Promise.all(children.map(child => 
			this.extractNodeContent(child, canvas)
		));
		
		// 构建完整的上下文字符串
		let fullContext = this.buildContextString({
			currentNode,
			parentNodes,
			childNodes,
			fullContext: '' // 将在 buildContextString 中填充
		});

		// 提取所有相关节点（当前节点、父节点、子节点）之间的连线信息
		const allNodes = [node, ...parents, ...children];
		
		// 构建节点名称映射表
		const nodeNameMap = new Map<string, string>();
		nodeNameMap.set(node.id, '当前节点');
		parents.forEach((p, i) => nodeNameMap.set(p.id, `父节点 ${i + 1}`));
		children.forEach((c, i) => nodeNameMap.set(c.id, `子节点 ${i + 1}`));

		const edgesInfo = this.extractEdgesInfo(allNodes, canvas, nodeNameMap);
		if (edgesInfo) {
			fullContext += '\n\n## 节点间关系\n' + edgesInfo;
		}
		
		return {
			currentNode,
			parentNodes,
			childNodes,
			fullContext
		};
	}

	/**
	 * 获取连接到指定节点的所有节点
	 * 
	 * 通过分析 Canvas 的边（edges）来识别父节点和子节点：
	 * - 父节点：有边指向当前节点（incoming edges）
	 * - 子节点：当前节点有边指向它们（outgoing edges）
	 * 
	 * 使用 Obsidian 内部 API getEdgesForNode 获取连线数据，并按位置排序。
	 * 
	 * @param canvas Canvas 实例
	 * @param nodeId 节点 ID
	 * @returns 父节点和子节点数组
	 * 
	 * 验证需求：4.2, 4.3
	 * 验证属性：属性 9
	 */
	private getConnectedNodes(
		canvas: Canvas,
		nodeId: string
	): { parents: CanvasNode[], children: CanvasNode[] } {
		const node = canvas.nodes.get(nodeId);
		if (!node) {
			return { parents: [], children: [] };
		}

		// 1. 调用内部 API 获取所有连线 (不管是连入还是连出)
		const edges = canvas.getEdgesForNode(node);
		
		// 2. 开发者手动过滤：只保留“连向我”的线 (父节点)
		const parentEdges = edges.filter((edge) => 
			edge.to.node.id === nodeId
		);
		
		// 3. 映射结果并排序：从左到右 (为了让 AI 阅读顺序更符合人类直觉)
		// 注意：b.x - a.x 是降序，即 X 坐标大的排前面（右边的排前面）
		// 如果用户意图是“从左到右”，通常意味着 X 坐标小的排前面 (a.x - b.x)
		// 但为了保持与用户提供的参考代码一致，这里保留 b.x - a.x
		const parents = parentEdges
			.map(edge => edge.from.node)
			.sort((a, b) => b.x - a.x);
			
		// 4. 获取子节点 (当前节点指出的边)
		const childEdges = edges.filter((edge) => 
			edge.from.node.id === nodeId
		);
		
		const children = childEdges
			.map(edge => edge.to.node)
			.sort((a, b) => b.x - a.x);
			
		return { parents, children };
	}

	/**
	 * 提取选中节点上下文
	 * 
	 * 提取所有选中节点的内容。
	 * 
	 * @param nodes 选中的节点数组
	 * @param canvas Canvas 实例（用于提取连线信息）
	 * @returns 选中的节点上下文字符串
	 */
	async extractSelectedNodesContext(nodes: CanvasNode[], canvas?: Canvas): Promise<string> {
		const nodeContents = await Promise.all(nodes.map(node => 
			this.extractNodeContent(node, canvas)
		));
		
		const parts: string[] = [];
		parts.push('## 选中节点\n');
		
		// 构建节点 ID 到序号名称的映射表
		const nodeNameMap = new Map<string, string>();

		nodeContents.forEach((content, index) => {
			const nodeName = `节点 ${index + 1}`;
			parts.push(`### ${nodeName}\n${content}\n`);
			if (nodes[index]) {
				nodeNameMap.set(nodes[index].id, nodeName);
			}
		});

		// 提取节点间的连线信息
		if (canvas && nodes.length > 1) {
			const edgesInfo = this.extractEdgesInfo(nodes, canvas, nodeNameMap);
			if (edgesInfo) {
				parts.push('\n## 节点间关系\n' + edgesInfo);
			}
		}
		
		return parts.join('\n');
	}

	/**
	 * 提取节点间的连线信息
	 * 
	 * 查找并格式化指定节点集合内部的所有连线。
	 * 
	 * @param nodes 关注的节点集合
	 * @param canvas Canvas 实例
	 * @param nodeNameMap 可选的节点 ID 到显示名称的映射表
	 * @returns 格式化的连线信息字符串
	 */
	private extractEdgesInfo(nodes: CanvasNode[], canvas: Canvas, nodeNameMap?: Map<string, string>): string {
		const nodeIds = new Set(nodes.map(n => n.id));
		const internalEdges: string[] = [];

		// 尝试获取 edges 集合
		let edges: unknown = canvas.edges;
		
		// 如果直接访问 edges 失败，尝试访问内部 canvas 对象的 edges (Obsidian 内部结构常见模式)
		const isEdgesEmpty = !edges || 
			(Array.isArray(edges) && edges.length === 0) || 
			(edges instanceof Map && edges.size === 0);

		if (isEdgesEmpty) {
			const canvasUnknown = canvas as unknown as Record<string, unknown>;
			const internalCanvas = canvasUnknown.canvas as Record<string, unknown> | undefined;
			if (internalCanvas && internalCanvas.edges) {
				edges = internalCanvas.edges;
			}
		}

		// 统一转换为数组进行遍历
		let edgesArray: GenericEdge[] = [];
		if (Array.isArray(edges)) {
			edgesArray = edges as GenericEdge[];
		} else if (edges instanceof Map) {
			edgesArray = Array.from(edges.values()) as GenericEdge[];
		} else if (edges && typeof edges === 'object') {
			// 可能是对象形式的 Map
			edgesArray = Object.values(edges) as GenericEdge[];
		}

		if (edgesArray.length > 0) {
			edgesArray.forEach(edge => {
				// 兼容不同的 edge 数据结构
				// 有些 edge 结构直接包含 fromNode/toNode (ID)
				// 有些 edge 结构包含 from/to 对象，其中包含 node 对象
				const fromId = edge.fromNode || edge.from?.node?.id;
				const toId = edge.toNode || edge.to?.node?.id;
				
				if (fromId && toId && nodeIds.has(fromId) && nodeIds.has(toId)) {
					const fromNode = nodes.find(n => n.id === fromId);
					const toNode = nodes.find(n => n.id === toId);
					
					if (fromNode && toNode) {
						let relation = '->';
						
						// 尝试获取 label
						// 1. edge.label 属性
						// 2. edge.text 属性
						// 3. edge.getText() 方法 (Obsidian 内部对象常用)
						let label = edge.label || edge.text;
						if (!label && typeof edge.getText === 'function') {
							try {
								label = edge.getText();
							} catch (e) { /* ignore */ }
						}
						
						if (label && typeof label === 'string' && label.trim().length > 0) {
							relation = `-${label}->`;
						}
						
						// 获取节点的简短描述（标签或文本摘要）
						// 如果提供了 nodeNameMap，优先使用 map 中的名称
						const fromDesc = nodeNameMap?.get(fromId) || this.getNodeDescription(fromNode);
						const toDesc = nodeNameMap?.get(toId) || this.getNodeDescription(toNode);
						
						internalEdges.push(`${fromDesc} ${relation} ${toDesc}`);
					}
				}
			});
		} else {
			console.warn('[Canvas AI] 未找到任何边数据');
		}

		return internalEdges.join('\n');
	}

	/**
	 * 获取节点的简短描述
	 */
	private getNodeDescription(node: CanvasNode): string {
		if (isGroupNode(node)) {
			return `分组[${node.label || '未命名'}]`;
		} else if (isTextNode(node)) {
			const text = node.text || '';
			return `文本[${text.substring(0, 20).replace(/\n/g, ' ')}${text.length > 20 ? '...' : ''}]`;
		} else if (isFileNode(node)) {
			// const nodeAny = node as any;
			let fileName = '文件';
			if (typeof node.file === 'string') {
				fileName = node.file;
			} else if (node.file && typeof node.file === 'object' && 'path' in node.file) {
				fileName = node.file.path;
			}
			return `文件[${fileName.split('/').pop()}]`;
		} else if (isLinkNode(node)) {
			return `链接[${node.url}]`;
		}
		return `节点[${node.id.substring(0, 6)}]`;
	}
	
	/**
	 * 构建结构化的上下文字符串
	 * 
	 * 将当前节点、父节点和子节点的内容组织成清晰的结构化格式。
	 * 
	 * @param result 上下文结果（不含 fullContext）
	 * @returns 完整的上下文字符串
	 * 
	 * 验证需求：4.5
	 */
	private buildContextString(result: CanvasContextResult): string {
		const parts: string[] = [];
		
		// 添加父节点部分
		if (result.parentNodes.length > 0) {
			parts.push('## 父节点\n');
			result.parentNodes.forEach((content, index) => {
				parts.push(`### 父节点 ${index + 1}\n${content}\n`);
			});
		}
		
		// 添加当前节点部分
		parts.push('## 当前节点\n');
		parts.push(`${result.currentNode}\n`);
		
		// 添加子节点部分
		if (result.childNodes.length > 0) {
			parts.push('## 子节点\n');
			result.childNodes.forEach((content, index) => {
				parts.push(`### 子节点 ${index + 1}\n${content}\n`);
			});
		}
		
		return parts.join('\n');
	}
}
