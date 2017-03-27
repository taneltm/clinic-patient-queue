var express  = require('express');
var http     = require('http');
var socketio = require('socket.io');
var r        = require('rethinkdb');
               require('rethinkdb-init')(r);

var settings = {
  server: {
    kioskPort:  8001,
    infoPort:   8002,
    doctorPort: 8003
  },
  database: {
    host: 'localhost',
    port: 28015,
    db:   'hospital'
  },
  schema: [
    {
      name:    'patientQueue',
      indexes: ['number', 'roomId', 'time']
    },
    {
      name:    'rooms',
      indexes: ['roomId', 'doctor', 'calling']
    }
  ]
};

var connection        = null;
var nextPatientNumber = 1;

function getNewPatientNumber() {
  return nextPatientNumber++;
}

function initializeDatabase() {
  return r
  .init(settings.database, settings.schema);
}

function clearPatientQueue() {
  return r
  .db('hospital')
  .table('patientQueue')
  .delete()
  .run(connection);
}

function clearRooms() {
  return r
  .db('hospital')
  .table('rooms')
  .delete()
  .run(connection);
}

function createRoom(roomId, doctor) {
  return r
  .db('hospital')
  .table('rooms')
  .insert({
    roomId: roomId,
    doctor: doctor
  })
  .run(connection);
}

function addPatientToQueue(roomId, number) {
  return r
  .db('hospital')
  .table('patientQueue')
  .insert({
    number: number,
    roomId: roomId,
    time:   new Date()
  })
  .run(connection);
}

function getPatientQueue(roomId) {
  return r
  .db('hospital')
  .table('patientQueue')
  .filter({roomId: roomId})
  .orderBy('time')
  .run(connection);
}

function getPatientQueueChanges(roomId) {
  return r
  .db('hospital')
  .table('patientQueue')
  .filter({roomId: roomId})
  .changes()
  .run(connection);
}

function getNextPatientOfRoom(roomId) {
  return r
  .db('hospital')
  .table('patientQueue')
  .filter({roomId: roomId})
  .orderBy('time')
  .nth(0)
  .default(null)
  .run(connection);
}

function getRoom(roomId) {
  return r
  .db('hospital')
  .table('rooms')
  .filter({roomId: roomId})
  .nth(0)
  .default(null)
  .run(connection);
}

function getAllRooms() {
  return r
  .db('hospital')
  .table('rooms')
  .orderBy('roomId')
  .run(connection);
}

function getRoomChanges(roomId) {
  return r
  .db('hospital')
  .table('rooms')
  .filter({roomId: roomId})
  .changes()
  .run(connection);
}

function assignPatientToRoom(patientNumber, roomId) {
  return r
  .db('hospital')
  .table('rooms')
  .filter({roomId: roomId})
  .update({calling: patientNumber})
  .run(connection);
}

function removePatientFromQueue(id) {
  return r
  .db('hospital')
  .table('patientQueue')
  .filter({id: id})
  .delete()
  .run(connection);
}

function callNextPatientToRoom(roomId) {
  var patientId     = null;
  var patientNumber = null;

  return getNextPatientOfRoom(roomId)
  .then(function(nextPatient) {
    if (nextPatient) {
      patientId     = nextPatient.id;
      patientNumber = nextPatient.number;
    }
  })
  .then(function() {
    return assignPatientToRoom(patientNumber, roomId);
  })
  .then(function() {
    return removePatientFromQueue(patientId);
  });
}

var apps = {};

function startKiosk() {
  apps.kiosk      = {};
  apps.kiosk.app  = express();
  apps.kiosk.http = http.Server(apps.kiosk.app);
  apps.kiosk.io   = socketio(apps.kiosk.http);

  apps.kiosk.app.use(express.static('public'));

  apps.kiosk.app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/kiosk.html');
  });


  apps.kiosk.http.listen(settings.server.kioskPort, function(err) {
    if (err) throw err;

    console.log('Kiosk server running on port %s.', settings.server.kioskPort);

    apps.kiosk.io.on('connection', function (socket) {

      getAllRooms()
      .then(function(cursor) {
        return cursor.toArray();
      })
      .then(function(rooms) {
        socket.emit('rooms', rooms);
      });

      socket.on('register', function(roomId, acknowledge) {
        var number = getNewPatientNumber();

        addPatientToQueue(roomId, number)
        .then(function() {
          acknowledge(number);
        });
      });
    });
  });  
}

