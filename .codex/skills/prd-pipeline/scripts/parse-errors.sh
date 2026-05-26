#!/usr/bin/env bash
# parse-errors.sh — 解析验证命令的错误输出，提取结构化信息
# 用法: echo "error output" | ./parse-errors.sh
# 或: ./parse-errors.sh < error_log.txt

set -uo pipefail

echo "═══════════════════════════════════"
echo " Error Analysis"
echo "═══════════════════════════════════"
echo ""

error_count=0
while IFS= read -r line; do
    # TypeScript errors: src/file.ts(10,5): error TS2304
    if [[ "$line" =~ ([^[:space:]]+)\(([0-9]+),([0-9]+)\):\ error\ (TS[0-9]+):\ (.*) ]]; then
        ((error_count++))
        echo "[$error_count] TypeScript Error"
        echo "  File: ${BASH_REMATCH[1]}"
        echo "  Line: ${BASH_REMATCH[2]}, Col: ${BASH_REMATCH[3]}"
        echo "  Code: ${BASH_REMATCH[4]}"
        echo "  Message: ${BASH_REMATCH[5]}"
        echo ""
    # ESLint errors: /path/file.ts:10:5 error message rule-name
    elif [[ "$line" =~ ([^[:space:]]+):([0-9]+):([0-9]+)\ +(error|warning)\ +(.+)\ +([a-z/@-]+)$ ]]; then
        ((error_count++))
        echo "[$error_count] ESLint ${BASH_REMATCH[4]^}"
        echo "  File: ${BASH_REMATCH[1]}"
        echo "  Line: ${BASH_REMATCH[2]}, Col: ${BASH_REMATCH[3]}"
        echo "  Rule: ${BASH_REMATCH[6]}"
        echo "  Message: ${BASH_REMATCH[5]}"
        echo ""
    # Python errors: File "path", line N
    elif [[ "$line" =~ File\ \"([^\"]+)\",\ line\ ([0-9]+) ]]; then
        ((error_count++))
        echo "[$error_count] Python Error"
        echo "  File: ${BASH_REMATCH[1]}"
        echo "  Line: ${BASH_REMATCH[2]}"
        echo ""
    # Jest/Vitest test failures: FAIL src/file.test.ts
    elif [[ "$line" =~ ^[[:space:]]*FAIL[[:space:]]+(.+) ]]; then
        ((error_count++))
        echo "[$error_count] Test Failure"
        echo "  File: ${BASH_REMATCH[1]}"
        echo ""
    # Generic error lines with file:line pattern
    elif [[ "$line" =~ (error|Error|ERROR) ]] && [[ "$line" =~ ([^[:space:]]+):([0-9]+) ]]; then
        ((error_count++))
        echo "[$error_count] Error"
        echo "  Location: ${BASH_REMATCH[1]}:${BASH_REMATCH[2]}"
        echo "  Full: $line"
        echo ""
    fi
done

if [ "$error_count" -eq 0 ]; then
    echo "No structured errors detected in input."
    echo "Raw input may contain unrecognized error format."
fi

echo "═══════════════════════════════════"
echo " Total errors found: $error_count"
echo "═══════════════════════════════════"
