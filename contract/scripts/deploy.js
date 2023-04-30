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

  static async display_hardhat_network_info() {
    let provider = hre.ethers.provider;

    const hardhat_network_info = {
      name: provider._networkName,
      url:
        "url" in hre.config.networks[provider._networkName]
          ? hre.config.networks[provider._networkName].url
          : "",
      chainId: parseInt((await provider.getNetwork()).chainId),
    };

    console.log("\n---------------- Hardhat Network Info ----------------");
    console.log(`${JSON.stringify(hardhat_network_info, null, 2)}`);
    console.log("------------------------------------------------------\n");
  }

  static setup_dapp_contracts_info() {
    const folder_path = path.join(__dirname, "..", "dapp_contracts_info/");

    if (fs.existsSync(folder_path)) {
      fs.rmSync(folder_path, { recursive: true });
    }
    fs.mkdirSync(folder_path);

    return folder_path;
  }

  static async generate_dapp_contract_info(contractName, contractInstances) {
    const artifact = await hre.artifacts.readArtifact(contractName);

    const dapp_contract_info = {
      contractName: artifact.contractName,
      sourceName: artifact.sourceName,
      contractInstances: contractInstances,
      abi: artifact.abi,
    };

    fs.writeFileSync(
      path.join(
        Utils.dapp_contracts_info_folder_path,
        `${dapp_contract_info.contractName}.json`
      ),
      JSON.stringify(dapp_contract_info, null, 2)
    );
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

  async deployContract() {
    const maxRetries = 6;
    const retryDelaySeconds = 10;

    let retries = 0;

    while (retries < maxRetries) {
      try {
        const Contract = await hre.ethers.getContractFactory(
          this.contract_name
        );
        this.contract = await Contract.deploy(
          ...this.contract_constructor_args
        );
        await this.contract.waitForDeployment();
        break;
      } catch (error) {
        if ("code" in error && error.code === "UND_ERR_HEADERS_TIMEOUT") {
          console.error(
            `Error UND_ERR_HEADERS_TIMEOUT (${this.contract_name} contract). Retrying in ${retryDelaySeconds} seconds ...`
          );

          retries++;

          await new Promise((resolve) =>
            setTimeout(resolve, retryDelaySeconds * 1000)
          );
        } else {
          throw error;
        }
      }
    }

    if (retries === maxRetries) {
      console.error(
        `Error UND_ERR_HEADERS_TIMEOUT (${this.contract_name} contract). Failed to deploy after ${maxRetries} retries.`
      );
      process.exitCode = 1;
    }

    this.contract_address = this.contract.target;

    hre.ethernalUploadAst = true;
    await hre.ethernal.push({
      name: this.contract_name,
      address: this.contract_address,
    });

    Utils.contracts_setup_outputs[this.contract_name][
      this.contract_instance_name
    ]["address"] = this.contract_address;
  }

  async attachContract() {
    const Contract = await hre.ethers.getContractFactory(this.contract_name);

    this.contract = Contract.attach(this.contract_address);

    Utils.contracts_setup_outputs[this.contract_name][
      this.contract_instance_name
    ]["address"] = this.contract_address;
  }
}

class Token extends BaseContract {
  constructor(contract_instance_name, contract_constructor_args) {
    super("Token", contract_instance_name);

    this.symbol = contract_constructor_args.symbol;
    this.contract_constructor_args = [
      contract_constructor_args.name,
      contract_constructor_args.symbol,
      contract_constructor_args.maxSupply,
    ];
  }

