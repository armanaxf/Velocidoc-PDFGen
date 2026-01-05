# Template Requirements for Repeating Rows

## The Issue
When using `officegen` to generate templates, the FOR and END-FOR commands end up in separate XML elements, breaking `docx-templates` parsing.

## Solution: Hand-Crafted Templates
Create templates manually in Microsoft Word with proper syntax.

## FOR Loop Syntax for docx-templates

In your Word document, use this syntax for repeating content:

### Simple Repeating Text
```
{{FOR item}}
  Name: {{this.name}}
  Description: {{this.description}}
{{END-FOR}}
```

### Repeating Table Rows
Create a table and in ONE cell, put the FOR loop that spans the entire row logic:

| Column 1 | Column 2 |
|----------|----------|
| `{{FOR item}}{{this.name}}` | `{{this.value}}{{END-FOR}}` |

**Important**: The FOR and END-FOR must be in text runs that `docx-templates` can logically pair.

### With Images
```
{{FOR item}}
  {{this.description}}
  {{IMAGE this.photo}}
{{END-FOR}}
```

## Providing Your Template

1. Create a `.docx` file in Microsoft Word
2. Add placeholders using `{{variableName}}` syntax
3. For loops, use `{{FOR arrayName}}...{{END-FOR}}`
4. For images, use `{{IMAGE fieldName}}` where the field contains a Base64 data URI
5. Place the template in `packages/api/templates/`

## Example Payload for Loops
```json
{
  "template_id": "your-template.docx",
  "output_format": "pdf",
  "data": {
    "items": [
      { "name": "Item 1", "photo": "data:image/png;base64,..." },
      { "name": "Item 2", "photo": "data:image/png;base64,..." }
    ]
  }
}
```
