/**
 * Obsidian API Mock 对象
 * 用于在 Jest 测试中模拟 Obsidian 的核心 API
 */

// Mock Plugin 类
export class Plugin {
  app: App;
  manifest: PluginManifest;

  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<any> {
    return {};
  }

  async saveData(data: any): Promise<void> {
    // Mock 实现
  }

  addCommand(command: Command): Command {
    return command;
  }

  addRibbonIcon(icon: string, title: string, callback: () => void): HTMLElement {
    return document.createElement('div');
  }

  addStatusBarItem(): HTMLElement {
    return document.createElement('div');
  }

  addSettingTab(settingTab: PluginSettingTab): void {
    // Mock 实现
  }

  registerView(type: string, viewCreator: ViewCreator): void {
    // Mock 实现
  }

  registerExtensions(extensions: string[], viewType: string): void {
    // Mock 实现
  }

  registerMarkdownPostProcessor(
    postProcessor: MarkdownPostProcessor,
    priority?: number
  ): void {
    // Mock 实现
  }

  registerEditorExtension(extension: any): void {
    // Mock 实现
  }

  registerEditorSuggest(editorSuggest: EditorSuggest<any>): void {
    // Mock 实现
  }

  registerEvent(eventRef: EventRef): void {
    // Mock 实现
  }

  registerDomEvent(
    el: Window | Document | HTMLElement,
    type: string,
    callback: any,
    options?: boolean | AddEventListenerOptions
  ): void {
    // Mock 实现
  }

  registerInterval(id: number): number {
    return id;
  }

  async onload(): Promise<void> {
    // Mock 实现
  }

  onunload(): void {
    // Mock 实现
  }
}

// Mock PluginSettingTab 类
export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display(): void {
    // Mock 实现
  }

  hide(): void {
    // Mock 实现
  }
}

// Mock EditorSuggest 类
export abstract class EditorSuggest<T> {
  app: App;
  limit: number = 10;

  constructor(app: App) {
    this.app = app;
  }

  abstract onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile | null
  ): EditorSuggestTriggerInfo | null;

  abstract getSuggestions(context: EditorSuggestContext): T[] | Promise<T[]>;

  abstract renderSuggestion(value: T, el: HTMLElement): void;

  abstract selectSuggestion(value: T, evt: MouseEvent | KeyboardEvent): void;

  close(): void {
    // Mock 实现
  }
}

// Mock Editor 接口
export interface Editor {
  getLine(line: number): string;
  setLine(line: number, text: string): void;
  lineCount(): number;
  lastLine(): number;
  getCursor(string?: 'from' | 'to' | 'head' | 'anchor'): EditorPosition;
  setCursor(pos: EditorPosition | number, ch?: number): void;
  getSelection(): string;
  replaceSelection(replacement: string, origin?: string): void;
  replaceRange(
    replacement: string,
    from: EditorPosition,
    to?: EditorPosition,
    origin?: string
  ): void;
  getValue(): string;
  setValue(content: string): void;
  getRange(from: EditorPosition, to: EditorPosition): string;
  somethingSelected(): boolean;
  getDoc(): any;
}

// Mock App 接口
export interface App {
  workspace: Workspace;
  vault: Vault;
  metadataCache: MetadataCache;
  fileManager: FileManager;
  lastEvent: UserEvent | null;
}

// Mock Workspace 接口
export interface Workspace {
  on(name: string, callback: (...args: any[]) => any, ctx?: any): EventRef;
  off(name: string, callback: (...args: any[]) => any): void;
  trigger(name: string, ...data: any[]): void;
  getActiveFile(): TFile | null;
  getActiveViewOfType<T>(type: any): T | null;
  getLeaf(newLeaf?: boolean): WorkspaceLeaf;
}

// Mock Vault 接口
export interface Vault {
  read(file: TFile): Promise<string>;
  modify(file: TFile, data: string): Promise<void>;
  create(path: string, data: string): Promise<TFile>;
  delete(file: TFile): Promise<void>;
  rename(file: TFile, newPath: string): Promise<void>;
  getAbstractFileByPath(path: string): TAbstractFile | null;
  getFiles(): TFile[];
}

// Mock MetadataCache 接口
export interface MetadataCache {
  getFileCache(file: TFile): CachedMetadata | null;
  getCache(path: string): CachedMetadata | null;
  on(name: string, callback: (...args: any[]) => any, ctx?: any): EventRef;
}