  async mint(to, amount) {
    await (await this.contract.mint(to, amount)).wait();

    if (parseInt(await this.contract.balanceOf(to)) !== amount) {
      throw new Error(
        `Error in ${this.mint.name}() method while setting up ${this.contract_name} contract - ${this.contract_instance_name} contract_instance`
      );
    }
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

  async addCustomPaymentCurrency(currency_index, symbol, token, cost) {
    await (
      await this.contract.addCustomPaymentCurrency(symbol, token, cost)
    ).wait();

    const customPaymentCurrency = await this.contract.customPaymentCurrencies(
      currency_index
    );

    if (
      customPaymentCurrency.symbol !== symbol ||
      customPaymentCurrency.token !== token ||
      parseInt(customPaymentCurrency.cost) !== cost
    ) {
      throw new Error(
        `Error in ${this.addCustomPaymentCurrency.name}() method while setting up ${this.contract_name} contract - ${this.contract_instance_name} contract_instance`
      );
    }
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

class NFTReward extends BaseContract {
  constructor(contract_instance_name, contract_constructor_args) {
    super("NFTReward", contract_instance_name);

    this.contract_constructor_args = [
      contract_constructor_args.name,
      contract_constructor_args.symbol,
      contract_constructor_args.maxSupply,
    ];
  }

  async addController(controller) {
    await (await this.contract.addController(controller)).wait();

    if (!(await this.contract.controllers(controller))) {
      throw new Error(
        `Error in ${this.addController.name}() method while setting up ${this.contract_name} contract - ${this.contract_instance_name} contract_instance`
      );
    }
  }
}

class NFTStaker extends BaseContract {
  constructor(contract_instance_name) {
    super("NFTStaker", contract_instance_name);

    this.rewardIntervalType = {
      per_second: 0,
      per_min: 1,
      per_hour: 2,
      per_day: 3,
      per_month: 4,
      per_year: 5,
    };
  }

  async addVault(
    vault_index,
    name,
    isActive,
    nftMinter,
    nftReward,
    intervalRewardPrice,
    rewardIntervalType
  ) {
    await (
      await this.contract.addVault(
        name,
        isActive,
        nftMinter,
        nftReward,
        intervalRewardPrice,
        rewardIntervalType
      )
    ).wait();

    const vault = await this.contract.vaults(vault_index);

    if (
      vault.name !== name ||
      vault.isActive !== isActive ||
      vault.nftMinter !== nftMinter ||
      vault.nftReward !== nftReward ||
      parseInt(vault.intervalRewardPrice) !== intervalRewardPrice ||
      parseInt(vault.rewardIntervalType) !== rewardIntervalType
    ) {
      throw new Error(
        `Error in ${this.addVault.name}() method while setting up ${this.contract_name} contract - ${this.contract_instance_name} contract_instance`
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

  async deploy() {
    const token_alp = new Token("token_alpha", {
      name: "Token Alpha",
      symbol: "TKN-ALP",
      maxSupply: 1000000,
    });
    const token_bet = new Token("token_beta", {
      name: "Token Beta",
      symbol: "TKN-BET",
      maxSupply: 1000000,
    });
    const token_gam = new Token("token_gamma", {
      name: "Token Gamma",
      symbol: "TKN-GAM",
      maxSupply: 1000000,
    });

    this.tokens = [token_alp, token_bet, token_gam];

    for (const token of this.tokens) {
      await token.deployContract();
    }

    const hash_wallet_accounts = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "..", "hash_wallet_accounts.json"),
        "utf8"
      )
    );

    for (const token of this.tokens) {
      for (const account of hash_wallet_accounts) {
        await token.mint(account.address, 10000);
      }
    }

    const output_nfts_info = await this.get_output_nfts_info();

    this.nft_collections = [];
    for (let output_nft_info in output_nfts_info) {
      output_nft_info = output_nfts_info[output_nft_info];

      const nft_collection = new NFTMinter(
        output_nft_info.nft_collection_id,
        output_nft_info
      );
      this.nft_collections.push(nft_collection);
    }

    for (const nft_collection of this.nft_collections) {
      await nft_collection.deployContract();
    }

    for (const [c_index, nft_collection] of this.nft_collections.entries()) {
      for (const [t_index, token] of this.tokens.entries()) {
        const cost = parseInt((c_index + 1) * (t_index + 1));
        await nft_collection.addCustomPaymentCurrency(
          t_index,
          token.symbol,
          token.contract_address,
          cost
        );
      }
    }

    const nft_reward_gld = new NFTReward("nft_reward_gold", {
      name: "NFT Reward Gold",
      symbol: "RWD-GLD",
      maxSupply: 1000000,
    });
    const nft_reward_slv = new NFTReward("nft_reward_silver", {
      name: "NFT Reward Silver",
      symbol: "RWD-SLV",
      maxSupply: 1000000,
    });
    const nft_reward_ptm = new NFTReward("nft_reward_platinum", {
      name: "NFT Reward Platinum",
      symbol: "RWD-PTM",
      maxSupply: 1000000,
    });

    this.nft_rewards = [nft_reward_gld, nft_reward_slv, nft_reward_ptm];

    for (const nft_reward of this.nft_rewards) {
      await nft_reward.deployContract();
    }

    const nft_staker = new NFTStaker("nft_staker");
    this.nft_stakers = [nft_staker];
    await nft_staker.deployContract();

    for (const nft_reward of this.nft_rewards) {
      await nft_reward.addController(nft_staker.contract_address);
    }

    const [nft_collection_tnj, nft_collection_mcm, nft_collection_sbd] =
      this.nft_collections;

    const vaults = [
      {
        name: "tom_and_jerry-gold",
        isActive: true,
        nftMinter: nft_collection_tnj.contract_address,
        nftReward: nft_reward_gld.contract_address,
        intervalRewardPrice: 30,
        rewardIntervalType: nft_staker.rewardIntervalType.per_min,
      },
      {
        name: "mickey_mouse-silver",
        isActive: true,
        nftMinter: nft_collection_mcm.contract_address,
        nftReward: nft_reward_slv.contract_address,
        intervalRewardPrice: 20,
        rewardIntervalType: nft_staker.rewardIntervalType.per_hour,
      },
      {
        name: "scooby_doo-platinum",
        isActive: true,
        nftMinter: nft_collection_sbd.contract_address,
        nftReward: nft_reward_ptm.contract_address,
        intervalRewardPrice: 10,
        rewardIntervalType: nft_staker.rewardIntervalType.per_day,
      },
    ];

    for (const [vault_index, vault] of vaults.entries()) {
      await nft_staker.addVault(
        vault_index,
        vault.name,
        vault.isActive,
        vault.nftMinter,
        vault.nftReward,
        vault.intervalRewardPrice,
        vault.rewardIntervalType
      );
    }

    const dapp_contracts_info = [
      {
        contractName: this.tokens[0].contract_name,
        contractInstances: this.tokens.map((token) => ({
          name: token.contract_instance_name,
          address: token.contract_address,
        })),
      },
      {
        contractName: this.nft_collections[0].contract_name,
        contractInstances: this.nft_collections.map((nft_collection) => ({
          name: nft_collection.contract_instance_name,
          address: nft_collection.contract_address,
        })),
      },
      {
        contractName: this.nft_rewards[0].contract_name,
        contractInstances: this.nft_rewards.map((nft_reward) => ({
          name: nft_reward.contract_instance_name,
          address: nft_reward.contract_address,
        })),
      },
      {
        contractName: this.nft_stakers[0].contract_name,
        contractInstances: this.nft_stakers.map((nft_staker) => ({
          name: nft_staker.contract_instance_name,
          address: nft_staker.contract_address,
        })),
      },
    ];

    for (const dapp_contract_info of dapp_contracts_info) {
      await Utils.generate_dapp_contract_info(
        dapp_contract_info.contractName,
        dapp_contract_info.contractInstances
      );
    }
  }

  async setBaseURI() {
    for (const nft_collection of this.nft_collections) {
      await nft_collection.setBaseURI(
        nft_collection.output_nft_info.nft_metadata_folder_cid
      );
    }
  }
}

class DeploySetup extends BaseDeploy {
  async deploySetup() {
    await this.deploy();
    await this.setup();
  }

  async get_output_nfts_info() {
    return JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../..", "nft/outputs/output_nfts_info.json"),
        "utf8"
      )
    );
  }

  async setup() {
    await this.setBaseURI();
  }
}

class DeployE2E extends BaseDeploy {
  async deployE2E() {
    await this.deploy();
  }

