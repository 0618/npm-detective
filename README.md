# NPM Detective MCP Server

A Model Context Protocol (MCP) server that helps you find and analyze NPM packages using the [npms.io](https://npms.io/) API. It provides a "detective" view of packages by surfacing quality, popularity, and maintenance scores.

## Features

- **Search Packages**: Find packages by keyword with relevance scoring.
- **Deep Metadata**: Get detailed insights into a package, including its "score" breakdown (Quality, Popularity, Maintenance).

## Setup

### Prerequisites

- Node.js (v18 or higher)
- NPM

### Installation

1.  Clone this repository or navigate to the `npm-detective` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the server:
    ```bash
    npm run build
    ```

## Usage

### Quick Start (npx)

If you have published this to NPM, anyone can run it directly:

```json
{
  "mcpServers": {
    "npm-detective": {
      "command": "npx",
      "args": [
        "-y",
        "npm-detective"
      ]
    }
  }
}
```

### Local Execution (Manual)

You can run the server directly on stdio:
```bash
node dist/index.js
```

### Configuration (Claude Desktop)

To use this with Claude Desktop, add the following to your `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "npm-detective": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/mcp/week3/npm-detective/dist/index.js"
      ]
    }
  }
}
```
*Note: Replace `/ABSOLUTE/PATH/TO` with the real path to the project.*

## Tools

### 1. `search_packages`
Search for packages based on a query string.

- **Inputs**:
  - `query` (string): Keywords to search for (e.g., "react", "validation").
  - `size` (number, optional): Number of results to return (default: 10).
- **Output**: JSON list of packages with scores.

### 2. `get_package_metadata`
Get detailed metadata and evaluation scores for a specific package.

- **Inputs**:
  - `name` (string): The exact package name (e.g., "axios", "@types/node").
- **Output**: Detailed JSON object including publisher, license, and granular scores.

## Example Invocation

**User**: "Find me a good validation library for TypeScript."
**Model**: Calls `search_packages("validation typescript")`.
**User**: "tell me more about 'zod'."
**Model**: Calls `get_package_metadata("zod")` to see quality/maintenance scores.
