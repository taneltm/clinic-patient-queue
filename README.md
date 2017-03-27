# Clinic patient queue demo

This is a realtime web application demo, which uses RethinkDB and WebSocket technology to synchronize information exchange between front-end applications in realtime.

## Technologies used:

Link | Description
---- | -----------
[Node.js](https://nodejs.org/) | Event-driven I/O server-side JavaScript environment based on V8.
[RethinkDB](https://rethinkdb.com/) | RethinkDB is the first open-source, scalable JSON database built from the ground up for the realtime web. It inverts the traditional database architecture by exposing an exciting new access model – instead of polling for changes, the developer can tell RethinkDB to continuously push updated query results to applications in realtime.
[Express](https://expressjs.com/) | Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
[Socket.io](https://socket.io/) | Socket.io enables realtime, bi-directional communication between web clients and servers, using WebSockets when possible, uses polling as a fallback option.

Setup:
1. Setup and start RethinkDB
2. Install Node.js
3. Clone this repo
4. Install server-side dependencies by running ```npm install``` in the project directory
5. Start the demo server by running ```node .``` in the project directory

After the server has started, point your browser to the following URL's:

Description                       | Room  | Link
--------------------------------- | ----- | ----
Kiosk web app                     | n/a   | [http://localhost:8001](http://localhost:8001)
Info web app                      | 101-A | [http://localhost:8002/#101-A](http://localhost:8002/#101-A)
Doctor's web app                  | 101-A | [http://localhost:8003/#101-A](http://localhost:8003/#101-A)
Info web app                      | 101-B | [http://localhost:8002/#101-B](http://localhost:8002/#101-B)
Doctor's web app                  | 101-B | [http://localhost:8003/#101-B](http://localhost:8003/#101-B)
Info web app                      | 102-A | [http://localhost:8002/#102-A](http://localhost:8002/#102-A)
Doctor's web app                  | 102-A | [http://localhost:8003/#102-A](http://localhost:8003/#102-A)
Info web app                      | 102-B | [http://localhost:8002/#102-B](http://localhost:8002/#102-B)
Doctor's web app                  | 102-B | [http://localhost:8003/#102-B](http://localhost:8003/#102-B)
Info web app                      | 103-A | [http://localhost:8002/#103-A](http://localhost:8002/#103-A)
Doctor's web app                  | 103-A | [http://localhost:8003/#103-A](http://localhost:8003/#103-A)
Info web app                      | 103-B | [http://localhost:8002/#103-B](http://localhost:8002/#103-B)
Doctor's web app                  | 103-B | [http://localhost:8003/#103-B](http://localhost:8003/#103-B)
Info web app                      | 104-A | [http://localhost:8002/#104-A](http://localhost:8002/#104-A)
Doctor's web app                  | 104-A | [http://localhost:8003/#104-A](http://localhost:8003/#104-A)
Info web app                      | 104-B | [http://localhost:8002/#104-B](http://localhost:8002/#104-B)
Doctor's web app                  | 104-B | [http://localhost:8003/#104-B](http://localhost:8003/#104-B)
