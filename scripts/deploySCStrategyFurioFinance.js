const { ethers, upgrades } = require("hardhat");
require("dotenv").config();
const keccak256 = require("keccak256");

const masterChefV2Address = process.env.masterChefV2 || "";
const stakingPoolAddress = process.env.stakingPool || "";
const tokenAddress = process.env.token || "";
const furFi_bnb_lpAddress = process.env.furFi_bnb_lp || "";
const referralAddress = process.env.referral || "";
const averagePriceOracleAddress = process.env.averagePriceOracle || "";
const dexAddress = process.env.dex || "";

async function main() {
  const SCStrategyFurioFinance = await ethers.getContractFactory(
    "SCStrategyFurioFinance"
  );
  const sCStrategyFurioFinance = await upgrades.deployProxy(
    SCStrategyFurioFinance,
    [
      "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E", // owner address
      masterChefV2Address, //masterChefV2 address
      stakingPoolAddress, //stakingPool contract address
      tokenAddress, //FurFi token address
      furFi_bnb_lpAddress, // FurFi-BNB address
      "0x4962B860e02eb883CB02Bd879641f3d637e123fC", //dev team address
      referralAddress, //referral contract address
      averagePriceOracleAddress, //averagePriceOracle contract address
      dexAddress, //dex contract address
      "1", //pid in masterChef
    ]
  );
  await sCStrategyFurioFinance.deployed();
  console.log(
    "SCStrategyFurioFinance address = ",
    sCStrategyFurioFinance.address
  );

  //set role
  var tx = await sCStrategyFurioFinance.grantRole(
    keccak256("UPDATER_ROLE"),
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E" // owner address
  );
  await tx.wait();
  var tx = await sCStrategyFurioFinance.grantRole(
    keccak256("FUNDS_RECOVERY_ROLE"),
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E" // owner address
  );
  await tx.wait();
  var tx = await sCStrategyFurioFinance.grantRole(
    keccak256("PAUSER_ROLE"),
    "0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E" // owner address
  );
  await tx.wait();

  //set restakeThreshold
  var tx = await sCStrategyFurioFinance.updateRestakeThreshold("0");
  await tx.wait();

  // set role to other contracts for FFStrategyFurioFinance//

  const Token = await ethers.getContractFactory("FurioFinanceToken");
  const token = await Token.attach(tokenAddress);
  const StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.attach(stakingPoolAddress);
  const Referral = await ethers.getContractFactory("Referral");
  const referral = await Referral.attach(referralAddress);

  // FurioFinanceToken
  var tx = await token.grantRole(
    keccak256("MINTER_ROLE"),
    sCStrategyFurioFinance.address
  );
  await tx.wait();
  //Staking Pool
  var tx = await stakingPool.grantRole(
    keccak256("REWARDER_ROLE"),
    sCStrategyFurioFinance.address
  );
  await tx.wait();
  //Referral
  var tx = await referral.grantRole(
    keccak256("REWARDER_ROLE"),
    sCStrategyFurioFinance.address
  );
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
