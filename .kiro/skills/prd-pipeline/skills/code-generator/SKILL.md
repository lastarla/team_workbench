---
name: code-generator
description: "为单个原子任务生成代码。严格 TDD（Red-Green-Refactor），内置验证循环（typecheck → lint → test）。必须在独立 subagent 中执行以防止上下文污染。每次调用只处理一个任务。"
---

# Code Generator (Per-Task, Fresh Context)

为单个原子任务生成经过验证的代码。严格遵循 TDD 和验证循环。

## 前置条件

- 此 skill 必须在**独立的 subagent** 中调用（`task(category="...", ...)`)
- 每次调用只处理 TASKS.md 中的**一个**任务
- Agent 收到的上下文仅包含：当前任务规格 + SPEC.md + 必要的项目文件

## 输入

- 单个任务规格（from TASKS.md 的某个 Task）
- SPEC.md（全局需求上下文，只读参考）
- 项目文件结构（必要的现有文件内容）
- 验证命令（build/lint/test 命令）

## 输出

- 代码文件变更（实现 + 测试）
- EVIDENCE.md 条目追加

## TDD 工作流（严格遵循）

### 🔴 Phase RED: 写失败测试

```
1. 阅读任务验收标准
2. 设计测试用例（至少覆盖：正常路径 + 1个边界 + 1个错误路径）
3. 编写测试代码
4. 运行测试 → 确认失败
   - 如果测试通过 → 任务可能已完成，或测试写错了
   - 如果测试报编译错误（因为实现不存在）→ 正常，继续
5. 记录测试文件路径
```

**测试设计原则**：
- 测试行为，不测试实现
- 使用有意义的 test name（`it('should return 401 when token is expired')`）
- 不 mock 被测函数本身的核心逻辑
- 边界测试：空值、极值、非法输入

### 🟢 Phase GREEN: 最小实现

```
1. 编写让测试通过的最小代码
2. 不添加任何测试未要求的功能
3. 代码可以"ugly"但必须 correct
4. 运行测试 → 确认通过
   - 如果失败 → 修复实现（不修改测试！）
   - 如果通过 → 进入 REFACTOR
```

**最小实现原则**：
- 硬编码是可以接受的（在 REFACTOR 阶段清理）
- 不要预优化
- 不要预设未来需求
- 只做测试要求的事

### 🔵 Phase REFACTOR: 改进

```
1. 检查代码质量：
   - 有重复？ → 提取函数/常量
   - 命名不清晰？ → 改善变量/函数名
   - 逻辑复杂？ → 拆分
   - 类型不够精确？ → 收紧类型定义
2. 运行测试 → 确认仍然通过
3. 如果测试失败 → 回退重构，保持 GREEN
```

## 验证循环（每次代码修改后执行）

```bash
# Step 1: 结构验证（编译/类型检查）
# 具体命令根据项目技术栈：
npm run typecheck        # TypeScript
tsc --noEmit             # TypeScript (alternative)
mypy .                   # Python
cargo check              # Rust
go vet ./...             # Go

# Step 2: 格式验证（Lint）
npm run lint             # JavaScript/TypeScript
ruff check .             # Python
cargo clippy             # Rust
golangci-lint run        # Go

# Step 3: 语义验证（测试）
npm test                 # JavaScript/TypeScript
pytest                   # Python
cargo test               # Rust
go test ./...            # Go
```

### 失败处理

如果任何验证步骤失败：

```
1. 解析错误信息 → 定位具体文件和行号
2. 分类错误：
   - 类型错误 → 修复类型声明
   - Lint 错误 → 修复风格（不用 disable）
   - 测试失败 → 分析失败原因 → 修复实现
3. 修复后重新运行完整验证循环
4. 最多重试 3 次
5. 3 次后仍失败 → 输出当前状态 + 错误分析 → 标记 BLOCKED
```

## EVIDENCE 记录

每个任务完成后，追加到 EVIDENCE.md：

```markdown
### Task [N]: [任务名称]
- **状态**: COMPLETED | BLOCKED
- **产出物**: [文件路径列表]
- **测试**: [测试文件路径] — [N] tests, all passing
- **验证结果**:
  - typecheck: ✅ PASS
  - lint: ✅ PASS
  - test: ✅ PASS ([N] tests)
- **备注**: [任何发现、假设、或后续需要注意的事项]
```

## 绝对禁止

- ❌ `as any`、`@ts-ignore`、`@ts-expect-error`（类型体操找不到解决方案时，问人）
- ❌ `// eslint-disable`、`# noqa`、`#[allow(clippy::...)]`（修复代码，不是压制警告）
- ❌ 删除或修改失败的测试使其通过（修复实现！）
- ❌ 在验证失败时声称"完成"
- ❌ 修改不属于当前任务的文件（除非是该任务声明的依赖）
- ❌ 添加任务规格未要求的功能
- ❌ 引入新的第三方依赖（除非任务规格明确要求）

## 置信度自评估

完成代码后，回答以下（1-5 分）：

1. 需求理解确定度？（1=猜测, 5=完全确定）
2. 边界情况覆盖度？（1=有遗漏, 5=全覆盖）
3. 测试充分度？（1=仅 happy path, 5=全路径）

**总分 < 10** → 在 EVIDENCE.md 标记 `LOW_CONFIDENCE`，建议额外 review
**总分 ≥ 10** → 正常继续
