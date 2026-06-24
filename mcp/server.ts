import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerTaskTools } from './tools/tasks'
import { registerCategoryTools } from './tools/categories'
import { registerCompletedTaskTools } from './tools/completed'
import { registerTimeRecordTools } from './tools/time-records'
import { registerWeeklyPlanTools } from './tools/weekly-plan'
import { registerTimetableTools } from './tools/timetable'
import { registerUserInfoTools } from './tools/user-info'
import { registerCompoundTools } from './tools/compound'

const server = new McpServer({
  name: 'academic-dashboard',
  version: '1.0.0',
})

registerTaskTools(server)
registerCategoryTools(server)
registerCompletedTaskTools(server)
registerTimeRecordTools(server)
registerWeeklyPlanTools(server)
registerTimetableTools(server)
registerUserInfoTools(server)
registerCompoundTools(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Academic Dashboard MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
