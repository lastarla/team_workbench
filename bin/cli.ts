#!/usr/bin/env npx tsx
import { parseArgs } from 'node:util'
import { startServer } from '../server/index.js'

const { values } = parseArgs({
  options: {
    port: { type: 'string', short: 'p', default: '9527' },
    vault: { type: 'string', short: 'v', default: '' },
    help: { type: 'boolean', short: 'h', default: false }
  }
})

if (values.help) {
  console.log(`
Team Workbench — AI Native 可视化开发工作台

用法: team-workbench [选项]

选项:
  -p, --port <port>   服务端口 (默认: 9527)
  -v, --vault <path>  vault 数据目录 (默认: ~/.team-workbench)
  -h, --help          显示帮助

示例:
  team-workbench                    # 默认端口 9527 启动
  team-workbench -p 8080            # 指定端口
  team-workbench -v ./my-vault      # 指定数据目录
`)
  process.exit(0)
}

const port = parseInt(values.port || '9527')
const vault = values.vault || `${process.env.HOME}/.team-workbench`

process.env.PORT = String(port)
process.env.VAULT_ROOT = vault

startServer(port)
