const express = require('express')
const { updateDocuments } = require('mongodb/lib/operations/collection_ops')
const auth = require('../middleware/auth')
const router = new express.Router()
const Task = require('../models/Task')

router.post('/tasks',auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        owner:req.user._id
    })
    try {
        await task.save()
        res.status(201).send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

//GET /tasks?completed=true/false&limit=numberOfResults&skip=(no of results to skip like if set to 20 skip 2 pages and get third)&sortBy=createdAt_desc/asc
router.get('/tasks', auth ,async (req, res) => {
    const match={}
    const sort = {}

    //req.query.completed is a string
    if(req.query.completed){
        match.completed = (req.query.completed === 'true')
    }
    if(req.query.sortBy){
        const parts = req.query.sortBy.split('_')
        sort[parts[0]] = parts[1]==='desc'? -1: 1;
    }    
    try {
        // const tasks = await Task.find({owner:req.user._id})
        // res.send(tasks)
        //another way
        await req.user.populate({
            path:'tasks',
            match,
            options:{
                limit: parseInt(req.query.limit ? req.query.limit:10),
                skip: parseInt(req.query.skip),
                sort
            },
        }).execPopulate()
        res.send(req.user.tasks)
    } catch (error) {
        res.status(500).send(error)
    }
})

router.get('/tasks/:id',auth, async (req, res) => {
    const _id = req.params.id;

    try {
        const task = await Task.findOne({_id,owner:req.user._id})
        if (!task) return res.status(404).send()
        res.send(task)
    } catch (error) {
        res.status(500).send(error)
    }
})

router.patch('/tasks/:id',auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['completed', 'description']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: "Invalid Update exists!!" })
    }
    try {
        const task = await Task.findById({_id:req.params.id,owner:req.user._id})
        if (!task) return res.status(404).send()

        updates.forEach(update => task[update] = req.body[update])
        await task.save()
        res.send(task)
    } catch (error) {
        res.status(400).send(error)
    }
})

router.delete('/tasks/:id',auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({_id:req.params.id,owner:req.user._id})

        if (!task) return res.status(404).send()

        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})


module.exports = router