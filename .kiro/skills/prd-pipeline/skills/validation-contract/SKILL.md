---
name: validation-contract
description: "从 SPEC.md 生成 Validation Contract（验证合约）。将每个验收标准转化为可自动验证的行为断言，定义'什么是正确'。验证合约在代码实现之前完成，确保先定义正确性再写代码。"
---

# Validation Contract Writer

将 SPEC.md 的验收标准转化为可执行的验证断言。**在任何代码实现之前完成**。

## 输入

- `SPEC.md`：结构化需求规约（由 prd-analyzer 生成）
- 项目技术栈信息（测试框架、构建工具）

## 输出

- `VALIDATION.md`：行为断言清单，每条可通过命令/测试/观察验证

## 过程

### Step 1: 验收标准映射

对 SPEC.md 中的**每个验收标准**，生成 1-3 个验证断言：

```markdown
### AC-{N}: [验收标准描述]

**断言 1**: [具体的可测试行为]
- 验证方式: [test | command | manual]
- 验证命令: `[具体的验证命令]`
- 期望结果: [精确的期望输出]
- 判定: PASS if [条件] | FAIL if [条件]

**断言 2**: [边界情况或错误处理]
- 验证方式: [test | command | manual]
- ...
```

### Step 2: 断言分类

每个断言归入以下类别之一：

| 类别 | 验证方式 | 示例 |
|------|---------|------|
| **编译时** | `npm run typecheck` / `tsc --noEmit` | 类型正确性 |
| **测试时** | `npm test` / `pytest` | 功能正确性 |
| **运行时** | 启动应用 → 执行操作 → 检查结果 | E2E 行为 |
| **静态分析** | `npm run lint` / `eslint` | 代码规范 |
| **集成** | API 调用 → 检查响应 | 系统间交互 |

### Step 3: 验证命令具体化

每个断言必须有**精确的验证命令**：

```markdown
# 好的（精确、可执行）
验证命令: `curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Str0ng!Pass"}' | jq .status`
期望结果: `"created"`

# 坏的（模糊、无法自动执行）
验证命令: "检查用户是否创建成功"
期望结果: "应该能看到新用户"
```

### Step 4: 覆盖性检查

确保断言覆盖：
- [ ] 正常路径（Happy path）：每个功能的主要流程
- [ ] 错误路径（Error path）：无效输入、权限不足、资源不存在
- [ ] 边界条件：空值、最大值、并发、超时
- [ ] 回归保护：现有功能不被破坏

## 输出格式

```markdown
# Validation Contract

## 元信息
- 生成自: SPEC.md
- 生成时间: [timestamp]
- 总断言数: [N]
- 自动验证: [M] / 手动验证: [N-M]

## 断言清单

### AC-1: [验收标准 1 的描述]

**V1.1**: [断言描述]
- 类别: test
- 命令: `npm test -- --grep "user registration"`
- 期望: 测试通过（exit code 0）
- 判定: PASS if exit 0 | FAIL if exit != 0

**V1.2**: [边界断言]
- 类别: test
- 命令: `npm test -- --grep "duplicate email"`
- 期望: 返回 409 Conflict
- 判定: PASS if test passes | FAIL otherwise

### AC-2: [验收标准 2]
...

## 验证执行顺序

1. 编译时断言（全部必须 PASS 才继续）
2. 静态分析断言
3. 单元/集成测试断言
4. E2E/运行时断言
5. 手动验证断言（如有）

## 全局通过条件

ALL assertions PASS → VALIDATION PASSED
ANY assertion FAIL → VALIDATION FAILED (列出失败项)
```

## 质量规则

1. **Binary 判定**：每个断言的结果必须是 PASS 或 FAIL，不存在"部分通过"
2. **可重复执行**：同样的代码 → 同样的验证结果（no flaky assertions）
3. **独立性**：断言之间无顺序依赖（除非显式声明）
4. **最小化手动**：尽量自动化，手动验证仅用于 UI/UX 类断言
5. **先写合约再写代码**：这是 PRE-implementation artifact
