
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.websocket import WebSocketHandler
from tornado.ioloop import IOLoop
from os.path import dirname
from threading import Thread
from requests import post, HTTPError
from json import JSONDecodeError, dumps as json_dumps
import paho.mqtt.client as mqtt
import tornado.httpserver
import json


BROKER_IP = '147.228.124.230'
BROKER_PORT = 1883
BROKER_UNAME = 'student_2021'
BROKER_PASSWD = 'pivotecepomqtt'
TOPIC = 'ite/#'

# Team names
raw = ['black','blue','green','red','pink']

# All info
data = {}

ep_data = 'https://uvb1bb4153.execute-api.eu-central-1.amazonaws.com/Prod/measurements'
ep_alert = 'https://uvb1bb4153.execute-api.eu-central-1.amazonaws.com/Prod/alerts'

sensorUUID = '9a082e72-4876-4bf9-8ad7-76d5e80f0a74'
teamUUID = '1e6ae3ee-285e-4144-b1bb-fe0ee44f3284'

headers = {"teamUUID": "1e6ae3ee-285e-4144-b1bb-fe0ee44f3284",
          "Content-Type": "application/json"}

time = '-01:00'



class MQTT():

    def on_connect(self, client, userdata, mid, qos):       
        print('MQTT Client: Connected')
        client.subscribe(TOPIC)

    def on_message(self, client, userdata, msg):
        if (msg.payload == 'Q'):
            client.disconnect()
        
        t = Thread(target=self.procedure, args=[msg.topic, msg.payload], daemon=True)
        t.start()
        
        if len(data) != 0:
            t_api = Thread(target=self.send_API, args=[msg.topic, msg.payload], daemon=True)
            t_api.start()
    
    def on_disconnect(self, client, userdata, rc):
        print('MQTT Client: Disconnected')
    
    def procedure(self, topic, mes):
       # print(topic, mes) # mes = byte

        for i in raw:
            
            if topic == ('ite/' + i):
                
                message = mes.decode('utf-8') # str
                try:
                    message = json.loads(message) # dict
                except:
                    print("Not the required data")
                    continue
                    
                if i not in data.keys():
                    data[i] = {'created_on': [], 'temperature': []}
                    
                data[i]['created_on'].append(message['created_on'])
                data[i]['temperature'].append(message['temperature'])
                
                if len(data[i]['created_on']) >= 11: # amount of data save
                    del data[i]['created_on'][0]
                    del data[i]['temperature'][0]
                       
                app.send_ws_message(message=data)
    
    def send_API(self, topic, mes):
        
        if topic == ('ite/pink'):
            
            message = mes.decode('utf-8') # str
            try:
                message = json.loads(message) # dict
            except:
                print("Not the required data")
            
            if (message['temperature'] > 0) and (message['temperature'] < 25): # from 0 C' to 25 C'
                
                createdTime = message['created_on'].replace(message['created_on'][-3:], '') + time
                body = {
                        'createdOn': createdTime,
                        'sensorUUID': sensorUUID,
                        'temperature': message['temperature'],
                        'status': 'OK'
                        }
                
                self.post_to(ep_data, body)
                
            else:
                
                body = {
                        'createdOn': createdTime,
                        'sensorUUID': sensorUUID,
                        'temperature': message['temperature'],
                        'highTemperature': 25,
                        'lowTemperature': 0
                        }
                
                self.post_to(ep_alert, body)

    def post_to(self, ep, body):
   
        try:
            response = post(ep, data=json_dumps(body), headers=headers)
            #print("Message sent to Aimtec")
    
            if response.status_code == 200:
                try:
                    return response.json()
                except JSONDecodeError:
                    print('E: Response is not of JSON format.')
                    return {}
            else:
                print('E: Not available, try again. Status code:', response.status_code)
                return {}
    
        except HTTPError as http_err:
            print('E: HTTP error occurred:', http_err)



class MainHandler(RequestHandler):

    def get(self):
        self.render("index.html")
        
        

class WSHandler(WebSocketHandler):

    def initialize(self, app):
        self.app = app
        self.app.ws_clients.append(self)

    def open(self):
        print('Webserver: Websocket opened.')
        self.write_message('Server ready.')

    def on_message(self, msg):
        print('Webserver: Received WS message:', msg)

    def on_close(self):
        self.application.ws_clients.remove(self)
        print('Webserver: Websocket client closed. Connected clients:', len(self.application.ws_clients))



class WebApp(Application):

    def __init__(self):
        self.ws_clients = []

        handlers = [
            (r"/", MainHandler), 
            (r"/websocket", WSHandler, {"app": self}),
            (r'/(.*)', StaticFileHandler, {'path': dirname(__file__)})
        ]
        settings = {
            "debug": True
        }
        Application.__init__(self, handlers, **settings)

    def send_ws_message(self, message):
        for client in self.ws_clients:
            try:
                iol.spawn_callback(client.write_message, message)
            except:
                iol.spawn_callback(client.write_message, json.dumps(message))
        


if __name__ == "__main__":
    
    client = mqtt.Client()
    client.on_connect = MQTT().on_connect
    client.on_message = MQTT().on_message
    client.on_disconnect = MQTT().on_disconnect
    client.username_pw_set(BROKER_UNAME, password=BROKER_PASSWD)
    client.connect(BROKER_IP, BROKER_PORT, 60)
    
    t = Thread(target=client.loop_forever, daemon=True)
    t.start()

    app = WebApp()
    http_server = tornado.httpserver.HTTPServer(app, ssl_options={
        "certfile": "/home/varabyou/certificate/cert.pem",
        "keyfile": "/home/varabyou/certificate/key.pem",
        "ca_certs": "/home/varabyou/certificate/fullchain.pem",
    })
    http_server.listen(443)

    iol = IOLoop.current()
    iol.start()
    
    
    
    
    
    