// Mock FileManager 接口
export interface FileManager {
  processFrontMatter(file: TFile, fn: (frontmatter: any) => void): Promise<void>;
  generateMarkdownLink(
    file: TFile,
    sourcePath: string,
    subpath?: string,
    alias?: string
  ): string;
}

// Mock Notice 类
export class Notice {
  constructor(message: string | DocumentFragment, timeout?: number) {
    // Mock 实现
  }

  setMessage(message: string | DocumentFragment): this {
    return this;
  }

  hide(): void {
    // Mock 实现
  }
}

// Mock Setting 类
export class Setting {
  settingEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    containerEl.appendChild(this.settingEl);
  }

  setName(name: string | DocumentFragment): this {
    return this;
  }

  setDesc(desc: string | DocumentFragment): this {
    return this;
  }

  setClass(cls: string): this {
    return this;
  }

  setTooltip(tooltip: string): this {
    return this;
  }

  setDisabled(disabled: boolean): this {
    return this;
  }

  addButton(cb: (component: ButtonComponent) => any): this {
    const button = new ButtonComponent(this.settingEl);
    cb(button);
    return this;
  }

  addText(cb: (component: TextComponent) => any): this {
    const text = new TextComponent(this.settingEl);
    cb(text);
    return this;
  }

  addTextArea(cb: (component: TextAreaComponent) => any): this {
    const textArea = new TextAreaComponent(this.settingEl);
    cb(textArea);
    return this;
  }

  addToggle(cb: (component: ToggleComponent) => any): this {
    const toggle = new ToggleComponent(this.settingEl);
    cb(toggle);
    return this;
  }

  addDropdown(cb: (component: DropdownComponent) => any): this {
    const dropdown = new DropdownComponent(this.settingEl);
    cb(dropdown);
    return this;
  }

  addSlider(cb: (component: SliderComponent) => any): this {
    const slider = new SliderComponent(this.settingEl);
    cb(slider);
    return this;
  }
}

// Mock 组件类
export class ButtonComponent {
  buttonEl: HTMLButtonElement;

  constructor(containerEl: HTMLElement) {
    this.buttonEl = document.createElement('button');
    containerEl.appendChild(this.buttonEl);
  }

  setButtonText(name: string): this {
    this.buttonEl.textContent = name;
    return this;
  }

  setTooltip(tooltip: string): this {
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.buttonEl.disabled = disabled;
    return this;
  }

  setCta(): this {
    return this;
  }

  setWarning(): this {
    return this;
  }

  onClick(callback: (evt: MouseEvent) => any): this {
    this.buttonEl.addEventListener('click', callback);
    return this;
  }
}

export class TextComponent {
  inputEl: HTMLInputElement;

  constructor(containerEl: HTMLElement) {
    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    containerEl.appendChild(this.inputEl);
  }

  setValue(value: string): this {
    this.inputEl.value = value;
    return this;
  }

  getValue(): string {
    return this.inputEl.value;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.inputEl.disabled = disabled;
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.inputEl.addEventListener('input', (e) => {
      callback((e.target as HTMLInputElement).value);
    });
    return this;
  }
}

export class TextAreaComponent {
  inputEl: HTMLTextAreaElement;

  constructor(containerEl: HTMLElement) {
    this.inputEl = document.createElement('textarea');
    containerEl.appendChild(this.inputEl);
  }

  setValue(value: string): this {
    this.inputEl.value = value;
    return this;
  }

  getValue(): string {
    return this.inputEl.value;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.inputEl.disabled = disabled;
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.inputEl.addEventListener('input', (e) => {
      callback((e.target as HTMLTextAreaElement).value);
    });
    return this;
  }
}

export class ToggleComponent {
  toggleEl: HTMLInputElement;

  constructor(containerEl: HTMLElement) {
    this.toggleEl = document.createElement('input');
    this.toggleEl.type = 'checkbox';
    containerEl.appendChild(this.toggleEl);
  }

  setValue(on: boolean): this {
    this.toggleEl.checked = on;
    return this;
  }

  getValue(): boolean {
    return this.toggleEl.checked;
  }

  setDisabled(disabled: boolean): this {
    this.toggleEl.disabled = disabled;
    return this;
  }

