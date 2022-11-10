const { ethers, upgrades } = require("hardhat");
require("dotenv").config();
const keccak256 = require("keccak256");

const stakingPoolAddress = process.env.stakingPool || "";
const tokenAddress = process.env.token || "";

async function main() {
  const Freezer = await ethers.getContractFactory("Freezer");
  const freezer = await upgrades.deployProxy(Freezer, [
    tokenAddress,
    stakingPoolAddress,
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E", //owner address
  ]);
  await freezer.deployed();
  console.log("Freezer address = ", freezer.address);

  //set role
  var tx = await freezer.grantRole(
    keccak256("PAUSER_ROLE"),
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E" // owner address
  );
  await tx.wait();

  const Token = await ethers.getContractFactory("FurioFinanceToken");
  const token = await Token.attach(tokenAddress);

  // FurioFinanceToken
  var tx = await token.grantRole(keccak256("MINTER_ROLE"), freezer.address);
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
