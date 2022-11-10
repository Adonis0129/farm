const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const EthCrypto = require("eth-crypto");
const keccak256 = require("keccak256");
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
let cake;
let syrup;
let masterChef;
let masterChefV2;
let dex;
let furFiBNBFarm;

let bnb_usdc_lp;
let bnb_usdt_lp;
let bnb_busd_lp;
let bnb_dai_lp;
let furFi_bnb_lp;

let bnb_cake_lp;
let usdc_busd_lp;
let usdc_usdt_lp;
let dai_busd_lp;
let usdt_busd_lp;

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
    fakeUSDC: "0x7F8CE1b5486F24cd4e5CB98e78d306cD71Ea337b",
    fakeUSDT: "0x60c83C6D100C916069B230167c37358dC2997083",
    fakeBUSD: "0x4F796eF3c2e25aFe1746311f81E3142E27F75Bb8",
    fakeDAI: "0x87CbE425044Cc022D14bf419301B5a455c9Be410",
    cake: "0xCF625aAb4B709C03e81BB83135E2113a76b21eF6",
    syrup: "0x301B1b38650824e9FfbF55d558BE81BcebA66Cd8",
    masterChef: "0xee6F7CDFC42DBc2a496bAdc9AeC5d304dE8BB9b8",
    masterChefV2: "0x26A68F58D8FB1aaebb3C2091D6e3fB1118e4e1E5",
    token: "0xA3ae030037d2A34875FcA27b79a0f6F014D9F68F",
    dex: "0x69708f2CE6ef418ff80cA66341B51659603E531D",
    furFiBNBFarm: "",
  };
  
  var lpAddresses = {
    bnb_cake_lp: "0x4F7Cc5657E7f81B017b4Ef797A892a706C199dd1",
    usdc_busd_lp: "0xA1c75D3b1de4927141A9363F15df2cEF10ca0F9c",
    usdc_usdt_lp: "0x8602c9dAbDD2C73F57D6563a398D252a2f7c1557",
    dai_busd_lp: "0xe62142f6E36EFE523C1aF36a21656a9e6fd7117c",
    usdt_busd_lp: "0x0CCcDf4880fBF43251a376e2e633Dffe30a8A40a",
  
    bnb_usdc_lp: "0x0dA7F314aF09Ac11B5621EfAF3893112225d5F63",
    bnb_usdt_lp: "0x47E7cC2F542FFC235b9BEe09B38afCc963E3406c",
    bnb_busd_lp: "0xdeEE7074F2F6884D13E791e69Aa7B2C9D87B3EfE",
    bnb_dai_lp: "0x55962eaC3cfF89235140df27FF22DF1Be8B5b59B",
    furFi_bnb_lp: "0x2BedaE042B02F454dEDB6010c3f9478ebCe233ef",
  };

