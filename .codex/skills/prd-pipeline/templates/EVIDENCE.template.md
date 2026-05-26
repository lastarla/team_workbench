# Evidence Log

> 由 code-generator 在完成每个任务后追加。供 milestone-validator 独立验证。

## 元信息

| 字段 | 值 |
|------|---|
| 项目 | [项目名] |
| Pipeline 启动时间 | [timestamp] |
| 最后更新 | [timestamp] |

---

## 已完成任务

### Task 1: [任务名称]
- **状态**: ✅ COMPLETED | ⚠️ BLOCKED | 🔄 IN_PROGRESS
- **完成时间**: [timestamp]
- **产出物**:
  - `[file1.ts]` — [描述]
  - `[file1.test.ts]` — [测试描述]
- **验证结果**:
  - typecheck: ✅ PASS
  - lint: ✅ PASS
  - test: ✅ PASS ([N] tests, [M] assertions)
- **置信度**: HIGH | MEDIUM | LOW
- **备注**: [任何发现或后续注意事项]

---

### Task 2: [任务名称]
- **状态**: [状态]
- **完成时间**: [timestamp]
- **产出物**:
  - `[file2.ts]`
- **验证结果**:
  - typecheck: ✅ PASS
  - lint: ✅ PASS
  - test: ✅ PASS
- **置信度**: HIGH
- **备注**: -

---

## 汇总

| 指标 | 值 |
|------|---|
| 总任务数 | [N] |
| 已完成 | [M] |
| 被阻塞 | [B] |
| 总测试数 | [T] |
| 通过测试 | [T] |
| 新增代码行 | [L] |
