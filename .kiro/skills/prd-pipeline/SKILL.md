---
name: prd-pipeline
description: "PRD → Code 全自动化管线。将 PRD 文档自动转化为可工作的代码：规约提取 → 验证合约 → 任务分解 → TDD 代码生成 → 独立验证 → 自动修复。基于 Goal Command + Factory Missions + Thin Harness Fat Skills 架构。当用户提供 PRD/需求文档并要求实现功能时激活。"
---

# PRD → Code Pipeline

将 PRD 文档自动转化为经过验证的、可工作的代码。

## 架构概览

```
PRD Document
    ↓
[prd-analyzer] → SPEC.md (结构化规约)
    ↓
[validation-contract] → VALIDATION.md (行为断言)
    ↓
[task-decomposer] → TASKS.md (原子任务 DAG)
    ↓
[code-generator] × N tasks → Code + Tests + EVIDENCE.md
    ↓
[milestone-validator] → VERDICT.json
    ↓
  PASS → Done  |  FAIL → [auto-debugger] → Loop
```

## 触发条件

当用户做以下任一操作时，激活此 skill：
- 提供 PRD 文档（任何格式）并要求实现
- 说"按 PRD 实现"、"实现这个需求文档"、"从 PRD 生成代码"
- 提供 feature spec / user story 并要求完整实现

## 完整工作流程

### Phase 1: 规约提取
**加载**: `prd-analyzer` skill
**输入**: 用户提供的 PRD 文档
**输出**: `SPEC.md`
**完成条件**: SPEC.md 存在，结构完整，用户确认无误

```
操作：
1. 读取 PRD 文档
2. 提取结构化需求（功能/非功能/约束/验收标准/非目标）
3. 进行歧义检测 → 如有歧义，向用户提问
4. 用户确认后，输出 SPEC.md
```

### Phase 2: 验证合约
**加载**: `validation-contract` skill
**输入**: SPEC.md
**输出**: `VALIDATION.md`
**完成条件**: 每个验收标准都有对应的可测试断言

```
操作：
1. 读取 SPEC.md 中的验收标准
2. 每个标准 → 1-3 个可测试的行为断言
3. 定义每个断言的验证方法（命令/测试/手动步骤）
4. 输出 VALIDATION.md
```

### Phase 3: 任务分解
**加载**: `task-decomposer` skill
**输入**: SPEC.md + 项目代码结构
**输出**: `TASKS.md`
**完成条件**: 无循环依赖，每个任务原子化（单一产出物），可并行标记

```
操作：
1. 分析 SPEC.md → 技术实现路径
2. 分解为原子任务（每个任务 = 1 个文件/组件/函数）
3. 建立依赖图（DAG），拓扑排序
4. 标记可并行的任务组
5. 输出 TASKS.md
```

### Phase 4: 代码生成
**加载**: `code-generator` skill（每个任务独立调用，fresh context）
**输入**: 单个任务规格 + SPEC.md + 项目上下文
**输出**: 代码变更 + 测试 + EVIDENCE.md 条目
**完成条件**: 每个任务的验证循环通过（compile + lint + test = green）

```
操作（对 TASKS.md 中每个任务，按依赖顺序）：
1. 使用 subagent 执行（隔离上下文，防止退化）
2. TDD: RED → GREEN → REFACTOR
3. 验证循环：typecheck → lint → test
4. 通过后记录到 EVIDENCE.md
5. 标记任务为 done
```

**关键规则**：
- 每个任务使用独立 subagent（`task(category="deep", ...)` 或 `task(category="quick", ...)`）
- 永远不在一个 session 中实现多个任务（防止上下文污染）
- 如果验证失败超过 3 次 → 标记为 BLOCKED，继续下一个任务

### Phase 5: 里程碑验证
**加载**: `milestone-validator` skill（fresh context，从未见过代码实现）
**输入**: VALIDATION.md + EVIDENCE.md + 项目代码
**输出**: `VERDICT.json`
**完成条件**: 所有断言 PASS

```
操作：
1. 以全新视角读取 VALIDATION.md
2. 逐条执行验证（运行测试、检查行为、验证输出）
3. 生成 VERDICT.json（每条断言的 PASS/FAIL + 原因）
4. 汇总：ALL PASS → 完成 | ANY FAIL → Phase 6
```

**关键规则**：
- Validator 绝对不能与 Phase 4 的 generator 共享对话上下文
- Validator 只看规约和证据，不看实现过程
- 这确保了"工人不评估自己"的原则

### Phase 6: 自动修复（仅在验证失败时）
**加载**: `auto-debugger` skill
**输入**: VERDICT.json（失败条目）+ 相关代码
**输出**: 修复代码 + 更新的 EVIDENCE.md
**完成条件**: 修复后重新验证通过

```
操作：
1. 读取 VERDICT.json 中的失败断言
2. 分析失败原因（错误分类：逻辑/集成/配置/边界）
3. 生成 targeted fix（最小修复，不重构）
4. 运行验证循环确认修复有效
5. Loop back to Phase 5 验证
6. 最多 3 次修复循环，超过则请求人工介入
```

## 关键原则

1. **Spec First**: 没有批准的 SPEC.md，绝不开始写代码
2. **Validation Contract Before Code**: 先定义成功标准
3. **Fresh Context per Task**: 每个任务用干净 Agent
4. **Deterministic Gates**: 测试/构建/Lint 是硬门槛
5. **Worker ≠ Validator**: 写代码的 Agent 不验证自己的代码
6. **Progressive Disclosure**: 只在需要时加载子 skill 的完整内容
7. **Max 3 Retries**: 任何阶段失败 3 次 → 暂停 → 请求人工

## 文件产出物

| 文件 | 阶段 | 描述 |
|------|------|------|
| `SPEC.md` | Phase 1 | 结构化、无歧义的需求规约 |
| `VALIDATION.md` | Phase 2 | 可测试的行为断言清单 |
| `TASKS.md` | Phase 3 | 原子任务 DAG（含依赖和并行标记） |
| `EVIDENCE.md` | Phase 4 | 每个任务的完成证据 |
| `VERDICT.json` | Phase 5 | 验证结果（PASS/FAIL per assertion） |

## 适应性重规划

如果在 Phase 4 执行过程中发现：
- 新的依赖关系（原计划中没有的）
- 任务比预期复杂 2x+
- 技术约束改变

则：暂停 → 重新运行 Phase 3（task-decomposer）→ 基于实际代码状态重新分解

## 经验积累

每次 pipeline 完成后，将发现写入 `references/` 目录：
- 哪些验证策略有效
- 哪些分解模式适合当前项目
- 项目特定的陷阱和约束
