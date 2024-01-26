// SPDX-License-Identifier: 0BSD
pragma solidity ^0.8.17;

import {ICoWSwapSettlement} from "./interfaces/ICoWSwapSettlement.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {GPv2Order} from "./vendored/GPv2Order.sol";
import {GATOrder} from "./GATOrder.sol";
import {ICoWSwapOnchainOrders} from "./vendored/ICoWSwapOnchainOrders.sol";

contract GATOrders is ICoWSwapOnchainOrders {
    using GPv2Order for *;

    struct Data {
        IERC20 sellToken;
        IERC20 buyToken;
        address receiver;
        uint256 sellAmount;
        uint256 buyAmount;
        uint32 validFrom;
        uint32 validTo;
        uint256 feeAmount;
        bytes meta;
    }

    bytes32 public constant APP_DATA = keccak256("solid dca orders are cool");

    ICoWSwapSettlement public immutable settlement;
    bytes32 public immutable domainSeparator;
    mapping(address => address) public addressToContract;

    constructor(ICoWSwapSettlement settlement_) {
        settlement = settlement_;
        domainSeparator = settlement_.domainSeparator();
    }

    function place(Data calldata data, bytes32 salt) external returns (bytes memory orderUid) {
        GPv2Order.Data memory order = GPv2Order.Data({
            sellToken: data.sellToken,
            buyToken: data.buyToken,
            receiver: data.receiver == GPv2Order.RECEIVER_SAME_AS_OWNER
                ? msg.sender
                : data.receiver,
            sellAmount: data.sellAmount,
            buyAmount: data.buyAmount,
            validTo: data.validTo,
            appData: APP_DATA,
            feeAmount: data.feeAmount,
            kind: GPv2Order.KIND_SELL,
            partiallyFillable: false,
            sellTokenBalance: GPv2Order.BALANCE_ERC20,
            buyTokenBalance: GPv2Order.BALANCE_ERC20
        });
        bytes32 orderHash = order.hash(domainSeparator);

        GATOrder instance = new GATOrder{salt: salt}(
            msg.sender,
            data.sellToken,
            data.validFrom,
            orderHash,
            settlement
        );

        data.sellToken.transferFrom(
            msg.sender,
            address(instance),
            data.sellAmount + data.feeAmount
        );

        OnchainSignature memory signature = OnchainSignature({
            scheme: OnchainSigningScheme.Eip1271,
            data: hex""
        });

        emit OrderPlacement(address(instance), order, signature, data.meta);

        orderUid = new bytes(GPv2Order.UID_LENGTH);
        orderUid.packOrderUidParams(orderHash, address(instance), data.validTo);
        addressToContract[msg.sender] = address(instance);
    }
}
