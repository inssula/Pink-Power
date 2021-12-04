var chart
var ourTeams=['black','blue','green','red','pink']
var alldata
var pageName = window.location.pathname.split("/").pop();
pageName = pageName.split('.')[0].toLowerCase()

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
    if (data.hasOwnProperty(pageName)) {
        showTemprature(data)
        alldata = data
        showAverageTemperature(data)
    }
    getStatus(data, pageName)   
    prepareDataForGraph(data)
    console.log("WS message:", data)   
}

function prepareDataForGraph(data) {
    if (!(data.hasOwnProperty(pageName))) {
        return
    }
    var temperatures = []
    var time = []
    teamData = data[pageName]
    for (var i in teamData['created_on']) {
    time.push(teamData['created_on'][i])
    temperatures.push(teamData['temperature'][i])
    }
    makeGraph(time, temperatures)
}

window.addEventListener('resize',function(){
    Chart.resize();
})

function fn60sec() {
    try {
        getStatus(alldata, pageName)
    } catch (e) {
        return
    }
}

function makeGraph(time,temperatures) {
    mrkPoint = []
    for (var i in temperatures) {
        if (temperatures[i] > 25 || temperatures[i] < 0) {
            mrkPoint.push({'coord':[time[i],temperatures[i]]})
        }
    }
    Chart = echarts.init(document.getElementById('graph'));
    option = {
        title: {
            text: 'Measured temperatures'
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: []
        },
        toolbox: {
            show: false,
            feature: {
                dataZoom: {
                    yAxisIndex: 'none'
                },
                dataView: { readOnly: true },
                magicType: { type: ['line', 'bar'] },
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: time
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: '{value} °C'
            }
        },
        dataZoom: [
    {
      type: 'inside',
      start: 0,
      end: 100
    },
    {
      start: 0,
      end: 10
    }
  ],
        series: [
            {
                name: 'temperature',
                type: 'line',
                data: temperatures,
                markPoint: {
                    itemStyle: {
                        color: 'red'
                    },
                    data: mrkPoint,
                    symbolSize: 30,
                },
                    markLine: {
                        data: [{ type: 'average', name: 'Avg' }]
                    }
                
    
            }]
    }
    Chart.setOption(option);
    
}

function getTime() {
    var d = new Date();
    var g1 = new Date(d-120000);
    return g1.getUTCFullYear() + '-' + ((g1.getUTCMonth() + 1).toString().padStart(2, '0')) + '-' + ((g1.getUTCDate()).toString().padStart(2, '0')) + 'T' + ((g1.getUTCHours()).toString().padStart(2, '0')) + ':' + ((g1.getUTCMinutes()).toString().padStart(2, '0')) + ':' + ((g1.getUTCSeconds()).toString().padStart(2, '0'));
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

function showAverageTemperature(data) {
    var avgTmp = 0
    for (var temp in data[pageName]['temperature']) {
        avgTmp = avgTmp + data[pageName]['temperature'][temp]
    }
    avgTmp = avgTmp / data[pageName]['temperature'].length
    document.getElementById("avgTempNumber-" + pageName).innerHTML = +avgTmp.toFixed(2)
}

function showStatus(teamname, status) {
    var color = "green"
    console.log('status', status)
    document.getElementById("status-" + teamname).innerHTML = status
    if (status == "Offline") {color = "red"}
    document.getElementById("status-" + teamname).style.color = color
    document.getElementById("status-" + teamname).style.fill = color
}

function getRigtFormatOfDate(date) {
    var d = date.split('T')[0] // 2021-12-1
    var t = date.split('T')[1] // 13:47:58.439
    var rightDate = d.split('-')[0] + "-" + d.split("-")[1].padStart(2, '0') + "-" + d.split("-")[2].padStart(2, '0')
    var rightTime = t.split(':')[0].padStart(2, '0') + ":" + t.split(':')[1].padStart(2, '0') + ":" + t.split(':')[2].split('.')[0].padStart(2, '0')
    return rightDate + "T" + rightTime
}

function showTemprature(data) {
    var temp = getTemperature(data, pageName)
    var wholedate = getDate(data, pageName)
    console.log(wholedate)
    wholedate = getRigtFormatOfDate(wholedate)
    var date = wholedate.split("T")[0]
    var time = wholedate.split("T")[1]
    console.log('time', time)
    console.log('date', date)
    console.log('temp', temp)
    
    document.getElementById("tempNumber-" + pageName).innerHTML = temp + "°C"
    document.getElementById("tempDate-" + pageName).innerHTML = date
    document.getElementById("tempTime-" + pageName).innerHTML = time
}

function getTemperature(data, teamname) {
    if (!(data.hasOwnProperty(teamname))) {
        return '#'
    }
    return +data[teamname]['temperature'][data[teamname]['temperature'].length-1].toFixed(2)
}

function getDate(data, teamname) {
    if (!(data.hasOwnProperty(teamname))) {
        return '#'
    }
    return data[teamname]['created_on'][data[teamname]['created_on'].length-1]
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