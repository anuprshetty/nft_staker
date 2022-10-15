// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./nft_minter.sol";
import "./nft_reward.sol";

contract NFTStaker is Ownable, IERC721Receiver {}
