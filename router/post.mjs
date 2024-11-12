import { Router } from "express";
import connectionPool from "../utils/db.mjs";
import { validateCreatePostData } from "../middlewares/post.validation.mjs";

const blogPostRouter = Router();

blogPostRouter.post("/", [validateCreatePostData], async (req, res) => {
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

blogPostRouter.get("/:postId", async (req, res) => {
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

blogPostRouter.put("/:postId", [validateCreatePostData], async (req, res) => {
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

blogPostRouter.delete("/:postId", async (req, res) => {
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

blogPostRouter.get("/", async (req, res) => {
  // ลอจิกในอ่านข้อมูลโพสต์ทั้งหมดในระบบ
  try {
    // 1) Access ข้อมูลใน Body จาก Request ด้วย req.body
    const category = req.query.category || "";
    const keyword = req.query.keyword || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;
    // 2) ทำให้แน่ใจว่า query parameter page และ limit จะมีค่าอย่างต่ำเป็น 1
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const offset = (safePage - 1) * safeLimit;
    // offset คือค่าที่ใช้ในการข้ามจำนวนข้อมูลบางส่วนตอน query ข้อมูลจาก database
    // ถ้า page = 2 และ limit = 6 จะได้ offset = (2 - 1) * 6 = 6 หมายความว่าต้องข้ามแถวไป 6 แถวแรก และดึงแถวที่ 7-12 แทน
    // 3) เขียน Query เพื่อ Insert ข้อมูลโพสต์ ด้วย Connection Pool
    let query = `
        SELECT posts.id, posts.image, categories.name AS category, posts.title, posts.description, posts.date, posts.content, statuses.status, posts.likes_count
        FROM posts
        INNER JOIN categories ON posts.category_id = categories.id
        INNER JOIN statuses ON posts.status_id = statuses.id
      `;
    let values = [];
    // 4) เขียน query จากเงื่อนไขของการใส่ query parameter category และ keyword
    if (category && keyword) {
      query += `
          WHERE categories.name ILIKE $1 
          AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
        `;
      values = [`%${category}%`, `%${keyword}%`];
    } else if (category) {
      query += " WHERE categories.name ILIKE $1";
      values = [`%${category}%`];
    } else if (keyword) {
      query += `
          WHERE posts.title ILIKE $1 
          OR posts.description ILIKE $1 
          OR posts.content ILIKE $1
        `;
      values = [`%${keyword}%`];
    }
    // 5) เพิ่มการ odering ตามวันที่, limit และ offset
    query += ` ORDER BY posts.date DESC LIMIT $${values.length + 1} OFFSET $${
      values.length + 2
    }`;
    values.push(safeLimit, offset);
    // 6) Execute the main query (ดึงข้อมูลของบทความ)
    const result = await connectionPool.query(query, values);
    // 7) สร้าง Query สำหรับนับจำนวนทั้งหมดตามเงื่อนไข พื่อใช้สำหรับ pagination metadata
    let countQuery = `
        SELECT COUNT(*)
        FROM posts
        INNER JOIN categories ON posts.category_id = categories.id
        INNER JOIN statuses ON posts.status_id = statuses.id
      `;
    let countValues = values.slice(0, -2); // ลบค่า limit และ offset ออกจาก values
    if (category && keyword) {
      countQuery += `
          WHERE categories.name ILIKE $1 
          AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
        `;
    } else if (category) {
      countQuery += " WHERE categories.name ILIKE $1";
    } else if (keyword) {
      countQuery += `
          WHERE posts.title ILIKE $1 
          OR posts.description ILIKE $1 
          OR posts.content ILIKE $1
        `;
    }
    const countResult = await connectionPool.query(countQuery, countValues);
    const totalPosts = parseInt(countResult.rows[0].count, 10);
    // 8) สร้าง response พร้อมข้อมูลการแบ่งหน้า (pagination)
    const results = {
      totalPosts,
      totalPages: Math.ceil(totalPosts / safeLimit),
      currentPage: safePage,
      limit: safeLimit,
      posts: result.rows,
    };
    // เช็คว่ามีหน้าถัดไปหรือไม่
    if (offset + safeLimit < totalPosts) {
      results.nextPage = safePage + 1;
    }
    // เช็คว่ามีหน้าก่อนหน้าหรือไม่
    if (offset > 0) {
      results.previousPage = safePage - 1;
    }
    // 9) Return ตัว Response กลับไปหา Client ว่าสร้างสำเร็จ
    return res.status(200).json(results);
  } catch {
    return res.status(500).json({
      message: "Server could not read post because database issue",
    });
  }
});

export default blogPostRouter;
