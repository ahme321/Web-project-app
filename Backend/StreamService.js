const { Server } = require('socket.io');
let io;

function initializeSocketIO(server) {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:8080",
            methods: ["GET", "POST"]
        }
    });

    const streamers = new Map(); // Store active streamers and their usernames
    const listeners = new Map(); // Store active listeners and their usernames

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // When a user starts streaming
        socket.on('start-streaming', ({ streamId, username }) => {
            streamers.set(streamId, { id: socket.id, username });
            socket.join(streamId);
            console.log(`Streamer ${socket.id} started stream ${streamId}`);
        });

        // When a listener wants to join a stream
        socket.on('join-stream', ({ streamId, username }) => {
            const streamer = streamers.get(streamId);
            if (streamer) {
                socket.join(streamId);
                listeners.set(socket.id, { streamId, username });
                
                // Notify everyone in the stream about the new listener
                io.to(streamId).emit('user-joined-stream', {
                    username: username,
                    message: `${username} joined the stream`
                });

                // Send signal to establish WebRTC connection
                io.to(streamer.id).emit('listener-joined', { 
                    listenerId: socket.id,
                    streamId,
                    username
                });
            }
        });

        // Handle WebRTC signaling
        socket.on('signal', ({ to, signal }) => {
            io.to(to).emit('signal', {
                from: socket.id,
                signal
            });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            // If it was a streamer who disconnected
            streamers.forEach((value, key) => {
                if (value.id === socket.id) {
                    // Notify all listeners that the stream ended
                    io.to(key).emit('stream-ended', {
                        message: 'Stream ended by host'
                    });
                    streamers.delete(key);
                }
            });

            // If it was a listener who disconnected
            if (listeners.has(socket.id)) {
                const listener = listeners.get(socket.id);
                // Notify others that the listener left
                io.to(listener.streamId).emit('user-left-stream', {
                    username: listener.username,
                    message: `${listener.username} left the stream`
                });
                listeners.delete(socket.id);
            }
        });
    });
}

module.exports = { initializeSocketIO }; 