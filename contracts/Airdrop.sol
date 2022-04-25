pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Airdrop is ERC20("Airdrop", "ADP") {
    bytes32 public immutable root;
    uint256 public immutable reward;
    mapping(address => bool) claimed;

    constructor(bytes32 _root, uint256 _reward) {
        root = _root;
        reward = _reward;
    }

    function claim(bytes32[] calldata _proof) external {
        require(!claimed[msg.sender], "Already claimed!");
        claimed[msg.sender] = true;
        bytes32 _leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(_proof, root, _leaf),
            "Incorrect Merkle Proof"
        );
        _mint(msg.sender, reward);
    }
}
