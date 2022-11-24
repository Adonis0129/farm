const { ethers, upgrades } = require("hardhat");
require("dotenv").config();
const stakingPoolAddress = process.env.stakingPool || "";

async function main() {

    // const StakingPool = await ethers.getContractFactory("StakingPool");
    // const instance = await upgrades.forceImport(stakingPoolAddress, StakingPool);
    // console.log("Imported", instance.address);

    const StakingPoolV1 = await ethers.getContractFactory("StakingPoolV1");
    await upgrades.upgradeProxy(stakingPoolAddress, StakingPoolV1);
    console.log("StakingPool contract upgraded", stakingPoolAddress);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
