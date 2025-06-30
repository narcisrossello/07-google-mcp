import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "dotenv/config";
import { google } from "googleapis";
import { setupCalendarTools } from "./calendar-tools.js";
import { GOOGLE_CONFIG } from "./env";
import { setupTasksTools } from "./tasks-tool.js";

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CONFIG.CLIENT_ID,
  GOOGLE_CONFIG.CLIENT_SECRET,
  "http://localhost"
);


async function authenticate() {
  oauth2Client.setCredentials({    access_token: GOOGLE_CONFIG.ACCESS_TOKEN,
    refresh_token: GOOGLE_CONFIG.REFRESH_TOKEN,
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
    token_type: "Bearer",
    expiry_date: GOOGLE_CONFIG.EXPIRY_DATE,
  });
}

await authenticate();

const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const tasksClient = google.tasks({ version: "v1", auth: oauth2Client });

const server = new McpServer({
  name: "Google Calendar MCP",
  version: "1.0.0"
});

setupCalendarTools(server, calendar);

setupTasksTools(server, tasksClient);



const transport = new StdioServerTransport();
await server.connect(transport);
