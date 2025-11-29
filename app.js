// app.js
const express = require("express");
const path = require("path");
const { sql, poolPromise } = require("./db");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");


const app = express();
const PORT = 3000;

app.use(
  session({
    secret: "some-super-secret-key", // đổi thành chuỗi riêng của bạn
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 ngày
  })
);

// Middleware đọc form (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve folder public (html, css, js)
app.use(express.static(path.join(__dirname, "public")));

// ========== 1) FORM ĐĂNG KÝ USER ==========

// GET /register -> trả về file register.html
// app.get("/register", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "register.html"));
// });

// GET /register -> chuyển về /auth
app.get("/register", (req, res) => {
  res.redirect("/auth");
});

// GET /login -> chuyển về /auth
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/posts/new");
  }
  res.redirect("/auth");
});

// POST /register -> nhận dữ liệu form, insert vào bảng Users
app.post("/register", async (req, res) => {
  const { user_name, name, email, password } = req.body;

  if (!user_name || !name || !email || !password) {
    return res.send("Vui lòng nhập đầy đủ thông tin!");
  }

  try {
    const pool = await poolPromise;

    // HASH PASSWORD
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const request = pool.request();
    request.input("user_name", sql.VarChar(50), user_name);
    request.input("name", sql.VarChar(100), name);
    request.input("email", sql.VarChar(100), email);
    request.input("password_hash", sql.VarChar(255), passwordHash);

    // Lấy luôn user_id vừa tạo bằng OUTPUT
    const result = await request.query(`
      INSERT INTO Users (user_name, name, email, password_hash, role, status, created_at)
      OUTPUT INSERTED.user_id, INSERTED.name, INSERTED.email, INSERTED.avatar_url
      VALUES (@user_name, @name, @email, @password_hash, 'member', 'active', GETDATE())
    `);

    const newUser = result.recordset[0];

    // 👉 ĐĂNG NHẬP LUÔN: set session giống /login
    req.session.user = {
      user_id: newUser.user_id,
      name: newUser.name,
      email: newUser.email,
      avatar_url: newUser.avatar_url, // nếu chưa có thì null cũng được
    };

    // Bây giờ /posts/new sẽ cho vào vì đã có req.session.user
    res.redirect("/posts/new");
  } catch (err) {
    console.error(err);
    res.send("Lỗi khi đăng ký: " + err.message);
  }
});

// ========== LOGIN ==========

// GET /login -> trả file login.html
// app.get("/login", (req, res) => {
//   // Nếu đã đăng nhập thì cho vào luôn /posts/new
//   if (req.session.user) {
//     return res.redirect("/posts/new");
//   }
//   res.sendFile(path.join(__dirname, "public", "login.html"));
// });

// POST /login -> kiểm tra email + password
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.send("Vui lòng nhập đầy đủ email và mật khẩu!");
  }

  try {
    const pool = await poolPromise;
    const rq = pool.request();
    rq.input("email", sql.VarChar(100), email);

    const result = await rq.query(`
      SELECT user_id, name, email, password_hash, avatar_url
      FROM Users
      WHERE email = @email;
    `);

    if (result.recordset.length === 0) {
      return res.send("Email không tồn tại hoặc mật khẩu không đúng!");
    }

    const user = result.recordset[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.send("Email không tồn tại hoặc mật khẩu không đúng!");
    }

    // Lưu thông tin user vào session
    req.session.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
    };

    // Đăng nhập xong, chuyển sang trang tạo bài viết
    res.redirect("/posts/new");
  } catch (err) {
    console.error(err);
    res.send("Lỗi khi đăng nhập: " + err.message);
  }
});

// (optional) Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth");
  });
});

// ========== 2) FORM TẠO BÀI VIẾT ==========

// GET /posts/new -> chỉ cho vào nếu đã đăng nhập
app.get("/posts/new", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.sendFile(path.join(__dirname, "public", "new_post.html"));
});

