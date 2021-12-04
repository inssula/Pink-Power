var chart
var ourTeams=['black','blue','green','red','pink']
var alldata
var recognized = false

function onBodyLoad() {
    ws = new WebSocket('ws://localhost:8880/websocket')     // ws is a global variable (index.html)
    ws.onopen = onSocketOpen
    ws.onmessage = onSocketMessage
    ws.onclose = onSocketClose
    setInterval(fn60sec, 120 * 1000);
    

}

String.prototype.replaceAtIndex = function(_index, _newValue) {
    return this.substr(0, _index) + _newValue + this.substr(_index + _newValue.length)
}

function onSocketOpen() {
    console.log("WS client: Websocket opened.")
}

function onSocketMessage(message) {
    try {
        data = JSON.parse(message.data)
    } catch (e) {
        data = message.data
    }
    
    alldata = data

    var blackTemp = getTemperature(data, 'black')
    var greenTemp = getTemperature(data, 'green')
    var blueTemp = getTemperature(data, 'blue')
    var pinkTemp = getTemperature(data, 'pink')
    var redTemp = getTemperature(data, 'red')
    var tempNumbers = {'black':blackTemp, 'green':greenTemp, 'blue':blueTemp, 'pink':pinkTemp, 'red':redTemp}
    
    showTemprature(tempNumbers)
    showStatusOfCustomerServer(data)
    

    getStatus(data, 'black')
    getStatus(data, 'blue')
    getStatus(data, 'green')
    getStatus(data, 'pink')
    getStatus(data,'red')
    prepareDataForGraph(data)
    console.log("WS message:", data)

    
    
}

function prepareDataForGraph(data) {
  var teams = []
  var lastValues = []
  for (var key in data) {
    teams.push(key)
    lastValues.push(data[key]['temperature'][data[key]['temperature'].length-1])
  }
  makeGraph(teams, lastValues)
}

window.addEventListener('resize',function(){
  Chart.resize();
})

function fn60sec() {
    try {
        for (var team in ourTeams) {
            getStatus(alldata,ourTeams[team])
        }
        showStatusOfCustomerServer(data)
    } catch (e) {
        return
    }
}

function makeGraph(teams, lastValues) {
    
    Chart = echarts.init(document.getElementById('graph'));

      // Specify the configuration items and data for the chart
    var option = {
        title: {
            text: 'Last measured temperatures'
        },
        tooltip: {},
        legend: {
          data: []
        },
        xAxis: {
          data: []
        },
        yAxis: {},
        series: [
          {
            name: 'Temperature',
            type: 'bar',
            data: []
          }
        ]
  }
  for (var team in teams) {
    option['xAxis']['data'].push(teams[team]);
    option['series'][0]['data'].push({ value: lastValues[team], itemStyle: {color: teams[team]}})
    }
    Chart.setOption(option);
}

function getTime() {
    var d = new Date();
    var g1 = new Date(d-120000);
    return g1.getUTCFullYear() + '-' + ((g1.getUTCMonth() + 1).toString().padStart(2, '0')) + '-' + ((g1.getUTCDate()).toString().padStart(2, '0')) + 'T' + ((g1.getUTCHours()).toString().padStart(2, '0')) + ':' + ((g1.getUTCMinutes()).toString().padStart(2, '0')) + ':' + ((g1.getUTCSeconds()).toString().padStart(2, '0'));
}

function getRigtFormatOfDate(date) {
    var d = date.split('T')[0] // 2021-12-1
    var t = date.split('T')[1] // 13:47:58.439
    var rightDate = d.split('-')[0] + "-" + d.split("-")[1].padStart(2, '0') + "-" + d.split("-")[2].padStart(2, '0')
    var rightTime = t.split(':')[0].padStart(2, '0') + ":" + t.split(':')[1].padStart(2, '0') + ":" + t.split(':')[2].split('.')[0].padStart(2, '0')
    return rightDate + "T" + rightTime
}

function getStatus(data, teamname) {
    if (!(data.hasOwnProperty(teamname))) {
        showStatus(teamname, 'Offline')
        return
    }
    console.log("checking status for " + teamname)
    var dateNow = getTime()
    var tempdate = data[teamname]['created_on'][data[teamname]['created_on'].length - 1]
    tempdate = getRigtFormatOfDate(tempdate)

    console.log("dateNowe",dateNow)
    console.log("tempdate", tempdate)
    if (dateNow >= tempdate) {
        showStatus(teamname, 'Offline')
        console.log('Status is offline')
        return
    }
    console.log('Status is Online')
    showStatus(teamname, 'Online')

    
}

function showStatus(teamname, status) {
    var color = "green"
    document.getElementById("status-" + teamname).innerHTML = status
    if (status == "Offline") {color = "red"}
    document.getElementById("status-"+teamname).style.color = color 
}

function showTemprature(tempNumbers) {
    for (var key in tempNumbers) {
        document.getElementById("tempNumber-"+key).innerHTML = tempNumbers[key] +"°C"
    }
    showAlert(tempNumbers)
}

function showAlert(tempNumbers) {
    for (var key in tempNumbers) {
        if (tempNumbers[key] > 25 || tempNumbers[key] < 0) {
            let root = document.documentElement;
            root.style.setProperty('--aler'+key, "visible");
            root.style.setProperty('--aler'+key+'-color', "red");
        }else {
            let root = document.documentElement;
            root.style.setProperty('--aler' + key, "hidden");
            showYellowAlert(key)
        } 
    }
}

function showYellowAlert(key) {
    if (!(alldata.hasOwnProperty(key))) {
        let root = document.documentElement;
        root.style.setProperty('--aler' + key, "hidden");
        return
    }
    temperatures = alldata[key]['temperature']
    if (temperatures.length > 300) {
        temperatures = temperatures.slice(Math.max(arr.length - 300, 1))
    }
    for (var i in temperatures) {
        if (temperatures[i] > 25 || temperatures[i] < 0) {
            let root = document.documentElement;
            root.style.setProperty('--aler' + key, "visible");
            root.style.setProperty('--aler' + key + '-color', "orange");
            return
        } else {
            let root = document.documentElement;
            root.style.setProperty('--aler' + key, "hidden");
        }
    }
}


function redirectToTeamPage(color) {
    window.location.href = color+".html"
}

function showStatusOfCustomerServer(data){
    if (!(data.hasOwnProperty('server'))) {
        document.getElementById("cst-srv-status").innerHTML("Offline")
        document.getElementById("cst-srv-status").style.color = "red"
        return
    }
    
    if (data['server'] == 1) {
        document.getElementById("cst-srv-status").innerHTML("Online")
        document.getElementById("cst-srv-status").style.color = "green"
        return
    }

    document.getElementById("cst-srv-status").innerHTML("Offline")
    document.getElementById("cst-srv-status").style.color = "red"

}



function getTemperature(data, teamname) {
    if (!(data.hasOwnProperty(teamname))) {
        return '#'
    }
    return +data[teamname]['temperature'][data[teamname]['temperature'].length-1].toFixed(2)
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
    request.open("GET", 'file_name.json', false);
    request.send(null)
    return JSON.parse(request.responseText);
}

function loadJsonHandler() {
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    }
    xmlhttp.open('GET', '/json/', false);
    xmlhttp.send(null);

    return JSON.parse(xmlhttp.responseText);
}