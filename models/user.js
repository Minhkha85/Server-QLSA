const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  manv: { type: String, required: true},
  hoten: { type: String, required: true },
  xuong: { type: String, required: true },
  trangthai: { type: Boolean, required: true },
  ngay: { type: Date, required: true },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
