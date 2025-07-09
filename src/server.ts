import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const server = new McpServer({
  name: "mcp-streamable-http",
  version: "1.0.0",
});


const app = express();
app.use(express.json());

const transport: StreamableHTTPServerTransport =
  new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // set to undefined for stateless servers
  });

// Setup routes for the server
const setupServer = async () => {
  await server.connect(transport);
};

app.post("/mcp", async (req: Request, res: Response) => {
  console.log("Received MCP request:", req.body);
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  console.log("Received GET MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});
/* 
app.delete("/mcp", async (req: Request, res: Response) => {
  console.log("Received DELETE MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
}); */

// Compare two responses using Gemini
/* const compareResponsesWithGemini = server.tool(
  "compare-responses",
  "Compare two responses using Gemini AI",
  {
    responseA: z.string().describe("First response to compare"),
    responseB: z.string().describe("Second response to compare"),
  },
  async (params: { responseA: string; responseB: string }) => {
    const prompt = `
Compare the following two responses. Highlight the similarities and differences:

Response A: ${params.responseA}

Response B: ${params.responseB}
`;

    const geminiApiKey = "AIzaSyD83oAyLmHEnIj-emaz3CaciuniNoqYNDg";
    if (!geminiApiKey) {
      throw new Error("Gemini API key not found in environment variables.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await response.json();
    const geminiText = result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No comparison result from Gemini.";

    return {
      content: [
        {
          type: "text",
          text: geminiText,
        },
      ],
    };
  }
);
 */
// Read markdown files from estandares folder
const readEstandarFile = server.tool(
  "read-estandar-file",
  "Read the content of a markdown file from the estandares folder",
  {
    filename: z.string().describe("Name of the markdown file (with or without .md extension)"),
  },
  async (params: { filename: string }) => {
    try {
      // Ensure the filename has .md extension
      let filename = params.filename;
      if (!filename.endsWith('.md')) {
        filename += '.md';
      }

      // Construct the full path to the file
      const filePath = path.join(process.cwd(), 'estandares', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File '${filename}' not found in estandares folder.`);
      }

      // Read the file content
      const content = fs.readFileSync(filePath, 'utf-8');

      return {
        content: [
          {
            type: "text",
            text: `Content of ${filename}:\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: "text",
            text: `Error reading file: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Search for relevant standard files based on user query using Gemini
const searchRelevantStandards = server.tool(
  "search-relevant-standards",
  "Search for the most relevant standard files based on user query using Gemini AI",
  {
    userQuery: z.string().describe("User's query or message to find relevant standards"),
  },
  async (params: { userQuery: string }) => {
    try {
      // Get all .md files from estandares folder
      const estandaresPath = path.join(process.cwd(), 'estandares');
      
      if (!fs.existsSync(estandaresPath)) {
        throw new Error("Estandares folder not found.");
      }

      const files = fs.readdirSync(estandaresPath).filter(file => file.endsWith('.md'));
      
      if (files.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No standard files (.md) found in estandares folder.",
            },
          ],
        };
      }

      // Only use filenames for analysis
      const filesInfo = files.map(filename => `- ${filename}`).join('\n');

      const prompt = `
Analiza la siguiente consulta del usuario y determina qué archivos de estándares son más relevantes basándote únicamente en los nombres de los archivos:

Consulta del usuario: "${params.userQuery}"

Archivos disponibles:
${filesInfo}

Por favor, devuelve una respuesta en el siguiente formato JSON:
{
  "relevantFiles": [
    {
      "filename": "nombre_archivo.md",
      "relevanceScore": 0.95,
      "reason": "Explicación de por qué es relevante"
    }
  ],
  "summary": "Resumen de los archivos más relevantes encontrados"
}

Ordena los archivos por relevancia (score de 0.0 a 1.0) y solo incluye aquellos con score >= 0.3.
`;

      const geminiApiKey = "AIzaSyD83oAyLmHEnIj-emaz3CaciuniNoqYNDg";
      if (!geminiApiKey) {
        throw new Error("Gemini API key not found in environment variables.");
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      const result = await response.json();
      const geminiText = result.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No analysis result from Gemini.";

      // Try to parse JSON response from Gemini
      let analysisResult;
      try {
        // Extract JSON from Gemini response (in case it's wrapped in markdown)
        const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in Gemini response");
        }
      } catch (parseError) {
        // If JSON parsing fails, return raw Gemini response
        return {
          content: [
            {
              type: "text",
              text: `Gemini Analysis:\n${geminiText}`,
            },
          ],
        };
      }

      // Format the response with relevant files content
      let responseText = `## Archivos de estándares relevantes para: "${params.userQuery}"\n\n`;
      responseText += `${analysisResult.summary}\n\n`;

      if (analysisResult.relevantFiles && analysisResult.relevantFiles.length > 0) {
        responseText += "### Archivos encontrados:\n\n";
        
        for (const fileInfo of analysisResult.relevantFiles) {
          responseText += `**${fileInfo.filename}** (Relevancia: ${(fileInfo.relevanceScore * 100).toFixed(0)}%)\n`;
          responseText += `${fileInfo.reason}\n\n`;
          
          // Include content of highly relevant files
          if (fileInfo.relevanceScore >= 0.7) {
            try {
              const filePath = path.join(estandaresPath, fileInfo.filename);
              const content = fs.readFileSync(filePath, 'utf-8');
              responseText += `Contenido de ${fileInfo.filename}:\n\`\`\`\n${content}\n\`\`\`\n\n`;
            } catch (readError) {
              responseText += `Error al leer el contenido de ${fileInfo.filename}\n\n`;
            }
          }
        }
      } else {
        responseText += "No se encontraron archivos de estándares relevantes para su consulta.";
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: "text",
            text: `Error searching standards: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Start the server
const PORT = process.env.PORT || 3000;
setupServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to set up the server:", error);
    process.exit(1);
  });
