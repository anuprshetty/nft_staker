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


def ipfs_push_with_ipfshttpclient(ipfs_node_rpc_api, files, file_extension):
    # IMPORTANT:
    # - Error: ipfshttpclient.exceptions.VersionMismatch: Unsupported daemon version '0.25.0' (not in range: 0.4.23 ≤ … < 0.8.0)
    # - Known Issue: ipfshttpclient doesn't work on ipfs daemon version which is not in above range. So we are using ipfs cli commands.
    with ipfshttpclient.connect(ipfs_node_rpc_api) as ipfs_client:
        files_folder = {
            f"{file_id}.{file_extension}": file
            for file_id, file in enumerate(files, start=1)
        }
        files_folder_info = ipfs_client.add(files_folder, wrap_with_directory=True)

        files_folder_cid = files_folder_info["Hash"]

        ipfs_client.pin.add(
            files_folder_cid
        )  # Explicitly pin the content to ensure that it's not garbage collected in the IPFS node.

        return files_folder_cid


