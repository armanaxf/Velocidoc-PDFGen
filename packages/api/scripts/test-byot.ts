/**
 * Quick test script for BYOT and validation endpoints
 */

import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    // Read the invoice template
    const templatePath = resolve(__dirname, "../templates/invoice.docx");
    const templateBuffer = await readFile(templatePath);
    const templateBase64 = templateBuffer.toString("base64");

    console.log("📄 Template loaded:", templatePath);
    console.log("📊 Size:", templateBuffer.length, "bytes");
    console.log("📊 Base64 length:", templateBase64.length, "chars");

    // Import and start server
    const { buildServer } = await import("../src/server.ts");
    const server = await buildServer();

    console.log("\n🔍 Testing /v1/templates/validate...");
    const validateResponse = await server.inject({
        method: "POST",
        url: "/v1/templates/validate",
        payload: {
            content: templateBase64,
            data: {
                company_name: "Test Corp",
                items: [{ description: "Test", quantity: 1, rate: 100, amount: 100 }]
            }
        },
        headers: { "Content-Type": "application/json" },
    });

    console.log("Status:", validateResponse.statusCode);
    const validateResult = validateResponse.json();
    console.log("Valid:", validateResult.valid);
    console.log("Fields found:", validateResult.fields);
    if (validateResult.warnings) {
        console.log("Warnings:", validateResult.warnings);
    }

    console.log("\n📝 Testing /v1/generate with BYOT (DOCX output)...");
    // Use the exact fields from the template validation
    const generateResponse = await server.inject({
        method: "POST",
        url: "/v1/generate",
        payload: {
            template: {
                content: templateBase64,
                filename: "invoice.docx"
            },
            output_format: "docx",
            data: {
                company_name: "BYOT Test Corp",
                client_name: "Customer Inc",
                client_email: "customer@example.com",
                invoice_number: "BYOT-001",
                invoice_date: "2026-01-24",
                due_date: "2026-02-24",
                items: [
                    { description: "BYOT Test Service", quantity: 10, rate: 50, amount: 500 },
                    { description: "Another Service", quantity: 5, rate: 100, amount: 500 }
                ],
                subtotal: 1000,
                tax_amount: 100,
                total: 1100,
                notes: "Thank you for testing BYOT!"
            }
        },
        headers: { "Content-Type": "application/json" },
    });

    console.log("Status:", generateResponse.statusCode);
    console.log("Content-Type:", generateResponse.headers["content-type"]);
    console.log("Content-Disposition:", generateResponse.headers["content-disposition"]);
    console.log("Response size:", generateResponse.rawPayload.length, "bytes");

    if (generateResponse.statusCode === 200) {
        console.log("\n✅ BYOT generation successful!");
    } else {
        console.log("\n❌ BYOT generation failed:", generateResponse.json());
    }

    await server.close();
}

main().catch(console.error);
