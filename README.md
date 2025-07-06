# 07-google-mcp

This project provides an implementation for integrating with Google MCP (Model Context Protocol), enabling inspection and execution of scripts related to the protocol.

## Project Contents

- `main.ts`: Main application file.
- `token_generation.js`: Script for generating the authentication token.
- Other configuration files and dependencies.

## Prerequisites

- Node.js installed on your machine.
- Access to the dependencies specified in the project.

## Token Generation

Before running the application, you must generate an authentication token. To do this, run the following command:

```bash
node token_generation.js
```

Follow the instructions in the console to obtain your token.

## Running Locally

Once the token has been generated, you can run the application locally with the following command:

```bash
npx -y @modelcontextprotocol/inspector npx -y tsx main.ts
```

This will start the application using the previously generated token.

## Notes

- Make sure the token is available and properly configured before running the application.
- Refer to the internal documentation for additional details on configuring and using the project.
