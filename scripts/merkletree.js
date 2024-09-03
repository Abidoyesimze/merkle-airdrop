const fs = require('fs');
const csv = require('csv-parser');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

// Function to hash data (address and amount) using keccak256
function hashData(address, amount) {
  return keccak256(address + amount); // Concatenate address and amount as a string before hashing
}

// Function to read CSV and return the rows as an array of objects
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    // Read CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Function to build the Merkle tree
async function buildMerkleTree(csvFilePath) {
  // Step 1: Read CSV data
  const data = await readCSV(csvFilePath);

  // Step 2: Hash each entry (address and amount)
  // Assuming the CSV columns are named 'address' and 'amount'
  const leaves = data.map(row => {
    const address = row['address'].trim(); // Ensure no extra whitespace
    const amount = row['amount'].trim();   // Ensure no extra whitespace
    return hashData(address, amount);
  });

  // Step 3: Create the Merkle Tree using hashed leaves
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  // Step 4: Get the Merkle root
  const rootHash = tree.getRoot().toString('hex');

  // Step 5: Output the Merkle root
  console.log('Merkle Root:', rootHash);
}

// Example usage: Define the path to your CSV file
const csvFilePath = './merkle.csv'; // Update with the correct path to your CSV file

// Build the Merkle tree and output the root
buildMerkleTree(csvFilePath);
