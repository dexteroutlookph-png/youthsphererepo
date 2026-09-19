const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadBase64 = async (base64, folder = 'youthsphere') => {
  if (!base64 || typeof base64 !== 'string') {
    return null;
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured.');
  }

  try {
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error.message);
    throw new Error('Media upload failed.');
  }
};

module.exports = {
  cloudinary,
  uploadBase64
};
