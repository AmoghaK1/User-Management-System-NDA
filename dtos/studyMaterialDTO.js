class StudyMaterialDTO {
  constructor({ id, title, type, url, category, level, createdat }) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.url = url;
    this.category = category;
    this.level = level;
    // Ensure createdat is converted to ISO string for frontend
    this.createdAt = createdat ? new Date(createdat).toISOString() : new Date().toISOString();
  }
}

module.exports = StudyMaterialDTO;
