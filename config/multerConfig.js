import multer from "multer";

// Base multer configuration
const storage = multer.memoryStorage();

// Create multer instances with different configurations
export const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    try {
      if (!file || !file.mimetype) {
        cb(new Error('Invalid file object'), false);
        return;
      }
      
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    } catch (err) {
      cb(new Error(`File validation error: ${err.message}`), false);
    }
  }
});

export const gameFileUpload = multer({
  storage,
  limits: {
    fileSize: 250 * 1024 * 1024 // 250MB limit for game files
  },
  fileFilter: (req, file, cb) => {
    try {
      if (!file || !file.mimetype) {
        cb(new Error('Invalid file object'), false);
        return;
      }
      
      // Accept any file type - no restrictions
      cb(null, true);
    } catch (err) {
      cb(new Error(`File validation error: ${err.message}`), false);
    }
  }
});

export const artworkUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for artwork
  },
  fileFilter: (req, file, cb) => {
    try {
      if (!file || !file.mimetype) {
        cb(new Error('Invalid file object'), false);
        return;
      }
      
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    } catch (err) {
      cb(new Error(`File validation error: ${err.message}`), false);
    }
  }
});

export const htmlFileUpload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit for HTML files
  },
  fileFilter: (req, file, cb) => {
    try {
      if (!file || !file.mimetype) {
        cb(new Error('Invalid file object'), false);
        return;
      }
      
      // Accept HTML files
      const validMimeTypes = ['text/html', 'application/octet-stream'];
      const fileName = file.originalname.toLowerCase();
      
      if (validMimeTypes.includes(file.mimetype) || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        cb(null, true);
      } else {
        cb(new Error('Only HTML files (.html, .htm) are allowed!'), false);
      }
    } catch (err) {
      cb(new Error(`File validation error: ${err.message}`), false);
    }
  }
});

// Improved error handler middleware for multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle specific Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size is too large (maximum 250MB)'
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field or file type'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  }
  
  // If it's another type of error but related to file upload
  if (err && err.message && (
    err.message.includes('File validation') ||
    err.message.includes('Invalid file')
  )) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  // Pass other errors to the next error handler
  next(err);
};
