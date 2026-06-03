// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

contract MockUSDTTest is Test {
    MockUSDT internal token;

    address internal treasury = address(0xA11CE);
    address internal payer = address(0xB0B);
    address internal merchantDeposit = address(0xCAFE);

    function setUp() public {
        token = new MockUSDT();
        token.mint(payer, 2_000_000_000);
    }

    function testDirectTransferToDepositAddress() public {
        vm.prank(payer);
        token.transfer(merchantDeposit, 125_000_000);

        assertEq(token.balanceOf(merchantDeposit), 125_000_000);
        assertEq(token.balanceOf(payer), 1_875_000_000);
    }

    function testSweepFromDepositAddress() public {
        vm.prank(payer);
        token.transfer(merchantDeposit, 125_000_000);

        vm.prank(merchantDeposit);
        token.transfer(treasury, 125_000_000);

        assertEq(token.balanceOf(treasury), 125_000_000);
        assertEq(token.balanceOf(merchantDeposit), 0);
    }
}

