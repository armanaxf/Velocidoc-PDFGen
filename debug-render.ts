import { DocxService } from "./packages/api/src/services/docx.ts";

const service = new DocxService();

console.log("Attempting to render inspection.docx...");

try {
    const buffer = await service.render("inspection.docx", {
        items: [
            { description: "Item 1", photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
            { description: "Item 2", photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }
        ]
    });
    // Write output to verify
    const { writeFileSync } = await import("fs");
    writeFileSync("debug_inspection.docx", buffer);
    console.log("Render successful! Buffer size:", buffer.length);
} catch (e) {
    console.error("Render failed:", e);
}
