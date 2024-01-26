const { ethers } = require("hardhat")
const fetch = require("node-fetch")

// GAT_ORDERS smart contract address
const GAT_ORDERS = "0x7483a4Bc696a99368cB98f722068438B8EF3356c"
const ONE_MINUTE = 60

// WETH and COW token contracts
const XDAI = "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d"
const COW = "0x177127622c4A00F3d409B75571e12cB3c8973d3c"

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
    // Get signer
    const [signer] = await ethers.getSigners()

    // Attach to GAT_ORDERS contract and connect it to signer
    const orders = (await ethers.getContractAt("GATOrders", GAT_ORDERS)).connect(signer)

    // Attach to WETH contract and connect it to signer
    const xdai = (await ethers.getContractAt("IERC20", XDAI)).connect(signer)

    // Retrieve allowance
    const allowance = await xdai.allowance(signer.address, orders.address)

    // If allowance is 0, approve an amount of 2^256 - 1
    if (allowance.eq(0)) {
        console.log(`setting allowance ${signer.address} to ${orders.address}`)
        const approval = await xdai.approve(orders.address, ethers.constants.MaxUint256)
        // Wait for the promise to resolve
        await approval.wait()
    }

    const now = ~~(Date.now() / 1000)

    // Build order
    const order = {
        sellToken: xdai.address,
        buyToken: COW,
        receiver: ethers.constants.AddressZero, // 0x0 because receiver is msg.sender
        sellAmount: ethers.utils.parseUnits("0.01", 18),
        buyAmount: ethers.utils.parseUnits("0.1", 18),
        validFrom: now + 0.1 * ONE_MINUTE, // Set timeout for trade (this is custom for GAT_ORDERS)
        validTo: now + 20 * ONE_MINUTE,
        feeAmount: ethers.utils.parseUnits("0.005"), // Set fee
        meta: "0x",
    }
    // Set salt
    const salt = ethers.utils.id(Math.random().toString())
    console.log(`provided salt is ${salt}`)

    console.log(`placing order with ${signer.address}`)

    // Place order
    const placement = await orders.place(order, salt)
    // Await for promise to resolve
    const receipt = await placement.wait()

    const { args: onchain } = receipt.events.find(({ event }) => event === "OrderPlacement")
    const offchain = {
        from: onchain.sender,
        sellToken: onchain.order.sellToken,
        buyToken: onchain.order.buyToken,
        receiver: onchain.order.receiver,
        sellAmount: onchain.order.sellAmount.toString(),
        buyAmount: onchain.order.buyAmount.toString(),
        validTo: onchain.order.validTo,
        appData: onchain.order.appData,
        feeAmount: onchain.order.feeAmount.toString(),
        kind: "sell",
        partiallyFillable: onchain.order.partiallyFillable,
        sellTokenBalance: "erc20",
        buyTokenBalance: "erc20",
        signingScheme: "eip1271",
        signature: onchain.signature.data,
    }

    console.log(onchain.signature.data)
    await sleep(10000)
    console.log("Sending order to API")
    const response = await fetch(`https://barn.api.cow.fi/xdai/api/v1/orders`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(offchain),
    })
    const orderUid = await response.json()
    console.log(orderUid)

    console.log(`See order here https://explorer.cow.fi/gc/tx/${orderUid}`)

    // For local debugging:
    //console.log(`curl -s 'http://localhost:8080/api/v1/orders' -X POST -H 'Content-Type: application/json' --data '${JSON.stringify(offchain)}'`)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