// ------------------------------------------------------------------

function startInfo() {
  apps.info      = {};
  apps.info.app  = express();
  apps.info.http = http.Server(apps.info.app);
  apps.info.io   = socketio(apps.info.http);

  apps.info.app.use(express.static('public'));

  apps.info.app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/info.html');
  });

  apps.info.http.listen(settings.server.infoPort, function(err) {
    if (err) throw err;

    console.log('Info server running on port %s.', settings.server.infoPort);

    apps.info.io.on('connection', function (socket) {

      socket.on('infoBoot', function(roomId) {
        var queueFeed = null;
        var roomFeed  = null;

        socket.on('disconnect', function() {
          if (queueFeed) queueFeed.removeAllListeners();
          if (roomFeed) roomFeed.removeAllListeners();
        });

        getPatientQueueChanges(roomId)
        .then(function(feed) {
          queueFeed = feed;

          feed.on('data', function(changes) {
            socket.emit('patientQueueChanges', changes);
          });
        });

        getRoomChanges(roomId)
        .then(function(feed) {
          roomFeed = feed;

          feed.on('data', function(changes) {
            socket.emit('roomChanges', changes);
          });
        });

        getRoom(roomId)
        .then(function(room) {
          socket.emit('room', room);
        });

        getPatientQueue(roomId)
        .then(function(patientQueue) {
          socket.emit('patientQueue', patientQueue);
        });

      });
    });
  });
}


// ------------------------------------------------------------------

function startDoctor() {
  apps.doctor      = {};
  apps.doctor.app  = express();
  apps.doctor.http = http.Server(apps.doctor.app);
  apps.doctor.io   = socketio(apps.doctor.http);

  apps.doctor.app.use(express.static('public'));

  apps.doctor.app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/doctor.html');
  });


  apps.doctor.http.listen(settings.server.doctorPort, function(err) {
    if (err) throw err;

    console.log('Doctor server running on port %s.', settings.server.doctorPort);
    
    apps.doctor.io.on('connection', function (socket) {
      socket.on('doctorBoot', function(roomId) {

        var queueFeed = null;
        var roomFeed  = null;

        socket.on('disconnect', function() {

          if (queueFeed) queueFeed.removeAllListeners();
          if (roomFeed) roomFeed.removeAllListeners();
        });

        getPatientQueueChanges(roomId)
        .then(function(feed) {
          queueFeed = feed;

          feed.on('data', function(changes) {
            socket.emit('patientQueueChanges', changes);
          });
        });

        getRoomChanges(roomId)
        .then(function(feed) {
          roomFeed = feed;

          feed.on('data', function(changes) {
            socket.emit('roomChanges', changes);
          });
        });

        getRoom(roomId)
        .then(function(room) {
          socket.emit('room', room);
        });

        getPatientQueue(roomId)
        .then(function(patientQueue) {
          socket.emit('patientQueue', patientQueue);
        });

      });

      socket.on('callNextPatient', function(roomId) {
        callNextPatientToRoom(roomId);
      });
    });
  });  
}

// ------------------------------------------------------------------

initializeDatabase()
.then(function(conn) { connection = conn; })
.then(clearPatientQueue)
.then(clearRooms)
.then(function() { return createRoom('101-A', 'Dr. Robega Alfai'); })
.then(function() { return createRoom('101-B', 'Dr. Ropinho Cassuada'); })
.then(function() { return createRoom('102-A', 'Dr. Chimarizen Ranges'); })
.then(function() { return createRoom('102-B', 'Dr. Nifagrese Antonia'); })
.then(function() { return createRoom('103-A', 'Dr. Gabriele Antseni'); })
.then(function() { return createRoom('103-B', 'Dr. Julio Sardinha Janico'); })
.then(function() { return createRoom('104-A', 'Dr. Pasqua Mutundu'); })
.then(function() { return createRoom('104-B', 'Dr. Rosa Paizone'); })
.then(function() { return addPatientToQueue('101-A', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('101-A', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('101-B', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('101-B', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('102-A', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('102-A', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('102-B', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('102-B', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('103-A', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('103-A', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('103-B', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('103-B', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('104-A', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('104-A', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('104-B', getNewPatientNumber()); })
.then(function() { return addPatientToQueue('104-B', getNewPatientNumber()); })
.then(function() {
  console.log('Database setup done!');
})
.then(startKiosk)
.then(startInfo)
.then(startDoctor)
.catch(function(err) {
  console.error(err);
});
