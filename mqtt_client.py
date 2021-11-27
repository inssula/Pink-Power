
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.websocket import WebSocketHandler
from tornado.ioloop import IOLoop
from os.path import join, dirname
from threading import Thread, ThreadError
import paho.mqtt.client as mqtt
import json


BROKER_IP = '147.228.124.230'
BROKER_PORT = 1883
BROKER_UNAME = 'student_2021'
BROKER_PASSWD = 'pivotecepomqtt'
TOPIC = 'ite/#'


test = []
raw = ['black','blue','green','red','pink']


class MQTT():

    def on_connect(self, client, userdata, mid, qos):       
        print('Connected with result code qos:', str(qos))
        client.subscribe(TOPIC)

    def on_message(self, client, userdata, msg):
        if (msg.payload == 'Q'):
            client.disconnect()

        t = Thread(target=self.save, args=[msg.topic, msg.payload], daemon=True)
        t.start()
        #print(msg.topic, msg.qos, msg.payload)

    def save(self, topic, mes):
        print(topic ,mes)

        for i in raw:

            if topic == ('ite/' + i):
                app.send_ws_message(message=mes.decode('utf-8'))
                test.append(mes.decode('utf-8'))

                if len(test) >= 11:
                    del test[0]

    def on_disconnect(self, client, userdata, rc):
        print('MQTT Client: Disconnected with result code qos:', rc)



class TextHandler(RequestHandler):
    def get(self):
        self.write(test[-1])



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
            (r"/text", TextHandler), 
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
                iol.spawn_callback(client.write_message, json.loads(message))
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
    app.listen(8880)

    iol = IOLoop.current()
    iol.start()
    
    
    
    
    
    