  onChange(callback: (value: boolean) => any): this {
    this.toggleEl.addEventListener('change', (e) => {
      callback((e.target as HTMLInputElement).checked);
    });
    return this;
  }
}

export class DropdownComponent {
  selectEl: HTMLSelectElement;

  constructor(containerEl: HTMLElement) {
    this.selectEl = document.createElement('select');
    containerEl.appendChild(this.selectEl);
  }

  addOption(value: string, display: string): this {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = display;
    this.selectEl.appendChild(option);
    return this;
  }

  addOptions(options: Record<string, string>): this {
    for (const [value, display] of Object.entries(options)) {
      this.addOption(value, display);
    }
    return this;
  }

  setValue(value: string): this {
    this.selectEl.value = value;
    return this;
  }

  getValue(): string {
    return this.selectEl.value;
  }

  setDisabled(disabled: boolean): this {
    this.selectEl.disabled = disabled;
    return this;
  }

  onChange(callback: (value: string) => any): this {
    this.selectEl.addEventListener('change', (e) => {
      callback((e.target as HTMLSelectElement).value);
    });
    return this;
  }
}

export class SliderComponent {
  sliderEl: HTMLInputElement;

  constructor(containerEl: HTMLElement) {
    this.sliderEl = document.createElement('input');
    this.sliderEl.type = 'range';
    containerEl.appendChild(this.sliderEl);
  }

  setLimits(min: number, max: number, step: number | 'any'): this {
    this.sliderEl.min = String(min);
    this.sliderEl.max = String(max);
    this.sliderEl.step = String(step);
    return this;
  }

  setValue(value: number): this {
    this.sliderEl.value = String(value);
    return this;
  }

  getValue(): number {
    return Number(this.sliderEl.value);
  }

  setDisabled(disabled: boolean): this {
    this.sliderEl.disabled = disabled;
    return this;
  }

  onChange(callback: (value: number) => any): this {
    this.sliderEl.addEventListener('input', (e) => {
      callback(Number((e.target as HTMLInputElement).value));
    });
    return this;
  }

  setDynamicTooltip(): this {
    return this;
  }
}

// 类型定义
export interface EditorPosition {
  line: number;
  ch: number;
}

export interface EditorSuggestTriggerInfo {
  start: EditorPosition;
  end: EditorPosition;
  query: string;
}

export interface EditorSuggestContext {
  query: string;
  editor: Editor;
  file: TFile | null;
  start: EditorPosition;
  end: EditorPosition;
}

export interface Command {
  id: string;
  name: string;
  callback?: () => any;
  checkCallback?: (checking: boolean) => boolean | void;
  editorCallback?: (editor: Editor, view: any) => any;
  editorCheckCallback?: (checking: boolean, editor: Editor, view: any) => boolean | void;
  hotkeys?: Hotkey[];
  icon?: string;
}

export interface Hotkey {
  modifiers: Modifier[];
  key: string;
}

export type Modifier = 'Mod' | 'Ctrl' | 'Meta' | 'Shift' | 'Alt';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  authorUrl?: string;
  isDesktopOnly?: boolean;
}

export interface TFile extends TAbstractFile {
  stat: FileStats;
  basename: string;
  extension: string;
}

export interface TAbstractFile {
  vault: Vault;
  path: string;
  name: string;
  parent: TFolder | null;
}

export interface TFolder extends TAbstractFile {
  children: TAbstractFile[];
  isRoot(): boolean;
}

export interface FileStats {
  ctime: number;
  mtime: number;
  size: number;
}

export interface CachedMetadata {
  links?: LinkCache[];
  embeds?: EmbedCache[];
  tags?: TagCache[];
  headings?: HeadingCache[];
  sections?: SectionCache[];
  frontmatter?: FrontMatterCache;
}

export interface LinkCache {
  link: string;
  original: string;
  displayText?: string;
  position: Pos;
}

export interface EmbedCache extends LinkCache {}

export interface TagCache {
  tag: string;
  position: Pos;
}

export interface HeadingCache {
  heading: string;
  level: number;
  position: Pos;
}

export interface SectionCache {
  type: string;
  position: Pos;
}

export interface FrontMatterCache {
  [key: string]: any;
  position: Pos;
}

export interface Pos {
  start: Loc;
  end: Loc;
}

export interface Loc {
  line: number;
  col: number;
  offset: number;
}

export interface EventRef {
  e: any;
}

