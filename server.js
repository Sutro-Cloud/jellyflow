const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

app.use(express.static(rootDir, { extensions: ["html"] }));

app.get("*", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Jellyflow running on http://localhost:${port}`);
});