// Helper tạo slug từ text (bỏ dấu, ký tự đặc biệt, khoảng trắng -> -)
function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// POST /posts/new -> chèn vào Posts, Post_Categories, Post_Tags với validate
app.post("/posts/new", async (req, res) => {
  console.log("REQ BODY = ", req.body);
  const {
    author_id,
    title,
    slug: slugInput,
    excerpt,
    content,
    status,
    category_ids,
    tag_ids,
  } = req.body;

  if (!author_id || !title || !content) {
    return res.send("Vui lòng nhập đủ author_id, title, content!");
  }

  const authorIdNum = parseInt(author_id, 10);
  if (isNaN(authorIdNum)) {
    return res.send("author_id phải là số nguyên!");
  }

  const categoryIds = (category_ids || "")
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x));

  const tagIds = (tag_ids || "")
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x));

  let transaction;

  try {
    const pool = await poolPromise;

    // 1) Kiểm tra author_id tồn tại
    let rq = pool.request();
    rq.input("author_id", sql.BigInt, authorIdNum);
    const authorResult = await rq.query(`
      SELECT user_id FROM Users WHERE user_id = @author_id;
    `);
    if (authorResult.recordset.length === 0) {
      return res.send(
        `author_id = ${authorIdNum} không tồn tại trong Users. Vui lòng đăng ký user trước!`
      );
    }

    // 2) Kiểm tra categories
    for (const cid of categoryIds) {
      let rc = pool.request();
      rc.input("category_id", sql.Int, cid);
      const cat = await rc.query(`
        SELECT category_id FROM Categories WHERE category_id = @category_id;
      `);
      if (cat.recordset.length === 0) {
        return res.send(`category_id = ${cid} không tồn tại trong Categories!`);
      }
    }

    // 3) Kiểm tra tags
    for (const tid of tagIds) {
      let rt = pool.request();
      rt.input("tag_id", sql.Int, tid);
      const tag = await rt.query(`
        SELECT tag_id FROM Tags WHERE tag_id = @tag_id;
      `);
      if (tag.recordset.length === 0) {
        return res.send(`tag_id = ${tid} không tồn tại trong Tags!`);
      }
    }

    // 4) Tạo slug unique (giới hạn vòng lặp tránh bị kẹt)
    // 4) Tạo slug unique (ưu tiên slug user nhập nếu có)
    let baseSlug;

    if (slugInput && slugInput.trim() !== "") {
      // user nhập slug → dùng slug đó sau khi slugify
      baseSlug = slugify(slugInput.trim());
    } else {
      // không nhập → slugify từ title như cũ
      baseSlug = slugify(title);
    }

    if (!baseSlug || baseSlug.trim() === "") baseSlug = "post";

    let finalSlug = baseSlug;
    let suffix = 1;

    for (let i = 0; i < 50; i++) {
      const rqSlug = pool.request();
      rqSlug.input("slug", sql.VarChar(255), finalSlug);
      const slugResult = await rqSlug.query(`
    SELECT post_id FROM Posts WHERE slug = @slug;
  `);
      if (slugResult.recordset.length === 0) break;
      finalSlug = `${baseSlug}-${suffix++}`;
    }

    // 5) Transaction: insert Posts + Post_Categories + Post_Tags
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 5.1 Insert vào Posts
    const reqPost = new sql.Request(transaction);
    reqPost.input("author_id", sql.BigInt, authorIdNum);
    // 🔹 CHANGED: dùng NVARCHAR cho text
    reqPost.input("title", sql.NVarChar(255), title);
    reqPost.input("slug", sql.NVarChar(255), finalSlug);
    reqPost.input("excerpt", sql.NVarChar(sql.MAX), excerpt || null);
    reqPost.input("content", sql.NVarChar(sql.MAX), content || null);

    // 🔹 CHANGED: chuẩn hóa status, bỏ dòng status || 'draft' || ...
    const statusValue = status || "draft";
    reqPost.input("status", sql.VarChar(20), statusValue);

    // 🔹 CHANGED: published_at = GETDATE() nếu status = 'published'
    const insertPostQuery = `
      INSERT INTO Posts (
        author_id, title, slug, excerpt, content, status, published_at,
        view_count, is_featured, created_at, updated_at
      )
      OUTPUT INSERTED.post_id AS post_id
      VALUES (
        @author_id,
        @title,
        @slug,
        @excerpt,
        @content,
        @status,
        CASE WHEN @status = 'published' THEN GETDATE() ELSE NULL END,
        0,
        0,
        GETDATE(),
        GETDATE()
      );
    `;

    const postResult = await reqPost.query(insertPostQuery);
    const postId = postResult.recordset[0].post_id;

    // 5.2 Insert Post_Categories
    if (categoryIds.length > 0) {
      for (const cid of categoryIds) {
        const reqCat = new sql.Request(transaction);
        reqCat.input("post_id", sql.Int, postId);
        reqCat.input("category_id", sql.Int, cid);

        await reqCat.query(`
          INSERT INTO Post_Categories (post_id, category_id)
          VALUES (@post_id, @category_id);
        `);
      }
    }

    // 5.3 Insert Post_Tags
    if (tagIds.length > 0) {
      for (const tid of tagIds) {
        const reqTag = new sql.Request(transaction);
        reqTag.input("post_id", sql.Int, postId);
        reqTag.input("tag_id", sql.Int, tid);

        await reqTag.query(`
          INSERT INTO Post_Tags (post_id, tag_id)
          VALUES (@post_id, @tag_id);
        `);
      }
    }

    await transaction.commit();

    res.send(
      `Tạo bài viết thành công (post_id = ${postId}, slug = ${finalSlug})! <a href="/posts/new">Tạo tiếp</a>`
    );
  } catch (err) {
    console.error(err);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {}
    }
    res.send("Lỗi khi tạo bài viết: " + err.message);
  }
});

