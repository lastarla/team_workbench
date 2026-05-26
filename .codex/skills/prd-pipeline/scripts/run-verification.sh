#!/usr/bin/env bash
# run-verification.sh — 运行项目验证命令（typecheck + lint + test）
# 用法: ./run-verification.sh [project-dir]
# 返回: 0=全部通过, 1=有失败

set -euo pipefail

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

PASS=0
FAIL=0
RESULTS=""

run_check() {
    local name="$1"
    local cmd="$2"
    
    echo "▶ Running: $name"
    if eval "$cmd" > /tmp/verify_output_$$ 2>&1; then
        RESULTS+="  ✅ $name: PASS\n"
        ((PASS++))
    else
        RESULTS+="  ❌ $name: FAIL\n"
        echo "    Error output:"
        head -20 /tmp/verify_output_$$ | sed 's/^/    /'
        ((FAIL++))
    fi
    rm -f /tmp/verify_output_$$
}

echo "═══════════════════════════════════"
echo " Verification Pipeline"
echo "═══════════════════════════════════"
echo ""

# Detect project type and run appropriate checks
if [ -f "package.json" ]; then
    # Node.js / TypeScript project
    if grep -q '"typecheck"' package.json 2>/dev/null; then
        run_check "TypeCheck" "npm run typecheck"
    elif grep -q '"tsc"' package.json 2>/dev/null || [ -f "tsconfig.json" ]; then
        run_check "TypeCheck" "npx tsc --noEmit"
    fi
    
    if grep -q '"lint"' package.json 2>/dev/null; then
        run_check "Lint" "npm run lint"
    elif [ -f ".eslintrc*" ] || grep -q '"eslint"' package.json 2>/dev/null; then
        run_check "Lint" "npx eslint . --ext .ts,.tsx,.js,.jsx"
    fi
    
    if grep -q '"test"' package.json 2>/dev/null; then
        run_check "Test" "npm test"
    fi

elif [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
    # Python project
    if command -v mypy &>/dev/null && [ -f "mypy.ini" -o -f "pyproject.toml" ]; then
        run_check "TypeCheck" "mypy ."
    fi
    
    if command -v ruff &>/dev/null; then
        run_check "Lint" "ruff check ."
    elif command -v flake8 &>/dev/null; then
        run_check "Lint" "flake8 ."
    fi
    
    if command -v pytest &>/dev/null; then
        run_check "Test" "pytest"
    fi

elif [ -f "Cargo.toml" ]; then
    # Rust project
    run_check "TypeCheck" "cargo check"
    run_check "Lint" "cargo clippy -- -D warnings"
    run_check "Test" "cargo test"

elif [ -f "go.mod" ]; then
    # Go project
    run_check "TypeCheck" "go vet ./..."
    if command -v golangci-lint &>/dev/null; then
        run_check "Lint" "golangci-lint run"
    fi
    run_check "Test" "go test ./..."
fi

echo ""
echo "═══════════════════════════════════"
echo " Results"
echo "═══════════════════════════════════"
echo -e "$RESULTS"
echo "  Total: $((PASS + FAIL)) checks, $PASS passed, $FAIL failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "❌ VERIFICATION FAILED"
    exit 1
else
    echo "✅ ALL CHECKS PASSED"
    exit 0
fi
