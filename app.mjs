import express from "express";
import connectionPool from "./utils/db.mjs";

const app = express();
const port = 4000;
app.use(express.json());

app.get("/profiles", (req, res) => {
  return res.json({
    data: {
      name: "john",
      age: 20,
    },
  });
});

app.post("/posts", async (req, res) => {
  //การเก็บข้อมูลของโพสต์ลงในฐานข้อมูล

  //1 Access ข้อมูลใน Body จาก Request ด้วย req.body
  const newAssignments = req.body;
  console.log(newAssignments);

  //2 เขียน Query เพื่อ Insert ข้อมูลโพสต์ ด้วย Connection Pool
  try {
    await connectionPool.query(
      `insert into posts (status_id, title, image, category_id, description, content)
            values($1, $2, $3, $4, $5, $6)`,
      [
        1,
        newAssignments.title,
        newAssignments.image,
        newAssignments.category_id,
        newAssignments.description,
        newAssignments.content,
      ]
    );
  } catch (error) {
    if (
      !newAssignments.title ||
      !newAssignments.image ||
      !newAssignments.category_id ||
      !newAssignments.description ||
      !newAssignments.content
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }
    console.error(error);
    return res.status(500).json({
      message: "Server could not create post because database connection",
    });
  }

  //3 return ตัว response กลับไปหา client ว่าสร้างสำเร็จ
  return res.status(201).json({
    message: "Created post sucessfully",
  });
});

app.listen(port, () => {
  console.log(`Server is running as ${port}`);
});
