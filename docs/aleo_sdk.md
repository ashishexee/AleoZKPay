Getting Started
Installation
NPM
Build From Source
npm install @provablehq/sdk

Configuration
Ensure Compatibility with ES Modules
In your project's package.json, ensure that the following line is added above scripts:

  "type": "module",

Top-Level Await
Top level await is a feature that allows you to use the await keyword outside of an async function. This feature is necessary for the Provable SDK to function correctly.

In webpack this is enabled with the following options within webpack.config.js:

experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true,
},

Framework Specific Configuration
The npm package create-leo-app offers several templates for building zero knowledge JavaScript apps using several popular frameworks including React, Next.js, and Node. Examining the configuration of these templates can provide additional guidance on how to configure your project.

note
If you are using Node.js as your framework, the Provable SDK requires a minimum of Node.js version 20 and recommends using version 22+ for best performance.

Network Selection
The Provable SDK contains modules for interacting with both the Mainnet and Testnet networks. The Mainnet and Testnet networks are NOT interoperable so it is required to explicitly select the desired network. Any transactions built for the Mainnet network will not be valid on the Testnet network and vice versa.

The following import syntax is used to select the desired network:

Mainnet
import { ... } from '@provablehq/sdk/mainnet.js';

Testnet
import { ... } from '@provablehq/sdk/testnet.js';

If no network is explicitly selected, the SDK defaults to the testnet network.

WebAssembly Initialization
When the SDK is imported, single-threaded WebAssembly is enabled by default. However, it is recommended to enable multithreaded WebAssembly as it is much more performant and eliminates the possibility of a computationally expensive operation blocking the main thread.

Multi-threaded WebAssembly is enabled by calling the initThreadPool() function at the beginning of the application. This starts multiple WebWorker threads and provides access to the WebAssembly instance and memory to each thread.

This function only needs to be called once and should be called before any other SDK functions.

import { initThreadPool } from '@provablehq/sdk/mainnet.js';

// Enables multithreading
await initThreadPool();

// Perform further program logic...

Edit this page
Last updated on Jan 6, 2026 by Zk
Previous
Overview
Next
Creating Accounts
Creating Aleo Accounts
Account Keys
The first step in operating a zero knowledge web application is creating a cryptographic identity for a user. In the context of Aleo, this process starts by generating a private key. From this private key, several keys that enable a user to interact with Aleo programs can be derived.

These keys include:

Private Key
The key used to represent an identity of an individual user. This key is used to authorize zero knowledge program execution.

View Key
This key is derived from the private key and can be used to identify all records and transaction data that belongs to an individual user.

Compute Key
A key that can be used to trustlessly run applications and generate transactions on a user's behalf.

Address
A public address that can be used to trustlessly identify a user in order for that user to receive official Aleo credits or unique data defined by other zero-knowledge Aleo programs.

warning
All keys are considered sensitive information and should be stored securely!

Creating an Account
All keys can be created using the Account object:

import { Account } from '@provablehq/sdk';

const account = new Account();

// Individual keys can then be accessed through the following methods
const privateKey = account.privateKey();
const viewKey = account.viewKey();
const computeKey = account.computeKey();
const address = account.address();

Alternatively, if you already having an existing account, then an Account object can be initialized with its private key:

import { Account } from '@provablehq/sdk';

const account = new Account({
    privateKey: 'APrivateKey1...',
});

The SDK also provides a feature to encrypt your private key with a plaintext password, as well as a shortcut to initialize an Account object with the private key ciphertext and the corresponding password:

import { Account, PrivateKey } from '@provablehq/sdk';

// From a newly generated encrypted private key
const password = 'password';
const ciphertext = PrivateKey.newEncrypted(password);
const account = Account.fromCiphertext(ciphertext, password);

// From the encryption of an existing private key
const privateKey = PrivateKey.from_string('APrivateKey1...');
const existingPassword = 'existingPassword';
const existingCiphertext = privateKey.toCiphertext(existingPassword);
const existingAccount = Account.fromCiphertext(existingCiphertext, existingPassword);
Deploying Programs
Developers on Aleo will often need to deploy their own program to implement the logic of their dApp. This section provides an overview of how to deploy a program to the Aleo Network and the languages that can be used to develop programs.

Developing Programs
Programs on Aleo are written in one of two languages:

Leo
Aleo Instructions
Leo is a high-level, developer-friendly language for developing zero-knowledge programs. The Leo Playground provides a web IDE that allows developers to build, test and deploy new programs for. Leo programs are compiled into Aleo Instructions under the hood.

// A simple program adding two numbers together
program helloworld.aleo {
  transition hello(public a: u32, b: u32) -> u32 {
      let c: u32 = a + b;
      return c;
  }
}

Deploying Programs
Programs are deployed by building a deployment transaction. This is done by calling the SDK deploy() or buildDeploymentTransaction() method. Calling deploy() will build and submit the transaction to the Aleo network, while buildDeploymentTransaction() will only build the transaction and return it to the caller within Javascript. Under the hood these methods execute and prove each function in the Aleo program to derive verifying keys. These keys are stored in a deployment transaction and sent to the Aleo network.

If the program name is available and the fee is sufficient, the program will be stored on the Aleo network. Once it is deployed, its functions can be executed via execution transactions by any party.

Programs can be deployed to either the Aleo Testnet or Mainnet. It is highly recommended that developers test their programs on the Testnet before deploying them to Aleo Mainnet.

