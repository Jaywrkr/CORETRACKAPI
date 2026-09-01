import "dotenv/config";
import { runCheck } from "../lib/runCheck.js";

runCheck()
  .then((summary) => {
    console.log("Listo:", summary);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Falló:", err);
    process.exit(1);
  });
