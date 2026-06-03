// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

contract DeployLocalScript is Script {
    function run() external {
        vm.startBroadcast();

        MockUSDT token = new MockUSDT();

        vm.stopBroadcast();

        console2.log("MockUSDT", address(token));
    }
}
