const mongoose = require('mongoose');

/**
 * Image model for storing images in MongoDB
 * This provides persistent storage that survives server restarts
 * without relying on external services like Cloudinary
 */
const imageSchema = new mongoose.Schema(
  {
    // Unique identifier for the image
    imageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Original filename
    filename: {
      type: String,
      required: true,
    },
    // MIME type (e.g., 'image/png', 'image/jpeg')
    mimeType: {
      type: String,
      required: true,
    },
    // Image data as base64 string
    data: {
      type: String,
      required: true,
    },
    // Size in bytes
    size: {
      type: Number,
      required: true,
    },
    // Who uploaded the image
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Optional: Category for organizing images (e.g., 'success-stories', 'testimonials', 'general')
    category: {
      type: String,
      default: 'general',
    },
    // Optional: Alt text for accessibility
    altText: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
imageSchema.index({ createdAt: -1 });
imageSchema.index({ category: 1 });

// Method to get the data URL for the image
imageSchema.methods.toDataURL = function() {
  return `data:${this.mimeType};base64,${this.data}`;
};

// Static method to generate a unique image ID
imageSchema.statics.generateImageId = function() {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Static method to delete by imageId
imageSchema.statics.deleteByImageId = async function(imageId) {
  return this.deleteOne({ imageId });
};

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
