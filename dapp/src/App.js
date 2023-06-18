// import logo from "./logo.svg";
import "./App.css";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";
import Web3 from "web3";
import contractsInfo from "./contractsInfo";
import React, { Component } from "react";
import { formatBalance, formatChainAsNum } from "./utils";
import axios from "axios";

export default class App extends Component {
  constructor() {
    super();

    this.state = {
      wallet: { accounts: [], balance: 0, chainId: 0 },
      mintPrice: 0,
      maxMintAmount: 1,
      maxSupply: 0,
      totalSupply: 0,
      mintedNFTs: [],
      customPaymentCurrencies: [],
    };

    this.ipfsGateway = process.env.REACT_APP_IPFS_GATEWAY;

    this.contract = null;

    const web3_readonly = new Web3(
      new Web3.providers.HttpProvider(
        process.env.REACT_APP_EVMCHAIN_HTTP_PROVIDER_URL_READONLY
      )
    );
    this.contract_readonly = new web3_readonly.eth.Contract(
      contractsInfo.NFTMinter.abi,
      contractsInfo.NFTMinter.contractInstances[0]["address"]
    );
  }

  refreshMintPrice = async () => {
    var mintPrice = await this.contract_readonly.methods.cost().call();
    mintPrice = Web3.utils.fromWei(mintPrice, "ether");

    this.setState((prevState) => ({
      ...prevState,
      mintPrice: mintPrice,
    }));
  };

  refreshMaxMintAmount = async () => {
    var maxMintAmount = parseInt(
      await this.contract_readonly.methods.maxMintAmount().call()
    );

    this.setState((prevState) => ({
      ...prevState,
      maxMintAmount: maxMintAmount,
    }));
  };

  refreshMaxSupply = async () => {
    var maxSupply = parseInt(
      await this.contract_readonly.methods.maxSupply().call()
    );

    this.setState((prevState) => ({
      ...prevState,
      maxSupply: maxSupply,
    }));
  };

  refreshTotalSupply = async () => {
    var totalSupply = parseInt(
      await this.contract_readonly.methods.totalSupply().call()
    );

    this.setState((prevState) => ({
      ...prevState,
      totalSupply: totalSupply,
    }));
  };

  fetchBaseURI = async () => {
    var baseURI = await this.contract_readonly.methods.baseURI().call();

    return baseURI;
  };

  fetchBaseExtension = async () => {
    var baseExtension = await this.contract_readonly.methods
      .baseExtension()
      .call();

    return baseExtension;
  };

  fetchOwnerOfToken = async (tokenId) => {
    var owner = await this.contract_readonly.methods.ownerOf(tokenId).call();

    return owner;
  };

  refreshMintedNFTs = async () => {
    var mintedNFTs = [];
    var baseURI = await this.fetchBaseURI();
    var baseExtension = await this.fetchBaseExtension();

    for (let tokenId = 1; tokenId <= this.state.totalSupply; tokenId++) {
      var tokenURI =
        baseURI.replace("ipfs://", "") + String(tokenId) + baseExtension;

      var ipfsJsonURI = this.ipfsGateway + "ipfs/" + tokenURI;
      try {
        var response = await axios.get(ipfsJsonURI);
        var NFTMetadata = response.data;
        var ipfsImageURI =
          this.ipfsGateway + "ipfs/" + NFTMetadata.image.replace("ipfs://", "");
      } catch (error) {
        NFTMetadata = {};
        ipfsImageURI = "";
        console.error("IPFS error: ", error);
      }
      var owner = await this.fetchOwnerOfToken(tokenId);

      var mintedNFT = {
        name:
          NFTMetadata instanceof Object && "name" in NFTMetadata
            ? NFTMetadata.name
            : "NFT info not found",
        imageURI: ipfsImageURI ? ipfsImageURI : "",
        owner: owner,
      };
      mintedNFTs.push(mintedNFT);
    }

    this.setState((prevState) => ({
      ...prevState,
      mintedNFTs: mintedNFTs,
    }));
  };

  refreshCustomPaymentCurrencies = async () => {
    var customPaymentCurrencies = await this.contract_readonly.methods
      .getCustomPaymentCurrencies()
      .call();

    this.setState((prevState) => ({
      ...prevState,
      customPaymentCurrencies: customPaymentCurrencies,
    }));
  };

  async componentDidMount() {
    console.log("component mounted");
    console.log("contractsInfo: ", contractsInfo);
    await this.refreshMintPrice();
    await this.refreshMaxMintAmount();
    await this.refreshMaxSupply();
    await this.refreshTotalSupply();
    await this.refreshMintedNFTs();
    await this.refreshCustomPaymentCurrencies();
  }

