const jwt = require('jsonwebtoken')
const env = require('../config/env')
const User = require('../models/User')

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: '8h' },
  )
}

async function login(req, res, next) {
  const { username, password } = req.body

  try {
    const user = await User.findOne({ username, isActive: true })

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Pogrešno korisničko ime ili lozinka.' })
      return
    }

    res.json({
      token: signToken(user),
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
}

function me(req, res) {
  res.json({
    user: req.user,
  })
}

module.exports = {
  login,
  me,
}
