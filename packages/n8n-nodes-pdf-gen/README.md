# n8n-nodes-pdf-gen

Custom n8n node for [Velocidoc PDF Generator](https://github.com/armanaxf/Velocidoc-PDFGen).

## Installation

### Using npm link (Development)
```bash
cd packages/n8n-nodes-pdf-gen
npm install
npm run build
npm link

# In your n8n installation directory
npm link n8n-nodes-pdf-gen
```

### Manual Installation
Copy the `dist` folder to your n8n custom nodes directory.

## Configuration

1. Add credentials in n8n: **Settings → Credentials → New Credential → Velocidoc API**
2. Enter your API URL (e.g., `http://localhost:3000`)
3. Enter your API Key (optional for self-hosted)

## Usage

### Generate Document
1. Drag the **Velocidoc PDF** node into your workflow.
2. Select **Generate Document** operation.
3. Enter the **Template ID** (e.g., `invoice.docx`).
4. Choose the **Output Format** (PDF or DOCX).
5. Provide **Data (JSON)** to merge into the template.

The generated file will be available as binary data.

### List Templates
Returns available templates from the API.
