require("dotenv").config()
const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")
let { goerli } = require("../addresses.json")
const env_addresses = goerli

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const args = [
        env_addresses.host,
        env_addresses.settlement,
        env_addresses.link,
        env_addresses.registar,
        env_addresses.registry,
    ]
    const SolidDca = await deploy("SolidDcaOrders", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    console.log(SolidDca.address)
    log("Verifiying....")
    await verify(SolidDca.address, args)

    log("----------------------------------------------------------------")
}

module.exports.tags = ["all", "soliddca"]
