from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.ioloop import IOLoop
from os.path import join, dirname
import json
import tornado.httpserver
import tornado.ioloop
import tornado.web

class RootHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello World")
application = tornado.web.Application([
    (r'/', RootHandler),
])


class MainHandler(RequestHandler):
    def get(self):
        self.render("index.html")


class JsonHandler(RequestHandler):
    def get(self):
        self.write(json.dumps(storage))


class WebApp(Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/json/", JsonHandler),
            ('/(.*)', StaticFileHandler, {'path': dirname(__file__)})
        ]
        settings = {
            "debug": True
        }
        Application.__init__(self, handlers, **settings)


if __name__ == "__main__":
    storage = {'data': [1, 2]}
    app = WebApp()
    app.listen(8888)
    IOLoop.current().start()

    http_server = tornado.httpserver.HTTPServer(application, ssl_options={
        "certfile": "/home/varabyou/certificate/cert.pem",
        "keyfile": "/home/varabyou/certificate/key.pem",
        "ca_certs": "/home/varabyou/certificate/fullchain.pem",
    })
    http_server.listen(443)
    tornado.ioloop.IOLoop.instance().start()

