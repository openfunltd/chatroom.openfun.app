import { Router } from 'express'
import { RoomManager } from '../room/RoomManager.js'

const router = Router()
const roomManager = RoomManager.getInstance()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

router.get('/rooms', (_req, res) => {
  res.json(roomManager.listRooms())
})

router.get('/rooms/:name', (req, res) => {
  const room = roomManager.get(req.params.name)
  if (!room) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  res.json(room.toInfo())
})

export default router
