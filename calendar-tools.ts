import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dayjs from "dayjs";
import { z } from "zod";

export function setupCalendarTools(server: McpServer, calendar: any) {
  // Tool to get events from the calendar for a specific date range
  server.tool(
    'get-events',
    'Get events from the calendar for a specific dates. By default, it retrieves events for the next 7 days.',
    {
      initialDate: z.string()
        .optional()
        .describe('Initial date in ISO format. Defaults to today if not provided.'),
      endDate: z.string()
        .optional()
        .describe('End date in ISO format. Defaults to 7 days from today if not provided.'),
    },
    async ({ initialDate, endDate }) => {
      const now = dayjs();
      const startOfWeek = initialDate
        ? dayjs(initialDate)
        : now;
      const endOfWeek = endDate
        ? dayjs(endDate)
        : now.add(7, 'day');

      const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: startOfWeek.toISOString(),
        timeMax: endOfWeek.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = (res.data.items || []).map(event => ({
        summary: event.summary || "(No title)",
        start: event.start?.dateTime || event.start?.date || "Missing",
        end: event.end?.dateTime || event.end?.date || "Missing",
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(events, null, 2),
          }
        ]
      };
    }
  );

  // Tool to create an all-day event or a timed event in the calendar
  server.tool(
    'create-all-day-event',
    'Create an all-day event in Google Calendar. Can be single or multiple days.',
    {
      summary: z.string().describe('Title of the event'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format. For multi-day events. If not provided, event will be one day'),
      description: z.string().optional().describe('Description of the event (optional)'),
      location: z.string().optional().describe('Location of the event (optional)'),
    },
    async ({ summary, startDate, endDate, description, location }) => {
      const event: any = {
        summary,
        start: { date: startDate },
        end: { date: endDate || dayjs(startDate).add(1, 'day').format('YYYY-MM-DD') },
      };

      if (description) event.description = description;
      if (location) event.location = location;

      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      const timeInfo = endDate
        ? `Del ${startDate} al ${endDate} (todo el día)`
        : `El día ${startDate} (todo el día)`;

      return {
        content: [
          {
            type: 'text',
            text: `✅ Event "${summary}" created successfully!\n${timeInfo}\nLink: ${res.data.htmlLink}`,
          }
        ]
      };
    }
  );

  // Tool to create a timed event with specific start and end times
  server.tool(
    'create-timed-event',
    'Create an event with specific start and end times in Google Calendar. Can span multiple days.',
    {
      summary: z.string().describe('Title of the event'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      startTime: z.string().describe('Start time in HH:mm format (24h)'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format. If different from start date, creates a multi-day event'),
      endTime: z.string().describe('End time in HH:mm format (24h)'),
      description: z.string().optional().describe('Description of the event (optional)'),
      location: z.string().optional().describe('Location of the event (optional)'),
    },
    async ({ summary, startDate, startTime, endDate, endTime, description, location }) => {
      const start = dayjs(`${startDate}T${startTime}`);
      const end = dayjs(`${endDate || startDate}T${endTime}`);

      const event: any = {
        summary,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      };

      if (description) event.description = description;
      if (location) event.location = location;

      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      const timeInfo = endDate
        ? `Del ${startDate} ${startTime} al ${endDate} ${endTime}`
        : `${startDate} de ${startTime} a ${endTime}`;

      return {
        content: [
          {
            type: 'text',
            text: `✅ Event "${summary}" created successfully!\n${timeInfo}\nLink: ${res.data.htmlLink}`,
          }
        ]
      };
    }
  );

  // Tool to delete an event by its ID
  server.tool(
    'delete-event',
    'Delete an event from Google Calendar by its ID.',
    {
      eventId: z.string().describe('The ID of the event to delete'),
    },
    async ({ eventId }) => {
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `✅ Event with ID "${eventId}" deleted successfully!`,
            }
          ]
        };
      } catch (error) {
        console.error("Error deleting event:", error);
        return {
          content: [
            {
              type: 'text',
              text: "Error deleting event: " + (error instanceof Error ? error.message : String(error)),
            }
          ],
          isError: true
        };
      }
    }
  );
}