function onBodyLoad() {
    //ws = new WebSocket('ws://sulis43.zcu.cz:8888/websocket')     // ws is a global variable (index.html)
    ws = new WebSocket("ws://localhost:8888/websocket")
    ws.onopen = onSocketOpen
    ws.onmessage = onSocketMessage
    ws.onclose = onSocketClose
    document.getElementById('14').innerHTML = JSON.stringify(loadJsonFile());
}

function onSocketOpen() {
    console.log("WS client: Websocket opened.")
}

function onSocketMessage(message) {
    var data
    try {
        data = JSON.parse(message.data)    
    } catch(e) {
        data = message.data
    }
    console.log("WS message:", data)    
}

function onSocketClose() {
    console.log("WS client: Websocket closed.")
}

function sendToServer() {
    var params = {
        topic: "smarthome/room/door_open",
        sensors: ["ls311b38_02"]
    }
    ws.send(JSON.stringify(params))
}

function loadJsonFile() {
    var request = new XMLHttpRequest();
    request.open("GET", 'static/test.json', false);
    request.send(null)
    return JSON.parse(request.responseText);
}

function loadJsonHandler() {
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    }
    xmlhttp.open('GET', '/json/', false);
    xmlhttp.send(null);

    return  JSON.parse(xmlhttp.responseText);
}
