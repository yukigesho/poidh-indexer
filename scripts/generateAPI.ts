import crypto from "crypto";

function main() {
  const apiKey = crypto
    .randomBytes(32)
    .toString("hex");

  const secret = crypto
    .randomBytes(32)
    .toString("hex");

  console.log("API key:", apiKey);
  console.log("API secret:", secret);
}

if (
  import.meta.url === `file://${process.argv[1]}`
) {
  main();
}
