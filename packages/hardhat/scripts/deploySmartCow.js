const { ethers, network } = require("hardhat")
const SuperfluidSDK = require("@superfluid-finance/js-sdk")
const { env } = require("process")
let { goerli } = require("../addresses.json")
const { Framework } = require("@superfluid-finance/sdk-core")
require("dotenv").config()

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || ""
const env_addresses = goerli

async function main() {
    // infura provider initialization
    // const provider = new ethers.providers.AlchemyProvider("goerli", GOERLI_RPC_URL)
    // const sf = await Framework.create({
    //     chainId: 5,
    //     networkName: "goerli",
    //     provider,
    // })
    // const config = {
    //     hostAddress: env_addresses.host,
    //     cfaV1Address: env_addresses.cfav1,
    //     idaV1Address: env_addresses.idav1,
    // }

    // const cfaV1 = new ConstantFlowAgreementV1({ options: config })
    const signer = ethers.provider.getSigner()

    const SolidDcaFactory = await ethers.getContractFactory("SolidDcaOrders")
    const SolidDca = await SolidDcaFactory.deploy(
        env_addresses.host,
        env_addresses.settlement,
        env_addresses.link,
        env_addresses.registar,
        env_addresses.registry
    )

    await SolidDca.deployed()
    console.log("SolidDca deployed to", SolidDca.address)
    }