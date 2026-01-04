/**
 * Script to generate a sample invoice.docx template with placeholders
 * Run with: bun scripts/create-sample-template.ts
 */

import officegen from "officegen";
import * as fs from "fs";
import * as path from "path";

const docx = officegen("docx");

// Add title
const pTitle = docx.createP({ align: "center" });
pTitle.addText("INVOICE", { bold: true, font_size: 24 });

// Add blank line
docx.createP();

// Company info
const pCompany = docx.createP();
pCompany.addText("{{company_name}}", { bold: true, font_size: 14 });

// Invoice details
const pDetails = docx.createP();
pDetails.addText("Invoice #: {{invoice_number}}");
const pDate = docx.createP();
pDate.addText("Date: {{invoice_date}}");
const pDue = docx.createP();
pDue.addText("Due: {{due_date}}");

// Blank line
docx.createP();

// Bill To section
const pBillTo = docx.createP();
pBillTo.addText("Bill To:", { bold: true });
const pClient = docx.createP();
pClient.addText("{{client_name}}");
const pEmail = docx.createP();
pEmail.addText("{{client_email}}");

// Blank line
docx.createP();

// Totals section
const pSubtotal = docx.createP();
pSubtotal.addText("Subtotal: ${{subtotal}}");
const pTax = docx.createP();
pTax.addText("Tax: ${{tax_amount}}");
const pTotal = docx.createP();
pTotal.addText("TOTAL: ${{total}}", { bold: true, font_size: 14 });

// Notes
docx.createP();
const pNotes = docx.createP();
pNotes.addText("Notes: {{notes}}", { italic: true });

// Write the file
const outputPath = path.join(process.cwd(), "packages", "api", "templates", "invoice.docx");
const out = fs.createWriteStream(outputPath);

out.on("close", () => {
    console.log(`✅ Template created: ${outputPath}`);
});

out.on("error", (err) => {
    console.error("Error writing file:", err);
});

docx.generate(out);
