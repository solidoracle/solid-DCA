// SPDX-License-Identifier: 0BSD
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

import {ISuperfluid, ISuperToken, ISuperApp, ISuperAgreement, ContextDefinitions, SuperAppDefinitions} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {ISuperfluidToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluidToken.sol";
import {IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";
import {SuperAppBase} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperAppBase.sol";
import {CFAv1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";

import {ICoWSwapSettlement} from "./interfaces/ICoWSwapSettlement.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {GPv2Order} from "./vendored/GPv2Order.sol";
import {SolidDcaOrders} from "./SolidDcaOrder.sol";
import {AutomationRegistryInterface} from "@chainlink/contracts/src/v0.8/interfaces/AutomationRegistryInterface1_2.sol";

import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";

contract SolidDcaOrders is SuperAppBase {
    using GPv2Order for *;
    using CFAv1Library for CFAv1Library.InitData;
    CFAv1Library.InitData public cfaV1;
    ISuperfluid host;
    ICoWSwapSettlement public immutable settlement;
    LinkTokenInterface public immutable link;
    address public immutable registrar;
    AutomationRegistryInterface public immutable registry;

    mapping(address => mapping(address => SolidDcaOrders)) public ownerToTokenToContract;

    constructor(
        ISuperfluid host_,
        ICoWSwapSettlement settlement_,
        LinkTokenInterface link_,
        address registrar_,
        AutomationRegistryInterface registry_
    ) {
        settlement = settlement_;
        host = host_;
        link = link_;
        registrar = registrar_;
        registry = registry_;
        // Initialize CFA Library
        cfaV1 = CFAv1Library.InitData(
            host,
            IConstantFlowAgreementV1(
                address(
                    host.getAgreementClass(
                        keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1")
                    )
                )
            )
        );
        uint256 configWord = SuperAppDefinitions.APP_LEVEL_FINAL |
            SuperAppDefinitions.BEFORE_AGREEMENT_CREATED_NOOP |
            SuperAppDefinitions.BEFORE_AGREEMENT_UPDATED_NOOP |
            SuperAppDefinitions.BEFORE_AGREEMENT_TERMINATED_NOOP;
        // can be an empty string in dev or testnet deployments

        host.registerApp(configWord);
    }

    function fundUpkeep(
        address owner,
        address token,
        uint96 linkAmount
    ) external {
        SolidDcaOrder instance = ownerToTokenToContract[owner][token];
        require(address(instance) != address(0), "no instance created");
        require(
            link.transferFrom(msg.sender, address(instance), uint256(linkAmount)),
            "link transfer failed"
        );
        instance.fundUpkeep(0);
    }

    function place(
        SolidDcaOrder.Data calldata data,
        ISuperToken superToken,
        int96 flowRate,
        uint32 gasLimit,
        uint96 linkAmount
    ) external {
        require(superToken.getUnderlyingToken() == address(data.sellToken), "!SuperToken");
        require(
            link.transferFrom(msg.sender, address(this), uint256(linkAmount)),
            "link transfer failed"
        );
        SolidDcaOrder instance = new SolidDcaOrder(
            msg.sender,
            host,
            superToken,
            settlement,
            data,
            link,
            registrar,
            registry
        );
        require(link.transfer(address(instance), uint256(linkAmount)), "link transfer failed");
        instance.registerAndPredictID(
            "SOLID DCA",
            "",
            address(instance),
            gasLimit,
            address(this),
            "",
            linkAmount,
            0
        );

        /** @dev: Require this contract to be a flowOperator for msg.sender */
        cfaV1.createFlowByOperator(msg.sender, address(instance), superToken, flowRate);
        ownerToTokenToContract[msg.sender][address(data.sellToken)] = instance;
    }
}
