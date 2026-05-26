# Verification Gates

> 配置和策略参考。定义各阶段的验证门控规则。

## 门控层次

```
Level 1: STRUCTURAL (必须通过才能继续)
├── 编译成功（0 errors）
├── 类型检查通过
└── 无语法错误

Level 2: QUALITY (必须通过才能继续)
├── Lint 无 error（warning 可接受）
├── 无 dead code 引入
└── import/export 正确

Level 3: FUNCTIONAL (必须通过才能提交)
├── 所有新测试通过
├── 所有已有测试通过（回归）
└── 覆盖率不下降

Level 4: BEHAVIORAL (里程碑验证)
├── VALIDATION.md 断言全部 PASS
├── E2E 流程正确
└── 性能不退化
```

## 各技术栈的默认验证命令

### TypeScript / JavaScript (Node.js)

```yaml
structural:
  - command: "npx tsc --noEmit"
    name: TypeCheck
    required: true
quality:
  - command: "npx eslint . --ext .ts,.tsx --max-warnings 0"
    name: Lint
    required: true
functional:
  - command: "npm test"
    name: Tests
    required: true
  - command: "npm run test:coverage -- --coverageThreshold='{\"global\":{\"branches\":80}}'"
    name: Coverage
    required: false
```

### Python

```yaml
structural:
  - command: "python -m py_compile $(find . -name '*.py' -not -path './venv/*')"
    name: Syntax
    required: true
  - command: "mypy . --ignore-missing-imports"
    name: TypeCheck
    required: true
quality:
  - command: "ruff check ."
    name: Lint
    required: true
  - command: "ruff format --check ."
    name: Format
    required: false
functional:
  - command: "pytest -x"
    name: Tests
    required: true
  - command: "pytest --cov --cov-fail-under=80"
    name: Coverage
    required: false
```

### Rust

```yaml
structural:
  - command: "cargo check"
    name: Compile
    required: true
quality:
  - command: "cargo clippy -- -D warnings"
    name: Clippy
    required: true
  - command: "cargo fmt -- --check"
    name: Format
    required: true
functional:
  - command: "cargo test"
    name: Tests
    required: true
```

### Go

```yaml
structural:
  - command: "go build ./..."
    name: Build
    required: true
  - command: "go vet ./..."
    name: Vet
    required: true
quality:
  - command: "golangci-lint run"
    name: Lint
    required: true
functional:
  - command: "go test ./..."
    name: Tests
    required: true
  - command: "go test -race ./..."
    name: Race
    required: false
```

## 失败处理策略

### Retry Policy

```
max_retries: 3
retry_strategy:
  attempt_1: 直接修复错误
  attempt_2: 修复 + 分析是否有更深层原因
  attempt_3: 考虑替代方案（不同实现路径）
  beyond_3: BLOCKED → 请求人工介入
```

### 失败严重度

| 严重度 | 示例 | 处理 |
|--------|------|------|
| CRITICAL | 编译失败, 核心测试失败 | 必须立即修复 |
| HIGH | 新功能测试失败 | 修复后继续 |
| MEDIUM | Lint warning, 覆盖率下降 | 记录，不阻塞 |
| LOW | 风格偏好 | 忽略 |

## 验证超时

| 检查类型 | 超时 | 超时处理 |
|---------|------|---------|
| TypeCheck | 60s | 可能有循环类型，检查 |
| Lint | 30s | 正常 |
| Unit Tests | 120s | 可能有死循环/无限等待 |
| E2E Tests | 300s | 网络/服务启动慢 |
| Build | 180s | 大项目正常 |