  async componentWillUnmount() {
    window.ethereum?.removeListener("chainChanged", this.refreshPage);
    window.ethereum?.removeListener("accountsChanged", this.refreshAccounts);
  }

  ethChainId = async () => {
    try {
      var chainId = formatChainAsNum(
        await window.ethereum.request({
          method: "eth_chainId",
        })
      );

      return chainId;
    } catch (err) {
      console.error("Error connecting to wallet: ", err);
      return 0;
    }
  };

  refreshPage = () => {
    window.location.reload(true);
  };

  refreshChain = async () => {
    var chainId = await this.ethChainId();

    this.setState((prevState) => ({
      ...prevState,
      wallet: {
        ...prevState.wallet,
        chainId: chainId,
      },
    }));
  };

  ethRequestAccounts = async () => {
    try {
      var accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      return accounts;
    } catch (err) {
      console.error("Error connecting to wallet: ", err);
      return [];
    }
  };

  ethGetBalance = async (account) => {
    var balance = formatBalance(
      await window.ethereum.request({
        method: "eth_getBalance",
        params: [account, "latest"], // balance of the account at the latest block
      })
    );

    return balance;
  };

  refreshAccounts = async () => {
    var accounts = await this.ethRequestAccounts();
    var balance = 0;
    if (accounts.length > 0) {
      balance = await this.ethGetBalance(accounts[0]);
    }

    this.setState((prevState) => ({
      ...prevState,
      wallet: {
        ...prevState.wallet,
        accounts: accounts,
        balance: balance,
      },
    }));
  };

  connectWallet = async () => {
    if (window.ethereum) {
      let web3 = new Web3(window.ethereum);

      await this.refreshChain();
      await this.refreshAccounts();

      window.ethereum.on("chainChanged", this.refreshPage);
      window.ethereum.on("accountsChanged", this.refreshAccounts);

      this.contract = new web3.eth.Contract(
        contractsInfo.NFTMinter.abi,
        contractsInfo.NFTMinter.contractInstances[0]["address"]
      );
    } else {
      console.log("Please install a wallet");
    }
  };

  mint = async () => {
    if (window.ethereum) {
      var mintAmount = Number(document.querySelector("[name=amount]").value);

      // The call() method is used for reading data from the contract without making any modifications to the contract state. It returns the function's return value or an error if the function reverts.
      var mintPrice = Number(await this.contract.methods.cost().call());

      var totalPrice = mintPrice * mintAmount;
      var account = this.state.wallet.accounts[0];

      // The send() method is used for executing contract functions that modify the contract state. It returns a transaction hash that can be used to track the status of the transaction.
      this.contract.methods
        .mint(account, mintAmount)
        .send({ from: account, value: String(totalPrice) });
    } else {
      console.error("Wallet not installed");
    }
  };

