const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

/**
 *  _developmentFounders = 0xC01cbc79644283782BabE262D1C56493d83D6fe2
    _advisors = 0x105F706AB60fcc1F760b1b6cAD331A647272BDCb
    _marketingReservesPool = 0x56edb7B2AB826B64c26C599C050B909c4d8E1a29
    _devTeam = 0x4962B860e02eb883CB02Bd879641f3d637e123fC
 */

async function main() {
    const Honey = await ethers.getContractFactory("HoneyToken");
    const honey = await upgrades.deployProxy(Honey,["HoneyToken", "$HN", 100000, 0xC01cbc79644283782BabE262D1C56493d83D6fe2, 0x105F706AB60fcc1F760b1b6cAD331A647272BDCb, 0x56edb7B2AB826B64c26C599C050B909c4d8E1a29, 0x4962B860e02eb883CB02Bd879641f3d637e123fC]);
    await honey.deployed();
    console.log("HoneyToken proxy deployed to:", honey.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });