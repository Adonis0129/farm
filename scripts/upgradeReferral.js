const { ethers, upgrades } = require("hardhat");
require("dotenv").config();
const referralAddress = process.env.referral || "";

async function main() {

    // const Referral = await ethers.getContractFactory("Referral");
    // const instance = await upgrades.forceImport(referralAddress, Referral);
    // console.log("Imported", instance.address);

    const ReferralV1 = await ethers.getContractFactory("ReferralV1");
    await upgrades.upgradeProxy(referralAddress, ReferralV1);
    console.log("Referral contract upgraded", referralAddress);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
