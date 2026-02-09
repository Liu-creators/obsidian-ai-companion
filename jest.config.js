/** @type {import('jest').Config} */
export default {
  // 使用 ts-jest 预设来处理 TypeScript 文件
  preset: 'ts-jest',
  
  // 测试环境：使用 Node.js 环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // 排除的文件
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/setup.ts',
    '/__tests__/test-utils.ts',
    '/__mocks__/'
  ],
  
  // 模块路径映射（与 tsconfig.json 的 baseUrl 保持一致）
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1'
  },
  
  // 根目录
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  
  // 转换配置
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // 与项目 tsconfig.json 保持一致的关键配置
        module: 'ESNext',
        target: 'ES6',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        noImplicitAny: true,
        noImplicitThis: true,
        strictNullChecks: true,
        strictBindCallApply: true,
        noUncheckedIndexedAccess: true,
        lib: ['DOM', 'ES5', 'ES6', 'ES7']
      }
    }]
  },
  
  // 收集覆盖率的文件
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/types/**'
  ],
  
  // 覆盖率阈值（目标 80%，开发初期设置为 0 以不阻塞测试）
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 设置文件（在所有测试之前运行）
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 清除 mock 调用和实例
  clearMocks: true,
  
  // 每个测试文件的超时时间（毫秒）
  testTimeout: 10000,
  
  // 详细输出
  verbose: true
};
