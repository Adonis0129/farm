const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const EthCrypto = require("eth-crypto");
const keccak256 = require("keccak256");
const { toBigNum, fromBigNum } = require("./utils.js");

var ERC20ABI = artifacts.readArtifactSync(
  "contracts/Mock/FakeUsdc.sol:IERC20"
).abi;
var exchangeRouter;
var exchangeFactory;
let wBNB;
let bnb_cake_lp;
let usdc_busd_lp;
let usdc_usdt_lp;
let dai_busd_lp;
let usdt_busd_lp;

let bnb_usdc_lp;
let bnb_usdt_lp;
let bnb_busd_lp;
let bnb_dai_lp;
let furFi_bnb_lp;

let token;
let fakeUSDC;
let fakeUSDT;
let fakeBUSD;
let fakeDAI;
let cake;
let syrup;
let masterChef;
let masterChefV2;
let stakingPool;
let referral;
let averagePriceOracle;
let dex;
let fFStrategyFurioFinance;

var owner;
var user1;
var user2;
var user3;
var user4;
var user5;
var user6;

var isOnchain = true; //true: bsc testnet, false: hardhat net

var deployedAddress = {
  exchangeFactory: "0xb7926c0430afb07aa7defde6da862ae0bde767bc",
  wBNB: "0xae13d989dac2f0debff460ac112a837c89baa7cd",
  exchangeRouter: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3",
  fakeUSDC: "0x9555f469d2Fc19Fa85D0B6184C3685950DC99291",
  fakeUSDT: "0xad612cA832FAe1A1224795046454E1A351703483",
  fakeBUSD: "0x1092fd5A7d29bE377678a516895c6F9d9A773572",
  fakeDAI: "0x6d0893eE9FeAA890981Ed721569e8c82356E88b0",
  cake: "0xCDf430577fA8b4Bc680324BFDD1d8CAEE7c33003",
  syrup: "0x38B37AC7378C09eA4BB7dd0397685229F6e77DEC",
  masterChef: "0x28ba30Fd29d15A0BBe62C0398936526eC1841A7a",
  masterChefV2: "0x72c6a7DdDe57F1CF00B54725BAccd3ffe98D0AAF",
  token: "0xED72AF99857A9b5bE00A8723321FedC03aC1b256",
  stakingPool: "0xF1be4C5B67d6A04B84564501727E59E32E761A6F",
  referral: "0x5cE6fc3D7a0b54E6A72E5E539DB63f4E137fa672",
  averagePriceOracle: "0xd0c8C92EF231B9d7E88a50659080523B7A8547A7",
  dex: "0xd18b9470750779Fc7d0715d6F88e0fF5B81400dD",
  fFStrategyFurioFinance: "0x5c006524222C0f6750aaA17eE7842C19ce5A3846",
};

var lpAddresses = {
  bnb_cake_lp: "0x41b6Ab436e5Ed6B5aDbfe1Bb220EB17bE5dEf73b",
  bnb_usdc_lp: "0x7B6e44e243FedF902D9F3CDe3dD3C8a90edc4B55",
  bnb_usdt_lp: "0x82A0b98a0d12bBf3474B8CcF60CF780B53012C66",
  bnb_busd_lp: "0xB3cC546096fe2642756F1cf2258b62B59E7A34Da",
  bnb_dai_lp: "0x02015C0ef18a3a43612b3c652a69E03004eb9e33",
  usdc_busd_lp: "0x24DB5611a646913D65202F7Ebc8654EA3304eEbE",
  usdc_usdt_lp: "0x72ec0F3525A7c7E8F84C87c2486D0d2d928615f8",
  dai_busd_lp: "0x8fdf0418827865c2a12957B22Ea667520E1f6295",
  usdt_busd_lp: "0x1A4113e0fe65B7Da5cC110ab96a6Be3467Ea772b",
  furFi_bnb_lp: "0xd734C3D6B79Fc236092Ef87E1ED35786ce2b800C",
};

/** For token deployment
  _admin: owner.address
  _developmentFounders = 0xC01cbc79644283782BabE262D1C56493d83D6fe2
  _advisors = 0x105F706AB60fcc1F760b1b6cAD331A647272BDCb
  _marketingReservesPool = 0x56edb7B2AB826B64c26C599C050B909c4d8E1a29
  _devTeam = 0x4962B860e02eb883CB02Bd879641f3d637e123fC

  owner 0x5a0f19cE6eE22De387BF4ff308ecF091A91C3a5E
  user1 0xCF020c184602073Fe0E0b242F96389267F283adE
  user2 0x882Cc95439b8129526805f5438494BeFacDa21d9
  user3 0x1429c316c52B9535483236726629412B746C1afF
  user4 0x9820e62D07Ef2bc25147347ecfB111D95ba3A65f
  user5 0x1CcCF75aFFcCC00845Ca689aADE55dF1Aa2132Bd
  user6 0xC9F9d347Ea1aF3C5e86d9d68a184897B2A9f860E
 */

