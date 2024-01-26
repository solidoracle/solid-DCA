const { ethers } = require("hardhat")

ORDER_ADDRESS = "0xa7e04382570e128e2ee071b1ec2a8b64841d396b"

async function main() {
    const [signer] = await ethers.getSigners()

    const order = (await ethers.getContractAt("GATOrder", ORDER_ADDRESS)).connect(signer)

    console.log(`cancelling order for ${signer.address}`)
    const cancellation = await order.cancel()
    await cancellation.wait()
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