  render() {
    return (
      <div className="App">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <form
                className="gradient my-5 p-2"
                style={{
                  borderRadius: "25px",
                  boxShadow: "1px 1px 15px #000000",
                }}
              >
                <h1 style={{ fontWeight: 900, color: "#FFFFFF" }}>
                  NFT Mint Portal
                </h1>
                <Button
                  onClick={this.connectWallet}
                  variant="dark"
                  style={{
                    fontWeight: "bold",
                    margin: "5px",
                    color: "#FFFFFF",
                  }}
                >
                  Connect To Wallet
                </Button>
                {this.state.wallet.accounts.length > 0 && (
                  <div
                    className="card"
                    style={{
                      margin: "5px",
                      boxShadow: "1px 1px 4px #000000",
                    }}
                  >
                    <label
                      style={{ fontWeight: "bold", color: "#000000" }}
                      htmlFor="floating Input"
                    >
                      <i style={{ color: "blue" }}>Your Connected Account: </i>
                      <block>{this.state.wallet.accounts[0]}</block>
                    </label>
                    <label
                      style={{ fontWeight: "bold", color: "#000000" }}
                      htmlFor="floating Input"
                    >
                      <i style={{ color: "blue" }}>Balance: </i>
                      {this.state.wallet.balance} ETH
                    </label>
                    <label
                      style={{ fontWeight: "bold", color: "#000000" }}
                      htmlFor="floating Input"
                    >
                      <i style={{ color: "blue" }}>Blockchian Network ID: </i>
                      {this.state.wallet.chainId}
                    </label>
                  </div>
                )}
                <div
                  className="card"
                  style={{
                    margin: "5px",
                    boxShadow: "1px 1px 4px #000000",
                  }}
                >
                  <label
                    style={{ fontWeight: "bold", color: "#000000" }}
                    htmlFor="floating Input"
                  >
                    <i style={{ color: "blue" }}>NFT collection: </i>
                    <block>
                      <select
                        name="dropdown"
                        style={{
                          display: "inline-block",
                          fontWeight: 900,
                          color: "#000000",
                        }}
                        onChange={this.refreshCustomPaymentCurrencies}
                      >
                        {contractsInfo.NFTMinter.contractInstances.map(
                          (contractInstance, index) => (
                            <option key={index}>
                              {contractInstance.nftCollection}
                            </option>
                          )
                        )}
                      </select>
                    </block>
                  </label>
                  <label
                    style={{ fontWeight: "bold", color: "#000000" }}
                    htmlFor="floating Input"
                  >
                    <i style={{ color: "blue" }}>Tokens already minted: </i>
                    <block>
                      {" "}
                      {this.state.totalSupply} out of {this.state.maxSupply}
                    </block>
                  </label>
                  <label
                    style={{ fontWeight: "bold", color: "#000000" }}
                    htmlFor="floating Input"
                  >
                    <i style={{ color: "blue" }}>1 NFT minting price: </i>
                    <block> {this.state.mintPrice} ETH</block>
                  </label>
                </div>
                {this.state.wallet.accounts.length > 0 && (
                  <div
                    className="card"
                    style={{
                      margin: "5px",
                      boxShadow: "1px 1px 4px #000000",
                    }}
                  >
                    <label style={{ fontWeight: "bold", color: "#000000" }}>
                      Please select the amount of NFTs to mint
                    </label>
                    <input
                      type="number"
                      name="amount"
                      defaultValue="1"
                      min="1"
                      max={this.state.maxMintAmount}
                      style={{ fontWeight: "bold", color: "#000000" }}
                    />
                    <label style={{ fontWeight: "bold", color: "#000000" }}>
                      Mint with currency
                    </label>
                    <div>
                      <Button
                        onClick={this.mint}
                        variant="dark"
                        style={{
                          fontWeight: "bold",
                          display: "inline-block",
                          margin: "10px",
                          height: "50px",
                          width: "50px",
                        }}
                      >
                        <img
                          src={`token_ethereum.png`}
                          style={{
                            margin: "1px",
                            height: "25px",
                            width: "25px",
                          }}
                          alt={`token_ethereum`}
                        />
                      </Button>
                      {this.state.customPaymentCurrencies.length > 0 &&
                        this.state.customPaymentCurrencies.map(
                          (customPaymentCurrency, index) => {
                            return (
                              <Button
                                onClick={this.mint}
                                variant="dark"
                                style={{
                                  fontWeight: "bold",
                                  display: "inline-block",
                                  margin: "10px",
                                  height: "50px",
                                  width: "50px",
                                }}
                              >
                                <img
                                  src={`custom_payment_currencies/${customPaymentCurrency.name}.png`}
                                  style={{
                                    margin: "1px",
                                    height: "25px",
                                    width: "25px",
                                  }}
                                  alt={`${customPaymentCurrency.name}`}
                                />
                              </Button>
                            );
                          }
                        )}
                    </div>
                  </div>
                )}
              </form>
            </div>
            {this.state.mintedNFTs.length > 0 && (
              <div>
                <h1
                  class="text-gradient"
                  style={{ fontWeight: 900, margin: "10px" }}
                >
                  Minted NFTs
                </h1>
                <div className="row items mt-3">
                  <div
                    className="m1-3 mr-3"
                    style={{
                      display: "inline-grid",
                      gridTemplateColumns: "repeat(4, 5fr)",
                      columnGap: "10px",
                      rowGap: "10px",
                    }}
                  >
                    {this.state.mintedNFTs.map((mintedNFT, index) => {
                      return (
                        <div key={`id_${index}`} className="card nft-gradient">
                          <div className="image-over">
                            <img
                              className="card-img-top"
                              src={mintedNFT.imageURI}
                              alt={`nft_${index + 1}`}
                            />
                          </div>
                          <div className="card-caption col-12 p-0">
                            <div className="card-body">
                              <h6 className="mb-0" style={{ fontWeight: 900 }}>
                                {mintedNFT.name}
                              </h6>
                              <h6
                                className="mb-0 mt-2"
                                style={{ fontWeight: 600 }}
                              >
                                <i style={{ color: "blue" }}>Owner Account: </i>
                                <p>{mintedNFT.owner}</p>
                              </h6>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
