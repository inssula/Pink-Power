import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.log
from urllib.request import urlopen
import datetime as dt
import logging
import numpy as np
import imutils
import pickle
import cv2
import json

app_log = logging.getLogger("tornado.application")

detector = cv2.dnn.readNetFromCaffe("faceid/face_detection_model/deploy.prototxt",
                                    "faceid/face_detection_model/res10_300x300_ssd_iter_140000.caffemodel")

embedder = cv2.dnn.readNetFromTorch("faceid/openface_nn4.small2.v1.t7")

recognizer = pickle.loads(open("faceid/output/recognizer.pickle", "rb").read())
le = pickle.loads(open("faceid/output/le.pickle", "rb").read())


class RecognizeImageHandler(tornado.web.RequestHandler):
    def post(self):
        # Convert from binary data to string
        received_data = self.request.body.decode()

        assert received_data.startswith("data:image/png"), "Only data:image/png URL supported"

        # Parse data:// URL
        with urlopen(received_data) as response:
            image_data = response.read()

        fn = f"recog_images/img-{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}.png" 
        with open(fn, "wb") as fw:
            fw.write(image_data)

        image = cv2.imread(fn)
        image = imutils.resize(image, width=600)
        (h, w) = image.shape[:2]

        app_log.info("Processing image")

        imageBlob = cv2.dnn.blobFromImage(
            cv2.resize(image, (300, 300)), 1.0, (300, 300),
            (104.0, 177.0, 123.0), swapRB=False, crop=False)

        detector.setInput(imageBlob)
        detections = detector.forward()

        faces = []

        # loop over the detections
        for i in range(0, detections.shape[2]):
            # extract the confidence (i.e., probability) associated with the
            # prediction
            confidence = detections[0, 0, i, 2]

            # filter out weak detections
            if confidence > 0.5:
                # compute the (x, y)-coordinates of the bounding box for the
                # face
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")

                # extract the face ROI
                face = image[startY:endY, startX:endX]
                (fH, fW) = face.shape[:2]

                # ensure the face width and height are sufficiently large
                if fW < 20 or fH < 20:
                    continue

                # construct a blob for the face ROI, then pass the blob
                # through our face embedding model to obtain the 128-d
                # quantification of the face
                faceBlob = cv2.dnn.blobFromImage(face, 1.0 / 255, (96, 96),
                    (0, 0, 0), swapRB=True, crop=False)
                embedder.setInput(faceBlob)
                vec = embedder.forward()

                # perform classification to recognize the face
                preds = recognizer.predict_proba(vec)[0]
                j = np.argmax(preds)
                proba = preds[j]
                name = le.classes_[j]

                faces.append({
                    "name": name,
                    "prob": proba,
                    "bbox": {"x1": int(startX), "x2": int(endX), "y1": int(startY), "y2": int(endY)},
                })
        if(len(faces) > 0):
            if(faces[-1]["name"] != "unknown"):
                if(faces[-1]["prob"] >= 0.6):
                    self.set_secure_cookie("faktborec4", faces[-1]["name"],expires_days = 0.0167)
 

        js = {"faces": faces}
        self.write(js)
        print("Result JSON")
        print(json.dumps(js, indent=4, sort_keys=True))
