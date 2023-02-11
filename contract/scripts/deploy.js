// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

class Utils {
  static dapp_contracts_info_folder_path;
  static contracts_setup_outputs = {};

  static {
    Utils.dapp_contracts_info_folder_path = Utils.setup_dapp_contracts_info();
  }

  

  static setup_dapp_contracts_info() {
    const folder_path = path.join(__dirname, "..", "dapp_contracts_info/");

    if (fs.existsSync(folder_path)) {
      fs.rmSync(folder_path, { recursive: true });
    }
    fs.mkdirSync(folder_path);

    return folder_path;
  }

  
}

