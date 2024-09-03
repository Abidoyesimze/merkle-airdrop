// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; 

error accessRestricted();

contract merkleAirdrop{
    IERC20 public token;
    bytes32 public merkleRoot;
    bool hasClaimed;
    address owner;

    constructor(address  _tokenAddress, bytes32 _merkleRoot){
       token = IERC20(_tokenAddress);
       merkleRoot = _merkleRoot;
       owner = msg.sender; 

    }
    struct Users{
        address  owner;
        uint amount;
    }

    modifier onlyOwner(){
        if(msg.sender != owner){
            revert accessRestricted();
        }
        _;
    }
    mapping(address => Users) public Claimed;

     event AirdropClaimed(address indexed claimant, uint256 amount); 

    function claimAirdrop(uint256 _amount, bytes32[] calldata _merkleProof) external {
        require(!hasClaimed[msg.sender], "Airdrop already claimed");

      bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _amount));

     require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Invalid Merkle proof");
    
     hasClaimed[msg.sender] = true;
      require(token.transfer(msg.sender, _amount), "Token transfer failed");

        
        emit AirdropClaimed(msg.sender, _amount);
    }
    
    
    function updateMerkleRoot(bytes32 _newMerkleRoot) external onlyOwner {
        merkleRoot = _newMerkleRoot;
    }
     function withdrawTokens(address _to) external onlyOwner {
        uint256 remainingTokens = token.balanceOf(address(this));
        require(token.transfer(_to, remainingTokens), "Token transfer failed");
    }
    

}