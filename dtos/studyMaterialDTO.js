class StudyMaterialDTO {
  constructor({ _id, title, type, url, category, level, createdAt }) {
    this._id = _id;
    this.title = title;
    this.type = type;
    this.url = url;
    this.category = category;
    this.level = level;
    this.createdAt = createdAt;
  }
}

module.exports = StudyMaterialDTO;
