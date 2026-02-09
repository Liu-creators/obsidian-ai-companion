/**
 * Jest 测试设置文件
 * 在所有测试之前运行，用于配置全局测试环境
 */

// 设置全局超时时间
jest.setTimeout(10000);

// 配置 console 输出（可选：在测试时抑制某些日志）
// global.console = {
//   ...console,
//   // 取消注释以下行来抑制特定的 console 方法
//   // log: jest.fn(),
//   // debug: jest.fn(),
//   // info: jest.fn(),
//   // warn: jest.fn(),
//   // error: jest.fn(),
// };

// 添加自定义匹配器（如果需要）
// expect.extend({
//   // 自定义匹配器
// });
