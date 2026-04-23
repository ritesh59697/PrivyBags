import { Connection, PublicKey } from "@solana/web3.js";

const creator = new PublicKey("GnUhwNKVkCHqHURRQ5i1QiTiRXgbRnJDnuhmo1GEuWCE");
const programId = new PublicKey("HFe9PvFPXnsKqGYK75kVcBke98fP94FWD3S1ffVrKFAi");

const [vault] = PublicKey.findProgramAddressSync([Buffer.from("privybag_vault"), creator.toBuffer()], programId);

console.log("Vault Address:", vault.toBase58());

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
conn.getAccountInfo(vault).then(info => {
  if (info) {
    console.log("Owner:", info.owner.toBase58());
    console.log("Lamports:", info.lamports);
  } else {
    console.log("Account not found");
  }
});
