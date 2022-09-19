//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./Interfaces/IMasterChef.sol";
import "./Interfaces/IUniswapV2Router01.sol";
import "./Interfaces/IUniswapV2Pair.sol";
import "./Interfaces/IStakingPool.sol";
import "./Interfaces/IFurioFinanceToken.sol";
import "./Interfaces/IReferral.sol";
import "./Interfaces/IAveragePriceOracle.sol";
import "./Interfaces/IDEX.sol";

/// @title Base config for furiofi contract
/// @notice This contract contains all external addresses and dependencies for the furiofi contract. It also approves dependent contracts to spend tokens on behalf of furiofi.sol
/// @dev The contract furiofi.sol inherits this contract to have all dependencies available. This contract is always inherited and never deployed alone
abstract contract BaseConfig is
    AccessControlUpgradeable,
    PausableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    // the role that allows updating parameters
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant FUNDS_RECOVERY_ROLE = keccak256("FUNDS_RECOVERY_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant MAX_PERCENTAGE = 100000;
    uint256 public constant DECIMAL_OFFSET = 10e12;

    IUniswapV2Pair public LPToken;
    IMasterChef public StakingContract;
    IStakingPool public StakingPool;
    IFurioFinanceToken public FurFiToken;
    IERC20Upgradeable public FurFiBnbLpToken;
    IERC20Upgradeable public RewardToken;
    IERC20Upgradeable public TokenA;
    IERC20Upgradeable public TokenB;
    IReferral public Referral;
    IAveragePriceOracle public AveragePriceOracle;
    IDEX public DEX;
    uint256 public PoolID;
    address public DevTeam;

    function __BaseConfig_init(
        address _Admin,
        address _StakingContractAddress,
        address _StakingPoolAddress,
        address _FurFiTokenAddress,
        address _FurFiBnbLpTokenAddress,
        address _DevTeamAddress,
        address _ReferralAddress,
        address _AveragePriceOracleAddress,
        address _DEXAddress,
        uint256 _PoolID
    ) internal {
        _grantRole(DEFAULT_ADMIN_ROLE, _Admin);

        StakingContract = IMasterChef(_StakingContractAddress);
        StakingPool = IStakingPool(_StakingPoolAddress);
        FurFiToken = IFurioFinanceToken(_FurFiTokenAddress);
        FurFiBnbLpToken = IERC20Upgradeable(_FurFiBnbLpTokenAddress);
        Referral = IReferral(_ReferralAddress);
        AveragePriceOracle = IAveragePriceOracle(_AveragePriceOracleAddress);
        DEX = IDEX(_DEXAddress);

        DevTeam = _DevTeamAddress;
        PoolID = _PoolID;

        address lpToken = StakingContract.lpToken(PoolID);

        LPToken = IUniswapV2Pair(lpToken);

        TokenA = IERC20Upgradeable(LPToken.token0());

        TokenB = IERC20Upgradeable(LPToken.token1());

        RewardToken = IERC20Upgradeable(StakingContract.CAKE());

        IERC20Upgradeable(address(LPToken)).safeApprove(
            address(StakingContract),
            type(uint256).max
        );

        IERC20Upgradeable(address(RewardToken)).safeApprove(
            address(DEX),
            type(uint256).max
        );

        IERC20Upgradeable(address(LPToken)).safeApprove(
            address(DEX),
            type(uint256).max
        );

        IERC20Upgradeable(address(FurFiToken)).safeApprove(
            address(StakingPool),
            type(uint256).max
        );
        IERC20Upgradeable(address(FurFiToken)).safeApprove(
            address(Referral),
            type(uint256).max
        );
        IERC20Upgradeable(address(FurFiBnbLpToken)).safeApprove(
            address(StakingPool),
            type(uint256).max
        );
    }

    function isNotPaused() internal view {
        require(!paused(), "PS");
    }

    function isPaused() internal view {
        require(paused(), "NP");
    }

}

