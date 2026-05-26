# Validation Contract

> 在代码实现之前定义"什么是正确的"。每个断言可自动或手动验证。

## 元信息

| 字段 | 值 |
|------|---|
| 生成自 | SPEC.md |
| 生成时间 | [timestamp] |
| 总断言数 | [N] |
| 自动验证 | [M] |
| 手动验证 | [N-M] |

---

## 断言清单

### AC-1: [验收标准描述]

**V1.1**: [正常路径断言]
- 类别: test | command | manual
- 验证命令: `[命令]`
- 期望结果: [精确期望]
- 判定: PASS if [条件] | FAIL if [条件]

**V1.2**: [边界/错误路径断言]
- 类别: test | command | manual
- 验证命令: `[命令]`
- 期望结果: [精确期望]
- 判定: PASS if [条件] | FAIL if [条件]

---

### AC-2: [验收标准描述]

**V2.1**: [断言]
- 类别: [类别]
- 验证命令: `[命令]`
- 期望结果: [期望]
- 判定: PASS if [条件] | FAIL if [条件]

---

## 验证执行顺序

1. **编译时** — typecheck 全部 PASS 才继续
2. **静态分析** — lint 全部 PASS 才继续
3. **单元/集成测试** — test suite 全部 PASS
4. **E2E/行为断言** — 按上述断言逐条执行
5. **手动验证**（如有）— 人工确认

## 全局通过条件

```
IF all(assertion.result == "PASS") AND regression == "PASS":
    VERDICT = "PASSED"
ELSE:
    VERDICT = "FAILED"
    failed_items = [a for a in assertions if a.result == "FAIL"]
```
