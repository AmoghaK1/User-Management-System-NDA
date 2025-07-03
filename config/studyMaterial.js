const { cloudinary } = require('./cloudinary'); // reuse existing config
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Study Material Storage Setup
const studyMaterialStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Remove file extension for public_id to avoid issues
    const nameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");
    return {
      folder: 'study_materials',
      resource_type: 'auto', // allows pdfs, images, etc.
      public_id: `${Date.now()}-${nameWithoutExt}`,
      // For PDFs, ensure they're stored as raw files
      raw_convert: file.mimetype === 'application/pdf' ? 'aspose' : undefined
    };
  },
});

// Upload Middleware for study materials
const studyMaterialUpload = multer({
  storage: studyMaterialStorage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: function (req, file, cb) {
    // Check file extension
    const allowedExtensions = /\.(jpeg|jpg|png|pdf)$/i;
    const extname = allowedExtensions.test(file.originalname.toLowerCase());
    
    // Check MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/pdf'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    
    console.log(`File upload rejected - MIME: ${file.mimetype}, Extension: ${file.originalname}`);
    cb(new Error('Only .png, .jpg, .jpeg and .pdf formats allowed!'));
  },
});

module.exports = { studyMaterialUpload };
