
const port  = 3001;
const mongo = require('mongodb').MongoClient;
const io = require('socket.io').listen(port).sockets;


// Connection URL
const mongoUrl = 'mongodb://127.0.0.1/chat';


returnAllMessages = function (chat, socket) {
    // Get all messages from mongo collection
    chat.find().sort({_id:1}).toArray(function(err, res) {
        if (err) {
            throw err;
        }

        // Emit messages
        socket.emit('getAllMessages', res);
    });
}

getNewMessage = function (socket, data, chat) {
    // Called when a new msg is sent to the server. It validates it then
    // add it to the database before emitting it to all sockets
    console.log(data)
    let username = data.username
    let msg = data.msg
    // Check for username and message
    if (username === '' || msg === '') {
        //  Send a status that either the username or msg was empty (not used on frontend yet)
        sendStatus(socket, 'Please enter both a username and msg')
    } else {
        // Insert Message into database
        chat.insertOne({ username: username, msg: msg}, function () {
            io.emit('output', data);
        });
        //  Send a status that the message was received (not used on frontend yet)
        sendStatus(socket, {
            message: 'Message sent',
            clear: true,

        })
    }

}

sendStatus = function (socket, s) {
    // Sends the given status for the frontend to know what happened
    socket.emit('status', s);
};

clearMessages = function (chat, socket) {
    // remove all messages from collection
    chat.deleteMany({}, function () {
        // Tell client that all messages have been removed
        io.emit('cleared')
    })
}


// Connect to mongo
mongo.connect(mongoUrl, { useNewUrlParser: true }, function(err,database){
        if (err) {
            throw err;
        } 
        
        // Connect to socket.io
        io.on('connection', function(socket) {
            let chat = database.db().collection('chats');
            console.log('a user connected');

            // Send all messages back to client on initial connection
            returnAllMessages(chat, socket);

            
            // Handle new messages
            socket.on('send_message', function(data) {
                getNewMessage(socket, data, chat);
            });

            // Handle clearing of all message from collection
            socket.on('clear', function () {
                clearMessages(chat, socket);
            });
        
        });
 
    });