import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
// dotenv
import dotenv from "dotenv";
import app from "./src/app";
dotenv.config();

// app import


// port
let port = process.env.PORT ?? 5000;

app.get("/", (req, res) => {
  res.send("Hello World");
}); 

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});