export interface WorkspaceLeaf {
  view: any;
  getViewState(): any;
  setViewState(viewState: any): Promise<void>;
}

export interface UserEvent {
  [key: string]: any;
}

export type ViewCreator = (leaf: WorkspaceLeaf) => any;
export type MarkdownPostProcessor = (
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext
) => void | Promise<void>;

export interface MarkdownPostProcessorContext {
  docId: string;
  sourcePath: string;
  frontmatter: any;
  addChild(child: any): void;
  getSectionInfo(el: HTMLElement): MarkdownSectionInformation | null;
}

export interface MarkdownSectionInformation {
  text: string;
  lineStart: number;
  lineEnd: number;
}

// 导出 mock 创建函数
export function createMockApp(): App {
  return {
    workspace: createMockWorkspace(),
    vault: createMockVault(),
    metadataCache: createMockMetadataCache(),
    fileManager: createMockFileManager(),
    lastEvent: null,
  };
}

export function createMockWorkspace(): Workspace {
  const eventHandlers = new Map<string, Set<Function>>();

  return {
    on: jest.fn((name: string, callback: Function) => {
      if (!eventHandlers.has(name)) {
        eventHandlers.set(name, new Set());
      }
      eventHandlers.get(name)?.add(callback);
      return { e: {} } as EventRef;
    }),
    off: jest.fn((name: string, callback: Function) => {
      eventHandlers.get(name)?.delete(callback);
    }),
    trigger: jest.fn((name: string, ...data: any[]) => {
      eventHandlers.get(name)?.forEach((cb) => cb(...data));
    }),
    getActiveFile: jest.fn(() => null),
    getActiveViewOfType: jest.fn(() => null),
    getLeaf: jest.fn(() => ({} as WorkspaceLeaf)),
  };
}

export function createMockVault(): Vault {
  return {
    read: jest.fn(async () => ''),
    modify: jest.fn(async () => {}),
    create: jest.fn(async () => ({} as TFile)),
    delete: jest.fn(async () => {}),
    rename: jest.fn(async () => {}),
    getAbstractFileByPath: jest.fn(() => null),
    getFiles: jest.fn(() => []),
  };
}

export function createMockMetadataCache(): MetadataCache {
  return {
    getFileCache: jest.fn(() => null),
    getCache: jest.fn(() => null),
    on: jest.fn(() => ({ e: {} } as EventRef)),
  };
}

export function createMockFileManager(): FileManager {
  return {
    processFrontMatter: jest.fn(async () => {}),
    generateMarkdownLink: jest.fn(() => ''),
  };
}

export function createMockEditor(content: string = ''): Editor {
  const lines = content.split('\n');
  let cursorPos: EditorPosition = { line: 0, ch: 0 };
  let selection = '';

  return {
    getLine: jest.fn((line: number) => lines[line] || ''),
    setLine: jest.fn((line: number, text: string) => {
      lines[line] = text;
    }),
    lineCount: jest.fn(() => lines.length),
    lastLine: jest.fn(() => lines.length - 1),
    getCursor: jest.fn(() => cursorPos),
    setCursor: jest.fn((pos: EditorPosition | number, ch?: number) => {
      if (typeof pos === 'number') {
        cursorPos = { line: pos, ch: ch || 0 };
      } else {
        cursorPos = pos;
      }
    }),
    getSelection: jest.fn(() => selection),
    replaceSelection: jest.fn((replacement: string) => {
      selection = replacement;
    }),
    replaceRange: jest.fn((replacement: string, from: EditorPosition, to?: EditorPosition) => {
      // Mock 实现
    }),
    getValue: jest.fn(() => lines.join('\n')),
    setValue: jest.fn((content: string) => {
      lines.length = 0;
      lines.push(...content.split('\n'));
    }),
    getRange: jest.fn((from: EditorPosition, to: EditorPosition) => {
      // Mock 实现
      return '';
    }),
    somethingSelected: jest.fn(() => selection.length > 0),
    getDoc: jest.fn(() => ({})),
  };
}

export function createMockTFile(path: string = 'test.md'): TFile {
  return {
    vault: createMockVault(),
    path,
    name: path.split('/').pop() || path,
    basename: path.split('/').pop()?.replace(/\.[^.]+$/, '') || path,
    extension: path.split('.').pop() || '',
    parent: null,
    stat: {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0,
    },
  };
}
