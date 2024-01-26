// SPDX-License-Identifier: 0BSD
pragma solidity ^0.8.17;

import {ICoWSwapSettlement} from "./interfaces/ICoWSwapSettlement.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract GATOrder is IERC1271 {
    bytes4 constant ERC1271_MAGIC_VALUE = 0x1626ba7e;

    address public immutable owner;
    IERC20 public immutable sellToken;
    uint32 public immutable validFrom;

    bytes32 public orderHash;

    constructor(
        address owner_,
        IERC20 sellToken_,
        uint32 validFrom_,
        bytes32 orderHash_,
        ICoWSwapSettlement settlement
    ) {
        owner = owner_;
        sellToken = sellToken_;
        validFrom = validFrom_;
        orderHash = orderHash_;

        sellToken_.approve(settlement.vaultRelayer(), type(uint256).max);
    }

    function isValidSignature(bytes32 hash, bytes calldata)
        external
        view
        returns (bytes4 magicValue)
    {
        require(hash == orderHash, "invalid order");
        require(block.timestamp >= validFrom, "not mature");
        magicValue = ERC1271_MAGIC_VALUE;
    }

    function cancel() public {
        require(msg.sender == owner, "not the owner");
        orderHash = bytes32(0);
        sellToken.transfer(owner, sellToken.balanceOf(address(this)));
    }
}
