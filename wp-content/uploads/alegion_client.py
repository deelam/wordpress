#! /usr/bin/env python3
"""
Basic script for testing Alegion API endpoints.

Run this script with the '-h' argument for a description of its usage.
The first action that must be done before anything else is 'cred'
to set credentials like so: ./alegion_client.py cred MY_REALM 'MY_USERNAME' 'MY_PASSWORD'
This will create a alegion-cred.json file that will be used for authentication for
subsequent actions. Use quotes around your username and password in case of odd characters.
Use the 'cred' action again to override the file if your credentials change.
For debugging purposes, the alegion-cred.json file is not encrypted so the password is visible.
Delete the alegion-cred.json file at the end of your session if desired.

When the access_token is expired, authentication will be automatically performed,
and the alegion-auth.json file will be updated with the authentication response
from the server and will be used for all actions.

Version: 2019.07.31
"""

import os
import time
import sys
import json
import argparse
import requests

# ======================= Credentials and Authentication ============================


def set_cred(username, password):
    content = {
        "username": username,
        "password": password
    }
    with open(credfile, 'w') as outfile:
        json.dump(content, outfile, indent=2)


def read_cread():
    if not os.path.exists(credfile):
        return False
    with open(credfile) as jsonfile:
        cred = json.load(jsonfile)
        globals().update(cred)
        return True


def get_auth_token(un, pwd):
    print("Getting new access_token")
    headers = {
        "Content-Type": "application/json",
        "cache-control": "no-cache"
    }
    payload = {
        "username": un,
        "password": pwd,
    }
    response = requests.request("POST",
        "https://app.alegion.com/api/v1/login",
        headers=headers, data=json.dumps(payload))

    if response.status_code == 200:
        jsonresponse = json.loads(response.content)
        with open(authfile, 'w') as outfile:
            json.dump(jsonresponse, outfile, indent=2)
        new_token = jsonresponse["access_token"]
        return new_token
    else:
        print("Error when asking for an access_token\n",
              response.status_code, response.text)
        sys.exit(1)


def load_auth_token():
    if not os.path.exists(authfile):
        return None
    fileage = time.time()-os.stat(authfile).st_mtime
    # print("  access_token age:", fileage)
    with open(authfile) as jsonfile:
        data = json.load(jsonfile)
        if fileage > data["expires_in"]:
            return None
        else:
            return data["access_token"]

# ===================== API requests ======================================


def request_and_print_response(req_type, url, headers={}, bodydata=None,
        files=None, pageSize=None, pageNum=None, sort=None):
    if "authorization" not in headers:
        headers["authorization"] = "Bearer %s" % token
    if "cache-control" not in headers:
        headers["cache-control"] = "no-cache"
    if bodydata and "content-type" not in headers:
        headers["content-type"] = "application/json"
    # headers["accepts"]="text/csv"

    print("-------------------------------------------------")
    print("Request URL: ", url)
    # print("  headers:", headers)
    reqParams = {}
    if(pageSize):
        reqParams['pageSize'] = pageSize
    if(pageNum):
        reqParams['page'] = pageNum
    if(sort):
        reqParams['sort'] = sort
    if(len(reqParams) > 0):
        print("  paginating with pageSize:", pageSize,
              " pageNum:", pageNum, " sort:", sort)

    response = requests.request(
        req_type, url, headers=headers, params=reqParams,
        data=bodydata, files=files)
    # https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
    if response.status_code >= 300:
        print("Error: ", response, response.text)
        sys.exit(1)
    else:
        print("-------------------------------------------------")
        #  https://stackoverflow.com/questions/24533018/get-a-header-with-python-and-convert-in-json-requests-urllib2-json
        print("Response headers:", json.dumps(
            dict(response.headers), indent=2))
        print("-------------------------------------------------")
        print("Response:", json.dumps(json.loads(response.content),
                                      indent=2, sort_keys=True))


def list_workflows(pageSize=None, pageNum=None, sort=None):
    request_and_print_response("GET",
                               alegion_baseurl+"/workflows",
                               pageSize=pageSize, pageNum=pageNum, sort=sort)


def list_batches(workflowId):
    request_and_print_response("GET",
                               alegion_baseurl+"/workflows/{}/batches"
                               .format(workflowId))


def create_batch(workflowId, name):
    payload = {
        "name": name
    }
    request_and_print_response("POST",
                               alegion_baseurl +
                               "/workflows/{}/batches".format(workflowId),
                               bodydata=json.dumps(payload))


def create_batch_json(workflowId, payload_string):
    payload = json.loads(payload_string)
    print("Payload:", json.dumps(payload, indent=2, sort_keys=True))
    request_and_print_response("POST",
                               alegion_baseurl +
                               "/workflows/{}/batches".format(workflowId),
                               bodydata=json.dumps(payload))


def get_batch(batchId):
    request_and_print_response("GET",
                               alegion_baseurl+"/batches/{}".format(batchId))