// Trang auth chung (login + register trong 1 trang)
app.get("/auth", (req, res) => {
  // Nếu đã đăng nhập thì cho vào luôn /posts/new
  if (req.session.user) {
    return res.redirect("/posts/new");
  }

  res.sendFile(path.join(__dirname, "public", "auth.html"));
});

// GET /categories/new -> form tạo category
app.get("/categories/new", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "new_category.html"));
});

// POST /categories/new -> insert vào Categories
app.post("/categories/new", async (req, res) => {
  const { name, slug, description } = req.body;

  if (!name) {
    return res.send("Vui lòng nhập tên danh mục");
  }

  try {
    const pool = await poolPromise;

    // Tạo slug nếu chưa có
    let baseSlug = slug && slug.trim() !== "" ? slugify(slug) : slugify(name);
    let finalSlug = baseSlug;
    let suffix = 1;

    while (true) {
      const rqSlug = pool.request();
      rqSlug.input("slug", sql.VarChar(150), finalSlug);
      const slugResult = await rqSlug.query(`
        SELECT category_id FROM Categories WHERE slug = @slug;
      `);
      if (slugResult.recordset.length === 0) break;
      finalSlug = `${baseSlug}-${suffix++}`;
    }

    const rq = pool.request();
    rq.input("name", sql.VarChar(100), name);
    rq.input("slug", sql.VarChar(150), finalSlug);
    rq.input("description", sql.Text, description || null);

    await rq.query(`
      INSERT INTO Categories (name, slug, description, created_at, updated_at)
      VALUES (@name, @slug, @description, GETDATE(), GETDATE());
    `);

    res.send(
      `Tạo Category thành công (slug = ${finalSlug})! <a href="/categories/new">Tạo tiếp</a>`
    );
  } catch (err) {
    console.error(err);
    res.send("Lỗi khi tạo Category: " + err.message);
  }
});

// GET /tags/new -> form tạo tag
app.get("/tags/new", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "new_tag.html"));
});

