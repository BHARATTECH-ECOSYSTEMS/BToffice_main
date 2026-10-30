const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

// Review 2026-10-26 low list: uploaded ID documents and policies kept their file names read as Latin-1, so a Hindi
// name ("आधार कार्ड.pdf") came out garbled. Task files already read them as UTF-8; now all three do.

const { uploadIdDocumentPdf } = require("../middlewares/uploadIdDocument");
const { uploadPolicyPdf } = require("../middlewares/uploadPolicy");
const { uploadTaskFile } = require("../middlewares/uploadTaskFile");

const PDF = Buffer.from("%PDF-1.4\n%%EOF\n");
let server;
let root;
before(async () => {
  const app = express();
  const name = (req, res) => res.json({ name: req.file?.originalname });
  app.post("/id", uploadIdDocumentPdf, name);
  app.post("/policy", uploadPolicyPdf, name);
  app.post("/task", uploadTaskFile, name);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));

const send = async (path, field, fileName) => {
  const form = new FormData();
  form.append(field, new Blob([PDF], { type: "application/pdf" }), fileName);
  return (await (await fetch(root + path, { method: "POST", body: form })).json()).name;
};

for (const [path, field] of [["/id", "file"], ["/policy", "pdf"], ["/task", "file"]]) {
  test(`${path.slice(1)} uploads keep a Hindi or accented file name as typed`, async () => {
    assert.equal(await send(path, field, "आधार कार्ड.pdf"), "आधार कार्ड.pdf");
    assert.equal(await send(path, field, "Bericht über.pdf"), "Bericht über.pdf");
  });
}
