pragma solidity >=0.4.22 <0.9.0;

import "./MyToken.sol";

contract Factory {
    MyToken public token;

    constructor() {
        token = new MyToken(1000000000 ether);
    }

    event Interacted(
        address account
    );

    function interact() public {
        emit Interacted(msg.sender);
    }
}