note
If you haven't already, check out the Getting Started guide. Specifically, read the sections on the different versions of the SDK (Mainnet vs. Testnet) and initializing WebAssembly.

When ready to deploy a program, the Aleo Instructions source code must be imported into the JS/TS environment as a string. If the program is written in Leo it must first be compiled to Aleo Instructions. Once the source code is available with JS/TS, it can be deployed using the ProgramManager.

Let's walk through an example:

Imports and WebAssembly
You'll first need to import the necessary classes from the correct Provable SDK package and initialize Webassembly if you haven't done so already.

import { Account, AleoNetworkClient, initThreadPool, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';

// If the threadpool has not been initialized, do so (this step can be skipped if it's been initialized elsewhere). 
await initThreadPool();


You'll also need to initialize an Account object with the desired private key:

const account = new Account({ privateKey: 'APrivateKey1...'});

AleoNetworkClient
Next, you'll need to initialize `AleoNetworkClient:

// Create a network client to connect to the Aleo network.
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

AleoNetworkClient is a library that encapsulates REST calls to publicly exposed endpoints of Aleo nodes. The methods provided in this allow users to query public information from the Aleo blockchain and submit transactions to the network. `

AleoKeyProvider
You'll also need to initialize AleoKeyProvider:

// Create a key provider that will be used to find public proving & verifying keys for Aleo programs.
const keyProvider = new AleoKeyProvider();
keyProvider.useCache(true);


Since each function in a program has a proof associated with it, each function in a program has something called a proving key and verifying key. These keys are cryptographic material that uniquely identifies the structure of the function and are required to build the proof and verify the proof respectively. The SDK provides an interface called the KeyProvider to enable developers to define easy ways to retrieve these keys. If an execution in the SDK does not have the keys, it will generate them. However, generating them is a computationally expensive process, and significantly slows down the execution process if they need. It is wise for developers to store/cache them for re-use when possible.

The default implementation of the KeyProvider interface is the AleoKeyProvider. This implementation allows users to specify an optional HTTP url where the keys may be found and an in-memory cache for proving and verifying keys. However, developers can implement their own KeyProvider to store keys in places such as CDNs, databases, local file systems, etc.

ProgramManager
Using the AleoNetworkClient and AleoKeyProvider objects, we can initialize the ProgramManager object and set the account that transactions will be signed by:

// Initialize a program manager to talk to the Aleo network with the configured key and record providers.
const programManager = new ProgramManager(networkClient, keyProvider);

// Set the account for the program manager.
programManager.setAccount(account);


Load the Program
As mentioned, you'll need to load the Aleo Instructions program into JS/TS as a string:

// Define an Aleo program to deploy
const program = "program hello_hello.aleo;\n\nfunction hello:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    add r0 r1 into r2;\n    output r2 as u32.private;\n";


You'll also need to set a fee to pay to deploy the program:

// Define a fee to pay to deploy the program
const fee = 3.8; // 3.8 Aleo credits

Build the Transaction
Finally, we can build and submit the transaction, and await the results:

// Build a deployment transaction for the program.
const tx = await programManager.buildDeploymentTransaction(program, fee, false);

// Send the transaction to the network.
const transaction_id = await programManager.networkClient.submitTransaction(tx);

// Verify the transaction was successful
const transaction = await programManager.networkClient.getTransaction(transaction_id);

Alternatively, you can use the deploy() method to build and broadcast the transaction in one call:

// Build a deployment transaction for the program.
const transaction_id = await programManager.deploy(program, fee, false);

// Verify the transaction was successful
const transaction = await programManager.networkClient.getTransaction(transaction_id);

Once a program has been deployed, developers can check to see its deployment status and monitor its activity using the Provable Explorer.

Deployment Fees
A fee must be paid to the Aleo network for deployment. This fee can be paid publicly using a public balance or privately using an credits.aleo Record. The fee for deploying any program can be calculated with the static estimateDeploymentFee() method of the ProgramManager class.

const program = "program hello_hello.aleo;\n\nfunction hello:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    add r0 r1 into r2;\n    output r2 as u32.private;\n";

const fee = await ProgramManager.estimateDeploymentFee(program);


Deployment fees are calculated based on the following formulas. The cost of deploying a program is proportional to the amount of opcodes used in a program and the complexity of the operations it performs. More computationally expensive opcode usage such as hash functions will cost more than simple opcodes such as arithmetic or boolean opcodes.

Cost Component	Cost (Microcredits)
Synthesis Cost	25*#Constraints
Storage Cost	1000*#Bytes
Namespace Cost	10^(10 - num_characters)
Total Cost	Synthesis + Storage + Namespace
Edit this page
Last updated on Oct 29, 2025 by Zk
Previous
Creating Accounts
Next
Executing Programs
Developing Programs
Deploying Programs
Imports and WebAssembly
AleoNetworkClient
AleoKeyProvider
ProgramManager
Load the Program
Build the Transaction
Executing Programs
Program Execution Model
The SDK provides the ability to execute Aleo Instructions programs entirely client-side within the browser.

The ProgramManager object encapsulates the functionality for executing programs and making zero knowledge proofs about them. Under the hood it uses cryptographic code compiled from snarkVM into WebAssembly. JavaScript bindings to this WebAssembly code allows execution of programs in zero knowledge fully within the browser without requiring any external communication with the internet. Users interested in lower level details on how this is achieved can visit the aleo-wasm crate.

The basic execution flow of a program is as follows:

A web app is loaded with an instance of the ProgramManager object
An Aleo program in Aleo Instructions format is loaded into the ProgramManager as a wasm object
The web app provides a user input form for the program
The user submits the inputs and the zero knowledge execution is performed client-side within WebAssembly
The result is returned to the user
(Optional) A fully encrypted zero knowledge transcript of the execution is optionally sent to the Aleo network
A diagrammatic representation of the program execution flow is shown below.

Browser Web-App

ProgramManager

Aleo-Wasm-Module

load program

ZK result

user input

ZK result (Optional)

Leo Program

Aleo Instructions

in-memory-program

user

Aleo-Network

Executing Programs
There are two main methods for building general execution transactions: execute() and buildExecutionTransaction(). Calling execute() will build and submit the transaction to the Aleo network, while buildExecutionTransaction() will only build the transaction and return it to the caller within Javascript.

Let's walk through an example:

Setup
Similar to the Deploying Programs guide, you'll need to initialize some fundamental objects if you haven't already done so:

import { Account, AleoNetworkClient, initThreadPool, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';

// If the threadpool has not been initialized, do so (this step can be skipped if it's been initialized elsewhere). 
await initThreadPool();

const account = new Account({ privateKey: 'APrivateKey1...'});
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

const keyProvider = new AleoKeyProvider();
keyProvider.useCache(true);

const programManager = new ProgramManager(networkClient, keyProvider);
programManager.setAccount(account);


If you're confused on any of the above code, head back to the previous guide for a more detailed explanation.

Build the Transaction
In addition to the above setup, you'll likely want define a key search parameter to find the correct proving and verifying keys for the program if they are stored in a memory cache:

const keySearchParams = { cacheKey: "betastaking.aleo:stake_public" };

Once everything's been intialized, we can build and submit the transaction, and await the results:

// Execute the program using the options provided inline and get the transaction.
const tx = await programManager.buildExecutionTransaction({
    programName: "betastaking.aleo",
    functionName: "stake_public",
    fee: 0.10,
    privateFee: false, // Assuming a value for privateFee
    inputs: ["aleo17x23al8k9scqe0qqdppzcehlu8vm0ap0j5mukskdq56lsa25lv8qz5cz3g", "50000000u64"], // Example inputs matching the function definition
    keySearchParams: keySearchParams,
});

// Submit the program to the network.
const transaction_id = await programManager.networkClient.submitTransaction(tx);

// Generally the transaction will need 1-3 blocks (3-9 seconds) to be confirmed on the network. When that time has 
// elapsed the following function can be used to get the transaction details.
const transaction = await programManager.networkClient.getTransaction(transaction_id);


Alternatively, we can just call the execute() method to build and broadcast the transaction in one call:

const transaction_id = await programManager.execute(
    programName: "betastaking.aleo",
    functionName: "stake_public",
    fee: 0.10,
    privateFee: false, // Assuming a value for privateFee
    inputs: ["aleo17x23al8k9scqe0qqdppzcehlu8vm0ap0j5mukskdq56lsa25lv8qz5cz3g", "50000000u64"], // Example inputs matching the function definition
    keySearchParams: keySearchParams,
);

const transaction = await programManager.networkClient.getTransaction(transaction_id);


Local Program Execution
It is also possible to simply execute a program locally without sending a transaction to the Aleo network. This can be useful if a developer wants to use the SDK to use Aleo's zkSNARKs outside of the blockchain network or run a test execution of a program while developing. For this purpose the ProgramManager class has a method called run() that can be used to execute a program locally.

Running Locally WITHOUT A Proof
When the developer simply wants see the output of a function without the computationally expensive operation of generating a proof, the run() method of ProgramManager can be used. It simply needs the program, the function name, and the inputs to the function.

When run in this fashion, the program will execute and return the outputs of the function without generating a proof. This can be useful for testing a function in development.

import { Account, ProgramManager } from '@provablehq/sdk';

/// Create the source for the "hello world" program
const program = "program helloworld.aleo;\n\nfunction hello:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    add r0 r1 into r2;\n    output r2 as u32.private;\n";
const programManager = new ProgramManager();

/// Create a temporary account for the execution of the program
const account = new Account();
programManager.setAccount(account);

/// Get the response and ensure that the program executed correctly
const executionResponse = await programManager.run(program, "hello", ["5u32", "5u32"]);
const result = executionResponse.getOutputs();
assert.deepStrictEqual(result, ['10u32']);


Running Locally WITH A Proof
If the developer wants to generate a proof for a program execution without sending it to the Aleo network, the run() method can be used with the proveExecution parameter set to true. This will generate an ExecutionResponse object that includes the proof of the execution which can be verified offchain by the verifyExecution() method by anyone who has the function's proving and verifying keys.

note
This approach is will not work for any function that has an async future defined within it.

import { Account, AleoKeyProvider, ProgramManager, ProvingKey, VerifyingKey } from '@provablehq/sdk';

/// Initialize the key provider and network client.
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
const keyProvider = new AleoKeyProvider();
keyProvider.useCache(true);

/// Define the program.
const program = "program helloworld.aleo;\n\nfunction hello:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    add r0 r1 into r2;\n    output r2 as u32.private;\n";

/// Create the proving and verifying keys for the program and store them in the key provider.
const provingKey = ProvingKey.fromString("...");
const verifyingKey = VerifyingKey.fromString("...");
keyProvider.cacheKeys("helloworld.aleo:main", [provingKey, verifyingKey]);

/// Create a program manager with the key provider.
const programManager = new ProgramManager(networkProvider, KeyProvider);

/// Create a temporary account for the execution of the program
const account = new Account();
programManager.setAccount(account);

/// Get the response and ensure that the program executed correctly
const executionResponse = await programManager.run(
  program: program, 
  function_name: "hello", 
  inputs: ["5u32", "5u32"], 
  proveExecution :true, 
  keySearchParams: {"cacheKey":"helloworld.aleo:main"},
  
);

/// Verify the proof of the execution
const proofIsValid = await programManager.verifyExecution(executionResponse);


Transferring Credits
The official currency of Aleo Network are called Aleo Credits. All fees paid for transactions, as well as rewards for staking and mining, are in the form of Aleo Credits. Please refer to the Fundamentals for more information.

Unlike other popular Blockchains like Ethereum, there is no special transfer transaction type. Instead, a native program called credits.aleo governs transfers, usage, and ownership of Aleo Credits. All value transfers on the Aleo Network are done by calling functions in the credits.aleo program via Execute transactions. As such, you can transfer credits using the same methods described in the Executing Programs guide

However, as credit transfers are some of the most common and fundamental functions on the network, the Provable SDK provides specialized functions for credit transfers via the ProgramManager class. There are two main methods for building credit transfer transactions: transfer() and buildTransferTransaction(). Calling transfer will build and submit the transaction to the Aleo network, while buildTransferTransaction() will only build the transaction and return it to the caller within Javascript.

Let's walk through an example:

note
The base unit for Aleo Credits is the microcredit. All functions expect and will return values in microcredits by default. 1 credit is equal to 1,000,000 microcredits.

Transfer Aleo Credits
Setup
Similar to the Deploying Programs guide, we'll need to initialize some fundamental objects if you haven't already done so:

import { Account, AleoNetworkClient, initThreadPool, NetworkRecordProvider, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';

// If the threadpool has not been initialized, do so (this step can be skipped if it's been initialized elsewhere). 
await initThreadPool();

const account = new Account({ privateKey: 'APrivateKey1...'});
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

const keyProvider = new AleoKeyProvider();
keyProvider.useCache(true);

const recordProvider = new NetworkRecordProvider(account, networkClient);

const programManager = new ProgramManager(networkClient, keyProvider, recordProvider);
programManager.setAccount(account);


NetworkRecordProvider
An observant eye will notice that we've added a new import and initialization above in the form of NetworkRecordProvider. This new code helps manage any records needed by the ProgramManager. As a reminder, records are the individual units of private state on the Aleo network. Records are generated by a program's functions and can be changed and updated by when a user runs various functions of the program. Check out the Records section in Fundamentals for more information.

When programs execute, they will often need to find records that belong to a user. The SDK provides an interface called the RecordProvider to enable developers to implement their own record storage and retrieval mechanism. The default implementation of the RecordProvider interface is the NetworkRecordProvider class which searches the Aleo network for records uniquely belonging to a user. The ProgramManager class is capable of taking in a RecordProvider implementaiton as an parameter. For more information on the RecordProvider interface and generally how to find records using the SDK, check out the Managing State guide.

Build the Transaction
Once everything's been intialized, we can build and submit the transaction, and await the results:

// Send a completely private transfer
const tx = await programManager.buildTransferTransaction(
    amount : 1, 
    recipient: RECIPIENT_ADDRESS, 
    transferType: "transfer_private", 
    fee: 0.2
);
// Submit the transaction to the network.
const tx_id = await programManager.networkClient.submitTransaction(tx);

/// Send public transfer to another user
const tx_2 = await programManager.buildTransferTransaction(1, RECIPIENT_ADDRESS, "transfer_public", 0.2);
const tx_id_3 = await programManager.networkClient.submitTransaction(tx_2);

// Send a public transfer to another user using a private record as input
const tx_3 = await programManager.buildTransferTransaction(1, RECIPIENT_ADDRESS, "transfer_private_to_public", 0.2);
const tx_id_3 = await programManager.networkClient.submitTransaction(tx_3);

/// Create a private record from a public balance
const tx_4 = await programManager.buildTransferTransaction(1, RECIPIENT_ADDRESS, "transfer_public_to_private", 0.2);
const tx_id_4 = await programManager.networkClient.submitTransaction(tx_4);

/// Send a public transfer from the transaction signer's address / original transaction initiator.
const tx_5 = await programManager.buildTransferTransaction(1, RECIPIENT_ADDRESS, "transfer_public_as_signer", 0.2);
const tx_id_5 = await programManager.networkClient.submitTransaction(tx_5);


// Generally the transaction will need 1-3 blocks (3-9 seconds) to be confirmed on the network. When that time has 
// elapsed the following function can be used to get the transaction details.
const transaction1 = await programManager.networkClient.getTransaction(tx_id);
const transaction2 = await programManager.networkClient.getTransaction(tx_id_2);
const transaction3 = await programManager.networkClient.getTransaction(tx_id_3);
const transaction4 = await programManager.networkClient.getTransaction(tx_id_4);
const transaction5 = await programManager.networkClient.getTransaction(tx_id_5);


Alternatively, we can just call the transfer() method to build and broadcast the transaction in one call:

const RECIPIENT_ADDRESS = "aleo1...";

const tx_id = await programManager.transfer(
    amount : 1, 
    recipient: RECIPIENT_ADDRESS, 
    transferType: "transfer_private", 
    fee: 0.2
);
const tx_id_2 = await programManager.transfer(1, RECIPIENT_ADDRESS, "transfer_public", 0.2);
const tx_id_3 = await programManager.transfer(1, RECIPIENT_ADDRESS, "transfer_private_to_public", 0.2);
const tx_id_4 = await programManager.transfer(1, RECIPIENT_ADDRESS, "transfer_public_to_private", 0.2);
const tx_id_5 = await programManager.transfer(1, RECIPIENT_ADDRESS, "transfer_public_as_signer", 0.2);

const transaction1 = await programManager.networkClient.getTransaction(tx_id);
const transaction2 = await programManager.networkClient.getTransaction(tx_id_2);
const transaction3 = await programManager.networkClient.getTransaction(tx_id_3);
const transaction4 = await programManager.networkClient.getTransaction(tx_id_4);
const transaction5 = await programManager.networkClient.getTransaction(tx_id_5);


Checking Balances
Public Balances
A public balance of any address can be checked with getMappingValue() function of the NetworkClient.

const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
const USER_ADDRESS = "aleo1...";
const public_balance = networkClient.getMappingValue("credits.aleo", USER_ADDRESS);

Private Balances
The private balance of an address is the sum of all unspent credits records owned by the address. Check out the next guide for more information regarding record finding.

Managing Public and Private State
Public State: Mappings
Mappings are simple key-value stores defined in a program. They are represented by a key and a value each of a specified type. They are stored directly within the Aleo blockchain and can be publicly read by any participant in the Aleo network.

An example of a mapping usage is account mapping in the credits.aleo program. This mapping stores all public Aleo Credits balances onchain.

mapping account:
    key owner as address.public;
    value microcredits as u64.public;

Initializing & Updating Mappings
Updating mappings is done by executing a program function on the Aleo network which has a finalize block that updates the program's mapping. For instance the transfer_public function in the credits.aleo program updates the account mapping (and thus a user's balance) when called.

// The public interface called by users
function transfer_public:
    input r0 as address.public;
    input r1 as u64.public;
    finalize self.signer r0 r1;

// The finalize block run by nodes on the Aleo network which update a user's public balance
finalize transfer_public:
    input r0 as address.public;
    input r1 as address.public;
    input r2 as u64.public;
    get.or_use account[r0] 0u64 into r3;
    sub r3 r2 into r4;
    set r4 into account[r0];
    get.or_use account[r1] 0u64 into r5;
    add r5 r2 into r6;
    set r6 into account[r1];


From the perspective of the caller of the API, this is as simple as executing a normal Aleo function. For more information on how to do this with the SDK, check out the Executing Programs guide or the Transferring Credits guide.

Given the inputs to a function with a finalize scope that updates a mapping are valid, the mapping will either be intialized or updated by the Aleo network. If function inputs are invalid, the network will return an error, but the fee paid for the transaction will still be consumed. So it is important to ensure that the inputs to a function are valid before executing it.

Reading Mappings
Any state within a program mapping is public and can be read by any participant in the Aleo network. The AleoNetworkClient class provides the getProgramMappingNames() method to read the public mappings within a program and the getProgramMappingValue() method to read the value of a specific key within a mapping.

import { AleoNetworkClient } from '@provable/sdk';

const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
const creditsMappings = networkClient.getProgramMappingNames("credits.aleo");
assert(creditsMappings === ["committee", "delegated", "metadata", "bonded", "unbonding", "account", "withdraw"]);

//<ADDRESS> = A valid Aleo account with zero balance
const publicCredits = networkClient.getProgramMappingValue("credits.aleo", "<ADDRESS>");
assert(publicCredits === "0u64");


Private State: Records
Records in are analogous to concept of UTXOs. When a record is created by a program, it can then be consumed later by the same program as an input to a function. Once a record is used as input, it is considered consumed and cannot be used again. In many cases a new record will be created from the output of the function. Records are private by default and are associated with a single Aleo program and a single private key representing a user. Check out the Records section in Fundamentals for more information.

Finding Records
Finding records is similar to finding UTXOs in Bitcoin. Records are stored as outputs of transitions contained within execution transactions. To find records, implementors of web apps must:

Scan the Aleo network for transactions that include transitions that contain records.
Check any found records to see if the desired user is the owner of the record.
Check to see if the record is "spent" or "unspent" by checking if the record has appeared in any function inputs.
Optionally decrypt the record if the data within it is desired.
The AleoNetworkClient provides the findRecords() method for finding records. This method allows records to be searched for between specified block heights.

It also optionally allows users to specify:

Whether to search exclusively for unspent records.
One or more programs to find records for.
A list of nonces (i.e. the unique ID of a record) to exclude from the search.
If credits.aleo records are being searched for, users can also optionally specify:

A list of amounts to find.
A maximum cumulative amount to find between all records.
import { Account, AleoNetworkClient } from '@provablehq/sdk';

const account = new Account({ privateKey: 'APrivateKey1...'});
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
networkClient.setAccount(account);

// Find all records from an account within a block range.
const allRecords = networkClient.findRecords(
    4370000, // Start block height
    4371000, // End block height
    false, // Find both spent and unspent records.
    ["credits.aleo", "token_registry.aleo"], // Find records for the credits.aleo and token_registry.aleo programs.
);

// Find only unspent records from an account within a block range that can be used as inputs to new functions.
const unspentRecords = networkClient.findRecords(
    4370000, // Start block height
    4371000, // End block height
    true, // Find both spent and unspent records.
    ["credits.aleo", "token_registry.aleo"], // Find records for the credits.aleo and token_registry.aleo programs.
)



This method provides a linear search through the block range specified. It is most useful for finding records in smaller block ranges where the app invoking the method can expect to find desired records. For larger ranges of blocks this method may be infeasible to use.

Optimizing Record Search
Using naive approaches such as scanning the entire Blockchain history can be a time-consuming process and degrade the experience of a web app. Fortunately, strategies can be used to optimize the process.

Searching for Records After the User Account Creation
If the user a web app has created an Aleo account after a known block, the search can be optimized to search for records by only scanning the records from the block height after which the account was created.

Searching for A Specific Program's Records
If the records you are searching for are from a specific program, you can optimize the search by only scanning the records for a specific program.

Storing Records Created by Your Web App
If your web app has created a transaction, you have access to the records produced by that transaction and can store them in a database for easy retrieval later.

Decrypting Records
If a user receives a private record from a program execution, they can use the SDK to decrypt encrypted records with their view keys and view their contents. Only records that are owned by the user can be decrypted. Decryption of records that are not owned by the user will fail.

Record decryption and ownership verification can be done in the SDK using the following code:

import { Account, RecordCiphertext, RecordPlaintext } from '@provablehq/sdk';

// Create an account from an existing private key
const account = Account.from_string({privateKey: "existingPrivateKey"});

// Record value received as a string from program output or found on the Aleo network
const record = "record1qyqsq4r7mcd3ystjvjqda0v2a6dxnyzg9mk2daqjh0wwh359h396k7c9qyxx66trwfhkxun9v35hguerqqpqzqzshsw8dphxlzn5frh8pknsm5zlvhhee79xnhfesu68nkw75dt2qgrye03xqm4zf5xg5n6nscmmzh7ztgptlrzxq95syrzeaqaqu3vpzqf03s6";

const recordCiphertext = RecordCiphertext.fromString(record);

// Check ownership of the record. If the account is the owner, decrypt the record
if (RecordCiphertext.is_owner(account.viewKey())) {
   // Decrypt the record with the account's view key
   const recordPlaintext = recordCiphertext.decrypt(account.viewKey());

   // View the record data
   console.log(recordPlaintext.toString());
}


Using Records
Using the SDK, users can specify the exact record they would like to use as input to an function or to pay private fees with by using the RecordPlaintext type mentioned above. Let's look at the transfer_private function from the credits.aleo function as a specific example of using records.

The transfer_private function can be graphically represented by the following graph:

Credits Record 2

Credits Record 3

Sender Address

Input 1: Credits Record 1

Credits.aleo:transfer_private

Input 2: Recipient Address

Recipient Address

This function consumes a private credits record as input and outputs two new private credits records as output (one that sends the credits to the recipient and one that sends the remaining credits to the sender). Below you'll find what this flow would look like in the SDK:

User 1 Sends a Private Value Transfer to User 2
If you've read the Transferring Credits guide, the following should look familiar to you:

// USER 1
import { Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient } from '@provablehq/sdk';

// Create a new NetworkClient, KeyProvider, RecordProvider, and ProgramManager
const USER1 = new Account({privateKey: "APrivateKey1..."});
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
const keyProvider = new AleoKeyProvider();
const recordProvider = new NetworkRecordProvider(USER1, networkClient);
const programManager = new ProgramManager("https://api.explorer.provable.com/v1", keyProvider, recordProvider);
programManager.setAccount(USER1);

/// Send private transfer to user 2.  When the input record is not specified, the NetworkRecordProvider will automatically find a credits.aleo record with enough enough balance
const USER2_ADDRESS = "aleo1...";
const tx_id = await programManager.transfer(1, USER2_ADDRESS, "transfer_private", 0.2);


User 2 Sends a Private Value Transfer Back to User 1
When an execution such as transfer_private consumes or generates a record, the transaction is posted onchain showing an encrypted version of the record output. Because the records are encrypted when they're posted on the network, they do not reveal any information about the party who executed the program, nor the contents of the record. The only information that is revealed is the program ID, function name, encrypted function inputs, and the transaction ID of the program execution. No user except for the recipient of the record can see the contents of the record.

Consequently, if users would like to fetch their records from the network and use them as input to a function, they must first decrypt them into plaintext form using their private key or view key. The code below demonstrates this:

// USER 2
import { Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient, RecordCiphertext } from '@provablehq/sdk';

// Create a new NetworkClient, KeyProvider, RecordProvider, and ProgramManager for User 2
const USER2 = new Account({privateKey: "APrivateKey1..."});
const networkClient2 = new AleoNetworkClient("https://api.explorer.provable.com/v1");
const keyProvider2 = new AleoKeyProvider();
const recordProvider2 = new NetworkRecordProvider(USER2, networkClient2);
const programManager2 = new ProgramManager("https://api.explorer.provable.com/v1", keyProvider2, recordProvider2);
programManager2.setAccount(USER2);

// Fetch the transaction from the network that User 1 sent
const transaction = await programManager2.networkClient.getTransaction(tx_id);
const record = transaction.execution.transitions[0].outputs[0].value;

// Decrypt the record with User 2's view key
const recordCiphertext = RecordCiphertext.fromString(record);
const recordPlaintext = recordCiphertext.decrypt(USER2.viewKey());

// Send a transfer to User 1 above using the record found
const USER1_ADDRESS = "aleo1...";
const tx_id2 = await programManager2.transfer(1, USER1_ADDRESS, "transfer_private", 0.2, undefined, recordPlaintext);


Querying the Aleo Network
Communication with the Aleo network is done through the AleoNetworkClient class. This class provides methods to query data from Aleo network nodes and submit transactions to the Aleo network.

Blocks
Blocks are formed by Aleo validators and represent the canonical unit of state change. They contain all transactions, solutions to the Aleo puzzle, metadata about the block (such as height, current coinbase target, etc.) and cryptographic information such as the block's merkle roots and validator signatures. The AleoNetworkClient can querying the block and return it in JSON format. The returned JSON mirrors the block's Typescript interface.

The following Typescript snippet shows how to extract most of the important information from a block:

import { AleoNetworkClient } from "@provablehq/sdk"
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

const block = await networkClient.getBlock(1);

// Get the block's metadata
const blockHeight = block.header.metadata.height;
const blockHash = block.block_hash;
const blockTimestamp = block.header.metadata.timestamp;
const coinbaseTarget = block.header.metadata.coinbase_target;
const proofTarget = block.header.metadata.proof_target;

// Get the block's transactions
const transactions = block.transactions;

// Iterate through the transactions in the block.
for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    // Get the transaction's ID.
    const transactionID = transaction.id;
    
    // Get the transaction's type.
    const transactionType = transaction.type;
    if (transactionType === "execute") {
        // Get the execution.
        const execution = transaction.transaction.execution;
        // Get the transitions in the execution.
        const transitions = execution.transitions;
        for (let j = 0; j < transitions.length; j++) {
            const transition = transitions[j];
            // Get the inputs of an individual transition.
            const transitionInputs = transition.inputs;
            // Get the outputs of an individual transition.
            const transitionOutputs = transition.outputs;
        }
    } else if (transactionType === "deploy") {
        // Get the transaction's deployment data.
        const deploymentData = transaction.transaction.deployment;
        // Get the program's name.
        const programName = deploymentData.program;
        // Get the program's verifying keys.
        const verifyingKeys = deploymentData.verifying_keys;
    }
    
    // Get the block and puzzle reward (this information is important to calculating staking and mining rewards).
    const ratificationsJSON = block.ratifications;
    const blockReward = ratificationsJSON[0].amount;
    const puzzleReward = ratificationsJSON[1].amount;
    
    // Get the block's puzzle solutions.
    const solutions = block.solutions
}


Transactions and Transitions
While blocks contain most relevant information, they are large and may represent more data than is necessary for your application. An application may only be interested in specific transactions, and the AleoNetworkClient provides methods to query transactions by their unique ID.

Transactions contain either deployments of new programs or executions of existing programs that change chain state. Each execution transaction contain one or more transitions that list all inputs and outputs of the executed functions including any records produced or futures created by functions with finalize statements.

After a program function relevant to an app has been executed, it is often useful to query transaction objects to visualize, store, or use the state changes produced in the transaction within the app. Each transaction has a unique ID with the bech32 prefix at. When a transaction is executed and submitted by the deploy or execute methods of the ProgramManager or submitted manually via the submitTransaction() method of the AleoNetworkClient, the transaction ID is returned as a string. This transaction ID can then be used to query the transaction data from the Aleo network.

import { AleoNetworkClient, Transition } from '@provablehq/sdk';
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

// Get a transaction by id and get its inputs and outputs from the JSON representation.
let jsonRecords = [];
const transactionJSON = await networkClient.getTransaction('at1...');
const transitions = transactionJSON["execution"]["transitions"];
for (let i = 0; i < transitions.length; i++) {
    const transition = transitions[i];
    // Get the records of an individual transition.
    const transitionRecords = transition["records"];
    // Get the inputs of an individual transition.
    const transitionInputs = transition["inputs"];
    // Get the outputs of an individual transition.
    const transitionOutputs = transition["outputs"];
    // Record all records in the transaction.
    jsonRecords.push(transitionRecords);
}


The AleoNetworkClient also provides a method for transaction information back in the format of a WASM object. The WASM representation will provide the raw snarkVM object, which has several convenience methods for extracting the objects such as inputs, outputs, and records without the need for traditional JSON parsing. The choice of representation is up to the developer's personal preference in ergonomics.

import { AleoNetworkClient, Transition } from '@provablehq/sdk';
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

// Get a transaction by id and get its inputs and outputs from the Wasm representation.
const transactionWasm = await networkClient.getTransactionObject(`at1...`);
const transitionsWasm = transactionWasm.transitions();
for (let i = 0; i < transitionsWasm.length; i++) {
    const transition = transitionsWasm[i];
    // Get the records of an individual transition.
    const transitionRecords = transition.records();
    // Get the inputs of an individual transition.
    const transitionInputs = transition.inputs();
    // Get the outputs of an individual transition.
    const transitionOutputs = transition.outputs();
}

// Get all records present in a transaction.
const transactionRecords = transactionWasm.records();


Programs
It is often key to use data both about a program's structure and it's internal data within apps. The AleoNetworkClient provides several methods to query and inspect programs on the Aleo Network.

Querying Public Program State
The public state of a program exists within its mappings. These mappings often contain information such as public balances, validator stake, token information and more. This information will often change from block to block, and at any given block it can be queried using the AleoNetworkClient.

Querying Mappings
The list of mappings within a program can be queried using the getProgramMappingNames method of the AleoNetworkClient:

import { AleoNetworkClient } from '@provablehq/sdk';
import { deepStrictEqual } from 'assert';
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

// Get the list of program mappings in credits.aleo.
const expectedMappings = [
    "committee",
    "delegated",
    "metadata",
    "bonded",
    "unbonding",
    "account",
    "withdraw",
    "pool"
];

const creditsMappings = await networkClient.getProgramMappingNames("credits.aleo");
deepStrictEqual(creditsMappings, expectedMappings);

To get the value from a mapping, one must know the type of the mapping's keys. When this is known, the getMappingValue() method can be used:

import { AleoNetworkClient } from '@provablehq/sdk';
import { strictEqual } from 'assert';
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");


// Get the balance of an account in the `account` mapping in credits.aleo.
const account = await networkClient.getProgramMappingValue("credits.aleo", "account", "aleo1q3vx8pet0h7739hx5xlekfxh9kus6qdlxhx9qdkxhh9rnva8q5gsskve3t");
const expectedBalance = null;
strictEqual(account, expectedBalance);


Often the returned value from a mapping will be a struct or array. When returned as a string, this can be difficult to parse. The AleoNetworkClient provides a method to return the value as a WASM object called a Plaintext, which has several convenience methods for inspecting the returned value. The toObject() method can be used to convert the WASM object to a JavaScript object:

import { AleoNetworkClient } from '@provablehq/sdk';
import {deepStrictEqual} from 'assert';
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

// Get a token value of the `registered_tokens` mapping in token_registry.aleo.
const tokenStruct = await networkClient.getProgramMappingPlaintext("token_registry.aleo", "registered_tokens", "1381601714105276218895759962490543360839827276760458984912661726715051428034field");
const tokenObject = tokenStruct.toObject();
const expectedTokenObject = {
  token_id: "1381601714105276218895759962490543360839827276760458984912661726715051428034field",
  name: BigInt(1447384136),
  symbol: BigInt(1984255048),
  decimals: 18,
  supply: BigInt(1000000000000000000000000n),
  max_supply: BigInt(340282366920938463463374607431768211455n),
  admin: "aleo1uldp2afc9gnfsxd0r2svaecax8quutny5j6ns2qa80yp5uhsac9q35h7h6",
  external_authorization_required: false,
  external_authorization_party: "aleo1uldp2afc9gnfsxd0r2svaecax8quutny5j6ns2qa80yp5uhsac9q35h7h6"
};

deepStrictEqual(tokenObject,expectedTokenObject);


Querying Program Structure
Apps often need to know information about a program's structure such as its source code, the functions it contains, function inputs and their types, and the mappings, records, and other programs it imports. The guide below shows how to query this information.

Querying Program Source Code
To get the source code of a program, the AleoNetworkClient provides a method to query the program by its unique ID.

import { AleoNetworkClient } from '@provablehq/sdk';
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

// Get the source code of credits.aleo.
const credits = await networkClient.getProgram("credits.aleo");
// Get the source code of token_registry.aleo.
const token_registry = await networkClient.getProgram("token_registry.aleo");

Querying Programs as Objects
The snarkVM representation of a program can be queried from the Aleo network by its unique ID. The returned object representation has several convenience methods for extracting a list of program's functions, inputs and input types , mappings, records, and address. This is useful because this data is difficult to parse from the source code directly.

import { AleoNetworkClient } from '@provablehq/sdk';
import {deepStrictEqual} from 'assert';
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

// Get credits.aleo as a program object.
const credits_program = await networkClient.getProgramObject("credits.aleo");

// Get all functions in the program.
const functions = credits_program.getFunctions();

// Get all inputs for the `transfer_private` function.
const transfer_function_inputs = credits_program.getFunctionInputs("transfer_private");

// Inputs will be an array of objects with the following structure, this an be used to build web forms or other UI 
// elements.
const expected_inputs = [
    {
      type:"record",
      record:"credits",
      members:[
        {
          name:"microcredits",
          type:"u64",
          visibility:"private"
        },
        { 
            name: '_nonce', 
            type: 'group', 
            visibility: 'public' 
        }
      ],
      register:"r0"
    },
    {
      type:"address",
      visibility:"private",
      register:"r1"
    },
    {
      type:"u64",
      visibility:"private",
      register:"r2"
    }
];
deepStrictEqual(transfer_function_inputs, expected_inputs);

// Get all mappings in the program.
const mappings = credits_program.getMappings();

// Get all programs the program imports.
const records = credits_program.getImports()


Querying Program Imports and Mappings
The following example shows how to query the mappings within a program and the other programs it imports:

import { AleoNetworkClient, Program } from '@provablehq/sdk';
import {deepStrictEqual} from 'assert';
const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

// Get the program's import names.
const programImportsNames = await networkClient.getProgramImportNames("token_registry.aleo");
const expectedImportsNames = ["credits.aleo"];
deepStrictEqual(programImportsNames, expectedImportsNames);

// Get the source code of all imported programs.
const programImports = await networkClient.getProgramImports("token_registry.aleo");

// Get the list of all program mappings.
const programMappings = await networkClient.getProgramMappingNames("token_registry.aleo");
const expectedMappings = [
    "registered_tokens",
    "balances",
    "authorized_balances",
    "allowances",
    "roles"
];
deepStrictEqual(programMappings, expectedMappings);


A full list of methods provided by the AleoNetworkClient class and usage examples can be found in the Network Client API documentation.

