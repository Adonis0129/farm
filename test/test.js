const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const EthCrypto = require("eth-crypto");
const keccak256 = require("keccak256");
const { delay, toBigNum, fromBigNum } = require("./utils.js");

var ERC20ABI = artifacts.readArtifactSync("contracts/Mock/FakeUsdc.sol:IERC20").abi;
var exchangeRouter;
var exchangeFactory;
let wBNB;
let bnb_cake_lp;
let usdc_busd_lp;
let usdc_usdt_lp;
let dai_busd_lp;
let usdt_busd_lp;
let house_bnb_lp;

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
let refferal;
let averagePriceOracle;
let dex;
let grizzly;

var owner;
var user1;
var user2;
var user3;
var user4;
var user5;
var user6;

var isOnchain = false; //true: bsc testnet, false: hardhat net

var deployedAddress = {
  exchangeFactory: "0xb7926c0430afb07aa7defde6da862ae0bde767bc",
  wBNB: "0xae13d989dac2f0debff460ac112a837c89baa7cd",
  exchangeRouter: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3",
  token: "",
  fakeUSDC: "0x7F8CE1b5486F24cd4e5CB98e78d306cD71Ea337b",
  fakeUSDT: "0x60c83C6D100C916069B230167c37358dC2997083",
  fakeBUSD: "",
  fakeDAI: "",
  masterChef: "",
  masterChefV2: "",
  stakingPool: "",
  refferal: "",
  averagePriceOracle: "",
  dex: "",
  grizzly: "",
};

