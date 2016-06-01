import itertools
import json
import random
import re
import os
import operator
import time
from flask import Flask, render_template, jsonify
import mongo_connection
from flask.ext.cacheify import init_cacheify

app = Flask(__name__)

cache = init_cacheify(app)

@app.route('/')
def index():
    super_glue_data = get_data()
    return render_template('index.html', super_glue_data=super_glue_data)

def get_data():
    print (cache)
    data = cache.get('data')
    last_cached = cache.get('last_cached')
    print (data)
    print (last_cached)
    if data is None or last_cached-millis()>DAY:
        data = frequent_itemsets()
        timestamp = millis()
        cache.set('data', data, timeout=5 * 60)
        cache.set('last_cached', timestamp, timeout=5 * 60)
    return data

def millis():
    return int(round(time.time() * 1000))

DAY = 86400000
def millis_since(num_days='1'):
    days = int(os.environ.get('TIME_FRAME_DAYS', num_days))
    return millis() - days*DAY #debugging - millis week

def frequent_itemsets():
    print ("starting frequent_itemsets")
    startTime = millis()
    window = '1' #int(request.args.get('window', default='1'))
    limit = 100 #200 #int(request.args.get('limit', default=200))
    with_replacement = True #bool(request.args.get('with_replacement', default=True))
    clean_dups = False #bool (request.args.get('clean_dups', default=True))
    aligned = True #bool (request.args.get('aligned', default=False))

    # get top entities
    top_entities = []
    top_entities_scored = {}
    short_strings = {}
    types = {}
    entities = "entities"
    if aligned:
        entities+="_aligned"
    pipeline = [
        {"$match": {"date_added": {"$gt": millis_since(window)}}},
        {"$project": {entities: 1}},
        {"$unwind": "$"+entities},
        {"$group": {
            "_id":  "$"+entities+".text",
            "count": {"$sum": 1},
            "counts": {"$push": {"count": "$"+entities+".count", "relevance":"$"+entities+".relevance"}},
            "types": {"$push":"$"+entities+".type"}
            }},
        {"$sort": {"count": -1}}
        #{"$limit": limit}
    ]
    cursor = mongo_connection.db["media"].aggregate(pipeline)
    print ("after first aggregation")
    i = 0
    for doc in cursor:
        entity = doc["_id"].lower()
        entity_type =  doc["types"][0]
        if entity=="reporter" or entity=="us" or len(entity)<=2:
            continue
        top_entities.append(entity)

        #calculate count
        top_entities_scored[entity] = {"score":0, "type": entity_type}
        short_strings[entity] = entity
        types[entity_type] = 1 if entity_type not in types else types[entity_type]+1
        for count in doc["counts"]:
            top_entities_scored[entity]["score"] += int(count["count"])*float(count["relevance"])
        i+=1
        if i >= limit:
            break
    print ("finished for loop")
    top_entities_combinations = []
    iter_combinations = itertools.combinations_with_replacement(sorted(top_entities), 2) if with_replacement else itertools.combinations(sorted(top_entities), 2)
    for combination in iter_combinations:
        if clean_dups:
            # remove duplicate like "trump", "donald trump", "donald", "donald trump."
            if (are_same_entitiy (combination[0], combination[1], top_entities_scored)):
                included = 1 if len(combination[1])<len(combination[0]) else 0
                including = 1-included
                if ((combination[1] in top_entities_scored) and (combination[0] in top_entities_scored)):
                    scores = [top_entities_scored[combination[including]]["score"], top_entities_scored[combination[included]]["score"]]
                    top_entities_scored[combination[including]]["score"] = max(scores)+min(scores)/10
                else:
                    for key in  sorted(top_entities_scored.iterkeys()):
                        top_entities_scored[key]["score"] *= 1.1 if combination[included] in key else 1
                top_entities_scored.pop(combination[included], None)
                short_strings[combination[including]] = combination[included] if len(combination[included])< len(short_strings[combination[including]]) else short_strings[combination[including]]
            else:
                top_entities_combinations.append(combination)
        else:
            top_entities_combinations.append(combination)


    print ("finished second for loop")
    num_entities = len(top_entities)
    print ("num_entities %d"%num_entities)
    # find items
    captions = "closed_captions_no_comm"
    media = "media_url_no_comm"
    pipeline = [
            {"$match": {"date_added": {"$gt": millis_since(window)}}},
            {"$project": {captions: 1, media:1}},
            {"$unwind": "$"+captions}
        ]
    cursor = mongo_connection.db["media"].aggregate(pipeline)
    supp = {}
    print ("seceond aggregation done")
    captions_list = []
    punctuation = '!"\'#$%&()*+,-./:;<=>?@[\\]^_{|}~'
    regex = re.compile('[%s]' % re.escape(punctuation))
    for doc in cursor:
        cap = doc[captions]["text"].lower()
        link = doc[media]+"#t="+str(int(doc[captions]["start"]/1000))
        media_id = str(doc["_id"])
        captions_list.append({
            "cap":re.sub('\n',' ',regex.sub('',cap)), # removing punctuation
            "link": link,
            "media_id": media_id,
            "text":re.sub(r'[^\w]', ' ', cap) 
            })      
    print ("for loop")
    count = 0
    print (len(top_entities_combinations))
    for combination in top_entities_combinations:
        #print (count)
        count+=1
        matching_caps = [cap for cap in captions_list if short_strings[combination[0]] in cap["cap"] and short_strings[combination[1]] in cap["cap"]]
        if len(matching_caps)>0:
            key = ','.join(sorted([combination[0], combination[1]]))
            if key in supp:
                supp[key]["count"] += len(matching_caps)
                supp[key]["matching_caps"].extend(matching_caps)
            else:
                supp[key] = {
                    "count" : len(matching_caps),
                    "matching_caps" : matching_caps
                    }
    #combs = {k:v for k,v in supp.iteritems() if v["count"]>1}
    combs = supp
    print ("finished second for loop")
    # remove entities with no video:
    del_keys = []
    for key in top_entities_scored:
        del_key = True
        if ','.join([key, key]) in combs:
            del_key = False
        else:
            for comb in combs:
                if key in comb:
                    del_key = False
        if del_key:
            del_keys.append(key)
    for key in del_keys:
        top_entities_scored.pop(key, None)
    print ("finished del keys")
    total_time = millis() - startTime
    scored_entities_arr =  sorted(top_entities_scored.items(), key=lambda (x, y): y['score'], reverse=True)
    ret_val = {"results": {
                "top_entites": top_entities,
                "sets": combs,
                "sets_length": len(combs),
                "num_entities": num_entities,
                "scored_entities": scored_entities_arr,
                "scored_entities_length": len(scored_entities_arr),
                "short_strings": short_strings,
                "types":types,
                "run_time": total_time
                },
                "args": {
                        "limit": limit,
                        "window": window,
                        "aligned": aligned,
                        "clean_dups": clean_dups,
                        "with_replacement": with_replacement
                }
            }
    return (json.dumps(ret_val))

def are_same_entitiy (entity_1, entity_2, entities_dict):
     # TODO: create a list of couples to enforce
     # "republican in list"??
    enforced_words = ["trump", "york"]
    # TODO: create a list of couples to ignore
    ignore_words = ["president", "tim", "donald trump ryan", "new york times", "senate", "sara", "republican national committee headquarters", "paul ryan justice"]
    for word in enforced_words:
        if  (word in entity_1 and word in entity_2 and entity_1!=entity_2 
            and entity_1 not in ignore_words and entity_2 not in ignore_words):
            return True
    return False

if __name__ == '__main__':
    app.run(debug=True)

