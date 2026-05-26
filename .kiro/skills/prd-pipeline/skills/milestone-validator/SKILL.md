---
name: milestone-validator
description: "独立验证里程碑完成度。以全新上下文（从未见过代码实现过程）读取 VALIDATION.md，逐条执行验证断言，生成 VERDICT.json。确保'实现者不评估自己'原则。"
---

# Milestone Validator (Independent, Fresh Context)

以独立视角验证代码实现是否满足验证合约。

## 核心原则

> **此 Validator 绝对不能与 code-generator 共享上下文。**
> 它只看规约和证据，不看实现过程。
> 这是"工人不评估自己"原则的工程实现。

## 前置条件

- 必须在**全新的 agent session** 中执行
- 不能看到 code-generator 的对话历史
- 只接收：VALIDATION.md + EVIDENCE.md + 项目代码（只读）

## 输入

- `VALIDATION.md`：验证合约（行为断言清单）
- `EVIDENCE.md`：code-generator 的完成证据
- 项目代码（只读访问）
- 验证命令列表

## 输出

- `VERDICT.json`：每条断言的 PASS/FAIL 判定 + 失败原因

## 验证过程

### Step 1: 断言清单加载

读取 VALIDATION.md，提取所有断言条目：
```
V1.1, V1.2, V2.1, V2.2, V2.3, ...
```

### Step 2: 逐条执行验证

对每个断言，按其声明的验证方式执行：

**自动验证**（command/test 类）：
```bash
# 执行验证命令
result=$(eval "$verification_command" 2>&1)
exit_code=$?

# 与期望结果比对
if [[ matches_expected ]]; then
  verdict="PASS"
else
  verdict="FAIL"
  failure_reason="Expected: [X], Got: [Y]"
fi
```

**手动验证**（manual 类）：
```
1. 按断言描述的步骤操作
2. 观察结果
3. 与期望比对
4. 记录实际观察到的行为
```

### Step 3: 回归检查

除了断言验证外，还需确认：
- [ ] 全量测试套件通过（不只是新测试）
- [ ] 构建成功（无编译错误）
- [ ] 无新的 lint 警告/错误

### Step 4: 生成 VERDICT

```json
{
  "timestamp": "2026-05-17T12:00:00Z",
  "spec_source": "SPEC.md",
  "total_assertions": 12,
  "passed": 10,
  "failed": 2,
  "verdict": "FAIL",
  "assertions": [
    {
      "id": "V1.1",
      "description": "用户注册成功返回 201",
      "category": "test",
      "result": "PASS",
      "evidence": "npm test -- --grep 'registration' → 3 tests passed"
    },
    {
      "id": "V2.3",
      "description": "重复邮箱注册返回 409",
      "category": "test",
      "result": "FAIL",
      "expected": "HTTP 409 Conflict",
      "actual": "HTTP 500 Internal Server Error",
      "failure_analysis": "缺少唯一约束检查，数据库抛出未捕获异常"
    }
  ],
  "regression": {
    "build": "PASS",
    "lint": "PASS",
    "existing_tests": "PASS (147/147)"
  },
  "recommendations": [
    "V2.3: 需要在注册逻辑中添加 email 唯一性检查，catch 数据库 unique constraint 错误并返回 409"
  ]
}
```

## 判定规则

| 情况 | 判定 | 后续动作 |
|------|------|---------|
| 所有断言 PASS + 回归 PASS | **VALIDATION PASSED** | Pipeline 完成 |
| 任何断言 FAIL | **VALIDATION FAILED** | 触发 auto-debugger |
| 回归失败（已有测试 broken） | **REGRESSION DETECTED** | 优先修复回归 |
| 验证命令执行失败（环境问题） | **INCONCLUSIVE** | 修复环境后重试 |

## 失败分析要求

对每个 FAIL 的断言，必须提供：
1. **Expected**：期望的行为/输出
2. **Actual**：实际观察到的行为/输出
3. **Analysis**：初步根因分析（基于代码阅读）
4. **Recommendation**：建议修复方向（但不写修复代码）

## 验证者行为规范

- ✅ 严格按断言执行，不添加额外检查
- ✅ 客观记录结果，不主观评价代码质量
- ✅ 提供可操作的失败分析
- ❌ 不修改任何代码
- ❌ 不"宽容"地通过不完全满足条件的断言
- ❌ 不假设"这个可能是预期的"——按字面执行