  async get_output_nfts_info() {
    const output_nfts_info = {
      tom_and_jerry: {
        nft_collection_id: "tom_and_jerry",
        nft_collection_name: "NFT Collection TomAndJerry",
        name: "Tom and Jerry",
        symbol: "COL-TNJ",
        image_name: "tom_and_jerry.png",
        num_copies: 0,
        ipfs_node_rpc_api: "/ip4/127.0.0.1/tcp/5001",
        nft_image_folder_cid: "",
        nft_metadata_folder_cid: "",
      },
      mickey_mouse: {
        nft_collection_id: "mickey_mouse",
        nft_collection_name: "NFT Collection MickeyMouse",
        name: "Mickey Mouse",
        symbol: "COL-MCM",
        image_name: "mickey_mouse.png",
        num_copies: 0,
        ipfs_node_rpc_api: "/ip4/127.0.0.1/tcp/5001",
        nft_image_folder_cid: "",
        nft_metadata_folder_cid: "",
      },
      scooby_doo: {
        nft_collection_id: "scooby_doo",
        nft_collection_name: "NFT Collection ScoobyDoo",
        name: "Scooby Doo",
        symbol: "COL-SBD",
        image_name: "scooby_doo.png",
        num_copies: 0,
        ipfs_node_rpc_api: "/ip4/127.0.0.1/tcp/5001",
        nft_image_folder_cid: "",
        nft_metadata_folder_cid: "",
      },
    };

    return output_nfts_info;
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
      fs.readFileSync(
        path.join(__dirname, "..", "contracts_setup_inputs.json"),
        "utf8"
      )
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

async function main() {
  const DEPLOY_MODES = ["DeploySetup", "DeployE2E", "SetupE2E"];
  const DEPLOY_MODE = process.env.DEPLOY_MODE;
  if (!DEPLOY_MODE || !DEPLOY_MODES.includes(DEPLOY_MODE)) {
    throw new Error("Invalid DEPLOY_MODE");
  }

  await hre.run("compile");

  await Utils.display_hardhat_network_info();

  console.log("-----------------------------------------------------");
  console.log("------------- Contracts Deployment Info -------------");
  console.log("-----------------------------------------------------");

  if (DEPLOY_MODE === "DeploySetup") {
    const deploy_setup = new DeploySetup();
    await deploy_setup.deploySetup();
  } else if (DEPLOY_MODE === "DeployE2E") {
    const deploy_e2e = new DeployE2E();
    await deploy_e2e.deployE2E();
  } else if (DEPLOY_MODE === "SetupE2E") {
    const setup_e2e = new SetupE2E();
    await setup_e2e.setupE2E();
  } else {
    throw new Error("Invalid DEPLOY_MODE");
  }

  console.log(`\n${JSON.stringify(Utils.contracts_setup_outputs, null, 2)}`);
  console.log("-----------------------------------------------------");

  console.log("\nSUCCESS: contracts deployment ... DONE");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {});
