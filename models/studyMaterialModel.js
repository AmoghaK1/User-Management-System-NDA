const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'pdf'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  category: {
    type: String,         
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: [
      'Senior Batch',
      'Prarambhik',
      'Praveshika Pratham',
      'Praveshika Purna',
      'Madhyama Pratham',
      'Madhyama Purna',
      'Visharad Pratham',
      'Visharad Purna',
      'Alankar Pratham',
      'Alankar Purna'
    ],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
