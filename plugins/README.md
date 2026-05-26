# 插件开发规范

## 目录结构

```
plugins/
├── my-plugin/
│   ├── plugin.json    # 插件元信息（必须）
│   └── index.js       # 插件入口（必须）
```

## plugin.json

```json
{
  "name": "my-plugin",
  "description": "插件功能描述",
  "builtin": false
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 插件显示名称 |
| description | string | 功能描述 |
| builtin | boolean | 是否为预设插件（预设插件不可删除） |

## index.js 接口

```javascript
module.exports = {
  name: 'my-plugin',

  /**
   * Gate 审核钩子
   * @param {GateContext} ctx - 审核上下文
   * @returns {GateResult | null} - 返回 null 表示不干预，交给下一个插件
   */
  async onGate(ctx) {
    // ctx.project    - 项目名称
    // ctx.phase      - 阶段: phase_1 ~ phase_5
    // ctx.artifact   - 产物文件路径
    // ctx.artifactContent - 产物文件内容

    // 不干预，交给下一个插件或默认通过
    return null

    // 拦截并拒绝
    // return { result: 'REJECTED', feedback: '原因说明' }

    // 明确通过
    // return { result: 'APPROVED' }
  }
}
```

## 执行顺序

1. Gate API 收到请求后，按目录名字母序遍历所有插件
2. 跳过 `enabled: false` 的插件
3. 跳过不匹配当前项目的插件（`projects` 配置非空且不包含当前项目）
4. 第一个返回非 null 结果的插件决定最终结果
5. 所有插件都返回 null → 默认 `APPROVED`

## Phase 对应关系

| Phase | 产物文件 | 说明 |
|-------|----------|------|
| phase_1 | *SPEC.md | 需求规格 |
| phase_2 | *VALIDATION.md | 验证合约 |
| phase_3 | *TASKS.md | 任务分解 |
| phase_4 | *EVIDENCE.md | 实现证据 |
| phase_5 | *VERDICT.json | 最终裁决 |
