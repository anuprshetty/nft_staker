// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

class Utils {
  static contracts_setup_outputs = {};

  static async display_hardhat_network_info() {
    let provider = hre.ethers.provider;

    const hardhat_network_info = {
      chainId: parseInt((await provider.getNetwork()).chainId),
    };

    console.log("\n---------------- Hardhat Network Info ----------------");
    console.log(`${JSON.stringify(hardhat_network_info, null, 2)}`);
    console.log("------------------------------------------------------\n");
  }
}

class BaseContract {
  constructor(contract_name, contract_instance_name) {
    this.contract_name = contract_name;
    this.contract_instance_name = contract_instance_name;
    this.contract_address = "";
    this.contract = null;
    this.contract_constructor_args = [];

    if (!(this.contract_name in Utils.contracts_setup_outputs)) {
      Utils.contracts_setup_outputs[this.contract_name] = {};
    }
    Utils.contracts_setup_outputs[this.contract_name][
      this.contract_instance_name
    ] = {};
  }

  async attachContract() {
    const Contract = await hre.ethers.getContractFactory(this.contract_name);

    this.contract = Contract.attach(this.contract_address);

    Utils.contracts_setup_outputs[this.contract_name][
      this.contract_instance_name
    ]["address"] = this.contract_address;
  }
}

class NFTMinter extends BaseContract {
  constructor(contract_instance_name, output_nft_info) {
    super("NFTMinter", contract_instance_name);

    this.output_nft_info = output_nft_info;
    this.contract_constructor_args = [
      output_nft_info.nft_collection_name,
      output_nft_info.symbol,
    ];
  }

  async setBaseURI(NFTMetadataFolderCID) {
    await (await this.contract.setBaseURI(NFTMetadataFolderCID)).wait();

    if ((await this.contract.baseURI()) !== `ipfs://${NFTMetadataFolderCID}/`) {
      throw new Error(
        `Error in ${this.setBaseURI.name}() method while setting up ${this.contract_name} contract - ${this.contract_instance_name} contract_instance`
      );
    }
  }
}

class BaseDeploy {
  constructor() {
    this.tokens = [];
    this.nft_collections = [];
    this.nft_rewards = [];
    this.nft_stakers = [];
  }

  async setBaseURI() {
    for (const nft_collection of this.nft_collections) {
      await nft_collection.setBaseURI(
        nft_collection.output_nft_info.nft_metadata_folder_cid
      );
    }
  }
}

class SetupE2E extends BaseDeploy {
  async setupE2E() {
    await this.setup();
  }

  async setup() {
    await this.setupPrerequisites();
    await this.setBaseURI();
  }

  async setupPrerequisites() {
    const all_contracts_setup_inputs = JSON.parse(
      await remix.fileManager.getFile(`browser/contracts_setup_inputs.json`)
    );

    for (let contracts_setup_inputs in all_contracts_setup_inputs) {
      contracts_setup_inputs =
        all_contracts_setup_inputs[contracts_setup_inputs];
      for (let contract_setup_inputs in contracts_setup_inputs) {
        contract_setup_inputs = contracts_setup_inputs[contract_setup_inputs];
        if (!contract_setup_inputs.address) {
          throw new Error(`contracts_setup_inputs.json file is invalid.`);
        }
      }
    }

    const contracts_setup_inputs = all_contracts_setup_inputs.NFTMinter;

    this.nft_collections = [];
    for (let contract_setup_inputs in contracts_setup_inputs) {
      contract_setup_inputs = contracts_setup_inputs[contract_setup_inputs];

      const output_nft_info = {
        nft_metadata_folder_cid: contract_setup_inputs.nft_metadata_folder_cid,
      };

      const nft_collection = new NFTMinter(
        contract_setup_inputs.contract_instance_name,
        output_nft_info
      );
      nft_collection.contract_address = contract_setup_inputs.address;
      await nft_collection.attachContract();

      this.nft_collections.push(nft_collection);
    }
  }
}

(async () => {
  try {
    await Utils.display_hardhat_network_info();

    console.log("-----------------------------------------------------");
    console.log("------------- Contracts Deployment Info -------------");
    console.log("-----------------------------------------------------");

    const setup_e2e = new SetupE2E();
    await setup_e2e.setupE2E();

    console.log(`\n${JSON.stringify(Utils.contracts_setup_outputs, null, 2)}`);
    console.log("-----------------------------------------------------");

    console.log("\nSUCCESS: contracts deployment ... DONE");
  } catch (error) {
    console.log(
      "\n--------------------------- ERROR --------------------------\n"
    );
    console.error(error);
    console.log(
      "\n------------------------------------------------------------\n"
    );
    console.log(
      "ERROR NOTE:\n \
      1) Make sure hardhat network is running.\n \
      2) Make sure you have properly updated contracts_setup_inputs.json file."
    );
    process.exitCode = 1;
  }
})();
