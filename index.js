require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const urlparser = require("urlparser");
const dns = require("dns");
const {Schema} = mongoose;

// Basic Configuration
const port = process.env.PORT || 3000;

const app = express();

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.DB_URL)

// Define schema for URL collection
const UserSchema = new mongoose.Schema({
  username: String,
});
const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});

const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(`${process.cwd()}/public`));

// Root path handler
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/users", async(req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("No users");
  } else {
    res.json(users);
  }
})

app.post("/api/users", async(req, res) => {
  console.log(req.body)
  const userObj = new User({
    username: req.body.username
  })

  try {
    const user = await userObj.save()
    console.log(user);
    res.json(user)
  } catch (error) {
    console.log(error)
  }
})

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body
  try {
    const user = await User.findById(id)
    if (!user) {
      res.send("could not find user");
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      const exercise = await exerciseObj.save()
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      })
    }
  } catch(err) {
    console.log(err);
    res.send("There was an error saving exercise");
  }
})

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if(!user) {
    res.send("Could not find user")
    return;
  }
  let dateObj = {}
  if (from) {
    dateObj["$gte"] = new Date(from)
  }
  if (to){
    dateObj["$lte"] = new Date(to)
  }
  let filter = {
    user_id: id
  }
  if(from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(+limit ?? 500)

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})

app.listen(port, () => {
  console.log("Your app is listening on port " + port);
});
