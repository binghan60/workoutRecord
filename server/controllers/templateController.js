import Template from '../models/templateModel.js'

// Get all templates for the logged-in user
export const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.find({ user: req.user.id })
    res.status(200).json(templates)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Add a new template for the logged-in user
export const addTemplate = async (req, res) => {
  try {
    const newTemplate = new Template({
      ...req.body,
      user: req.user.id,
    })
    await newTemplate.save()
    res.status(201).json(newTemplate)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Update a template, ensuring it belongs to the logged-in user
export const updateTemplate = async (req, res) => {
  try {
    const template = await Template.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, { new: true })
    if (!template) {
      return res.status(404).json({ message: 'Template not found or user not authorized' })
    }
    res.status(200).json(template)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Delete a template, ensuring it belongs to the logged-in user
export const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!template) {
      return res.status(404).json({ message: 'Template not found or user not authorized' })
    }
    res.status(200).json({ message: 'Template deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
