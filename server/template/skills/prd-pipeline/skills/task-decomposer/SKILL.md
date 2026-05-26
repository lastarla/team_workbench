---
name: task-decomposer
description: "将 SPEC.md 分解为原子任务 DAG。每个任务产出单一工件，标注依赖关系和可并行性。输出拓扑排序后的 TASKS.md，供 code-generator 逐个执行。"
---

# Task Decomposer

将结构化规约分解为可独立执行的原子任务图（DAG）。

## 输入

- `SPEC.md`：结构化需求规约
- 项目代码结构（目录树、现有文件）
- 技术栈信息

## 输出

- `TASKS.md`：原子任务清单，含依赖关系和并行标记

## 分解原则

### 原子性（Atomicity）
每个任务**仅产出一个工件**：
- 一个函数/模块
- 一个 API endpoint
- 一个组件
- 一个配置文件
- 一个数据库迁移

**反模式**：一个任务包含多个独立产出 → 必须拆分

### 可测试性（Testability）
每个任务有明确的验收标准：
- "函数返回正确结果"（可写测试）
- "API 返回 200 + 正确 JSON"（可 curl 验证）
- "组件渲染正确 DOM"（可 snapshot 测试）

### 独立性（Independence）
每个任务可以在独立的 agent session 中完成：
- 不依赖未完成任务的 output（除非显式标记）
- 不需要了解其他任务的实现细节
- 有明确的 input contract

### 可验证终止（Verifiable Termination）
每个任务有 binary 完成条件：
- `typecheck PASS + lint PASS + test PASS` = DONE
- 不是"看起来差不多" = DONE

## 分解过程

### Step 1: 功能到模块映射

```
SPEC.md 功能需求
    ↓
技术架构分析（需要哪些模块/层）
    ↓
每个模块 → 1-3 个原子任务
```

### Step 2: 依赖分析

对每对任务 (A, B) 判断：
- A 的输出是否是 B 的输入？ → B depends_on A
- A 和 B 操作同一文件？ → 串行（谁先？）
- A 和 B 完全独立？ → 可并行

### Step 3: DAG 验证

- [ ] 无循环依赖（DAG 验证）
- [ ] 所有叶子任务无前置依赖（可作为起始）
- [ ] 关键路径合理（最长依赖链不超过总任务数的 60%）

### Step 4: 并行分组

将无依赖关系的任务分组（Wave）：
```
Wave 1: [Task A, Task B, Task C] (并行执行)
Wave 2: [Task D, Task E] (依赖 Wave 1 中某些任务)
Wave 3: [Task F] (依赖 Wave 2)
```

## 输出格式

```markdown
# Task Decomposition

## 元信息
- 源自: SPEC.md
- 总任务数: [N]
- 并行波数: [W]
- 预估关键路径: Wave 1 → Wave 2 → ... → Wave W

## Wave 1（无依赖，可并行）

### Task 1: [简短描述]
- **产出物**: [具体文件路径]
- **依赖**: 无
- **验收标准**: [binary 条件]
- **复杂度**: low | medium | high
- **预估**: [代码行数/时间]
- **上下文需要**: [需要读取哪些现有文件]

### Task 2: [简短描述]
- **产出物**: [具体文件路径]
- **依赖**: 无
- ...

## Wave 2（依赖 Wave 1）

### Task 3: [简短描述]
- **产出物**: [具体文件路径]
- **依赖**: Task 1
- **验收标准**: [binary 条件]
- ...

## Wave 3
...

## 依赖图（文本）

Task 1 ──→ Task 3 ──→ Task 5
Task 2 ──→ Task 4 ──┘
                     └──→ Task 6

## 风险标记

- [Task N]: HIGH RISK - [原因]（建议在实现前 review 方案）
- [Task M]: UNCERTAIN - [原因]（可能需要重新分解）
```

## 复杂度判定

| 复杂度 | 特征 | 建议执行模式 |
|--------|------|-------------|
| **low** | 单文件、明确模式、<50行 | `task(category="quick")` |
| **medium** | 2-3文件、需要设计决策、50-200行 | `task(category="unspecified-high")` |
| **high** | 多文件交互、新架构模式、>200行 | `task(category="deep")` |

## 动态重规划

如果在代码生成阶段发现以下情况，触发重新分解：

1. **新依赖发现**：Task A 实现中发现需要先完成未计划的 Task X
   → 插入新任务，调整依赖图

2. **任务过大**：单个任务的验证循环超过 3 次失败
   → 将任务拆分为 2-3 个更小的子任务

3. **技术约束改变**：发现库版本不兼容、API 变更等
   → 更新受影响任务的规格，可能需要替换方案

重规划输出更新后的 TASKS.md（标记已完成的任务，调整剩余任务）。