/**
 *  _admin: owner.address
 *  _developmentFounders = 0xC01cbc79644283782BabE262D1C56493d83D6fe2
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

describe("Contracts deploy", () => {
 // ------ dex deployment ------- //
  it("Factory deploy", async () => {
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

  it("WBNB deploy", async () => {
    const WBNB_ = await ethers.getContractFactory("WBNB");
    if (!isOnchain) {
      wBNB = await WBNB_.deploy();
      await wBNB.deployed();
    } else {
      wBNB = WBNB_.attach(deployedAddress.wBNB);
    }
    console.log("WBNB", wBNB.address);
  });

  it("Router deploy", async () => {
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
        var tx = await cake.mint(owner.address, toBigNum("460000", 18));
        await tx.wait();
  
        var tx = await cake.approve(
          exchangeRouter.address,
          toBigNum("460000", 18)
        );
        await tx.wait();
  
        var tx = await exchangeRouter.addLiquidityETH(
          cake.address,
          toBigNum("460000", 18),
          0,
          0,
          owner.address,
          "1234325432314321",
          { value: ethers.utils.parseUnits("0.5", 18) }
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
          toBigNum("10000", 18)
        );
        await tx.wait();
  
        var tx = await exchangeRouter.addLiquidityETH(
          fakeUSDC.address,
          toBigNum("10000", 18),
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
          toBigNum("13850000", 8)
        );
        await tx.wait();
  
        var tx = await exchangeRouter.addLiquidityETH(
          fakeUSDT.address,
          toBigNum("13850000", 8),
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
          toBigNum("13850000", 18)
        );
        await tx.wait();
  
        var tx = await exchangeRouter.addLiquidityETH(
          fakeBUSD.address,
          toBigNum("13850000", 18),
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
          toBigNum("13850000", 18)
        );
        await tx.wait();
  
        var tx = await exchangeRouter.addLiquidityETH(
          fakeDAI.address,
          toBigNum("13850000", 18),
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
      } else {
        console.log("usdc_busd_lp address", lpAddresses.usdc_busd_lp);
      }
    });
  
    it("creat USDC-USDT pool", async () => {
      if (!isOnchain) {
        var tx = await fakeUSDC.approve(
          exchangeRouter.address,
          toBigNum("100000", 18)
        );
        await tx.wait();
  
        var tx = await fakeUSDT.approve(
          exchangeRouter.address,
          toBigNum("100000", 6)
        );
        await tx.wait();
  
        var tx = await exchangeRouter.addLiquidity(
          fakeUSDC.address,
          fakeUSDT.address,
          toBigNum("100000", 18),
          toBigNum("100000", 6),
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
      } else {
        console.log("dai_busd_lp address", lpAddresses.dai_busd_lp);
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
    it("Token deploy", async () => {
        Token = await ethers.getContractFactory("FurioFinanceToken");
        if (!isOnchain) {
          token = await upgrades.deployProxy(Token, ["FurioFinanceToken", "$FURFI", toBigNum("10000000", 18), owner.address, "0xC01cbc79644283782BabE262D1C56493d83D6fe2", "0x105F706AB60fcc1F760b1b6cAD331A647272BDCb", "0x56edb7B2AB826B64c26C599C050B909c4d8E1a29", "0x4962B860e02eb883CB02Bd879641f3d637e123fC"]);
          await token.deployed();
        }
        else{
          token = Token.attach(deployedAddress.token);
        }
        console.log("token", token.address);
      });
    
      it("creat BNB-FurFiToken pool", async () => {
        if (!isOnchain) {
          var tx = await token.approve(
            exchangeRouter.address,
            toBigNum("5000000", 18)
          );
          await tx.wait();
    
          var tx = await exchangeRouter.addLiquidityETH(
            token.address,
            toBigNum("5000000", 18),
            0,
            0,
            owner.address,
            "1234325432314321",
            { value: ethers.utils.parseUnits("0.5", 18) }
          );
          await tx.wait();
    
          var pair = await exchangeFactory.getPair(wBNB.address, token.address);
          furFi_bnb_lp = new ethers.Contract(pair, ERC20ABI, owner);
          console.log("furFi_bnb_lp address", furFi_bnb_lp.address);
    
          await checkLPBalance();
        } else {
          console.log("furFi_bnb_lp address", lpAddresses.furFi_bnb_lp);
        }
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

    it("FurFiBNBFarm contract deployment, set role", async () => {
        FurFiBNBFarm = await ethers.getContractFactory("FurioFinanceBNBFarm");
        if (!isOnchain) {
          //for hardhat test
          furFiBNBFarm = await upgrades.deployProxy(FurFiBNBFarm, [
            token.address,
            furFi_bnb_lp.address,
            dex.address,
            owner.address,
          ]);
          await furFiBNBFarm.deployed();
    
          //**** when deploy on testnet, run one time!  ****//
          // furFiBNBFarm = await upgrades.deployProxy(FurFiBNBFarm, [
          //   token.address,
          //   lpAddresses.furFi_bnb_lp,
          //   exchangeRouter.address,
          //   owner.address,
          // ]);
          // await furFiBNBFarm.deployed();
    
          //set role
          var tx = await furFiBNBFarm.grantRole(
            keccak256("UPDATER_ROLE"),
            owner.address
          );
          await tx.wait();
          var tx = await furFiBNBFarm.grantRole(
            keccak256("PAUSER_ROLE"),
            owner.address
          );
          await tx.wait();
          var tx = await furFiBNBFarm.grantRole(
            keccak256("FUNDS_RECOVERY_ROLE"),
            owner.address
          );
          await tx.wait();
    
          //set setFurFiMintingRewards
          var currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
          console.log("current timestamp", currentTimeStamp);
          var tx = await furFiBNBFarm.setFurioFinanceMintingRewards(
            currentTimeStamp + 2592000,
            currentTimeStamp + 7776000,
            toBigNum("100000"),
            toBigNum("10000")
          )
          await tx.wait();
    
          //FurFi Token
          var tx = await token.grantRole(
            keccak256("MINTER_ROLE"),
            furFiBNBFarm.address
          );
          await tx.wait();
    
        } else {
            furFiBNBFarm = FurFiBNBFarm.attach(deployedAddress.furFiBNBFarm);
        }
        console.log("furFiBNBFarm", furFiBNBFarm.address);
      });
  

  });