def edit_batch(batchId, payload_string):
    payload = json.loads(payload_string)
    print("Payload:", json.dumps(payload, indent=2, sort_keys=True))
    request_and_print_response("PUT",
                               alegion_baseurl+"/batches/{}".format(batchId),
                               bodydata=json.dumps(payload))


def add_record(batchId, payload_string):
    payload = json.loads(payload_string)
    print("Payload:", json.dumps(payload, indent=2, sort_keys=True))
    request_and_print_response("POST",
                               alegion_baseurl +
                               "/batches/{}/records".format(batchId),
                               bodydata=json.dumps(payload))


def add_records(batchId, payload_string):
    payload = json.loads(payload_string)
    print("Payload:", json.dumps(payload, indent=2, sort_keys=True))
    request_and_print_response("POST",
                               alegion_baseurl +
                               "/batches/{}/records/import".format(batchId),
                               bodydata=json.dumps(payload))


def add_records_json(batchId, json_filename):
    with open(json_filename) as jsonfile:
        payload = json.load(jsonfile)
        request_and_print_response("POST",
                                   alegion_baseurl +
                                   "/batches/{}/records/import".format(
                                       batchId),
                                   bodydata=json.dumps(payload))


def add_records_csv(batchId, csv_filename):
    with open(csv_filename, 'r') as csvfile:
        request_and_print_response("POST",
                                   alegion_baseurl +
                                   "/batches/{}/records/import-csv".format(
                                       batchId),
                                   files=dict(file=csvfile))


def list_records(batchId, pageSize=None, pageNum=None, sort=None):
    request_and_print_response("GET",
                               alegion_baseurl +
                               "/batches/{}/records".format(batchId),
                               pageSize=pageSize, pageNum=pageNum, sort=sort)


def get_results(batchId, pageSize=None, pageNum=None, sort=None):
    request_and_print_response("GET",
                               alegion_baseurl +
                               "/batches/{}/results".format(batchId),
                               pageSize=pageSize, pageNum=pageNum, sort=sort)

# ======================== Main program ==================================


credfile = 'alegion-cred.json'
authfile = 'alegion-auth.json'
alegion_baseurl = "https://app.alegion.com/api/v1"

actions = {
    "cred": set_cred,
    "workflows": list_workflows,
    "batches": list_batches,
    "createBatch": create_batch,
    "createBatchJson": create_batch_json,
    "batch": get_batch,
    "editBatch": edit_batch,
    "addRecord": add_record,
    "addRecords": add_records,
    "addRecordsJson": add_records_json,
    "addRecordsCsv": add_records_csv,
    "records": list_records,
    "results": get_results
}

help_text = """Following are possible actions, their parameters, and what each action does.
    cred username password                      : set credentials in the {} file
    workflows [pageSize] [pageNum] [sort]       : list your workflows
    batches workflowId                          : list batches in the specified workflow
    createBatch workflowId name                 : create a new batch with given name in the specified workflow
    createBatchJson workflowId jsonString       : create a new batch given as jsonString within the specified workflow
    batch batchId                               : get information about the specified batch
    editBatch batchId jsonString                : edit information about the specified batch
    addRecord batchId jsonString                : add a new record given as jsonString to the specified batch
    addRecords batchId jsonArrayString          : add new records given as jsonArrayString to the specified batch
    addRecordsJson batchId jsonFile             : add new records specified in jsonFile to the specified batch
    addRecordsCsv batchId csvFile               : add new records specified in csvFile to the specified batch
    records batchId [pageSize] [pageNum] [sort] : list records in the specified batch
    results batchId [pageSize] [pageNum] [sort] : show results associated with the specified batch

Some actions produce a lot of output. Use the optional pageSize, pageNum, and sort parameters to control pagination.
""".format(credfile)

parser = argparse.ArgumentParser(description="Basic commandline tool for testing Alegion API endpoints.",
                                 epilog=help_text,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument('action', help="action to perform")
parser.add_argument('actionparam', nargs="*", help="action parameters")
# parse command line parameters
args, unknown = parser.parse_known_args()  # ignore unknown args

action = args.action
actionparams = args.actionparam + unknown
# print("args: ", args, "unknown", unknown)

if action not in actions.keys():
    print("!! Unknown action:", action)
    parser.print_help()
    sys.exit(1)

if action != "cred":
    if read_cread():
        token = load_auth_token()
        if token is None:
            # re-authenticate
            token = get_auth_token(username, password)
        # print("Got token", token)
    else:
        print("Please set credentials by using the 'cred' action.")
        sys.exit(2)

func = actions.get(action)
if func:
    print("Calling:", func.__name__, "with parameters:", actionparams)
    func(*actionparams)

    if action == "cred":
        read_cread()
        # check that credentials are valid
        token = get_auth_token(username, password)
else:
    print("No such action: ", action)
    print("Try one of these: ", actions.keys())
