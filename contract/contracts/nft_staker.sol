// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./nft_minter.sol";
import "./nft_reward.sol";

contract NFTStaker is Ownable, IERC721Receiver {
    enum RewardIntervalType {
        per_second,
        per_min,
        per_hour,
        per_day,
        per_month,
        per_year
    }

    mapping(RewardIntervalType rewardIntervalType => uint256 rewardInterval)
        public rewardIntervals;

    struct Vault {
        string name;
        bool isActive;
        NFTMinter nftMinter;
        NFTReward nftReward;
        uint256 intervalRewardPrice;
        RewardIntervalType rewardIntervalType;
    }

    Vault[] public vaults;

    struct Stake {
        address owner;
        uint256 vaultIndex;
        uint24 tokenId;
        uint48 timestamp;
    }

    // mapping vaultIndex and tokenId to Stake
    mapping(uint256 vaultIndex => mapping(uint256 tokenId => Stake staked))
        public stakes;

    uint256 public totalStaked;

    event NFTStaked(
        address owner,
        uint256 vaultIndex,
        uint256 tokenId,
        uint256 timestamp
    );
    event NFTUnstaked(
        address owner,
        uint256 vaultIndex,
        uint256 tokenId,
        uint256 timestamp
    );
    

    constructor() {
        rewardIntervals[RewardIntervalType.per_second] = 1;
        rewardIntervals[RewardIntervalType.per_min] = 60; // * 60
        rewardIntervals[RewardIntervalType.per_hour] = 3_600; // * 60
        rewardIntervals[RewardIntervalType.per_day] = 86_400; // * 24
        rewardIntervals[RewardIntervalType.per_month] = 2_592_000; // * 30
        rewardIntervals[RewardIntervalType.per_year] = 31_104_000; // * 12
    }