/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////     test  ///////////////////////////////////////////////////

describe("test ", () => {
  
    it("user1 stake 100 FUR-BNB LP", async () => {
        var tx = await furFi_bnb_lp.transfer(user1.address, toBigNum("100"));
        await tx.wait();

        var tx = await furFi_bnb_lp.connect(user1).approve(furFiBNBFarm.address, toBigNum("100"));
        await tx.wait();

        var tx = await furFiBNBFarm.connect(user1).stakeLp(toBigNum("100"));
        await tx.wait();

        await network.provider.send("evm_increaseTime", [86400]);
        await network.provider.send("evm_mine");

    })

    it("user2 stake 0.02 BNB and 5% slippage ", async () => {

      var tx = await furFiBNBFarm.connect(user2).stakeFromEth(
          [wBNB.address],
          [token.address],
          [ethers.utils.parseUnits("0.02", 18)],
          ["1"],
          "5000",
          { value: ethers.utils.parseUnits("0.02", 18) }
        );
      await tx.wait();
    })

    it("user3 stake 300 USDC and 5% slippage ", async () => {

    var tx = await fakeUSDC.transfer(user3.address, toBigNum("300", 18));
      await tx.wait();
      var tx = await fakeUSDC.connect(user3).approve(furFiBNBFarm.address, toBigNum("300", 18));
      await tx.wait();

        var tx = await furFiBNBFarm.connect(user3).stakeFromToken(
        fakeUSDC.address,
        toBigNum("300", 18),
        [fakeUSDC.address],
          [wBNB.address],
          [toBigNum("150", 18)],
          ["1"],
          "5000",
          );
        await tx.wait();
      })



    it("check pending FurFi rewards", async () => {
        let user1PendingFurFiReward = await furFiBNBFarm.connect(user1).pendingRewards();
        console.log("user1PendingFurFiReward", fromBigNum(user1PendingFurFiReward));
        let user2PendingFurFiReward = await furFiBNBFarm.connect(user2).pendingRewards();
        console.log("user2PendingFurFiReward", fromBigNum(user2PendingFurFiReward));
        let user3PendingFurFiReward = await furFiBNBFarm.connect(user3).pendingRewards();
        console.log("user3PendingFurFiReward", fromBigNum(user3PendingFurFiReward));

    })

    // it("user1 unstake to lp", async () => {
    //     var tx = await furFiBNBFarm.connect(user1).unstakeLp(toBigNum("100"));
    //     await tx.wait();
    // })

    // it("user1 unstake to bnb", async () => {
    //     var tx = await furFiBNBFarm.connect(user1).unstakeToEth(
    //         toBigNum("100"),
    //         [token.address],
    //         [wBNB.address],
    //         [toBigNum("100")],
    //         ["1"],
    //         "5000",
    //     );
    //     await tx.wait();
    // })

    it("user1 unstake to BUSD", async () => {
        var tx = await furFiBNBFarm.connect(user1).unstakeToToken(
            fakeBUSD.address,
            toBigNum("100"),
            [wBNB.address],
            [fakeBUSD.address],
            [toBigNum("100")],
            ["1"],
            "5000",
        );
        await tx.wait();
    })

    it("user1 claim reward", async () => {
        var tx = await furFiBNBFarm.connect(user1).claimRewards();
        await tx.wait();
        await checkTokenBalance();
    })

});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const checkBNBBalance = async () =>{
    console.log("owner wBNB balance", fromBigNum(await ethers.provider.getBalance(owner.address), 18));
    console.log("user1 wBNB balance", fromBigNum(await ethers.provider.getBalance(user1.address), 18));
    console.log("user2 wBNB balance", fromBigNum(await ethers.provider.getBalance(user2.address), 18));
  }
  
  const checkTokenBalance = async () =>{
    console.log("owner Token balance", fromBigNum(await token.balanceOf(owner.address), 18));
    console.log("user1 Token balance", fromBigNum(await token.balanceOf(user1.address), 18));
    console.log("user2 Token balance", fromBigNum(await token.balanceOf(user2.address), 18));
  }

  const checkLPBalance = async () =>{
    console.log("owner LP balance", fromBigNum(await furFi_bnb_lp.balanceOf(owner.address), 18));
    // console.log("user1 LP balance", fromBigNum(await furFi_bnb_lp.balanceOf(user1.address), 18));
    // console.log("user2 LP balance", fromBigNum(await furFi_bnb_lp.balanceOf(user2.address), 18));
  }