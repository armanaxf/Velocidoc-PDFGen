import { DocxService } from "./packages/api/src/services/docx.ts";

const service = new DocxService();

console.log("Attempting to render invoice.docx...");

try {
    const buffer = await service.render("invoice.docx", {
        company_name: "Debug Corp",
        invoice_number: "DBG-001",
        invoice_date: "2026-01-01",
        due_date: "2026-02-01",
        client_name: "Debug User",
        client_email: "debug@test.com",
        subtotal: 100,
        tax_amount: 10,
        total: 110,
        notes: "Debug Notes",
        // Adding tax_rate just in case it's in the template
        tax_rate: 8.25,
        items: [] // Adding items array just in case
    });
    console.log("Render successful! Buffer size:", buffer.length);
} catch (e) {
    console.error("Render failed:", e);
}
