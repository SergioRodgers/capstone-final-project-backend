require("dotenv").config;
const auth = require('./auth');
const bcrypt = require('bcrypt')
const User = require('../models/User');
const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");

const {
  verifyToken,
  verifyTokenAndAuthorization,
  verifyTokenAndAdmin,
} = require("./verifyToken");

//create user   
router.post('/', async (req, res) => {

  const{ username, email, password } = req.body;
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt)

     const user = new User({
         username,
         email,
         password: hashedPassword,
          
     })
  try {
 const newUser = await user.save()
 res.status(201).json(newUser);

 try{
   const access_token = jwt.sign(
     JSON.stringify(newUser),
     process.env.PASS_SEC
   );
 } catch (err){
   res.status(500).json({ message: error.message });
 }
     } catch (err) {
         res.status(400).json({ message:err.message})
     }
})


//UPDATE
router.put("/:id", async (req, res) => {
  if (req.body.password) {
    req.body.password = CryptoJS.AES.encrypt(
      req.body.password,
      process.env.PASS_SEC
    ).toString();
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

//DELETE
router.delete("/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json("User has been deleted...");
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET USER
router.get("/find/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET ALL USER
router.get("/", async (req, res) => {
  const query = req.query.new;
  try {
    const users = query
      ? await User.find().sort({ _id: -1 }).limit(5)
      : await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET USER STATS

router.get("/stats", async (req, res) => {
  const date = new Date();
  const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));

  try {
    const data = await User.aggregate([
      { $match: { createdAt: { $gte: lastYear } } },
      {
        $project: {
          month: { $month: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$month",
          total: { $sum: 1 },
        },
      },
    ]);
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json(err);
  }
});

  // LOGIN user with email + password
router.patch("/", async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) res.status(404).json({ message: "Could not find user" });
  if (await bcrypt.compare(password, user.password)) {
    try {
      const access_token = jwt.sign(
        JSON.stringify(user),
        process.env.JWT_SEC
      );
      res.status(201).json({ jwt: access_token });
    } catch (error) {
      res.status(500).json({ message: error.message }); 
    }
  } else {
    res
      .status(400)
      .json({ message: "Email and password combination do not match" });
  }
});

module.exports = router;
