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

app.get("/posts/:postId", async (req, res) => {
  try {
    const postIdFromClient = req.params.postId;
    const results = await connectionPool.query(
      `
      SELECT * FROM posts WHERE id = $1
      `,
      [postIdFromClient]
    );
    if (!results.rows[0]) {
      return res.status(404).json({
        message: `Server could not find a requested post (post id: ${postIdFromClient})`,
      });
    }
    return res.status(201).json({
      data: results.rows[0],
    });
  } catch (e) {
    return res.status(500).json({
      message: "Server could not read post because database connection",
      error: e.message,
    });
  }
});

app.put("/posts/:postId", async (req, res) => {
  const postIdFromClient = req.params.postId;
  const updatedPost = { ...req.body, date: new Date() };

  try {
    const result = await connectionPool.query(
      `
      update posts
      set title =$2,
      image = $3,
      category_id = $4,
      description = $5,
      content =$6,
      date = $7
      where id =$1`,
      [
        postIdFromClient,
        updatedPost.title,
        updatedPost.image,
        updatedPost.category_id,
        updatedPost.description,
        updatedPost.content,
        updatedPost.date,
      ]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        message: `Server could not find a requested post to update (post id: ${postIdFromClient})`,
      });
    }

    return res.status(200).json({
      message: "Update post successfully",
    });
  } catch (error) {
    if (
      !updatedPost.title ||
      !updatedPost.image ||
      !updatedPost.category_id ||
      !updatedPost.description ||
      !updatedPost.content
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }
    console.error(error);
    return res.status(500).json({
      message:
        "Server could not update post because of a database connection error",
    });
  }
});

app.delete("/posts/:postId", async (req, res) => {
  const postIdFromClient = req.params.postId;
  try {
    const result = await connectionPool.query(
      `delete from posts
      where id = $1`,
      [postIdFromClient]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        message: `Server could not find a requested post to delete (post id: ${postIdFromClient})`,
      });
    }

    return res.status(200).json({
      message: "Deleted post sucessfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server could not delete post because database connection",
    });
  }
});

app.get("/posts", async (req, res) => {
  try {
    const keywords = req.query.keywords; // คำค้นหาจาก title, description หรือ content
    const page = req.query.page || 1; // หมายเลขหน้าที่ต้องการแสดง (ค่าเริ่มต้นคือ 1)
    const PAGE_SIZE = 6; // จำนวนโพสต์ต่อหน้า
    const offset = (page - 1) * PAGE_SIZE; // คำนวณค่า offset เพื่อแสดงหน้าถัดไป

    let query = "SELECT * FROM posts";
    let values = [];

    // เริ่มการสร้าง query ตามเงื่อนไขที่ได้
    if (keywords) {
      query +=
        " WHERE (title ILIKE $1 OR description ILIKE $1 OR content ILIKE $1) LIMIT $2 OFFSET $3";
      values = [`%${keywords}%`, PAGE_SIZE, offset];
    } else {
      query += " LIMIT $1 OFFSET $2";
      values = [PAGE_SIZE, offset];
    }

    // รัน query และดึงข้อมูลจากฐานข้อมูล
    const result = await connectionPool.query(query, values);

    // คำนวณ totalPages โดยใช้ข้อมูลจาก result.rowCount
    const totalPosts = result.rowCount;
    const totalPages = Math.ceil(totalPosts / PAGE_SIZE);
    const nextPage = page < totalPages ? page + 1 : null;

    return res.json({
      totalPosts, // จำนวนโพสต์ทั้งหมด
      totalPages, // จำนวนหน้าทั้งหมด
      currentPage: page, // หน้าปัจจุบัน
      limit: PAGE_SIZE, // จำนวนโพสต์ต่อหน้า
      posts: result.rows, // ข้อมูลโพสต์ที่ดึงมา
      nextPage, // หน้าถัดไป
    });
  } catch (e) {
    return res.json({
      message: e.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running as ${port}`);
});
