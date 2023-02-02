// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract NFTReward is ERC20, ERC20Burnable, Ownable {
    mapping(address controller => bool is_permitted) public controllers;
    uint256 public immutable maxSupply;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply
    )
        ERC20(
            bytes(_name).length > 0 ? _name : "NFT Reward Null",
            bytes(_symbol).length > 0 ? _symbol : "RWD-NUL"
        )
    {
        maxSupply = _maxSupply * 1 ether;
        // pre-minting half of the tokens to the owner account.
        _mint(msg.sender, maxSupply / 2);
    }

    function addController(address controller) public onlyOwner {
        controllers[controller] = true;
    }

    function removeController(address controller) public onlyOwner {
        controllers[controller] = false;
    }

    function mint(address to, uint256 amount) public {
        require(controllers[msg.sender], "only controllers can mint");
        require(
            (totalSupply() + amount) <= maxSupply,
            "Maximum supply has been reached"
        );
        _mint(to, amount);
    }

    function burnFrom(address account, uint256 amount) public override {
        if (controllers[msg.sender]) {
            _burn(account, amount);
        } else {
            super.burnFrom(account, amount);
        }
    }
}
