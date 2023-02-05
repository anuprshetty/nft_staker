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
    event RewardClaimed(address owner, uint256 reward);
    event RewardClaimed(address owner, address claimedAccount, uint256 reward);

    constructor() {
        rewardIntervals[RewardIntervalType.per_second] = 1;
        rewardIntervals[RewardIntervalType.per_min] = 60; // * 60
        rewardIntervals[RewardIntervalType.per_hour] = 3_600; // * 60
        rewardIntervals[RewardIntervalType.per_day] = 86_400; // * 24
        rewardIntervals[RewardIntervalType.per_month] = 2_592_000; // * 30
        rewardIntervals[RewardIntervalType.per_year] = 31_104_000; // * 12
    }

    function addVault(
        string calldata _name,
        bool _isActive,
        NFTMinter _nftMinter,
        NFTReward _nftReward,
        uint256 _intervalRewardPrice,
        RewardIntervalType _rewardIntervalType
    ) public onlyOwner {
        require(
            _intervalRewardPrice > 0,
            "intervalRewardPrice should be greater than 0"
        );

        vaults.push(
            Vault({
                name: _name,
                isActive: _isActive,
                nftMinter: _nftMinter,
                nftReward: _nftReward,
                intervalRewardPrice: _intervalRewardPrice,
                rewardIntervalType: _rewardIntervalType
            })
        );
    }

    function activateVault(uint256 vaultIndex) public onlyOwner {
        require(vaultIndex < vaults.length, "invalid vaultIndex");
        vaults[vaultIndex].isActive = true;
    }

    function deactivateVault(uint256 vaultIndex) public onlyOwner {
        require(vaultIndex < vaults.length, "invalid vaultIndex");
        vaults[vaultIndex].isActive = false;
    }

    function getVaults() public view returns (Vault[] memory) {
        return vaults;
    }

    function stake(uint256 vaultIndex, uint256[] calldata tokenIds) external {
        require(vaultIndex < vaults.length, "invalid vaultIndex");

        Vault storage vault = vaults[vaultIndex];
        require(vault.isActive == true, "vault is deactivated");

        totalStaked += tokenIds.length;

        uint256 tokenId;
        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            require(
                vault.nftMinter.ownerOf(tokenId) == msg.sender,
                "token doesn't belong to the user"
            );
            require(
                stakes[vaultIndex][tokenId].tokenId == 0,
                "token already staked"
            );

            vault.nftMinter.transferFrom(msg.sender, address(this), tokenId);

            emit NFTStaked(msg.sender, vaultIndex, tokenId, block.timestamp);

            stakes[vaultIndex][tokenId] = Stake({
                owner: msg.sender,
                vaultIndex: vaultIndex,
                tokenId: uint24(tokenId),
                timestamp: uint48(block.timestamp)
            });
        }
    }

    function claim(uint256 vaultIndex, uint256[] calldata tokenIds) external {
        _claim(msg.sender, vaultIndex, tokenIds, false);
    }

    function claim(
        address claimAccount,
        uint256 vaultIndex,
        uint256[] calldata tokenIds
    ) external {
        _claim(claimAccount, vaultIndex, tokenIds, false);
    }

    function unstake(uint256 vaultIndex, uint256[] calldata tokenIds) external {
        _claim(msg.sender, vaultIndex, tokenIds, true);
    }

    function unstake(
        address claimAccount,
        uint256 vaultIndex,
        uint256[] calldata tokenIds
    ) external {
        _claim(claimAccount, vaultIndex, tokenIds, true);
    }

    function _claim(
        address claimAccount,
        uint256 vaultIndex,
        uint256[] calldata tokenIds,
        bool _unstake
    ) internal {
        require(vaultIndex < vaults.length, "invalid vaultIndex");

        Vault storage vault = vaults[vaultIndex];
        require(vault.isActive == true, "vault is deactivated");

        uint256 tokenId;
        uint256 reward = 0;
        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];

            Stake memory staked = stakes[vaultIndex][tokenId];
            require(
                staked.owner == msg.sender,
                "token doesn't belong to the user"
            );

            reward +=
                ((block.timestamp - staked.timestamp) /
                    rewardIntervals[vault.rewardIntervalType]) *
                vault.intervalRewardPrice;

            stakes[vaultIndex][tokenId] = Stake({
                owner: msg.sender,
                vaultIndex: vaultIndex,
                tokenId: uint24(tokenId),
                timestamp: uint48(block.timestamp)
            });
        }

        uint256 remainingReward = vault.nftReward.maxSupply() -
            vault.nftReward.totalSupply();
        if (reward > remainingReward) {
            reward = remainingReward;
        }

        if (msg.sender == claimAccount) {
            emit RewardClaimed(msg.sender, reward);
        } else {
            emit RewardClaimed(msg.sender, claimAccount, reward);
        }
        if (reward > 0) {
            vault.nftReward.mint(claimAccount, reward);
        }

        if (_unstake) {
            _unstakeMany(vaultIndex, tokenIds);
        }
    }

    function _unstakeMany(
        uint256 vaultIndex,
        uint256[] calldata tokenIds
    ) internal {
        require(vaultIndex < vaults.length, "invalid vaultIndex");

        Vault storage vault = vaults[vaultIndex];
        require(vault.isActive == true, "vault is deactivated");

        totalStaked -= tokenIds.length;

        uint256 tokenId;
        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            Stake memory staked = stakes[vaultIndex][tokenId];
            require(
                staked.owner == msg.sender,
                "token doesn't belong to the user"
            );
            delete stakes[vaultIndex][tokenId];

            emit NFTUnstaked(msg.sender, vaultIndex, tokenId, block.timestamp);
            vault.nftMinter.transferFrom(address(this), msg.sender, tokenId);
        }
    }

    function fetchReward(
        address account,
        uint256 vaultIndex,
        uint256[] calldata tokenIds
    ) external view returns (uint256) {
        require(vaultIndex < vaults.length, "invalid vaultIndex");

        Vault storage vault = vaults[vaultIndex];
        require(vault.isActive == true, "vault is deactivated");

        uint256 tokenId;
        uint256 reward = 0;
        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];

            Stake memory staked = stakes[vaultIndex][tokenId];
            require(
                staked.owner == account,
                "token doesn't belong to the user"
            );

            reward +=
                ((block.timestamp - staked.timestamp) /
                    rewardIntervals[vault.rewardIntervalType]) *
                vault.intervalRewardPrice;
        }

        return reward;
    }

    function totalStakesOf(
        address account,
        uint256 vaultIndex
    ) external view returns (uint256) {
        require(vaultIndex < vaults.length, "invalid vaultIndex");

        Vault storage vault = vaults[vaultIndex];
        require(vault.isActive == true, "vault is deactivated");

        uint256[] memory tokenIds = vault.nftMinter.walletOfOwner(account);

        uint256 tokenId;
        uint256 totalStakes = 0;
        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];

            if (stakes[vaultIndex][tokenId].owner == account) {
                totalStakes += 1;
            }
        }

        return totalStakes;
    }

    function stakedTokensOf(
        address account,
        uint256 vaultIndex
    ) external view returns (uint256[] memory) {
        require(vaultIndex < vaults.length, "invalid vaultIndex");

        Vault storage vault = vaults[vaultIndex];
        require(vault.isActive == true, "vault is deactivated");

        uint256[] memory tokenIds = vault.nftMinter.walletOfOwner(account);
        uint256[] memory tempTokenIds = new uint256[](tokenIds.length);

        uint256 tokenId;
        uint256 length = 0;
        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];

            if (stakes[vaultIndex][tokenId].owner == account) {
                tempTokenIds[length] = tokenId;
                length += 1;
            }
        }

        uint256[] memory stakedTokenIds = new uint256[](length);
        for (uint i = 0; i < length; i++) {
            stakedTokenIds[i] = tempTokenIds[i];
        }

        return stakedTokenIds;
    }

    function onERC721Received(
        address,
        address from,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        require(
            from == address(0x0),
            "cannot send(or mint) NFT token to vault(staking contract) directly"
        );
        return IERC721Receiver.onERC721Received.selector;
    }
}
