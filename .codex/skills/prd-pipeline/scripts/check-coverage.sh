#!/usr/bin/env bash
# check-coverage.sh — 检查测试覆盖率是否达标
# 用法: ./check-coverage.sh [threshold] [project-dir]
# threshold 默认 80（百分比）

set -uo pipefail

THRESHOLD="${1:-80}"
PROJECT_DIR="${2:-.}"

cd "$PROJECT_DIR"

echo "═══════════════════════════════════"
echo " Coverage Check (threshold: ${THRESHOLD}%)"
echo "═══════════════════════════════════"
echo ""

# Detect project type and run coverage
if [ -f "package.json" ]; then
    if grep -q '"coverage"' package.json 2>/dev/null; then
        npm run coverage -- --reporter=text 2>/dev/null | tail -20
    elif grep -q "vitest" package.json 2>/dev/null; then
        npx vitest run --coverage --reporter=text 2>/dev/null | tail -20
    elif grep -q "jest" package.json 2>/dev/null; then
        npx jest --coverage --coverageReporters=text 2>/dev/null | tail -20
    else
        echo "⚠️  No coverage command detected in package.json"
        echo "  Add a 'coverage' script or install vitest/jest with coverage support"
        exit 0
    fi
elif [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
    if command -v pytest &>/dev/null; then
        pytest --cov --cov-report=term-missing 2>/dev/null | tail -20
    fi
elif [ -f "Cargo.toml" ]; then
    if command -v cargo-tarpaulin &>/dev/null; then
        cargo tarpaulin --out Stdout 2>/dev/null | tail -10
    else
        echo "⚠️  Install cargo-tarpaulin for coverage: cargo install cargo-tarpaulin"
        exit 0
    fi
elif [ -f "go.mod" ]; then
    go test -coverprofile=coverage.out ./... 2>/dev/null
    go tool cover -func=coverage.out | tail -5
    rm -f coverage.out
fi

echo ""
echo "═══════════════════════════════════"
echo " Threshold: ${THRESHOLD}%"
echo " (Manual review needed for exact %)"
echo "═══════════════════════════════════"
