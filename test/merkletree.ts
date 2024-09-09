const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("MerkleAirdrop", function () {
  let Airdrop, airdrop, Token, token, owner, addr1, addr2, addr3;
  let merkleTree, merkleRoot;
  let airdropRecipients;

  beforeEach(async function () {
    // Get the signers
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy an ERC20 Token for testing
    Token = await ethers.getContractFactory("ERC20Mock"); // Using a mock ERC20 token for simplicity
    token = await Token.deploy("TestToken", "TTK", ethers.utils.parseUnits("10000", 18));
    await token.deployed();

    // Define the airdrop recipients and their amounts
    airdropRecipients = [
      { address: addr1.address, amount: ethers.utils.parseUnits("100", 18) },
      { address: addr2.address, amount: ethers.utils.parseUnits("200", 18) }
    ];

    // Generate the leaves for the Merkle tree
    const leafNodes = airdropRecipients.map((recipient) =>
      keccak256(ethers.utils.solidityPack(["address", "uint256"], [recipient.address, recipient.amount]))
    );

    // Build the Merkle tree
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();

    // Deploy the Airdrop contract with the Merkle root
    Airdrop = await ethers.getContractFactory("MerkleAirdrop");
    airdrop = await Airdrop.deploy(token.address, merkleRoot);
    await airdrop.deployed();

    // Fund the airdrop contract with tokens
    await token.transfer(airdrop.address, ethers.utils.parseUnits("500", 18));
  });

  it("should allow valid users to claim their airdrop", async function () {
    // Get the proof for addr1
    const claimingRecipient = airdropRecipients[0]; // addr1
    const leaf = keccak256(ethers.utils.solidityPack(["address", "uint256"], [claimingRecipient.address, claimingRecipient.amount]));
    const proof = merkleTree.getHexProof(leaf);

    // Claim the airdrop
    await expect(airdrop.connect(addr1).claimAirdrop(claimingRecipient.amount, proof))
      .to.emit(airdrop, "AirdropClaimed")
      .withArgs(addr1.address, claimingRecipient.amount);

    // Check the balance after the claim
    const addr1Balance = await token.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(claimingRecipient.amount);
  });

  it("should prevent users from claiming more than once", async function () {
    // Get the proof for addr1
    const claimingRecipient = airdropRecipients[0]; // addr1
    const leaf = keccak256(ethers.utils.solidityPack(["address", "uint256"], [claimingRecipient.address, claimingRecipient.amount]));
    const proof = merkleTree.getHexProof(leaf);

    // First claim should succeed
    await airdrop.connect(addr1).claimAirdrop(claimingRecipient.amount, proof);

    // Second claim should fail
    await expect(airdrop.connect(addr1).claimAirdrop(claimingRecipient.amount, proof)).to.be.revertedWith("Airdrop already claimed");
  });

  it("should prevent users from claiming with an invalid proof", async function () {
    const invalidRecipient = addr3; // Someone not in the airdrop list
    const invalidAmount = ethers.utils.parseUnits("300", 18); // Invalid amount
    const invalidLeaf = keccak256(ethers.utils.solidityPack(["address", "uint256"], [invalidRecipient.address, invalidAmount]));
    const invalidProof = merkleTree.getHexProof(invalidLeaf);

    // Attempt to claim with invalid proof should fail
    await expect(airdrop.connect(invalidRecipient).claimAirdrop(invalidAmount, invalidProof)).to.be.revertedWith("Invalid Merkle proof");
  });

  it("should allow the owner to withdraw remaining tokens after airdrop", async function () {
    // Check initial contract balance
    const initialContractBalance = await token.balanceOf(airdrop.address);
    expect(initialContractBalance).to.equal(ethers.utils.parseUnits("500", 18));

    // Withdraw remaining tokens as owner
    await airdrop.connect(owner).withdrawTokens(owner.address);

    // Check owner balance
    const ownerBalance = await token.balanceOf(owner.address);
    expect(ownerBalance).to.equal(initialContractBalance);

    // Check contract balance after withdrawal
    const finalContractBalance = await token.balanceOf(airdrop.address);
    expect(finalContractBalance).to.equal(0);
  });

  it("should allow the owner to update the Merkle root", async function () {
    // New Merkle root
    const newMerkleRoot = ethers.utils.formatBytes32String("newMerkleRoot");
    await airdrop.connect(owner).updateMerkleRoot(newMerkleRoot);

    // Check the updated Merkle root
    const updatedRoot = await airdrop.merkleRoot();
    expect(updatedRoot).to.equal(newMerkleRoot);
  });
});