/// @title Standard strategy handler
/// @notice The contract keeps track of the balances of the lp tokens and their reinvests (rewards) including the furFiToken rewards using EIP-1973
/// @dev This contract is abstract and is intended to be inherited by furiofi.sol. FurFiToken rewards and lp rewards are handled using a round mask
abstract contract StandardStrategy is Initializable, BaseConfig {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct StandardStrategyParticipant {
        uint256 amount;
        uint256 lpMask;
        uint256 rewardMask;
        uint256 pendingRewards;
        uint256 totalReinvested;
    }

    uint256 public lpRoundMask;
    uint256 public standardStrategyDeposits;

    uint256 public totalFurFiTokenRewards;
    uint256 private furFiRoundMask;

    event StandardStrategyClaimFurFiTokenEvent(
        address indexed user,
        uint256 honeyAmount
    );

    mapping(address => StandardStrategyParticipant) private participantData;

    function __StandardStrategy_init() internal initializer {
        lpRoundMask = 1;
        furFiRoundMask = 1;
    }

    /// @notice Deposits the desired amount for a standard strategy investor
    /// @dev Pending lp rewards are rewarded and the investors rewardMask is set again to the current roundMask
    /// @param amount The desired deposit amount for an investor
    function standardStrategyDeposit(uint256 amount) internal {
        updateStandardRewardMask();
        uint256 currentDeposit = getStandardStrategyBalance();
        uint256 currentAmount = participantData[msg.sender].amount;

        standardStrategyDeposits =
            standardStrategyDeposits +
            currentDeposit -
            currentAmount +
            amount;

        participantData[msg.sender].amount = currentDeposit + amount;
        participantData[msg.sender].lpMask = lpRoundMask;
        participantData[msg.sender].totalReinvested +=
            currentDeposit -
            currentAmount;
    }

    /// @notice Withdraws the desired amount for a standard strategy investor
    /// @dev Pending lp rewards are rewarded and the investors rewardMask is set again to the current roundMask
    /// @param amount The desired withdraw amount for an investor
    function standardStrategyWithdraw(uint256 amount) internal {
        require(amount > 0, "TZ");

        updateStandardRewardMask();
        uint256 currentDeposit = getStandardStrategyBalance();
        uint256 currentAmount = participantData[msg.sender].amount;
        require(amount <= currentDeposit, "SD");

        standardStrategyDeposits =
            standardStrategyDeposits +
            currentDeposit -
            currentAmount -
            amount;

        participantData[msg.sender].amount = currentDeposit - amount;
        participantData[msg.sender].lpMask = lpRoundMask;
        participantData[msg.sender].totalReinvested +=
            currentDeposit -
            currentAmount;
    }

    /// @notice Adds global lp rewards to the contract
    /// @dev The lp roundmask is increased by the share of the rewarded amount such that investors get their share of pending lp rewards
    /// @param amount The amount to be rewarded
    function standardStrategyRewardLP(uint256 amount) internal {
        if (standardStrategyDeposits == 0) return;

        lpRoundMask += (DECIMAL_OFFSET * amount) / standardStrategyDeposits;
    }

    /// @notice Gets the current standard strategy balance for an investor. Pending lp rewards are included too
    /// @dev Pending rewards are calculated through the difference between the current round mask and the investors rewardMask according to EIP-1973
    /// @return Current standard strategy balance
    function getStandardStrategyBalance() public view returns (uint256) {
        if (participantData[msg.sender].lpMask == 0) return 0;

        return
            participantData[msg.sender].amount +
            ((lpRoundMask - participantData[msg.sender].lpMask) *
                participantData[msg.sender].amount) /
            DECIMAL_OFFSET;
    }

    /// @notice Adds global furFiToken rewards to the contract
    /// @dev The furFiToken roundmask is increased by the share of the rewarded amount such that investors get their share of pending furFiToken rewards
    /// @param amount The amount of furFiToken to be rewarded
    function standardStrategyRewardFurFi(uint256 amount) internal {
        if (standardStrategyDeposits == 0) {
            return;
        }
        totalFurFiTokenRewards += amount;
        furFiRoundMask += (DECIMAL_OFFSET * amount) / standardStrategyDeposits;
    }

    /// @notice Claims the standard strategy investors furFiToken rewards
    /// @dev Can be called static to get the current standard strategy furFiToken pending reward
    /// @return The pending rewards transfered to the investor
    function standardStrategyClaimFurFi() public returns (uint256) {
        isNotPaused();
        updateStandardRewardMask();
        uint256 pendingRewards = participantData[msg.sender].pendingRewards;
        participantData[msg.sender].pendingRewards = 0;
        IERC20Upgradeable(address(FurFiToken)).safeTransfer(
            msg.sender,
            pendingRewards
        );
        emit StandardStrategyClaimFurFiTokenEvent(msg.sender, pendingRewards);
        return pendingRewards;
    }

    /// @notice Gets the current standard strategy furFiToken rewards for an investor. Pending furFiToken rewards are included too
    /// @dev Pending rewards are calculated through the difference between the current round mask and the investors rewardMask according to EIP-1973
    /// @return Current standard strategy furFiToken rewards
    function getStandardStrategyFurFiRewards() public view returns (uint256) {
        if (participantData[msg.sender].rewardMask == 0) return 0;

        return
            participantData[msg.sender].pendingRewards +
            ((furFiRoundMask - participantData[msg.sender].rewardMask) *
                participantData[msg.sender].amount) /
            DECIMAL_OFFSET;
    }

    /// @notice Updates the standard strategy furFiToken rewards mask
    function updateStandardRewardMask() private {
        uint256 currentRewardBalance = getStandardStrategyFurFiRewards();
        participantData[msg.sender].pendingRewards = currentRewardBalance;
        participantData[msg.sender].rewardMask = furFiRoundMask;
    }

    /// @notice Reads out the participant data
    /// @param participant The address of the participant
    /// @return Participant data
    function getStandardStrategyParticipantData(address participant)
        public
        view
        returns (StandardStrategyParticipant memory)
    {
        return participantData[participant];
    }

    uint256[50] private __gap;
}

