import os
import json
import io
import copy

from PIL import Image
import ipfshttpclient
import subprocess


def get_json_content(json_file_path):
    with open(json_file_path, "r") as json_file:
        json_content = json.load(json_file)

    return json_content


def get_input_nfts_info():
    file_path = os.path.join(os.path.dirname(__file__), "inputs/input_nfts_info.json")

    input_nfts_info = get_json_content(file_path)

    return input_nfts_info


