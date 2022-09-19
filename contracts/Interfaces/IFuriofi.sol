//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface IFuriofi {

function deposit(
    address referralGiver,
    address[] memory fromToken,
    address[] memory toToken,
    uint256[] memory amountIn,
    uint256[] memory amountOut,
    uint256 slippage,
    uint256 deadline
) external payable returns(uint256);

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
) external returns(uint256);

function withdraw(
    uint256 amount,
    address[] memory fromToken,
    address[] memory toToken,
    uint256[] memory amountIn,
    uint256[] memory amountOut,
    uint256 slippage,
    uint256 deadline
) external returns(uint256);

function withdrawAll(
    address[] memory fromToken,
    address[] memory toToken,
    uint256[] memory amountIn,
    uint256[] memory amountOut,
    uint256 slippage,
    uint256 deadline
) external returns(uint256);

function withdrawToToken(
    address token,
    uint256 amount,
    address[] memory fromToken,
    address[] memory toToken,
    uint256[] memory amountIn,
    uint256[] memory amountOut,
    uint256 slippage,
    uint256 deadline
) external returns(uint256);

function stakeRewards(
    address[] memory fromToken,
    address[] memory toToken,
    uint256[] memory amountIn,
    uint256[] memory amountOut,
    uint256 slippage,
    uint256 deadline
)
external
returns(
    uint256 totalBnb,
    uint256 standardBnb,
    uint256 furFiBnb,
    uint256 stablecoinBnb
);

function updateEfficiencyLevel(uint256 _EfficiencyThreshold) external;

function updateRestakeThreshold(uint256 _restakeThreshold) external;

function recoverFunds() external;

function loan() external;
}