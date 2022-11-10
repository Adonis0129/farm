const { ethers, upgrades } = require("hardhat");
require("dotenv").config();
const keccak256 = require("keccak256");

const tokenAddress = process.env.token || "";
const furFi_bnb_lpAddress = process.env.furFi_bnb_lp || "";
const dexAddress = process.env.dex || "";

async function main() {
  const FurFiBNBFarm = await ethers.getContractFactory("FurioFinanceBNBFarm");
  const furFiBNBFarm = await upgrades.deployProxy(FurFiBNBFarm, [
    tokenAddress,
    furFi_bnb_lpAddress,
    dexAddress,
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E", //owner address
  ]);
  await furFiBNBFarm.deployed();
  console.log("FurFiBNBFarm address = ", furFiBNBFarm.address);

  //set role
  var tx = await furFiBNBFarm.grantRole(
    keccak256("UPDATER_ROLE"),
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E" //owner address
  );
  await tx.wait();
  var tx = await furFiBNBFarm.grantRole(
    keccak256("PAUSER_ROLE"),
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E" //owner address
  );
  await tx.wait();
  var tx = await furFiBNBFarm.grantRole(
    keccak256("FUNDS_RECOVERY_ROLE"),
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E" //owner address
  );
  await tx.wait();

  const Token = await ethers.getContractFactory("FurioFinanceToken");
  const token = await Token.attach(tokenAddress);

  // FurioFinanceToken
  var tx = await token.grantRole(
    keccak256("MINTER_ROLE"),
    furFiBNBFarm.address
  );
  await tx.wait();

  // ****** set setFurFiMintingRewards ***//
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
