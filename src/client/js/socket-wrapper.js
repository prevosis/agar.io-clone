var io = require('socket.io-client');
var global = require('./global');

class SocketWrapper {
    constructor(type) {
        if (!global.socket) {
            this.socket = global.socket = io({query: "type=" + type});
            this.setupSocket();
        }
    }

    setupSocket() {
        var self = this;
        this.socket.on('pong', function () {
            var latency = Date.now() - global.startPingTime;
            global.debug('Latency: ' + latency + 'ms');
            window.chat.addSystemLine('Ping: ' + latency + 'ms');
        });

        // Handle error.
        this.socket.on('connect_failed', function () {
            self.socket.close();
            global.disconnected = true;
        });

        this.socket.on('disconnect', function () {
            self.socket.close();
            global.disconnected = true;
        });

        // Handle connection.
        this.socket.on('welcome', function (playerSettings) {
            var player = playerSettings;
            player.name = global.playerName;
            player.screenWidth = global.screenWidth;
            player.screenHeight = global.screenHeight;
            player.target = window.canvas.target;
            global.player = player;
            window.chat.player = player;
            self.socket.emit('gotit', player);
            global.gameStart = true;
            global.debug('Game started at: ' + global.gameStart);
            window.chat.addSystemLine('Connected to the game!');
            window.chat.addSystemLine('Type <b>-help</b> for a list of commands.');
            if (global.mobile) {
                document.getElementById('gameAreaWrapper').removeChild(document.getElementById('chatbox'));
            }
    		    global.canvas.cv.focus();
        });

        this.socket.on('gameSetup', function(data) {
            global.gameWidth = data.gameWidth;
            global.gameHeight = data.gameHeight;
            global.resize();
        });

        this.socket.on('playerDied', function (data) {
            window.chat.addSystemLine('{GAME} - <b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> was eaten.');
        });

        this.socket.on('playerDisconnect', function (data) {
            window.chat.addSystemLine('{GAME} - <b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> disconnected.');
        });

        this.socket.on('playerJoin', function (data) {
            window.chat.addSystemLine('{GAME} - <b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> joined.');
        });

        this.socket.on('leaderboard', function (data) {
            var leaderboard = data.leaderboard;
            var status = '<span class="title">Leaderboard</span>';
            for (var i = 0; i < leaderboard.length; i++) {
                status += '<br />';
                if (leaderboard[i].id == global.player.id){
                    if(leaderboard[i].name.length !== 0)
                        status += '<span class="me">' + (i + 1) + '. ' + leaderboard[i].name + "</span>";
                    else
                        status += '<span class="me">' + (i + 1) + ". An unnamed cell</span>";
                } else {
                    if(leaderboard[i].name.length !== 0)
                        status += (i + 1) + '. ' + leaderboard[i].name;
                    else
                        status += (i + 1) + '. An unnamed cell';
                }
            }
            global.leaderboard = leaderboard;
            //status += '<br />Players: ' + data.players;
            document.getElementById('status').innerHTML = status;
        });

        this.socket.on('serverMSG', function (data) {
            window.chat.addSystemLine(data);
        });

        // Chat.
        this.socket.on('serverSendPlayerChat', function (data) {
            window.chat.addChatLine(data.sender, data.message, false);
        });

        // Handle movement.
        this.socket.on('serverTellPlayerMove', function (userData, foodsList, massList, virusList) {
            var playerData;
            for(var i =0; i< userData.length; i++) {
                if(typeof(userData[i].id) == "undefined") {
                    playerData = userData[i];
                    i = userData.length;
                }
            }
            if(global.playerType == 'player') {
                var xoffset = global.player.x - playerData.x;
                var yoffset = global.player.y - playerData.y;

                global.player.x = playerData.x;
                global.player.y = playerData.y;
                global.player.hue = playerData.hue;
                global.player.massTotal = playerData.massTotal;
                global.player.cells = playerData.cells;
                global.player.xoffset = isNaN(xoffset) ? 0 : xoffset;
                global.player.yoffset = isNaN(yoffset) ? 0 : yoffset;
            }
            global.users = userData;
            global.foods = foodsList;
            global.viruses = virusList;
            global.fireFood = massList;
        });

        // Death.
        this.socket.on('RIP', function () {
            global.gameStart = false;
            global.died = true;
            window.setTimeout(function() {
                document.getElementById('gameAreaWrapper').style.opacity = 0;
                document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
                global.died = false;
                if (global.animLoopHandle) {
                    window.cancelAnimationFrame(global.animLoopHandle);
                    global.animLoopHandle = undefined;
                }
            }, 2500);
        });

        this.socket.on('kick', function (data) {
            global.gameStart = false;
            global.reason = data;
            global.kicked = true;
            self.socket.close();
        });

        this.socket.on('virusSplit', function (virusCell) {
            self.socket.emit('2', virusCell);
            window.canvas.reenviar = false;
        });
    }
}

export default SocketWrapper;