/** For token deployment
  _admin: owner.address
  _developmentFounders = 0xC01cbc79644283782BabE262D1C56493d83D6fe2
  _advisors = 0x105F706AB60fcc1F760b1b6cAD331A647272BDCb
  _marketingReservesPool = 0x56edb7B2AB826B64c26C599C050B909c4d8E1a29
  _devTeam = 0x4962B860e02eb883CB02Bd879641f3d637e123fC
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
///////////////////////////////       Stable tokens deplyment          ////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

describe(" stable tokens deployment", () => {
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
    const SYRUP = await ethers.getContractFactory("CakeToken");
    if (!isOnchain) {
      syrup = await SYRUP.deploy();
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
      var tx = await cake.mint(owner.address, toBigNum("115000", 18));
      await tx.wait();

      var tx = await cake.approve(
        exchangeRouter.address,
        toBigNum("115000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        cake.address,
        toBigNum("115000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("1245", 18) }
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(wBNB.address, cake.address);
      bnb_cake_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("bnb_cake_lp address", bnb_cake_lp.address);
    }
  });

  it("create BNB-USDC pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDC.approve(
        exchangeRouter.address,
        toBigNum("1385000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        fakeUSDC.address,
        toBigNum("1385000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("5000", 18) }
      );
      await tx.wait();
    }
  });

  it("create BNB-USDT pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDT.approve(
        exchangeRouter.address,
        toBigNum("1385000", 8)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        fakeUSDT.address,
        toBigNum("1385000", 8),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("5000", 18) }
      );
      await tx.wait();
    }
  });

  it("create BNB-BUSD pool", async () => {
    if (!isOnchain) {
      var tx = await fakeBUSD.approve(
        exchangeRouter.address,
        toBigNum("1385000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        fakeBUSD.address,
        toBigNum("1385000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("5000", 18) }
      );
      await tx.wait();
    }
  });

  it("create BNB-DAI pool", async () => {
    if (!isOnchain) {
      var tx = await fakeDAI.approve(
        exchangeRouter.address,
        toBigNum("1385000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        fakeDAI.address,
        toBigNum("1385000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("5000", 18) }
      );
      await tx.wait();
    }
  });

  it("creat USDC-BUSD pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDC.approve(
        exchangeRouter.address,
        toBigNum("1000000", 18)
      );
      await tx.wait();

      var tx = await fakeBUSD.approve(
        exchangeRouter.address,
        toBigNum("1000000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidity(
        fakeUSDC.address,
        fakeBUSD.address,
        toBigNum("1000000", 18),
        toBigNum("1000000", 18),
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
    }
  });

  it("creat USDC-USDT pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDC.approve(
        exchangeRouter.address,
        toBigNum("1000000", 18)
      );
      await tx.wait();

      var tx = await fakeUSDT.approve(
        exchangeRouter.address,
        toBigNum("1000000", 6)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidity(
        fakeUSDC.address,
        fakeUSDT.address,
        toBigNum("1000000", 18),
        toBigNum("1000000", 6),
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
    }
  });

  it("creat DAI-BUSD pool", async () => {
    if (!isOnchain) {
      var tx = await fakeDAI.approve(
        exchangeRouter.address,
        toBigNum("1000000", 18)
      );
      await tx.wait();

      var tx = await fakeBUSD.approve(
        exchangeRouter.address,
        toBigNum("1000000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidity(
        fakeDAI.address,
        fakeBUSD.address,
        toBigNum("1000000", 18),
        toBigNum("1000000", 18),
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
    }
  });

  it("creat USDT-BUSD pool", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDT.approve(
        exchangeRouter.address,
        toBigNum("1000000", 8)
      );
      await tx.wait();

      var tx = await fakeBUSD.approve(
        exchangeRouter.address,
        toBigNum("1000000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidity(
        fakeUSDT.address,
        fakeBUSD.address,
        toBigNum("1000000", 8),
        toBigNum("1000000", 18),
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
      var tx = await cake.mint(owner.address,ethers.utils.parseUnits("1000000000",18));
      await tx.wait();
      var tx = await cake.transfer(masterChefV2.address, ethers.utils.parseUnits("10000000", 18));
      await tx.wait();
    }
  });

  it("add LPs to masterChefV2", async () => {
    var tx = await masterChefV2.add(100, bnb_cake_lp.address, true, false);
    await tx.wait();
    var tx = await masterChefV2.add(100, usdc_busd_lp.address, true, false);
    await tx.wait();
    var tx = await masterChefV2.add(100, usdc_busd_lp.address, true, false);
    await tx.wait();
    var tx = await masterChefV2.add(100, dai_busd_lp.address, true, false);
    await tx.wait();
    var tx = await masterChefV2.add(100, usdt_busd_lp.address, true, false);
    await tx.wait();
  });

  it("CakeToken and Syrup transfer Ownership to MasterChef", async () => {
    if (!isOnchain) {
      var tx = await cake.transferOwnership(masterChef.address);
      await tx.wait();
      var tx = await syrup.transferOwnership(masterChef.address);
      await tx.wait();
    }
  });

  it("MasterChefV2 test", async () => {
    console.log("MasterChefV2 pool length", fromBigNum(await masterChefV2.poolLength(), 0));
    console.log("pid_1(usdc-busd) pool address", await masterChefV2.lpToken("1"));
    console.log("cake address", await masterChefV2.CAKE());
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////   House Token and Other contracts Deployment for Farming     /////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
describe("Contract deployment and setting for farming", () => {
  it("HouseToken deployment, set role", async () => {
    Token = await ethers.getContractFactory("HoneyToken");
    if (!isOnchain) {
      token = await upgrades.deployProxy(Token, [
        "HouseToken",
        "$HT",
        toBigNum("1000000", 18),
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

  it("creat BNB-HouseToken pool", async () => {
    if (!isOnchain) {
      var tx = await token.approve(
        exchangeRouter.address,
        toBigNum("500000", 18)
      );
      await tx.wait();

      var tx = await exchangeRouter.addLiquidityETH(
        token.address,
        toBigNum("500000", 18),
        0,
        0,
        owner.address,
        "1234325432314321",
        { value: ethers.utils.parseUnits("5000", 18) }
      );
      await tx.wait();

      var pair = await exchangeFactory.getPair(wBNB.address, token.address);
      house_bnb_lp = new ethers.Contract(pair, ERC20ABI, owner);
      console.log("house_bnb_lp address", house_bnb_lp.address);
    }
  });

  it("StakingPool contract deployment, set role", async () => {
    StakingPool = await ethers.getContractFactory("StakingPool");
    if (!isOnchain) {
      stakingPool = await upgrades.deployProxy(StakingPool, [
        token.address,
        house_bnb_lp.address,
        exchangeRouter.address,
        owner.address,
      ]);
      await stakingPool.deployed();
      //set role
      var tx = await stakingPool.grantRole(keccak256("UPDATER_ROLE"), owner.address);
      await tx.wait();
      var tx = await stakingPool.grantRole(keccak256("PAUSER_ROLE"), owner.address);
      await tx.wait();
      //Honey Token
      var tx = await token.grantRole(keccak256("MINTER_ROLE"), stakingPool.address);
      await tx.wait();
    } else {
      stakingPool = StakingPool.attach(deployedAddress.stakingPool);
    }
    console.log("stakingPool", stakingPool.address);
  });

  it("Refferal contract deployment, set role", async () => {
    Refferal = await ethers.getContractFactory("Referral");
    if (!isOnchain) {
      refferal = await upgrades.deployProxy(Refferal, [
        token.address,
        owner.address,
        "0x4962B860e02eb883CB02Bd879641f3d637e123fC",
        "0x0000000000000000000000000000000000000000",
      ]);
      await refferal.deployed();
      //set role
      var tx = await refferal.grantRole(keccak256("UPDATER_ROLE"), owner.address);
      await tx.wait();
      var tx = await refferal.grantRole(keccak256("PAUSER_ROLE"), owner.address);
      await tx.wait();
      //Honey
      var tx = await token.grantRole(keccak256("MINTER_ROLE"), refferal.address);
      await tx.wait();
    } else {
      refferal = Refferal.attach(deployedAddress.refferal);
    }
    console.log("refferal", refferal.address);
  });

  it("AveragePriceOracle contract deployment, set role", async () => {
    AveragePriceOracle = await ethers.getContractFactory("AveragePriceOracle");
    if (!isOnchain) {
      averagePriceOracle = await upgrades.deployProxy(AveragePriceOracle, [
        token.address,
        house_bnb_lp.address,
        owner.address,
      ]);
      await averagePriceOracle.deployed();
      //set role
      var tx = await refferal.grantRole(keccak256("PAUSER_ROLE"), owner.address);
      await tx.wait();
    } else {
      averagePriceOracle = AveragePriceOracle.attach(deployedAddress.averagePriceOracle);
    }
    console.log("averagePriceOracle", averagePriceOracle.address);
  });

  it("DEX contract deployment, set role and path", async () => {
    DEX = await ethers.getContractFactory("DEX");
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
      var tx = await dex.grantRole(keccak256("FUNDS_RECOVERY_ROLE"), owner.address);
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

  it("(usdc-busd)Grizzly contract deployment and set ", async () => {
    Grizzly = await ethers.getContractFactory("Grizzly");
    if (!isOnchain) {
      grizzly = await upgrades.deployProxy(Grizzly, [
        owner.address,
        masterChefV2.address,
        stakingPool.address,
        token.address,
        house_bnb_lp.address,
        "0x4962B860e02eb883CB02Bd879641f3d637e123fC",
        refferal.address,
        averagePriceOracle.address,
        dex.address,
        "1",
      ]);
      await grizzly.deployed();
      //set role
      var tx = await grizzly.grantRole(keccak256("UPDATER_ROLE"), owner.address);
      await tx.wait();
      var tx = await grizzly.grantRole(keccak256("FUNDS_RECOVERY_ROLE"), owner.address);
      await tx.wait();
      var tx = await grizzly.grantRole(keccak256("PAUSER_ROLE"), owner.address);
      await tx.wait();
      //set restakeThreshold
      var tx = await grizzly.updateRestakeThreshold("0");
      await tx.wait();
    } else {
      grizzly = Grizzly.attach(deployedAddress.grizzly);
    }
    console.log("grizzly", grizzly.address);
  });

  it("set role for (usdc-busd)Grizzly ", async () => {
    if (!isOnchain) {
      // HoneyToken
      var tx = await token.grantRole(keccak256("MINTER_ROLE"), grizzly.address);
      await tx.wait();
      //Staking Pool
      var tx = await stakingPool.grantRole(keccak256("REWARDER_ROLE"), grizzly.address);
      await tx.wait();
      //Referral
      var tx = await refferal.grantRole(keccak256("REWARDER_ROLE"), grizzly.address);
      await tx.wait();
    }
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////       check balances             ////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

describe("test", () => {
  it("user1 deposit with 2 BNB and 5% slippage to (usdc-busd)Grizzly ", async () => {
    if (!isOnchain) {
      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      // console.log("current timestamp", currentTimeStamp);

      var tx = await grizzly.connect(user1).deposit(
          user6.address,
          [wBNB.address, wBNB.address],
          [fakeUSDC.address, fakeBUSD.address],
          [ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("1", 18)],
          ["1", "1"],
          "5000",
          currentTimeStamp + 10,
          { value: ethers.utils.parseUnits("2", 18) }
        );
      await tx.wait();
    }
  });

  it("user2 deposit with 5 BNB and 5% slippage to (usdc-busd)Grizzly ", async () => {
    if (!isOnchain) {
      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await grizzly.connect(user2).deposit(
          user6.address,
          [wBNB.address, wBNB.address],
          [fakeUSDC.address, fakeBUSD.address],
          [
            ethers.utils.parseUnits("2.5", 18),
            ethers.utils.parseUnits("2.5", 18),
          ],
          ["1", "1"],
          "5000",
          currentTimeStamp + 10,
          { value: ethers.utils.parseUnits("5", 18) }
        );
      await tx.wait();
    }
  });

  it("user1 change strategy from standard to grizzly", async () => {
    if (!isOnchain) {
      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      // console.log("current timestamp", currentTimeStamp);
      var tx = await grizzly.connect(user1).changeStrategy(
          2,
          [wBNB.address, wBNB.address],
          [fakeUSDC.address, fakeBUSD.address],
          [ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("1", 18)],
          ["1", "1"],
          "5000",
          currentTimeStamp + 10,
        );
      await tx.wait();
    }
  });

  it("user3 deposit with 300 USDC and 5% slippage to (usdc-busd)Grizzly ", async () => {
    if (!isOnchain) {
      var tx = await fakeUSDC.transfer(user3.address, toBigNum("300", 18));
      await tx.wait();
      var tx = await fakeUSDC.connect(user3).approve(grizzly.address, toBigNum("300", 18));
      await tx.wait();

      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await grizzly.connect(user3).depositFromToken(
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

  it("user1 grizzly Strategy claim house token", async () => {
    if (!isOnchain) {
      var tx = await grizzly.connect(user1).grizzlyStrategyClaimHoney();
      await tx.wait();
    }
  });

  it("user1 deposit with 1000 DAI and 10% slippage to (usdc-busd)Grizzly ", async () => {
    if (!isOnchain) {
      var tx = await fakeDAI.transfer(user1.address, toBigNum("1000", 18));
      await tx.wait();
      var tx = await fakeDAI.connect(user1).approve(grizzly.address, toBigNum("1000", 18));
      await tx.wait();

      var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      var tx = await grizzly.connect(user1).depositFromToken(
          fakeDAI.address,
          toBigNum("1000", 18),
          user4.address,
          [fakeDAI.address, fakeDAI.address],
          [wBNB.address, wBNB.address],
          [toBigNum("1000", 18), toBigNum("1000", 18)],
          ["1", "1"],
          "10000",
          currentTimeStamp + 10,
        );
      await tx.wait();
    }
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////       check balances             ////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
const checkBNBBalance = async () => {
  console.log("owner BNB balance",fromBigNum(await ethers.provider.getBalance(owner.address), 18));
  // console.log("user1 BNB balance", fromBigNum(await ethers.provider.getBalance(user1.address), 18));
};