describe("Create Account and wallet", () => {
  it("Create Wallet", async () => {
    [owner, user1, user2, user3, user4, user5, user6] =
      await ethers.getSigners();
    console.log("owner", owner.address);
    console.log("user1", user1.address);
    console.log("user2", user2.address);
    console.log("user3", user3.address);
    console.log("user4", user4.address);
    console.log("user5", user5.address);
    console.log("user6", user6.address);

    if (!isOnchain) {
      var tx = await user1.sendTransaction({
        to: owner.address,
        value: ethers.utils.parseUnits("8000", 18),
      });
      await tx.wait();
      var tx = await user2.sendTransaction({
        to: owner.address,
        value: ethers.utils.parseUnits("8000", 18),
      });
      await tx.wait();
      var tx = await user3.sendTransaction({
        to: owner.address,
        value: ethers.utils.parseUnits("8000", 18),
      });
      await tx.wait();
      var tx = await user4.sendTransaction({
        to: owner.address,
        value: ethers.utils.parseUnits("8000", 18),
      });
      await tx.wait();
      var tx = await user5.sendTransaction({
        to: owner.address,
        value: ethers.utils.parseUnits("8000", 18),
      });
      await tx.wait();
      var tx = await user6.sendTransaction({
        to: owner.address,
        value: ethers.utils.parseUnits("8000", 18),
      });
      await tx.wait();
    }

    await checkBNBBalance();
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////       dex deployment     ////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

describe("Dex contracts deployment", () => {
  it("Factory deployment", async () => {
    const Factory = await ethers.getContractFactory("PancakeFactory");
    if (!isOnchain) {
      exchangeFactory = await Factory.deploy(owner.address);
      await exchangeFactory.deployed();
      console.log(
        "INIT_CODE_PAIR_HASH",
        await exchangeFactory.INIT_CODE_PAIR_HASH()
      );
    } else {
      exchangeFactory = Factory.attach(deployedAddress.exchangeFactory);
    }
    console.log("Factory", exchangeFactory.address);
  });

  it("WBNB deployment", async () => {
    const WBNB_ = await ethers.getContractFactory("WBNB");
    if (!isOnchain) {
      wBNB = await WBNB_.deploy();
      await wBNB.deployed();
    } else {
      wBNB = WBNB_.attach(deployedAddress.wBNB);
    }
    console.log("WBNB", wBNB.address);
  });

  it("Router deployment", async () => {
    const Router = await ethers.getContractFactory("PancakeRouter");
    if (!isOnchain) {
      exchangeRouter = await Router.deploy(
        exchangeFactory.address,
        wBNB.address
      );
      await exchangeRouter.deployed();
    } else {
      exchangeRouter = Router.attach(deployedAddress.exchangeRouter);
    }
    console.log("Router", exchangeRouter.address);
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////       Stable tokens deplyment          //////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

describe(" stable coins deployment", () => {
  it("FakeUSDC deployment", async () => {
    const FakeUSDC = await ethers.getContractFactory("FakeUsdc");
    if (!isOnchain) {
      fakeUSDC = await FakeUSDC.deploy();
      await fakeUSDC.deployed();
    } else {
      fakeUSDC = FakeUSDC.attach(deployedAddress.fakeUSDC);
    }
    console.log("fakeUSDC", fakeUSDC.address);
  });

  it("FakeUSDT deployment", async () => {
    const FakeUSDT = await ethers.getContractFactory("FakeUsdt");
    if (!isOnchain) {
      fakeUSDT = await FakeUSDT.deploy();
      await fakeUSDT.deployed();
    } else {
      fakeUSDT = FakeUSDT.attach(deployedAddress.fakeUSDT);
    }
    console.log("fakeUSDT", fakeUSDT.address);
  });

  it("FakeBUSD deployment", async () => {
    const FakeBUSD = await ethers.getContractFactory("FakeBusd");
    if (!isOnchain) {
      fakeBUSD = await FakeBUSD.deploy();
      await fakeBUSD.deployed();
    } else {
      fakeBUSD = FakeBUSD.attach(deployedAddress.fakeBUSD);
    }
    console.log("fakeBUSD", fakeBUSD.address);
  });

  it("FakeDAI deployment", async () => {
    const FakeDAI = await ethers.getContractFactory("FakeDai");
    if (!isOnchain) {
      fakeDAI = await FakeDAI.deploy();
      await fakeDAI.deployed();
    } else {
      fakeDAI = FakeDAI.attach(deployedAddress.fakeDAI);
    }
    console.log("fakeDAI", fakeDAI.address);
  });

  it("CAKE deployment", async () => {
    const CAKE = await ethers.getContractFactory("CakeToken");
    if (!isOnchain) {
      cake = await CAKE.deploy();
      await cake.deployed();
    } else {
      cake = CAKE.attach(deployedAddress.cake);
    }
    console.log("cake", cake.address);
  });

  it("SYRUP deployment", async () => {
    const SYRUP = await ethers.getContractFactory("SyrupBar");
    if (!isOnchain) {
      syrup = await SYRUP.deploy(cake.address);
      await syrup.deployed();
    } else {
      syrup = SYRUP.attach(deployedAddress.syrup);
    }
    console.log("syrup", syrup.address);
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////
////////////////////       Pancakeswap evironment building           ////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

describe("Pancakeswap evironment building", () => {
  it("create BNB-CAKE pool", async () => {
    if (!isOnchain) {
      var tx = await cake.mint(owner.address, toBigNum("10000", 18));
      await tx.wait();

      var tx = await cake.approve(
        exchangeRouter.address,
        toBigNum("10000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        cake.address,
        toBigNum("10000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("1.4", 18) }
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(wBNB.address, cake.address);
      bnb_cake_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("bnb_cake_lp address", bnb_cake_lp.address);
    } else {
      console.log("bnb_cake_lp address", lpAddresses.bnb_cake_lp);
    }
  });

  it("create BNB-USDC pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDC.approve(
        exchangeRouter.address,
        toBigNum("13000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        fakeUSDC.address,
        toBigNum("13000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("0.5", 18) }
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(wBNB.address, fakeUSDC.address);
      bnb_usdc_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("bnb_usdc_lp address", bnb_usdc_lp.address);
    } else {
      console.log("bnb_usdc_lp address", lpAddresses.bnb_usdc_lp);
    }
  });

  it("create BNB-USDT pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDT.approve(
        exchangeRouter.address,
        toBigNum("13000", 6)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        fakeUSDT.address,
        toBigNum("13000", 6),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("0.5", 18) }
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(wBNB.address, fakeUSDT.address);
      bnb_usdt_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("bnb_usdt_lp address", bnb_usdt_lp.address);
    } else {
      console.log("bnb_usdt_lp address", lpAddresses.bnb_usdt_lp);
    }
  });

  it("create BNB-BUSD pool", async () => {
    if (!isOnchain) {
      var tx = await fakeBUSD.approve(
        exchangeRouter.address,
        toBigNum("13000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        fakeBUSD.address,
        toBigNum("13000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("0.5", 18) }
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(wBNB.address, fakeBUSD.address);
      bnb_busd_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("bnb_busd_lp address", bnb_busd_lp.address);
    } else {
      console.log("bnb_busd_lp address", lpAddresses.bnb_busd_lp);
    }
  });

  it("create BNB-DAI pool", async () => {
    if (!isOnchain) {
      var tx = await fakeDAI.approve(
        exchangeRouter.address,
        toBigNum("13000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        fakeDAI.address,
        toBigNum("13000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("0.5", 18) }
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(wBNB.address, fakeDAI.address);
      bnb_dai_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("bnb_dai_lp address", bnb_dai_lp.address);
    } else {
      console.log("bnb_dai_lp address", lpAddresses.bnb_dai_lp);
    }
  });

  it("creat USDC-BUSD pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDC.approve(
        exchangeRouter.address,
        toBigNum("10000", 18)
      );
      await tx.wait();

      var tx = await fakeBUSD.approve(
        exchangeRouter.address,
        toBigNum("10000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidity(
        fakeUSDC.address,
        fakeBUSD.address,
        toBigNum("10000", 18),
        toBigNum("10000", 18),
        0,
        0,
        owner.address,
        "1234325432314321"
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(
        fakeUSDC.address,
        fakeBUSD.address
      );
      usdc_busd_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("usdc_busd_lp address", usdc_busd_lp.address);
    } else {
      console.log("usdc_busd_lp address", lpAddresses.usdc_busd_lp);
    }
  });

  it("creat USDC-USDT pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDC.approve(
        exchangeRouter.address,
        toBigNum("10000", 18)
      );
      await tx.wait();

      var tx = await fakeUSDT.approve(
        exchangeRouter.address,
        toBigNum("10000", 6)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidity(
        fakeUSDC.address,
        fakeUSDT.address,
        toBigNum("10000", 18),
        toBigNum("10000", 6),
        0,
        0,
        owner.address,
        "1234325432314321"
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(
        fakeUSDC.address,
        fakeUSDT.address
      );
      usdc_usdt_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("usdc_usdt_lp address", usdc_usdt_lp.address);
    } else {
      console.log("usdc_usdt_lp address", lpAddresses.usdc_usdt_lp);
    }
  });

  it("creat DAI-BUSD pool", async () => {
    if (!isOnchain) {
      var tx = await fakeDAI.approve(
        exchangeRouter.address,
        toBigNum("10000", 18)
      );
      await tx.wait();

      var tx = await fakeBUSD.approve(
        exchangeRouter.address,
        toBigNum("10000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidity(
        fakeDAI.address,
        fakeBUSD.address,
        toBigNum("10000", 18),
        toBigNum("10000", 18),
        0,
        0,
        owner.address,
        "1234325432314321"
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(
        fakeDAI.address,
        fakeBUSD.address
      );
      dai_busd_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("dai_busd_lp address", dai_busd_lp.address);
    } else {
      console.log("dai_busd_lp address", lpAddresses.dai_busd_lp);
    }
  });

  it("creat USDT-BUSD pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDT.approve(
        exchangeRouter.address,
        toBigNum("10000", 6)
      );
      await tx.wait();

      var tx = await fakeBUSD.approve(
        exchangeRouter.address,
        toBigNum("10000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidity(
        fakeUSDT.address,
        fakeBUSD.address,
        toBigNum("10000", 6),
        toBigNum("10000", 18),
        0,
        0,
        owner.address,
        "1234325432314321"
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(
        fakeUSDT.address,
        fakeBUSD.address
      );
      usdt_busd_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("usdt_busd_lp address", usdt_busd_lp.address);
    } else {
      console.log("usdt_busd_lp address", lpAddresses.usdt_busd_lp);
    }
  });

  it("MasterChef deployment", async () => {
    const MasterChef = await ethers.getContractFactory("MasterChef");
    if (!isOnchain) {
      masterChef = await MasterChef.deploy(
        cake.address,
        syrup.address,
        owner.address,
        toBigNum("40", 18),
        0
      );
      await masterChef.deployed();
    } else {
      masterChef = MasterChef.attach(deployedAddress.masterChef);
    }
    console.log("masterChef", masterChef.address);
  });

  it("MasterChefV2 deployment", async () => {
    const MasterChefV2 = await ethers.getContractFactory("MasterChefV2");
    if (!isOnchain) {
      masterChefV2 = await MasterChefV2.deploy(
        masterChef.address,
        cake.address,
        526,
        owner.address
      );
      await masterChefV2.deployed();
    } else {
      masterChefV2 = MasterChefV2.attach(deployedAddress.masterChefV2);
    }
    console.log("masterChefV2", masterChefV2.address);
  });

  it("transfer cake to MasterChefv2", async () => {
    if (!isOnchain) {
      var tx = await cake.mint(
        owner.address,
        ethers.utils.parseUnits("1000000000", 18)
      );
      await tx.wait();
      var tx = await cake.transfer(
        masterChefV2.address,
        ethers.utils.parseUnits("1000000000", 18)
      );
      await tx.wait();
    }
  });

  it("add LPs to masterChefV2", async () => {
    if (!isOnchain) {
      //for hardhat test
      var tx = await masterChefV2.add(100, bnb_cake_lp.address, true, false);
      await tx.wait();
      var tx = await masterChefV2.add(100, usdc_busd_lp.address, true, false);
      await tx.wait();
      var tx = await masterChefV2.add(100, usdc_usdt_lp.address, true, false);
      await tx.wait();
      var tx = await masterChefV2.add(100, dai_busd_lp.address, true, false);
      await tx.wait();
      var tx = await masterChefV2.add(100, usdt_busd_lp.address, true, false);
      await tx.wait();

      //**** when deploy on testnet, run one time!  ****//
      // var tx = await masterChefV2.add(100, lpAddresses.bnb_cake_lp, true, false);
      // await tx.wait();
      // var tx = await masterChefV2.add(100, lpAddresses.usdc_busd_lp, true, false);
      // await tx.wait();
      // var tx = await masterChefV2.add(100, lpAddresses.usdc_usdt_lp, true, false);
      // await tx.wait();
      // var tx = await masterChefV2.add(100, lpAddresses.dai_busd_lp, true, false);
      // await tx.wait();
      // var tx = await masterChefV2.add(100, lpAddresses.usdt_busd_lp, true, false);
      // await tx.wait();
    }
  });

  it("CakeToken and Syrup transfer Ownership to MasterChef", async () => {
    if (!isOnchain) {
      var tx = await cake.transferOwnership(masterChef.address);
      await tx.wait();
      var tx = await syrup.transferOwnership(masterChef.address);
      await tx.wait();
    }
  });

  // it("MasterChefV2 test", async () => {
  //   console.log("MasterChefV2 pool length", fromBigNum(await masterChefV2.poolLength(), 0));
  //   console.log("pid_1(usdc-busd) pool address", await masterChefV2.lpToken("1"));
  //   console.log("cake address", await masterChefV2.CAKE());
  // });
});

// /////////////////////////////////////////////////////////////////////////////////////////////////
// //////////////   FurFi Token and Other contracts Deployment for Farming     /////////////////////
// /////////////////////////////////////////////////////////////////////////////////////////////////
describe("Contract deployment and setting for farming", () => {
  it("FurFiToken deployment, set role", async () => {
    const Token = await ethers.getContractFactory("FurioFinanceToken");
    if (!isOnchain) {
      token = await upgrades.deployProxy(Token, [
        "FurioFinanceToken",
        "$FURFI",
        toBigNum("100000", 18),
        owner.address,
        "0xC01cbc79644283782BabE262D1C56493d83D6fe2",
        "0x105F706AB60fcc1F760b1b6cAD331A647272BDCb",
        "0x56edb7B2AB826B64c26C599C050B909c4d8E1a29",
        "0x4962B860e02eb883CB02Bd879641f3d637e123fC",
      ]);
      await token.deployed();
      //set role
      var tx = await token.grantRole(keccak256("UPDATER_ROLE"), owner.address);
      await tx.wait();
      var tx = await token.grantRole(keccak256("PAUSER_ROLE"), owner.address);
      await tx.wait();
    } else {
      token = Token.attach(deployedAddress.token);
    }
    console.log("token", token.address);
  });

  it("creat BNB-FurFiToken pool", async () => {
    if (!isOnchain) {
      var tx = await token.approve(
        exchangeRouter.address,
        toBigNum("10000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        token.address,
        toBigNum("10000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("8", 18) }
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(wBNB.address, token.address);
      furFi_bnb_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("furFi_bnb_lp address", furFi_bnb_lp.address);
    } else {
      console.log("furFi_bnb_lp address", lpAddresses.furFi_bnb_lp);
    }
  });

  it("StakingPool contract deployment, set role", async () => {
    const StakingPool = await ethers.getContractFactory("StakingPool");
    if (!isOnchain) {
      //for hardhat test
      stakingPool = await upgrades.deployProxy(StakingPool, [
        token.address,
        furFi_bnb_lp.address,
        exchangeRouter.address,
        owner.address,
      ]);
      await stakingPool.deployed();

      //**** when deploy on testnet, run one time!  ****//
      // stakingPool = await upgrades.deployProxy(StakingPool, [
      //   token.address,
      //   lpAddresses.furFi_bnb_lp,
      //   exchangeRouter.address,
      //   owner.address,
      // ]);
      // await stakingPool.deployed();

      //set role
      var tx = await stakingPool.grantRole(
        keccak256("UPDATER_ROLE"),
        owner.address
      );
      await tx.wait();
      var tx = await stakingPool.grantRole(
        keccak256("PAUSER_ROLE"),
        owner.address
      );
      await tx.wait();
      //FurFi Token
      var tx = await token.grantRole(
        keccak256("MINTER_ROLE"),
        stakingPool.address
      );
      await tx.wait();

      
      // //set setFurFiMintingRewards -- important !!!
      // var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      // console.log("current timestamp", currentTimeStamp);
      // var tx = await stakingPool.setFurFiMintingRewards(
      //   currentTimeStamp + 2592000,
      //   currentTimeStamp + 7776000,
      //   toBigNum("100000"),
      //   toBigNum("10000")
      // )
      // await tx.wait();
      
    } else {
      stakingPool = StakingPool.attach(deployedAddress.stakingPool);
    }
    console.log("stakingPool", stakingPool.address);
  });

  it("Referral contract deployment, set role", async () => {
    const Referral = await ethers.getContractFactory("Referral");
    if (!isOnchain) {
      referral = await upgrades.deployProxy(Referral, [
        token.address,
        owner.address,
        "0x4962B860e02eb883CB02Bd879641f3d637e123fC",
      ]);
      await referral.deployed();
      //set role
      var tx = await referral.grantRole(
        keccak256("UPDATER_ROLE"),
        owner.address
      );
      await tx.wait();
      var tx = await referral.grantRole(
        keccak256("PAUSER_ROLE"),
        owner.address
      );
      await tx.wait();
      //FurFi
      var tx = await token.grantRole(
        keccak256("MINTER_ROLE"),
        referral.address
      );
      await tx.wait();
    } else {
      referral = Referral.attach(deployedAddress.referral);
    }
    console.log("referral", referral.address);
  });

  it("AveragePriceOracle contract deployment, set role", async () => {
    const AveragePriceOracle = await ethers.getContractFactory("AveragePriceOracle");
    if (!isOnchain) {
      //for hardhat test
      averagePriceOracle = await upgrades.deployProxy(AveragePriceOracle, [
        token.address,
        furFi_bnb_lp.address,
        owner.address,
      ]);
      await averagePriceOracle.deployed();

      //**** when deploy on testnet, run one time!  ****//
      // averagePriceOracle = await upgrades.deployProxy(AveragePriceOracle, [
      //   token.address,
      //   lpAddresses.furFi_bnb_lp,
      //   owner.address,
      // ]);
      // await averagePriceOracle.deployed();

      //set role
      var tx = await referral.grantRole(
        keccak256("PAUSER_ROLE"),
        owner.address
      );
      await tx.wait();
    } else {
      averagePriceOracle = AveragePriceOracle.attach(
        deployedAddress.averagePriceOracle
      );
    }
    console.log("averagePriceOracle", averagePriceOracle.address);
  });

  it("DEX contract deployment, set role and path", async () => {
    const DEX = await ethers.getContractFactory("DEX");
    if (!isOnchain) {
      dex = await upgrades.deployProxy(DEX, [
        exchangeRouter.address,
        masterChefV2.address,
        owner.address,
      ]);
      await dex.deployed();
      //set role
      var tx = await dex.grantRole(keccak256("UPDATER_ROLE"), owner.address);
      await tx.wait();
      var tx = await dex.grantRole(keccak256("PAUSER_ROLE"), owner.address);
      await tx.wait();
      var tx = await dex.grantRole(
        keccak256("FUNDS_RECOVERY_ROLE"),
        owner.address
      );
      await tx.wait();
      //set path
      var tx = await dex.setSwapPathForToken(
        token.address,
        [wBNB.address, token.address],
        [token.address, wBNB.address]
      );
      await tx.wait();
      var tx = await dex.setSwapPathForToken(
        cake.address,
        [wBNB.address, cake.address],
        [cake.address, wBNB.address]
      );
      await tx.wait();
      var tx = await dex.setSwapPathForToken(
        fakeUSDC.address,
        [wBNB.address, fakeUSDC.address],
        [fakeUSDC.address, wBNB.address]
      );
      await tx.wait();
      var tx = await dex.setSwapPathForToken(
        fakeUSDT.address,
        [wBNB.address, fakeUSDT.address],
        [fakeUSDT.address, wBNB.address]
      );
      await tx.wait();
      var tx = await dex.setSwapPathForToken(
        fakeBUSD.address,
        [wBNB.address, fakeBUSD.address],
        [fakeBUSD.address, wBNB.address]
      );
      await tx.wait();
      var tx = await dex.setSwapPathForToken(
        fakeDAI.address,
        [wBNB.address, fakeDAI.address],
        [fakeDAI.address, wBNB.address]
      );
      await tx.wait();
    } else {
      dex = DEX.attach(deployedAddress.dex);
    }
    console.log("dex", dex.address);
  });

  it("(usdc-busd)FFStrategyFurioFinance contract deployment and set ", async () => {
    const FFStrategyFurioFinance = await ethers.getContractFactory("FFStrategyFurioFinance");
    if (!isOnchain) {
      //for hardhat test
      fFStrategyFurioFinance = await upgrades.deployProxy(FFStrategyFurioFinance, [
        owner.address,
        masterChefV2.address,
        stakingPool.address,
        token.address,
        furFi_bnb_lp.address,
        "0x4962B860e02eb883CB02Bd879641f3d637e123fC",
        referral.address,
        averagePriceOracle.address,
        dex.address,
        "1",
      ]);
      var tx = await fFStrategyFurioFinance.deployed();

      //**** when deploy on testnet, run one time!  ****//
      // fFStrategyFurioFinance = await upgrades.deployProxy(FFStrategyFurioFinance, [
      //   owner.address,
      //   masterChefV2.address,
      //   stakingPool.address,
      //   token.address,
      //   lpAddresses.furFi_bnb_lp,
      //   "0x4962B860e02eb883CB02Bd879641f3d637e123fC",
      //   referral.address,
      //   averagePriceOracle.address,
      //   dex.address,
      //   "1",
      // ]);
      // await fFStrategyFurioFinance.deployed();

      //set role
      var tx = await fFStrategyFurioFinance.grantRole(
        keccak256("UPDATER_ROLE"),
        owner.address
      );
      await tx.wait();
      var tx = await fFStrategyFurioFinance.grantRole(
        keccak256("FUNDS_RECOVERY_ROLE"),
        owner.address
      );
      await tx.wait();
      var tx = await fFStrategyFurioFinance.grantRole(keccak256("PAUSER_ROLE"), owner.address);
      await tx.wait();
      //set restakeThreshold
      var tx = await fFStrategyFurioFinance.updateRestakeThreshold("0");
      await tx.wait();


      // FurioFinanceToken
      var tx = await token.grantRole(keccak256("MINTER_ROLE"), fFStrategyFurioFinance.address);
      await tx.wait();
      //Staking Pool
      var tx = await stakingPool.grantRole(keccak256("REWARDER_ROLE"), fFStrategyFurioFinance.address);
      await tx.wait();
      //Referral
      var tx = await referral.grantRole(keccak256("REWARDER_ROLE"), fFStrategyFurioFinance.address);
      await tx.wait();

    } else {
      fFStrategyFurioFinance = FFStrategyFurioFinance.attach(deployedAddress.fFStrategyFurioFinance);
    }
    console.log("fFStrategyFurioFinance", fFStrategyFurioFinance.address);
  });


});

/////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////       test  furiofiStrategy contract            /////////////
/////////////////////////////////////////////////////////////////////////////////////////////

describe("test", () => {
  it("user1 deposit with 0.02 BNB and 5% slippage to (usdc-busd)FFStrategyFurioFinance ", async () => {
    if (!isOnchain) {
      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      // console.log("current timestamp", currentTimeStamp);
      var tx = await fFStrategyFurioFinance.connect(user1).deposit(
          user6.address,
          [wBNB.address, wBNB.address],
          [fakeUSDC.address, fakeBUSD.address],
          [ethers.utils.parseUnits("0.02", 18), ethers.utils.parseUnits("0.02", 18)],
          ["1", "1"],
          "5000",
          currentTimeStamp + 10,
          { value: ethers.utils.parseUnits("0.02", 18) }
        );
      await tx.wait();
    }
  });

  it("user1 loan FurFi tokens ", async () => {
    if (!isOnchain) {
      var tx = await fFStrategyFurioFinance.connect(user1).loan();
      await tx.wait();
    }
  });

  it("user2 deposit with 0.01 BNB and 5% slippage to (usdc-busd)FFStrategyFurioFinance ", async () => {
    if (!isOnchain) {
      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await fFStrategyFurioFinance.connect(user2).deposit(
          user6.address,
          [wBNB.address, wBNB.address],
          [fakeUSDC.address, fakeBUSD.address],
          [
            ethers.utils.parseUnits("0.01", 18),
            ethers.utils.parseUnits("0.01", 18),
          ],
          ["1", "1"],
          "5000",
          currentTimeStamp + 10,
          { value: ethers.utils.parseUnits("0.01", 18) }
        );
      await tx.wait();
    }
  });

  it("user2 loan FurFi tokens ", async () => {
    if (!isOnchain) {
      var tx = await fFStrategyFurioFinance.connect(user2).loan();
      await tx.wait();
    }
  });



  it("user3 deposit with 0.01 BNB and 5% slippage to (usdc-busd)FFStrategyFurioFinance ", async () => {
    if (!isOnchain) {
      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await fFStrategyFurioFinance.connect(user3).deposit(
          user6.address,
          [wBNB.address, wBNB.address],
          [fakeUSDC.address, fakeBUSD.address],
          [
            ethers.utils.parseUnits("0.01", 18),
            ethers.utils.parseUnits("0.01", 18),
          ],
          ["1", "1"],
          "5000",
          currentTimeStamp + 10,
          { value: ethers.utils.parseUnits("0.01", 18) }
        );
      await tx.wait();
    }
  });

  it("user3 loan FurFi tokens ", async () => {
    if (!isOnchain) {
      var tx = await fFStrategyFurioFinance.connect(user3).loan();
      await tx.wait();
    }
  });

  it("Check FurFi balances", async () => {
    if (!isOnchain) {
      await checkFurFiBalance();
    }
  })


  it("user1 withdraw All tokens  ", async () => {
    if (!isOnchain) {
      var tx = await token.connect(user1).approve(fFStrategyFurioFinance.address, token.balanceOf(user1.address));
      await tx.wait();

      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await fFStrategyFurioFinance.connect(user1).withdrawAll(
          [wBNB.address, wBNB.address],
          [fakeUSDC.address, fakeBUSD.address],
          [ethers.utils.parseUnits("0.02", 18), ethers.utils.parseUnits("0.02", 18)],
          ["1", "1"],
          "10000",
          currentTimeStamp + 10,
      );
      await tx.wait();
    }
  });

  it("Check user2 staked lp balance", async () => {
    if (!isOnchain) {
        var amount = await fFStrategyFurioFinance.connect(user2).getFuriofiStrategyBalance(user2.address);
        console.log("amount", amount);
    }
  })

  it("user2 withdraw 100 lp  ", async () => {
    if (!isOnchain) {

      var tx = await token.connect(user2).approve(fFStrategyFurioFinance.address, token.balanceOf(user2.address));
      await tx.wait();

      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await fFStrategyFurioFinance.connect(user2).withdraw(
          toBigNum("100", 18),
          [wBNB.address, wBNB.address],
          [fakeUSDC.address, fakeBUSD.address],
          [ethers.utils.parseUnits("0.02", 18), ethers.utils.parseUnits("0.02", 18)],
          ["1", "1"],
          "10000",
          currentTimeStamp + 10,
      );
      await tx.wait();
    }
  });

  it("user1 deposit with 100 DAI and 10% slippage to (usdc-busd)FFStrategyFurioFinance ", async () => {
    if (!isOnchain) {
      var tx = await fakeDAI.transfer(user1.address, toBigNum("100", 18));
      await tx.wait();
      var tx = await fakeDAI.connect(user1).approve(fFStrategyFurioFinance.address, toBigNum("100", 18));
      await tx.wait();
      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await fFStrategyFurioFinance.connect(user1).depositFromToken(
          fakeDAI.address,
          toBigNum("100", 18),
          user4.address,
          [fakeDAI.address, fakeDAI.address],
          [wBNB.address, wBNB.address],
          [toBigNum("100", 18), toBigNum("100", 18)],
          ["1", "1"],
          "10000",
          currentTimeStamp + 10,
        );
      await tx.wait();
    }
  });

  it("user3 deposit with 300 USDC and 5% slippage to (usdc-busd)FFStrategyFurioFinance ", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDC.transfer(user3.address, toBigNum("300", 18));
      await tx.wait();
      var tx = await fakeUSDC.connect(user3).approve(fFStrategyFurioFinance.address, toBigNum("300", 18));
      await tx.wait();
      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await fFStrategyFurioFinance.connect(user3).depositFromToken(
          fakeUSDC.address,
          toBigNum("300", 18),
          user5.address,
          [fakeUSDC.address],
          [fakeBUSD.address],
          [toBigNum("300", 18)],
          ["1"],
          "5000",
          currentTimeStamp + 10,
        );
      await tx.wait();
    }
  });

  it("user1 furiofi Strategy claim furFi token", async () => {
    if (!isOnchain) {
      var tx = await fFStrategyFurioFinance.connect(user1).furiofiStrategyClaimFurFi();
      await tx.wait();
    }
  });


});

/////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////       check balances             ////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
const checkBNBBalance = async () => {
  console.log("owner BNB balance", fromBigNum(await ethers.provider.getBalance(owner.address), 18));
};

const checkFurFiBalance = async () => {
  console.log("owner FurFi balance", fromBigNum(await token.balanceOf(owner.address), 18));
  console.log("user1 FurFi balance", fromBigNum(await token.balanceOf(user1.address), 18));
  console.log("user2 FurFi balance", fromBigNum(await token.balanceOf(user2.address), 18));
  console.log("user3 FurFi balance", fromBigNum(await token.balanceOf(user3.address), 18));

};
