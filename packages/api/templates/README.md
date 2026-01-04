# Sample DOCX Template Instructions

To test the PDF generation, you need to create a Word document with Handlebars-style placeholders.

## Quick Start

1. Open Microsoft Word (or Google Docs → download as .docx)
2. Create a document with the following content:

```
                        INVOICE
                    
Company: {{company_name}}
Invoice #: {{invoice_number}}
Date: {{invoice_date}}
Due: {{due_date}}

Bill To:
{{client_name}}
{{client_email}}
{{client_address}}

---

Items:
(For each item in the items array, use docx-templates loop syntax)

---

Subtotal: ${{subtotal}}
Tax ({{tax_rate}}%): ${{tax_amount}}
TOTAL: ${{total}}

Notes: {{notes}}
```

3. Save as `invoice.docx` in this folder

## Handlebars Tags Supported

- `{{variable}}` - Simple text replacement
- `{{#each items}}...{{/each}}` - Loop through arrays (Phase 2)
- `{{#if condition}}...{{/if}}` - Conditional content (Phase 2)

## Testing

Once you have the template:

```bash
# Start the API
cd ../..
bun run dev:api

# In another terminal, with Gotenberg running:
curl -X POST http://localhost:3000/v1/generate \
  -H "Content-Type: application/json" \
  -d @../../test.json \
  --output invoice.pdf
```
