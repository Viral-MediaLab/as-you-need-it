from __future__ import print_function
import os
import sys
from pymongo import MongoClient, son_manipulator

__author__ = 'weller'


# MONGO_DEFAULT_URL = 'mongodb://127.0.0.1:27017/super-glue'
MONGO_DEFAULT_URL = 'mongodb://um.media.mit.edu:27017/super-glue'
MONGO_URL = os.environ.get('MONGO_URL')

if MONGO_URL is None:
    print("No MONGO_URL in environment. Defaulting to", MONGO_DEFAULT_URL, file=sys.stderr)
    MONGO_URL = MONGO_DEFAULT_URL


def strToId(string):
    return son_manipulator.ObjectId(string)

client = MongoClient(MONGO_URL)
db = client.get_default_database()
collection = db['media']