import * as path from "path";
import * as fs from "fs";

import jwt from "jsonwebtoken";
import express from "express";
import multer from "multer";
import { Post, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const port = 3030;
const secret = "secret key";

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

type Payload = {
  clientId: string;
};

declare global {
  namespace Express {
    export interface Request {
      payload: Payload;
    }
  }
}

function verifyToken(
  options: {
    throwOnInvalidTokenError?: boolean;
    throwOnNoTokenError?: boolean;
  } = {
    throwOnInvalidTokenError: true,
    throwOnNoTokenError: true,
  }
) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const opts = {
      throwOnInvalidTokenError: true,
      throwOnNoTokenError: true,
      ...options,
    };
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.split(" ")[0] === "Bearer") {
      try {
        const decoded = <Payload>jwt.verify(authHeader.split(" ")[1], secret);
        req.payload = decoded;
        next();
      } catch {
        if (opts.throwOnInvalidTokenError) {
          const err = new Error("Invalid Token");
          return res.status(500).json({ error: err.message });
        }
        next();
      }
    } else {
      if (opts.throwOnNoTokenError) {
        const err = new Error("No Token");
        return res.status(500).json({ error: err.message });
      }
      next();
    }
  };
}

function computePostAsResponse(
  post: Post,
  clientId: string
): Omit<Post, "clientId"> & { editable: boolean } {
  return {
    id: post.id,
    content: post.content,
    imagePath: post.imagePath,
    created: post.created,
    updated: post.updated,
    editable: post.clientId === clientId,
  };
}

app
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(express.static(path.resolve(__dirname, "../public")))
  .use(allowCrossOrigin);

app.post(
  "/tokens",
  verifyToken({ throwOnNoTokenError: false, throwOnInvalidTokenError: false }),
  async (req, res) => {
    let clientId = req.payload?.clientId;

    if (!clientId) {
      const client = await prisma.client.create({ data: { token: "" } });
      clientId = client.id;
      req.payload = { clientId };
    }

    const token = jwt.sign({ clientId }, secret, {
      algorithm: "HS256",
      expiresIn: "3650d",
    });
    await prisma.client.update({
      where: {
        id: clientId,
      },
      data: {
        token,
        updated: new Date(),
      },
    });

    return res.json({ token });
  }
);

app.post(
  "/posts",
  verifyToken(),
  upload.single("postImage"),
  async (req, res) => {
    const clientId = req.payload.clientId;

    const { content } = req.body;

    if (!content) {
      const err = new Error("No Content");
      return res.status(500).json({ error: err.message });
    }

    const file = req.file;
    const imagePath = file ? `/uploads/${file.filename}` : "";
    const post = await prisma.post.create({
      data: {
        clientId,
        content,
        imagePath,
      },
    });
    res.json(computePostAsResponse(post, clientId));
  }
);

app.get("/posts", verifyToken(), async (req, res) => {
  const clientId = req.payload.clientId;

  const page = req.query.page ? Number(req.query.page) : 1;
  const take = 50;
  const posts = await prisma.post.findMany({
    skip: (page - 1) * take,
    take,
    orderBy: {
      created: "desc",
    },
  });
  res.json(posts.map((post) => computePostAsResponse(post, clientId)));
});

app.get("/posts/:id", verifyToken(), async (req, res) => {
  const clientId = req.payload.clientId;

  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
  });
  res.json(post ? computePostAsResponse(post, clientId) : null);
});

app.put(
  "/posts/:id",
  verifyToken(),
  upload.single("postImage"),
  async (req, res) => {
    const clientId = req.payload.clientId;
    const { content } = req.body;

    if (!content) {
      const err = new Error("No Content");
      return res.status(500).json({ error: err.message });
    }

    const imagePath = `/uploads/${clientId}/${req.file?.filename}`;
    let post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });
    if (post?.clientId === clientId) {
      post = await prisma.post.update({
        where: {
          id: req.params.id,
        },
        data: {
          content,
          imagePath,
          updated: new Date(),
        },
      });
      res.json(computePostAsResponse(post, clientId));
    }
  }
);

app.delete("/posts/:id", verifyToken(), async (req, res) => {
  const clientId = req.payload.clientId;

  let post = await prisma.post.findUnique({
    where: { id: req.params.id },
  });
  if (post?.clientId === clientId) {
    const post = await prisma.post.delete({
      where: { id: req.params.id },
    });
    res.json(computePostAsResponse(post, clientId));
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
