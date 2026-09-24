#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createClient } from './client.js';
import {
  listTemplates,
  createProject,
  setText,
  addElement,
  generateImage,
  exportPdf,
  createQuoteCard,
  listBorderTemplates,
  addBorderFrame,
} from './tools.js';

const client = createClient();

const server = new McpServer({ name: 'wisdom-studio', version: '1.0.0' });

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const errorResult = (err) => ({ content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true });

server.registerTool(
  'list_templates',
  {
    title: 'List design templates',
    description: 'List the starter templates Wisdom Studio offers (blank canvas, flyer, storybook page, coloring page, quote card, document, newsletter, workbook, certificate, social media post, invitation, brochure).',
  },
  async () => {
    try {
      return text(listTemplates());
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'create_project',
  {
    title: 'Create a Wisdom Studio project',
    description: 'Create a new Wisdom Studio design project, optionally seeded from a template (see list_templates). Returns the created project, including its id.',
    inputSchema: {
      name: z.string().optional().describe('Project name. Defaults to a name based on the template.'),
      templateKey: z.string().optional().describe('Template key from list_templates, e.g. "quote-card". Defaults to a blank canvas.'),
      pageSize: z
        .enum(['letter', 'a4', 'letter-landscape', 'social-square'])
        .optional()
        .describe('Physical page size. Defaults to US Letter.'),
    },
  },
  async (args) => {
    try {
      return text(await createProject(client, args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'set_text',
  {
    title: 'Set a text element’s content',
    description: 'Set the text content of a named element on a project page (e.g. the "Quote" or "Attribution" element on a quote-card, or "Headline" on a flyer). Use get result from create_project or the project itself to see element names.',
    inputSchema: {
      projectId: z.string(),
      elementName: z.string().describe('The element’s "name" field, e.g. "Quote", "Headline", "Details".'),
      text: z.string(),
      pageIndex: z.number().int().min(0).optional().describe('Defaults to 0 (the first page).'),
    },
  },
  async (args) => {
    try {
      return text(await setText(client, args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'add_element',
  {
    title: 'Add an element to a page',
    description: 'Add a new text, rectangle, ellipse, or image-placeholder element to a project page, for building layouts beyond what a template provides.',
    inputSchema: {
      projectId: z.string(),
      pageIndex: z.number().int().min(0).optional(),
      element: z
        .object({
          type: z.enum(['text', 'rect', 'ellipse', 'image-placeholder']),
          name: z.string().optional(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          text: z.string().optional(),
          fontSize: z.number().optional(),
          align: z.enum(['left', 'center', 'right']).optional(),
          fill: z.string().optional(),
          stroke: z.string().optional(),
          strokeWidth: z.number().optional(),
          label: z.string().optional(),
        })
        .describe('The element to add. Position/size are in 96dpi pixels on an 816x1056 (Letter) or 794x1123 (A4) page.'),
    },
  },
  async (args) => {
    try {
      return text(await addElement(client, args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'generate_image',
  {
    title: 'Generate an AI image for a placeholder',
    description:
      'Generate an image via AI Horde and place it into a named image-placeholder element. Submits the job, polls until it completes, and updates the project — this call blocks until the image is ready or the timeout is reached. The finished image is embedded in the project so it stays valid after the AI Horde link expires.',
    inputSchema: {
      projectId: z.string(),
      elementName: z.string().describe('The image-placeholder element’s "name" field, e.g. "Complementary image".'),
      prompt: z.string(),
      pageIndex: z.number().int().min(0).optional(),
      style: z.enum(['general', 'storybook', 'flyer', 'coloring-page']).optional().describe('Style/prompt-engineering preset. Defaults to "general".'),
      printQuality: z.boolean().optional().describe('Higher resolution + upscale, for the final print file. Slower. Defaults to false.'),
      referenceImage: z
        .string()
        .optional()
        .describe('Optional img2img reference for style/composition: a local image file path, an http(s) URL, or a data URI.'),
      referenceStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Only with referenceImage. 1 = stay very close to the reference, 0 = only loosely inspired. Defaults to 0.35.'),
      timeoutMs: z.number().int().positive().optional().describe('Max time to wait, in ms. Defaults to 180000 (3 minutes).'),
    },
  },
  async (args) => {
    try {
      return text(await generateImage(client, { ...args, mode: args.style }));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'list_border_templates',
  {
    title: 'List border/frame templates',
    description:
      'List decorative border/frame images from the shared border library, optionally filtered by mood/style tag (e.g. "cozy", "gothic", "cute") or brand. Any asset type — quote cards, workbooks, coloring pages, flyers — can use these via add_border_frame.',
    inputSchema: {
      tag: z.string().optional().describe('Filter to borders with this mood/style tag, e.g. "cozy" or "gothic".'),
      brand: z.string().optional().describe('Filter to borders associated with this brand id.'),
    },
  },
  async (args) => {
    try {
      return text(await listBorderTemplates(client, args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'add_border_frame',
  {
    title: 'Add a border/frame to a page',
    description:
      'Place a border/frame image from the shared library (see list_border_templates) as a locked, full-page background behind the page\'s existing elements.',
    inputSchema: {
      projectId: z.string(),
      borderId: z.string().describe('The border\'s "id" field from list_border_templates, e.g. "sample-cozy".'),
      pageIndex: z.number().int().min(0).optional().describe('Defaults to 0 (the first page).'),
    },
  },
  async (args) => {
    try {
      return text(await addBorderFrame(client, args));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'export_pdf',
  {
    title: 'Export a project to a print-ready PDF',
    description: 'Render a project to a real, vector PDF file on disk and return its path. This is the "final product" step — call it once the project’s content is finished.',
    inputSchema: {
      projectId: z.string(),
      outputPath: z.string().optional().describe('Absolute file path to write the PDF to. Defaults to a timestamped file in the system temp directory.'),
    },
  },
  async (args) => {
    try {
      return text(await exportPdf(client, { ...args, writeFile }));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'create_quote_card',
  {
    title: 'Create a finished quote card with a matching image',
    description:
      'One-call composite tool: creates a quote-card project, sets the quote and attribution text, generates a complementary AI image, and exports a finished PDF. This is the fastest path to "make me a quote card" — use the granular tools instead only when you need more control.',
    inputSchema: {
      quote: z.string().describe('The quote text.'),
      author: z.string().optional().describe('Attribution, e.g. "Maya Angelou". Rendered as "— Author".'),
      imagePrompt: z.string().optional().describe('Prompt for the complementary image. If omitted, one is derived from the quote.'),
      style: z.enum(['general', 'storybook', 'flyer', 'coloring-page']).optional().describe('Image style preset. Defaults to "general".'),
      pageSize: z.enum(['letter', 'a4']).optional(),
      printQuality: z.boolean().optional().describe('Higher resolution image for print. Slower. Defaults to false.'),
      outputPath: z.string().optional().describe('Where to write the finished PDF. Defaults to a system temp file.'),
      timeoutMs: z.number().int().positive().optional().describe('Max time to wait for image generation. Defaults to 180000 (3 minutes).'),
    },
  },
  async (args) => {
    try {
      return text(await createQuoteCard(client, { ...args, writeFile }));
    } catch (err) {
      return errorResult(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
