import express from 'express'
import cors from 'cors'
import { projectsRouter } from './routes/projects'
import { storiesRouter } from './routes/stories'
import { materialsRouter } from './routes/materials'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/projects', projectsRouter)
app.use('/api/projects', storiesRouter)
app.use('/api/projects', materialsRouter)

const port = parseInt(process.env.PORT || '9528')
app.listen(port, () => {
  console.log(`Cloud Server running on http://localhost:${port}`)
})
