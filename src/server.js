import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

// get config from .env file, and pass to process.env Object
dotenv.config()
// init express app
const app = express()
// create server http express
const httpServer = createServer(app)
// creact socketio for server
const io = new Server(httpServer, {
  // option Server socket.io 

  // Name of the path to capture
  // path: '/socket-io',
  // The number of ms before disconnecting a client that has not successfully joined a namespace.
  connectTimeout: 45000,
  // This value is used in the heartbeat mechanism, which periodically checks if the connection is still alive between the server and the client.
  // The server sends a ping, and if the client does not answer with a pong within pingTimeout ms, the server considers that the connection is closed.
  // Similarly, if the client does not receive a ping from the server within pingInterval + pingTimeout ms, the client also considers that the connection is closed.
  pingTimeout: 30000,
  pingInterval: 25000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Global
const users = {}

const socketToRoom = {}
const MAX_USER_ROOM = 2
io.on("connection", (socket) => {
  console.log(`connection created with socketID: ${socket.id}`)

  // handle when a peer signal x_join_room event
  socket.on("x_join_room", (roomID, userID="") => {
    console.log(`User ${userID} want to join room ${roomID}`)
    if (users[roomID]){ // room created!
      const length = users[roomID].length;
      if (length === MAX_USER_ROOM){
        console.log('room full!');
        socket.emit("room_full");
        return;
      }
      // add current socket to room
      users[roomID].push(socket.id);
    } else { // room isn't created!
      console.log(`create new room with name ${socket.id}`)
      users[roomID] = [socket.id]
    }
    socketToRoom[socket.id] = roomID;
    const usersInRoom = users[roomID].filter(id => id !== socket.id)
    // return signal knowledge of others in room
    socket.emit("all_users", usersInRoom)
  })

  // send user_joined event to callerID
  socket.on("sending_signal", (payload) => {
    io.to(payload.userToSignal).emit("user_joined", {
      signal: payload.signal,
      callerID: payload.callerID
    })
  })

  // send receiving_returned_singal event to calledID
  socket.on("returning_signal", (payload) => {
    io.to(payload.callerID).emit("receiving_returned_singal", {
      signal: payload.signal,
      id: socket.id
    })
  })

  // handle when a user disconnect
  socket.on("disconnect", () => {
    console.log(`user ${socket.id} disconnected.`)
    const roomID = socketToRoom[socket.id];
    let room = users[roomID]
    if (room){
      // delete user disconnect from room
      room = room.filter(id => id !== socket.id);
      users[roomID] = room;
    }
  })

})

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`server is running on port: ${PORT}`))