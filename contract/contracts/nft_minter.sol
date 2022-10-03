// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NFTMinter is ERC721Enumerable, Ownable {
    using Strings for uint256;
    string public baseURI = "";
    string public baseExtension = ".json";
    uint256 public cost = 0.0001 ether; // native payment currency cost.
    uint256 public maxSupply = 1000;
    uint256 public maxMintAmount = 5;
    bool public paused = false;

    struct CustomPaymentCurrency {
        string symbol;
        IERC20 token;
        uint256 cost;
    }

    CustomPaymentCurrency[] public customPaymentCurrencies;

    constructor(
        string memory _name,
        string memory _symbol
    )
        ERC721(
            bytes(_name).length > 0 ? _name : "TomAndJerry NFT Collection",
            bytes(_symbol).length > 0 ? _symbol : "TNJC"
        )
    {}

    function setCost(uint256 newCost) public onlyOwner {
        cost = newCost;
    }

    function setmaxMintAmount(uint256 _newmaxMintAmount) public onlyOwner {
        require(
            _newmaxMintAmount > 0 && _newmaxMintAmount <= maxSupply,
            "Invalid maxMintAmount"
        );
        maxMintAmount = _newmaxMintAmount;
    }

    function setBaseURI(string memory _NFTMetadataFolderCID) public onlyOwner {
        baseURI = bytes(_NFTMetadataFolderCID).length > 0
            ? string(abi.encodePacked("ipfs://", _NFTMetadataFolderCID, "/"))
            : "";
    }

    function setBaseExtension(
        string memory _newBaseExtension
    ) public onlyOwner {
        baseExtension = _newBaseExtension;
    }

    function pause(bool _state) public onlyOwner {
        paused = _state;
    }

    function walletOfOwner(
        address _owner
    ) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        tokenId.toString(),
                        baseExtension
                    )
                )
                : "";
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }
}
