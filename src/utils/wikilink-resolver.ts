/**
 * Wikilink 解析器
 * 
 * 负责解析用户输入中的 Obsidian 双链语法 [[文件名]]，
 * 并读取对应文件的内容。
 */

import { App, TFile } from 'obsidian';

/**
 * 解析结果接口
 */
export interface WikilinkResolution {
	/** 原始链接文本 */
	originalLink: string;
	/** 解析后的文件 */
	file: TFile | null;
	/** 文件内容 */
	content: string | null;
	/** 是否解析成功 */
	resolved: boolean;
}

/**
 * Wikilink 解析器类
 */
export class WikilinkResolver {
	private app: App;
	
	constructor(app: App) {
		this.app = app;
	}
	
	/**
	 * 从文本中提取所有 wikilink
	 * 
	 * 支持的格式：
	 * - [[文件名]]
	 * - [[文件名|显示文本]]
	 * - [[文件名#标题]]
	 * - [[文件名#标题|显示文本]]
	 * 
	 * @param text 要解析的文本
	 * @returns 提取的链接数组
	 */
	extractWikilinks(text: string): string[] {
		// 正则表达式匹配 [[...]] 格式
		// 支持嵌套和转义
		const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
		const links: string[] = [];
		let match;
		
		while ((match = wikilinkRegex.exec(text)) !== null) {
			if (match[1]) {
				// 提取链接文本（去掉显示文本部分）
				const linkText = match[1].split('|')[0]?.split('#')[0]?.trim();
				if (linkText) {
					links.push(linkText);
				}
			}
		}
		
		return links;
	}
	
	/**
	 * 解析单个 wikilink
	 * 
	 * @param linkpath 链接路径（如 "文件名" 或 "文件夹/文件名"）
	 * @param sourcePath 源文件路径（用于解析相对路径）
	 * @returns 解析结果
	 */
	async resolveWikilink(
		linkpath: string,
		sourcePath: string = ''
	): Promise<WikilinkResolution> {
		const result: WikilinkResolution = {
			originalLink: linkpath,
			file: null,
			content: null,
			resolved: false
		};
		
		try {
			// 使用 Obsidian API 解析链接
			const file = this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
			
			if (file) {
				result.file = file;
				
				// 读取文件内容（使用缓存）
				const content = await this.app.vault.cachedRead(file);
				result.content = content;
				result.resolved = true;
			}
		} catch (error) {
			console.error(`[Wikilink Resolver] 解析链接失败: ${linkpath}`, error);
		}
		
		return result;
	}
	
	/**
	 * 解析文本中的所有 wikilink 并读取内容
	 * 
	 * @param text 包含 wikilink 的文本
	 * @param sourcePath 源文件路径
	 * @returns 所有解析结果
	 */
	async resolveAllWikilinks(
		text: string,
		sourcePath: string = ''
	): Promise<WikilinkResolution[]> {
		const links = this.extractWikilinks(text);
		
		// 并行解析所有链接
		const resolutions = await Promise.all(
			links.map(link => this.resolveWikilink(link, sourcePath))
		);
		
		return resolutions;
	}
	
	/**
	 * 将解析的文件内容合并为上下文字符串
	 * 
	 * @param resolutions 解析结果数组
	 * @param maxLength 最大长度限制（可选）
	 * @returns 合并后的上下文字符串
	 */
	buildContextFromResolutions(
		resolutions: WikilinkResolution[],
		maxLength?: number
	): string {
		const contexts: string[] = [];
		
		for (const resolution of resolutions) {
			if (resolution.resolved && resolution.content && resolution.file) {
				// 构建上下文块
				const contextBlock = `--- 文件: ${resolution.file.path} ---\n${resolution.content}\n`;
				contexts.push(contextBlock);
			}
		}
		
		let fullContext = contexts.join('\n');
		
		// 如果指定了最大长度，进行截断
		if (maxLength && fullContext.length > maxLength) {
			fullContext = fullContext.substring(0, maxLength) + '\n\n[内容已截断...]';
		}
		
		return fullContext;
	}
	
	/**
	 * 一站式方法：从文本中提取 wikilink，解析并构建上下文
	 * 
	 * @param text 包含 wikilink 的文本
	 * @param sourcePath 源文件路径
	 * @param maxLength 最大长度限制
	 * @returns 上下文字符串和解析统计
	 */
	async resolveAndBuildContext(
		text: string,
		sourcePath: string = '',
		maxLength?: number
	): Promise<{
		context: string;
		totalLinks: number;
		resolvedLinks: number;
		unresolvedLinks: string[];
	}> {
		const resolutions = await this.resolveAllWikilinks(text, sourcePath);
		const context = this.buildContextFromResolutions(resolutions, maxLength);
		
		const unresolvedLinks = resolutions
			.filter(r => !r.resolved)
			.map(r => r.originalLink);
		
		return {
			context,
			totalLinks: resolutions.length,
			resolvedLinks: resolutions.filter(r => r.resolved).length,
			unresolvedLinks
		};
	}
}
