const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { google } = require('googleapis');
const path = require('path');
const User = require('./models/user');
const MealTotal = require('./models/mealTotal'); // Import the new model
//const ip = 'localhost';
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://minhkha85201:852001@vlh.8nhruy4.mongodb.net/vlh', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});

// Routes for user operations
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const user = new User(req.body);
  const date = req.body.ngay;

  try {
    // Check and decrement the meal total
    const mealTotal = await MealTotal.findOne({ date });
    if (!mealTotal || mealTotal.mealsLeft <= 0) {
      return res.status(400).json({ message: 'No meals available' });
    }

    mealTotal.mealsLeft -= 1;
    await mealTotal.save();

    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/users/:manv', async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate({ manv: req.params.manv }, req.body, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/users/:manv', async (req, res) => {
  try {
    const result = await User.findOneAndDelete({ manv: req.params.manv });
    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/users', async (req, res) => {
  try {
    await User.deleteMany();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Routes for meal totals
app.post('/api/meal-total', async (req, res) => {
  const { date, totalMeals } = req.body;
  try {
    const existingMealTotal = await MealTotal.findOne({ date });
    if (existingMealTotal) {
      return res.status(400).json({ message: 'Total meals for this date have already been set' });
    }

    const newMealTotal = new MealTotal({ date, totalMeals, mealsLeft: totalMeals });
    await newMealTotal.save();
    res.status(201).json(newMealTotal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/meal-total/:date', async (req, res) => {
  try {
    const mealTotal = await MealTotal.findOne({ date: req.params.date });
    if (!mealTotal) {
      return res.status(404).json({ message: 'No meal total found for this date' });
    }
    res.json({
      totalMeals: mealTotal.totalMeals,
      mealsLeft: Math.max(mealTotal.mealsLeft, 0),
      mealsConsumed: mealTotal.totalMeals - Math.max(mealTotal.mealsLeft, 0)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
})

// Google Sheets API Setup
const sheets = google.sheets('v4');

// Use absolute path to specify the service account JSON file
const keyFilePath = path.join(__dirname, 'sever.json');
const auth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Route to export users to Google Sheets
app.post('/api/export', async (req, res) => {
  const { startDate, endDate } = req.body;
  try {
    const authClient = await auth.getClient();
    const spreadsheetId = '1bVkZ_Wubzmx4xnQzQicyOOGntTQXBfblyaZFWpBTzpg'; // Replace with your Google Sheets ID
    const formatDate = (isoDate) => {
      const date = new Date(isoDate);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    let query = {};
    if (startDate && endDate) {
      query.ngay = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.ngay = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.ngay = { $lte: new Date(endDate) };
    }
    const users = await User.find(query);
    const userData = users.map(user => [user.manv, user.hoten, formatDate(user.ngay), user.xuong, user.additionalInfo, user.trangthai ? 'Đã Nhận' : 'Chưa Nhận']);

    const request = {
      spreadsheetId,
      range: 'Sheet1!A1', // Replace with the correct range
      valueInputOption: 'RAW',
      resource: {
        values: [['Mã Nhân viên', 'Họ Tên', 'Ngày', 'Xưởng', 'Ghi Chú', 'Trạng Thái'], ...userData],
      },
      auth: authClient,
    };

    await sheets.spreadsheets.values.update(request);

    res.status(200).json({ message: 'Xuất dữ liệu thành công' });
  } catch (error) {
    console.error('Xuất dữ liệu thất bại', error);
    res.status(500).json({ message: 'Error exporting users to Google Sheets' });
  }
});

app.listen(PORT,'localhost', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});