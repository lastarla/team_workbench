# Task Decomposition Patterns

> 参考资料：常见的任务分解模式和反模式。供 task-decomposer skill 使用。

## 分解模式

### Pattern 1: Layer-First（按层分解）

适用于：典型 Web 应用（前后端分离）

```
Wave 1: 数据层（schema/migration/model）
Wave 2: 业务逻辑层（service/usecase）
Wave 3: 接口层（API routes/controllers）
Wave 4: 展示层（UI components/pages）
Wave 5: 集成层（连接前后端）
```

优势：每层独立测试，依赖方向清晰
劣势：延迟交付端到端功能

### Pattern 2: Feature-First（按功能分解）

适用于：微服务/独立模块

```
Wave 1: Feature A（全栈 slice：DB + API + UI）
Wave 2: Feature B（全栈 slice）
Wave 3: Feature C（全栈 slice）
Wave 4: 集成 + 共享组件
```

优势：每个 wave 产出可运行功能
劣势：可能有重复工作需要 Wave 4 统一

### Pattern 3: Risk-First（按风险分解）

适用于：有技术不确定性的项目

```
Wave 1: 高风险/不确定 tasks（spike/验证）
Wave 2: 依赖 Wave 1 结论的 tasks
Wave 3: 低风险/确定性 tasks（可并行）
```

优势：尽早发现问题，减少返工
劣势：Wave 1 可能阻塞后续工作

### Pattern 4: Interface-First（接口优先）

适用于：多模块/多团队协作

```
Wave 1: 定义所有接口（types/interfaces/API contracts）
Wave 2: 各模块独立实现（against interfaces）
Wave 3: 集成测试
```

优势：极高并行度（Wave 2 完全并行）
劣势：需要前期接口设计投入

## 反模式

### ❌ God Task
一个任务修改 5+ 个文件，做 3+ 件事。
→ 修复：拆分为多个单一职责任务

### ❌ Implicit Dependency
Task B 实际依赖 Task A 但未标记。
→ 修复：执行前检查所有 imports/references

### ❌ Over-Decomposition
30 个任务做一个简单 CRUD。
→ 修复：如果任务 < 10 行代码，合并到相邻任务

### ❌ Under-Decomposition
一个任务是"实现认证系统"（其实是 10 个子任务）。
→ 修复：拆到每个任务 ≤ 200 行代码产出

### ❌ Pre-commitment
在不知道数据结构的情况下先分解 UI 任务。
→ 修复：先完成数据层，基于实际 schema 再分解 UI

## 复杂度估算

| 信号 | 复杂度 | 建议 |
|------|--------|------|
| 单文件 < 50 行 | LOW | category="quick" |
| 2-3 文件, 需要设计决策 | MEDIUM | category="unspecified-high" |
| 多文件交互, 新模式 | HIGH | category="deep" |
| 涉及架构决策 | VERY HIGH | 先 consult oracle |

## 并行化规则

1. **完全独立**（不同文件，不同模块）→ 可并行
2. **读取依赖**（B 读取 A 的输出文件）→ 必须串行
3. **同文件修改**（A 和 B 都修改同一文件）→ 必须串行
4. **接口依赖**（B 使用 A 定义的接口）→ 定义先行，实现可并行
