const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const EthCrypto = require("eth-crypto");
const { delay, toBigNum, fromBigNum } = require("./utils.js");

var ERC20ABI = artifacts.readArtifactSync("contracts/Mock/FakeUsdc.sol:IERC20").abi;
var pairContract;
var exchangeRouter;
var exchangeFactory;
let wBNB;


let token;
let fakeUSDC;
let fakeUSDT;
let fakeBUSD;
let fakeDAI;

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
  fakeDAI: ""
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
    [owner, user1, user2, user3, user4, user5, user6] = await ethers.getSigners();
    console.log("owner", owner.address);
    console.log("user1", user1.address);
    console.log("user2", user2.address);
    console.log("user3", user3.address);
    console.log("user4", user4.address);
    console.log("user5", user5.address);
    console.log("user6", user6.address);

    var tx = await user1.sendTransaction({ to: owner.address, value: ethers.utils.parseUnits("8000", 18)});
    await tx.wait();
    var tx = await user2.sendTransaction({ to: owner.address, value: ethers.utils.parseUnits("8000", 18)});
    await tx.wait();
    var tx = await user3.sendTransaction({ to: owner.address, value: ethers.utils.parseUnits("8000", 18)});
    await tx.wait();
    var tx = await user4.sendTransaction({ to: owner.address, value: ethers.utils.parseUnits("8000", 18)});
    await tx.wait();
    var tx = await user5.sendTransaction({ to: owner.address, value: ethers.utils.parseUnits("8000", 18)});
    await tx.wait();
    var tx = await user6.sendTransaction({ to: owner.address, value: ethers.utils.parseUnits("8000", 18)});
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
      console.log(await exchangeFactory.INIT_CODE_PAIR_HASH());
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
 ///////////////////////////////        Tokens deplyment          ////////////////////////////
 /////////////////////////////////////////////////////////////////////////////////////////////
describe(" tokens deployment", () => {

  it("Token deployment", async () => {
    Token = await ethers.getContractFactory("HoneyToken");
    if (!isOnchain) {
      token = await upgrades.deployProxy(Token,["HouseToken", "$HT", toBigNum("1000000", 18), owner.address, "0xC01cbc79644283782BabE262D1C56493d83D6fe2", "0x105F706AB60fcc1F760b1b6cAD331A647272BDCb", "0x56edb7B2AB826B64c26C599C050B909c4d8E1a29", "0x4962B860e02eb883CB02Bd879641f3d637e123fC"]);
      await token.deployed();
    }
    else{
      token = Token.attach(deployedAddress.token);
    }
    console.log("token", token.address);
  });

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

});


 /////////////////////////////////////////////////////////////////////////////////////////////
 ////////////////////       Pancakeswap evironment building           ////////////////////////
 /////////////////////////////////////////////////////////////////////////////////////////////
describe("Pancakeswap evironment building", () => {

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
    }
  });

});


 /////////////////////////////////////////////////////////////////////////////////////////////
 ///////////////////////////////       check balances             ////////////////////////////
 /////////////////////////////////////////////////////////////////////////////////////////////
const checkBNBBalance = async () => {
  console.log("owner BNB balance", fromBigNum(await ethers.provider.getBalance(owner.address), 18));
}