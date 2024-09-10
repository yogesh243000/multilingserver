require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const clickupRoutes = require("./routes/clickup");

const FileDetails = require("./models/filedetails"); // Model for files
// const Post = require("./models/post"); // Model for posts

const app = express();

// Middleware
app.use(express.json());
const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
const mongoUrl =
  process.env.MONGODB_URI ||
  "mongodb://atlas-sql-66ddf36bb9cbc3620dc71688-ozezr.a.query.mongodb.net/test?ssl=true&authSource=admin";
mongoose
  .connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// Create uploads directory if it doesn't exist
const dir = "./uploads";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes =
      /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv|mp4|avi|mov|zip|rar/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type"));
  },
});

// Upload route
app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const { title, description } = req.body;
    const fileNames = req.files.map((file) => file.filename);
    const originalFileNames = req.files.map((file) => file.originalname);

    await FileDetails.create({
      title: title,
      description: description,
      files: fileNames,
      originalFilenames: originalFileNames,
    });

    res.send({ status: "ok" });
  } catch (error) {
    console.error("Error saving file details:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Routes for file details
app.get("/get-posts", async (req, res) => {
  try {
    const posts = await FileDetails.find({}).sort({ createdAt: -1 });
    const postsWithFileUrls = posts.map((post) => ({
      ...post._doc,
      files: post.files.map(
        (file) => `https://${req.headers.host}/uploads/${file}`
      ),
    }));
    res.send({ status: "ok", posts: postsWithFileUrls });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/get-all-files", async (req, res) => {
  try {
    const data = await FileDetails.find({});
    res.send({ status: "ok", data: data });
  } catch (error) {
    console.error("Error fetching all file details:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// DELETE endpoint
app.delete("/delete-file/:id", async (req, res) => {
  try {
    const fileDetail = await FileDetails.findById(req.params.id);
    if (fileDetail) {
      fileDetail.files.forEach((file) => {
        const filePath = path.join("uploads", file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      await FileDetails.findByIdAndDelete(req.params.id);
      res.status(200).send({ message: "File deleted successfully" });
    } else {
      res.status(404).send({ error: "File not found" });
    }
  } catch (error) {
    res.status(500).send({ error: "Internal server error" });
  }
});

// PUT endpoint
app.put("/edit-file/:id", async (req, res) => {
  try {
    const updatedFile = await FileDetails.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (updatedFile) {
      res.status(200).send(updatedFile);
    } else {
      res.status(404).send({ error: "File not found" });
    }
  } catch (error) {
    res.status(500).send({ error: "Internal server error" });
  }
});

// Blog post routes
app.post("/create-post", async (req, res) => {
  try {
    const { title, content } = req.body;
    const newPost = new Post({ title, content });
    await newPost.save();
    res.status(201).send({ status: "ok", post: newPost });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.put("/update-post/:id", async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (updatedPost) {
      res.send({ status: "ok", post: updatedPost });
    } else {
      res.status(404).send({ status: "error", message: "Post not found" });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.delete("/delete-post/:id", async (req, res) => {
  try {
    const result = await Post.findByIdAndDelete(req.params.id);
    if (result) {
      res
        .status(200)
        .send({ status: "ok", message: "Post deleted successfully" });
    } else {
      res.status(404).send({ status: "error", message: "Post not found" });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Routes
app.get("/", (req, res) => {
  res.send("Success");
  console.log("Hi i can get");
});
app.use("/api/clickup", clickupRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ status: "error", message: "File size exceeds the 5MB limit." });
    }
    return res.status(400).json({ status: "error", message: err.message });
  } else if (err) {
    console.error("Unhandled error:", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
  next();
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
