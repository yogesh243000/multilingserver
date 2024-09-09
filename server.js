require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const clickupRoutes = require("./routes/clickup");

const FileDetails = require("./models/filedetails"); // Adjust this as necessary
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
const mongoUrl = process.env.MONGO_URL;
mongoose
  .connect(mongoUrl)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));
// const renameFiles = async () => {
//   try {
//     const files = await FileDetails.find({});
//     files.forEach((fileDetail) => {
//       if (fileDetail.files && fileDetail.originalFilenames) {
//         fileDetail.files.forEach(async (timestampedFilename, index) => {
//           const originalFilename = fileDetail.originalFilenames[index]; // Adjust according to your schema

//           if (originalFilename) {
//             const oldPath = path.join("uploads", timestampedFilename);
//             const newPath = path.join("uploads", originalFilename);

//             if (fs.existsSync(oldPath)) {
//               fs.rename(oldPath, newPath, (err) => {
//                 if (err) throw err;
//                 console.log(`Renamed ${oldPath} to ${newPath}`);
//               });
//             }
//           } else {
//             console.error(`Original filename not found for index ${index}`);
//           }
//         });
//       } else {
//         console.error(
//           "Files or originalFilenames array is missing or undefined."
//         );
//       }
//     });
//   } catch (error) {
//     console.error("Error renaming files:", error);
//   }
// };
// renameFiles();

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

// Create uploads directory if it doesn't exist
const dir = "./uploads";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Upload route
// app.post("/upload", upload.array("files"), async (req, res) => {
//   try {
//     const { title, description } = req.body;
//     const fileNames = req.files.map((file) => file.filename);
//     const originalFileNames = req.files.map((file) => file.originalname);

//     await FileDetails.create({
//       title: title,
//       description: description,
//       files: fileNames,
//       originalFilenames: originalFileNames, // Save original filenames
//     });

//     res.send({ status: "ok" });
//   } catch (error) {
//     console.error("Error saving file details:", error);
//     res.status(500).json({ status: "error", message: error.message });
//   }
// });
app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const { title, description } = req.body;
    const fileNames = req.files.map((file) => file.filename); // Store multer-generated filenames
    const originalFileNames = req.files.map((file) => file.originalname); // Store original names for reference

    await FileDetails.create({
      title: title,
      description: description,
      files: fileNames, // Save the multer-generated filenames
      originalFilenames: originalFileNames, // Optional: Save original names for display purposes
    });

    res.send({ status: "ok" });
  } catch (error) {
    console.error("Error saving file details:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    return res.status(400).json({ status: "error", message: err.message });
  }
  next(err); // Pass to next error handler
});

// Get all blog posts from FileDetails
// Backend Route Debugging
app.get("/get-posts", async (req, res) => {
  try {
    const posts = await FileDetails.find({}).sort({ createdAt: -1 }); // Sort by newest first
    const postsWithFileUrls = posts.map((post) => ({
      ...post._doc,
      files: post.files.map((file) => `http://localhost:5001/uploads/${file}`),
    }));
    res.send({ status: "ok", posts: postsWithFileUrls });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/get-all-files", async (req, res) => {
  try {
    console.log("Fetching all files"); // Debug log
    const data = await FileDetails.find({});
    console.log("Files fetched:", data); // Debug log
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

// Create a new blog post
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

// Update a blog post
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

// Delete a blog post
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
