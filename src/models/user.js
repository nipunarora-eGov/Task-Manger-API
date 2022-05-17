const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0)
                throw new Error('Age cannot be less than zero')
        }
    },
    email: {
        type: String,
        required: true,
        unique:true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value))
                throw new Error('Email is Invalid')
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value) {
            if (value.toLowerCase().includes('password'))
                throw new Error('Password cannot contain the string password')
        }
    },
    tokens:[{
        token:{
            type: String,
            required:true
        }
    }],
    avatar: {
        type:Buffer
    }
},{
    timestamps:true
})

userSchema.virtual('tasks',{
    ref:'Task',
    localField:'_id',
    foreignField:'owner'
})

userSchema.methods.toJSON = function() {
    const user = this;
    
    //we want an obj with just user data

    const userObject = user.toObject()
    delete userObject.password
    delete userObject.tokens
    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({_id:user._id.toString()},process.env.JWT_SECRET)

    user.tokens = user.tokens.concat({
        token
    })
    await user.save()
    return token
}

userSchema.statics.findByCreds = async (email,password) => {
    const user = await User.findOne({email})

    if(!user) throw new Error('Unable to login')

    const isMatch = await bcrypt.compare(password,user.password)

    if(!isMatch) throw new Error('Unable to login')

    return user
}

//Middleware whenever we are running user.save this code will run before that
//2nd arg cannot be an arrow func because this binding will be used and => fns don't have this
//hash pass before saving 
userSchema.pre('save',async function (next) {
    const user = this

    if(user.isModified('password')){
        user.password = await bcrypt.hash(user.password,8)
    }

    next()
})

//delete user tasks when user is removed

userSchema.pre('remove',async function (next) {
    const user = this 
    const Task = mongoose.model('Task')
    await Task.deleteMany({owner:user._id})
    next()
})

const User = mongoose.model('User',userSchema)

module.exports = User