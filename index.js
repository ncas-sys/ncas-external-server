var socket = require('socket.io').listen(45654)
var _ = require('underscore');
var connections = {}
var ncassocket = null

socket.on('connection', function(newSock){
	newSock.emit('Welcome')
	setUpSocket(newSock)
})

setUpSocket = function(newSock){
	newSock.on('Register', function(obj){
		if(obj.ref=='ncas'){
			//this is our master connection back to church
			ncassocket = newSock;
			ncassocket.on('disconnect', function(){
				ncassocket.disconnect();
				ncassocket = null;
				for (var key in connections) {
					connections[key].socket.emit('MasterConnectionLost')
				}
			});
			ncassocket.on('EmitToConnection', function(emit){
				if(emit.name=='WelcomeController'){
					console.log('emiting welcomecontroller to', emit.connection_id);
				}
				if(connections[emit.connection_id]){
					connections[emit.connection_id].socket.emit(emit.name, emit.obj)
				}
			});
			sendChurchAllMyConnections();
			for (var key in connections) {
				var msg = {
					id: connections[key].id,
					name: 'GiveMeEverything'
				}
				ncassocket.emit('EmitToMaster', msg)
			}
			
		}else{
			//there is a new connection on the block
			//console.log(newSock);
			var ip = newSock.handshake.address.replace('::ffff:', '');
			var newId = makeid();
			var newConnection = {
				name: obj.name,
				type: obj.type,
				auth: 'none',
				locale: 'external',
				id: newId,
				ip: ip,
				socket: newSock
			}
			connections[newConnection.id] = newConnection;
			if(ncassocket!=null){
				sendChurchConnection(newConnection);
			}else{
				//	console.log('cant send atm, wait for connection')
			}
			newSock.on('disconnect', function(){
				if(ncassocket!=null){
					//we need to tell church that the controll has disconnected
					ncassocket.emit('DeleteExternalConnection', newConnection.id)
					delete connections[newConnection.id]
					
				}
			})
			newSock.on('ToMaster', function(data){
				data.conn_id = newId;
				ncassocket.emit('ToMaster', data);
			})
		}
	})
}



sendChurchAllMyConnections = function(){
	for (var key in connections) {
		sendChurchConnection(connections[key]);
	}
}


sendChurchConnection = function(connection){
	var sendConnection = _.clone(connection)
	delete sendConnection.socket;
	ncassocket.emit('AddExternalConnection', sendConnection)
}








function makeid(){
	var mstime = new Date().getTime()
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text + mstime;
}