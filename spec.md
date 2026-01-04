# SPEC.md: Project Velocidoc (formerly PDF Gen)
# SPEC.md: Unified PDF Generator Platform (Bun Edition)

## 1. Context & Scope
**Product Goal:** A high-performance, hybrid-hosted PDF generation API that bridges the gap between "No-Code" platforms (n8n, Power Automate) and "Pro-Code" requirements.

**Core Philosophy:**
* **Decoupled Design:** Data is separated from Design.
* **Hybrid Hosting:** SaaS for convenience, Self-Hosted (Docker) for privacy.
* **One API, Two Engines:** Supports both Word (Handlebars) and Web (HTML/CSS) templates via a unified payload.
* **Zero-Cost Capable:** Optimized for low-memory environments (Bun) to run on Free Tier infrastructure.

---

## 2. User Stories & Acceptance Criteria

### 2.1 The "n8n Automation Engineer"
* **Story:** As an n8n user, I want to generate an invoice with a dynamic table of 50 items without writing HTML/CSS code.
* **Acceptance:**
    * User drags a custom n8n node.
    * User selects "Design" and builds a template in a visual web editor.
    * User passes a JSON array of items to the node.
    * Output is a PDF with a properly formatted table spanning multiple pages.

### 2.2 The "Power Automate Enterprise User"
* **Story:** As a corporate user, I want to use Microsoft Word to design a contract and fill it with data from SharePoint, including site inspection photos.
* **Acceptance:**
    * User designs \`.docx\` file with standard Handlebars tags \`{{client_name}}\`.
    * User inserts a placeholder image in a table row for inspection photos.
    * User triggers flow; the system replaces the placeholder with the actual image from the data payload.

### 2.3 The "Self-Hoster"
* **Story:** As a privacy-focused developer, I want to run this entire stack on my own server so no customer data leaves my network.
* **Acceptance:**
    * User runs \`docker-compose up\`.
    * Service is available at \`localhost:3000\`.
    * No external API calls are made to the SaaS cloud.

---

## 3. System Architecture

### 3.1 Stack (Bun Edition)
* **Runtime:** Bun (v1.1+).
* **Framework:** Fastify (Works natively with Bun).
* **PDF Engine:** Gotenberg (Headless Chromium + LibreOffice) running in a sidecar container.
* **Word Engine:** \`docx-templates\` (Node.js/Bun library) for image replacement and logic.
* **Testing:** \`bun:test\` (Built-in, replaces Jest).
* **Docker Base:** \`oven/bun:alpine\` (Tiny, secure image).

### 3.2 Component Diagram
\`\`\`mermaid
graph TD
    Client[Client (n8n / Power Automate)] -->|POST /generate| API[Bun API Gateway]
    API -->|1. Fetch Template| Storage[Template Storage]
    API -->|2. Process Logic| Processor{Engine Selector}
    
    Processor -- Word Mode --> DocxEngine[docx-templates Lib]
    Processor -- Web Mode --> HtmlEngine[HTML Builder]
    
    DocxEngine -->|3. Convert to PDF| Gotenberg[Gotenberg Container]
    HtmlEngine -->|3. Render to PDF| Gotenberg
    
    Gotenberg -->|4. Return Binary| API
    API -->|5. Return PDF| Client
\`\`\`

---

## 4. Data Models & Schemas

### 4.1 The Universal Payload (TypeScript Interface)
The API accepts this standardized structure regardless of the engine used.

\`\`\`typescript
interface UniversalPayload {
  template_id: string;
  output_format: "pdf" | "docx" | "html";
  data: Record<string, any>; // The user's JSON data
  options?: {
    header_text?: string;
    watermark?: boolean;
    metadata?: Record<string, string>;
  };
}
\`\`\`

### 4.2 Template Definition (Stored internally)
\`\`\`json
{
  "id": "tpl_12345",
  "name": "Service Report",
  "engine": "word", 
  "source": "path/to/file.docx",
  "schema_map": {
    "items.img": { "type": "image", "width": 100, "height": 100 }
  }
}
\`\`\`

---

## 5. API Specification (Contract)

### POST \`/v1/generate\`
Generates the document.
* **Body:** See Universal Payload (4.1).
* **Response:** \`200 OK\` (Stream of PDF binary).

### POST \`/v1/templates\`
Uploads or creates a new template.
* **Body (Multipart):** \`.docx\` file OR JSON config.
* **Response:** \`{ "template_id": "tpl_555" }\`

### GET \`/v1/templates\`
Lists available templates (Used for Power Automate Dropdown).
* **Response:** \`[{ "id": "...", "name": "...", "required_fields": ["..."] }]\`

---

## 6. Self-Hosted Delivery (Docker)

The \`docker-compose.yml\` delivered to self-hosted users:

\`\`\`yaml
version: '3'
services:
  api:
    image: ghcr.io/yourname/pdf-api:latest
    environment:
      - GOTENBERG_URL=http://gotenberg:3000
    ports:
      - "8080:8080"
    depends_on:
      - gotenberg

  gotenberg:
    image: gotenberg/gotenberg:8
    command: 
      - "gotenberg"
      - "--api-port=3000"
      - "--api-timeout=30s"
\`\`\`

---

## 7. Implementation Plan (Phased)

### Phase 1: The Core Engine (Week 1)
* [x] Initialize Bun Monorepo.
* [x] Implement \`DocxService\`: Use \`docx-templates\` to take a generic Word doc + JSON and return a buffer.
* [x] Implement \`GotenbergService\`: HTTP wrapper to send that buffer to Gotenberg \`libreoffice/convert\` route.
* [x] **Milestone:** \`curl\` command sends JSON and gets a PDF back.

### Phase 2: Image Injection (Week 2)
* [ ] Implement "Base64 detection" logic in \`DocxService\`.
* [ ] Create "Repeating Row" logic for tables with images.
* [ ] **Milestone:** Generate an "Inspection Report" PDF with 10 images in a grid.

### Phase 3: The Integrations (Week 3)
* [ ] **n8n:** Create \`n8n-nodes-pdf-gen\` package.
* [ ] **Power Automate:** Create \`openapi.json\` for Custom Connector.
* [ ] **Milestone:** A user runs an n8n workflow that calls the API.

### Phase 4: The Web Builder (Week 4+)
* [ ] Create \`packages/web\`: React + Tailwind.
* [ ] Build "JSON-to-HTML" renderer.
* [ ] **Milestone:** User drags a "Text" block, types \`{{name}}\`, and the API renders it.

---

## 8. Constraint: Minimal Viable Cost (MVC)

### 8.1 Production Infrastructure (Zero Cost)
* **Orchestrator:** Coolify (Self-hosted PaaS) OR Azure Container Apps (Free Tier).
* **Rendering:** Gotenberg container.
* **API:** Bun Runtime (Low memory footprint).
* **Storage:** Cloudflare R2 (Free Tier) or Local Volume.

### 8.2 Fallback Strategy
If Azure Cold Starts (>10s) are unacceptable:
* Switch Rendering to **Fly.io** (Pay-as-you-go, scale-to-zero).
* Keep API on **Vercel** (Hobby Tier) or **Render.com).

---

## 9. Testing & Quality Assurance
**Strategy:** Hybrid Testing (Automated Logic + Visual Verification).

### 9.1 Automated Unit/Integration Tests (Bun Test)
* **Goal:** Verify input validation and template engine logic.
* **Tools:** \`bun:test\` (Native runner).
* **Test Cases:**
    * [x] \`POST /generate\` with missing data -> Returns 400.
    * [x] \`POST /generate\` with Word Template -> Returns PDF binary.
    * [ ] **Crucial:** Verify image injection replaces the Base64 string correctly in the Word XML.

### 9.2 Visual Verification (Agentic)
* **Goal:** Ensure the PDF *looks* right (not just valid binary).
* **Agent Task:** 1.  Generate a "Complex Invoice" PDF.
    2.  Open the PDF in the browser.
    3.  Verify the table has 50 rows.
    4.  Verify the image is not stretched (Aspect Ratio check).

---

## 10. Workflow & Governance
**Strict Guidelines for Development:**

### 10.1 GitHub First Logic
* **Everything is Git:** All changes must be committed and pushed to GitHub.
* **Tooling:** ALWAYS use the `github` MCP server for interactions (creating issues, PRs, comments).

### 10.2 Branching Strategy
* **Master/Main:** Protected. Production-ready code only.
* **Feature Branches:** Create for every new feature (e.g., `feat/image-injection`).
* **Fix Branches:** Create for bugs (e.g., `fix/template-error`).
* **Merges:** Performed ONLY after "Visual Verification" or passing unit tests.

### 10.3 Issue Tracking
* **Bugs:** Must be raised as GitHub Issues before fixing.
* **Tasks:** Defined in `task.md` but major features should have corresponding GitHub Issues/Projects.
