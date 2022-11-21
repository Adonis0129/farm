const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
    const sCStrategyFurioFinanceAddress = "";
    const SCStrategyFurioFinanceV1 = await ethers.getContractFactory("SCStrategyFurioFinanceV1");
    await upgrades.upgradeProxy(sCStrategyFurioFinanceAddress, SCStrategyFurioFinanceV1);
    console.log("SCStrategyFurioFinance contract upgraded", sCStrategyFurioFinanceAddress);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
