const { Connection, PublicKey } = require("@solana/web3.js");
const connection = new Connection("https://api.devnet.solana.com");
const PROGRAM_ID = new PublicKey("HFe9PvFPXnsKqGYK75kVcBke98fP94FWD3S1ffVrKFAi");
const CREATOR_PUBKEY = new PublicKey("5oE1qrgMaVc2QQhamxAsJHxymTg2JJ4aRWCed6c1vqM6");

const [feeConfigPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("privybag_fee_config"), CREATOR_PUBKEY.toBuffer()],
  PROGRAM_ID
);

connection.getAccountInfo(feeConfigPda).then(info => {
  if (info) {
    console.log("PDA EXISTS!");
    console.log("Data size:", info.data.length);
  } else {
    console.log("PDA does not exist.");
  }
});
