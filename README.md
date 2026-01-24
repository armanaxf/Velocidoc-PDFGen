# Velocidoc PDF Generator

A high-performance PDF generation API that transforms Word templates (DOCX) into professional PDFs with dynamic JSON data. Built for Power Automate, n8n, and enterprise automation workflows.

## Features

- **Word Template Engine** - Use familiar Microsoft Word for template design with Handlebars-style placeholders (`{{field_name}}`)
- **Image Injection** - Dynamically insert images, including in repeating sections/tables
- **Multiple Template Sources**:
  - Server-stored templates (`template_id`)
  - Inline templates via Base64 (`template` - BYOT mode)
  - Remote URLs (`template_url` - SharePoint, OneDrive, S3)
- **Template Validation** - Validate templates and extract placeholder fields before generation
- **Multi-tenant Support** - API key authentication with tenant isolation
- **Production Ready** - Rate limiting, CORS, security headers (Helmet)
- **Self-Hostable** - Run entirely on your infrastructure with Docker

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/velocidoc-pdfgen.git
cd velocidoc-pdfgen

# Create environment file
cp packages/api/.env.example packages/api/.env
# Edit .env and set your API_KEYS

# Start services
docker-compose up -d

# Test the health endpoint
curl http://localhost:8080/health
```

### Local Development

```bash
# Install dependencies
bun install

# Start Gotenberg (required for PDF conversion)
docker run -d -p 3001:3000 gotenberg/gotenberg:8

# Configure environment
export GOTENBERG_URL=http://localhost:3001
export AUTH_ENABLED=false  # Disable auth for development

# Start the API
cd packages/api
bun run dev
```

## API Usage

### Authentication

All API endpoints (except `/health`) require an API key when `AUTH_ENABLED=true`:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:8080/v1/templates
```

### Generate PDF from Server Template

```bash
curl -X POST http://localhost:8080/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "template_id": "invoice.docx",
    "output_format": "pdf",
    "data": {
      "customer_name": "Acme Corp",
      "invoice_date": "2024-01-15",
      "items": [
        { "description": "Widget A", "price": 10.00 },
        { "description": "Widget B", "price": 25.00 }
      ]
    }
  }' \
  --output invoice.pdf
```

### Generate PDF with Inline Template (BYOT)

Perfect for Power Automate where templates are stored in SharePoint:

```bash
curl -X POST http://localhost:8080/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "template": {
      "content": "<base64-encoded-docx>",
      "filename": "my-template.docx"
    },
    "output_format": "pdf",
    "data": {
      "customer_name": "Acme Corp"
    }
  }' \
  --output output.pdf
```

### Generate PDF from Remote URL

Fetch templates directly from SharePoint, OneDrive, or S3:

```bash
curl -X POST http://localhost:8080/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "template_url": "https://mycompany.sharepoint.com/sites/templates/invoice.docx?share=abc123",
    "output_format": "pdf",
    "data": {
      "customer_name": "Acme Corp"
    }
  }' \
  --output output.pdf
```

### Validate Template

Check template validity and discover placeholder fields:

```bash
curl -X POST http://localhost:8080/v1/templates/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "content": "<base64-encoded-docx>"
  }'
```

Response:
```json
{
  "valid": true,
  "fields": ["customer_name", "invoice_date", "items"],
  "errors": [],
  "warnings": []
}
```

### List Templates

```bash
curl -H "X-API-Key: your-api-key" http://localhost:8080/v1/templates
```

## Template Syntax

Velocidoc uses the [docx-templates](https://github.com/guigrpa/docx-templates) library. Templates are standard Word documents with Handlebars-style placeholders.

### Basic Placeholders

```
Hello {{customer_name}},

Your invoice date: {{invoice_date}}
```

### Loops (Repeating Sections)

For tables with dynamic rows:

```
| Description | Price |
|-------------|-------|
| {{#items}} |       |
| {{description}} | {{price}} |
| {{/items}} |       |
```

### Conditional Content

```
{{#if premium_member}}
Thank you for being a premium member!
{{/if}}
```

### Image Injection

Pass Base64-encoded images in your data:

```json
{
  "data": {
    "logo": {
      "_type": "image",
      "_data": "data:image/png;base64,iVBORw0KGgo...",
      "_width": 100,
      "_height": 50
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `HOST` | API server host | `0.0.0.0` |
| `GOTENBERG_URL` | Gotenberg service URL | `http://gotenberg:3000` |
| `AUTH_ENABLED` | Enable API key authentication | `true` |
| `API_KEYS` | Comma-separated valid API keys | `` |
| `API_KEY_HEADER` | Header name for API key | `X-API-Key` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `*` (all) |
| `RATE_LIMIT_MAX` | Max requests per time window | `100` |
| `RATE_LIMIT_WINDOW` | Rate limit time window | `1 minute` |
| `STORAGE_BACKEND` | Template storage: `local`, `s3`, `azure` | `local` |
| `TEMPLATES_DIR` | Local template directory | `./templates` |
| `MULTI_TENANT` | Enable per-tenant template isolation | `false` |

## Project Structure

```
velocidoc-pdfgen/
├── packages/
│   ├── api/                 # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── services/    # Business logic (Gotenberg, DOCX, validation)
│   │   │   ├── middleware/  # Auth, logging
│   │   │   └── storage/     # Template storage abstraction
│   │   ├── openapi.json     # OpenAPI 3.0 specification
│   │   └── Dockerfile
│   ├── shared/              # Shared types and schemas
│   └── n8n-nodes-pdf-gen/   # n8n custom node package
├── docker-compose.yml
└── spec.md                  # Project specification
```

## Integrations

### Power Automate

1. Download `packages/api/openapi.json`
2. In Power Automate, create a Custom Connector
3. Import the OpenAPI specification
4. Configure API key authentication
5. Use the connector in your flows

### n8n

1. Install the custom node package from `packages/n8n-nodes-pdf-gen`
2. Configure the node with your API URL and key
3. Use in your n8n workflows

## Development

### Running Tests

```bash
cd packages/api
bun test
```

### Building Docker Image

```bash
docker build -t velocidoc-api -f packages/api/Dockerfile .
```

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Power Automate │      │      n8n        │      │   Direct API    │
│  Custom Connector│      │  Custom Node    │      │     Client      │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │    Velocidoc API        │
                    │  (Fastify + Bun)        │
                    │                         │
                    │  • Rate Limiting        │
                    │  • API Key Auth         │
                    │  • Request Validation   │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │ Template       │ │ docx-templates │ │   Gotenberg    │
     │ Storage        │ │ (DOCX Engine)  │ │ (PDF Convert)  │
     │ (Local/S3/etc) │ │                │ │                │
     └────────────────┘ └────────────────┘ └────────────────┘
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request
