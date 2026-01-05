
import officegen from "officegen";
import fs from "fs";
import path from "path";

const docx = officegen("docx");

docx.on("finalize", function (written: any) {
    console.log("Finish to create a Microsoft Word document.");
});

docx.on("error", function (err: any) {
    console.log(err);
});

// Title
const pTitle = docx.createP();
pTitle.addText("Inspection Report", { bold: true, font_face: "Arial", font_size: 18 });

// Simple fields without loops
const pDesc1 = docx.createP();
pDesc1.addText("Item 1: {{items[0].description}}", { font_face: "Arial", font_size: 12 });

const pPhoto1 = docx.createP();
pPhoto1.addText("{{IMAGE items[0].photo}}", { font_face: "Arial", font_size: 12 });

const pDesc2 = docx.createP();
pDesc2.addText("Item 2: {{items[1].description}}", { font_face: "Arial", font_size: 12 });

const pPhoto2 = docx.createP();
pPhoto2.addText("{{IMAGE items[1].photo}}", { font_face: "Arial", font_size: 12 });

const out = fs.createWriteStream(path.resolve(__dirname, "../packages/api/templates/inspection.docx"));

out.on("error", function (err: any) {
    console.log(err);
});

docx.generate(out);