// POST /tags/new -> insert vào Tags
app.post("/tags/new", async (req, res) => {
  const { tag_name, slug, description } = req.body;

  if (!tag_name) {
    return res.send("Vui lòng nhập tên thẻ");
  }

  try {
    const pool = await poolPromise;

    let baseSlug =
      slug && slug.trim() !== "" ? slugify(slug) : slugify(tag_name);
    let finalSlug = baseSlug;
    let suffix = 1;

    while (true) {
      const rqSlug = pool.request();
      rqSlug.input("slug", sql.VarChar(100), finalSlug);
      const slugResult = await rqSlug.query(`
        SELECT tag_id FROM Tags WHERE slug = @slug;
      `);
      if (slugResult.recordset.length === 0) break;
      finalSlug = `${baseSlug}-${suffix++}`;
    }

    const rq = pool.request();
    rq.input("tag_name", sql.VarChar(50), tag_name);
    rq.input("slug", sql.VarChar(100), finalSlug);
    rq.input("description", sql.Text, description || null);

    await rq.query(`
      INSERT INTO Tags (tag_name, slug, description, created_at, updated_at)
      VALUES (@tag_name, @slug, @description, GETDATE(), GETDATE());
    `);

    res.send(
      `Tạo Tag thành công (slug = ${finalSlug})! <a href="/tags/new">Tạo tiếp</a>`
    );
  } catch (err) {
    console.error(err);
    res.send("Lỗi khi tạo Tag: " + err.message);
  }
});

// API trả danh sách Tag cho autocomplete
app.get("/api/tags", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT tag_id, tag_name, slug
      FROM Tags
      ORDER BY tag_name
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Lỗi lấy danh sách tag", detail: err.message });
  }
});

// API tạo tag mới (dùng cho autocomplete @tag)
app.post("/api/tags", async (req, res) => {
  const { tag_name } = req.body;

  if (!tag_name || !tag_name.trim()) {
    return res.status(400).json({ error: "tag_name is required" });
  }

  try {
    const pool = await poolPromise;

    // tạo slug unique giống logic cũ
    let baseSlug = slugify(tag_name);
    if (!baseSlug || baseSlug.trim() === "") baseSlug = "tag";

    let finalSlug = baseSlug;
    let suffix = 1;

    while (true) {
      const rqSlug = pool.request();
      rqSlug.input("slug", sql.VarChar(100), finalSlug);
      const slugResult = await rqSlug.query(`
        SELECT tag_id FROM Tags WHERE slug = @slug;
      `);
      if (slugResult.recordset.length === 0) break;
      finalSlug = `${baseSlug}-${suffix++}`;
    }

    const rq = pool.request();
    rq.input("tag_name", sql.VarChar(50), tag_name);
    rq.input("slug", sql.VarChar(100), finalSlug);

    const result = await rq.query(`
      INSERT INTO Tags (tag_name, slug, created_at, updated_at)
      OUTPUT INSERTED.tag_id, INSERTED.tag_name, INSERTED.slug
      VALUES (@tag_name, @slug, GETDATE(), GETDATE());
    `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi tạo tag", detail: err.message });
  }
});

// API trả về danh sách categories cho form tạo bài viết
app.get("/api/categories", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT category_id, name
      FROM Categories
      ORDER BY name
    `);

    res.json(result.recordset); // [{ category_id: 1, name: 'Technology' }, ...]
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Lỗi lấy danh sách category", detail: err.message });
  }
});
// API trả user đang đăng nhập
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }
  res.json(req.session.user); // { user_id, name, email }
});
// Logout
// app.get("/logout", (req, res) => {
//   req.session.destroy(() => {
//     res.redirect("/login");
//   });
// });
// Folder lưu avatar: public/uploads/avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public", "uploads", "avatars"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const userId = req.session.user?.user_id || "guest";
    const filename = `user_${userId}_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Upload avatar và lưu vào Users.avatar_url
app.post("/api/avatar", uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Chưa đăng nhập" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Không có file avatar" });
    }

    const userId = req.session.user.user_id;
    const avatarUrl = "/uploads/avatars/" + req.file.filename;

    const pool = await poolPromise;
    const rq = pool.request();
    rq.input("avatar_url", sql.VarChar(255), avatarUrl);
    rq.input("user_id", sql.BigInt, userId);

    await rq.query(`
      UPDATE Users
      SET avatar_url = @avatar_url
      WHERE user_id = @user_id;
    `);

    // Cập nhật lại session
    req.session.user.avatar_url = avatarUrl;

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error("Lỗi upload avatar:", err);
    res.status(500).json({ error: "Lỗi upload avatar", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