/// @title The Standard Strategy FurioFinance contract
/// @notice This contract put together all abstract contracts and is deployed once for each token pair (hive). It allows the user to deposit and withdraw funds to the predefined hive. In addition, rewards can be staked using stakeReward.
/// @dev AccessControl from openzeppelin implementation is used to handle the update of the beeEfficiency level.
/// User with DEFAULT_ADMIN_ROLE can grant UPDATER_ROLE to any address.
/// The DEFAULT_ADMIN_ROLE is intended to be a 2 out of 3 multisig wallet in the beginning and then be moved to governance in the future.
/// The Contract uses ReentrancyGuard from openzeppelin for all transactions that transfer bnbs to the msg.sender
contract SDStrategyFurioFinance is
    Initializable,
    BaseConfig,
    StandardStrategy,
    ReentrancyGuardUpgradeable
{
    receive() external payable { }

    using SafeERC20Upgradeable for IERC20Upgradeable;

        function initialize(
            address _Admin,
            address _StakingContractAddress,
            address _StakingPoolAddress,
            address _FurFiTokenAddress,
            address _FurFiBnbLpTokenAddress,
            address _DevTeamAddress,
            address _ReferralAddress,
            address _AveragePriceOracleAddress,
            address _DEXAddress,
            uint256 _PoolID
        ) public initializer {
        __BaseConfig_init(
            _Admin,
            _StakingContractAddress,
            _StakingPoolAddress,
            _FurFiTokenAddress,
            _FurFiBnbLpTokenAddress,
            _DevTeamAddress,
            _ReferralAddress,
            _AveragePriceOracleAddress,
            _DEXAddress,
            _PoolID
        );
        __StandardStrategy_init();
        __Pausable_init();

        EfficiencyLevel = 500 ether;
    }

    uint256 public EfficiencyLevel;

    uint256 public totalUnusedTokenA;
    uint256 public totalUnusedTokenB;
    uint256 public totalRewardsClaimed;
    uint256 public totalStandardBnbReinvested;
    uint256 public totalStablecoinBnbReinvested;
    uint256 public lastStakeRewardsCall;
    uint256 public lastStakeRewardsDuration;
    uint256 public lastStakeRewardsDeposit;
    uint256 public lastStakeRewardsCake;
    uint256 public restakeThreshold;

    struct LoanParticipant {
        uint256 loanableAmount; // loanable furFiToken token amount
        uint256 loanedAmount; // loaned furFiToken token amount
    }
    uint256 totalLoanedAmount;
    mapping(address => LoanParticipant) private LoanParticipantData;

    event DepositEvent(
        address indexed user,
        uint256 lpAmount
    );
    event WithdrawEvent(
        address indexed user,
        uint256 lpAmount
    );
    event StakeRewardsEvent(
        address indexed caller,
        uint256 bnbAmount
    );
    event LoanEvent(
        address indexed user,
        uint256 furFiAmount
    );

    /// @notice pause
    /// @dev pause the contract
    function pause() external onlyRole(PAUSER_ROLE) {
        isNotPaused();
        _pause();
    }

    /// @notice unpause
    /// @dev unpause the contract
    function unpause() external onlyRole(PAUSER_ROLE) {
        isPaused();
        _unpause();
    }

    /// @notice The public deposit function
    /// @dev This is a payable function where the user can deposit bnbs
    /// @param referralGiver The address of the account that provided referral
    /// @param fromToken The list of token addresses from which the conversion is done
    /// @param toToken The list of token addresses to which the conversion is done
    /// @param amountIn The list of quoted input amounts
    /// @param amountOut The list of output amounts for each quoted input amount
    /// @param slippage The allowed slippage
    /// @param deadline The deadline for the transaction
    /// @return The value in LP tokens that was deposited
    function deposit(
        address referralGiver,
        address[] memory fromToken,
        address[] memory toToken,
        uint256[] memory amountIn,
        uint256[] memory amountOut,
        uint256 slippage,
        uint256 deadline
    ) external payable nonReentrant returns(uint256) {
        isNotPaused();
        require(deadline > block.timestamp, "DE");
        DEX.checkSlippage(fromToken, toToken, amountIn, amountOut, slippage);

        //send 3% of bnb to devTeam
        _transferEth(DevTeam, msg.value * 30 / 1000);
        //set loanable amount
        AveragePriceOracle.updateFurFiEthPrice();
        uint256 furFiAmountPerBNB =  AveragePriceOracle.getAverageFurFiForOneEth();
        LoanParticipantData[msg.sender].loanableAmount = msg.value * 970 / 1000 * (furFiAmountPerBNB / 10**18);

        return _deposit(msg.value * 970 / 1000, referralGiver);
    }

    /// @notice The public deposit from token function
    /// @dev The user can define a token which he would like to use to deposit. This token is then firstly converted into bnbs
    /// @param token The tokens address
    /// @param amount The amount of the token to be deposited
    /// @param referralGiver The address of the account that provided referral
    /// @param fromToken The list of token addresses from which the conversion is done
    /// @param toToken The list of token addresses to which the conversion is done
    /// @param amountIn The list of quoted input amounts
    /// @param amountOut The list of output amounts for each quoted input amount
    /// @param slippage The allowed slippage
    /// @param deadline The deadline for the transaction
    /// @return The value in LP tokens that was deposited
    function depositFromToken(
        address token,
        uint256 amount,
        address referralGiver,
        address[] memory fromToken,
        address[] memory toToken,
        uint256[] memory amountIn,
        uint256[] memory amountOut,
        uint256 slippage,
        uint256 deadline
    ) external nonReentrant returns(uint256) {
        isNotPaused();
        require(deadline > block.timestamp, "DE");
        DEX.checkSlippage(fromToken, toToken, amountIn, amountOut, slippage);
        IERC20Upgradeable TokenInstance = IERC20Upgradeable(token);
        TokenInstance.safeTransferFrom(msg.sender, address(this), amount);
        if (TokenInstance.allowance(address(this), address(DEX)) < amount) {
            TokenInstance.approve(address(DEX), amount);
        }
        uint256 amountConverted = DEX.convertTokenToEth(amount, token);

        //send 3% of bnb to devTeam
        _transferEth(DevTeam, amountConverted * 30 / 1000);
        // set loanable amount
        AveragePriceOracle.updateFurFiEthPrice();
        uint256 furFiAmountPerBNB =  AveragePriceOracle.getAverageFurFiForOneEth();
        LoanParticipantData[msg.sender].loanableAmount = amountConverted * 970 / 1000 * (furFiAmountPerBNB / 10**18);

        return _deposit(amountConverted * 970 / 1000, referralGiver);
    }

    /// @notice The public withdraw function
    /// @dev Withdraws the desired amount for the user and transfers the bnbs to the user by using the call function. Adds a reentrant guard
    /// @param amount The amount of the token to be withdrawn
    /// @param fromToken The list of token addresses from which the conversion is done
    /// @param toToken The list of token addresses to which the conversion is done
    /// @param amountIn The list of quoted input amounts
    /// @param amountOut The list of output amounts for each quoted input amount
    /// @param slippage The allowed slippage
    /// @param deadline The deadline for the transaction
    /// @return The value in BNB that was withdrawn
    function withdraw(
        uint256 amount,
        address[] memory fromToken,
        address[] memory toToken,
        uint256[] memory amountIn,
        uint256[] memory amountOut,
        uint256 slippage,
        uint256 deadline
    ) external nonReentrant returns(uint256) {
        isNotPaused();
        require(deadline > block.timestamp, "DE");
        DEX.checkSlippage(fromToken, toToken, amountIn, amountOut, slippage);

        uint256 repayalAmount = getRepayalAmount(amount);
        //repayment some loaned token
        if(repayalAmount > 0)
        {
            require(FurFiToken.balanceOf(msg.sender) >= repayalAmount);
            FurFiToken.transferFrom(msg.sender, address(this), repayalAmount);
            LoanParticipantData[msg.sender].loanedAmount -= repayalAmount;
        }

        _stakeRewards();
        uint256 amountWithdrawn = _withdraw(amount);
        _transferEth(msg.sender, amountWithdrawn);
        return amountWithdrawn;
    }

    /// @notice The public withdraw all function
    /// @dev Calculates the total staked amount in the first place and uses that to withdraw all funds. Adds a reentrant guard
    /// @param fromToken The list of token addresses from which the conversion is done
    /// @param toToken The list of token addresses to which the conversion is done
    /// @param amountIn The list of quoted input amounts
    /// @param amountOut The list of output amounts for each quoted input amount
    /// @param slippage The allowed slippage
    /// @param deadline The deadline for the transaction
    /// @return The value in BNB that was withdrawn
    function withdrawAll(
        address[] memory fromToken,
        address[] memory toToken,
        uint256[] memory amountIn,
        uint256[] memory amountOut,
        uint256 slippage,
        uint256 deadline
    ) external nonReentrant returns(uint256) {
        isNotPaused();
        require(deadline > block.timestamp, "DE");
        DEX.checkSlippage(fromToken, toToken, amountIn, amountOut, slippage);

        //repayment all loaned token
        if(LoanParticipantData[msg.sender].loanedAmount > 0)
        {   
            uint256 loanedAmount = LoanParticipantData[msg.sender].loanedAmount;
            require(FurFiToken.balanceOf(msg.sender) >= loanedAmount, "Don't exist enough loaned token to repayment");
            FurFiToken.transferFrom(msg.sender, address(this), loanedAmount);
            LoanParticipantData[msg.sender].loanedAmount = 0;
        }

        _stakeRewards();
        uint256 currentDeposits = getStandardStrategyBalance();
        uint256 amountWithdrawn = 0;
        if (currentDeposits > 0) {
            amountWithdrawn = _withdraw(currentDeposits);
            _transferEth(msg.sender, amountWithdrawn);
        }
        return amountWithdrawn;
    }

    /// @notice The public withdraw to token function
    /// @dev The user can define a token in which he would like to withdraw the deposits. The bnb amount is converted into the token and transferred to the user
    /// @param token The tokens address
    /// @param amount The amount of the token to be withdrawn
    /// @param fromToken The list of token addresses from which the conversion is done
    /// @param toToken The list of token addresses to which the conversion is done
    /// @param amountIn The list of quoted input amounts
    /// @param amountOut The list of output amounts for each quoted input amount
    /// @param slippage The allowed slippage
    /// @param deadline The deadline for the transaction
    /// @return The value in token amount that was withdrawn
    function withdrawToToken(
        address token,
        uint256 amount,
        address[] memory fromToken,
        address[] memory toToken,
        uint256[] memory amountIn,
        uint256[] memory amountOut,
        uint256 slippage,
        uint256 deadline
    ) external nonReentrant returns(uint256) {
        isNotPaused();
        require(deadline > block.timestamp, "DE");
        DEX.checkSlippage(fromToken, toToken, amountIn, amountOut, slippage);

        uint256 repayalAmount = getRepayalAmount(amount);
        //repayment some loaned token
        if(repayalAmount > 0)
        {
            require(FurFiToken.balanceOf(msg.sender) >= repayalAmount);
            FurFiToken.transferFrom(msg.sender, address(this), repayalAmount);
            LoanParticipantData[msg.sender].loanedAmount -= repayalAmount;
        }

        _stakeRewards();
        uint256 amountWithdrawn = _withdraw(amount);
        uint256 tokenAmountWithdrawn = DEX.convertEthToToken{
            value: amountWithdrawn
        } (token);
        IERC20Upgradeable(token).safeTransfer(msg.sender, tokenAmountWithdrawn);
        return tokenAmountWithdrawn;
    }

    /// @notice The internal deposit function
    /// @dev The actual deposit function. Bnbs are converted to lp tokens of the token pair and then staked with masterchef
    /// @param amount The amount of bnb to be deposited
    /// @param referralGiver The address of the account that provided referral
    /// @return The value in LP tokens that was deposited
    function _deposit(uint256 amount, address referralGiver)
    internal
    returns(uint256)
    {   
        require(amount > 0, "DL");
        _stakeRewards();

        (uint256 lpValue, uint256 unusedTokenA, uint256 unusedTokenB) = DEX
            .convertEthToPairLP{ value: amount} (address(LPToken));

        if (unusedTokenA > 0 || unusedTokenB > 0) {
            uint256 excessAmount;
            address excessToken;

            if (unusedTokenA > 0) {
                excessAmount = unusedTokenA;
                excessToken = address(TokenA);
            } else {
                excessAmount = unusedTokenB;
                excessToken = address(TokenB);
            }

            if (excessToken == 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c) {
                _transferEth(msg.sender, excessAmount);
            } else {
                IERC20Upgradeable(excessToken).safeTransfer(
                    msg.sender,
                    excessAmount
                );
            }
        }

        standardStrategyDeposit(lpValue);
        StakingContract.deposit(PoolID, lpValue);

        Referral.referralDeposit(lpValue, msg.sender, referralGiver);
        emit DepositEvent(msg.sender, lpValue);
        return lpValue;
    }

    /// @notice The internal withdraw function
    /// @dev The actual withdraw function. First the withdrwan from the strategy is performed and then Lp tokens are withdrawn from masterchef, converted into bnbs and returned.
    /// @param amount The amount of bnb to be withdrawn
    /// @return Amount to be withdrawn
    function _withdraw(uint256 amount) internal returns(uint256) {

        standardStrategyWithdraw(amount);
        standardStrategyClaimFurFi();

        StakingContract.withdraw(PoolID, amount);

        uint256 bnbAmount = DEX.convertPairLpToEth(address(LPToken), amount);

        Referral.referralWithdraw(amount, msg.sender);
        emit WithdrawEvent(msg.sender, amount);
        return bnbAmount;
    }

    /// @notice Stake rewards public function
    /// @dev Executes the restaking of the rewards. Adds a reentrant guard
    /// @param fromToken The list of token addresses from which the conversion is done
    /// @param toToken The list of token addresses to which the conversion is done
    /// @param amountIn The list of quoted input amounts
    /// @param amountOut The list of output amounts for each quoted input amount
    /// @param slippage The allowed slippage
    /// @param deadline The deadline for the transaction
    /// @return bnbAmount The BNB reward
    function stakeRewards(
        address[] memory fromToken,
        address[] memory toToken,
        uint256[] memory amountIn,
        uint256[] memory amountOut,
        uint256 slippage,
        uint256 deadline
    )
    external
    nonReentrant
    returns(uint256 bnbAmount)
    {
        isNotPaused();
        require(deadline > block.timestamp, "DE");
        DEX.checkSlippage(fromToken, toToken, amountIn, amountOut, slippage);
        return _stakeRewards();
    }

    /// @notice The actual internal stake rewards function
    /// @dev Executes the actual restaking of the rewards. Gets the current rewards from masterchef and divides the reward into the different strategies.
    /// Then executes the stakereward for the strategies. StakingContract.deposit(PoolID, 0); is executed in order to update the balance of the reward token
    /// @return amount The BNB reward
    function _stakeRewards()
    internal
    returns(uint256 amount)
    {
        // update average furFiToken bnb price
        AveragePriceOracle.updateFurFiEthPrice();

        // Get rewards from MasterChef
        uint256 beforeAmount = RewardToken.balanceOf(address(this));
        StakingContract.deposit(PoolID, 0);
        uint256 afterAmount = RewardToken.balanceOf(address(this));
        uint256 currentRewards = afterAmount - beforeAmount;
        if (currentRewards <= restakeThreshold) return 0;

        // Store rewards for APY calculation
        lastStakeRewardsDuration = block.timestamp - lastStakeRewardsCall;
        lastStakeRewardsCall = block.timestamp;
        (lastStakeRewardsDeposit, , ) = StakingContract.userInfo(
            PoolID,
            address(this)
        );
        lastStakeRewardsCake = currentRewards;
        totalRewardsClaimed += currentRewards;

        // Convert all rewards to BNB
        uint256 bnbAmount = DEX.convertTokenToEth(
            currentRewards,
            address(RewardToken)
        );

        if (standardStrategyDeposits > 0 && bnbAmount > 100) stakeStandardRewards(bnbAmount);

        emit StakeRewardsEvent(msg.sender, bnbAmount);
        return bnbAmount;
    }

    /// @notice Stakes the rewards for the standard strategy
    /// @param bnbReward The pending bnb reward to be restaked
    function stakeStandardRewards(uint256 bnbReward) internal {
        // 70% of the BNB is converted into TokenA-TokenB LP tokens
        uint256 tokenPairLpShare = (bnbReward * 70) / 100;
        (
            uint256 tokenPairLpAmount,
            uint256 unusedTokenA,
            uint256 unusedTokenB
        ) = DEX.convertEthToPairLP{ value: tokenPairLpShare } (address(LPToken));

        totalStandardBnbReinvested += tokenPairLpShare;
        totalUnusedTokenA += unusedTokenA;
        totalUnusedTokenB += unusedTokenB;

        // Update TokenA-TokenB LP rewards
        standardStrategyRewardLP(tokenPairLpAmount);

        // The TokenA-TokenB LP tokens are staked in the MasterChef
        StakingContract.deposit(PoolID, tokenPairLpAmount);

        // Get the price of FurFiToken relative to BNB
        uint256 furFiBnbPrice = AveragePriceOracle.getAverageFurFiForOneEth();

        // If FurFiToken price too low, use buyback strategy
        if (furFiBnbPrice < EfficiencyLevel) {
            // 24% of the BNB is used to buy FurFiToken from the DEX
            uint256 furFiBuybackShare = (bnbReward * 24) / 100;
            uint256 furFiBuybackAmount = DEX.convertEthToToken{
                value: furFiBuybackShare
            } (address(FurFiToken));

            // 6% of the equivalent amount of FurFiToken (based on FurFiToken-BNB price) is minted
            (uint256 mintedFurFi, uint256 referralFurFi) = mintTokens(
                (bnbReward * 6) / 100,
                furFiBnbPrice,
                (1 ether) / 100
            );

            // The purchased and minted FurFiToken is rewarded to the Standard strategy participants
            standardStrategyRewardFurFi(furFiBuybackAmount + mintedFurFi);
            Referral.referralUpdateRewards(referralFurFi);

            // The remaining 6% is transferred to the devs
            _transferEth(
                DevTeam,
                bnbReward - tokenPairLpShare - furFiBuybackShare
            );
        } else {
            // If FurFiToken price is high, 24% is converted into FurFiToken-BNB LP
            uint256 furFiBnbLpShare = (bnbReward * 24) / 100;
            (uint256 furFiBnbLpAmount, , ) = DEX.convertEthToTokenLP{
                value: furFiBnbLpShare
            } (address(FurFiToken));

            // That FurFiToken-BNB LP is sent as reward to the Staking Pool
            StakingPool.rewardLP(furFiBnbLpAmount);

            // 30% of the equivalent amount of FurFiToken (based on FurFiToken-BNB price) is minted
            (uint256 mintedFurFi, uint256 referralFurFi) = mintTokens(
                (bnbReward * 30) / 100,
                furFiBnbPrice,
                (1 ether) / 100
            );

            // The minted FurFiToken is rewarded to the Standard strategy participants
            standardStrategyRewardFurFi(mintedFurFi);
            Referral.referralUpdateRewards(referralFurFi);

            // The remaining 6% of BNB is transferred to the devs
            _transferEth(
                DevTeam,
                bnbReward - tokenPairLpShare - furFiBnbLpShare
            );
        }
    }

    /// @notice Mints tokens according to the  efficiency level
    /// @param _share The share that should be minted in furFiToken
    /// @param _furFiBnbPrice The  efficiency level to be uset to convert bnb shares into furFiToken amounts
    /// @param _additionalShare The additional share tokens to be minted
    /// @return tokens The amount minted in furFiToken tokens
    /// @return additionalTokens The additional tokens that were minted
    function mintTokens(
        uint256 _share,
        uint256 _furFiBnbPrice,
        uint256 _additionalShare
    ) internal returns(uint256 tokens, uint256 additionalTokens) {
        tokens = (_share * _furFiBnbPrice) / (1 ether);
        additionalTokens = (tokens * _additionalShare) / (1 ether);

        FurFiToken.claimTokens(tokens + additionalTokens);
    }

    /// @notice Updates the bee efficiency level
    /// @dev only updater role can perform this function
    /// @param _newEfficiencyLevel The new bee efficiency level
    function updateEfficiencyLevel(uint256 _newEfficiencyLevel)
    external
    onlyRole(UPDATER_ROLE)
    {
        EfficiencyLevel = _newEfficiencyLevel;
    }

    /// @notice Updates the restake threshold. If the CAKE rewards are bleow this value, stakeRewards() is ignored
    /// @dev only updater role can perform this function
    /// @param _restakeThreshold The new restake threshold value
    function updateRestakeThreshold(uint256 _restakeThreshold)
    external
    onlyRole(UPDATER_ROLE)
    {
        restakeThreshold = _restakeThreshold;
    }

    /// @notice Used to recover funds sent to this contract by mistake and claims unused tokens
    function recoverFunds()
    external
    nonReentrant
    onlyRole(FUNDS_RECOVERY_ROLE)
    {
        if (address(TokenA) != 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c) {
            TokenA.safeTransfer(msg.sender, totalUnusedTokenA);
        }

        if (address(TokenB) != 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c) {
            TokenB.safeTransfer(msg.sender, totalUnusedTokenB);
        }

        totalUnusedTokenA = 0;
        totalUnusedTokenB = 0;
        _transferEth(msg.sender, address(this).balance);
    }

    /// @notice Used to get the most up-to-date state for caller's deposits. It is intended to be statically called
    /// @dev Calls stakeRewards before reading strategy-specific data in order to get the most up to-date-state
    /// @return deposited - The amount of LP tokens deposited in the current strategy
    /// @return balance - The sum of deposited LP tokens and reinvested amounts
    /// @return totalReinvested - The total amount reinvested, including unclaimed rewards
    /// @return earnedFurFi - The amount of FurFiToken tokens earned
    /// @return earnedBnb - The amount of BNB earned
    /// @return stakedFurFi - The amount of FurFiToken tokens staked in the Staking Pool
    function getUpdatedState()
    external
    returns(
        uint256 deposited,
        uint256 balance,
        uint256 totalReinvested,
        uint256 earnedFurFi,
        uint256 earnedBnb,
        uint256 stakedFurFi
    )
    {
        isNotPaused();
        _stakeRewards();

        StandardStrategyParticipant memory participantData = getStandardStrategyParticipantData(msg.sender);

        deposited = participantData.amount;
        balance = getStandardStrategyBalance();
        totalReinvested =
            participantData.totalReinvested +
            balance -
            deposited;

        earnedFurFi = getStandardStrategyFurFiRewards();
        earnedBnb = 0;
        stakedFurFi = 0;
    }

    /// @notice payout function
    /// @dev care about non reentrant vulnerabilities
    function _transferEth(address to, uint256 amount) internal {
        (bool transferSuccess, ) = payable(to).call{ value: amount } ("");
        require(transferSuccess, "TF");
    }

    /// @notice loan the furFiToken token to staker
    function loan() external nonReentrant {
        uint256 loanableAmount = LoanParticipantData[msg.sender].loanableAmount;
        require(loanableAmount > 0, "Don't exist your loanable amount");

        if(FurFiToken.balanceOf(address(this)) < loanableAmount)
            FurFiToken.claimTokensWithoutAdditionalTokens(loanableAmount - FurFiToken.balanceOf(address(this)));

        FurFiToken.transfer(msg.sender, loanableAmount);
        LoanParticipantData[msg.sender].loanableAmount = 0;
        LoanParticipantData[msg.sender].loanedAmount += loanableAmount;
        totalLoanedAmount += loanableAmount;

    }

    /// @notice Reads out the loan participant data
    /// @param participant The address of the participant
    /// @return Participant data
    function getLoanParticipantData(address participant)
        public
        view
        returns (LoanParticipant memory)
    {
        return LoanParticipantData[participant];
    }

    /// @notice return FurFi amount that staker have to repayment to withdraw some staking amount
    /// @param withdrawalAmount The lp amount that staker are going to withdraw
    /// @return  repayalAmount
    function getRepayalAmount(uint256 withdrawalAmount)
        public
        view
        returns (uint256 repayalAmount)
    {
        uint256 currentDeposits = getStandardStrategyBalance();
        if(currentDeposits == 0) return 0;
        return LoanParticipantData[msg.sender].loanedAmount * withdrawalAmount / currentDeposits;

    }
    uint256[49] private __gap;
}