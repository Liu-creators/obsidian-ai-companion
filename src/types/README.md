# 类型定义说明

本目录包含 Obsidian AI 扩展插件的所有核心 TypeScript 接口定义。

## 文件结构

### `index.ts`
统一导出文件，提供所有类型定义的集中导入点。

**使用示例：**
```typescript
import { AIRequest, AIResponse, AISuggestion } from './types';
```

### `ai-service.ts`
AI 服务相关的类型定义，包括：
- `AIServiceConfig` - AI 服务配置接口
- `AIRequest` - AI 请求接口
- `AIResponse` - AI 响应接口
- `AIError` - AI 错误接口
- `AIErrorType` - 错误类型枚举
- `CancelToken` - 请求取消令牌接口
- `QueueStatus` - 请求队列状态接口
- `QueuedRequest` - 队列中的请求接口

### `editor.ts`
编辑器相关的类型定义，包括：
- `AISuggestion` - AI 建议项接口
- `EditorSuggestTriggerInfo` - 编辑器建议触发信息接口
- `EditorPosition` - 编辑器位置类型（从 obsidian 导入）

### `ui.ts`
UI 组件相关的类型定义，包括：
- `CollapsibleBlockConfig` - 可折叠块配置接口
- `CollapsibleBlockMetadata` - 可折叠块元数据接口

### `context.ts`
上下文提取相关的类型定义，包括：
- `ContextScope` - 上下文范围类型
- `ContextExtractionConfig` - 上下文提取配置接口
- `ExtractedContext` - 提取的上下文接口

### `canvas.d.ts`
Canvas API 类型声明（⚠️ 实验性功能），包括：
- `Canvas` - Canvas 视图接口
- `CanvasNode` - Canvas 节点基础接口
- `CanvasTextNode` - Canvas 文本节点接口
- `CanvasFileNode` - Canvas 文件节点接口
- `CanvasEdge` - Canvas 边（连接线）接口
- `CreateNodeOptions` - 创建节点的选项接口
- `Point` - 二维坐标点接口
- `BoundingBox` - 边界框接口
- `CanvasNodePosition` - Canvas 节点位置配置接口
- `CanvasAINodeConfig` - Canvas AI 响应节点配置接口
- 类型守卫函数：`isTextNode`, `isFileNode`, `isCanvasView`

**⚠️ 重要提示：** Canvas API 不是 Obsidian 官方公开的稳定 API，这些类型定义可能在未来的 Obsidian 版本中发生变化。

## 使用指南

### 导入类型

推荐从 `index.ts` 统一导入：

```typescript
import {
  AIServiceConfig,
  AIRequest,
  AIResponse,
  AISuggestion,
  CollapsibleBlockConfig
} from './types';
```

### 类型安全

所有接口都设计为类型安全的，充分利用 TypeScript 的类型检查功能：

```typescript
// 正确：所有必需字段都提供了
const request: AIRequest = {
  id: 'req-123',
  prompt: 'Hello AI',
  timestamp: Date.now(),
  source: 'editor'
};

// 错误：缺少必需字段，TypeScript 会报错
const invalidRequest: AIRequest = {
  id: 'req-123'
  // 缺少 prompt, timestamp, source
};
```

### 可选字段

某些接口包含可选字段（使用 `?` 标记）：

```typescript
const response: AIResponse = {
  id: 'req-123',
  content: 'AI response',
  model: 'gpt-3.5-turbo',
  timestamp: Date.now()
  // tokensUsed 和 finishReason 是可选的
};
```

## 设计原则

1. **清晰性**：每个接口都有明确的用途和详细的注释
2. **类型安全**：充分利用 TypeScript 的类型系统
3. **可扩展性**：接口设计考虑了未来的扩展需求
4. **一致性**：命名和结构保持一致的风格
5. **文档化**：所有类型都有 JSDoc 注释

## 相关文档

- [设计文档](../../../.kiro/specs/obsidian-ai-extensions/design.md) - 详细的架构设计
- [需求文档](../../../.kiro/specs/obsidian-ai-extensions/requirements.md) - 功能需求说明
- [任务列表](../../../.kiro/specs/obsidian-ai-extensions/tasks.md) - 实现计划
