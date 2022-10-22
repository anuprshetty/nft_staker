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

    constructor() {
        rewardIntervals[RewardIntervalType.per_second] = 1;
        rewardIntervals[RewardIntervalType.per_min] = 60; // * 60
        rewardIntervals[RewardIntervalType.per_hour] = 3_600; // * 60
        rewardIntervals[RewardIntervalType.per_day] = 86_400; // * 24
        rewardIntervals[RewardIntervalType.per_month] = 2_592_000; // * 30
        rewardIntervals[RewardIntervalType.per_year] = 31_104_000; // * 12
    }
