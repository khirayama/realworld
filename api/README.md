## Specs

- [ ] 画像とテキストの投稿
- [ ] 投稿の読取
- [ ] 投稿の編集
- [ ] 投稿の削除


## Schema

### Client

- id
- token
- created
- updated

### Posts

- id
- clientId
- content
- imagePath
- created
- updated


## Dev Env

```
npx prisma migrate dev --name init
npm run
```


## Refs

-   [Quickstart with TypeScript & SQLite | Prisma Docs](https://www.prisma.io/docs/getting-started/quickstart)
-   [Express & Prisma | Next-Generation ORM for SQL DBs](https://www.prisma.io/express)
-   [CRUD (Reference) | Prisma Docs](https://www.prisma.io/docs/orm/prisma-client/queries/crud)
