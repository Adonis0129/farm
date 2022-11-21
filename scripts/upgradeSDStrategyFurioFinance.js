const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
    const sDStrategyFurioFinanceAddress = "";
    const SDStrategyFurioFinanceV1 = await ethers.getContractFactory("SDStrategyFurioFinanceV1");
    await upgrades.upgradeProxy(sDStrategyFurioFinanceAddress, SDStrategyFurioFinanceV1);
    console.log("SDStrategyFurioFinance contract upgraded", sDStrategyFurioFinanceAddress);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
