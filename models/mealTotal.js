// models/mealTotal.js
const mongoose = require('mongoose');

const mealTotalSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  totalMeals: { type: Number, required: true },
  mealsLeft: { type: Number, required: true }
});

module.exports = mongoose.model('MealTotal', mealTotalSchema);
