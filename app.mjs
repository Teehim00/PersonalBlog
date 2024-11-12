import express from "express";
import blogPostRouter from "./router/post.mjs";

const app = express();
const port = 4000;

app.use(express.json());
app.use("/posts", blogPostRouter);

app.get("/profiles", (req, res) => {
  return res.json({
    data: {
      name: "john",
      age: 20,
    },
  });
});

app.listen(port, () => {
  console.log(`Server is running as ${port}`);
});
