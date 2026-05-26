# Debugging Strategies

> 参考资料：常见错误的调试策略和修复模式。供 auto-debugger skill 使用。

## 错误分类与修复模式

### Category 1: 类型错误

**症状**: `TS2304`, `TS2345`, `TS2322`, mypy errors

**常见原因**:
- 接口定义与实际数据不匹配
- Optional/null 未处理
- 泛型参数错误

**修复策略**:
```
1. 追踪类型链：从错误位置 → 数据来源
2. 确认实际运行时数据的 shape
3. 修正类型声明（不是加 as any）
4. 如果是第三方库类型问题 → 创建 .d.ts 声明
```

### Category 2: 测试失败

**症状**: `FAIL`, `AssertionError`, `expect(...).toBe(...)`

**分析步骤**:
```
1. 读取测试描述 → 理解期望行为
2. 读取 actual vs expected → 确定偏差
3. 分类：
   - 逻辑错误：代码做了错误的事 → 修复算法
   - 缺失处理：代码没做该做的事 → 添加逻辑
   - 环境问题：测试环境 vs 预期不符 → 修复 setup
   - 时序问题：异步操作未等待 → 添加 await/setTimeout
```

**修复原则**: 修代码，不修测试（除非测试本身有 bug）

### Category 3: Lint 错误

**症状**: `no-unused-vars`, `prefer-const`, `no-any`

**修复策略**:
```
- unused-vars: 删除未使用的变量/导入
- prefer-const: let → const（如果不重新赋值）
- no-any: 添加具体类型声明
- no-implicit-return: 添加显式 return
- 复杂规则: 重构代码使其符合规则（不 disable）
```

### Category 4: 运行时错误

**症状**: `TypeError: Cannot read property`, `ReferenceError`, `500 Internal Server Error`

**分析步骤**:
```
1. 读取 stack trace → 定位触发位置
2. 检查触发条件：什么输入/状态导致了错误？
3. 分类：
   - Null/undefined access → 添加 null check 或 optional chaining
   - 未定义引用 → 检查 import/export
   - 类型假设错误 → 添加运行时验证
```

### Category 5: 集成错误

**症状**: 单元测试通过但 E2E 失败, API 返回错误

**分析步骤**:
```
1. 确认各模块独立工作正常
2. 检查模块间的数据传递：
   - 请求格式是否匹配？
   - 响应解析是否正确？
   - 中间件/拦截器是否干扰？
3. 检查环境差异：
   - 环境变量
   - 数据库状态
   - 端口/路径配置
```

### Category 6: 并发/竞态

**症状**: 间歇性失败, "有时通过有时不通过"

**修复策略**:
```
1. 添加适当的同步机制（mutex, semaphore, queue）
2. 确保状态更新的原子性
3. 添加 retry 机制（for network-related）
4. 使用确定性排序（避免依赖 map/set 顺序）
```

## 通用调试工作流

```
1. REPRODUCE: 确认可以稳定复现
2. ISOLATE: 找到最小复现 case
3. DIAGNOSE: 理解为什么错
4. FIX: 最小修改
5. VERIFY: 确认修复有效
6. REGRESSION: 确认没引入新问题
```

## 修复反模式

| 反模式 | 为什么错 | 正确做法 |
|--------|---------|---------|
| 加 try-catch 吞异常 | 隐藏问题 | 处理具体异常并返回适当错误 |
| as any / @ts-ignore | 类型系统失效 | 修复实际类型问题 |
| eslint-disable-line | 规则存在有原因 | 修复代码符合规则 |
| 删除失败的测试 | 失去回归保护 | 修复代码通过测试 |
| setTimeout 等 N 秒 | 脆弱且慢 | 使用 event/polling/await |
| 硬编码修复值 | 不通用 | 找到根本算法问题 |

## 常见修复代码片段

### Null Safety (TypeScript)
```typescript
// Before (crash)
const name = user.profile.name;

// After (safe)
const name = user?.profile?.name ?? 'Unknown';
```

### Error Handling (Node.js)
```typescript
// Before (unhandled)
const data = await fetchData();

// After (handled)
try {
  const data = await fetchData();
} catch (error) {
  if (error instanceof NetworkError) {
    return res.status(503).json({ error: 'Service unavailable' });
  }
  throw error; // re-throw unknown errors
}
```

### Race Condition (async)
```typescript
// Before (race condition)
let count = 0;
await Promise.all(items.map(async (item) => {
  count++; // NOT atomic!
}));

// After (safe)
const results = await Promise.all(items.map(processItem));
const count = results.length;
```
