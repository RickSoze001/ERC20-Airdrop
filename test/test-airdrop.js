const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');

const toWei = (num) => ethers.utils.parseEther(num.toString());
const fromWei = (num) => etheres.utils.formatEther(num);

describe("Airdrop", function () {
  const TOKENS_IN_POOL = toWei(1000000000);
  const REWARD_AMOUNT = toWei(100);
  let addrs;
  let contractBlockNumber;
  const blockNumberCutoff = 11;

  before(async function() {

    // Order of accounts to use the contract
    this.shuffle = [];
    while (this.shuffle.length < 20) {
      let r = Math.floor(Math.random() * 20);
      if (this.shuffle.indexOf(r) == -1) {
        this.shuffle.push(r);
      }
    }

    // Get all signers
    addrs = await ethers.getSigners();

    // Deploy contract
    const Factory = await ethers.getContractFactory('Factory', addrs[0]);
    this.factory = await Factory.deploy();
    const receipt = await this.factory.deployTransaction.wait();
    contractBlockNumber = receipt.blockNumber;

    // Instantiate token
    let tokenAddress = await this.factory.token();
    this.token = (await ethers.getContractFactory('MyToken', addrs[0])).attach(tokenAddress);

    expect(await this.token.balanceOf(this.factory.address)).to.equal(TOKENS_IN_POOL);

    await Promise.all(this.shuffle.map(async (i, index) => {
      const receipt = await (await this.factory.connect(addrs[i]).interact()).wait();
      expect(receipt.blockNumber).to.eq(index + 2);
    }));

    const filter = this.factory.filters.Interacted();
    const results = await this.factory.queryFilter(filter, contractBlockNumber, blockNumberCutoff);
    expect(results.length).eq(blockNumberCutoff - contractBlockNumber);

    this.leafNodes = results.map((block) => keccak256(block.args.account.toString()));

    this.merkleTree = new MerkleTree(this.leafNodes, keccak256, { sortPairs: true });

    const rootHash = this.merkleTree.getRoot();

    const AirdropFactory = await ethers.getContractFactory('Airdrop', addrs[0]);
    this.airdrop = await AirdropFactory.deploy(rootHash, REWARD_AMOUNT);

  });

  it("Only eligible accounts should be able to claim the airdrop", async function() {

    // Check airdrop works
    for (let i = 0; i < 20; i++) {
      const proof = this.merkleTree.getHexProof(keccak256(addrs[i].address));
      if (proof.length !== 0) {
        await this.airdrop.connect(addrs[i]).claim(proof);
        expect(await this.airdrop.balanceOf(addrs[i].address)).to.eq(REWARD_AMOUNT);

        await expect(this.airdrop.connect(addrs[i]).claim(proof)).to.be.revertedWith("Already claimed!");
      } else {
        await expect(this.airdrop.connect(addrs[i]).claim(proof)).to.be.revertedWith("Incorrect Merkle Proof");
        expect(await this.airdrop.balanceOf(addrs[i].address)).to.eq(0);
      }
    }

  });
});
