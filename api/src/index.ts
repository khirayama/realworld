import * as path from "path";
import * as fs from "fs";

import express from "express";
import multer from "multer";
import { Post, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const port = 3001;

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    const p = path.resolve(__dirname, "../public/uploads/");
    fs.mkdirSync(p, { recursive: true });
    callback(null, p);
  },
  filename(_req, file, callback) {
    const uniqueSuffix = Math.random().toString(26).substring(4, 10);
    let name = file.originalname;
    const ext = "." + file.mimetype.split("/")[1];
    if (
      file.originalname.indexOf(ext) !==
      file.originalname.length - ext.length
    ) {
      name += ext;
    }
    callback(null, `${Date.now()}-${uniqueSuffix}-${name}`);
  },
});

const upload = multer({
  storage,
  fileFilter(_req, file, cb) {
    if (file.mimetype.split("/")[0] === "image") {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

function allowCrossOrigin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, access_token"
  );

  if ("OPTIONS" === req.method) {
    res.send(200);
  } else {
    next();
  }
}

function exclude(post: Post, keys: (keyof Post)[]): Omit<Post, keyof Post> {
  return Object.fromEntries(
    Object.entries(post).filter(
      (entry) => !keys.includes(entry[0] as keyof Post)
    )
  );
}

app
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(allowCrossOrigin)
  .use(express.static("public"));

app.post("/posts", upload.single("postImage"), async (req, res) => {
  const { clientId, content } = req.body;
  const file = req.file;
  const imagePath = file ? `/uploads/${file.filename}` : "";
  const post = await prisma.post.create({
    data: {
      clientId,
      content,
      imagePath,
    },
  });
  res.json(exclude(post, ["clientId"]));
});

app.get("/posts", async (req, res) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const take = 50;
  const posts = await prisma.post.findMany({
    skip: (page - 1) * take,
    take,
    orderBy: {
      created: "desc",
    },
  });
  res.json(posts.map((post) => exclude(post, ["clientId"])));
});

app.get("/posts/:id", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: Number(req.params.id) },
  });
  res.json(post ? exclude(post, ["clientId"]) : null);
});

app.put("/posts/:id", upload.single("postImage"), async (req, res) => {
  const { clientId, content } = req.body;
  const imagePath = `/uploads/${clientId}/${req.file?.filename}`;
  let post = await prisma.post.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (post?.clientId === clientId) {
    post = await prisma.post.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        content,
        imagePath,
        updated: new Date(),
      },
    });
    res.json(exclude(post, ["clientId"]));
  }
});

app.delete("/posts/:id", async (req, res) => {
  const { clientId } = req.body;
  let post = await prisma.post.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (post?.clientId === clientId) {
    const post = await prisma.post.delete({
      where: { id: Number(req.params.id) },
    });
    res.json(exclude(post, ["clientId"]));
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
