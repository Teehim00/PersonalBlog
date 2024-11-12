export const validateCreatePostData = (req, res, next) => {
  // Validation Rule ของ Requirement ก็สามารถมีได้ดังนี้
  // 1) ข้อมุล Title,Content, category และ Length
  // เป็นข้อมูลที่ Client จำเป็นต้องแนบมาให้
  const { title, category_id, description, content, status_id } = req.body;

  // ตรวจสอบความถูกต้องของข้อมูลที่จำเป็นต้องมี
  if (!title) {
    return res.status(400).json({
      message:
        "กรุณาส่งข้อมูล title ของโพสต์เข้ามาด้วย Title is required หรือ Title must be a string",
    });
  }

  if (!category_id) {
    return res.status(400).json({
      message: "กรุณาส่งข้อมูล category_id ของโพสต์เข้ามาด้วย",
    });
  }

  if (!description) {
    return res.status(400).json({
      message: "กรุณาส่งข้อมูล description ของโพสต์เข้ามาด้วย",
    });
  }

  if (!content) {
    return res.status(400).json({
      message: "กรุณาส่งข้อมูล content ของโพสต์เข้ามาด้วย",
    });
  }

  if (!status_id) {
    return res.status(400).json({
      message: "กรุณาส่งข้อมูล status_id ของโพสต์เข้ามาด้วย",
    });
  }

  next();
};
