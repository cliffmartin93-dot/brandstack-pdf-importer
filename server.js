const express = require("express");
const cors = require("cors");
const pdf = require("pdf-poppler");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("BrandStack PDF Importer is running 🚀");
});

app.post("/convert-pdf", async (req, res) => {
  try {
    let { pdfUrl } = req.body;

    console.log("RAW PDF URL:", pdfUrl);

    if (!pdfUrl) {
      return res.status(400).json({
        error: "No PDF URL provided"
      });
    }

    if (pdfUrl.startsWith("//")) {
      pdfUrl = "https:" + pdfUrl;
    }

    if (!pdfUrl.startsWith("http")) {
      pdfUrl = "https://" + pdfUrl;
    }

    console.log("FIXED PDF URL:", pdfUrl);

    const uploadsFolder = path.join(__dirname, "uploads");
    const outputFolder = path.join(__dirname, "output");

    await fs.ensureDir(uploadsFolder);
    await fs.ensureDir(outputFolder);

    const pdfPath = path.join(uploadsFolder, "temp.pdf");

    // Download PDF from Bubble URL
    const response = await axios({
      url: pdfUrl,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(pdfPath);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Convert PDF to PNG pages using pdf-poppler
    let opts = {
      format: "png",
      out_dir: outputFolder,
      out_prefix: "page",
      page: null
    };

    await pdf.convert(pdfPath, opts);

    const files = await fs.readdir(outputFolder);

    let results = files
      .filter(file => file.endsWith(".png"))
      .map((file, index) => ({
        page: index + 1,
        image: path.join(outputFolder, file)
      }));

    await fs.remove(pdfPath);

    console.log("CONVERTED PAGES:", results);

    res.json({
      success: true,
      pages: results
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});