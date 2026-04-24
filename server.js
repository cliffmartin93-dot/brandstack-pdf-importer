const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { fromPath } = require("pdf2pic");
const fs = require("fs-extra");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  dest: "uploads/"
});

app.post("/convert-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No PDF uploaded"
      });
    }

    const pdfPath = req.file.path;
    const outputFolder = path.join(__dirname, "output");

    await fs.ensureDir(outputFolder);

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