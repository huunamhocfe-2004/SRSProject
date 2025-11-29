document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".post-form");

  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const statusSelect = document.getElementById("status");
  const excerptInput = document.getElementById("excerpt");
  const authorInput = document.getElementById("author_id");
  const blogTitle = document.getElementById("blog-title");

  const userMenuToggle = document.getElementById("user-menu-toggle");
  const userMenuPopup = document.getElementById("user-menu-popup");
  const logoutBtn = document.getElementById("logout-btn");
  const changeAvatarBtn = document.getElementById("change-avatar-btn");
  const userMenuName = document.getElementById("user-menu-name");
  const userMenuEmail = document.getElementById("user-menu-email");
  const avatarFileInput = document.getElementById("avatar-file");
  const avatarImg = document.getElementById("avatar-img");
  const cardCategories = document.getElementById("card-categories");

  // Slug (tùy chọn)
  const slugInput = document.getElementById("slug");

  // Cover image
  const coverInput = document.getElementById("cover_image");
  const coverPreview = document.getElementById("cover-preview");

  // Category
  const categoryIdsInput = document.getElementById("category_ids");
  const categorySelect = document.getElementById("category-select");

  const styleSelect = document.getElementById("md-style");

  // Tags
  const tagIdsInput = document.getElementById("tag_ids");
  const tagTextInput = document.getElementById("tag-text");
  const tagSuggestions = document.getElementById("tag-suggestions");
  const tagInputWrapper = document.getElementById("tag-input-wrapper");

  // Preview (sidebar card)
  const previewTitle = document.getElementById("preview-title");
  const previewSlug = document.getElementById("preview-slug");
  const previewStatus = document.getElementById("preview-status");
  const previewSummary = document.getElementById("preview-summary");
  const previewContent = document.getElementById("preview-content-text");
  const previewTags = document.getElementById("preview-tags");
  const previewCategoryIds = document.getElementById("preview-category-ids");

  // Preview section + loading
  const previewSection = document.getElementById("preview-section");
  const previewLoading = document.getElementById("preview-loading");

  // Buttons
  const resetBtn = document.getElementById("reset-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const previewBtn = document.getElementById("open-preview");

  // Modal
  const modal = document.getElementById("preview-modal");
  const closeBtn = document.getElementById("close-preview");
  const overlay = document.querySelector(".modal-overlay"); // ⚠️ chỉ khai báo 1 lần

  const mTitle = document.getElementById("m-title");
  const mSlug = document.getElementById("m-slug");
  const mStatus = document.getElementById("m-status");
  const mCategory = document.getElementById("m-category");
  const mTags = document.getElementById("m-tags");
  const mContent = document.getElementById("m-content");

  // ===== Custom select UI (status + category) =====
  const customSelectMap = new WeakMap();

  // mảng lưu các danh mục đã chọn
  let selectedCategories = []; // [{ id: number, name: string }]

  // ===== Lấy user đang đăng nhập và hiển thị lên UI =====
  async function loadCurrentUser() {
    try {
      const res = await fetch("/api/me");
      if (res.status === 401) {
        // chưa đăng nhập -> quay về /login
        window.location.href = "/login";
        return;
      }

      const user = await res.json(); // { user_id, name, email }

      if (authorInput && user.user_id) {
        authorInput.value = user.user_id;
        authorInput.readOnly = true;
      }

      if (blogTitle && user.name) {
        blogTitle.textContent = `${user.name}`;
      }

      if (userMenuName && user.name) {
        userMenuName.textContent = user.name;
      }
      if (userMenuEmail && user.email) {
        userMenuEmail.textContent = user.email;
      }

      if (userMenuToggle && user.name && !avatarImg?.src) {
        // Nếu chưa có ảnh thì lấy chữ cái đầu
        userMenuToggle.setAttribute(
          "data-initial",
          user.name.trim()[0].toUpperCase()
        );
      }

      // Hiển thị avatar nếu có
      if (avatarImg && user.avatar_url) {
        avatarImg.src = user.avatar_url;
        avatarImg.style.display = "block";
      } else if (avatarImg && userMenuToggle?.dataset.initial) {
        // fallback: chữ cái đầu -> có thể dùng CSS background/text
        avatarImg.style.display = "none"; // dùng CSS khác nếu muốn
      }
    } catch (err) {
      console.error("Lỗi load user hiện tại:", err);
      window.location.href = "/login";
    }
  }

  // Gọi luôn khi vào trang tạo bài mới
  loadCurrentUser();

  // Gọi luôn khi vào trang
  loadCurrentUser();

  // ===== User menu: mở popup khi click avatar =====
  if (userMenuToggle && userMenuPopup) {
    userMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      userMenuPopup.classList.toggle("hidden");
    });

    // Click bên ngoài thì đóng popup
    document.addEventListener("click", (e) => {
      if (
        !userMenuPopup.classList.contains("hidden") &&
        !userMenuPopup.contains(e.target) &&
        !userMenuToggle.contains(e.target)
      ) {
        userMenuPopup.classList.add("hidden");
      }
    });
  }

  // ===== Change avatar: pick file + preview + upload =====
  if (changeAvatarBtn && avatarFileInput) {
    // Click "Change avatar" -> mở chọn file
    changeAvatarBtn.addEventListener("click", () => {
      avatarFileInput.click();
    });

    avatarFileInput.addEventListener("change", async () => {
      const file = avatarFileInput.files[0];
      if (!file) {
        return;
      } else {
        userMenuPopup.classList.add("hidden");
      }

      // Preview ngay trên UI
      const url = URL.createObjectURL(file);
      avatarImg.src = url;
      avatarImg.style.display = "block";

      const formData = new FormData();
      formData.append("avatar", file);

      await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      });
    });
  }

  // ===== Logout =====
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Gọi route /logout rồi server sẽ redirect về /login
      window.location.href = "/logout";
    });
  }
  function updateCategoryHiddenInput() {
    if (!categoryIdsInput) return;
    const ids = selectedCategories.map((c) => c.id);
    categoryIdsInput.value = ids.join(","); // ví dụ "1,3,5"
  }

  function renderCategoryChips() {
    // ======== 1) Preview bên phải (KHÔNG nút X, dạng danh sách) ========
    if (previewCategoryIds) {
      if (selectedCategories.length === 0) {
        previewCategoryIds.textContent = "–";
      } else {
        const names = selectedCategories.map((c) => c.name);
        previewCategoryIds.textContent = names.join(", "); // Ví dụ: Frontend, Backend
      }
    }

    // Chip ngay trên card-subtitle
    if (cardCategories) {
      cardCategories.innerHTML = "";
      if (selectedCategories.length > 0) {
        selectedCategories.forEach((cat) => {
          const chip = document.createElement("span");
          chip.className = "cat-pill";
          chip.dataset.id = cat.id;
          chip.innerHTML = `
            ${cat.name}
            <button type="button" class="cat-remove" data-id="${cat.id}"><i class="fa-solid fa-x"></i></button>
          `;
          cardCategories.appendChild(chip);
        });
      }
    }
  }
  function handleCategoryChipClick(e) {
    const removeBtn = e.target.closest(".cat-remove");
    if (!removeBtn) return;

    const id = Number(removeBtn.dataset.id);
    if (!id) return;

    // Xoá khỏi mảng selectedCategories
    selectedCategories = selectedCategories.filter((c) => c.id !== id);

    // Cập nhật hidden + UI
    updateCategoryHiddenInput();
    renderCategoryChips();
  }

  if (previewCategoryIds) {
    previewCategoryIds.addEventListener("click", handleCategoryChipClick);
  }

  if (cardCategories) {
    cardCategories.addEventListener("click", handleCategoryChipClick);
  }

  function initCustomSelect(selectEl) {
    if (!selectEl) return;

    const wrapper = selectEl.closest(".custom-select");
    if (!wrapper) return;

    const displayBtn = wrapper.querySelector(".select-display");
    const labelSpan = wrapper.querySelector(".select-display-label");
    const dropdown = wrapper.querySelector(".select-dropdown");

    if (!displayBtn || !labelSpan || !dropdown) return;

    selectEl.classList.add("native-select");

    function syncLabelFromSelect() {
      const opt = selectEl.options[selectEl.selectedIndex];
      const placeholder = wrapper.dataset.placeholder || "Chọn...";

      labelSpan.textContent = opt && opt.value ? opt.textContent : placeholder;

      dropdown.querySelectorAll(".select-option").forEach((el) => {
        el.classList.toggle("selected", opt && el.dataset.value === opt.value);
      });
    }

    function rebuildOptions() {
      dropdown.innerHTML = "";

      Array.from(selectEl.options).forEach((opt) => {
        const optionEl = document.createElement("div");
        optionEl.className = "select-option";
        optionEl.dataset.value = opt.value;
        optionEl.textContent = opt.textContent || "(trống)";

        if (opt.selected) optionEl.classList.add("selected");

        optionEl.addEventListener("click", () => {
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          syncLabelFromSelect();
          wrapper.classList.remove("open");
        });

        dropdown.appendChild(optionEl);
      });

      syncLabelFromSelect();
    }

    displayBtn.addEventListener("click", () => {
      const isOpen = wrapper.classList.toggle("open");
      if (isOpen) {
        rebuildOptions();
      }
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove("open");
      }
    });

    selectEl.addEventListener("change", syncLabelFromSelect);

    rebuildOptions();

    customSelectMap.set(selectEl, { refresh: rebuildOptions });
  }

  // Nếu bạn đang dùng custom select, gọi 2 dòng này
  initCustomSelect(statusSelect);
  initCustomSelect(categorySelect);
  initCustomSelect(styleSelect);

  // ===== Helper =====
  function slugify(str) {
    return str
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // User đã tự sửa slug chưa?
  let slugEditedByUser = false;

  if (slugInput) {
    slugInput.addEventListener("input", () => {
      slugEditedByUser = slugInput.value.trim().length > 0;

      // cập nhật preview slug theo slug người dùng nhập
      const slugVal = slugInput.value.trim();
      const title = titleInput.value.trim();
      if (slugVal) {
        previewSlug.textContent = slugVal;
      } else {
        previewSlug.textContent = title ? slugify(title) : "slug-bai-viet";
      }
    });
  }

  // ===== Preview ảnh cover =====
  if (coverInput && coverPreview) {
    coverInput.addEventListener("change", () => {
      const file = coverInput.files[0];
      if (!file) {
        coverPreview.innerHTML = "";
        return;
      }

      const url = URL.createObjectURL(file);
      coverPreview.innerHTML = `<img src="${url}" alt="Ảnh cover" />`;
    });
  }

  // ===== Preview basic fields =====
  function updateTitle() {
    const title = titleInput.value.trim();
    previewTitle.textContent = title || "Tiêu đề bài viết";
    // nếu user chưa tự sửa slug → auto sinh theo title
    if (slugInput && !slugEditedByUser) {
      const autoSlug = title ? slugify(title) : "";
      slugInput.value = autoSlug;
      previewSlug.textContent = autoSlug || "slug-bai-viet";
    } else if (slugInput) {
      // user đã sửa slug → ưu tiên slug user nhập
      const slugVal = slugInput.value.trim();
      previewSlug.textContent =
        slugVal || (title ? slugify(title) : "slug-bai-viet");
    } else {
      // fallback nếu không có ô slug
      previewSlug.textContent = title ? slugify(title) : "slug-bai-viet";
    }
  }
  function updateExcerpt() {
    const excerpt = excerptInput.value.trim();
    previewSummary.textContent = excerpt || "Chưa có tóm tắt";
  }

  function updateStatus() {
    const status = statusSelect.value || "draft";
    previewStatus.textContent = status;
  }

  function updateContent() {
    const value = contentInput.value.trim();

    // Xử lý phần tóm tắt / fallback text như cũ
    if (!value) {
      if (!excerptInput.value.trim()) {
        previewSummary.textContent = "Chưa có tóm tắt.";
      }
    } else {
      if (!excerptInput.value.trim()) {
        previewSummary.textContent =
          value.length > 80 ? value.slice(0, 77) + "..." : value;
      }
    }

    // 🔥 Render Markdown -> HTML cho preview bên phải
    if (typeof marked !== "undefined") {
      previewContent.innerHTML = value
        ? marked.parse(value)
        : "<em>Nội dung xem trước sẽ hiện ở đây.</em>";
    } else {
      // fallback nếu vì lý do gì đó chưa load được marked
      previewContent.textContent = value || "Nội dung xem trước sẽ hiện ở đây.";
    }
  }

  titleInput.addEventListener("input", updateTitle);
  excerptInput.addEventListener("input", updateExcerpt);
  statusSelect.addEventListener("change", updateStatus);
  contentInput.addEventListener("input", updateContent);

  // ===== Category: load từ API + sync hidden + preview =====
  // async function loadCategories() {
  //   if (!categorySelect) return;
  //   try {
  //     const res = await fetch("/api/categories");
  //     const data = await res.json();

  //     categorySelect.innerHTML = '<option value="">-- Chọn chủ đề --</option>';

  //     data.forEach((cat) => {
  //       const opt = document.createElement("option");
  //       opt.value = cat.category_id;
  //       opt.textContent = cat.name;
  //       categorySelect.appendChild(opt);
  //     });

  //     const custom = customSelectMap.get(categorySelect);
  //     if (custom && typeof custom.refresh === "function") {
  //       custom.refresh();
  //     }
  //   } catch (err) {
  //     console.error("Lỗi load categories:", err);
  //   }
  // }

  // function syncCategoryFromSelect() {
  //   if (!categorySelect || !categoryIdsInput) return;

  //   const selectedValue = categorySelect.value;
  //   const selectedText =
  //     categorySelect.options[categorySelect.selectedIndex]?.textContent || "";

  //   if (!selectedValue) {
  //     categoryIdsInput.value = "";
  //     previewCategoryIds.textContent = "–";
  //   } else {
  //     categoryIdsInput.value = selectedValue;
  //     previewCategoryIds.textContent = selectedText;
  //   }
  // }

  async function loadCategories() {
    if (!categorySelect) return;
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();

      categorySelect.innerHTML = '<option value="">-- Chọn chủ đề --</option>';

      data.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.category_id;
        opt.textContent = cat.name;
        categorySelect.appendChild(opt);
      });

      const custom = customSelectMap.get(categorySelect);
      if (custom && typeof custom.refresh === "function") {
        custom.refresh();
      }
    } catch (err) {
      console.error("Lỗi load categories:", err);
    }
  }

  function updateCategoryHiddenInput() {
    if (!categoryIdsInput) return;
    const ids = selectedCategories.map((c) => c.id);
    categoryIdsInput.value = ids.join(",");
  }

  // function renderCategoryChips() {
  //   // Preview bên phải
  //   if (previewCategoryIds) {
  //     previewCategoryIds.innerHTML = "";
  //     if (selectedCategories.length === 0) {
  //       previewCategoryIds.textContent = "–";
  //     } else {
  //       selectedCategories.forEach((cat) => {
  //         const chip = document.createElement("span");
  //         chip.className = "cat-pill";
  //         chip.dataset.id = cat.id;
  //         chip.innerHTML = `
  //           ${cat.name}
  //           <button type="button" class="cat-remove" data-id="${cat.id}"><i class="fa-solid fa-x"></i></button>
  //         `;
  //         previewCategoryIds.appendChild(chip);
  //       });
  //     }
  //   }

  //   // Card subtitle
  //   if (cardCategories) {
  //     cardCategories.innerHTML = "";
  //     if (selectedCategories.length > 0) {
  //       selectedCategories.forEach((cat) => {
  //         const chip = document.createElement("span");
  //         chip.className = "cat-pill";
  //         chip.dataset.id = cat.id;
  //         chip.innerHTML = `
  //           ${cat.name}
  //           <button type="button" class="cat-remove" data-id="${cat.id}"><i class="fa-solid fa-x"></i></button>
  //         `;
  //         cardCategories.appendChild(chip);
  //       });
  //     }
  //   }
  // }

  function handleCategorySelectChange() {
    if (!categorySelect) return;

    const value = categorySelect.value;
    if (!value) return;

    const id = Number(value);
    const name =
      categorySelect.options[categorySelect.selectedIndex]?.textContent || "";

    if (!id || !name) return;

    if (!selectedCategories.some((c) => c.id === id)) {
      selectedCategories.push({ id, name });
      updateCategoryHiddenInput();
      renderCategoryChips();
    }

    // reset select về placeholder
    categorySelect.value = "";
    const custom = customSelectMap.get(categorySelect);
    if (custom && typeof custom.refresh === "function") {
      custom.refresh();
    }
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", handleCategorySelectChange);
    loadCategories();
  }

  function handleCategoryChipClick(event) {
    const removeBtn = event.target.closest(".cat-remove");
    if (!removeBtn) return;

    const id = Number(removeBtn.dataset.id);
    if (!id) return;

    selectedCategories = selectedCategories.filter((c) => c.id !== id);
    updateCategoryHiddenInput();
    renderCategoryChips();
  }

  if (previewCategoryIds) {
    previewCategoryIds.addEventListener("click", handleCategoryChipClick);
  }
  if (cardCategories) {
    cardCategories.addEventListener("click", handleCategoryChipClick);
  }

  // function handleCategorySelectChange() {
  //   if (!categorySelect) return;

  //   const value = categorySelect.value;
  //   if (!value) return;

  //   const id = Number(value);
  //   const name =
  //     categorySelect.options[categorySelect.selectedIndex]?.textContent || "";

  //   if (!id || !name) return;

  //   // Không thêm trùng
  //   if (!selectedCategories.some((c) => c.id === id)) {
  //     selectedCategories.push({ id, name });
  //     updateCategoryHiddenInput();
  //     renderCategoryChips();
  //   }

  //   // Reset select về placeholder để chọn tiếp
  //   categorySelect.value = "";

  //   // refresh UI custom-select nếu có
  //   const custom = customSelectMap.get(categorySelect);
  //   if (custom && typeof custom.refresh === "function") {
  //     custom.refresh();
  //   }
  // }
  // if (categorySelect) {
  //   categorySelect.addEventListener("change", handleCategorySelectChange);
  //   loadCategories(); // chỉ load list, KHÔNG gọi syncCategoryFromSelect nữa
  // }

  // if (categorySelect) {
  //   categorySelect.addEventListener("change", syncCategoryFromSelect);
  //   loadCategories().then(syncCategoryFromSelect);
  // }

  // ===== Tags: autocomplete @tag + auto-create nếu chưa có =====
  let allTags = [];
  let selectedTagIds = [];

  async function loadTags() {
    try {
      const res = await fetch("/api/tags");
      let data = await res.json();
      // đảm bảo tag_id là số
      allTags = data.map((t) => ({
        ...t,
        tag_id: Number(t.tag_id),
      }));
      console.log("Loaded tags:", allTags);
    } catch (err) {
      console.error("Lỗi load tags:", err);
    }
  }

  function updateTagHiddenAndPreview() {
    tagIdsInput.value = selectedTagIds.join(",");

    previewTags.innerHTML = "";
    selectedTagIds.forEach((id) => {
      const tag = allTags.find((t) => t.tag_id === id);
      if (!tag) return;
      const span = document.createElement("span");
      span.className = "tag-pill";
      span.textContent = `@${tag.tag_name}`;
      previewTags.appendChild(span);
    });
  }

  function renderTagSuggestions(list) {
    tagSuggestions.innerHTML = "";
    if (!list.length) {
      tagSuggestions.classList.add("hidden");
      return;
    }

    list.forEach((tag) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.textContent = tag.tag_name;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        applyTagSuggestion(tag);
      });
      tagSuggestions.appendChild(item);
    });

    tagSuggestions.classList.remove("hidden");
  }

  function applyTagSuggestion(tag) {
    const id = Number(tag.tag_id);
    if (!selectedTagIds.includes(id)) {
      selectedTagIds.push(id);
    }

    const value = tagTextInput.value;
    const caretPos = tagTextInput.selectionStart;
    const beforeCaret = value.slice(0, caretPos);
    const afterCaret = value.slice(caretPos);

    const atIndex = beforeCaret.lastIndexOf("@");
    const beforeAt = beforeCaret.slice(0, atIndex);

    const inserted = `${beforeAt}@${tag.tag_name} `;
    tagTextInput.value = inserted + afterCaret;

    const newPos = inserted.length;
    tagTextInput.setSelectionRange(newPos, newPos);

    tagSuggestions.classList.add("hidden");
    updateTagHiddenAndPreview();
  }

  function handleTagInput() {
    const value = tagTextInput.value;
    const caretPos = tagTextInput.selectionStart;
    const beforeCaret = value.slice(0, caretPos);

    const atIndex = beforeCaret.lastIndexOf("@");
    if (atIndex === -1) {
      tagSuggestions.classList.add("hidden");
      return;
    }

    const query = beforeCaret
      .slice(atIndex + 1)
      .trim()
      .toLowerCase();
    console.log("tag query:", query);

    if (!query) {
      renderTagSuggestions(allTags);
      return;
    }

    const filtered = allTags.filter((t) => {
      const name = t.tag_name.toLowerCase();
      const slug = (t.slug || "").toLowerCase();
      return name.includes(query) || slug.includes(query);
    });

    renderTagSuggestions(filtered);
  }

  // Tạo tag mới nếu chưa có trong DB, trả về object tag mới
  async function createTagIfNotExists(name) {
    const existing = allTags.find(
      (t) => t.tag_name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_name: name }),
      });
      if (!res.ok) throw new Error("Không tạo được tag");
      const tag = await res.json();
      const normalized = {
        ...tag,
        tag_id: Number(tag.tag_id),
      };
      allTags.push(normalized);
      return normalized;
    } catch (err) {
      console.error("Lỗi tạo tag mới:", err);
      return null;
    }
  }

  // Đọc text trong ô, tìm tất cả @tagName, đảm bảo mỗi tag có id
  async function ensureTagsFromInput() {
    const text = tagTextInput.value || "";
    const regex = /@([\p{L}0-9-_]+)/gu;
    const names = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim();
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }

    for (const name of names) {
      const tag = await createTagIfNotExists(name);
      if (!tag) continue;
      const id = Number(tag.tag_id);
      if (!selectedTagIds.includes(id)) {
        selectedTagIds.push(id);
      }
    }

    updateTagHiddenAndPreview();
  }

  if (tagTextInput) {
    loadTags();
    tagTextInput.addEventListener("input", handleTagInput);

    document.addEventListener("click", (e) => {
      if (!tagInputWrapper.contains(e.target)) {
        tagSuggestions.classList.add("hidden");
      }
    });
  }

  // ===== Reset form =====
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      form.reset();

      // Reset categories
      selectedCategories = [];
      updateCategoryHiddenInput();
      renderCategoryChips();

      // if (categorySelect) {
      //   categorySelect.value = "";
      //   syncCategoryFromSelect();
      // }
      if (categorySelect) {
        categorySelect.value = "";
        const custom = customSelectMap.get(categorySelect);
        if (custom && typeof custom.refresh === "function") {
          custom.refresh();
        }
      }

      selectedTagIds = [];
      if (tagTextInput) tagTextInput.value = "";
      updateTagHiddenAndPreview();

      updateTitle();
      updateExcerpt();
      updateStatus();
      updateContent();
    });
  }

  // ===== Theme toggle =====
  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
      if (themeToggle)
        themeToggle.innerHTML = `<i class="fa-solid fa-sun"></i>`;
    } else {
      document.body.classList.remove("dark-mode");
      if (themeToggle)
        themeToggle.innerHTML = `<i class="fa-solid fa-moon"></i>`;
    }
  }

  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const newTheme = document.body.classList.contains("dark-mode")
        ? "light"
        : "dark";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    });
  }

  // ===== Submit + loading + show preview card =====
  if (form) {
    form.addEventListener("submit", async (e) => {
      // 🔥 AUTO-GENERATE EXCERPT IF EMPTY BEFORE SEND TO SERVER
      if (!excerptInput.value.trim()) {
        const contentValue = contentInput.value.trim();
        const autoExcerpt =
          contentValue.length > 150
            ? contentValue.slice(0, 147) + "..."
            : contentValue;

        excerptInput.value = autoExcerpt;
        console.log("AUTO EXCERPT SET:", autoExcerpt);
      }

      e.preventDefault();

      // đảm bảo sinh tag mới nếu cần
      await ensureTagsFromInput();

      // bật section preview & loading
      previewSection.classList.remove("hidden");
      previewLoading.classList.remove("hidden");

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Đang xuất bản...";
      }

      // cập nhật preview card
      updateTitle();
      updateExcerpt();
      updateStatus();
      updateContent();
      // syncCategoryFromSelect();
      updateTagHiddenAndPreview();

      try {
        const formData = new FormData(form);
        const body = new URLSearchParams(formData);

        await fetch("/posts/new", {
          method: "POST",
          body,
        });
      } catch (err) {
        console.error("Lỗi khi xuất bản:", err);
      } finally {
        previewLoading.classList.add("hidden");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Xuất bản";
        }
      }
    });
  }

  // ===== Modal preview (nút ▶ Xem trước) =====
  if (previewBtn) {
    previewBtn.addEventListener("click", async () => {
      // đảm bảo tag mới cũng được tạo / mapping id trước khi xem preview
      await ensureTagsFromInput();

      updateTitle();
      updateExcerpt();
      updateStatus();
      updateContent();
      // syncCategoryFromSelect();
      updateTagHiddenAndPreview();

      mTitle.textContent = previewTitle.textContent;
      mSlug.textContent = previewSlug.textContent;
      mStatus.textContent = previewStatus.textContent;
      mCategory.textContent = previewCategoryIds.textContent;
      mContent.textContent = previewContent.textContent;

      mContent.innerHTML =
        typeof marked !== "undefined"
          ? marked.parse(contentInput.value.trim() || "Nội dung xem trước…")
          : previewContent.textContent || "Nội dung xem trước…";

      mTags.innerHTML = "";
      previewTags.querySelectorAll(".tag-pill").forEach((t) => {
        mTags.appendChild(t.cloneNode(true));
      });

      modal.classList.remove("hidden");
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  // Markdown editor
  // ===== Markdown editor =====
  (function () {
    const textarea = document.getElementById("content");
    const toolbar = document.getElementById("md-toolbar");
    if (!textarea || !toolbar) return;

    function wrapSelection(before, after) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const selected = value.slice(start, end);
      const newText = before + selected + after;

      textarea.value = value.slice(0, start) + newText + value.slice(end);
      const cursor = start + before.length + selected.length;
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = cursor;
    }

    // B/I/S: nếu bôi đen -> quấn, nếu không -> chèn cặp token và đặt caret ở giữa
    function applyFormat(format) {
      const token = format === "bold" ? "**" : format === "italic" ? "_" : "~~";

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selected = value.slice(start, end);

      // Có selection -> quấn
      if (selected) {
        const newText = token + selected + token;
        textarea.value = value.slice(0, start) + newText + value.slice(end);
        const cursor = start + token.length + selected.length;
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = cursor;
        return;
      }

      // Không có selection -> chèn cặp token rồi đặt caret ở giữa
      const pair = token + token;
      textarea.value = value.slice(0, start) + pair + value.slice(end);
      const middle = start + token.length;
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = middle;
    }

    function applyHeading(level) {
      const start = textarea.selectionStart;
      const value = textarea.value;

      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = value.indexOf("\n", start);
      const endPos = lineEnd === -1 ? value.length : lineEnd;

      const line = value.slice(lineStart, endPos);

      let prefix = "";
      if (level === "h1") prefix = "# ";
      else if (level === "h2") prefix = "## ";
      else if (level === "h3") prefix = "### ";

      let newLine = line.replace(/^(#+\s*)?/, "");
      if (prefix) newLine = prefix + newLine;

      textarea.value =
        value.slice(0, lineStart) + newLine + value.slice(endPos);

      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd =
        lineStart + newLine.length;
    }

    function insertList(prefix, ordered = false) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const block = value.slice(start, end) || "mục 1\nmục 2";
      const lines = block.split("\n");

      const newLines = lines.map((line, idx) => {
        const numPrefix = ordered ? idx + 1 + ". " : prefix;
        if (!line.trim()) return numPrefix;
        return numPrefix + line.replace(/^(\d+\.\s+|-+\s+|\*\s+)/, "");
      });

      const newText = newLines.join("\n");

      textarea.value = value.slice(0, start) + newText + value.slice(end);
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = start + newText.length;
    }

    function insertLink(type) {
      const url = prompt("Nhập URL:");
      if (!url) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const selected = value.slice(start, end) || "link";
      let md = "";

      if (type === "image") {
        md = "![" + selected + "](" + url + ")";
      } else if (type === "audio") {
        md = "[Audio](" + url + ")";
      } else if (type === "video") {
        md = "[Video](" + url + ")";
      } else {
        md = "[" + selected + "](" + url + ")";
      }

      textarea.value = value.slice(0, start) + md + value.slice(end);
      const cursor = start + md.length;
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = cursor;
    }

    function insertCodeBlock() {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const selected = value.slice(start, end) || "code";
      const md = "```\n" + selected + "\n```";

      textarea.value = value.slice(0, start) + md + value.slice(end);
      const cursor = start + md.length;
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = cursor;
    }

    function insertQuote() {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const block = value.slice(start, end) || "Trích dẫn...";
      const lines = block.split("\n");
      const newText = lines.map((l) => "> " + l).join("\n");

      textarea.value = value.slice(0, start) + newText + value.slice(end);
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = start + newText.length;
    }

    // ============ Popup Elements ============
    const linkPopup = document.getElementById("md-link-popup");
    const linkText = document.getElementById("md-link-text");
    const linkUrl = document.getElementById("md-link-url");
    const linkInsert = document.getElementById("md-link-insert");
    const linkCancel = document.getElementById("md-link-cancel");

    // ========= Open popup =========
    function openLinkPopup() {
      linkPopup.classList.remove("hidden");
      linkText.value = "";
      linkUrl.value = "";
      linkText.focus();
    }
    // ========= Close popup =========
    function closeLinkPopup() {
      linkPopup.classList.add("hidden");
    }

    // ========= Insert link =========
    linkInsert.addEventListener("click", () => {
      const text = linkText.value.trim() || "link";
      const url = linkUrl.value.trim();

      if (!url) {
        alert("URL không được để trống!");
        return;
      }

      const md = `[${text}](${url})`;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      textarea.value = value.slice(0, start) + md + value.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + md.length;

      textarea.focus();
      closeLinkPopup();
    });

    linkCancel.addEventListener("click", closeLinkPopup);

    // ========= Insert image =========
    const imagePicker = document.getElementById("md-image-picker");

    imagePicker.addEventListener("change", () => {
      const file = imagePicker.files[0];
      if (!file) return;

      // TẠO URL TẠM (blob:)
      const url = URL.createObjectURL(file);

      // Markdown ảnh
      const md = `![image](${url})`;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      textarea.value = value.slice(0, start) + md + value.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + md.length;
      textarea.focus();
    });

    toolbar.addEventListener("click", function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;

      const action = btn.dataset.action;
      const format = btn.dataset.format;
      const before = btn.dataset.before;
      const after = btn.dataset.after;

      // Các nút dùng before/after (hiện tại bạn không dùng cho B/I/S nữa)
      if (before !== undefined || after !== undefined) {
        wrapSelection(before || "", after || "");
        return;
      }

      // B / I / S
      if (format) {
        applyFormat(format);
        return;
      }

      switch (action) {
        case "undo":
          textarea.focus();
          document.execCommand("undo");
          break;
        case "redo":
          textarea.focus();
          document.execCommand("redo");
          break;
        case "code":
          insertCodeBlock();
          break;
        case "link":
          openLinkPopup();
          break;

        case "image":
          document.getElementById("md-image-picker").click();
          break;

        case "audio":
          insertLink("audio");
          break;
        case "video":
          insertLink("video");
          break;
        case "quote":
          insertQuote();
          break;
        case "ul":
          insertList("- ");
          break;
        case "ol":
          insertList("", true);
          break;
      }
    });

    // xử lý select Style
    const styleSelect = toolbar.querySelector('select[data-action="style"]');
    if (styleSelect) {
      styleSelect.addEventListener("change", function () {
        const val = this.value;
        if (!val) return;
        if (val === "p") {
          applyHeading(""); // chỉ để bỏ prefix cũ
        } else {
          applyHeading(val);
        }
        this.value = "";
      });
    }
  })();

  // Init preview lần đầu
  updateTitle();
  updateExcerpt();
  updateStatus();
  updateContent();
});
