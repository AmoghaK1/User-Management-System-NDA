class StudyMaterialDTO {
  constructor({ title, type, url, category, level, createdAt }) {
    this.title = title;
    this.type = type;
    this.url = url;
    this.category = category;
    this.level = level;
    this.createdAt = createdAt;
  }
}

module.exports = StudyMaterialDTO;
