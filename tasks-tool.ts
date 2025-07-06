import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tasks_v1 } from "googleapis";
import { z } from "zod";

function formatTaskAsText(task: tasks_v1.Schema$Task): string {
  return `${task.title}${task.notes ? `\n${task.notes}` : ''}${task.due ? `\nDue: ${task.due}` : ''}`;
}

export function setupTasksTools(server: McpServer, tasks: tasks_v1.Tasks) {
  // Tool to retrieve the user's task lists
  server.tool(
    'get_tasklists',
    'Retrieves the user\'s task lists',
    {},
    async () => {
      try {
        const response = await tasks.tasklists.list();
        const taskLists = response.data.items || [];
        
        if (taskLists.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No task lists found."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(taskLists, null, 2)
          }],
          structuredContent: {
            tasklists: taskLists
          }
        };
      } catch (error) {
        console.error("Error retrieving task lists:", error);
        return {
          content: [{
            type: "text",
            text: "Error retrieving task lists: " + (error instanceof Error ? error.message : String(error))
          }],
          isError: true
        };
      }
    }
  );

  // Tool to list tasks from a specific task list or the default task list
  server.tool(
    'list_tasks',
    'Lists all tasks from the user\'s default task list or a specified task list',
    {
      taskListId: z.string().describe('The id of the task list to retrieve tasks from').optional(),
    },
    async ({ taskListId }) => {
      try {
        let selectedTaskListId: string | undefined = taskListId;

        if (!selectedTaskListId) {
          const tasklist = await tasks.tasklists.list();
          const defaultTaskList = tasklist.data.items?.[0];
          if (!defaultTaskList) {
            return {
              content: [{
                type: "text",
                text: "No task lists found."
              }]
            };
          }
          selectedTaskListId = defaultTaskList.id!;
        }

        const response = await tasks.tasks.list({
          tasklist: selectedTaskListId,
          showCompleted: true,
        });

        const taskItems = response.data.items || [];
        
        return {
          content: [{
            type: "text",
            text: taskItems.length > 0 
              ? JSON.stringify(taskItems, null, 2)
              : "No tasks found."
          }],
          structuredContent: {
            tasks: taskItems
          }
        };
      } catch (error) {
        console.error("Error listing tasks:", error);
        return {
          content: [{
            type: "text",
            text: "Error listing tasks: " + (error instanceof Error ? error.message : String(error))
          }],
          isError: true
        };
      }
    }
  );

  // Tool to add a new task to the user's default task list or a specified task list
  server.tool(
    'add_task',
    'Adds a new task to the user\'s default task list',
    {
      title: z.string().describe('The title of the task'),
      notes: z.string().optional().describe('Optional notes for the task'),
      due: z.string().optional().describe('Optional due date in RFC 3339 format (e.g. 2024-12-31T23:59:59Z)'),
      taskListId: z.string().describe('The ID of the task list to add the task to. If not provided, the default task list will be used.')
    },
    async ({ title, notes, due, taskListId }) => {
      try {
        const task = await tasks.tasks.insert({
          tasklist: taskListId,
          requestBody: {
            title,
            notes,
            due
          }
        });

        return {
          content: [{
            type: "text",
            text: `Task created: ${formatTaskAsText(task.data)}`
          }],
          structuredContent: {
            task: task.data
          }
        };
      } catch (error) {
        console.error("Error adding task:", error);
        return {
          content: [{
            type: "text",
            text: "Error adding task: " + (error instanceof Error ? error.message : String(error))
          }],
          isError: true
        };
      }
    }
  );

  // Tool to complete a task by its ID
  server.tool(
    'complete_task',
    'Marks a task as completed',
    {
      taskId: z.string().describe('The ID of the task to complete'),
      taskListId: z.string().describe('The ID of the task list containing the task. If not provided, the default task list will be used.')
    },
    async ({ taskId, taskListId }) => {
      try {
        const task = await tasks.tasks.patch({
          tasklist: taskListId,
          task: taskId,
          requestBody: {
            status: "completed",
            completed: new Date().toISOString()
          }
        });

        return {
          content: [{
            type: "text",
            text: `Task completed: ${formatTaskAsText(task.data)}`
          }],
          structuredContent: {
            task: task.data
          }
        };
      } catch (error) {
        console.error("Error completing task:", error);
        return {
          content: [{
            type: "text",
            text: "Error completing task: " + (error instanceof Error ? error.message : String(error))
          }],
          isError: true
        };
      }
    }
  );

  // Tool to update an existing task
  server.tool(
    'update_task',
    'Updates an existing task. To remove the due date, pass an empty string for "due".',
    {
      taskId: z.string().describe('The ID of the task to update'),
      title: z.string().optional().describe('The new title of the task'),
      notes: z.string().optional().describe('Optional new notes for the task'),
      due: z.string().optional().describe('Optional new due date in RFC 3339 format (e.g. 2024-12-31T23:59:59Z). To remove the due date, pass an empty string.'),
      taskListId: z.string().describe('The ID of the task list to update the task in')
    },
    async ({ taskId, title, notes, due, taskListId }) => {
      try {
        // If due is an empty string, explicitly set it to null to remove it
        const requestBody: Record<string, any> = {};
        if (typeof title !== "undefined") requestBody.title = title;
        if (typeof notes !== "undefined") requestBody.notes = notes;
        if (typeof due !== "undefined") {
          requestBody.due = due === "" ? null : due;
        }

        const updatedTask = await tasks.tasks.patch({
          tasklist: taskListId,
          task: taskId,
          requestBody
        });

        return {
          content: [{
            type: "text",
            text: `Task updated: ${formatTaskAsText(updatedTask.data)}`
          }],
          structuredContent: {
            task: updatedTask.data
          }
        };
      } catch (error) {
        console.error("Error updating task:", error);
        return {
          content: [{
            type: "text",
            text: "Error updating task: " + (error instanceof Error ? error.message : String(error))
          }],
          isError: true
        };
      }
    }
  );

  // Tool to reorder tasks in a task list
  server.tool(
    'reorder_tasks',
    'Reorders tasks in a task list based on their IDs. The order of the IDs determines the new order of the tasks.',
    {
      taskListId: z.string().describe('The ID of the task list to reorder tasks in'),
      taskIds: z.array(z.string()).describe('An array of task IDs in the desired order')
    },
    async ({ taskListId, taskIds }) => {
      try {
        // Move each task in order, setting the previous task as the "previous" parameter
        let previousTaskId: string | undefined = undefined;
        const reorderedTasks: tasks_v1.Schema$Task[] = [];
        for (const taskId of taskIds) {
          const response = await tasks.tasks.move({
            tasklist: taskListId,
            task: taskId,
            previous: previousTaskId
          });
          reorderedTasks.push(response.data);
          previousTaskId = taskId;
        }

        return {
          content: [{
            type: "text",
            text: `Tasks reordered successfully! New order: ${taskIds.join(', ')}`
          }],
          structuredContent: {
            reorderedTasks
          }
        };
      } catch (error) {
        console.error("Error reordering tasks:", error);
        return {
          content: [{
            type: "text",
            text: "Error reordering tasks: " + (error instanceof Error ? error.message : String(error))
          }],
          isError: true
        };
      }
    }
  );

  // Tool to delete a task from a specified task list by its ID
  server.tool(
    'delete_task',
    'Deletes a task from a specified task list by its ID.',
    {
      taskId: z.string().describe('The ID of the task to delete'),
      taskListId: z.string().describe('The ID of the task list containing the task')
    },
    async ({ taskId, taskListId }) => {
      try {
        await tasks.tasks.delete({
          tasklist: taskListId,
          task: taskId
        });

        return {
          content: [{
            type: "text",
            text: `✅ Task with ID "${taskId}" deleted successfully!`
          }]
        };
      } catch (error) {
        console.error("Error deleting task:", error);
        return {
          content: [{
            type: "text",
            text: "Error deleting task: " + (error instanceof Error ? error.message : String(error))
          }],
          isError: true
        };
      }
    }
  );

  // Tool to create a new task list with the specified title
  server.tool(
    'create_tasklist',
    'Creates a new task list with the specified title.',
    {
      title: z.string().describe('The title of the new task list')
    },
    async ({ title }) => {
      try {
        const taskList = await tasks.tasklists.insert({
          requestBody: {
            title
          }
        });

        return {
          content: [{
            type: "text",
            text: `Task list created: ${taskList.data.title}`
          }],
          structuredContent: {
            tasklist: taskList.data
          }
        };
      } catch (error) {
        console.error("Error creating task list:", error);
        return {
          content: [{
            type: "text",
            text: "Error creating task list: " + (error instanceof Error ? error.message : String(error))
          }],
          isError: true
        };
      }
    }
  );
}