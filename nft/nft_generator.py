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


def run_cli_command(command):
    process = subprocess.Popen(
        command.split(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    output, error = process.communicate()
    return output.strip(), error.strip()


def ipfs_push_with_ipfs_cli(ipfs_node_rpc_api, folder_path):
    ipfs_cli_command = f"ipfs --api {ipfs_node_rpc_api} add -r {folder_path}"
    output, error = run_cli_command(ipfs_cli_command)

    # if error:
    #     print(f"Error in ipfs_push_with_ipfs_cli: {error}")
    #     exit(1)

    files_folder_cid = output.split()[-2]

    ipfs_cli_command = f"ipfs --api {ipfs_node_rpc_api} pin add {files_folder_cid}"  # Explicitly pin the content to ensure that it's not garbage collected in the IPFS node.
    output, error = run_cli_command(ipfs_cli_command)

    if error:
        print(f"Error in ipfs_push_with_ipfs_cli: {error}")
        exit(1)

    return files_folder_cid


def nft_image_generator(input_nfts_info):
    nft_image_folders_cids = []
    for input_nft_info in input_nfts_info:
        image_path = os.path.join(
            os.path.dirname(__file__), "inputs/images/", input_nft_info["image_name"]
        )
        image_extension = os.path.splitext(input_nft_info["image_name"])[1][1:]
        num_copies = input_nft_info["num_copies"]
        ipfs_node_rpc_api = input_nft_info["ipfs_node_rpc_api"]

        temp_folder_path = os.path.join(
            os.path.dirname(__file__),
            f"outputs/temp_nft_images/{input_nft_info['nft_collection_id']}/",
        )

        if not os.path.exists(temp_folder_path):
            os.makedirs(temp_folder_path)

        with Image.open(image_path) as base_image:
            nft_images = []
            for image_id in range(1, num_copies + 1):
                nft_image = io.BytesIO()
                base_image.save(nft_image, format=image_extension)
                nft_image.seek(0)
                nft_images.append(nft_image.getvalue())

                temp_file_path = os.path.join(
                    temp_folder_path, str(image_id) + "." + image_extension
                )

                with open(temp_file_path, "wb") as temp_file:
                    nft_image.seek(0)
                    temp_file.write(nft_image.getvalue())

        # nft_image_folder_cid = ipfs_push_with_ipfshttpclient(
        #     ipfs_node_rpc_api, nft_images, image_extension
        # )

        nft_image_folder_cid = ipfs_push_with_ipfs_cli(
            ipfs_node_rpc_api, temp_folder_path
        )

        nft_image_folders_cids.append(nft_image_folder_cid)

    return nft_image_folders_cids


