/**
 * spec-quality-check — 自动检查 SPEC 产物质量
 * 仅在 phase_1 (SPEC.md) 时检查是否包含验收标准
 */

module.exports = {
  name: 'spec-quality-check',

  async onGate(ctx) {
    if (ctx.phase !== 'phase_1') return null

    if (!ctx.artifactContent) return null

    const hasAcceptanceCriteria =
      ctx.artifactContent.includes('验收标准') ||
      ctx.artifactContent.includes('Acceptance Criteria')

    if (!hasAcceptanceCriteria) {
      return {
        result: 'REJECTED',
        feedback: 'SPEC.md 缺少验收标准章节，请补充明确的验收标准'
      }
    }

    return null
  }
}
