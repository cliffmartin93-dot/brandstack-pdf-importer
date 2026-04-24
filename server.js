const express = require("express");
const cors = require("cors");
const { fromPath } = require("pdf2pic");
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
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({
        error: "No PDF URL provided"
      });
    }

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

    const convert = fromPath(pdfPath, {
      density: 150,
      saveFilename: "page",
      savePath: outputFolder,
      format: "png",
      width: 1200,
      height: 1600
    });

    let results = [];
    let page = 1;

    while (true) {
      try {
        const result = await convert(page);

        results.push({
          page,
          image: result.path
        });

        page++;
      } catch (err) {
        break;
      }
    }

    await fs.remove(pdfPath);

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