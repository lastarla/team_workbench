import { promises as fs } from 'fs'
import path from 'path'

const TEMPLATE_DIR = path.join(__dirname, 'template', 'skills')

export async function setupClaudeDir(project: string, localPath: string) {
  const claudeDir = path.join(localPath, '.claude')
  const hooksDir = path.join(claudeDir, 'hooks')
  const skillsDir = path.join(claudeDir, 'skills')

  await fs.mkdir(hooksDir, { recursive: true })
  await fs.mkdir(skillsDir, { recursive: true })

  // 1. Copy skills template
  await copyDir(TEMPLATE_DIR, skillsDir)

  // 2. Generate hooks.json
  const hooksJson = {
    hooks: {
      PostToolUse: [
        {
          matcher: "Write|Edit",
          command: `bash .claude/hooks/post-tool-use.sh "$CLAUDE_TOOL_ARG_FILE_PATH"`
        }
      ]
    }
  }
  await fs.writeFile(path.join(claudeDir, 'hooks.json'), JSON.stringify(hooksJson, null, 2))

  // 3. Generate post-tool-use.sh
  const port = process.env.PORT || '9527'
  const script = generateHookScript(project, port)
  const scriptPath = path.join(hooksDir, 'post-tool-use.sh')
  await fs.writeFile(scriptPath, script)
  await fs.chmod(scriptPath, 0o755)
}

function generateHookScript(projectId: string, port: string): string {
  return `#!/bin/bash
# .claude/hooks/post-tool-use.sh
# 由 Team Workbench 自动生成 — 请勿手动编辑

WORKBENCH="http://localhost:${port}/api/pipeline"
PROJECT_ID="${projectId}"

FILE_PATH="$1"

detect_phase() {
  case "$FILE_PATH" in
    *SPEC.md)       echo "phase_1" ;;
    *VALIDATION.md) echo "phase_2" ;;
    *TASKS.md)      echo "phase_3" ;;
    *EVIDENCE.md)   echo "phase_4" ;;
    *VERDICT.json)  echo "phase_5" ;;
    *)              echo "" ;;
  esac
}

PHASE=$(detect_phase)
[ -z "$PHASE" ] && exit 0

# 去重
LOCK="/tmp/.hook_done_\${PROJECT_ID}_\${PHASE}"
[ -f "$LOCK" ] && exit 0

# 调用工作台 Gate API（同步等待结果）
RESPONSE=$(curl -sf -X POST "$WORKBENCH/gate" \\
  -H "Content-Type: application/json" \\
  -d "{\\"project\\":\\"$PROJECT_ID\\",\\"phase\\":\\"$PHASE\\",\\"artifact\\":\\"$FILE_PATH\\"}" \\
  --max-time 600)

RESULT=$(echo "$RESPONSE" | jq -r '.result // "APPROVED"')

if [ "$RESULT" = "APPROVED" ]; then
  touch "$LOCK"
  exit 0
else
  FEEDBACK=$(echo "$RESPONSE" | jq -r '.feedback // "审核未通过"')
  echo "⚠️ $PHASE 审核未通过: $FEEDBACK" >&2
  exit 1
fi
`
}

async function copyDir(src: string, dest: string) {
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true })
      await copyDir(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}
