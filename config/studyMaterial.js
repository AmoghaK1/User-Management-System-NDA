const { cloudinary } = require('./cloudinary'); // reuse existing config
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Study Material Storage Setup
const studyMaterialStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'study_materials',
      resource_type: 'auto', // allows pdfs, images, etc.
      public_id: `${Date.now()}-${file.originalname}`
    };
  },
});

// Upload Middleware for study materials
const studyMaterialUpload = multer({
  storage: studyMaterialStorage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 20 MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(file.originalname.toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg, .jpeg and .pdf formats allowed!'));
  },
});

module.exports = { studyMaterialUpload };
